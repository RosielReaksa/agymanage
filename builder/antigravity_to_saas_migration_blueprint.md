# Architecture & Migration Blueprint: AntigravityManager to OpenRouter-Style API Platform

This blueprint outlines how to dismantle the single-user desktop architecture of **AntigravityManager** (Electron + NestJS + local SQLite + local IPC) and re-engineer it into a multi-tenant, cloud-native API platform offering OpenAI-compatible endpoints (`/v1/chat/completions`) with account pooling, rate limiting, and credit metering.

---

## 1. System Architecture Overview

### Current State (AntigravityManager Desktop)
* **Frontend**: React 19, Vite, TanStack Router/Query, Radix UI.
* **Desktop Glue**: Electron main/renderer processes communicating via typed IPC (`ORPC`).
* **Core Logic**: NestJS services (`GoogleAPIService`, `AutoSwitchService`) running on `localhost`.
* **Database**: Local `better-sqlite3` storing personal tokens and settings.
* **Gateway**: Local HTTP proxy forwarding traffic from tools like Claude Code or Codex.

### Target State (Distributed SaaS Gateway)
* **Client Tier**: Web dashboard (Next.js/React) for account sign-ups, billing, and API key generation.
* **API Gateway Tier**: High-throughput reverse proxy (Node.js/Go or Rust) routing incoming OpenAI requests.
* **Worker & Scheduler Tier**: Account health checkers, token refresh workers, and proxy rotation handlers.
* **State & Storage**:
  * **PostgreSQL**: Multi-tenant users, customer API keys, upstream account metadata, billing ledgers.
  * **Redis**: Rate limiting, distributed locks, session stickiness, and token rotation queues.
* **Egress Layer**: Residential/datacenter proxy pool preventing IP bans from upstream providers.

```
[ Developer / Client SDK ]
          │  Authorization: Bearer sk-live-...
          ▼
┌────────────────────────────────────────────────────────┐
│               Public Cloud API Gateway                 │
│  - Authentication & API Key Lookup (Redis / DB)        │
│  - Credit Balance Check & Rate Limiting                │
│  - Protocol Adapter (OpenAI format -> Upstream format) │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            Upstream Account Pool Manager               │
│  - Account Selection (Least-concurrency / Quota state) │
│  - OAuth Token Refresh & Health Monitoring             │
│  - Distributed Mutex (Redis)                           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Proxy Egress Fleet / VPN Nodes             │
│  (Rotating IPs to avoid data-center IP rate limits)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
            [ Upstream Gemini / Antigravity APIs ]
```

---

## 2. Decoupling the Codebase

### A. Code Extraction Strategy
Locate the core business logic from the `Draculabo/AntigravityManager` repository and migrate them to an independent backend service:

1. **Extract Core Services**:
   * Move `src/services/GoogleAPIService.ts` (API interaction, auth tokens) to `apps/gateway/src/services/upstream.service.ts`.
   * Move `src/services/AutoSwitchService.ts` (switching logic) to `apps/gateway/src/services/pool.service.ts`.
   * Discard `src/main.ts`, `src/preload.ts`, and all `src/ipc/*` bindings.

2. **Replace IPC with REST/gRPC**:
   * Replace all `orpc` client-server handlers with standard REST controllers or fast routing handlers (e.g., Fastify or NestJS HTTP controllers).

3. **Database Migration**:
   * Strip `better-sqlite3`.
   * Implement an ORM (Prisma or Drizzle) backed by PostgreSQL.

---

## 3. Database Schema Design (PostgreSQL)

```sql
-- 1. SaaS Customer Accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    balance_usd NUMERIC(10, 6) DEFAULT 0.000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customer API Keys (OpenAI-compatible)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) UNIQUE NOT NULL, -- Store SHA-256 hash of 'sk-live-...'
    label VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Upstream Account Credential Pool
CREATE TABLE upstream_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(32) NOT NULL, -- 'google', 'antigravity', etc.
    account_identifier VARCHAR(255) NOT NULL,
    refresh_token TEXT NOT NULL,   -- Encrypted at rest (AES-256-GCM)
    access_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_healthy BOOLEAN DEFAULT TRUE,
    remaining_quota_rpm INT DEFAULT 60,
    active_connections INT DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- 4. Usage & Ledger
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    model VARCHAR(64) NOT NULL,
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    cost_usd NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Building the OpenAI-Compatible Gateway

The public interface must mirror the OpenAI Chat Completions standard (`POST /v1/chat/completions`).

### Implementation Workflow

```
Incoming Request
  │
  ├─> 1. Auth Guard: Validate `Authorization: Bearer <key>` against Redis cache.
  ├─> 2. Quota Check: Verify `user.balance_usd > 0`.
  ├─> 3. Account Allocation: Query Pool Manager for an available upstream account.
  ├─> 4. Request Translation: Convert OpenAI JSON schema to upstream RPC / REST format.
  ├─> 5. Dispatch Request: Execute via rotating proxy egress.
  ├─> 6. Stream Transformer: Convert upstream chunks into standard Server-Sent Events (`data: {...}`).
  └─> 7. Metering: Count tokens, decrement user balance, and release account concurrency lock.
```

### Express/Fastify Handler Example

```typescript
import { Request, Response } from 'express';
import { PoolManager } from './pool.manager';
import { TokenizerService } from './tokenizer.service';
import { BillingService } from './billing.service';

export async function chatCompletionsHandler(req: Request, res: Response) {
  const customer = req.user; // populated by auth middleware
  const { model, messages, stream = false } = req.body;

  // 1. Verify Balance
  if (customer.balanceUsd <= 0) {
    return res.status(402).json({ error: { message: "Insufficient balance", type: "billing_error" } });
  }

  // 2. Lease an account from the pool
  const upstreamAccount = await PoolManager.leaseAccount(model);
  if (!upstreamAccount) {
    return res.status(503).json({ error: { message: "Provider capacity exhausted", type: "upstream_overload" } });
  }

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let accumulatedTokens = 0;
      const upstreamStream = await upstreamAccount.executeStream(messages);

      for await (const chunk of upstreamStream) {
        accumulatedTokens += TokenizerService.countTokens(chunk.text);
        const openAiFormattedChunk = {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ delta: { content: chunk.text }, index: 0, finish_reason: null }]
        };
        res.write(`data: ${JSON.stringify(openAiFormattedChunk)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();

      // Deduct balance asynchronously
      await BillingService.deductUsage(customer.id, model, accumulatedTokens);
    } else {
      const response = await upstreamAccount.execute(messages);
      await BillingService.deductUsage(customer.id, model, response.totalTokens);
      return res.json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        model,
        choices: [{ message: { role: "assistant", content: response.content }, finish_reason: "stop" }],
        usage: response.usage
      });
    }
  } catch (error) {
    PoolManager.markAccountUnhealthy(upstreamAccount.id, error);
    return res.status(502).json({ error: { message: "Upstream gateway error", type: "gateway_failure" } });
  } finally {
    await PoolManager.releaseAccount(upstreamAccount.id);
  }
}
```

---

## 5. Account Pool & Proxy Egress Strategy

Running consumer accounts in the cloud requires handling provider rate limits and anti-abuse systems:

1. **Token Refresh Workers**:
   * Run background jobs (via BullMQ or Celery) checking `token_expires_at` every 5 minutes.
   * Auto-refresh OAuth tokens and persist the new credentials.

2. **Distributed Account Locking (Redis)**:
   * Keep a count of active connections per account key (`INCR accounts:<id>:concurrency`).
   * Cap requests per account based on upstream Rate Limits (RPM/TPM).

3. **Residential Proxy Integration**:
   * Upstream accounts will be blocked if hundreds of requests originate from a single AWS/GCP datacenter IP.
   * Route requests through HTTP/SOCKS5 rotating proxies (e.g., Swiftproxy, Bright Data) with sticky sessions per conversation if context preservation is required.

---

## 6. Dashboard & Billing Platform

Adapt the existing React/Tailwind frontend from `src/renderer.tsx` to serve as a customer portal:

* **Authentication**: Integrate Clerk, Supabase Auth, or NextAuth.
* **Payment Processing**: Integrate Stripe Checkout or LemonSqueezy to allow pre-paid balance top-ups via webhooks (`checkout.session.completed`).
* **API Key Management**: Allow users to generate, revoke, and set rate limits on their keys.
* **Usage Dashboard**: Display token volume, cost breakdown by model, and status monitors.

---

## 7. Migration Roadmap

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | Engine Decoupling | Extract `GoogleAPIService` and `AutoSwitchService` into a standalone Node.js service; replace SQLite with PostgreSQL. |
| **Phase 2** | OpenAI Protocol Layer | Build `/v1/chat/completions` and `/v1/models` handlers supporting both standard JSON and Server-Sent Event (SSE) streaming. |
| **Phase 3** | Pool & Proxy Layer | Implement Redis concurrency locking, automated token refreshing, and upstream residential proxy routing. |
| **Phase 4** | Auth & Billing | Launch customer database, API key validation, Stripe checkout webhooks, and live token deduction. |
| **Phase 5** | Web Portal | Port the desktop React UI into a public Next.js dashboard for customer self-service. |