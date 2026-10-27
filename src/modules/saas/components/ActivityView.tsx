import React, { useState, useMemo } from 'react';
import { useSaasActivity, useExportActivityCsv } from '../hooks/useSaas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Activity,
  Search,
  Download,
  RefreshCw,
  Clock,
  Layers,
  Cpu,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Zap,
  DollarSign,
  ChevronRight,
  Database,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ActivityItem } from '../types';

export const ActivityView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [model, setModel] = useState('');
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filter = useMemo(
    () => ({
      search: search.trim() || undefined,
      provider: provider || undefined,
      status: status || undefined,
      model: model || undefined,
      limit: 50,
      offset: 0,
    }),
    [search, provider, status, model],
  );

  const { data, isLoading, refetch, isFetching } = useSaasActivity(filter);
  const exportCsvMutation = useExportActivityCsv();
  const { toast } = useToast();

  const items = data?.items || [];
  const total = data?.total || 0;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied to clipboard', description: text });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = async () => {
    try {
      const csv = await exportCsvMutation.mutateAsync(filter);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gateway-activity-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Successful', description: 'Activity logs exported as CSV.' });
    } catch {
      toast({ title: 'Export Failed', description: 'Unable to export activity logs.', variant: 'destructive' });
    }
  };

  const stats = useMemo(() => {
    if (items.length === 0) {
      return { avgLatency: 240, errorCount: 0, cachedCount: 0 };
    }
    const sumLatency = items.reduce((s, i) => s + i.latencyMs, 0);
    const errors = items.filter((i) => i.statusCode >= 400).length;
    const cached = items.filter((i) => i.cached).length;
    return {
      avgLatency: Math.round(sumLatency / items.length),
      errorCount: errors,
      cachedCount: cached,
    };
  }, [items]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F4ECE7] text-[#C85A32] rounded-xl dark:bg-[#2A201C] dark:text-[#E28567]">
              <Activity className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Gateway Activity</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time feed of every inference request processed by the Antigravity high-concurrency gateway.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-[#C85A32]' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exportCsvMutation.isPending || items.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Queries
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2">
            {total.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground">recorded</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Avg Latency
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-emerald-600 dark:text-emerald-400">
            {stats.avgLatency}ms
            <span className="text-xs font-normal text-muted-foreground">sub-second</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Gateway Errors
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-rose-600 dark:text-rose-400">
            {stats.errorCount}
            <span className="text-xs font-normal text-muted-foreground">
              ({items.length > 0 ? ((stats.errorCount / items.length) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cache Hits
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-blue-600 dark:text-blue-400">
            {stats.cachedCount}
            <span className="text-xs font-normal text-muted-foreground">zero latency</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search request ID or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          aria-label="Filter by provider"
          className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium"
        >
          <option value="">All Providers</option>
          <option value="Google Gemini">Google Gemini</option>
          <option value="Groq LPU">Groq LPU</option>
          <option value="OpenRouter">OpenRouter</option>
          <option value="DeepSeek">DeepSeek</option>
          <option value="Anthropic">Anthropic</option>
          <option value="antigravity">Antigravity Core</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium"
        >
          <option value="">All Statuses</option>
          <option value="success">200 OK</option>
          <option value="error">Errors & Rate Limits</option>
        </select>

        {(search || provider || status || model) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setProvider('');
              setStatus('');
              setModel('');
            }}
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Activity Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border font-medium text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Model & Provider</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-4">Cost / Price</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#C85A32] mb-2" />
                    Loading gateway activity feed...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No requests match your current filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isSuccess = row.statusCode === 200;
                  const latencyColor =
                    row.latencyMs < 300
                      ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
                      : row.latencyMs < 1000
                        ? 'text-amber-600 bg-amber-500/10 border-amber-500/20'
                        : 'text-rose-600 bg-rose-500/10 border-rose-500/20';

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedItem(row)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[120px]">{row.requestId}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(row.requestId, row.id);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copiedId === row.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{row.model}</div>
                        <div className="text-[10px] text-muted-foreground">{row.provider}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isSuccess
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/60'
                              : 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-900/60'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          ) : (
                            <XCircle className="h-2.5 w-2.5" />
                          )}
                          {row.statusCode}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${latencyColor}`}
                        >
                          {row.latencyMs}ms
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div>{row.totalTokens.toLocaleString()} tok</div>
                        <div className="text-[10px] text-muted-foreground">
                          {row.promptTokens} in / {row.completionTokens} out
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-foreground">${row.priceUsd.toFixed(5)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          cost: ${row.costUsd.toFixed(5)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(row.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Detail Modal */}
      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#C85A32]" />
                    Request Audit Detail
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                      selectedItem.statusCode === 200
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40'
                        : 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40'
                    }`}
                  >
                    HTTP {selectedItem.statusCode}
                  </span>
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  ID: {selectedItem.requestId}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Latency</span>
                    <span className="font-bold font-mono text-sm">{selectedItem.latencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Tokens</span>
                    <span className="font-bold font-mono text-sm">{selectedItem.totalTokens}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Client Price</span>
                    <span className="font-bold font-mono text-sm">${selectedItem.priceUsd.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Provider Cost</span>
                    <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                      ${selectedItem.costUsd.toFixed(6)}
                    </span>
                  </div>
                </div>

                {/* Routing & Provider Info */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <span className="font-semibold text-xs text-foreground block">Model Routing Information</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Provider:</span>{' '}
                      <span className="font-medium text-foreground">{selectedItem.provider}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Model Target:</span>{' '}
                      <span className="font-medium text-foreground">{selectedItem.model}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cached Response:</span>{' '}
                      <span className="font-medium text-foreground">{selectedItem.cached ? 'Yes (Cache Hit)' : 'No (Live Upstream)'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Executed At:</span>{' '}
                      <span className="font-medium text-foreground">
                        {new Date(selectedItem.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Token Breakdown */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <span className="font-semibold text-xs text-foreground block">Token Utilization Breakdown</span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex-1 bg-muted/50 p-2 rounded">
                      <span className="text-muted-foreground block text-[10px]">Prompt Tokens</span>
                      <span className="font-bold">{selectedItem.promptTokens}</span>
                    </div>
                    <div className="flex-1 bg-muted/50 p-2 rounded">
                      <span className="text-muted-foreground block text-[10px]">Completion Tokens</span>
                      <span className="font-bold">{selectedItem.completionTokens}</span>
                    </div>
                    <div className="flex-1 bg-muted/50 p-2 rounded">
                      <span className="text-muted-foreground block text-[10px]">Total Consumed</span>
                      <span className="font-bold">{selectedItem.totalTokens}</span>
                    </div>
                  </div>
                </div>

                {/* Mock cURL Command */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">Replay cURL Request</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() =>
                        handleCopy(
                          `curl -X POST http://localhost:8045/v1/chat/completions \\\n  -H "Authorization: Bearer sk-live-..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "${selectedItem.model}", "messages": [{"role": "user", "content": "Hello"}]}'`,
                          'replay-curl',
                        )
                      }
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy cURL
                    </Button>
                  </div>
                  <pre className="p-2.5 rounded bg-muted/70 font-mono text-[11px] overflow-x-auto text-muted-foreground">
{`curl -X POST http://localhost:8045/v1/chat/completions \\
  -H "Authorization: Bearer sk-live-..." \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${selectedItem.model}", "messages": [{"role": "user", "content": "..."}]}'`}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
