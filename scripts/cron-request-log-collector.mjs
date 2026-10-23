#!/usr/bin/env node
// scripts/cron-request-log-collector.mjs
//
// Collects the abuse-forensics records the middleware emits and stores them in
// Supabase `request_logs`.
//
// WHY THIS EXISTS (2026-10-23, Singapore traffic incident)
//
// The Oct 22 scraper (74,971 requests to /directory/nhl/schedule in one day)
// could not be attributed afterwards. Two independent reasons:
//
//   1. Vercel's runtime logs carry NO ip and NO userAgent.
//   2. Vercel's runtime log retention is effectively MINUTES, not days.
//      `vercel logs --since 1h|6h|12h|24h|48h` and even
//      `--since 2026-10-22T00:00:00Z` all return the same newest-first rows
//      whose oldest timestamp is ~4 minutes back.
//
// So we must capture the platform log BEFORE it rolls over, and we must pull
// identity from our own structured stdout lines (the middleware emits a JSON
// line with `ev:"rl"` for tracked paths — see src/lib/request-logger.ts).
//
// HOW IT WORKS
//
//   1. Run `vercel logs --project <id> --since <N>m --limit 50 --json`.
//      (Note: --limit is capped at 50 by the CLI, and --query is IGNORED —
//      filter client-side. Both verified empirically.)
//   2. Find records whose message contains a structured `ev:"rl"` payload.
//   3. Insert them into Supabase request_logs.
//   4. Prune rows older than the retention window (30 days).
//
// DEDUPLICATION
//
// The platform log can repeat the same request across polls, so every insert
// carries a deterministic dedupe key and we skip keys we already stored.
// The key is derived from the platform log id, which is stable per record.

import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const CREDS_PATH = '/root/.openclaw/credentials/vercel.json';
const VERCEL_CREDS = JSON.parse(readFileSync(CREDS_PATH, 'utf8'));

// Retention window for stored forensics rows.
const RETENTION_DAYS = 30;

// How far back to poll. Vercel retention is minutes, so we poll a short window
// to guarantee overlap with the previous run (no gaps).
const SINCE_MINUTES = 10;

// How many times to attempt the vercel CLI before giving up.
const CLI_ATTEMPTS = 3;

function loadSupabaseEnv() {
  const envPath = '/root/.openclaw/workspace/rinkstop-platform/.env';
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // Fall back to whatever is already in the environment.
  }
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    execFile(
      'vercel',
      args,
      {
        env: { ...process.env, VERCEL_TOKEN: VERCEL_CREDS.token },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 120000,
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`vercel CLI failed: ${err.message}\n${(stderr || '').slice(0, 400)}`));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

async function fetchLogs() {
  let lastError = null;
  for (let attempt = 1; attempt <= CLI_ATTEMPTS; attempt++) {
    try {
      const stdout = await runCli([
        'logs',
        '--project',
        VERCEL_CREDS.projectId,
        '--since',
        `${SINCE_MINUTES}m`,
        '--limit',
        '50',
        '--json',
      ]);
      return stdout;
    } catch (e) {
      lastError = e;
      console.error(`[collector] attempt ${attempt}/${CLI_ATTEMPTS} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  throw lastError;
}

/**
 * Pull our structured records out of the platform log.
 *
 * The middleware emits: {"ev":"rl","ts":...,"path":...,"ip":...,"ua":...}
 * as a console.log, so it arrives inside the platform record's `message` field.
 */
function extractStructured(logStdout) {
  const found = [];
  const seen = new Set();

  for (const line of logStdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let rec;
    try {
      rec = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!rec || !rec.message) continue;

    // The structured payload is embedded in the message string.
    const start = rec.message.indexOf('{"ev":"rl"');
    if (start === -1) continue;

    let payload = null;
    // The message may have a prefix like "[middleware] " before the JSON.
    const candidate = rec.message.slice(start);
    // Brace-match to find the end of the JSON object.
    let depth = 0;
    let end = -1;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end === -1) continue;

    try {
      payload = JSON.parse(candidate.slice(0, end));
    } catch {
      continue;
    }
    if (!payload || payload.ev !== 'rl') continue;

    // Dedupe key: the platform log id is stable for a given request record.
    const key = String(rec.id || `${payload.ts}|${payload.path}|${payload.ip}`);
    if (seen.has(key)) continue;
    seen.add(key);

    found.push({
      key,
      // Dedupe signature: epoch-ms timestamp + path + ip. See the note in main()
      // about why the raw ISO strings must not be compared directly.
      dedupeKey: `${new Date(payload.ts || rec.timestamp || Date.now()).getTime()}|${String(payload.path || '/')}|${String(payload.ip || 'unknown')}`,
      occurred_at: payload.ts || new Date(rec.timestamp || Date.now()).toISOString(),
      path: String(payload.path || '/'),
      method: String(payload.method || 'GET'),
      status: Number(payload.status || 0),
      ip: String(payload.ip || 'unknown'),
      user_agent: payload.ua ? String(payload.ua).slice(0, 200) : null,
      duration_ms: Number.isFinite(payload.ms) ? Math.round(payload.ms) : null,
      claimed_bot: Boolean(payload.claimedBot),
      limited: Boolean(payload.limited),
      tier: payload.tier ? String(payload.tier) : null,
    });
  }
  return found;
}

async function main() {
  loadSupabaseEnv();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const stdout = await fetchLogs();
  const records = extractStructured(stdout);

  if (records.length === 0) {
    console.log('[collector] no structured records in the polled window (this is normal when traffic is low)');
  } else {
    // Dedupe against what we already stored: skip rows whose (path, ip, ts)
    // combination already exists within a tight window.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent, error: readErr } = await supabase
      .from('request_logs')
      .select('occurred_at, path, ip')
      .gte('occurred_at', since)
      .limit(5000);
    if (readErr) {
      console.error('[collector] could not read existing rows for dedupe:', readErr.message);
    }

    // Dedupe signature: occurred_at + path + ip.
    //
    // NOTE on formatting: the record's `occurred_at` is an ISO string ending in "Z"
    // ("2026-10-23T18:06:03.256Z") while the value read back from Postgres is
    // normalized to "+00:00". Comparing those two strings directly never matches,
    // which silently disables dedupe and double-inserts every record. Normalise
    // BOTH sides to epoch milliseconds before comparing.
    const normTs = (v) => new Date(v).getTime();
    const existing = new Set(
      (recent || []).map(
        (r) => `${normTs(r.occurred_at)}|${r.path}|${r.ip}`,
      ),
    );

    const toInsert = records
      .filter((r) => !existing.has(r.dedupeKey))
      // `key` and `dedupeKey` are internal handles, not table columns. Strip them.
      .map(({ key, dedupeKey, ...row }) => row);

    if (toInsert.length > 0) {
      const { error } = await supabase.from('request_logs').insert(toInsert);
      if (error) {
        console.error('[collector] insert failed:', error.message);
        process.exit(1);
      }
      console.log(`[collector] inserted ${toInsert.length} forensics rows (${records.length} parsed, ${records.length - toInsert.length} dupes skipped)`);
    } else {
      console.log(`[collector] all ${records.length} parsed records were duplicates`);
    }
  }

  // Prune expired rows.
  const { data: pruned, error: pruneErr } = await supabase.rpc('prune_request_logs', {
    retain_days: RETENTION_DAYS,
  });
  if (pruneErr) {
    console.error('[collector] prune failed (non-fatal):', pruneErr.message);
  } else {
    console.log(`[collector] pruned ${pruned ?? 0} rows older than ${RETENTION_DAYS} days`);
  }
}

main().catch((e) => {
  console.error('[collector] fatal:', e.message);
  process.exit(1);
});
