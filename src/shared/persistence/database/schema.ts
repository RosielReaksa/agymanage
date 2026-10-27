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
  requestId: text('request_id'),
  provider: text('provider').default('antigravity'),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  priceUsd: real('price_usd').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  statusCode: integer('status_code').notNull().default(200),
  cached: integer('cached').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const saasProviders = sqliteTable('saas_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  label: text('label').notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key'),
  priority: integer('priority').notNull().default(100),
  isFreeTier: integer('is_free_tier').notNull().default(0),
  monthlyCapUsd: real('monthly_cap_usd'),
  rpmLimit: integer('rpm_limit'),
  isActive: integer('is_active').notNull().default(1),
  paused: integer('paused').notNull().default(0),
  pausedReason: text('paused_reason'),
  healthStatus: text('health_status').notNull().default('healthy'),
  lastLatencyMs: integer('last_latency_ms'),
  lastCheckedAt: integer('last_checked_at'),
  createdAt: integer('created_at').notNull(),
});

export const saasRoutingRules = sqliteTable('saas_routing_rules', {
  id: text('id').primaryKey(),
  position: integer('position').notNull().default(0),
  conditionJson: text('condition_json').notNull().default('{}'),
  actionJson: text('action_json').notNull().default('{}'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull(),
});

export const saasRoutingConfig = sqliteTable('saas_routing_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const saasMaintenanceState = sqliteTable('saas_maintenance_state', {
  id: text('id').primaryKey(),
  globalActive: integer('global_active').notNull().default(0),
  globalMessage: text('global_message'),
  globalStartedAt: integer('global_started_at'),
  globalExpectedEnd: integer('global_expected_end'),
  globalAllowIps: text('global_allow_ips'),
  degradedActive: integer('degraded_active').notNull().default(0),
  degradedPaidOnly: integer('degraded_paid_only').notNull().default(0),
  degradedFreeOnly: integer('degraded_free_only').notNull().default(0),
  degradedReducePct: integer('degraded_reduce_pct').notNull().default(0),
  degradedMaxTokens: integer('degraded_max_tokens'),
  updatedAt: integer('updated_at').notNull(),
});

export const saasMaintenanceWindows = sqliteTable('saas_maintenance_windows', {
  id: text('id').primaryKey(),
  startsAt: integer('starts_at').notNull(),
  endsAt: integer('ends_at').notNull(),
  bannerText: text('banner_text').notNull(),
  autoEnable: integer('auto_enable').notNull().default(0),
  status: text('status').notNull().default('scheduled'),
  createdAt: integer('created_at').notNull(),
});

export const saasMaintenanceHistory = sqliteTable('saas_maintenance_history', {
  id: text('id').primaryKey(),
  level: text('level').notNull(),
  target: text('target'),
  action: text('action').notNull(),
  reason: text('reason'),
  createdAt: integer('created_at').notNull(),
});
