import React, { useState } from 'react';
import type { ModelInfo } from '../types';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Check, Sparkles, Cpu } from 'lucide-react';

interface ModelsCatalogProps {
  models: ModelInfo[];
  isLoading?: boolean;
}

export const ModelsCatalog: React.FC<ModelsCatalogProps> = ({
  models,
  isLoading = false,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyModelId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast({
      title: 'Model ID Copied',
      description: `"${id}" ready to paste in your configuration.`,
    });
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'anthropic':
        return 'bg-[#F4ECE7] text-[#C85A32] border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]';
      case 'google':
        return 'bg-[#EBF3FC] text-[#2563EB] border-[#D1E3F8] dark:bg-[#1A2638] dark:text-[#60A5FA] dark:border-[#24354D]';
      case 'deepseek':
        return 'bg-[#F3EBFB] text-[#7C3AED] border-[#E5D3F7] dark:bg-[#2A1E3B] dark:text-[#A78BFA] dark:border-[#3B2954]';
      default:
        return 'bg-[#F2EFE9] text-stone-700 border-[#E8E4DC] dark:bg-[#282622] dark:text-[#EFECE6] dark:border-[#34312C]';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#6E6A64] dark:text-[#9E988F]">
            Available Model Routing Pool
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Auto-balanced across verified provider pools with failover routing
          </p>
        </div>
        <span className="text-xs font-mono text-[#6E6A64] dark:text-[#9E988F]">
          {models.length} Models Active
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-[#F2EFE9] border border-[#E8E4DC] dark:bg-[#282622] dark:border-[#34312C]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="group bg-white border border-[#E8E4DC] rounded-2xl p-5 hover:border-[#D97757]/60 hover:shadow-soft-card transition-all dark:bg-[#1E1D1A] dark:border-[#34312C] dark:hover:border-[#E28567]/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopyModelId(model.id)}
                      className="font-mono text-sm font-semibold text-stone-900 hover:text-[#C85A32] dark:text-[#EFECE6] dark:hover:text-[#E28567] flex items-center gap-1.5 transition-colors"
                      title="Click to copy model ID"
                    >
                      <span className="truncate">{model.id}</span>
                      {copiedId === model.id ? (
                        <Check className="h-3.5 w-3.5 text-[#4D7C5F] shrink-0" />
                      ) : (
                        <Copy className="h-3 w-3 text-stone-400 group-hover:text-stone-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                    <span
                      className={`text-[10px] font-medium font-sans px-2 py-0.5 rounded-full border ${getProviderColor(
                        model.provider
                      )}`}
                    >
                      {model.provider}
                    </span>
                  </div>

                  <p className="text-xs text-[#6E6A64] line-clamp-1 leading-relaxed dark:text-[#9E988F]">
                    {model.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      model.status === 'active'
                        ? 'bg-[#4D7C5F] animate-pulse'
                        : 'bg-amber-500'
                    }`}
                    title={`Status: ${model.status}`}
                  />
                  <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                    {model.contextWindow}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E8E4DC]/60 flex items-center justify-between text-xs font-mono dark:border-[#34312C]/60">
                <span className="text-[#6E6A64] dark:text-[#9E988F]">Pricing / 1M:</span>
                <span className="text-stone-800 dark:text-[#EFECE6]">
                  <strong className="font-semibold text-stone-900 dark:text-stone-100">
                    ${model.inputPricePerMillion.toFixed(2)}
                  </strong>{' '}
                  <span className="text-stone-400">in</span> •{' '}
                  <strong className="font-semibold text-stone-900 dark:text-stone-100">
                    ${model.outputPricePerMillion.toFixed(2)}
                  </strong>{' '}
                  <span className="text-stone-400">out</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
