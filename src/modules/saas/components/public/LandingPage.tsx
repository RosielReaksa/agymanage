import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Layers,
  Shield,
  Zap,
  BarChart3,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { useSaasModels } from '../../hooks/useSaas';
import type { ModelInfo } from '../../types';

const FEATURES = [
  {
    icon: Layers,
    title: 'One Unified Endpoint',
    body: 'Access Google Gemini 2.5 and Anthropic Claude 3.5 through one single OpenAI-compatible endpoint and key.',
  },
  {
    icon: Zap,
    title: 'Automatic Account Failover',
    body: 'If a provider lease rate-limits or degrades, your request instantly cascades to healthy leased accounts with zero downtime.',
  },
  {
    icon: Shield,
    title: 'Limits You Control',
    body: 'Set granular per-key rate limits, request concurrency limits, and monthly spend caps to prevent runaway expenses.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Metered Usage',
    body: 'Monitor live token usage, request latency, and exact token costs per key in your centralized console dashboard.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Request access',
    body: 'Tell us about your team, use case, and estimated volume through our simple form.',
  },
  {
    step: '02',
    title: 'Get your API key',
    body: 'We review your request and issue a provisioned secret key with assigned lease quotas.',
  },
  {
    step: '03',
    title: 'Send first request',
    body: 'Drop your key into your existing OpenAI SDK client or httpx and begin routing requests immediately.',
  },
];

const TRUST_POINTS = [
  'API keys are stored salted/hashed and revealed only once during creation.',
  'Prompts and completions are not logged or stored — only token usage metadata is tracked.',
  'Per-key spend quotas and instant revocation protect against compromised keys.',
  'Designed for secure server-to-server inference pipelines.',
];

export const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'curl' | 'python' | 'node'>('curl');
  const [copied, setCopied] = useState(false);

  const { data: models = [] } = useSaasModels();

  const apiBase = 'http://localhost:8045/v1';

  const snippets = {
    curl: `curl ${apiBase}/chat/completions \\
  -H "Authorization: Bearer sk-ant-live-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-5-sonnet",
    "messages": [
      {"role": "user", "content": "Explain quantum entanglement in 2 sentences."}
    ],
    "temperature": 0.7
  }'`,
    python: `import httpx

client = httpx.Client(base_url="${apiBase}", headers={
    "Authorization": "Bearer sk-ant-live-...",
})

response = client.post("/chat/completions", json={
    "model": "claude-3-5-sonnet",
    "messages": [{"role": "user", "content": "Explain quantum entanglement in 2 sentences."}],
    "temperature": 0.7,
})

print(response.json()["choices"][0]["message"]["content"])`,
    node: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${apiBase}",
  apiKey: "sk-ant-live-...",
});

const completion = await client.chat.completions.create({
  model: "claude-3-5-sonnet",
  messages: [{ role: "user", content: "Explain quantum entanglement in 2 sentences." }],
});

console.log(completion.choices[0].message.content);`,
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fallback featured models if query is loading or empty
  const displayModels: Partial<ModelInfo>[] = models.length > 0
    ? models.slice(0, 5)
    : [
        {
          id: 'claude-3-5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: 'Anthropic',
          contextWindow: '200k',
          inputPricePerMillion: 3.0,
          outputPricePerMillion: 15.0,
          status: 'active',
        },
        {
          id: 'gemini-2.5-pro',
          name: 'Gemini 2.5 Pro',
          provider: 'Google',
          contextWindow: '2M',
          inputPricePerMillion: 1.25,
          outputPricePerMillion: 5.0,
          status: 'active',
        },
        {
          id: 'claude-3-5-haiku',
          name: 'Claude 3.5 Haiku',
          provider: 'Anthropic',
          contextWindow: '200k',
          inputPricePerMillion: 0.8,
          outputPricePerMillion: 4.0,
          status: 'active',
        },
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          provider: 'Google',
          contextWindow: '1M',
          inputPricePerMillion: 0.075,
          outputPricePerMillion: 0.3,
          status: 'active',
        },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 dark:bg-[#161514] dark:text-[#EFECE6] font-sans selection:bg-[#F4ECE7] selection:text-[#C85A32] dark:selection:bg-[#2A201C] dark:selection:text-[#E28567]">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-20 pb-16 md:pt-28 md:pb-24 border-b border-[#E8E4DC] dark:border-[#34312C]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Headlines & CTA */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E8D6CC] bg-[#FDF8F6] text-xs font-mono text-[#C85A32] dark:border-[#3D2C24] dark:bg-[#2A201C] dark:text-[#E28567]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Next-Generation Intelligent Gateway</span>
                </div>

                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6] leading-[1.12]">
                  One API for fast, reliable AI models
                </h1>

                <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl font-normal">
                  Automatic multi-account leasing, zero-downtime failover, per-key budgets, and real-time metering.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link to="/request-access">
                    <Button className="h-11 px-6 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514] font-medium text-sm shadow-soft-card transition-all">
                      Request Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <Link to="/docs">
                    <Button
                      variant="outline"
                      className="h-11 px-6 rounded-xl border-[#E8E4DC] bg-white hover:bg-stone-100 text-stone-800 dark:border-[#34312C] dark:bg-[#1E1D1A] dark:text-[#EFECE6] dark:hover:bg-stone-800 text-sm shadow-soft-sm font-medium"
                    >
                      Read the Docs
                    </Button>
                  </Link>
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400">
                  No self-serve signup. Available by invitation only.
                </p>
              </div>

              {/* Right Column: Tabbed Code Card */}
              <div className="lg:col-span-5 min-w-0">
                <div className="rounded-2xl border border-[#E8E4DC] bg-white shadow-soft-card overflow-hidden dark:border-[#34312C] dark:bg-[#1E1D1A]">
                  {/* Card Header & Tabs */}
                  <div className="flex items-center justify-between border-b border-[#E8E4DC] px-4 py-3 bg-[#FAF8F5]/60 dark:border-[#34312C] dark:bg-[#161514]/60">
                    <div className="flex items-center gap-1.5">
                      {(['curl', 'python', 'node'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
                            activeTab === tab
                              ? 'bg-[#F4ECE7] text-[#C85A32] font-semibold dark:bg-[#2A201C] dark:text-[#E28567]'
                              : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                          }`}
                        >
                          {tab === 'curl' ? 'cURL' : tab === 'python' ? 'Python' : 'Node.js'}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCode}
                      className="h-7 px-2 text-xs font-mono text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                    >
                      {copied ? (
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

                  {/* Code Area */}
                  <div className="p-4 overflow-x-auto bg-[#1C1917] text-[#EFECE6] text-xs font-mono leading-relaxed">
                    <pre>
                      <code>{snippets[activeTab]}</code>
                    </pre>
                  </div>
                </div>

                <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-400">
                  OpenAI-compatible. Change the base URL and key, keep your existing code.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 md:py-24 border-b border-[#E8E4DC] dark:border-[#34312C]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl mb-12">
              <h2 className="font-serif text-3xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
                Engineered for High-Reliability AI
              </h2>
              <p className="mt-3 text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                Antigravity Gateway eliminates upstream API single points of failure while giving you complete governance over tokens and costs.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feat) => {
                const IconComponent = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-soft-sm dark:border-[#34312C] dark:bg-[#1E1D1A] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24] mb-4">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-[#EFECE6]">
                        {feat.title}
                      </h3>
                      <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                        {feat.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured Models Preview */}
        <section className="py-20 md:py-24 border-b border-[#E8E4DC] dark:border-[#34312C] bg-white/50 dark:bg-[#1A1916]/50">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-serif text-3xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
                  Available Models
                </h2>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                  Select and route through state-of-the-art models with transparent token-based pricing.
                </p>
              </div>

              <Link
                to="/models"
                className="text-xs font-mono font-medium text-[#C85A32] hover:underline dark:text-[#E28567] flex items-center gap-1"
              >
                View all models &rarr;
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E8E4DC] bg-white shadow-soft-sm overflow-hidden dark:border-[#34312C] dark:bg-[#1E1D1A]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E4DC] bg-[#FAF8F5] dark:border-[#34312C] dark:bg-[#161514] font-mono text-stone-500">
                      <th className="py-3 px-4 font-medium">Model</th>
                      <th className="py-3 px-4 font-medium">Provider</th>
                      <th className="py-3 px-4 font-medium">Context Window</th>
                      <th className="py-3 px-4 font-medium text-right">Input / 1M</th>
                      <th className="py-3 px-4 font-medium text-right">Output / 1M</th>
                      <th className="py-3 px-4 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E4DC] dark:divide-[#34312C]">
                    {displayModels.map((m) => (
                      <tr key={m.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-stone-900 dark:text-[#EFECE6]">
                          {m.name || m.id}
                        </td>
                        <td className="py-3 px-4 text-stone-600 dark:text-stone-400">
                          {m.provider}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600 dark:text-stone-400">
                          {m.contextWindow || '200k'}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-stone-600 dark:text-stone-400">
                          ${m.inputPricePerMillion?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-stone-600 dark:text-stone-400">
                          ${m.outputPricePerMillion?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#EAF3ED] text-[#4D7C5F] dark:bg-[#1E2822] dark:text-[#6CA882]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4D7C5F] animate-pulse" />
                            Operational
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works (3 Steps) */}
        <section className="py-20 md:py-24 border-b border-[#E8E4DC] dark:border-[#34312C]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-xl mb-12">
              <h2 className="font-serif text-3xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
                How It Works
              </h2>
              <p className="mt-3 text-stone-600 dark:text-stone-400 text-sm">
                Three simple steps to integrate resilient AI routing into your systems.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div
                  key={s.step}
                  className="rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-soft-sm dark:border-[#34312C] dark:bg-[#1E1D1A]"
                >
                  <span className="font-mono text-xs font-semibold text-[#C85A32] dark:text-[#E28567]">
                    Step {s.step}
                  </span>
                  <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-[#EFECE6] mt-2">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust & Security */}
        <section className="py-20 md:py-24 border-b border-[#E8E4DC] dark:border-[#34312C]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3ED] text-[#4D7C5F] mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="font-serif text-3xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
                  Trust & Security First
                </h2>
                <p className="mt-3 text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                  We built Antigravity Gateway with zero compromise on security, privacy, and governance.
                </p>
              </div>

              <div className="space-y-4">
                {TRUST_POINTS.map((pt) => (
                  <div
                    key={pt}
                    className="flex items-start gap-3 rounded-xl border border-[#E8E4DC] bg-white p-4 shadow-soft-sm dark:border-[#34312C] dark:bg-[#1E1D1A]"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#4D7C5F] shrink-0 mt-0.5" />
                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                      {pt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 bg-[#FAF8F5] dark:bg-[#161514]">
          <div className="mx-auto max-w-4xl px-6 text-center space-y-6">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
              Ready to unify your model infrastructure?
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xl mx-auto leading-relaxed">
              Submit an access request for your engineering team. We review requests promptly and reply with your initial quota and API keys.
            </p>
            <div className="pt-2 flex justify-center">
              <Link to="/request-access">
                <Button className="h-11 px-8 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514] font-medium text-sm shadow-soft-card transition-all">
                  Request Access Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
