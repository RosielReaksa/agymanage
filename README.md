# Antigravity Gateway & SaaS Platform

> Multi-Tenant AI Gateway, High-Concurrency Provider Pool & Metered Developer Platform

Antigravity Gateway is an OpenAI-compatible API proxy gateway and web dashboard. It enables pooling multiple upstream AI provider accounts with atomic concurrency leasing, transparent pre-stream failovers, real-time token metering, and multi-tenant developer billing.

---

## Key Features

- **OpenAI-Compatible Endpoints**: Connect tools like Claude Code, Cursor, OpenCode, Codex, or native SDKs via standard `/v1/chat/completions` and `/v1/models`.
- **High-Concurrency Account Balancer**:
  - Atomic in-flight concurrency tracking (`acquireLease` / `releaseLease`).
  - Least-concurrency routing across pool accounts.
  - Model-scoped rate-limit cooldowns (60s–300s TTL).
  - Transparent pre-stream failovers retrying alternative accounts on `429`/`403`/`5xx` before SSE stream chunk delivery.
- **SaaS Metering & Multi-Tenant Billing**:
  - `sk-live-...` SHA-256 hashed API key validation.
  - Real-time token consumption deduction on both non-streaming and Server-Sent Event (SSE) streams.
  - SQLite persistent ledger recording exact model, prompt tokens, completion tokens, latency, and cost.
- **Classic Soft Claude / OpenRouter UI**:
  - Warm ivory paper canvas (`#FAF8F5`) with terracotta accents and sage status badges.
  - Live balance pill, quickstart code snippets (cURL, Python, Node.js), API key generation, models catalog, and usage ledger.
- **Zero-Docker Native Runtime**:
  - Lightweight, runs natively on Windows/Linux/macOS with Node.js and Fastify/NestJS.

---

## Quick Start

### Prerequisites
- Node.js `24.x` (or `22.x+`)
- pnpm `10.x`

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build the Web Application
```bash
pnpm run build
```

### 3. Start the Server
On Windows:
```cmd
start-web.bat
```
Or with PowerShell:
```powershell
.\start-web.ps1
```
Or directly with npm/pnpm:
```bash
pnpm start
```

The web dashboard will be available at:
- **Web UI**: `http://localhost:8045`
- **API Base URL**: `http://localhost:8045/v1`

---

## API Usage

### Authentication
All requests to `/v1` require an `Authorization` header with your API key:
```
Authorization: Bearer sk-live-<YOUR_KEY>
```

### Models List
```bash
curl -X GET http://localhost:8045/v1/models \
  -H "Authorization: Bearer sk-live-YOUR_API_KEY"
```

### Chat Completions (Streaming)
```bash
curl -X POST http://localhost:8045/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-live-YOUR_API_KEY" \
  -d '{
    "model": "claude-sonnet-4-6-thinking",
    "stream": true,
    "messages": [
      {"role": "user", "content": "Explain quantum computing in one sentence."}
    ]
  }'
```

### Python SDK Example
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8045/v1",
    api_key="sk-live-YOUR_API_KEY"
)

response = client.chat.completions.create(
    model="claude-sonnet-4-6-thinking",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

---

## Project Structure

```text
agymanage/
├── dist/                  # Built web bundles & server runtime
├── src/
│   ├── modules/
│   │   ├── saas/          # Multi-tenant billing, API keys, usage ledger & UI
│   │   ├── proxy-gateway/ # High-concurrency balancer, account leasing & upstream clients
│   │   ├── cloud-account/ # Upstream cloud account persistence & auth
│   │   └── ...
│   ├── shared/            # Shared persistence (SQLite/Drizzle), utilities
│   ├── routes/            # Web application routes
│   └── web/               # Fastify web entry point
├── start-web.bat          # Native Windows batch launcher
├── start-web.ps1          # Native PowerShell launcher
└── vite.web.config.mts    # Server bundle configuration
```

---

## License

[MIT](LICENSE)
