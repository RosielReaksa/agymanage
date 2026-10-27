import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';

const state = vi.hoisted(() => ({
  directory: '',
}));

vi.mock('better-sqlite3', async () => {
  const { createRequire } = await import('node:module');
  return { default: createRequire(import.meta.url)('better-sqlite3') };
});

vi.mock('@/shared/platform/paths', () => ({
  getCloudAccountsDbPath: () => path.join(state.directory, 'cloud_accounts.db'),
}));

vi.mock('@/server/server-config', () => ({
  getServerConfig: () => ({ api_key: 'master-admin-key' }),
}));

vi.mock('@/modules/proxy-gateway/opencode-sync/opencode-credentials', () => ({
  openCodeCredentialService: {
    matches: (token?: string) => token === 'opencode-credential-token',
  },
}));

import { saasService, MODEL_CATALOG } from '@/modules/saas/services/saas.service';
import { saasRouter } from '@/modules/saas/ipc/router';
import { ProxyGuard } from '@/modules/proxy-gateway/server/guards/proxy.guard';
import {
  SAAS_DEFAULT_USER_BALANCE,
  SAAS_DEFAULT_USER_EMAIL,
} from '@/modules/saas/persistence/saas-db';

describe('SaaS Backend Engine', () => {
  beforeEach(() => {
    state.directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agm-saas-test-'));
  });

  afterEach(() => {
    if (state.directory && fs.existsSync(state.directory)) {
      fs.rmSync(state.directory, { recursive: true, force: true });
    }
  });

  describe('SaasService', () => {
    it('seeds default user with $25.000000 balance', () => {
      const user = saasService.getUser();
      expect(user).toBeDefined();
      expect(user.email).toBe(SAAS_DEFAULT_USER_EMAIL);
      expect(user.balanceUsd).toBe(SAAS_DEFAULT_USER_BALANCE);
      expect(saasService.getBalance()).toBe(25.0);
    });

    it('adds credits to user balance', () => {
      const initial = saasService.getBalance();
      const updatedUser = saasService.addCredits(15.5);
      expect(updatedUser.balanceUsd).toBe(initial + 15.5);
      expect(saasService.getBalance()).toBe(initial + 15.5);
    });

    it('generates API key, returns cleartext once, and stores hash/prefix', () => {
      const created = saasService.generateApiKey('Development Key');
      expect(created.apiKey).toMatch(/^sk-live-[a-f0-9]{48}$/);
      expect(created.keyPrefix).toBe(`sk-live-...${created.apiKey.slice(-4)}`);
      expect(created.label).toBe('Development Key');

      const keys = saasService.listApiKeys();
      expect(keys.length).toBe(1);
      expect(keys[0].id).toBe(created.id);
      expect(keys[0].label).toBe('Development Key');
      expect(keys[0].keyPrefix).toBe(created.keyPrefix);
      expect(keys[0].isActive).toBe(true);
      // Ensure raw key or hash is not exposed in list
      expect((keys[0] as Record<string, unknown>).apiKey).toBeUndefined();
      expect((keys[0] as Record<string, unknown>).keyHash).toBeUndefined();
    });

    it('validates active API key and updates lastUsedAt', () => {
      const created = saasService.generateApiKey('Test Key');
      const validation = saasService.validateApiKey(created.apiKey);

      expect(validation.valid).toBe(true);
      expect(validation.user).toBeDefined();
      expect(validation.user?.email).toBe(SAAS_DEFAULT_USER_EMAIL);
      expect(validation.apiKey?.id).toBe(created.id);

      const keys = saasService.listApiKeys();
      expect(keys[0].lastUsedAt).toBeGreaterThan(0);
    });

    it('rejects invalid or non-existent API keys', () => {
      const validation = saasService.validateApiKey('sk-live-invalid-token');
      expect(validation.valid).toBe(false);
      expect(validation.user).toBeUndefined();
    });

    it('revokes an API key and subsequent validation fails', () => {
      const created = saasService.generateApiKey('Key To Revoke');
      expect(saasService.validateApiKey(created.apiKey).valid).toBe(true);

      const revokeResult = saasService.revokeApiKey(created.id);
      expect(revokeResult.success).toBe(true);

      // Now validation must fail
      const afterRevocation = saasService.validateApiKey(created.apiKey);
      expect(afterRevocation.valid).toBe(false);

      const keys = saasService.listApiKeys();
      const revoked = keys.find((k) => k.id === created.id);
      expect(revoked?.isActive).toBe(false);
    });

    it('records usage, inserts usage log and deducts from user balance', () => {
      const user = saasService.getUser();
      const initialBalance = user.balanceUsd;
      const key = saasService.generateApiKey('Metering Key');

      const log = saasService.recordUsage({
        userId: user.id,
        apiKeyId: key.id,
        model: 'gemini-2.5-flash',
        promptTokens: 1000,
        completionTokens: 500,
        costUsd: 0.00045,
      });

      expect(log.id).toBeDefined();
      expect(log.totalTokens).toBe(1500);
      expect(log.costUsd).toBe(0.00045);

      const updatedUser = saasService.getUser(user.id);
      expect(updatedUser.balanceUsd).toBeCloseTo(initialBalance - 0.00045, 6);

      const logs = saasService.getUsageLogs(10);
      expect(logs.length).toBe(1);
      expect(logs[0].id).toBe(log.id);
      expect(logs[0].model).toBe('gemini-2.5-flash');
      expect(logs[0].totalTokens).toBe(1500);
    });

    it('provides model catalog with pricing and context', () => {
      const catalog = saasService.getModelCatalog();
      expect(catalog.length).toBeGreaterThan(0);
      const flash = catalog.find((m) => m.id === 'gemini-2.5-flash');
      expect(flash).toBeDefined();
      expect(flash?.contextLength).toBe(1048576);
      expect(flash?.pricing.promptPerMillion).toBe(0.15);
      expect(flash?.pricing.completionPerMillion).toBe(0.6);
    });
  });

  describe('ProxyGuard with SaaS keys', () => {
    function createMockContext(headers: Record<string, string>): {
      context: ExecutionContext;
      request: {
        headers: Record<string, string>;
        ip: string;
        url: string;
        raw: { saasContext?: unknown };
        saasContext?: unknown;
      };
    } {
      const request = {
        headers,
        ip: '127.0.0.1',
        url: '/v1/chat/completions',
        raw: {} as { saasContext?: unknown },
        saasContext: undefined as unknown,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      return { context, request };
    }

    it('authorizes valid sk- token with positive balance and attaches saasContext', () => {
      const key = saasService.generateApiKey('Proxy Auth Key');
      const { context, request } = createMockContext({
        authorization: `Bearer ${key.apiKey}`,
      });

      const guard = new ProxyGuard();
      const canActivate = guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(request.raw.saasContext).toBeDefined();
      expect((request.raw.saasContext as any).user.email).toBe(SAAS_DEFAULT_USER_EMAIL);
      expect((request.raw.saasContext as any).apiKey.id).toBe(key.id);
    });

    it('throws UnauthorizedException for invalid sk- token', () => {
      const { context } = createMockContext({
        authorization: 'Bearer sk-live-bad-token-does-not-exist',
      });

      const guard = new ProxyGuard();
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('throws 402 Payment Required when balance is zero or exhausted', () => {
      const user = saasService.getUser();
      // Deduct full balance
      saasService.recordUsage({
        userId: user.id,
        model: 'gemini-2.5-pro',
        promptTokens: 100000,
        completionTokens: 50000,
        costUsd: user.balanceUsd, // Drains entire balance to 0
      });

      const key = saasService.generateApiKey('Zero Balance Key');
      const { context } = createMockContext({
        authorization: `Bearer ${key.apiKey}`,
      });

      const guard = new ProxyGuard();
      try {
        guard.canActivate(context);
        expect.unreachable('Should have thrown 402 Payment Required');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      }
    });

    it('allows master admin key for non-sk tokens', () => {
      const { context } = createMockContext({
        authorization: 'Bearer master-admin-key',
      });

      const guard = new ProxyGuard();
      expect(guard.canActivate(context)).toBe(true);
    });

    it('allows openCode credential token for non-sk tokens', () => {
      const { context } = createMockContext({
        authorization: 'Bearer opencode-credential-token',
      });

      const guard = new ProxyGuard();
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
