import React, { useState } from 'react';
import {
  useSaasUser,
  useSaasKeys,
  useSaasModels,
  useSaasUsageLogs,
} from '../hooks/useSaas';
import { AddCreditsModal } from './AddCreditsModal';
import { GenerateKeyModal } from './GenerateKeyModal';
import { QuickstartCard } from './QuickstartCard';
import { ModelsCatalog } from './ModelsCatalog';
import { UsageLedger } from './UsageLedger';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Coins,
  Sparkles,
} from 'lucide-react';
import type { ApiKey, CreatedSaasApiKey } from '../types';

export const DashboardHero: React.FC = () => {
  const { data: user } = useSaasUser();
  const { data: keys = [] } = useSaasKeys();
  const { data: models = [], isLoading: isModelsLoading } = useSaasModels();
  const { data: usageLogs = [], isLoading: isLogsLoading } = useSaasUsageLogs(20);

  const [activeKeyIndex, setActiveKeyIndex] = useState<number>(0);
  const [showKeySecret, setShowKeySecret] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [addCreditsOpen, setAddCreditsOpen] = useState<boolean>(false);
  const [generateKeyOpen, setGenerateKeyOpen] = useState<boolean>(false);

  const { toast } = useToast();

  const activeKey: ApiKey | undefined = keys[activeKeyIndex] || keys[0];

  const handleCopy = (textToCopy?: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Secret Key Copied',
      description: 'API key has been copied to your clipboard.',
    });
  };

  const currentBalance = user?.balanceUsd ?? user?.balance ?? 25.0;

  const displayCreated = (createdAt?: number | string) => {
    if (!createdAt) return 'Recently';
    if (typeof createdAt === 'number') {
      return new Date(createdAt).toLocaleDateString();
    }
    return new Date(createdAt).toLocaleDateString();
  };

  const rawKeySecret = activeKey?.key || activeKey?.apiKey || activeKey?.maskedKey || 'sk-ant-live-49204918230912';
  const maskedKeySecret = activeKey?.maskedKey || 'sk-ant-live-4920••••••••12';

  return (
    <div className="w-full space-y-10 pb-16">
      {/* Editorial Heading & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E4DC] pb-8 dark:border-[#34312C]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
              High-Throughput Gateway
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs font-mono text-stone-500 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4D7C5F] animate-pulse"></span>
              All Systems Operational
            </span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl text-stone-900 tracking-tight dark:text-[#EFECE6]">
            API Credentials & Routing
          </h1>
          <p className="text-[#6E6A64] text-base font-normal max-w-2xl leading-relaxed dark:text-[#9E988F]">
            Standard OpenAI-compatible drop-in endpoints powered by high-throughput pooled infrastructure. Route effortlessly to frontier models with automated failover and quota balancing.
          </p>
        </div>

        {/* Balance Card & Add Credits Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white border border-[#E8E4DC] rounded-2xl px-5 py-3 shadow-soft-sm flex items-center gap-3 dark:bg-[#1E1D1A] dark:border-[#34312C]">
            <div className="p-2 rounded-xl bg-[#F4ECE7] text-[#C85A32] dark:bg-[#2A201C] dark:text-[#E28567]">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-[#6E6A64] uppercase tracking-wider dark:text-[#9E988F]">
                Gateway Balance
              </div>
              <div className="font-mono text-lg font-semibold text-stone-900 dark:text-[#EFECE6]">
                ${currentBalance.toFixed(2)}
              </div>
            </div>
          </div>

          <Button
            onClick={() => setAddCreditsOpen(true)}
            className="rounded-2xl bg-[#C85A32] hover:bg-[#A44422] text-white px-5 py-6 font-medium shadow-soft-sm transition-all hover:scale-[1.02] active:scale-[0.98] dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Credits
          </Button>
        </div>
      </div>

      {/* Active Secret Key Box (The OpenRouter Card) */}
      <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-soft-card space-y-4 dark:bg-[#1E1D1A] dark:border-[#34312C]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#C85A32] dark:text-[#E28567]" />
            <label className="text-xs font-mono uppercase tracking-wider text-[#6E6A64] dark:text-[#9E988F]">
              Active Secret Key
            </label>
            {keys.length > 1 && (
              <span className="text-[11px] font-mono text-stone-400">
                ({activeKeyIndex + 1} of {keys.length} keys)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeKey?.createdAt && (
              <span className="text-xs text-stone-400">
                Created {displayCreated(activeKey.createdAt)}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGenerateKeyOpen(true)}
              className="rounded-xl border-[#E8E4DC] hover:bg-[#FAF8F5] text-xs text-stone-700 h-8 dark:border-[#34312C] dark:text-[#EFECE6] dark:hover:bg-[#282622]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Generate New Key
            </Button>
          </div>
        </div>

        {/* Key Display & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 font-mono text-sm bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl px-4 py-2.5 text-stone-800 flex items-center justify-between select-all dark:bg-[#161514] dark:border-[#34312C] dark:text-[#EFECE6]">
            <span className="truncate">
              {showKeySecret ? rawKeySecret : maskedKeySecret}
            </span>
            <button
              type="button"
              onClick={() => setShowKeySecret(!showKeySecret)}
              className="ml-3 text-stone-400 hover:text-stone-700 dark:hover:text-[#EFECE6] transition-colors"
              title={showKeySecret ? 'Mask secret key' : 'Reveal secret key'}
            >
              {showKeySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            onClick={() => handleCopy(rawKeySecret)}
            variant="outline"
            className="rounded-xl border-[#E8E4DC] hover:bg-[#F2EFE9] px-5 py-2.5 text-xs font-medium text-stone-800 shrink-0 dark:border-[#34312C] dark:text-[#EFECE6] dark:hover:bg-[#282622]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-[#4D7C5F]" />
                Copied Key
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy Secret Key
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-[#6E6A64] pt-1 dark:text-[#9E988F]">
          <span className="font-mono text-[11px]">
            Key ID: <strong className="text-stone-700 dark:text-stone-300">{activeKey?.id || 'key-default'}</strong> ({activeKey?.name || activeKey?.label || 'Primary Key'})
          </span>
          <span className="text-[11px] text-stone-400">
            Authorization: Bearer headers supported
          </span>
        </div>
      </div>

      {/* Quickstart Snippets (cURL, Python, Node.js) */}
      <QuickstartCard apiKey={rawKeySecret} />

      {/* Available Models (OpenRouter-style overview) */}
      <ModelsCatalog models={models} isLoading={isModelsLoading} />

      {/* Usage & Cost Ledger Table */}
      <UsageLedger logs={usageLogs} isLoading={isLogsLoading} />

      {/* Modals */}
      <AddCreditsModal
        open={addCreditsOpen}
        onOpenChange={setAddCreditsOpen}
        currentBalance={currentBalance}
      />

      <GenerateKeyModal
        open={generateKeyOpen}
        onOpenChange={setGenerateKeyOpen}
        onKeyCreated={(newKey: CreatedSaasApiKey) => {
          setActiveKeyIndex(0);
        }}
      />
    </div>
  );
};
