import React, { useState } from 'react';
import {
  useSaasMaintenanceState,
  useSetGlobalMaintenance,
  useSetDegradedMaintenance,
  useSaasMaintenanceHistory,
  useScheduleMaintenanceWindow,
  useDeleteMaintenanceWindow,
} from '../hooks/useSaas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  ShieldAlert,
  AlertOctagon,
  Clock,
  Calendar,
  Sliders,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Power,
  RefreshCw,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export const MaintenanceView: React.FC = () => {
  const { data: state, isLoading, refetch, isFetching } = useSaasMaintenanceState();
  const { data: history = [] } = useSaasMaintenanceHistory();

  const setGlobalMutation = useSetGlobalMaintenance();
  const setDegradedMutation = useSetDegradedMaintenance();
  const scheduleWindowMutation = useScheduleMaintenanceWindow();
  const deleteWindowMutation = useDeleteMaintenanceWindow();
  const { toast } = useToast();

  // Global Maintenance Form
  const [globalMessage, setGlobalMessage] = useState('We are upgrading cluster nodes. Back online shortly.');
  const [globalReason, setGlobalReason] = useState('Scheduled kernel upgrade');
  const [isConfirmGlobalOpen, setIsConfirmGlobalOpen] = useState(false);

  // Degraded Mode Form
  const [paidOnly, setPaidOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [reducePct, setReducePct] = useState(50);
  const [maxTokens, setMaxTokens] = useState('2000');

  // Schedule Window Modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [windowBanner, setWindowBanner] = useState('Maintenance planned: 02:00 UTC - 03:00 UTC');

  const isGlobalActive = state?.globalActive || false;
  const isDegradedActive = state?.degradedActive || false;

  const handleToggleGlobal = async () => {
    try {
      await setGlobalMutation.mutateAsync({
        active: !isGlobalActive,
        message: globalMessage,
        reason: globalReason,
      });
      setIsConfirmGlobalOpen(false);
      toast({
        title: !isGlobalActive ? 'Emergency Maintenance Activated' : 'Maintenance Lifted',
        description: !isGlobalActive
          ? 'Gateway is returning 503 Service Unavailable with your custom announcement.'
          : 'Gateway has resumed normal public request routing.',
        variant: !isGlobalActive ? 'destructive' : 'default',
      });
    } catch {
      toast({ title: 'Failed to update maintenance state', variant: 'destructive' });
    }
  };

  const handleSaveDegraded = async () => {
    try {
      await setDegradedMutation.mutateAsync({
        active: paidOnly || freeOnly || reducePct > 0 || Boolean(maxTokens),
        paidOnly,
        freeOnly,
        reducePct,
        maxTokens: maxTokens ? parseInt(maxTokens) : null,
        reason: 'Adjusted degraded capacity parameters',
      });
      toast({
        title: 'Degraded Mode Settings Saved',
        description: 'Traffic throttling policies applied.',
      });
    } catch {
      toast({ title: 'Failed to save degraded mode', variant: 'destructive' });
    }
  };

  const handleScheduleWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startsAt = windowStart ? new Date(windowStart).getTime() : Date.now() + 3600000;
      const endsAt = windowEnd ? new Date(windowEnd).getTime() : startsAt + 3600000;

      await scheduleWindowMutation.mutateAsync({
        startsAt,
        endsAt,
        bannerText: windowBanner,
        autoEnable: true,
      });
      toast({ title: 'Maintenance Window Scheduled', description: 'Window saved to platform schedule.' });
      setIsScheduleOpen(false);
    } catch {
      toast({ title: 'Scheduling Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F4ECE7] text-[#C85A32] rounded-xl dark:bg-[#2A201C] dark:text-[#E28567]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Maintenance &amp; Degradation Center</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Global emergency killswitches, traffic throttling controls, and scheduled maintenance windows.
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
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={() => setIsScheduleOpen(true)} size="sm" className="gap-2 bg-[#C85A32] hover:bg-[#B34E29] text-white">
            <Calendar className="h-4 w-4" />
            Schedule Window
          </Button>
        </div>
      </div>

      {/* Global Alert Banner if Active */}
      {isGlobalActive && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200">
              GLOBAL EMERGENCY MAINTENANCE ACTIVE
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
              {state?.globalMessage || 'We are upgrading. Back shortly.'}
            </p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-mono">
              All client requests are receiving 503 Service Unavailable (except whitelisted IPs).
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsConfirmGlobalOpen(true)}
            className="shrink-0"
          >
            Lift Maintenance
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Emergency Global Maintenance Switch */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                <Power className="h-4 w-4 text-[#C85A32]" />
                Global Emergency Switch
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instantly intercept all ingress API traffic and return a 503 maintenance response.
              </p>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isGlobalActive
                  ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400'
              }`}
            >
              {isGlobalActive ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Public Announcement Banner
              </label>
              <Input
                value={globalMessage}
                onChange={(e) => setGlobalMessage(e.target.value)}
                placeholder="We are upgrading our cluster nodes..."
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Internal Audit Reason
              </label>
              <Input
                value={globalReason}
                onChange={(e) => setGlobalReason(e.target.value)}
                placeholder="Reason for triggering maintenance..."
                className="h-9 text-xs"
              />
            </div>

            <Button
              onClick={() => setIsConfirmGlobalOpen(true)}
              variant={isGlobalActive ? 'outline' : 'destructive'}
              className="w-full text-xs font-semibold gap-2 mt-2"
            >
              <Power className="h-4 w-4" />
              {isGlobalActive ? 'Deactivate Global Maintenance' : 'Activate Emergency Maintenance'}
            </Button>
          </div>
        </div>

        {/* Card 2: Degraded Capacity Throttling */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#C85A32]" />
                Degraded Capacity Controls
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Throttle non-critical traffic under high load without complete platform shutdown.
              </p>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isDegradedActive
                  ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {isDegradedActive ? 'THROTTLING' : 'NORMAL'}
            </span>
          </div>

          <div className="space-y-3 text-xs pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
              <div>
                <span className="font-semibold text-foreground block">Prioritize Paid Keys Only</span>
                <span className="text-muted-foreground text-[11px]">Reject free tier traffic with 429</span>
              </div>
              <input
                type="checkbox"
                checked={paidOnly}
                onChange={(e) => setPaidOnly(e.target.checked)}
                className="rounded border-border h-4 w-4"
              />
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Reduce Gateway Concurrency</span>
                <span className="font-bold text-[#C85A32]">{reducePct}% reduction</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="10"
                value={reducePct}
                onChange={(e) => setReducePct(parseInt(e.target.value))}
                className="w-full accent-[#C85A32]"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
              <div>
                <span className="font-semibold text-foreground block">Max Output Tokens Cap</span>
                <span className="text-muted-foreground text-[11px]">Cap completion lengths to preserve compute</span>
              </div>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="2000"
                className="w-24 h-7 text-xs font-mono"
              />
            </div>

            <Button
              onClick={handleSaveDegraded}
              disabled={setDegradedMutation.isPending}
              className="w-full text-xs gap-2 bg-[#C85A32] hover:bg-[#B34E29] text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Apply Throttling Policies
            </Button>
          </div>
        </div>
      </div>

      {/* Maintenance History Log */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-[#C85A32]" />
              Maintenance Audit History
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Immutable audit log of all maintenance actions and throttling events.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border text-xs">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No previous maintenance actions recorded.
            </div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-muted">
                      {h.level}
                    </span>
                    <span className="font-medium text-foreground">{h.action}</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">{h.reason || 'No description provided'}</p>
                </div>
                <span className="text-muted-foreground text-[11px] font-mono shrink-0">
                  {new Date(h.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Global Confirmation Dialog */}
      <Dialog open={isConfirmGlobalOpen} onOpenChange={setIsConfirmGlobalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              {isGlobalActive ? 'Deactivate Global Maintenance?' : 'Trigger Global Emergency Maintenance?'}
            </DialogTitle>
            <DialogDescription>
              {isGlobalActive
                ? 'This will immediately restore normal API routing for all incoming user requests.'
                : 'This will cause all non-whitelisted API traffic to fail immediately with 503 Service Unavailable.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmGlobalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={isGlobalActive ? 'default' : 'destructive'}
              size="sm"
              onClick={handleToggleGlobal}
              disabled={setGlobalMutation.isPending}
            >
              {setGlobalMutation.isPending ? 'Processing...' : isGlobalActive ? 'Lift Maintenance' : 'Confirm Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Window Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance Window</DialogTitle>
            <DialogDescription>
              Plan scheduled downtime with automated banner notices and auto-enable timers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleWindow} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Banner Announcement Notice</label>
              <Input
                value={windowBanner}
                onChange={(e) => setWindowBanner(e.target.value)}
                placeholder="Maintenance window planned..."
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Start Time</label>
                <Input
                  type="datetime-local"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">End Time</label>
                <Input
                  type="datetime-local"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsScheduleOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={scheduleWindowMutation.isPending}
                className="bg-[#C85A32] hover:bg-[#B34E29] text-white"
              >
                {scheduleWindowMutation.isPending ? 'Scheduling...' : 'Save Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
