import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConcurrencyPoolService,
  type ConcurrencyCandidate,
} from '@/modules/proxy-gateway/server/modules/account-lease/concurrency-pool.service';
import {
  StreamInterceptorService,
  type UpstreamAccount,
  type StreamClientResponse,
} from '@/modules/proxy-gateway/server/modules/account-lease/stream-interceptor.service';
import { AccountLeaseSelectionPolicy } from '@/modules/proxy-gateway/server/modules/account-lease/policies/account-lease-selection.policy';
import axios from 'axios';
import { EventEmitter } from 'events';

describe('High-Concurrency Distributed Account Balancer', () => {
  let poolService: ConcurrencyPoolService;

  beforeEach(async () => {
    poolService = new ConcurrencyPoolService({ inMemoryOnly: true, defaultMaxConcurrency: 4 });
    await poolService.reset();
  });

  describe('ConcurrencyPoolService - State Engine & Least-Concurrency Leasing', () => {
    it('leases accounts in least-concurrency order', async () => {
      const candidates: ConcurrencyCandidate[] = [
        { id: 'acc-heavy', maxConcurrency: 4 },
        { id: 'acc-idle', maxConcurrency: 4 },
        { id: 'acc-medium', maxConcurrency: 4 },
      ];

      // Simulate existing loads: acc-heavy=2, acc-medium=1, acc-idle=0
      await poolService.acquireLease(['acc-heavy']);
      await poolService.acquireLease(['acc-heavy']);
      await poolService.acquireLease(['acc-medium']);

      expect(await poolService.getConcurrency('acc-heavy')).toBe(2);
      expect(await poolService.getConcurrency('acc-medium')).toBe(1);
      expect(await poolService.getConcurrency('acc-idle')).toBe(0);

      // Next lease should pick acc-idle because it has the least load (0)
      const first = await poolService.acquireLease(candidates);
      expect(first).toEqual({ id: 'acc-idle', maxConcurrency: 4 });
      expect(await poolService.getConcurrency('acc-idle')).toBe(1);

      // Now loads are: heavy=2, medium=1, idle=1
      // The next lease should pick either medium or idle (load 1), NOT heavy
      const second = await poolService.acquireLease(candidates);
      expect(second).not.toBeNull();
      expect(['acc-medium', 'acc-idle']).toContain((second as { id: string }).id);
    });

    it('enforces concurrency saturation and prevents over-leasing', async () => {
      const maxConc = 2;
      const candidates: ConcurrencyCandidate[] = [{ id: 'acc-limited', maxConcurrency: maxConc }];

      // Acquire 1st lease
      const lease1 = await poolService.acquireLease(candidates);
      expect(lease1).toEqual(candidates[0]);
      expect(await poolService.getConcurrency('acc-limited')).toBe(1);

      // Acquire 2nd lease
      const lease2 = await poolService.acquireLease(candidates);
      expect(lease2).toEqual(candidates[0]);
      expect(await poolService.getConcurrency('acc-limited')).toBe(2);

      // 3rd attempt must be blocked as concurrency is saturated
      const lease3 = await poolService.acquireLease(candidates);
      expect(lease3).toBeNull();
      expect(await poolService.getConcurrency('acc-limited')).toBe(2);
    });

    it('releases lease, decrementing concurrency and freeing saturated slot', async () => {
      const maxConc = 2;
      const candidates: ConcurrencyCandidate[] = [{ id: 'acc-1', maxConcurrency: maxConc }];

      // Saturate account
      await poolService.acquireLease(candidates);
      await poolService.acquireLease(candidates);
      expect(await poolService.acquireLease(candidates)).toBeNull();

      // Release one slot
      await poolService.releaseLease('acc-1');
      expect(await poolService.getConcurrency('acc-1')).toBe(1);

      // Now a new lease can be acquired
      const newLease = await poolService.acquireLease(candidates);
      expect(newLease).toEqual(candidates[0]);
      expect(await poolService.getConcurrency('acc-1')).toBe(2);

      // Counter should not drop below 0 on multiple releases
      await poolService.releaseLease('acc-1');
      await poolService.releaseLease('acc-1');
      await poolService.releaseLease('acc-1');
      expect(await poolService.getConcurrency('acc-1')).toBe(0);
    });

    it('applies dynamic cooldown on 429/ResourceExhausted and skips cooling-down accounts', async () => {
      const candidates: ConcurrencyCandidate[] = [
        { id: 'acc-rate-limited', maxConcurrency: 4 },
        { id: 'acc-healthy', maxConcurrency: 4 },
      ];

      // Initially both are available
      expect(await poolService.isCoolingDown('acc-rate-limited')).toBe(false);

      // Put acc-rate-limited into penalty box
      await poolService.flagRateLimited('acc-rate-limited', 90);

      expect(await poolService.isCoolingDown('acc-rate-limited')).toBe(true);
      expect(await poolService.getConcurrency('acc-rate-limited')).toBe(0);

      const status = await poolService.getAccountStatus('acc-rate-limited');
      expect(status.inCooldown).toBe(true);
      expect(status.concurrency).toBe(0);
      expect(status.cooldownRemainingSeconds).toBeGreaterThanOrEqual(60);
      expect(status.cooldownRemainingSeconds).toBeLessThanOrEqual(90);

      // Leasing must skip acc-rate-limited and select acc-healthy
      const leased = await poolService.acquireLease(candidates);
      expect(leased).toEqual(candidates[1]);
    });

    it('clamps cooldown penalty TTL between 60s and 300s', async () => {
      // Under minimum (< 60s) -> clamped to 60s
      await poolService.flagRateLimited('acc-short', 10);
      const statusShort = await poolService.getAccountStatus('acc-short');
      expect(statusShort.cooldownRemainingSeconds).toBeGreaterThanOrEqual(58);
      expect(statusShort.cooldownRemainingSeconds).toBeLessThanOrEqual(60);

      // Over maximum (> 300s) -> clamped to 300s
      await poolService.flagRateLimited('acc-long', 999);
      const statusLong = await poolService.getAccountStatus('acc-long');
      expect(statusLong.cooldownRemainingSeconds).toBeGreaterThanOrEqual(298);
      expect(statusLong.cooldownRemainingSeconds).toBeLessThanOrEqual(300);
    });

    it('supports string candidate IDs and tuple candidates', async () => {
      const stringCandidates = ['id-1', 'id-2'];
      const leased = await poolService.acquireLease(stringCandidates, 2);
      expect(leased).toBe('id-1');
      expect(await poolService.getConcurrency('id-1')).toBe(1);

      const tupleCandidates: [string, { maxConcurrency: number }][] = [
        ['tuple-1', { maxConcurrency: 1 }],
      ];
      const leasedTuple = await poolService.acquireLease(tupleCandidates);
      expect(leasedTuple).toEqual(tupleCandidates[0]);
      expect(await poolService.getConcurrency('tuple-1')).toBe(1);

      // Saturated tuple candidate
      const secondTupleLease = await poolService.acquireLease(tupleCandidates);
      expect(secondTupleLease).toBeNull();
    });
  });

  describe('Dual Backend - Redis Mode with Fallback', () => {
    it('interacts with Redis client when configured and falls back on error', async () => {
      const mockStorage = new Map<string, string>();
      const mockRedis = {
        incr: vi.fn(async (key: string) => {
          const val = parseInt(mockStorage.get(key) || '0', 10) + 1;
          mockStorage.set(key, String(val));
          return val;
        }),
        decr: vi.fn(async (key: string) => {
          const val = Math.max(0, parseInt(mockStorage.get(key) || '0', 10) - 1);
          mockStorage.set(key, String(val));
          return val;
        }),
        get: vi.fn(async (key: string) => mockStorage.get(key) || null),
        set: vi.fn(async (key: string, val: string) => {
          mockStorage.set(key, val);
          return 'OK';
        }),
        exists: vi.fn(async (key: string) => (mockStorage.has(key) ? 1 : 0)),
        ttl: vi.fn(async () => 60),
        keys: vi.fn(async () => Array.from(mockStorage.keys())),
        del: vi.fn(async (...keys: string[]) => {
          for (const k of keys) mockStorage.delete(k);
          return keys.length;
        }),
        quit: vi.fn(async () => 'OK'),
        disconnect: vi.fn(),
      };

      const redisPool = new ConcurrencyPoolService({
        redisClient: mockRedis as any,
        defaultMaxConcurrency: 4,
      });

      expect(redisPool.getBackendType()).toBe('redis');

      // Test acquire lease via Redis
      const candidate = await redisPool.acquireLease([{ id: 'redis-acc', maxConcurrency: 2 }]);
      expect(candidate).toEqual({ id: 'redis-acc', maxConcurrency: 2 });
      expect(mockRedis.incr).toHaveBeenCalledWith('concurrency:redis-acc');

      // Test release lease via Redis
      await redisPool.releaseLease('redis-acc');
      expect(mockRedis.decr).toHaveBeenCalledWith('concurrency:redis-acc');

      // Test flag rate limited via Redis
      await redisPool.flagRateLimited('redis-acc', 60);
      expect(mockRedis.set).toHaveBeenCalledWith('cooldown:redis-acc', '1', 'EX', 60);
      expect(mockRedis.set).toHaveBeenCalledWith('concurrency:redis-acc', 0);
    });
  });

  describe('AccountLeaseSelectionPolicy with ConcurrencyPool', () => {
    it('bypasses saturated accounts and selects least-concurrency account', async () => {
      const selectionPolicy = new AccountLeaseSelectionPolicy();

      // Pre-saturate acc-1 (load 4 >= max 4) and set acc-2 to load 1
      for (let i = 0; i < 4; i++) {
        await poolService.acquireLease(['acc-1'], 4);
      }
      await poolService.acquireLease(['acc-2'], 4);

      expect(await poolService.getConcurrency('acc-1')).toBe(4);
      expect(await poolService.getConcurrency('acc-2')).toBe(1);
      expect(await poolService.getConcurrency('acc-3')).toBe(0);

      const request = {
        allTokens: [
          ['acc-1', { maxConcurrency: 4 }],
          ['acc-2', { maxConcurrency: 4 }],
          ['acc-3', { maxConcurrency: 4 }],
        ] as [string, { maxConcurrency: number }][],
        now: Date.now(),
        accountCooldowns: new Map<string, number>(),
        rateLimitTracker: {
          isRateLimited: () => false,
          getRemainingWaitSeconds: () => 0,
        },
        config: {
          quotaAwareSchedulingEnabled: false,
          parityEnabled: false,
          parityShadowEnabled: false,
          schedulingMode: 'balance' as const,
          accountSelectionStrategy: 'balanced' as const,
          maxWaitMs: 0,
          noGoMismatchRateThreshold: 0.15,
          noGoErrorRateThreshold: 0.4,
        },
        logger: { warn: vi.fn(), error: vi.fn() },
        concurrencyPool: poolService,
      };

      // acc-1 is saturated, so it must be bypassed.
      // Between acc-2 (load 1) and acc-3 (load 0), acc-3 has lowest concurrency and must be selected!
      const candidate = await selectionPolicy.selectCandidate(request);
      expect(candidate).not.toBeNull();
      expect(candidate?.[0]).toBe('acc-3');
    });

    it('skips accounts currently cooling down in ConcurrencyPool', async () => {
      const selectionPolicy = new AccountLeaseSelectionPolicy();

      await poolService.flagRateLimited('acc-1', 60);

      const request = {
        allTokens: [
          ['acc-1', { maxConcurrency: 4 }],
          ['acc-2', { maxConcurrency: 4 }],
        ] as [string, { maxConcurrency: number }][],
        now: Date.now(),
        accountCooldowns: new Map<string, number>(),
        rateLimitTracker: {
          isRateLimited: () => false,
          getRemainingWaitSeconds: () => 0,
        },
        config: {
          quotaAwareSchedulingEnabled: false,
          parityEnabled: false,
          parityShadowEnabled: false,
          schedulingMode: 'balance' as const,
          accountSelectionStrategy: 'balanced' as const,
          maxWaitMs: 0,
          noGoMismatchRateThreshold: 0.15,
          noGoErrorRateThreshold: 0.4,
        },
        logger: { warn: vi.fn(), error: vi.fn() },
        concurrencyPool: poolService,
      };

      const candidate = await selectionPolicy.selectCandidate(request);
      expect(candidate?.[0]).toBe('acc-2');
    });
  });

  describe('Transparent Pre-Stream Retry & Stream Interceptor', () => {
    it('transparently retries on initial 429/5xx before stream flushes and flags cooldown', async () => {
      const interceptor = new StreamInterceptorService(poolService);

      const accounts: UpstreamAccount[] = [
        { id: 'acc-fail-429', accessToken: 'token-fail-1', maxConcurrency: 4 },
        { id: 'acc-success', accessToken: 'token-success-2', maxConcurrency: 4 },
      ];

      // Mock client response
      const clientHeaders = new Map<string, string>();
      const writtenChunks: string[] = [];
      let isEnded = false;
      const clientRes: StreamClientResponse = {
        setHeader: vi.fn((k: string, v: string) => clientHeaders.set(k, v)),
        write: vi.fn((chunk: unknown) => {
          writtenChunks.push(String(chunk));
          return true;
        }),
        end: vi.fn(() => {
          isEnded = true;
        }),
        on: vi.fn().mockReturnThis(),
      };

      // Mock upstream stream for the successful attempt
      const mockStream = new EventEmitter();

      // Mock axios post: first call rejects with 429, second call succeeds with stream
      let callCount = 0;
      vi.spyOn(axios, 'post').mockImplementation(async (_url, _body, config) => {
        callCount++;
        const auth = config?.headers?.Authorization;
        if (auth === 'Bearer token-fail-1') {
          const err = new Error('Upstream Rate Limited') as any;
          err.response = { status: 429 };
          throw err;
        }
        return {
          status: 200,
          data: mockStream,
        } as any;
      });

      // Start stream handling
      const streamPromise = interceptor.handleChatStream(
        { model: 'gemini-2.5-pro' },
        accounts,
        clientRes,
        3,
      );

      // Wait for transparent retry to attempt failover account
      while (callCount < 2) {
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(callCount).toBe(2);

      // The failed account must have been put into cooldown
      expect(await poolService.isCoolingDown('acc-fail-429')).toBe(true);

      // The successful account must have active concurrency = 1
      expect(await poolService.getConcurrency('acc-success')).toBe(1);

      // Emit SSE data from upstream stream
      mockStream.emit('data', Buffer.from('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n'));
      expect(writtenChunks.length).toBe(1);
      expect(writtenChunks[0]).toContain('Hi');

      // Finish stream
      mockStream.emit('end');
      await streamPromise;

      expect(isEnded).toBe(true);
      // Upon stream completion, lease must be released
      expect(await poolService.getConcurrency('acc-success')).toBe(0);
    });

    it('throws TOO_MANY_REQUESTS when all accounts are saturated', async () => {
      const interceptor = new StreamInterceptorService(poolService);
      const accounts: UpstreamAccount[] = [
        { id: 'acc-sat-1', maxConcurrency: 1 },
      ];

      // Saturate account
      await poolService.acquireLease(['acc-sat-1'], 1);

      const clientRes: StreamClientResponse = {
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn().mockReturnThis(),
      };

      await expect(
        interceptor.handleChatStream({ model: 'gemini-pro' }, accounts, clientRes, 2),
      ).rejects.toThrow('All upstream worker accounts are currently saturated');
    });
  });

  describe('AccountLeaseService Concurrency Balancer Integration', () => {
    it('manages concurrency leases and flags rate limits via AccountLeaseService', async () => {
      const { AccountLeaseService } = await import(
        '@/modules/proxy-gateway/server/modules/account-lease/account-lease.service'
      );

      const accountStoreMock = {
        getAccounts: vi.fn().mockReturnValue([
          { id: 'srv-acc-1', email: 'acc1@test.com', disabled: false },
          { id: 'srv-acc-2', email: 'acc2@test.com', disabled: false },
        ]),
        mutateHealth: vi.fn(),
        updateTokens: vi.fn(),
      };

      const leaseService = new AccountLeaseService(
        accountStoreMock as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        poolService,
      );

      // Acquire lease via service
      const leased = await leaseService.acquireLease(['srv-acc-1'], 2);
      expect(leased).toBe('srv-acc-1');
      expect((await leaseService.getAccountStatus('srv-acc-1')).concurrency).toBe(1);

      // Release lease via service
      await leaseService.releaseLease('srv-acc-1');
      expect((await leaseService.getAccountStatus('srv-acc-1')).concurrency).toBe(0);

      // Flag rate limited via service
      await leaseService.flagRateLimited('srv-acc-1', 120);
      const status = await leaseService.getAccountStatus('srv-acc-1');
      expect(status.inCooldown).toBe(true);
      expect(status.cooldownRemainingSeconds).toBeGreaterThanOrEqual(60);

      // Mark from upstream error with 429 sets cooldown
      await leaseService.markFromUpstreamError({
        accountIdOrEmail: 'srv-acc-2',
        status: 429,
        retryAfter: '90',
      });
      const status2 = await leaseService.getAccountStatus('srv-acc-2');
      expect(status2.inCooldown).toBe(true);
      expect(status2.cooldownRemainingSeconds).toBeGreaterThanOrEqual(60);
    });
  });
});
