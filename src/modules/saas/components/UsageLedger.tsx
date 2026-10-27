import React from 'react';
import type { UsageLog } from '../types';
import { Clock, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';

interface UsageLedgerProps {
  logs: UsageLog[];
  isLoading?: boolean;
}

export const UsageLedger: React.FC<UsageLedgerProps> = ({
  logs,
  isLoading = false,
}) => {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const totalCost = logs.reduce((acc, log) => acc + log.cost, 0);
  const totalTokens = logs.reduce((acc, log) => acc + log.totalTokens, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#6E6A64] dark:text-[#9E988F]">
            Usage & Cost Ledger
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time inference tokens, latency breakdown, and accurate billing
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-[#6E6A64] dark:text-[#9E988F]">
          <span>
            Total Tokens:{' '}
            <strong className="text-stone-900 dark:text-[#EFECE6]">
              {totalTokens.toLocaleString()}
            </strong>
          </span>
          <span>
            Billed:{' '}
            <strong className="text-[#C85A32] dark:text-[#E28567]">
              ${totalCost.toFixed(4)}
            </strong>
          </span>
        </div>
      </div>

      <div className="bg-white border border-[#E8E4DC] rounded-2xl shadow-soft-card overflow-hidden dark:bg-[#1E1D1A] dark:border-[#34312C]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] bg-[#FAF8F5] text-[11px] font-mono uppercase tracking-wider text-[#6E6A64] dark:bg-[#161514] dark:border-[#34312C] dark:text-[#9E988F]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4 text-right">Prompt / Compl.</th>
                <th className="py-3 px-4 text-right">Total Tokens</th>
                <th className="py-3 px-4 text-right">Latency</th>
                <th className="py-3 px-4 text-right">Cost (USD)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC]/60 text-xs dark:divide-[#34312C]/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    Loading usage ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400 font-mono">
                    No requests recorded yet. Run a quickstart snippet to generate traffic!
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[#FAF8F5]/80 transition-colors dark:hover:bg-[#282622]/50 font-sans"
                  >
                    <td className="py-3 px-4 font-mono text-stone-500 text-[11px] whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-stone-900 dark:text-[#EFECE6] whitespace-nowrap">
                      {log.model}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-600 dark:text-stone-300 whitespace-nowrap">
                      {log.promptTokens.toLocaleString()} / {log.completionTokens.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-stone-800 dark:text-[#EFECE6] whitespace-nowrap">
                      {log.totalTokens.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-500 whitespace-nowrap">
                      {log.latencyMs}ms
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#C85A32] dark:text-[#E28567] whitespace-nowrap">
                      ${log.cost.toFixed(6)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4D7C5F] bg-[#EAF3ED] px-2 py-0.5 rounded-full dark:bg-[#1E2822]">
                          <CheckCircle2 className="h-3 w-3" />
                          200 OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-950/40">
                          <XCircle className="h-3 w-3" />
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
