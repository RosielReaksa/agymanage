import { os } from '@orpc/server';
import { z } from 'zod';
import { saasService } from '../services/saas.service';
import {
  CreatedSaasApiKeySchema,
  CreatePartnerInputSchema,
  PlaygroundRunInputSchema,
  PlaygroundRunOutputSchema,
  SaasAccessRequestSchema,
  SaasApiKeySchema,
  SaasModelCatalogItemSchema,
  SaasPartnerSchema,
  SaasUsageLogSchema,
  SaasUserSchema,
  SubmitAccessRequestInputSchema,
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
});
