import { os } from '@orpc/server';
import { z } from 'zod';
import { saasService } from '../services/saas.service';
import {
  CreatedSaasApiKeySchema,
  SaasApiKeySchema,
  SaasModelCatalogItemSchema,
  SaasUsageLogSchema,
  SaasUserSchema,
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
});
