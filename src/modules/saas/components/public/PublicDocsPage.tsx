import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Copy,
  Check,
  Terminal,
  Key,
  Layers,
  Zap,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ERROR_CODES = [
  {
    code: '400',
    type: 'invalid_request_error',
    description: 'The JSON payload is malformed or required parameters (such as messages) are missing.',
  },
  {
    code: '401',
    type: 'authentication_error',
    description: 'Missing, malformed, or invalid API key in Authorization: Bearer header.',
  },
  {
    code: '402',
    type: 'insufficient_quota',
    description: 'Account balance is zero or credit limit exceeded. Add credits in the console.',
  },
  {
    code: '429',
    type: 'rate_limit_exceeded',
    description: 'Requests per minute, concurrency, or monthly spend cap reached. Check Retry-After.',
  },
  {
    code: '503',
    type: 'upstream_exhausted',
    description: 'All upstream account leases failed or are temporarily degraded. Gateway is attempting recovery.',
  },
];

export const PublicDocsPage: React.FC = () => {
  const [activeLang, setActiveLang] = useState<'curl' | 'python' | 'node'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseUrl = 'http://localhost:8045/v1';

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const codeSnippets = {
    curl: `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer sk-ant-live-49204918230912" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-5-sonnet",
    "messages": [
      {"role": "system", "content": "You are a concise, senior software architect."},
      {"role": "user", "content": "Explain raft consensus in three bullet points."}
    ],
    "temperature": 0.5,
    "max_tokens": 512
  }'`,
    python: `import httpx

client = httpx.Client(
    base_url="${baseUrl}",
    headers={"Authorization": "Bearer sk-ant-live-49204918230912"},
    timeout=60.0
)

response = client.post("/chat/completions", json={
    "model": "gemini-2.5-flash",
    "messages": [
        {"role": "user", "content": "Generate a TypeScript type for a payment intent."}
    ],
    "temperature": 0.2,
})

data = response.json()
print(data["choices"][0]["message"]["content"])
print(f"Tokens: {data['usage']['total_tokens']} | Cost: \${data['gateway']['cost_usd']}")`,
    node: `import OpenAI from "openai";

const gateway = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "sk-ant-live-49204918230912",
});

const response = await gateway.chat.completions.create({
  model: "claude-3-5-sonnet",
  messages: [{ role: "user", content: "Write a high-performance LRU cache in Rust." }],
  max_tokens: 1024,
});

console.log(response.choices[0].message.content);`,
  };

  const streamingExample = `// Server-Sent Events (SSE) Streaming Example
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "sk-ant-live-...",
});

const stream = await client.chat.completions.create({
  model: "gemini-2.5-pro",
  messages: [{ role: "user", content: "Stream a step-by-step migration plan." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`;

  const responseJson = `{
  "id": "chatcmpl-8kL9s20194819",
  "object": "chat.completion",
  "created": 1729938102,
  "model": "claude-3-5-sonnet",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Raft is a leader-based consensus algorithm..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 28,
    "completion_tokens": 142,
    "total_tokens": 170
  },
  "gateway": {
    "provider": "anthropic",
    "leased_account": "pool-tenant-primary-01",
    "latency_ms": 684,
    "cost_usd": 0.002214
  }
}`;

  const navItems = [
    { id: 'quickstart', label: 'Quickstart' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'chat-completions', label: 'Chat Completions' },
    { id: 'streaming', label: 'SSE Streaming' },
    { id: 'errors', label: 'HTTP Error Codes' },
    { id: 'retries', label: 'Retries & Failover' },
  ];

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div>
        <div className="grid gap-12 lg:grid-cols-12">
            {/* Sidebar Sticky Navigation */}
            <aside className="lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                <div className="font-mono text-xs uppercase tracking-wider text-stone-500 font-semibold px-3">
                  Documentation
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block px-3 py-1.5 rounded-lg text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 dark:text-stone-400 dark:hover:text-[#EFECE6] dark:hover:bg-stone-800/50 transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>

                <div className="pt-4 border-t border-[#E8E4DC] dark:border-[#34312C] px-3 space-y-2">
                  <span className="text-[11px] font-mono text-stone-500">Need an API key?</span>
                  <Link to="/" className="block text-xs font-medium text-[#C85A32] hover:underline dark:text-[#E28567]">
                    Generate Key in Overview &rarr;
                  </Link>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:col-span-9 space-y-14 min-w-0">
              {/* Header */}
              <div className="space-y-3 border-b border-[#E8E4DC] pb-8 dark:border-[#34312C]">
                <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
                  Gateway API Reference
                </h1>
                <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl">
                  Antigravity Gateway provides a drop-in replacement for OpenAI endpoints that routes automatically across leased Google and Anthropic backend accounts.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="font-mono text-xs text-stone-500">Base URL:</span>
                  <code className="font-mono text-xs px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#E8E4DC] text-stone-800 dark:bg-[#1E1D1A] dark:border-[#34312C] dark:text-stone-200">
                    {baseUrl}
                  </code>
                </div>
              </div>

              {/* Quickstart Section */}
              <section id="quickstart" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2 text-stone-900 dark:text-[#EFECE6]">
                  <Terminal className="h-4.5 w-4.5 text-[#C85A32] dark:text-[#E28567]" />
                  <h2 className="font-serif text-2xl font-medium">Quickstart</h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Connect any standard OpenAI SDK client by updating the <code className="font-mono">baseURL</code> and passing your gateway API key.
                </p>

                {/* Tabbed Code Snippet */}
                <div className="rounded-2xl border border-[#E8E4DC] bg-white shadow-soft-sm overflow-hidden dark:border-[#34312C] dark:bg-[#1E1D1A]">
                  <div className="flex items-center justify-between border-b border-[#E8E4DC] px-4 py-2.5 bg-[#FAF8F5]/80 dark:border-[#34312C] dark:bg-[#161514]/80">
                    <div className="flex items-center gap-1.5">
                      {(['curl', 'python', 'node'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setActiveLang(lang)}
                          className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
                            activeLang === lang
                              ? 'bg-[#F4ECE7] text-[#C85A32] font-semibold dark:bg-[#2A201C] dark:text-[#E28567]'
                              : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                          }`}
                        >
                          {lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : 'Node.js'}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy('quickstart', codeSnippets[activeLang])}
                      className="h-7 px-2 text-xs font-mono text-stone-500 hover:text-stone-900"
                    >
                      {copiedKey === 'quickstart' ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-[#4D7C5F]" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 bg-[#1C1917] text-[#EFECE6] font-mono text-xs overflow-x-auto leading-relaxed">
                    <pre>
                      <code>{codeSnippets[activeLang]}</code>
                    </pre>
                  </div>
                </div>
              </section>

              {/* Authentication Section */}
              <section id="authentication" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2 text-stone-900 dark:text-[#EFECE6]">
                  <Key className="h-4.5 w-4.5 text-[#C85A32] dark:text-[#E28567]" />
                  <h2 className="font-serif text-2xl font-medium">Authentication</h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Authenticate every HTTP request by supplying your provisioned API key in the <code className="font-mono">Authorization</code> header using the Bearer scheme:
                </p>

                <div className="rounded-xl border border-[#E8E4DC] bg-white p-4 font-mono text-xs shadow-soft-sm dark:border-[#34312C] dark:bg-[#1E1D1A] flex items-center justify-between">
                  <span className="text-stone-800 dark:text-stone-200">
                    Authorization: Bearer <span className="text-[#C85A32] dark:text-[#E28567]">sk-ant-live-49204918230912</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy('auth-header', 'Authorization: Bearer sk-ant-live-49204918230912')}
                    className="h-7 px-2 text-xs font-mono"
                  >
                    {copiedKey === 'auth-header' ? <Check className="h-3 w-3 text-[#4D7C5F]" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>

                <div className="rounded-xl border border-[#E8D6CC] bg-[#FDF8F6] p-4 text-xs text-[#A44422] dark:border-[#3D2C24] dark:bg-[#2A201C] dark:text-[#E28567] leading-relaxed">
                  <strong>Security Directive:</strong> Gateway API keys are exclusively designed for server-to-server environments. Never embed secret keys in client-side React bundles, public repositories, or mobile applications.
                </div>
              </section>

              {/* Chat Completions Schema */}
              <section id="chat-completions" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2 text-stone-900 dark:text-[#EFECE6]">
                  <Layers className="h-4.5 w-4.5 text-[#C85A32] dark:text-[#E28567]" />
                  <h2 className="font-serif text-2xl font-medium">Chat Completions Response Schema</h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Responses conform to the OpenAI specification and include an enriched <code className="font-mono">gateway</code> payload detailing the specific lease, latency, and exact token cost.
                </p>

                <div className="rounded-2xl border border-[#E8E4DC] bg-white shadow-soft-sm overflow-hidden dark:border-[#34312C] dark:bg-[#1E1D1A]">
                  <div className="flex items-center justify-between border-b border-[#E8E4DC] px-4 py-2 bg-[#FAF8F5] dark:border-[#34312C] dark:bg-[#161514]">
                    <span className="font-mono text-xs text-stone-500">200 OK — JSON Response</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy('response-json', responseJson)}
                      className="h-6 px-2 text-xs font-mono"
                    >
                      {copiedKey === 'response-json' ? <Check className="h-3 w-3 text-[#4D7C5F]" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="p-4 bg-[#1C1917] text-[#EFECE6] font-mono text-xs overflow-x-auto leading-relaxed">
                    <pre>
                      <code>{responseJson}</code>
                    </pre>
                  </div>
                </div>
              </section>

              {/* SSE Streaming Section */}
              <section id="streaming" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2 text-stone-900 dark:text-[#EFECE6]">
                  <Zap className="h-4.5 w-4.5 text-[#C85A32] dark:text-[#E28567]" />
                  <h2 className="font-serif text-2xl font-medium">Server-Sent Events (SSE) Streaming</h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Set <code className="font-mono">"stream": true</code> in your request payload to receive chunks over an SSE stream as the upstream model generates tokens.
                </p>

                <div className="rounded-2xl border border-[#E8E4DC] bg-white shadow-soft-sm overflow-hidden dark:border-[#34312C] dark:bg-[#1E1D1A]">
                  <div className="p-4 bg-[#1C1917] text-[#EFECE6] font-mono text-xs overflow-x-auto leading-relaxed">
                    <pre>
                      <code>{streamingExample}</code>
                    </pre>
                  </div>
                </div>
              </section>

              {/* Error Codes Reference */}
              <section id="errors" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2 text-stone-900 dark:text-[#EFECE6]">
                  <AlertTriangle className="h-4.5 w-4.5 text-[#C85A32] dark:text-[#E28567]" />
                  <h2 className="font-serif text-2xl font-medium">Standard HTTP Error Codes</h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  When a request cannot be fulfilled, the gateway responds with standard HTTP status codes and structured error bodies.
                </p>

                <div className="rounded-2xl border border-[#E8E4DC] bg-white shadow-soft-sm overflow-hidden dark:border-[#34312C] dark:bg-[#1E1D1A]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E8E4DC] bg-[#FAF8F5] dark:border-[#34312C] dark:bg-[#161514] font-mono text-stone-500">
                          <th className="py-3 px-4 font-medium w-16">Status</th>
                          <th className="py-3 px-4 font-medium w-44">Code</th>
                          <th className="py-3 px-4 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E4DC] dark:divide-[#34312C]">
                        {ERROR_CODES.map((err) => (
                          <tr key={err.code} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20">
                            <td className="py-3 px-4 font-mono font-semibold text-stone-900 dark:text-[#EFECE6]">
                              {err.code}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#C85A32] dark:text-[#E28567]">
                              {err.type}
                            </td>
                            <td className="py-3 px-4 text-stone-600 dark:text-stone-400">
                              {err.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Retries & Failover */}
              <section id="retries" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2 text-stone-900 dark:text-[#EFECE6]">
                  <RefreshCw className="h-4.5 w-4.5 text-[#C85A32] dark:text-[#E28567]" />
                  <h2 className="font-serif text-2xl font-medium">Automatic Account Leases & Failover</h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Unlike traditional proxies that fail on provider rate limits, Antigravity Gateway maintains dynamic leases across multiple upstream provider accounts.
                </p>
                <div className="rounded-xl border border-[#E8E4DC] bg-white p-6 shadow-soft-sm dark:border-[#34312C] dark:bg-[#1E1D1A] space-y-3">
                  <div className="flex items-center gap-2 font-mono text-xs text-stone-700 dark:text-stone-300">
                    <span className="h-2 w-2 rounded-full bg-[#4D7C5F]" />
                    <span>Cascading Health Monitoring</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    If account Lease A returns HTTP 429 or high latency, the gateway transparently reroutes your request to Lease B in the pool within milliseconds without terminating your HTTP connection.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
  );
};
