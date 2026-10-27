# High-Concurrency Distributed Account Balancer & SSE Stream Interceptor

This document details the architecture, data structures, and production implementation for replacing the single-user local `AutoSwitchService` with a distributed, Redis-backed token pool router capable of handling hundreds of concurrent streaming sessions.

---

## 1. Concurrency Bottleneck Analysis

### AntigravityManager (Current State)
* **Design:** Single active account state stored in local SQLite (`better-sqlite3`).
* **Behavior:** When an account hits quota limits or 429, it performs a serial switch.
* **Failure Mode under High Concurrency:** If 50 requests land simultaneously, all 50 try to bind to the single active token. The upstream Google endpoint issues a rate-limit burst (`429 RESOURCE_EXHAUSTED`), corrupting the local session and causing request timeouts for downstream clients.

### Distributed Multi-Tenant Architecture (Target State)
* **Lease-Based Concurrency:** Accounts are treated as worker resources in an active pool.
* **Atomic Redis State:** Connections are acquired and released via atomic Redis counters (`INCR`/`DECR`) and TTL keys.
* **Stream-Aware Routing:** The system routes requests only to accounts with active concurrency headroom ($C_{\text{active}} < C_{\text{max}}$) and non-expired rate-limit penalties.
* **Transparent Pre-Stream Retry:** If upstream rejects the initial handshake with 429/5xx before the first chunk is flushed to the client, the gateway rotates to another account transparently.

---

## 2. Redis Data Structures & State Machine

| Redis Key | Type | TTL | Description |
| :--- | :--- | :--- | :--- |
| `account:{id}:concurrency` | Integer | None | Current count of active streaming/in-flight HTTP connections. |
| `account:{id}:cooldown` | String (Timestamp) | Dynamic (60–300s) | Upstream penalty box. Account is skipped while key exists. |
| `account:{id}:rpm_counter` | Integer | 60s window | Rolling window request counter for soft RPM limits. |
| `pool:active_accounts` | Set (`SADD`) | Persistent | Set of all verified, non-disabled account UUIDs. |

### Upstream Request Lifecycle

```
Client POST /v1/chat/completions
             │
             ▼
┌───────────────────────────────────────┐
│     AccountPoolService.acquire()      │
│  - Filter out cooling-down accounts   │
│  - Find min(concurrency) < MAX_CONC   │
│  - INCR account:{id}:concurrency     │
└───────────────────────────────────────┘
             │
             ├───► All Saturated ───► HTTP 503 (Upstream Capacity Full)
             │
             ▼
┌───────────────────────────────────────┐
│       Upstream Proxy Dispatch         │
│  - Forward to Google / Gemini Engine  │
│  - Using bound static/residential IP  │
└───────────────────────────────────────┘
             │
      ┌──────┴──────────────────────────┐
      ▼                                 ▼
Initial Response: 429             Initial Response: 200 OK
      │                                 │
      ├─► Flag cooldown in Redis        ├─► Pipe SSE Stream to Client
      ├─► DECR concurrency             │
      └─► Retry with next account       ├─► Client Disconnect / End Stream
                                        │
                                        ▼
                                  DECR account:{id}:concurrency
```

---

## 3. Production NestJS Implementation

### Core Module Layout
```
src/
└── pool/
    ├── account-pool.service.ts      # Redis atomic leasing & cooldown engine
    ├── stream-interceptor.service.ts # Upstream proxying, SSE piping & retries
    ├── pool.controller.ts           # OpenAI-compatible API endpoints
    └── pool.module.ts
```

### `account-pool.service.ts`
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface UpstreamAccount {
  id: string;
  email: string;
  accessToken: string;
  proxyUrl?: string;
  maxConcurrency: number;
}

@Injectable()
export class AccountPoolService {
  private readonly logger = new Logger(AccountPoolService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Atomically leases the least busy account that has capacity.
   */
  async acquireLease(candidates: UpstreamAccount[]): Promise<UpstreamAccount | null> {
    const scoredCandidates: { account: UpstreamAccount; load: number }[] = [];

    for (const acc of candidates) {
      // 1. Check if account is in cooldown
      const isCooldown = await this.redis.exists(`cooldown:${acc.id}`);
      if (isCooldown) continue;

      // 2. Fetch current concurrency
      const rawLoad = await this.redis.get(`concurrency:${acc.id}`);
      const currentLoad = rawLoad ? parseInt(rawLoad, 10) : 0;

      if (currentLoad < acc.maxConcurrency) {
        scoredCandidates.push({ account: acc, load: currentLoad });
      }
    }

    if (scoredCandidates.length === 0) {
      return null;
    }

    // Sort by lowest load first
    scoredCandidates.sort((a, b) => a.load - b.load);

    // Atomically reserve slot on the selected candidate
    for (const { account } of scoredCandidates) {
      const active = await this.redis.incr(`concurrency:${account.id}`);
      if (active <= account.maxConcurrency) {
        return account;
      }
      // If race condition pushed load over limit, rollback and try next
      await this.redis.decr(`concurrency:${account.id}`);
    }

    return null;
  }

  /**
   * Releases an account reservation when client closes stream or connection drops.
   */
  async releaseLease(accountId: string): Promise<void> {
    const count = await this.redis.decr(`concurrency:${accountId}`);
    if (count < 0) {
      await this.redis.set(`concurrency:${accountId}`, 0);
    }
  }

  /**
   * Penalizes an account when an upstream 429/ResourceExhausted is encountered.
   */
  async flagRateLimited(accountId: string, penaltySeconds = 60): Promise<void> {
    this.logger.warn(`Account ${accountId} hit upstream rate limit. Cooling down for ${penaltySeconds}s`);
    await this.redis.set(`cooldown:${accountId}`, '1', 'EX', penaltySeconds);
    await this.redis.set(`concurrency:${accountId}`, 0);
  }
}
```

### `stream-interceptor.service.ts`
```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { AccountPoolService, UpstreamAccount } from './account-pool.service';

@Injectable()
export class StreamInterceptorService {
  private readonly logger = new Logger(StreamInterceptorService.name);

  constructor(private readonly poolService: AccountPoolService) {}

  /**
   * Proxies chat completions with upstream token leasing, retry, and SSE streaming.
   */
  async handleChatStream(
    payload: any,
    accountPool: UpstreamAccount[],
    clientRes: Response,
    maxRetries = 3
  ): Promise<void> {
    let attempts = 0;
    const attemptedAccountIds = new Set<string>();

    while (attempts < maxRetries) {
      // Filter out accounts already attempted in this request cycle
      const viableAccounts = accountPool.filter((a) => !attemptedAccountIds.has(a.id));
      const account = await this.poolService.acquireLease(viableAccounts);

      if (!account) {
        throw new HttpException(
          'All upstream worker accounts are currently saturated. Please try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      attemptedAccountIds.add(account.id);
      attempts++;

      try {
        const agent = account.proxyUrl ? new HttpsProxyAgent(account.proxyUrl) : undefined;

        // Perform initial upstream request
        const upstreamRes: AxiosResponse = await axios.post(
          'https://generativelanguage.googleapis.com/v1beta/chat/completions',
          payload,
          {
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
              'Content-Type': 'application/json',
            },
            httpsAgent: agent,
            responseType: 'stream',
            timeout: 15000, // 15s handshake timeout
          }
        );

        // Success - Set headers and pipe the Server-Sent Events stream
        clientRes.setHeader('Content-Type', 'text/event-stream');
        clientRes.setHeader('Cache-Control', 'no-cache');
        clientRes.setHeader('Connection', 'keep-alive');

        const stream = upstreamRes.data;

        // Cleanup hooks
        let released = false;
        const cleanup = () => {
          if (!released) {
            released = true;
            this.poolService.releaseLease(account.id);
          }
        };

        stream.on('data', (chunk: Buffer) => {
          clientRes.write(chunk);
        });

        stream.on('end', () => {
          cleanup();
          clientRes.end();
        });

        stream.on('error', (err: Error) => {
          this.logger.error(`Stream interrupted on account ${account.id}: ${err.message}`);
          cleanup();
          clientRes.end();
        });

        clientRes.on('close', () => {
          cleanup();
          if (stream.destroy) stream.destroy();
        });

        return; // Successfully handed off stream
      } catch (error: any) {
        const status = error.response?.status;

        // Handle upstream rate limiting or auth invalidation
        if (status === 429 || status === 403) {
          await this.poolService.flagRateLimited(account.id, 60);
        } else {
          await this.poolService.releaseLease(account.id);
        }

        this.logger.warn(`Attempt ${attempts} failed on account ${account.id}. Status: ${status || error.message}`);

        // If retries exhausted, send error to client
        if (attempts >= maxRetries) {
          throw new HttpException(
            'Failed to establish upstream connection after multiple failover attempts.',
            HttpStatus.BAD_GATEWAY
          );
        }
      }
    }
  }
}
```

---

## 4. IP Egress & Network Architecture

1. **Proxy Pinning:** Every Google account must route through a sticky static or residential proxy node. Google tracks subnet-to-token consistency; alternating 10 IPs on the same account triggers security verification locks.
2. **Connection Keep-Alive:** Reuse HTTP agents across calls for the same proxy node to minimize TLS handshake latency.
3. **Graceful Degradation:** If all pooled accounts exceed 80% concurrency capacity, trigger upstream dynamic queueing or scale down non-streaming background workers.