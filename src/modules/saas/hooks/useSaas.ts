import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@/ipc/manager';
import type { SaaSUser, ApiKey, CreatedSaasApiKey, ModelInfo, UsageLog } from '../types';

export const SAAS_QUERY_KEYS = {
  user: ['saas', 'user'],
  keys: ['saas', 'keys'],
  models: ['saas', 'models'],
  usageLogs: ['saas', 'usageLogs'],
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
