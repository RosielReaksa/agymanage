import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getCloudAccountsDbPath } from '@/shared/platform/paths';
import { logger } from '@/shared/logging/logger';
import {
  configureDatabase,
  openDrizzleConnection,
  type DrizzleConnection,
} from '@/shared/persistence/database/dbConnection';

export const SAAS_DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
export const SAAS_DEFAULT_USER_EMAIL = 'default-user@antigravity.local';
export const SAAS_DEFAULT_USER_BALANCE = 25.0;

export function ensureSaasTables(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS saas_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        balance_usd REAL NOT NULL DEFAULT 0.0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saas_api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        partner_id TEXT,
        key_hash TEXT UNIQUE NOT NULL,
        key_prefix TEXT NOT NULL,
        label TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES saas_users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS saas_partners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        monthly_spend_cap REAL NOT NULL DEFAULT 100.0,
        current_month_spend REAL NOT NULL DEFAULT 0.0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saas_access_requests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        organization TEXT,
        use_case TEXT,
        estimated_volume TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saas_usage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        api_key_id TEXT,
        request_id TEXT,
        provider TEXT DEFAULT 'antigravity',
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL NOT NULL DEFAULT 0.0,
        price_usd REAL NOT NULL DEFAULT 0.0,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        status_code INTEGER NOT NULL DEFAULT 200,
        cached INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES saas_users(id) ON DELETE CASCADE,
        FOREIGN KEY (api_key_id) REFERENCES saas_api_keys(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS saas_providers (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT,
        priority INTEGER NOT NULL DEFAULT 100,
        is_free_tier INTEGER NOT NULL DEFAULT 0,
        monthly_cap_usd REAL,
        rpm_limit INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        paused INTEGER NOT NULL DEFAULT 0,
        paused_reason TEXT,
        health_status TEXT NOT NULL DEFAULT 'healthy',
        last_latency_ms INTEGER,
        last_checked_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saas_routing_rules (
        id TEXT PRIMARY KEY,
        position INTEGER NOT NULL DEFAULT 0,
        condition_json TEXT NOT NULL DEFAULT '{}',
        action_json TEXT NOT NULL DEFAULT '{}',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saas_routing_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saas_maintenance_state (
        id TEXT PRIMARY KEY,
        global_active INTEGER NOT NULL DEFAULT 0,
        global_message TEXT,
        global_started_at INTEGER,
        global_expected_end INTEGER,
        global_allow_ips TEXT,
        degraded_active INTEGER NOT NULL DEFAULT 0,
        degraded_paid_only INTEGER NOT NULL DEFAULT 0,
        degraded_free_only INTEGER NOT NULL DEFAULT 0,
        degraded_reduce_pct INTEGER NOT NULL DEFAULT 0,
        degraded_max_tokens INTEGER,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saas_maintenance_windows (
        id TEXT PRIMARY KEY,
        starts_at INTEGER NOT NULL,
        ends_at INTEGER NOT NULL,
        banner_text TEXT NOT NULL,
        auto_enable INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'scheduled',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saas_maintenance_history (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        target TEXT,
        action TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_saas_api_keys_hash ON saas_api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_saas_api_keys_user ON saas_api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_saas_usage_logs_user ON saas_usage_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_saas_usage_logs_created ON saas_usage_logs(created_at);
    `);

    try {
      db.exec('ALTER TABLE saas_api_keys ADD COLUMN partner_id TEXT;');
    } catch {
      // Column already exists
    }

    try {
      db.exec('ALTER TABLE saas_usage_logs ADD COLUMN request_id TEXT;');
    } catch {
      // Column exists
    }
    try {
      db.exec('ALTER TABLE saas_usage_logs ADD COLUMN provider TEXT DEFAULT "antigravity";');
    } catch {
      // Column exists
    }
    try {
      db.exec('ALTER TABLE saas_usage_logs ADD COLUMN price_usd REAL DEFAULT 0.0;');
    } catch {
      // Column exists
    }
    try {
      db.exec('ALTER TABLE saas_usage_logs ADD COLUMN latency_ms INTEGER DEFAULT 0;');
    } catch {
      // Column exists
    }
    try {
      db.exec('ALTER TABLE saas_usage_logs ADD COLUMN status_code INTEGER DEFAULT 200;');
    } catch {
      // Column exists
    }
    try {
      db.exec('ALTER TABLE saas_usage_logs ADD COLUMN cached INTEGER DEFAULT 0;');
    } catch {
      // Column exists
    }

    try {
      db.exec('CREATE INDEX IF NOT EXISTS idx_saas_usage_logs_req ON saas_usage_logs(request_id);');
    } catch {
      // Ignore
    }

    // Initialize maintenance state row 1 if missing
    const maint = db.prepare('SELECT id FROM saas_maintenance_state WHERE id = ?').get('1');
    if (!maint) {
      db.prepare(`
        INSERT INTO saas_maintenance_state (
          id, global_active, global_message, degraded_active, degraded_paid_only,
          degraded_free_only, degraded_reduce_pct, degraded_max_tokens, updated_at
        ) VALUES ('1', 0, 'We are upgrading our gateway cluster. Back online shortly.', 0, 0, 0, 0, 2000, ?)
      `).run(Date.now());
    }

    // Seed default providers if none exist
    const providerCount = (db.prepare('SELECT COUNT(*) as count FROM saas_providers').get() as { count: number }).count;
    if (providerCount === 0) {
      const now = Date.now();
      const insert = db.prepare(`
        INSERT INTO saas_providers (
          id, name, label, base_url, api_key, priority, is_free_tier,
          monthly_cap_usd, rpm_limit, is_active, paused, health_status, last_latency_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'healthy', ?, ?)
      `);

      insert.run('1', 'gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', '', 10, 0, 500, 300, 185, now);
      insert.run('2', 'groq', 'Groq LPU', 'https://api.groq.com/openai/v1', '', 20, 0, 250, 1000, 95, now);
      insert.run('3', 'openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', '', 30, 0, 500, 200, 320, now);
      insert.run('4', 'deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', '', 40, 0, 300, 150, 410, now);
      insert.run('5', 'together', 'Together AI', 'https://api.together.xyz/v1', '', 50, 0, 300, 120, 290, now);
      insert.run('6', 'openai', 'OpenAI', 'https://api.openai.com/v1', '', 60, 0, 1000, 500, 240, now);
    }

    const existingUser = db
      .prepare('SELECT id FROM saas_users WHERE email = ?')
      .get(SAAS_DEFAULT_USER_EMAIL);

    if (!existingUser) {
      db.prepare(`
        INSERT INTO saas_users (id, email, balance_usd, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        SAAS_DEFAULT_USER_ID,
        SAAS_DEFAULT_USER_EMAIL,
        SAAS_DEFAULT_USER_BALANCE,
        Date.now(),
      );
      logger.info(
        `[SaaS Engine] Seeded default user ${SAAS_DEFAULT_USER_EMAIL} with balance $${SAAS_DEFAULT_USER_BALANCE.toFixed(6)}`,
      );
    }
  } catch (error) {
    logger.error('[SaaS Engine] Failed to initialize SaaS database tables', error);
    throw error;
  }
}

export function getSaasDb(): DrizzleConnection {
  const dbPath = getCloudAccountsDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const conn = openDrizzleConnection(
    dbPath,
    { readonly: false, fileMustExist: false },
    { busyTimeoutMs: 3000 },
  );

  ensureSaasTables(conn.raw);
  return conn;
}
