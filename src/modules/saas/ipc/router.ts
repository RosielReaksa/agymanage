import { os } from '@orpc/server';
import { z } from 'zod';
import { saasService } from '../services/saas.service';
import {
  ActivityFilterInputSchema,
  ActivityResponseSchema,
  CreatedSaasApiKeySchema,
  CreatePartnerInputSchema,
  PlaygroundRunInputSchema,
  PlaygroundRunOutputSchema,
  SaasAccessRequestSchema,
  SaasApiKeySchema,
  SaasMaintenanceHistoryItemSchema,
  SaasMaintenanceStateSchema,
  SaasMaintenanceWindowSchema,
  SaasModelCatalogItemSchema,
  SaasPartnerSchema,
  SaasProviderSchema,
  SaasRoutingConfigSchema,
  SaasRoutingRuleSchema,
  SaasUsageLogSchema,
  SaasUserSchema,
  SaveProviderInputSchema,
  SaveRoutingRuleInputSchema,
  SetDegradedMaintenanceInputSchema,
  SetGlobalMaintenanceInputSchema,
  SubmitAccessRequestInputSchema,
  UsageMetricsSchema,
} from '../types';

export const saasRouter = os.router({
  getUser: os
    .input(z.object({ userId: z.string().optional() }).optional())
    .output(SaasUserSchema)
    .handler(async ({ input }) => {
      return saasService.getUser(input?.userId);
    }),

  addCredits: os
    .input(
      z.object({
        amountUsd: z.number().positive().optional(),
        amount: z.number().positive().optional(),
        userId: z.string().optional(),
      }),
    )
    .output(SaasUserSchema)
    .handler(async ({ input }) => {
      const amount = input.amountUsd ?? input.amount;
      if (!amount || amount <= 0) {
        throw new Error('Top-up credit amount must be greater than zero');
      }
      return saasService.addCredits(amount, input.userId);
    }),

  listKeys: os
    .input(z.object({ userId: z.string().optional() }).optional())
    .output(z.array(SaasApiKeySchema))
    .handler(async ({ input }) => {
      return saasService.listApiKeys(input?.userId);
    }),

  createKey: os
    .input(
      z.object({
        label: z.string().optional(),
        name: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .output(CreatedSaasApiKeySchema)
    .handler(async ({ input }) => {
      const label = (input.label ?? input.name ?? 'API Key').trim();
      return saasService.generateApiKey(label, input.userId);
    }),

  revokeKey: os
    .input(z.object({ id: z.string().min(1) }))
    .output(z.object({ success: z.boolean(), id: z.string().optional() }))
    .handler(async ({ input }) => {
      return saasService.revokeApiKey(input.id);
    }),

  getUsageLogs: os
    .input(
      z
        .object({
          limit: z.number().min(1).max(500).optional(),
          userId: z.string().optional(),
        })
        .optional(),
    )
    .output(z.array(SaasUsageLogSchema))
    .handler(async ({ input }) => {
      return saasService.getUsageLogs(input?.limit, input?.userId);
    }),

  getModels: os
    .output(z.array(SaasModelCatalogItemSchema))
    .handler(async () => {
      return saasService.getModelCatalog();
    }),

  listPartners: os
    .output(z.array(SaasPartnerSchema))
    .handler(async () => {
      return saasService.listPartners();
    }),

  createPartner: os
    .input(CreatePartnerInputSchema)
    .output(SaasPartnerSchema)
    .handler(async ({ input }) => {
      return saasService.createPartner(input);
    }),

  submitAccessRequest: os
    .input(SubmitAccessRequestInputSchema)
    .output(SaasAccessRequestSchema)
    .handler(async ({ input }) => {
      return saasService.submitAccessRequest(input);
    }),

  listAccessRequests: os
    .output(z.array(SaasAccessRequestSchema))
    .handler(async () => {
      return saasService.listAccessRequests();
    }),

  approveAccessRequest: os
    .input(z.object({ id: z.string().min(1) }))
    .output(
      z.object({
        request: SaasAccessRequestSchema,
        user: SaasUserSchema,
        key: CreatedSaasApiKeySchema,
      }),
    )
    .handler(async ({ input }) => {
      return saasService.approveAccessRequest(input.id);
    }),

  rejectAccessRequest: os
    .input(z.object({ id: z.string().min(1) }))
    .output(SaasAccessRequestSchema)
    .handler(async ({ input }) => {
      return saasService.rejectAccessRequest(input.id);
    }),

  runPlayground: os
    .input(PlaygroundRunInputSchema)
    .output(PlaygroundRunOutputSchema)
    .handler(async ({ input }) => {
      return saasService.runPlayground(input);
    }),

  // --- Providers ---
  listProviders: os
    .output(z.array(SaasProviderSchema))
    .handler(async () => {
      return saasService.listProviders();
    }),

  saveProvider: os
    .input(SaveProviderInputSchema)
    .output(SaasProviderSchema)
    .handler(async ({ input }) => {
      return saasService.saveProvider(input);
    }),

  deleteProvider: os
    .input(z.object({ id: z.string().min(1) }))
    .output(z.object({ success: z.boolean(), id: z.string() }))
    .handler(async ({ input }) => {
      return saasService.deleteProvider(input.id);
    }),

  testProvider: os
    .input(z.object({ id: z.string().min(1) }))
    .output(z.object({ ok: z.boolean(), latencyMs: z.number(), error: z.string().optional() }))
    .handler(async ({ input }) => {
      return saasService.testProvider(input.id);
    }),

  // --- Routing & Fallback Chains ---
  getRoutingConfig: os
    .output(SaasRoutingConfigSchema)
    .handler(async () => {
      return saasService.getRoutingConfig();
    }),

  saveRoutingConfig: os
    .input(SaasRoutingConfigSchema.partial())
    .output(SaasRoutingConfigSchema)
    .handler(async ({ input }) => {
      return saasService.saveRoutingConfig(input);
    }),

  listRoutingRules: os
    .output(z.array(SaasRoutingRuleSchema))
    .handler(async () => {
      return saasService.listRoutingRules();
    }),

  saveRoutingRule: os
    .input(SaveRoutingRuleInputSchema)
    .output(SaasRoutingRuleSchema)
    .handler(async ({ input }) => {
      return saasService.saveRoutingRule(input);
    }),

  deleteRoutingRule: os
    .input(z.object({ id: z.string().min(1) }))
    .output(z.object({ success: z.boolean(), id: z.string() }))
    .handler(async ({ input }) => {
      return saasService.deleteRoutingRule(input.id);
    }),

  simulateRouting: os
    .input(
      z.object({
        message: z.string(),
        hasVision: z.boolean().optional(),
        needsTools: z.boolean().optional(),
        preset: z.string().optional(),
      }),
    )
    .output(
      z.object({
        selectedModel: z.string(),
        selectedProvider: z.string(),
        matchedRule: z.string().optional(),
        fallbackChain: z.array(z.string()),
      }),
    )
    .handler(async ({ input }) => {
      return saasService.simulateRouting(input);
    }),

  // --- Maintenance Center ---
  getMaintenanceState: os
    .output(SaasMaintenanceStateSchema)
    .handler(async () => {
      return saasService.getMaintenanceState();
    }),

  setGlobalMaintenance: os
    .input(SetGlobalMaintenanceInputSchema)
    .output(SaasMaintenanceStateSchema)
    .handler(async ({ input }) => {
      return saasService.setGlobalMaintenance(input);
    }),

  setDegradedMaintenance: os
    .input(SetDegradedMaintenanceInputSchema)
    .output(SaasMaintenanceStateSchema)
    .handler(async ({ input }) => {
      return saasService.setDegradedMaintenance(input);
    }),

  listMaintenanceHistory: os
    .output(z.array(SaasMaintenanceHistoryItemSchema))
    .handler(async () => {
      return saasService.listMaintenanceHistory();
    }),

  scheduleMaintenanceWindow: os
    .input(
      z.object({
        startsAt: z.number(),
        endsAt: z.number(),
        bannerText: z.string(),
        autoEnable: z.boolean().optional(),
      }),
    )
    .output(SaasMaintenanceWindowSchema)
    .handler(async ({ input }) => {
      return saasService.scheduleMaintenanceWindow(input);
    }),

  deleteMaintenanceWindow: os
    .input(z.object({ id: z.string().min(1) }))
    .output(z.object({ success: z.boolean(), id: z.string() }))
    .handler(async ({ input }) => {
      return saasService.deleteMaintenanceWindow(input.id);
    }),

  // --- Activity Log ---
  listActivity: os
    .input(ActivityFilterInputSchema)
    .output(ActivityResponseSchema)
    .handler(async ({ input }) => {
      return saasService.listActivity(input);
    }),

  exportActivityCsv: os
    .input(ActivityFilterInputSchema)
    .output(z.string())
    .handler(async ({ input }) => {
      return saasService.exportActivityCsv(input);
    }),

  // --- Usage & Analytics ---
  getUsageMetrics: os
    .input(z.object({ days: z.number().default(30) }).optional())
    .output(UsageMetricsSchema)
    .handler(async ({ input }) => {
      return saasService.getUsageMetrics(input?.days ?? 30);
    }),
});
