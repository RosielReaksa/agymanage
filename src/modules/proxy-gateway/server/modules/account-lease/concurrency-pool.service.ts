import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface ConcurrencyCandidateObject {
  id: string;
  maxConcurrency?: number;
  max_concurrency?: number;
}

export type ConcurrencyCandidate = ConcurrencyCandidateObject | string | [string, unknown];

export interface AccountConcurrencyStatus {
  concurrency: number;
  inCooldown: boolean;
  cooldownRemainingSeconds: number;
}

export interface ConcurrencyPoolOptions {
  redisUrl?: string;
  redisClient?: Redis;
  inMemoryOnly?: boolean;
  defaultMaxConcurrency?: number;
}

@Injectable()
export class ConcurrencyPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(ConcurrencyPoolService.name);
  private redis?: Redis;
  private readonly inMemoryConcurrency = new Map<string, number>();
  private readonly inMemoryCooldown = new Map<string, number>(); // timestamp in ms
  private readonly defaultMaxConcurrency: number;

  constructor(options?: ConcurrencyPoolOptions) {
    this.defaultMaxConcurrency = options?.defaultMaxConcurrency ?? 4;

    if (!options?.inMemoryOnly) {
      if (options?.redisClient) {
        this.redis = options.redisClient;
      } else {
        const redisUrl = options?.redisUrl ?? process.env.REDIS_URL;
        if (redisUrl && redisUrl.trim().length > 0) {
          try {
            this.redis = new Redis(redisUrl, {
              lazyConnect: true,
              maxRetriesPerRequest: 1,
              enableOfflineQueue: false,
            });
            this.redis.on('error', (err) => {
              this.logger.warn(`Redis client error: ${err.message}. Operating in fallback mode.`);
            });
          } catch (err) {
            this.logger.warn(
              `Failed to initialize Redis client: ${err instanceof Error ? err.message : String(err)}`,
            );
            this.redis = undefined;
          }
        }
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
    }
  }

  public getBackendType(): 'redis' | 'memory' {
    return this.redis ? 'redis' : 'memory';
  }

  private resolveCandidateId(candidate: ConcurrencyCandidate): string {
    if (typeof candidate === 'string') {
      return candidate;
    }
    if (Array.isArray(candidate)) {
      return candidate[0];
    }
    return candidate.id;
  }

  private resolveCandidateMaxConcurrency(
    candidate: ConcurrencyCandidate,
    defaultMax: number,
  ): number {
    if (typeof candidate === 'string') {
      return defaultMax;
    }
    if (Array.isArray(candidate)) {
      const meta = candidate[1] as Record<string, unknown> | undefined;
      if (typeof meta?.maxConcurrency === 'number') {
        return meta.maxConcurrency;
      }
      if (typeof meta?.max_concurrency === 'number') {
        return meta.max_concurrency;
      }
      return defaultMax;
    }
    if (typeof candidate.maxConcurrency === 'number') {
      return candidate.maxConcurrency;
    }
    if (typeof candidate.max_concurrency === 'number') {
      return candidate.max_concurrency;
    }
    return defaultMax;
  }

  /**
   * Checks if an account (or a specific model on that account) is currently in cooldown.
   */
  async isCoolingDown(accountId: string, model?: string): Promise<boolean> {
    if (this.redis) {
      try {
        const globalExists = await this.redis.exists(`cooldown:${accountId}`);
        if (globalExists === 1) {
          return true;
        }
        if (model) {
          const modelExists = await this.redis.exists(`cooldown:${accountId}:${model}`);
          if (modelExists === 1) {
            return true;
          }
        }
        return false;
      } catch (err) {
        this.logger.warn(`Redis isCoolingDown error, falling back to memory: ${String(err)}`);
      }
    }

    const checkExp = (key: string): boolean => {
      const exp = this.inMemoryCooldown.get(key);
      if (!exp) {
        return false;
      }
      if (Date.now() >= exp) {
        this.inMemoryCooldown.delete(key);
        return false;
      }
      return true;
    };

    if (checkExp(`cooldown:${accountId}`) || checkExp(accountId)) {
      return true;
    }
    if (model && checkExp(`cooldown:${accountId}:${model}`)) {
      return true;
    }
    return false;
  }

  /**
   * Retrieves the current in-flight concurrency count for an account.
   */
  async getConcurrency(accountId: string): Promise<number> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(`concurrency:${accountId}`);
        return raw ? Math.max(0, parseInt(raw, 10)) : 0;
      } catch (err) {
        this.logger.warn(`Redis getConcurrency error, falling back to memory: ${String(err)}`);
      }
    }
    return this.inMemoryConcurrency.get(accountId) ?? 0;
  }

  /**
   * Atomically leases the least busy account that has capacity.
   * Filters out accounts in cooldown or at/above max concurrency.
   * Prioritizes lowest concurrency.
   */
  async acquireLease<T extends ConcurrencyCandidate>(
    candidates: T[],
    maxConcurrency = this.defaultMaxConcurrency,
    model?: string,
  ): Promise<T | null> {
    if (!candidates || candidates.length === 0) {
      return null;
    }

    const scoredCandidates: Array<{
      candidate: T;
      id: string;
      load: number;
      maxConc: number;
    }> = [];

    for (const cand of candidates) {
      const id = this.resolveCandidateId(cand);
      const inCooldown = await this.isCoolingDown(id, model);
      if (inCooldown) {
        continue;
      }

      const candMaxConc = this.resolveCandidateMaxConcurrency(cand, maxConcurrency);
      const currentLoad = await this.getConcurrency(id);

      if (currentLoad < candMaxConc) {
        scoredCandidates.push({
          candidate: cand,
          id,
          load: currentLoad,
          maxConc: candMaxConc,
        });
      }
    }

    if (scoredCandidates.length === 0) {
      return null;
    }

    // Sort by lowest concurrency first
    scoredCandidates.sort((a, b) => a.load - b.load);

    // Atomically reserve slot on the selected candidate
    if (this.redis) {
      try {
        for (const item of scoredCandidates) {
          const active = await this.redis.incr(`concurrency:${item.id}`);
          if (active <= item.maxConc) {
            return item.candidate;
          }
          // Rollback if race condition pushed load over limit
          await this.redis.decr(`concurrency:${item.id}`);
        }
        return null;
      } catch (err) {
        this.logger.warn(`Redis acquireLease error, falling back to memory: ${String(err)}`);
      }
    }

    // In-memory atomic lease reservation
    for (const item of scoredCandidates) {
      const current = this.inMemoryConcurrency.get(item.id) ?? 0;
      if (current < item.maxConc) {
        this.inMemoryConcurrency.set(item.id, current + 1);
        return item.candidate;
      }
    }

    return null;
  }

  /**
   * Releases an account lease decrementing in-flight concurrency.
   */
  async releaseLease(accountId: string): Promise<void> {
    if (this.redis) {
      try {
        const count = await this.redis.decr(`concurrency:${accountId}`);
        if (count < 0) {
          await this.redis.set(`concurrency:${accountId}`, 0);
        }
        return;
      } catch (err) {
        this.logger.warn(`Redis releaseLease error, falling back to memory: ${String(err)}`);
      }
    }

    const current = this.inMemoryConcurrency.get(accountId) ?? 0;
    const next = Math.max(0, current - 1);
    this.inMemoryConcurrency.set(accountId, next);
  }

  /**
   * Penalizes an account when an upstream 429 / ResourceExhausted is encountered.
   * Clamps penalty TTL between 60s and 300s. Resets active concurrency to 0 when account-wide.
   */
  async flagRateLimited(
    accountId: string,
    penaltySeconds = 60,
    model?: string,
  ): Promise<void> {
    const ttl = Math.min(300, Math.max(60, penaltySeconds || 60));
    const key = model ? `cooldown:${accountId}:${model}` : `cooldown:${accountId}`;
    this.logger.warn(
      `Account ${accountId}${model ? ` (${model})` : ''} hit rate limit. Cooling down for ${ttl}s`,
    );

    if (this.redis) {
      try {
        await this.redis.set(key, '1', 'EX', ttl);
        if (!model) {
          await this.redis.set(`concurrency:${accountId}`, 0);
        }
        return;
      } catch (err) {
        this.logger.warn(`Redis flagRateLimited error, falling back to memory: ${String(err)}`);
      }
    }

    this.inMemoryCooldown.set(key, Date.now() + ttl * 1000);
    if (!model) {
      this.inMemoryConcurrency.set(accountId, 0);
    }
  }

  /**
   * Retrieves account concurrency and cooldown status.
   */
  async getAccountStatus(
    accountId: string,
    model?: string,
  ): Promise<AccountConcurrencyStatus> {
    const key = model ? `cooldown:${accountId}:${model}` : `cooldown:${accountId}`;
    if (this.redis) {
      try {
        const [rawLoad, ttl] = await Promise.all([
          this.redis.get(`concurrency:${accountId}`),
          this.redis.ttl(key),
        ]);
        const concurrency = rawLoad ? Math.max(0, parseInt(rawLoad, 10)) : 0;
        const inCooldown = ttl > 0;
        return {
          concurrency,
          inCooldown,
          cooldownRemainingSeconds: Math.max(0, ttl),
        };
      } catch (err) {
        this.logger.warn(`Redis getAccountStatus error, falling back to memory: ${String(err)}`);
      }
    }

    const exp =
      this.inMemoryCooldown.get(key) ??
      (model ? undefined : this.inMemoryCooldown.get(accountId));
    let inCooldown = false;
    let cooldownRemainingSeconds = 0;
    if (exp) {
      if (Date.now() < exp) {
        inCooldown = true;
        cooldownRemainingSeconds = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
      } else {
        this.inMemoryCooldown.delete(key);
      }
    }

    const concurrency = this.inMemoryConcurrency.get(accountId) ?? 0;
    return {
      concurrency,
      inCooldown,
      cooldownRemainingSeconds,
    };
  }

  /**
   * Clears all concurrency counters and cooldowns (for tests/maintenance).
   */
  async reset(): Promise<void> {
    this.inMemoryConcurrency.clear();
    this.inMemoryCooldown.clear();

    if (this.redis) {
      try {
        const keys = await this.redis.keys('{concurrency,cooldown}:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (err) {
        this.logger.warn(`Redis reset error: ${String(err)}`);
      }
    }
  }
}
