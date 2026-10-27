import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, Sparkles, Zap, Eye, Wrench, CheckCircle2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { useSaasModels } from '../../hooks/useSaas';
import type { ModelInfo } from '../../types';

interface ExtendedModelInfo extends Partial<ModelInfo> {
  id: string;
  name: string;
  provider: 'Google' | 'Anthropic';
  contextWindow: string;
  contextLength?: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  latencyBenchmark: string;
  supportsVision: boolean;
  supportsTools: boolean;
  description: string;
  status: 'active' | 'degraded' | 'offline';
}

const DEFAULT_MODELS: ExtendedModelInfo[] = [
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextWindow: '200k',
    contextLength: 200000,
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    latencyBenchmark: '~720ms',
    supportsVision: true,
    supportsTools: true,
    description: 'Anthropic flagship reasoning and coding model with exceptional benchmark performance.',
    status: 'active',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    contextWindow: '2M',
    contextLength: 2000000,
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.0,
    latencyBenchmark: '~850ms',
    supportsVision: true,
    supportsTools: true,
    description: 'Massive 2-million-token multimodal context with state-of-the-art multi-lingual reasoning.',
    status: 'active',
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextWindow: '200k',
    contextLength: 200000,
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 4.0,
    latencyBenchmark: '< 380ms',
    supportsVision: true,
    supportsTools: true,
    description: 'Ultra-fast, cost-effective Claude intelligence for high-throughput streaming workloads.',
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    contextWindow: '1M',
    contextLength: 1000000,
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.3,
    latencyBenchmark: '< 290ms',
    supportsVision: true,
    supportsTools: true,
    description: 'Lightning-fast Google model optimized for low-latency agentic loops and high concurrency.',
    status: 'active',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    contextWindow: '200k',
    contextLength: 200000,
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    latencyBenchmark: '~1400ms',
    supportsVision: true,
    supportsTools: true,
    description: 'Maximum depth reasoning model for complex qualitative research and difficult domain problems.',
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash-thinking',
    name: 'Gemini 2.5 Flash Thinking',
    provider: 'Google',
    contextWindow: '1M',
    contextLength: 1000000,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
    latencyBenchmark: '~650ms',
    supportsVision: true,
    supportsTools: true,
    description: 'Extended chain-of-thought variant of Gemini Flash for math and competitive programming.',
    status: 'active',
  },
];

export const PublicModelsPage: React.FC = () => {
  const { data: serverModels = [] } = useSaasModels();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'All' | 'Google' | 'Anthropic'>('All');
  const [filterVision, setFilterVision] = useState(false);
  const [filterTools, setFilterTools] = useState(false);
  const [filterLargeContext, setFilterLargeContext] = useState(false);

  // Merge server models with fallback catalog details
  const modelsList = useMemo<ExtendedModelInfo[]>(() => {
    if (serverModels.length === 0) return DEFAULT_MODELS;

    return serverModels.map((sm) => {
      const match = DEFAULT_MODELS.find(
        (dm) => dm.id.toLowerCase() === sm.id.toLowerCase() || dm.name.toLowerCase() === sm.name.toLowerCase()
      );
      return {
        id: sm.id,
        name: sm.name || sm.id,
        provider: (sm.provider === 'Google' || sm.provider === 'Anthropic') ? sm.provider : (match?.provider || 'Google'),
        contextWindow: sm.contextWindow || (match?.contextWindow ?? '200k'),
        contextLength: sm.contextLength || match?.contextLength || 200000,
        inputPricePerMillion: sm.inputPricePerMillion ?? match?.inputPricePerMillion ?? 1.0,
        outputPricePerMillion: sm.outputPricePerMillion ?? match?.outputPricePerMillion ?? 5.0,
        latencyBenchmark: match?.latencyBenchmark || '~600ms',
        supportsVision: match?.supportsVision ?? true,
        supportsTools: match?.supportsTools ?? true,
        description: sm.description || match?.description || 'High-throughput enterprise AI intelligence model.',
        status: sm.status || 'active',
      };
    });
  }, [serverModels]);

  const filteredModels = useMemo(() => {
    return modelsList.filter((model) => {
      const matchesSearch =
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.description.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedProvider !== 'All' && model.provider !== selectedProvider) {
        return false;
      }

      if (filterVision && !model.supportsVision) return false;
      if (filterTools && !model.supportsTools) return false;
      if (filterLargeContext && (model.contextLength || 0) < 1000000) return false;

      return true;
    });
  }, [modelsList, searchTerm, selectedProvider, filterVision, filterTools, filterLargeContext]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 dark:bg-[#161514] dark:text-[#EFECE6] font-sans selection:bg-[#F4ECE7] selection:text-[#C85A32] dark:selection:bg-[#2A201C] dark:selection:text-[#E28567]">
      <PublicNavbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-6 space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E8D6CC] bg-[#FDF8F6] text-xs font-mono text-[#C85A32] dark:border-[#3D2C24] dark:bg-[#2A201C] dark:text-[#E28567]">
              <span>Verified Provider Fleet</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-900 dark:text-[#EFECE6]">
              Supported Models & Pricing
            </h1>
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed">
              Transparent per-token pricing with zero markup on upstream leases. Every model is reachable through a single unified endpoint with instant failover.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="rounded-2xl border border-[#E8E4DC] bg-white p-4 shadow-soft-sm dark:border-[#34312C] dark:bg-[#1E1D1A] space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Search models by name or provider..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 rounded-xl text-xs border-[#E8E4DC] bg-[#FAF8F5]/50 dark:border-[#34312C] dark:bg-[#161514]/50"
                />
              </div>

              {/* Provider Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF8F5] dark:bg-[#161514] border border-[#E8E4DC] dark:border-[#34312C] self-start sm:self-auto">
                {(['All', 'Google', 'Anthropic'] as const).map((prov) => (
                  <button
                    key={prov}
                    onClick={() => setSelectedProvider(prov)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedProvider === prov
                        ? 'bg-white shadow-soft-sm text-[#C85A32] dark:bg-[#1E1D1A] dark:text-[#E28567]'
                        : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-[#EFECE6]'
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E8E4DC]/60 dark:border-[#34312C]/60 text-xs">
              <span className="text-stone-500 font-mono text-[11px] mr-1">Filters:</span>
              <button
                onClick={() => setFilterVision(!filterVision)}
                className={`px-2.5 py-1 rounded-full border transition-all text-xs flex items-center gap-1 ${
                  filterVision
                    ? 'border-[#C85A32] bg-[#F4ECE7] text-[#C85A32] dark:border-[#E28567] dark:bg-[#2A201C] dark:text-[#E28567]'
                    : 'border-[#E8E4DC] text-stone-600 hover:border-stone-400 dark:border-[#34312C] dark:text-stone-400'
                }`}
              >
                <Eye className="h-3 w-3" />
                Vision Capable
              </button>

              <button
                onClick={() => setFilterTools(!filterTools)}
                className={`px-2.5 py-1 rounded-full border transition-all text-xs flex items-center gap-1 ${
                  filterTools
                    ? 'border-[#C85A32] bg-[#F4ECE7] text-[#C85A32] dark:border-[#E28567] dark:bg-[#2A201C] dark:text-[#E28567]'
                    : 'border-[#E8E4DC] text-stone-600 hover:border-stone-400 dark:border-[#34312C] dark:text-stone-400'
                }`}
              >
                <Wrench className="h-3 w-3" />
                Tool / Function Calling
              </button>

              <button
                onClick={() => setFilterLargeContext(!filterLargeContext)}
                className={`px-2.5 py-1 rounded-full border transition-all text-xs flex items-center gap-1 ${
                  filterLargeContext
                    ? 'border-[#C85A32] bg-[#F4ECE7] text-[#C85A32] dark:border-[#E28567] dark:bg-[#2A201C] dark:text-[#E28567]'
                    : 'border-[#E8E4DC] text-stone-600 hover:border-stone-400 dark:border-[#34312C] dark:text-stone-400'
                }`}
              >
                <Zap className="h-3 w-3" />
                1M+ Context Window
              </button>
            </div>
          </div>

          {/* Models Table Card */}
          <div className="rounded-2xl border border-[#E8E4DC] bg-white shadow-soft-card overflow-hidden dark:border-[#34312C] dark:bg-[#1E1D1A]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4DC] bg-[#FAF8F5] dark:border-[#34312C] dark:bg-[#161514] font-mono text-stone-500">
                    <th className="py-3.5 px-4 font-medium">Model</th>
                    <th className="py-3.5 px-4 font-medium">Provider</th>
                    <th className="py-3.5 px-4 font-medium">Context Window</th>
                    <th className="py-3.5 px-4 font-medium text-right">Input / 1M</th>
                    <th className="py-3.5 px-4 font-medium text-right">Output / 1M</th>
                    <th className="py-3.5 px-4 font-medium text-center">Latency</th>
                    <th className="py-3.5 px-4 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DC] dark:divide-[#34312C]">
                  {filteredModels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-500 font-mono text-xs">
                        No models matched your current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredModels.map((m) => (
                      <tr key={m.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <span className="font-mono font-semibold text-stone-900 dark:text-[#EFECE6] text-xs">
                              {m.name}
                            </span>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-md line-clamp-1">
                              {m.description}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-stone-700 dark:text-stone-300">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-medium ${
                            m.provider === 'Anthropic'
                              ? 'bg-[#F4ECE7] text-[#C85A32] dark:bg-[#2A201C] dark:text-[#E28567]'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}>
                            {m.provider}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-stone-700 dark:text-stone-300">
                          {m.contextWindow}
                        </td>
                        <td className="py-4 px-4 font-mono text-right text-stone-800 dark:text-stone-200">
                          ${m.inputPricePerMillion.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 font-mono text-right text-stone-800 dark:text-stone-200">
                          ${m.outputPricePerMillion.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded font-mono text-[10px] bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                            {m.latencyBenchmark}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#EAF3ED] text-[#4D7C5F] dark:bg-[#1E2822] dark:text-[#6CA882]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4D7C5F] animate-pulse" />
                            Operational
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-soft-sm dark:border-[#34312C] dark:bg-[#1E1D1A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-[#EFECE6]">
                Need dedicated private accounts or custom rate tiers?
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Enterprise teams can connect dedicated Google Cloud or Anthropic tenant leases directly into the gateway.
              </p>
            </div>
            <Link to="/request-access">
              <Button size="sm" className="h-9 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514] text-xs font-medium whitespace-nowrap">
                Contact for Enterprise
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
