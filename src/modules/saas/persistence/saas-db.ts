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
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL NOT NULL DEFAULT 0.0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES saas_users(id) ON DELETE CASCADE,
        FOREIGN KEY (api_key_id) REFERENCES saas_api_keys(id) ON DELETE SET NULL
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
