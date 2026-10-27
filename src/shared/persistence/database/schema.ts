import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  tokenJson: text('token_json').notNull(),
  quotaJson: text('quota_json'),
  healthJson: text('health_json'),
  deviceProfileJson: text('device_profile_json'),
  deviceHistoryJson: text('device_history_json'),
  createdAt: integer('created_at').notNull(),
  lastUsed: integer('last_used').notNull(),
  status: text('status', { enum: ['active', 'rate_limited', 'expired'] }).default('active'),
  statusReason: text('status_reason'),
  isActive: integer('is_active').notNull().default(0),
  proxyUrl: text('proxy_url'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const itemTable = sqliteTable('ItemTable', {
  key: text('key').primaryKey(),
  value: text('value'),
});

export const saasUsers = sqliteTable('saas_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  balanceUsd: real('balance_usd').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const saasApiKeys = sqliteTable('saas_api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  partnerId: text('partner_id'),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  label: text('label').notNull(),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  lastUsedAt: integer('last_used_at'),
});

export const saasPartners = sqliteTable('saas_partners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  monthlySpendCap: real('monthly_spend_cap').notNull().default(100.0),
  currentMonthSpend: real('current_month_spend').notNull().default(0.0),
  createdAt: integer('created_at').notNull(),
});

export const saasAccessRequests = sqliteTable('saas_access_requests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  organization: text('organization'),
  useCase: text('use_case'),
  estimatedVolume: text('estimated_volume'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
});

export const saasUsageLogs = sqliteTable('saas_usage_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  apiKeyId: text('api_key_id'),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});
