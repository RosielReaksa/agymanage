import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@/ipc/manager';
import type {
  ActivityFilterInput,
  ActivityResponse,
  ApiKey,
  CreatedSaasApiKey,
  CreatePartnerInput,
  ModelInfo,
  PlaygroundRunInput,
  PlaygroundRunOutput,
  SaasAccessRequest,
  SaasMaintenanceHistoryItem,
  SaasMaintenanceState,
  SaasMaintenanceWindow,
  SaasPartner,
  SaasProvider,
  SaasRoutingConfig,
  SaasRoutingRule,
  SaaSUser,
  SaveProviderInput,
  SaveRoutingRuleInput,
  SetDegradedMaintenanceInput,
  SetGlobalMaintenanceInput,
  SubmitAccessRequestInput,
  UsageLog,
  UsageMetrics,
} from '../types';

export const SAAS_QUERY_KEYS = {
  user: ['saas', 'user'],
  keys: ['saas', 'keys'],
  models: ['saas', 'models'],
  usageLogs: ['saas', 'usageLogs'],
  partners: ['saas', 'partners'],
  accessRequests: ['saas', 'accessRequests'],
  providers: ['saas', 'providers'],
  routingConfig: ['saas', 'routingConfig'],
  routingRules: ['saas', 'routingRules'],
  maintenanceState: ['saas', 'maintenanceState'],
  maintenanceHistory: ['saas', 'maintenanceHistory'],
  activity: ['saas', 'activity'],
  usageMetrics: ['saas', 'usageMetrics'],
};

export function useSaasUser() {
  return useQuery<SaaSUser>({
    queryKey: SAAS_QUERY_KEYS.user,
    queryFn: async () => {
      return await ipc.client.saas.getUser();
    },
    staleTime: 30000,
  });
}

export function useSaasKeys() {
  return useQuery<ApiKey[]>({
    queryKey: SAAS_QUERY_KEYS.keys,
    queryFn: async () => {
      return await ipc.client.saas.listKeys();
    },
    staleTime: 30000,
  });
}

export function useSaasModels() {
  return useQuery<ModelInfo[]>({
    queryKey: SAAS_QUERY_KEYS.models,
    queryFn: async () => {
      return await ipc.client.saas.getModels();
    },
    staleTime: 60000,
  });
}

export function useSaasUsageLogs(limit: number = 20) {
  return useQuery<UsageLog[]>({
    queryKey: [...SAAS_QUERY_KEYS.usageLogs, limit],
    queryFn: async () => {
      return await ipc.client.saas.getUsageLogs({ limit });
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useCreateKey() {
  const queryClient = useQueryClient();

  return useMutation<CreatedSaasApiKey, Error, { name?: string; label?: string }>({
    mutationFn: async ({ name, label }: { name?: string; label?: string }) => {
      const keyLabel = label ?? name ?? 'API Key';
      return await ipc.client.saas.createKey({ name: keyLabel, label: keyLabel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.keys });
    },
  });
}

export function useRevokeKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return await ipc.client.saas.revokeKey({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.keys });
    },
  });
}

export function useAddCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      return await ipc.client.saas.addCredits({ amount, amountUsd: amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.user });
    },
  });
}

export function useSaasPartners() {
  return useQuery<SaasPartner[]>({
    queryKey: SAAS_QUERY_KEYS.partners,
    queryFn: async () => {
      return await ipc.client.saas.listPartners();
    },
    staleTime: 30000,
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();

  return useMutation<SaasPartner, Error, CreatePartnerInput>({
    mutationFn: async (input: CreatePartnerInput) => {
      return await ipc.client.saas.createPartner(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.partners });
    },
  });
}

export function useSaasAccessRequests() {
  return useQuery<SaasAccessRequest[]>({
    queryKey: SAAS_QUERY_KEYS.accessRequests,
    queryFn: async () => {
      return await ipc.client.saas.listAccessRequests();
    },
    staleTime: 15000,
  });
}

export function useSubmitAccessRequest() {
  return useMutation<SaasAccessRequest, Error, SubmitAccessRequestInput>({
    mutationFn: async (input: SubmitAccessRequestInput) => {
      return await ipc.client.saas.submitAccessRequest(input);
    },
  });
}

export function useApproveAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    { request: SaasAccessRequest; user: SaaSUser; key: CreatedSaasApiKey },
    Error,
    { id: string }
  >({
    mutationFn: async ({ id }: { id: string }) => {
      return (await ipc.client.saas.approveAccessRequest({ id })) as {
        request: SaasAccessRequest;
        user: SaaSUser;
        key: CreatedSaasApiKey;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.accessRequests });
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.keys });
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.partners });
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.user });
    },
  });
}

export function useRejectAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation<SaasAccessRequest, Error, { id: string }>({
    mutationFn: async ({ id }: { id: string }) => {
      return (await ipc.client.saas.rejectAccessRequest({ id })) as SaasAccessRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.accessRequests });
    },
  });
}

export function useRunPlayground() {
  return useMutation<PlaygroundRunOutput, Error, PlaygroundRunInput>({
    mutationFn: async (input: PlaygroundRunInput) => {
      return await ipc.client.saas.runPlayground(input);
    },
  });
}

// --- Providers Hooks ---
export function useSaasProviders() {
  return useQuery<SaasProvider[]>({
    queryKey: SAAS_QUERY_KEYS.providers,
    queryFn: async () => {
      return await ipc.client.saas.listProviders();
    },
    staleTime: 30000,
  });
}

export function useSaveProvider() {
  const queryClient = useQueryClient();
  return useMutation<SaasProvider, Error, SaveProviderInput>({
    mutationFn: async (input: SaveProviderInput) => {
      return await ipc.client.saas.saveProvider(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.providers });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; id: string }, Error, { id: string }>({
    mutationFn: async ({ id }: { id: string }) => {
      return await ipc.client.saas.deleteProvider({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.providers });
    },
  });
}

export function useTestProvider() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean; latencyMs: number; error?: string }, Error, { id: string }>({
    mutationFn: async ({ id }: { id: string }) => {
      return await ipc.client.saas.testProvider({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.providers });
    },
  });
}

// --- Routing Hooks ---
export function useSaasRoutingConfig() {
  return useQuery<SaasRoutingConfig>({
    queryKey: SAAS_QUERY_KEYS.routingConfig,
    queryFn: async () => {
      return await ipc.client.saas.getRoutingConfig();
    },
    staleTime: 30000,
  });
}

export function useSaveRoutingConfig() {
  const queryClient = useQueryClient();
  return useMutation<SaasRoutingConfig, Error, Partial<SaasRoutingConfig>>({
    mutationFn: async (input: Partial<SaasRoutingConfig>) => {
      return await ipc.client.saas.saveRoutingConfig(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.routingConfig });
    },
  });
}

export function useSaasRoutingRules() {
  return useQuery<SaasRoutingRule[]>({
    queryKey: SAAS_QUERY_KEYS.routingRules,
    queryFn: async () => {
      return await ipc.client.saas.listRoutingRules();
    },
    staleTime: 30000,
  });
}

export function useSaveRoutingRule() {
  const queryClient = useQueryClient();
  return useMutation<SaasRoutingRule, Error, SaveRoutingRuleInput>({
    mutationFn: async (input: SaveRoutingRuleInput) => {
      return await ipc.client.saas.saveRoutingRule(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.routingRules });
    },
  });
}

export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; id: string }, Error, { id: string }>({
    mutationFn: async ({ id }: { id: string }) => {
      return await ipc.client.saas.deleteRoutingRule({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.routingRules });
    },
  });
}

export function useSimulateRouting() {
  return useMutation<
    { selectedModel: string; selectedProvider: string; matchedRule?: string; fallbackChain: string[] },
    Error,
    { message: string; hasVision?: boolean; needsTools?: boolean; preset?: string }
  >({
    mutationFn: async (input) => {
      return await ipc.client.saas.simulateRouting(input);
    },
  });
}

// --- Maintenance Hooks ---
export function useSaasMaintenanceState() {
  return useQuery<SaasMaintenanceState>({
    queryKey: SAAS_QUERY_KEYS.maintenanceState,
    queryFn: async () => {
      return await ipc.client.saas.getMaintenanceState();
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });
}

export function useSetGlobalMaintenance() {
  const queryClient = useQueryClient();
  return useMutation<SaasMaintenanceState, Error, SetGlobalMaintenanceInput>({
    mutationFn: async (input: SetGlobalMaintenanceInput) => {
      return await ipc.client.saas.setGlobalMaintenance(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.maintenanceState });
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.maintenanceHistory });
    },
  });
}

export function useSetDegradedMaintenance() {
  const queryClient = useQueryClient();
  return useMutation<SaasMaintenanceState, Error, SetDegradedMaintenanceInput>({
    mutationFn: async (input: SetDegradedMaintenanceInput) => {
      return await ipc.client.saas.setDegradedMaintenance(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.maintenanceState });
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.maintenanceHistory });
    },
  });
}

export function useSaasMaintenanceHistory() {
  return useQuery<SaasMaintenanceHistoryItem[]>({
    queryKey: SAAS_QUERY_KEYS.maintenanceHistory,
    queryFn: async () => {
      return await ipc.client.saas.listMaintenanceHistory();
    },
    staleTime: 15000,
  });
}

export function useScheduleMaintenanceWindow() {
  const queryClient = useQueryClient();
  return useMutation<
    SaasMaintenanceWindow,
    Error,
    { startsAt: number; endsAt: number; bannerText: string; autoEnable?: boolean }
  >({
    mutationFn: async (input) => {
      return await ipc.client.saas.scheduleMaintenanceWindow(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.maintenanceState });
    },
  });
}

export function useDeleteMaintenanceWindow() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; id: string }, Error, { id: string }>({
    mutationFn: async ({ id }: { id: string }) => {
      return await ipc.client.saas.deleteMaintenanceWindow({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_QUERY_KEYS.maintenanceState });
    },
  });
}

// --- Activity Hooks ---
export function useSaasActivity(filter: ActivityFilterInput) {
  return useQuery<ActivityResponse>({
    queryKey: [...SAAS_QUERY_KEYS.activity, filter],
    queryFn: async () => {
      return await ipc.client.saas.listActivity(filter);
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });
}

export function useExportActivityCsv() {
  return useMutation<string, Error, ActivityFilterInput>({
    mutationFn: async (filter: ActivityFilterInput) => {
      return await ipc.client.saas.exportActivityCsv(filter);
    },
  });
}

// --- Usage & Analytics Hooks ---
export function useSaasUsageMetrics(days: number = 30) {
  return useQuery<UsageMetrics>({
    queryKey: [...SAAS_QUERY_KEYS.usageMetrics, days],
    queryFn: async () => {
      return await ipc.client.saas.getUsageMetrics({ days });
    },
    staleTime: 30000,
  });
}
