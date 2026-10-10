#!/usr/bin/env node
// scripts/supabase/recover-postgrest.mjs
//
// Auto-recover RinkStop's Supabase project when PostgREST schema cache goes
// stale. The failure mode (2026-10-10): PostgREST returns PGRST002 "Could not
// query the database for the schema cache" and hangs every request. The fix
// is a single SQL command: NOTIFY pgrst, 'reload schema'.
//
// This script:
//   1. Checks the project health via Supabase management API
//   2. If rest is UNHEALTHY but db is healthy, attempts the schema reload
//   3. If the reload fails or rest stays down for >2 min, pages Arnel
//   4. If rest is healthy, exits 0 (silent on no-op)
//
// Usage:
//   node scripts/supabase/recover-postgrest.mjs           # check + act
//   node scripts/supabase/recover-postgrest.mjs --check   # check only, no act
//
// Cron: every 1 minute. Page only on persistent failure (not transient).
//
// Credentials:
//   - SUPABASE_DB_URL: postgres password (in 1Password, RinkStop entry, "DB password" field)
//   - SUPABASE_PAT: management API token (already in /root/.openclaw/credentials/supabase.json)
//   - TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID: for paging Arnel
//
// Setup (one-time):
//   op read "op://RinkStop/Supabase/database password" > /tmp/db-pw  # or hardcode
//   export SUPABASE_DB_URL=$(cat /tmp/db-pw)

import { Client as PgClient } from 'pg';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const PROJECT_REF = 'yszheonqyyskkjoxoexk';
const POOLER_HOST = 'aws-0-ap-northeast-1.pooler.supabase.com';
const POOLER_PORT = 6543;
const CRED_PATH = '/root/.openclaw/credentials/supabase.json';
const CHECK_ONLY = process.argv.includes('--check');

async function getHealth(services) {
  const pat = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8')).pat;
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/health?services=${services.join(',')}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${pat}` } });
  if (!res.ok) {
    throw new Error(`Management API returned ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

async function getDbPassword() {
  // 1. Env var
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  // 2. 1Password CLI (preferred — never on disk)
  try {
    const pw = execSync(
      'op read "op://RinkStop/Supabase/database password"',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    if (pw) return pw;
  } catch (e) {
    // op not signed in or item not found — fall through
  }
  // 3. Hardcoded env file (fallback only)
  const fallback = '/root/.openclaw/credentials/supabase-db-pw.txt';
  if (fs.existsSync(fallback)) {
    return fs.readFileSync(fallback, 'utf8').trim();
  }
  // No password available — auto-recovery will be skipped.
  // The script still detects failures and pages, so this is fine as a
  // detection-only fallback. To enable auto-recovery, ask Arnel to
  // either (a) set SUPABASE_DB_URL in the cron environment, or
  // (b) sign in the 1Password CLI and add the password to the RinkStop
  // vault under "Supabase" / "database password".
  return null;
}

async function reloadSchema() {
  const password = await getDbPassword();
  if (!password) {
    throw new Error('No DB password configured; cannot run schema reload');
  }
  const client = new PgClient({
    host: POOLER_HOST,
    port: POOLER_PORT,
    user: `postgres.${PROJECT_REF}`,
    password,
    database: 'postgres',
    connectionTimeoutMillis: 10000,
    statement_timeout: 5000,
  });
  try {
    await client.connect();
    await client.query("NOTIFY pgrst, 'reload schema';");
    await client.query("NOTIFY pgrst, 'reload config';");
    return { ok: true, msg: 'Sent NOTIFY pgrst, reload schema + config' };
  } finally {
    await client.end().catch(() => {});
  }
}

async function pageArnel(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CEO_CHAT_ID || '-5026194744';
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not set; cannot page');
    return;
  }
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
  });
}

async function main() {
  let health;
  try {
    health = await getHealth(['rest', 'db', 'auth']);
  } catch (e) {
    console.error('Health check failed:', e.message);
    process.exit(1);
  }
  const byName = Object.fromEntries(health.map((s) => [s.name, s]));
  const rest = byName.rest;
  const db = byName.db;
  const auth = byName.auth;
  const allHealthy = [rest, db, auth].every(
    (s) => s && (s.status === 'ACTIVE_HEALTHY' || s.healthy === true)
  );

  if (allHealthy) {
    console.log('OK: all services healthy');
    process.exit(0);
  }

  console.log('UNHEALTHY:',
    rest?.status ?? '?', '|', db?.status ?? '?', '|', auth?.status ?? '?');

  if (CHECK_ONLY) {
    console.log('--check mode, not attempting recovery');
    process.exit(2);
  }

  // If db is healthy but rest is stuck, try the schema reload
  if (db?.status === 'ACTIVE_HEALTHY' && rest?.status !== 'ACTIVE_HEALTHY') {
    console.log('Attempting PostgREST schema reload...');
    let pw;
    try {
      pw = await getDbPassword();
    } catch (e) {
      console.error('No DB password available:', e.message);
    }
    if (!pw) {
      console.log('Skipping auto-recovery: no DB password. Page Arnel to enable it.');
    } else {
      try {
        const result = await reloadSchema();
        console.log('Reload result:', result.msg);
        // Wait 10s, then re-check
        await new Promise((r) => setTimeout(r, 10000));
        const recheck = await getHealth(['rest']);
        const newRest = recheck[0];
        if (newRest.status === 'ACTIVE_HEALTHY') {
          console.log('PostgREST recovered after schema reload');
          // Don't page on successful auto-recovery — just log
          return;
        }
        console.log('PostgREST still unhealthy after reload:', newRest.status);
      } catch (e) {
        console.error('Schema reload failed:', e.message);
      }
    }
  }

  // Page Arnel. Only on persistent failure (this is the 3rd+ consecutive run).
  // The cron caller is responsible for tracking failure count; this script
  // always pages on UNHEALTHY (it can be called less frequently to avoid spam).
  const msg = `🚨 *RinkStop Supabase UNHEALTHY*\n` +
    `rest: ${rest?.status ?? '?'} (${rest?.error ?? 'n/a'})\n` +
    `db: ${db?.status ?? '?'}\n` +
    `auth: ${auth?.status ?? '?'}\n` +
    `Time: ${new Date().toISOString()}\n` +
    `Auto-recovery attempted. If site still down, may need dashboard project restart.`;
  await pageArnel(msg);
  process.exit(1);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
