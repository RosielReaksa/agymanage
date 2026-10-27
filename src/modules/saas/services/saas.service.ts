import crypto from 'node:crypto';
import { logger } from '@/shared/logging/logger';
import {
  getSaasDb,
  SAAS_DEFAULT_USER_EMAIL,
  SAAS_DEFAULT_USER_ID,
} from '../persistence/saas-db';
import type {
  CreatedSaasApiKey,
  ModelInfo,
  RecordUsageInput,
  SaasApiKey,
  SaasModelCatalogItem,
  SaasUsageLog,
  SaasUser,
  ValidateApiKeyResult,
} from '../types';

export const MODEL_CATALOG: readonly SaasModelCatalogItem[] = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    contextLength: 2097152,
    contextWindow: '2M Context',
    pricing: {
      promptPerMillion: 1.25,
      completionPerMillion: 5.0,
      promptPerToken: 0.00000125,
      completionPerToken: 0.000005,
    },
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.0,
    description: 'Premier flagship model for complex reasoning, code generation, and deep analysis.',
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    contextLength: 1048576,
    contextWindow: '1M Context',
    pricing: {
      promptPerMillion: 0.15,
      completionPerMillion: 0.6,
      promptPerToken: 0.00000015,
      completionPerToken: 0.0000006,
    },
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
    description: 'Fast, highly capable multimodal model with sub-second response times.',
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    contextLength: 1048576,
    contextWindow: '1M Context',
    pricing: {
      promptPerMillion: 0.075,
      completionPerMillion: 0.3,
      promptPerToken: 0.000000075,
      completionPerToken: 0.0000003,
    },
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.3,
    description: 'Lightweight, ultra-low latency model for high-frequency workflows.',
    status: 'active',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextLength: 200000,
    contextWindow: '200k Context',
    pricing: {
      promptPerMillion: 3.0,
      completionPerMillion: 15.0,
      promptPerToken: 0.000003,
      completionPerToken: 0.000015,
    },
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    description: 'Superior benchmark in code generation, refactoring, and agentic reasoning.',
    status: 'active',
  },
  {
    id: 'gemini-2.0-flash-thinking',
    name: 'Gemini 2.0 Flash Thinking',
    provider: 'Google',
    contextLength: 1048576,
    contextWindow: '1M Context',
    pricing: {
      promptPerMillion: 0.2,
      completionPerMillion: 0.8,
      promptPerToken: 0.0000002,
      completionPerToken: 0.0000008,
    },
    inputPricePerMillion: 0.2,
    outputPricePerMillion: 0.8,
    description: 'Frontier reasoning model with internal thought synthesis and real-time streaming.',
    status: 'active',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    contextLength: 128000,
    contextWindow: '128k Context',
    pricing: {
      promptPerMillion: 0.55,
      completionPerMillion: 2.19,
      promptPerToken: 0.00000055,
      completionPerToken: 0.00000219,
    },
    inputPricePerMillion: 0.55,
    outputPricePerMillion: 2.19,
    description: 'Open-weights reasoning model with exceptional math and coding skills.',
    status: 'active',
  },
];

export class SaasService {
  /**
   * Fetch a SaaS user by ID or retrieve the default user.
   */
  getUser(userId?: string): SaasUser {
    const { raw } = getSaasDb();
    try {
      let row: { id: string; email: string; balance_usd: number; created_at: number } | undefined;

      if (userId) {
        row = raw
          .prepare('SELECT id, email, balance_usd, created_at FROM saas_users WHERE id = ?')
          .get(userId) as typeof row;
      } else {
        row = raw
          .prepare('SELECT id, email, balance_usd, created_at FROM saas_users WHERE email = ?')
          .get(SAAS_DEFAULT_USER_EMAIL) as typeof row;

        if (!row) {
          row = raw
            .prepare(
              'SELECT id, email, balance_usd, created_at FROM saas_users ORDER BY created_at ASC LIMIT 1',
            )
            .get() as typeof row;
        }
      }

      if (!row) {
        throw new Error(
          userId ? `SaaS user with ID '${userId}' not found` : 'No SaaS user found',
        );
      }

      const balance = Number(row.balance_usd);
      return {
        id: row.id,
        email: row.email,
        name: 'Antigravity Developer',
        balance,
        balanceUsd: balance,
        currency: 'USD',
        tier: 'Pro',
        createdAt: row.created_at,
      };
    } finally {
      raw.close();
    }
  }

  /**
   * Get balance for a user in USD.
   */
  getBalance(userId?: string): number {
    return this.getUser(userId).balanceUsd;
  }

  /**
   * Add credits to a user balance.
   */
  addCredits(amountUsd: number, userId?: string): SaasUser {
    if (amountUsd <= 0) {
      throw new Error('Credit amount must be greater than zero');
    }

    const user = this.getUser(userId);
    const { raw } = getSaasDb();
    try {
      raw
        .prepare('UPDATE saas_users SET balance_usd = balance_usd + ? WHERE id = ?')
        .run(amountUsd, user.id);

      logger.info(
        `[SaaS Engine] Added $${amountUsd.toFixed(6)} to user ${user.email} (${user.id})`,
      );
    } finally {
      raw.close();
    }

    return this.getUser(user.id);
  }

  /**
   * Generate an OpenAI-compatible API key (sk-live-${randomHex}).
   * Returns cleartext key once; stores SHA-256 hash and masked prefix.
   */
  generateApiKey(label: string, userId?: string): CreatedSaasApiKey {
    const trimmedLabel = (label || 'Default API Key').trim();
    if (!trimmedLabel) {
      throw new Error('API key label cannot be empty');
    }

    const user = this.getUser(userId);
    const randomHex = crypto.randomBytes(24).toString('hex');
    const cleartextKey = `sk-live-${randomHex}`;
    const keyHash = crypto.createHash('sha256').update(cleartextKey).digest('hex');
    const last4 = cleartextKey.slice(-4);
    const keyPrefix = `sk-live-...${last4}`;
    const maskedKey = `${cleartextKey.slice(0, 12)}••••••••${last4}`;
    const id = crypto.randomUUID();
    const now = Date.now();

    const { raw } = getSaasDb();
    try {
      raw
        .prepare(`
          INSERT INTO saas_api_keys (id, user_id, key_hash, key_prefix, label, is_active, created_at, last_used_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, NULL)
        `)
        .run(id, user.id, keyHash, keyPrefix, trimmedLabel, now);

      logger.info(
        `[SaaS Engine] Generated API key '${trimmedLabel}' (${keyPrefix}) for user ${user.email}`,
      );
    } finally {
      raw.close();
    }

    return {
      id,
      apiKey: cleartextKey,
      key: cleartextKey,
      keyPrefix,
      maskedKey,
      label: trimmedLabel,
      name: trimmedLabel,
      createdAt: now,
    };
  }

  /**
   * Alias for generateApiKey
   */
  createKey(label: string, userId?: string): CreatedSaasApiKey {
    return this.generateApiKey(label, userId);
  }

  /**
   * List all API keys for a user (without hashes or secret values).
   */
  listApiKeys(userId?: string): SaasApiKey[] {
    const user = this.getUser(userId);
    const { raw } = getSaasDb();
    try {
      const rows = raw
        .prepare(`
          SELECT id, user_id, key_prefix, label, is_active, created_at, last_used_at
          FROM saas_api_keys
          WHERE user_id = ?
          ORDER BY created_at DESC
        `)
        .all(user.id) as Array<{
        id: string;
        user_id: string;
        key_prefix: string;
        label: string;
        is_active: number;
        created_at: number;
        last_used_at: number | null;
      }>;

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        label: row.label,
        name: row.label,
        keyPrefix: row.key_prefix,
        maskedKey: row.key_prefix,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
      }));
    } finally {
      raw.close();
    }
  }

  /**
   * Alias for listApiKeys
   */
  listKeys(userId?: string): SaasApiKey[] {
    return this.listApiKeys(userId);
  }

  /**
   * Soft-revoke an API key by setting is_active = 0.
   */
  revokeApiKey(id: string): { success: boolean; id: string } {
    const { raw } = getSaasDb();
    try {
      const result = raw
        .prepare('UPDATE saas_api_keys SET is_active = 0 WHERE id = ?')
        .run(id);

      if (result.changes === 0) {
        throw new Error(`API key '${id}' not found`);
      }

      logger.info(`[SaaS Engine] Revoked API key '${id}'`);
      return { success: true, id };
    } finally {
      raw.close();
    }
  }

  /**
   * Alias for revokeApiKey
   */
  revokeKey(id: string): { success: boolean; id: string } {
    return this.revokeApiKey(id);
  }

  /**
   * Validate client bearer token against active API keys.
   * If valid, updates lastUsedAt and returns associated user and key info.
   */
  validateApiKey(token: string): ValidateApiKeyResult {
    if (!token || typeof token !== 'string') {
      return { valid: false };
    }

    const trimmed = token.trim();
    const keyHash = crypto.createHash('sha256').update(trimmed).digest('hex');

    const { raw } = getSaasDb();
    try {
      const keyRow = raw
        .prepare(`
          SELECT id, user_id, key_prefix, label, is_active, created_at
          FROM saas_api_keys
          WHERE key_hash = ? AND is_active = 1
        `)
        .get(keyHash) as
        | {
            id: string;
            user_id: string;
            key_prefix: string;
            label: string;
            is_active: number;
            created_at: number;
          }
        | undefined;

      if (!keyRow) {
        return { valid: false };
      }

      const now = Date.now();
      raw.prepare('UPDATE saas_api_keys SET last_used_at = ? WHERE id = ?').run(now, keyRow.id);

      const userRow = raw
        .prepare('SELECT id, email, balance_usd, created_at FROM saas_users WHERE id = ?')
        .get(keyRow.user_id) as
        | { id: string; email: string; balance_usd: number; created_at: number }
        | undefined;

      if (!userRow) {
        return { valid: false };
      }

      const balance = Number(userRow.balance_usd);
      return {
        valid: true,
        user: {
          id: userRow.id,
          email: userRow.email,
          name: 'Antigravity Developer',
          balance,
          balanceUsd: balance,
          currency: 'USD',
          tier: 'Pro',
          createdAt: userRow.created_at,
        },
        apiKey: {
          id: keyRow.id,
          label: keyRow.label,
          keyPrefix: keyRow.key_prefix,
          createdAt: keyRow.created_at,
        },
      };
    } finally {
      raw.close();
    }
  }

  /**
   * Record usage log entry and deduct consumed cost from user balance.
   */
  recordUsage(input: RecordUsageInput): SaasUsageLog {
    const id = crypto.randomUUID();
    const now = Date.now();
    const totalTokens = input.promptTokens + input.completionTokens;
    const costUsd = Math.max(0, input.costUsd);
    const status = input.status ?? 'success';
    const latencyMs = input.latencyMs ?? 500;

    const { raw } = getSaasDb();
    try {
      const transaction = raw.transaction(() => {
        raw
          .prepare(`
            INSERT INTO saas_usage_logs (
              id, user_id, api_key_id, model, prompt_tokens,
              completion_tokens, total_tokens, cost_usd, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            id,
            input.userId,
            input.apiKeyId ?? null,
            input.model,
            input.promptTokens,
            input.completionTokens,
            totalTokens,
            costUsd,
            now,
          );

        raw
          .prepare('UPDATE saas_users SET balance_usd = balance_usd - ? WHERE id = ?')
          .run(costUsd, input.userId);
      });

      transaction();

      logger.info(
        `[SaaS Metering] User ${input.userId} used ${totalTokens} tokens on ${input.model} (-$${costUsd.toFixed(6)})`,
      );

      return {
        id,
        userId: input.userId,
        apiKeyId: input.apiKeyId ?? null,
        timestamp: new Date(now).toISOString(),
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens,
        cost: costUsd,
        costUsd,
        status,
        latencyMs,
        createdAt: now,
      };
    } finally {
      raw.close();
    }
  }

  /**
   * Get latest usage logs.
   */
  getUsageLogs(limit = 50, userId?: string): SaasUsageLog[] {
    const safeLimit = Math.max(1, Math.min(500, limit));
    const { raw } = getSaasDb();
    try {
      let rows: Array<{
        id: string;
        user_id: string;
        api_key_id: string | null;
        model: string;
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        cost_usd: number;
        created_at: number;
      }>;

      if (userId) {
        rows = raw
          .prepare(`
            SELECT id, user_id, api_key_id, model, prompt_tokens,
                   completion_tokens, total_tokens, cost_usd, created_at
            FROM saas_usage_logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
          `)
          .all(userId, safeLimit) as typeof rows;
      } else {
        rows = raw
          .prepare(`
            SELECT id, user_id, api_key_id, model, prompt_tokens,
                   completion_tokens, total_tokens, cost_usd, created_at
            FROM saas_usage_logs
            ORDER BY created_at DESC
            LIMIT ?
          `)
          .all(safeLimit) as typeof rows;
      }

      return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        apiKeyId: r.api_key_id,
        timestamp: new Date(r.created_at).toISOString(),
        model: r.model,
        promptTokens: r.prompt_tokens,
        completionTokens: r.completion_tokens,
        totalTokens: r.total_tokens,
        cost: Number(r.cost_usd),
        costUsd: Number(r.cost_usd),
        status: 'success',
        latencyMs: 450,
        createdAt: r.created_at,
      }));
    } finally {
      raw.close();
    }
  }

  /**
   * Return model catalog with context length and pricing metadata.
   */
  getModelCatalog(): SaasModelCatalogItem[] {
    return [...MODEL_CATALOG];
  }

  /**
   * Alias for getModelCatalog
   */
  getModels(): ModelInfo[] {
    return this.getModelCatalog();
  }

  /**
   * Calculate cost for a given model based on prompt and completion token counts.
   */
  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const item = MODEL_CATALOG.find(
      (m) =>
        m.id.toLowerCase() === model.toLowerCase() ||
        model.toLowerCase().endsWith(m.id.toLowerCase()),
    );

    if (!item) {
      return promptTokens * 0.0000005 + completionTokens * 0.000002;
    }

    return (
      promptTokens * item.pricing.promptPerToken +
      completionTokens * item.pricing.completionPerToken
    );
  }
}

export const saasService = new SaasService();
