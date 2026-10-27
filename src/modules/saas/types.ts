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

export const SaasPartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  monthlySpendCap: z.number(),
  currentMonthSpend: z.number(),
  createdAt: z.number(),
  apiKeyCount: z.number().optional(),
});
export type SaasPartner = z.infer<typeof SaasPartnerSchema>;

export const CreatePartnerInputSchema = z.object({
  name: z.string().min(1),
  monthlySpendCap: z.number().default(100.0),
});
export type CreatePartnerInput = z.infer<typeof CreatePartnerInputSchema>;

export const SaasAccessRequestSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  organization: z.string().nullable().optional(),
  useCase: z.string().nullable().optional(),
  estimatedVolume: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
  createdAt: z.number(),
});
export type SaasAccessRequest = z.infer<typeof SaasAccessRequestSchema>;

export const SubmitAccessRequestInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  organization: z.string().optional(),
  useCase: z.string().optional(),
  estimatedVolume: z.string().optional(),
});
export type SubmitAccessRequestInput = z.infer<typeof SubmitAccessRequestInputSchema>;

export const PlaygroundRunInputSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(1).max(8192).default(1024),
  top_p: z.number().min(0).max(1).default(1),
});
export type PlaygroundRunInput = z.infer<typeof PlaygroundRunInputSchema>;

export const PlaygroundRunOutputSchema = z.object({
  content: z.string(),
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  costUsd: z.number(),
  latencyMs: z.number(),
});
export type PlaygroundRunOutput = z.infer<typeof PlaygroundRunOutputSchema>;

// --- Upstream Providers ---
export const SaasProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  baseUrl: z.string(),
  apiKey: z.string().optional(),
  priority: z.number().default(100),
  isFreeTier: z.boolean().default(false),
  monthlyCapUsd: z.number().nullable().optional(),
  rpmLimit: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  paused: z.boolean().default(false),
  pausedReason: z.string().nullable().optional(),
  healthStatus: z.enum(['healthy', 'unknown', 'degraded', 'offline']).default('healthy'),
  lastLatencyMs: z.number().nullable().optional(),
  lastCheckedAt: z.number().nullable().optional(),
  createdAt: z.number(),
});
export type SaasProvider = z.infer<typeof SaasProviderSchema>;

export const SaveProviderInputSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  label: z.string(),
  baseUrl: z.string(),
  apiKey: z.string().optional(),
  priority: z.number().default(100),
  isFreeTier: z.boolean().default(false),
  monthlyCapUsd: z.number().nullable().optional(),
  rpmLimit: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  paused: z.boolean().default(false),
  pausedReason: z.string().nullable().optional(),
});
export type SaveProviderInput = z.infer<typeof SaveProviderInputSchema>;

// --- Routing & Fallback Chains ---
export const SaasRoutingRuleSchema = z.object({
  id: z.string(),
  position: z.number(),
  conditionJson: z.string(),
  actionJson: z.string(),
  isActive: z.boolean(),
  createdAt: z.number(),
});
export type SaasRoutingRule = z.infer<typeof SaasRoutingRuleSchema>;

export const SaveRoutingRuleInputSchema = z.object({
  id: z.string().optional(),
  position: z.number().default(0),
  conditionJson: z.string(),
  actionJson: z.string(),
  isActive: z.boolean().default(true),
});
export type SaveRoutingRuleInput = z.infer<typeof SaveRoutingRuleInputSchema>;

export const SaasRoutingConfigSchema = z.object({
  autoRoute: z.array(z.string()),
  fallbackEnabled: z.boolean().default(true),
  maxRetries: z.number().default(3),
  timeoutMs: z.number().default(30000),
});
export type SaasRoutingConfig = z.infer<typeof SaasRoutingConfigSchema>;

// --- Maintenance Center ---
export const SaasMaintenanceStateSchema = z.object({
  id: z.string(),
  globalActive: z.boolean(),
  globalMessage: z.string().nullable().optional(),
  globalStartedAt: z.number().nullable().optional(),
  globalExpectedEnd: z.number().nullable().optional(),
  globalAllowIps: z.array(z.string()).optional(),
  degradedActive: z.boolean(),
  degradedPaidOnly: z.boolean(),
  degradedFreeOnly: z.boolean(),
  degradedReducePct: z.number(),
  degradedMaxTokens: z.number().nullable().optional(),
  updatedAt: z.number(),
});
export type SaasMaintenanceState = z.infer<typeof SaasMaintenanceStateSchema>;

export const SetGlobalMaintenanceInputSchema = z.object({
  active: z.boolean(),
  message: z.string().optional(),
  expectedEnd: z.number().nullable().optional(),
  allowIps: z.array(z.string()).optional(),
  reason: z.string().optional(),
});
export type SetGlobalMaintenanceInput = z.infer<typeof SetGlobalMaintenanceInputSchema>;

export const SetDegradedMaintenanceInputSchema = z.object({
  active: z.boolean(),
  paidOnly: z.boolean().default(false),
  freeOnly: z.boolean().default(false),
  reducePct: z.number().min(0).max(100).default(0),
  maxTokens: z.number().nullable().optional(),
  reason: z.string().optional(),
});
export type SetDegradedMaintenanceInput = z.infer<typeof SetDegradedMaintenanceInputSchema>;

export const SaasMaintenanceHistoryItemSchema = z.object({
  id: z.string(),
  level: z.string(),
  target: z.string().nullable().optional(),
  action: z.string(),
  reason: z.string().nullable().optional(),
  createdAt: z.number(),
});
export type SaasMaintenanceHistoryItem = z.infer<typeof SaasMaintenanceHistoryItemSchema>;

export const SaasMaintenanceWindowSchema = z.object({
  id: z.string(),
  startsAt: z.number(),
  endsAt: z.number(),
  bannerText: z.string(),
  autoEnable: z.boolean(),
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
  createdAt: z.number(),
});
export type SaasMaintenanceWindow = z.infer<typeof SaasMaintenanceWindowSchema>;

// --- Activity & Requests Log ---
export const ActivityFilterInputSchema = z.object({
  search: z.string().optional(),
  provider: z.string().optional(),
  status: z.string().optional(),
  model: z.string().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});
export type ActivityFilterInput = z.infer<typeof ActivityFilterInputSchema>;

export const ActivityItemSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  userId: z.string(),
  apiKeyId: z.string().nullable().optional(),
  provider: z.string(),
  model: z.string(),
  statusCode: z.number(),
  latencyMs: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  costUsd: z.number(),
  priceUsd: z.number(),
  cached: z.boolean(),
  createdAt: z.number(),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const ActivityResponseSchema = z.object({
  items: z.array(ActivityItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type ActivityResponse = z.infer<typeof ActivityResponseSchema>;

// --- Usage & Analytics Metrics ---
export const UsageMetricsSchema = z.object({
  days: z.number(),
  totals: z.object({
    requests: z.number(),
    tokens: z.number(),
    promptTokens: z.number(),
    completionTokens: z.number(),
    costUsd: z.number(),
    priceUsd: z.number(),
    marginUsd: z.number(),
    marginPct: z.number(),
  }),
  daily: z.array(
    z.object({
      date: z.string(),
      requests: z.number(),
      tokens: z.number(),
      cost: z.number(),
      price: z.number(),
    })
  ),
  providerBreakdown: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      requests: z.number(),
      tokens: z.number(),
      percentage: z.number(),
    })
  ),
  topModels: z.array(
    z.object({
      model: z.string(),
      requests: z.number(),
      tokens: z.number(),
      costUsd: z.number(),
    })
  ),
});
export type UsageMetrics = z.infer<typeof UsageMetricsSchema>;
