# Production Master Specification &amp; Implementation Roadmap: Antigravity to Commercial Multi-Tenant AI Platform

This master specification compiles the complete set of architectural requirements, system components, codebase modifications, database schemas, network infrastructure, and billing integrations needed to convert the single-user **AntigravityManager** repository into an **OpenRouter-style commercial API service**.

---

## 1. System Inventory &amp; Modification Matrix


| Component                  | Current State (Desktop Repo)                     | Production Target (Cloud SaaS)                        | Action Required                                      |
| :-------------------------- | :------------------------------------------------ | :----------------------------------------------------- | :---------------------------------------------------- |
| **Application Core**       | Electron runtime + NestJS embedded               | Standalone Node.js/Fastify/Go API cluster             | Strip Electron, preload, IPC bindings                |
| **State Storage**          | `better-sqlite3` (single local file)             | PostgreSQL + Redis (Distributed)                      | Implement relational DB &amp; Redis cache            |
| **Account Dispatch**       | Serial single-account flip (`AutoSwitchService`) | Distributed Least-Connections Balancer                | Build atomic Redis pool dispatcher                   |
| **Outbound IP Routing**    | Local host IP                                    | Sticky Static Residential Proxies                     | Bind 1 IP per upstream worker account                |
| **API Interface**          | Local proxy forwarding                           | OpenAI-compatible `/v1/chat/completions`              | Build streaming translation adapter                  |
| **Billing &amp; Metering** | Read-only inspection of Google quota             | Pre-paid balance holds + real-time SSE token metering | Integrate Stripe/LemonSqueezy + Redis balance ledger |
| **Authentication**         | Local OAuth storage                              | Customer API keys (`sk-live-...`) + JWT SaaS Auth     | Implement SHA-256 API key authentication             |
| **Frontend UI**            | Local desktop React UI via Electron IPC          | Multi-tenant Web Dashboard (Next.js)                  | Port UI components to web application                |


---

## 2. Infrastructure &amp; Network Topology

```
[ Downstream Clients (Curl, LangChain, Cursor, Custom Apps) ]
                           │
                           │ Authorization: Bearer sk-live-...
                           ▼
┌────────────────────────────────────────────────────────┐
│               Edge / Load Balancer (Cloudflare)        │
│  - DDoS Protection & SSL Termination                   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               Public API Gateway Cluster               │
│  1. Auth Middleware: Verify hashed API key in Redis    │
│  2. Balance Guard: Check balance > 0 (Reserve credits) │
│  3. Tokenizer: Calculate prompt token cost upfront    │
│  4. Protocol Normalizer: Convert to upstream schema    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│         Distributed Account Pool Manager (Redis)       │
│  - Select candidate: min(active_concurrency)           │
│  - Verify no active cooldown penalty                   │
│  - Atomic reservation: INCR account:{id}:concurrency   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Sticky Residential Proxy Egress            │
│  - Account 1 ──► Proxy Node 1 (Static Residential IP)  │
│  - Account 2 ──► Proxy Node 2 (Static Residential IP)  │
│  - Account N ──► Proxy Node N (Static Residential IP)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
        [ Upstream AI Providers / Antigravity APIs ]
```

---

## 3. Database Schema (PostgreSQL)

Run the following migration schema using Prisma or Drizzle ORM:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SaaS Customer Accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    balance_credits NUMERIC(12, 6) DEFAULT 0.000000, -- 1 credit = $1.00 USD
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customer API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_prefix VARCHAR(16) NOT NULL, -- e.g. "sk-live-a1b2"
    key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash of plaintext secret
    label VARCHAR(64) NOT NULL,
    rate_limit_rpm INT DEFAULT 60,
    rate_limit_tpm INT DEFAULT 100000,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- 3. Upstream Account Pool
CREATE TABLE upstream_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(32) NOT NULL, -- 'antigravity', 'google_gemini', 'vertex_fallback'
    account_email VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted
    token_expires_at TIMESTAMP WITH TIME ZONE,
    proxy_url VARCHAR(255) NOT NULL, -- http://user:pass@proxy-node:port
    max_concurrency INT DEFAULT 4,
    status VARCHAR(32) DEFAULT 'HEALTHY', -- 'HEALTHY', 'COOLING_DOWN', 'REVOKED', 'BANNED'
    failure_count INT DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Billing Transactions (Stripe / LemonSqueezy)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount_usd NUMERIC(10, 2) NOT NULL,
    credits_added NUMERIC(12, 6) NOT NULL,
    payment_provider VARCHAR(32) NOT NULL, -- 'stripe', 'lemonsqueezy'
    provider_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'COMPLETED', 'PENDING', 'FAILED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Usage Logs (Partitioned by month for high throughput)
CREATE TABLE usage_logs (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    api_key_id UUID NOT NULL,
    upstream_account_id UUID,
    model VARCHAR(64) NOT NULL,
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    cost_credits NUMERIC(12, 6) NOT NULL,
    latency_ms INT NOT NULL,
    status_code INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

---

## 4. Upstream Evasion &amp; Anti-Detect Architecture

When multiple requests are executed against upstream Google/Antigravity endpoints, standard cloud datacenters (AWS, DigitalOcean, Hetzner) trigger instantaneous bans.

### Egress Rules

1. **1-to-1 Static Residential IP Binding**:
   - Do not rotate IPs dynamically during a session. Assign a dedicated residential IP address to each Google account credential.
   - If Account 3 sends a request, it must exit through Proxy 3.
2. **Client Fingerprint Emulation**:
   - Outbound HTTP requests must not send generic `axios` or Node `undici` TLS fingerprints.
   - Emulate Chrome/Electron TLS extensions and HTTP/2 settings (JA3/JA4 fingerprinting).
   - Replicate the exact headers sent by the desktop client:
     ```http
     User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
     Sec-Fetch-Site: cross-site
     Sec-Fetch-Mode: cors
     Sec-Fetch-Dest: empty
     Accept-Encoding: gzip, deflate, br, zstd
     ```
3. **Session Stickiness for Multi-Turn Conversations**:
   - For conversations sharing the same `session_id` or context cache, route consecutive turns to the same upstream account whenever possible to preserve KV-cache acceleration.

---

## 5. Token Pre-Authorization &amp; Real-Time Billing

To prevent users with $0.05 from initiating 100,000-token queries, enforce atomic Redis reservations:

```
Step 1: Estimate Input Tokens (Tokenizer)
         Cost = (PromptTokens * ModelRateIn) + (MaxTokens * ModelRateOut)

Step 2: Atomic Credit Reservation in Redis
         LUA Script:
         IF redis.call('get', balance_key) >= estimated_cost THEN
             redis.call('decrby', balance_key, estimated_cost)
             return 1
         ELSE
             return 0
         END

Step 3: SSE Streaming Execution & Real-Time Output Metering
         As output tokens arrive: count tokens.
         If client disconnects or output finishes early:
         ActualCost = (PromptTokens * ModelRateIn) + (ActualOutputTokens * ModelRateOut)
         Refund = EstimatedCost - ActualCost

Step 4: Atomic Balance Reconciliation
         redis.call('incrby', balance_key, Refund)
         Async batch job syncs Redis balance to PostgreSQL every 60 seconds.
```

---

## 6. Official Fallback Failover (High SLA Architecture)

Commercial users expect 99.9% uptime. Pooled accounts can encounter unexpected upstream changes or temporary suspensions.

```
Incoming Request
       │
       ▼
[ Account Pool Lease ]
       │
       ├─► Account Available ──► Execute via Residential Proxy
       │                                │
       │                                ├─► 200 OK: Stream to user
       │                                └─► 429/403/5xx Handshake Failure
       │                                          │
       │                                          ▼
       └─► All Accounts Saturated / Failed ───────┤
                                                  │
                                                  ▼
                                      [ Official Fallback Layer ]
                                      - Official Google Vertex AI / AI Studio API
                                      - Higher direct cost to you
                                      - ZERO downtime to paying customer
```

---

## 7. Complete Implementation Phase Checklist

### Phase 1: Engine Decoupling &amp; Core Microservice

- [ ] Clone `Draculabo/AntigravityManager`.
- [ ] Isolate `GoogleAPIService.ts` and remove all Electron dependencies (`electron`, `@electron/remote`, `ipcRenderer`).
- [ ] Re-implement OAuth token refresh routines as an independent background worker.
- [ ] Replace `better-sqlite3` with PostgreSQL schema migrations.

### Phase 2: Gateway &amp; OpenAI Protocol Adaptation

- [ ] Scaffold Fastify / NestJS application with Redis client.
- [ ] Build `POST /v1/chat/completions` supporting streaming (`stream: true`) and non-streaming modes.
- [ ] Build `GET /v1/models` endpoint returning active supported models.
- [ ] Implement payload converter from OpenAI schema to Google/Gemini schema and vice-versa.
- [ ] Build Server-Sent Events (SSE) pipe handling `data: [DONE]`.

### Phase 3: Concurrency Engine &amp; Proxy Egress

- [ ] Implement Redis-backed atomic reservation (`account-pool.service.ts`).
- [ ] Configure outbound HTTP proxy agents (`https-proxy-agent`) for static residential proxies.
- [ ] Implement transparent failover: catch upstream 429s during handshake and retry with another account before sending headers.
- [ ] Add account penalty cooldown logic (60–300s TTL in Redis).

### Phase 4: Customer Auth, Tokenizer &amp; Billing

- [ ] Build API key generation and SHA-256 verification middleware with Redis caching.
- [ ] Implement token estimation and balance pre-authorization.
- [ ] Integrate Stripe webhook endpoint (`checkout.session.completed`) to credit customer balance.
- [ ] Add real-time token counter that cuts SSE connections if user credit reaches zero.

### Phase 5: Web Dashboard &amp; Customer Portal

- [ ] Setup Next.js application using the "Classic &amp; Soft" warm design system (Serif headings, cream backgrounds, terracotta accents).
- [ ] Add customer authentication (Clerk, Supabase Auth, or NextAuth).
- [ ] Build API Key creation/revocation screen.
- [ ] Build Usage Analytics dashboard (charts for token usage, expenditure, and latency).
- [ ] Build Credit Top-Up checkout screen.