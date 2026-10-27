import React, { useState, useMemo } from 'react';
import {
  useSaasProviders,
  useSaveProvider,
  useDeleteProvider,
  useTestProvider,
} from '../hooks/useSaas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Server,
  Plus,
  Play,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Shield,
  Gauge,
  Zap,
  RefreshCw,
  Coins,
  Power,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { SaasProvider, SaveProviderInput } from '../types';

const KNOWN_PROVIDERS = [
  { name: 'gemini', label: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta' },
  { name: 'groq', label: 'Groq LPU', url: 'https://api.groq.com/openai/v1' },
  { name: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { name: 'deepseek', label: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { name: 'cerebras', label: 'Cerebras', url: 'https://api.cerebras.ai/v1' },
  { name: 'together', label: 'Together AI', url: 'https://api.together.xyz/v1' },
  { name: 'mistral', label: 'Mistral AI', url: 'https://api.mistral.ai/v1' },
  { name: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1' },
  { name: 'custom', label: 'Custom (OpenAI-compatible)', url: 'https://my-llm.domain.com/v1' },
];

export const ProvidersView: React.FC = () => {
  const { data: providers = [], isLoading, refetch, isFetching } = useSaasProviders();
  const saveProviderMutation = useSaveProvider();
  const deleteProviderMutation = useDeleteProvider();
  const testProviderMutation = useTestProvider();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SaasProvider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('groq');
  const [formLabel, setFormLabel] = useState('Groq LPU');
  const [formBaseUrl, setFormBaseUrl] = useState('https://api.groq.com/openai/v1');
  const [formApiKey, setFormApiKey] = useState('');
  const [formPriority, setFormPriority] = useState('100');
  const [formMonthlyCap, setFormMonthlyCap] = useState('250');
  const [formRpmLimit, setFormRpmLimit] = useState('1000');
  const [formIsFreeTier, setFormIsFreeTier] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  const openAddModal = () => {
    setEditingProvider(null);
    setFormName('groq');
    setFormLabel('Groq LPU');
    setFormBaseUrl('https://api.groq.com/openai/v1');
    setFormApiKey('');
    setFormPriority('100');
    setFormMonthlyCap('250');
    setFormRpmLimit('1000');
    setFormIsFreeTier(false);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: SaasProvider) => {
    setEditingProvider(p);
    setFormName(p.name);
    setFormLabel(p.label);
    setFormBaseUrl(p.baseUrl);
    setFormApiKey('');
    setFormPriority(p.priority.toString());
    setFormMonthlyCap(p.monthlyCapUsd ? p.monthlyCapUsd.toString() : '');
    setFormRpmLimit(p.rpmLimit ? p.rpmLimit.toString() : '');
    setFormIsFreeTier(p.isFreeTier);
    setFormIsActive(p.isActive);
    setIsModalOpen(true);
  };

  const handleSelectTemplate = (item: (typeof KNOWN_PROVIDERS)[0]) => {
    setFormName(item.name);
    setFormLabel(item.label);
    setFormBaseUrl(item.url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim() || !formBaseUrl.trim()) {
      toast({ title: 'Validation Error', description: 'Label and Base URL are required.', variant: 'destructive' });
      return;
    }

    try {
      const payload: SaveProviderInput = {
        id: editingProvider?.id,
        name: formName.trim().toLowerCase(),
        label: formLabel.trim(),
        baseUrl: formBaseUrl.trim(),
        apiKey: formApiKey.trim() || undefined,
        priority: parseInt(formPriority) || 100,
        monthlyCapUsd: formMonthlyCap ? parseFloat(formMonthlyCap) : null,
        rpmLimit: formRpmLimit ? parseInt(formRpmLimit) : null,
        isFreeTier: formIsFreeTier,
        isActive: formIsActive,
        paused: false,
      };

      await saveProviderMutation.mutateAsync(payload);
      toast({
        title: editingProvider ? 'Provider Updated' : 'Provider Created',
        description: `${payload.label} has been configured in the upstream routing pool.`,
      });
      setIsModalOpen(false);
    } catch {
      toast({ title: 'Save Failed', description: 'Unable to save provider.', variant: 'destructive' });
    }
  };

  const handleTestConnection = async (p: SaasProvider) => {
    setTestingId(p.id);
    try {
      const res = await testProviderMutation.mutateAsync({ id: p.id });
      if (res.ok) {
        toast({
          title: 'Connection Successful',
          description: `${p.label} responded in ${res.latencyMs}ms. Status: Healthy.`,
        });
      } else {
        toast({
          title: 'Connection Degraded',
          description: `${p.label} returned error or high latency: ${res.error || 'timeout'}`,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Test Failed', description: 'Network ping failed.', variant: 'destructive' });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteProviderMutation.mutateAsync({ id: deleteConfirmId });
      toast({ title: 'Provider Deleted', description: 'Provider removed from upstream pool.' });
      setDeleteConfirmId(null);
    } catch {
      toast({ title: 'Delete Failed', description: 'Failed to delete provider.', variant: 'destructive' });
    }
  };

  const stats = useMemo(() => {
    const active = providers.filter((p) => p.isActive).length;
    const healthy = providers.filter((p) => p.healthStatus === 'healthy').length;
    const fastLatency = Math.min(...providers.filter((p) => (p.lastLatencyMs || 0) > 0).map((p) => p.lastLatencyMs || 999), 95);
    return { active, healthy, fastLatency };
  }, [providers]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F4ECE7] text-[#C85A32] rounded-xl dark:bg-[#2A201C] dark:text-[#E28567]">
              <Server className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Upstream Providers</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure upstream AI endpoints, keys, priority failover order, and spend caps.
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

          <Button onClick={openAddModal} size="sm" className="gap-2 bg-[#C85A32] hover:bg-[#B34E29] text-white">
            <Plus className="h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Providers
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2">
            {providers.length}
            <span className="text-xs font-normal text-muted-foreground">configured</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Active in Pool
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-emerald-600 dark:text-emerald-400">
            {stats.active}
            <span className="text-xs font-normal text-muted-foreground">online</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Fastest Latency
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-blue-600 dark:text-blue-400">
            {stats.fastLatency}ms
            <span className="text-xs font-normal text-muted-foreground">Groq / Gemini</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Health Check
          </span>
          <div className="text-2xl font-bold mt-1.5 flex items-baseline gap-2 text-emerald-600 dark:text-emerald-400">
            {stats.healthy} / {providers.length}
            <span className="text-xs font-normal text-muted-foreground">passing</span>
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#C85A32] mb-2" />
            Loading upstream providers...
          </div>
        ) : providers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-xl p-8">
            <Server className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="font-semibold text-foreground">No Upstream Providers Configured</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add Provider" above to add your first endpoint.</p>
          </div>
        ) : (
          providers.map((p) => {
            const isTesting = testingId === p.id;
            const isHealthy = p.healthStatus === 'healthy';

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 bg-card shadow-xs transition-all relative flex flex-col justify-between ${
                  p.isActive ? 'border-border' : 'border-dashed opacity-60'
                }`}
              >
                <div>
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground">{p.label}</h3>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            isHealthy
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40'
                              : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40'
                          }`}
                        >
                          {isHealthy ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                          {p.healthStatus}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground truncate block max-w-[200px]">
                        {p.baseUrl}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
                        Priority
                      </span>
                      <span className="text-xs font-bold font-mono text-foreground">#{p.priority}</span>
                    </div>
                  </div>

                  {/* Badges / Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono bg-muted/40 p-2.5 rounded-lg border border-border">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Last Latency</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {p.lastLatencyMs ? `${p.lastLatencyMs}ms` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Rate Limit</span>
                      <span className="font-semibold">{p.rpmLimit ? `${p.rpmLimit} RPM` : 'Unlimited'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Monthly Cap</span>
                      <span className="font-semibold">{p.monthlyCapUsd ? `$${p.monthlyCapUsd}` : 'No cap'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Key Masked</span>
                      <span className="font-semibold">{p.apiKey ? p.apiKey : 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(p)}
                    disabled={isTesting}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Play className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                    {isTesting ? 'Pinging...' : 'Test Ping'}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(p)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Provider Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add Upstream Provider'}</DialogTitle>
            <DialogDescription>
              Configure connection parameters for an OpenAI-compatible upstream endpoint.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {!editingProvider && (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Provider Template
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {KNOWN_PROVIDERS.slice(0, 6).map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSelectTemplate(item)}
                      className={`px-2 py-1.5 text-left rounded border text-[11px] font-medium transition-colors ${
                        formName === item.name
                          ? 'border-[#C85A32] bg-[#F4ECE7] text-[#C85A32] dark:bg-[#2A201C] dark:text-[#E28567]'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Provider Label</label>
                <Input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. Groq LPU"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Priority Order</label>
                <Input
                  type="number"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  placeholder="100"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Base Endpoint URL</label>
              <Input
                value={formBaseUrl}
                onChange={(e) => setFormBaseUrl(e.target.value)}
                placeholder="https://api.groq.com/openai/v1"
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                API Key {editingProvider && '(Leave blank to keep current)'}
              </label>
              <Input
                type="password"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder="gsk_... or sk-..."
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Monthly Cap ($)</label>
                <Input
                  type="number"
                  value={formMonthlyCap}
                  onChange={(e) => setFormMonthlyCap(e.target.value)}
                  placeholder="500"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">RPM Limit</label>
                <Input
                  type="number"
                  value={formRpmLimit}
                  onChange={(e) => setFormRpmLimit(e.target.value)}
                  placeholder="1000"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-border"
                />
                Enable Provider in Active Pool
              </label>

              <label className="text-xs font-medium text-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsFreeTier}
                  onChange={(e) => setFormIsFreeTier(e.target.checked)}
                  className="rounded border-border"
                />
                Free Tier Fallback
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveProviderMutation.isPending}
                className="bg-[#C85A32] hover:bg-[#B34E29] text-white"
              >
                {saveProviderMutation.isPending ? 'Saving...' : editingProvider ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Provider?</DialogTitle>
            <DialogDescription>
              This will remove the provider from the upstream routing pool. Existing active routes will failover to the next available provider.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteProviderMutation.isPending}
            >
              {deleteProviderMutation.isPending ? 'Deleting...' : 'Delete Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
