import React, { useState } from 'react';
import { useSaasUsageMetrics } from '../hooks/useSaas';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  DollarSign,
  Zap,
  Activity,
  Layers,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Cpu,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export const UsageView: React.FC = () => {
  const [days, setDays] = useState(30);
  const { data: metrics, isLoading, refetch, isFetching } = useSaasUsageMetrics(days);

  const totals = metrics?.totals || {
    requests: 0,
    tokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    priceUsd: 0,
    marginUsd: 0,
    marginPct: 0,
  };

  const daily = metrics?.daily || [];
  const providerBreakdown = metrics?.providerBreakdown || [];
  const topModels = metrics?.topModels || [];

  // Compute max value for charting scaling
  const maxRequests = Math.max(...daily.map((d) => d.requests), 10);
  const maxPrice = Math.max(...daily.map((d) => d.price), 0.1);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F4ECE7] text-[#C85A32] rounded-xl dark:bg-[#2A201C] dark:text-[#E28567]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Usage &amp; Cost Intelligence</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Financial analytics, compute margins, upstream vendor cost breakdowns, and token consumption trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range Selector */}
          <div className="flex rounded-lg border border-border p-1 bg-card shadow-2xs">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  days === d
                    ? 'bg-[#F4ECE7] text-[#C85A32] dark:bg-[#2A201C] dark:text-[#E28567]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

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
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Requests
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2">
            {totals.requests.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground">queries</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Tokens
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2">
            {(totals.tokens / 1000).toFixed(1)}k
            <span className="text-xs font-normal text-muted-foreground">consumed</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Upstream Cost
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-muted-foreground font-mono">
            ${totals.costUsd.toFixed(3)}
            <span className="text-xs font-normal text-muted-foreground">we pay</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Partner Revenue
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-foreground font-mono">
            ${totals.priceUsd.toFixed(3)}
            <span className="text-xs font-normal text-muted-foreground">billed</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Gross Margin
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-emerald-600 dark:text-emerald-400 font-mono">
            +${totals.marginUsd.toFixed(3)}
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
              ({totals.marginPct.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Ingress Request Volume (Pure SVG Interactive Chart) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#C85A32]" />
                Daily Request Volume
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Number of inference queries routed per day over the selected window.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              Peak: {maxRequests} req/day
            </span>
          </div>

          <div className="h-56 w-full flex items-end gap-1.5 pt-4 pb-2">
            {daily.map((day) => {
              const heightPct = Math.max(8, (day.requests / maxRequests) * 100);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground border border-border text-[10px] p-1.5 rounded shadow-md pointer-events-none whitespace-nowrap z-20 font-mono">
                    <div>{day.date}</div>
                    <div className="font-bold">{day.requests} requests ({day.tokens} tokens)</div>
                  </div>

                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full rounded-t-sm bg-[#C85A32]/80 group-hover:bg-[#C85A32] transition-all"
                  />
                  <span className="text-[9px] text-muted-foreground truncate max-w-[28px] mt-1 font-mono">
                    {day.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upstream Provider Distribution */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div>
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-[#C85A32]" />
              Upstream Provider Share
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Traffic distribution across upstream vendor platforms.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {providerBreakdown.map((p, idx) => {
              const colors = ['bg-[#C85A32]', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500'];
              const color = colors[idx % colors.length];

              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{p.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {p.percentage}% ({p.requests} req)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${p.percentage}%` }}
                      className={`h-full rounded-full ${color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Cost vs Price & Top Models Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost vs Revenue Margin Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div>
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Daily Revenue vs Upstream Vendor Cost
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparison between client billings and raw inference compute cost.
            </p>
          </div>

          <div className="h-48 w-full flex items-end gap-1.5 pt-4 pb-2">
            {daily.map((day) => {
              const pricePct = Math.max(5, (day.price / maxPrice) * 100);
              const costPct = Math.max(3, (day.cost / maxPrice) * 100);

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground border border-border text-[10px] p-1.5 rounded shadow-md pointer-events-none whitespace-nowrap z-20 font-mono">
                    <div>{day.date}</div>
                    <div className="text-emerald-600 font-bold">Billed: ${day.price.toFixed(4)}</div>
                    <div className="text-muted-foreground">Cost: ${day.cost.toFixed(4)}</div>
                  </div>

                  <div className="w-full flex items-end gap-0.5 h-full justify-center">
                    <div
                      style={{ height: `${pricePct}%` }}
                      className="w-1/2 rounded-t-xs bg-emerald-500/80 group-hover:bg-emerald-500 transition-all"
                    />
                    <div
                      style={{ height: `${costPct}%` }}
                      className="w-1/2 rounded-t-xs bg-muted-foreground/40 group-hover:bg-muted-foreground/70 transition-all"
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground truncate max-w-[28px] mt-1 font-mono">
                    {day.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Partner Revenue ($)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
              Upstream Compute Cost ($)
            </span>
          </div>
        </div>

        {/* Top Models Performance Table */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div>
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#C85A32]" />
              Top Active Models
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked by request volume and total token utilization.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border text-muted-foreground font-medium">
                <tr>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Queries</th>
                  <th className="py-2.5 px-3">Tokens</th>
                  <th className="py-2.5 px-3 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topModels.map((m) => (
                  <tr key={m.model} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{m.model}</td>
                    <td className="py-2.5 px-3 font-mono">{m.requests.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono">{(m.tokens / 1000).toFixed(1)}k</td>
                    <td className="py-2.5 px-3 font-mono text-right font-medium">
                      ${m.costUsd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
