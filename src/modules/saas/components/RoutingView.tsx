import React, { useState } from 'react';
import {
  useSaasRoutingConfig,
  useSaveRoutingConfig,
  useSaasRoutingRules,
  useSaveRoutingRule,
  useDeleteRoutingRule,
  useSimulateRouting,
  useSaasModels,
} from '../hooks/useSaas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  GitFork,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Sparkles,
  Layers,
  Zap,
  Sliders,
  Filter,
  Check,
  RefreshCw,
  Cpu,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { SaasRoutingRule, SaveRoutingRuleInput } from '../types';

export const RoutingView: React.FC = () => {
  const { data: config, isLoading: isConfigLoading, refetch: refetchConfig } = useSaasRoutingConfig();
  const { data: rules = [], isLoading: isRulesLoading, refetch: refetchRules } = useSaasRoutingRules();
  const { data: catalog = [] } = useSaasModels();

  const saveConfigMutation = useSaveRoutingConfig();
  const saveRuleMutation = useSaveRoutingRule();
  const deleteRuleMutation = useDeleteRoutingRule();
  const simulateMutation = useSimulateRouting();
  const { toast } = useToast();

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SaasRoutingRule | null>(null);

  // Rule Form state
  const [conditionType, setConditionType] = useState<'has_image' | 'needs_tools' | 'min_chars' | 'max_chars'>('has_image');
  const [conditionValue, setConditionValue] = useState('true');
  const [actionModel, setActionModel] = useState('gemini-2.5-pro');
  const [actionProvider, setActionProvider] = useState('Google Gemini');

  // Simulator state
  const [simMessage, setSimMessage] = useState('Analyze this codebase architecture and generate a diagram.');
  const [simVision, setSimVision] = useState(false);
  const [simTools, setSimTools] = useState(false);
  const [simResult, setSimResult] = useState<{
    selectedModel: string;
    selectedProvider: string;
    matchedRule?: string;
    fallbackChain: string[];
  } | null>(null);

  // Model chain helper
  const autoRoute = config?.autoRoute || [];

  const handleMoveChain = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= autoRoute.length) return;
    const newRoute = [...autoRoute];
    const temp = newRoute[index];
    newRoute[index] = newRoute[target];
    newRoute[target] = temp;

    try {
      await saveConfigMutation.mutateAsync({ autoRoute: newRoute });
      toast({ title: 'Chain Updated', description: 'Fallback priority reordered.' });
    } catch {
      toast({ title: 'Failed to reorder chain', variant: 'destructive' });
    }
  };

  const handleRemoveFromChain = async (modelId: string) => {
    const newRoute = autoRoute.filter((m) => m !== modelId);
    try {
      await saveConfigMutation.mutateAsync({ autoRoute: newRoute });
      toast({ title: 'Model Removed', description: `${modelId} removed from auto-route.` });
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const handleAddToChain = async (modelId: string) => {
    if (!modelId || autoRoute.includes(modelId)) return;
    const newRoute = [...autoRoute, modelId];
    try {
      await saveConfigMutation.mutateAsync({ autoRoute: newRoute });
      toast({ title: 'Model Added', description: `${modelId} added to auto-route chain.` });
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const condObj: Record<string, unknown> = {};
      if (conditionType === 'has_image') condObj.has_image = conditionValue === 'true';
      if (conditionType === 'needs_tools') condObj.needs_tools = conditionValue === 'true';
      if (conditionType === 'min_chars') condObj.min_chars = parseInt(conditionValue) || 1000;
      if (conditionType === 'max_chars') condObj.max_chars = parseInt(conditionValue) || 5000;

      const actObj = {
        use_models: [actionModel],
        prefer_provider: actionProvider,
      };

      const payload: SaveRoutingRuleInput = {
        id: editingRule?.id,
        position: editingRule ? editingRule.position : rules.length,
        conditionJson: JSON.stringify(condObj),
        actionJson: JSON.stringify(actObj),
        isActive: true,
      };

      await saveRuleMutation.mutateAsync(payload);
      toast({
        title: editingRule ? 'Rule Updated' : 'Rule Created',
        description: 'Routing rule saved successfully.',
      });
      setIsRuleModalOpen(false);
    } catch {
      toast({ title: 'Save Failed', description: 'Could not save rule.', variant: 'destructive' });
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRuleMutation.mutateAsync({ id });
      toast({ title: 'Rule Deleted', description: 'Routing rule removed.' });
    } catch {
      toast({ title: 'Delete Failed', variant: 'destructive' });
    }
  };

  const handleRunSimulation = async () => {
    try {
      const result = await simulateMutation.mutateAsync({
        message: simMessage,
        hasVision: simVision,
        needsTools: simTools,
      });
      setSimResult(result);
      toast({ title: 'Simulation Complete', description: `Resolved to ${result.selectedModel}` });
    } catch {
      toast({ title: 'Simulation Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F4ECE7] text-[#C85A32] rounded-xl dark:bg-[#2A201C] dark:text-[#E28567]">
              <GitFork className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Routing &amp; Fallbacks</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Dynamic request dispatching, priority failover sequences, and automated conditional model routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchConfig();
              refetchRules();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Button
            onClick={() => {
              setEditingRule(null);
              setConditionType('has_image');
              setConditionValue('true');
              setActionModel('gemini-2.5-pro');
              setActionProvider('Google Gemini');
              setIsRuleModalOpen(true);
            }}
            size="sm"
            className="gap-2 bg-[#C85A32] hover:bg-[#B34E29] text-white"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Auto-Route Fallback Priority Chain */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#C85A32]" />
                  Default Auto-Route Fallback Chain
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ordered sequence of models. If the primary model encounters a rate limit or 5xx, the gateway seamlessly fails over to the next in chain.
                </p>
              </div>

              {/* Add to Chain Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    handleAddToChain(e.target.value);
                    e.target.value = '';
                  }}
                  className="h-8 px-2.5 text-xs rounded-md border border-input bg-background font-medium"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + Add Model to Chain
                  </option>
                  {catalog
                    .filter((m) => !autoRoute.includes(m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Reorderable Chain List */}
            <div className="space-y-2 pt-1">
              {autoRoute.map((modelId, index) => {
                const isPrimary = index === 0;
                const catalogItem = catalog.find((c) => c.id === modelId);

                return (
                  <div
                    key={modelId}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isPrimary
                        ? 'border-[#C85A32]/40 bg-[#F4ECE7]/40 dark:bg-[#2A201C]/30'
                        : 'border-border bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-6 w-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                          isPrimary
                            ? 'bg-[#C85A32] text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                          {catalogItem?.name || modelId}
                          {isPrimary && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#C85A32]/10 text-[#C85A32]">
                              Primary Target
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          ID: {modelId} • {catalogItem?.contextWindow || '1M'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => handleMoveChain(index, -1)}
                        className="h-7 w-7 p-0"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === autoRoute.length - 1}
                        onClick={() => handleMoveChain(index, 1)}
                        className="h-7 w-7 p-0"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={autoRoute.length <= 1}
                        onClick={() => handleRemoveFromChain(modelId)}
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conditional Routing Rules */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#C85A32]" />
                  Conditional Routing Rules
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pre-execution filters that route prompts matching criteria (multimodal images, function tools, token lengths) to specialized models.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                  No conditional rules active. Prompts follow the default Auto-Route sequence above.
                </div>
              ) : (
                rules.map((rule, idx) => {
                  let conditionText = rule.conditionJson;
                  let actionText = rule.actionJson;
                  try {
                    const c = JSON.parse(rule.conditionJson);
                    const a = JSON.parse(rule.actionJson);
                    conditionText = Object.entries(c)
                      .map(([k, v]) => `${k} == ${v}`)
                      .join(' AND ');
                    actionText = `Route to ${a.use_models?.[0] || 'auto'} (${a.prefer_provider || 'default'})`;
                  } catch {
                    // fallback
                  }

                  return (
                    <div
                      key={rule.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Rule #{idx + 1}
                          </span>
                          <span className="font-semibold text-foreground font-mono">{conditionText}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-[#C85A32]" />
                          {actionText}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Route Simulator */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div>
              <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#C85A32]" />
                Route Simulator
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulate prompt dispatching through current rules and fallback chains in real time.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Test Prompt</label>
                <textarea
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-md border border-input bg-background resize-none"
                  placeholder="Enter a prompt to simulate routing..."
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simVision}
                    onChange={(e) => setSimVision(e.target.checked)}
                    className="rounded border-border"
                  />
                  Contains Images (Vision)
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simTools}
                    onChange={(e) => setSimTools(e.target.checked)}
                    className="rounded border-border"
                  />
                  Requires Tools / Calling
                </label>
              </div>

              <Button
                onClick={handleRunSimulation}
                disabled={simulateMutation.isPending || !simMessage.trim()}
                className="w-full text-xs gap-2 bg-[#C85A32] hover:bg-[#B34E29] text-white"
              >
                <Play className="h-3.5 w-3.5" />
                {simulateMutation.isPending ? 'Simulating...' : 'Simulate Routing'}
              </Button>
            </div>

            {/* Simulation Results Display */}
            {simResult && (
              <div className="mt-4 p-3 rounded-lg border border-[#C85A32]/30 bg-[#F4ECE7]/40 dark:bg-[#2A201C]/30 space-y-2 text-xs">
                <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
                  Simulation Outcome
                </span>

                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Resolved Model:</span>{' '}
                    <span className="font-bold text-foreground">{simResult.selectedModel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target Provider:</span>{' '}
                    <span className="font-medium text-foreground">{simResult.selectedProvider}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Matching Trigger:</span>{' '}
                    <span className="font-mono text-[11px] text-[#C85A32]">
                      {simResult.matchedRule || 'Default Auto-Route Head'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground block mb-1 uppercase font-semibold">
                    Failover Order If Degraded:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {simResult.fallbackChain.map((f, i) => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                        {i + 1}. {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Rule Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Conditional Routing Rule</DialogTitle>
            <DialogDescription>
              Route incoming completions matching this condition to a dedicated model and provider.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Condition Trigger</label>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as typeof conditionType)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background font-medium"
              >
                <option value="has_image">Prompt Contains Images (Vision)</option>
                <option value="needs_tools">Prompt Requests Tool Calling</option>
                <option value="min_chars">Prompt Character Length &gt;= Min</option>
                <option value="max_chars">Prompt Character Length &lt;= Max</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Condition Value</label>
              {conditionType === 'has_image' || conditionType === 'needs_tools' ? (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background font-medium"
                >
                  <option value="true">True (Detected)</option>
                  <option value="false">False (Not detected)</option>
                </select>
              ) : (
                <Input
                  type="number"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="e.g. 2000"
                  className="h-9 text-xs"
                  required
                />
              )}
            </div>

            <div>
              <label className="font-semibold block mb-1">Target Model Override</label>
              <select
                value={actionModel}
                onChange={(e) => setActionModel(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background font-medium"
              >
                {catalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Preferred Upstream Provider</label>
              <Input
                value={actionProvider}
                onChange={(e) => setActionProvider(e.target.value)}
                placeholder="e.g. Google Gemini"
                className="h-9 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRuleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveRuleMutation.isPending}
                className="bg-[#C85A32] hover:bg-[#B34E29] text-white"
              >
                {saveRuleMutation.isPending ? 'Saving...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
