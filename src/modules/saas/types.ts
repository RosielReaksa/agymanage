import { z } from 'zod';

export const SaasUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  balance: z.number(),
  balanceUsd: z.number(),
  currency: z.string().default('USD'),
  tier: z.string().default('Pro'),
  createdAt: z.number(),
});
export type SaasUser = z.infer<typeof SaasUserSchema>;
export const SaaSUserSchema = SaasUserSchema;
export type SaaSUser = SaasUser;

export const SaasApiKeySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  label: z.string(),
  keyPrefix: z.string(),
  maskedKey: z.string(),
  key: z.string().optional(),
  apiKey: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.union([z.number(), z.string()]),
  lastUsedAt: z.union([z.number(), z.string()]).nullable().optional(),
});
export type SaasApiKey = z.infer<typeof SaasApiKeySchema>;
export const ApiKeySchema = SaasApiKeySchema;
export type ApiKey = SaasApiKey;

export const CreatedSaasApiKeySchema = z.object({
  id: z.string(),
  apiKey: z.string(),
  key: z.string(),
  keyPrefix: z.string(),
  maskedKey: z.string(),
  label: z.string(),
  name: z.string(),
  createdAt: z.union([z.number(), z.string()]),
});
export type CreatedSaasApiKey = z.infer<typeof CreatedSaasApiKeySchema>;

export const SaasModelPricingSchema = z.object({
  promptPerMillion: z.number(),
  completionPerMillion: z.number(),
  promptPerToken: z.number(),
  completionPerToken: z.number(),
});
export type SaasModelPricing = z.infer<typeof SaasModelPricingSchema>;

export const SaasModelCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  contextLength: z.number(),
  contextWindow: z.string(),
  pricing: SaasModelPricingSchema,
  inputPricePerMillion: z.number(),
  outputPricePerMillion: z.number(),
  description: z.string(),
  status: z.enum(['active', 'degraded', 'offline']),
});
export type SaasModelCatalogItem = z.infer<typeof SaasModelCatalogItemSchema>;
export const ModelInfoSchema = SaasModelCatalogItemSchema;
export type ModelInfo = SaasModelCatalogItem;

export const SaasUsageLogSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  apiKeyId: z.string().nullable().optional(),
  timestamp: z.string(),
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  cost: z.number(),
  costUsd: z.number(),
  status: z.enum(['success', 'error']),
  latencyMs: z.number(),
  createdAt: z.number(),
});
export type SaasUsageLog = z.infer<typeof SaasUsageLogSchema>;
export const UsageLogSchema = SaasUsageLogSchema;
export type UsageLog = SaasUsageLog;

export interface ValidateApiKeyResult {
  valid: boolean;
  user?: SaasUser;
  apiKey?: {
    id: string;
    label: string;
    keyPrefix: string;
    createdAt: number;
  };
}

export interface RecordUsageInput {
  userId: string;
  apiKeyId?: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  status?: 'success' | 'error';
  latencyMs?: number;
}
