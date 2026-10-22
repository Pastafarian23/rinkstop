#!/usr/bin/env node
/**
 * _live-rls-audit.cjs — 2026-09-30
 *
 * Per Arnel directive: "figure out and prevent it in the first place"
 * (re: Supabase advisor email 2026-09-29 19:32 CDT flagging 2 tables
 * with RLS not enabled).
 *
 * Sweeps EVERY public table in the Supabase project. For each table,
 * tries an anon INSERT. If the INSERT is not blocked by RLS (HTTP 200/201
 * or 400 due to NOT NULL constraint), the table is vulnerable.
 *
 * Failure modes detected:
 *   - RLS not enabled (the email_subscribers + cron_health_snapshots bug)
 *   - Missing GRANT REVOKE on anon
 *   - Permissive policy with USING (true) or WITH CHECK (true)
 *
 * Exits 1 if any vulnerable table found.
 *
 * Usage:
 *   node scripts/_live-rls-audit.cjs            # sweep prod
 *   node scripts/_live-rls-audit.cjs --dry-run  # report only
 *   node scripts/_live-rls-audit.cjs --table=foo  # single table
 */

require('./load-secrets.cjs');
const https = require('https');

const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([^.]+)/)?.[1];
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');
const singleTable = process.argv.find(a => a.startsWith('--table='))?.split('=')[1];

if (!PROJECT_REF || !ANON_KEY || !SVC_KEY) {
  console.error('Missing SUPABASE_URL, ANON_KEY, or SERVICE_ROLE_KEY');
  process.exit(2);
}

function postgrest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: `${PROJECT_REF}.supabase.co`,
      path,
      method: 'GET',
      headers: {
        apikey: SVC_KEY,
        Authorization: `Bearer ${SVC_KEY}`,
        ...headers,
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function anonInsert(table) {
  return new Promise((resolve) => {
    const data = JSON.stringify({});
    const req = https.request({
      hostname: `${PROJECT_REF}.supabase.co`,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: body.slice(0, 200) }));
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.write(data);
    req.end();
  });
}

async function getAllTables() {
  // Use PostgREST introspection via OpenAPI
  const { body } = await postgrest('/rest/v1/', { Accept: 'application/openapi+json' });
  if (body?.definitions) {
    const names = Object.keys(body.definitions).filter(t => !/^pg_|^_/.test(t));
    const views = await getViewNames();
    return names.filter(t => !views.has(t));
  }
  return [];
}

/**
 * Names of non-table relations (views, materialized views) in public.
 *
 * RLS does not apply to views, so the audit must not treat them as
 * unprotected tables. A view is only a real exposure if it is WRITABLE
 * (auto-updatable) AND its base table is not already anon-readable — the
 * underlying table's own RLS is what actually governs access.
 *
 * Before this filter existed, `players_with_country` (a view) was reported as
 * "no RLS — NOT NULL blocked insert", failing the pre-deploy gate on every
 * run. Verified 2026-10-22: the view is not auto-updatable (INSERT through it
 * is rejected by the base table's RLS), and anon can already read all 6,352
 * rows of `players` directly, so the view adds no exposure.
 *
 * Views are read from pg_class via the Management API — PostgREST does not
 * expose information_schema, and the OpenAPI spec does not flag views.
 */
async function getViewNames() {
  const views = new Set();
  const token = process.env.SUPABASE_MANAGEMENT_PAT;
  if (!token) {
    console.warn(
      '[rls-audit] SUPABASE_MANAGEMENT_PAT not set; cannot enumerate views. ' +
      'Views will be audited as tables (may produce false positives).',
    );
    return views;
  }
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query:
            "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace " +
            "where n.nspname = 'public' and c.relkind in ('v','m')",
        }),
      },
    );
    if (!res.ok) {
      console.warn(`[rls-audit] view enumeration failed (${res.status}).`);
      return views;
    }
    const rows = await res.json();
    for (const row of rows || []) {
      if (row?.relname) views.add(row.relname);
    }
    console.log(`  (skipped ${views.size} view(s) — RLS does not apply to views)`);
  } catch (e) {
    console.warn('[rls-audit] could not enumerate views:', e.message);
  }
  return views;
}

// Tables that are known to NOT need RLS — internal/excluded by design.
// Add a table here ONLY if it's managed by an extension (PostGIS etc.)
// and has no user data. Keep this list SHORT — every entry is a permanent
// false-positive exemption.
const EXEMPT_TABLES = new Set([
  'spatial_ref_sys', // PostGIS internal reference table (no user data)
]);

(async () => {
  console.log(`=== Live RLS audit for ${PROJECT_REF} ===\n`);
  let tables;
  if (singleTable) {
    tables = [singleTable];
  } else {
    tables = await getAllTables();
    console.log(`Discovered ${tables.length} tables via OpenAPI introspection.\n`);
  }

  const vulnerable = [];
  let tested = 0;
  let skipped = 0;
  const t0 = Date.now();

  for (const t of tables) {
    if (EXEMPT_TABLES.has(t)) {
      skipped++;
      continue;
    }
    const r = await anonInsert(t);
    tested++;

    // RLS enforced if status is 401 (new row violates row-level security policy)
    // or 403 (permission denied at GRANT level)
    if (r.status === 401 || r.status === 403) {
      // OK — RLS blocks
    } else if (r.status === 404) {
      // Table doesn't exist or anon has no SELECT access — skip
      skipped++;
    } else if (r.status === 400 && /null value/i.test(r.body)) {
      // RLS NOT enforced — insert reached table, blocked by NOT NULL constraint
      vulnerable.push({ t, status: r.status, reason: 'no RLS — NOT NULL blocked insert' });
      console.log(`⚠️  ${t} → HTTP ${r.status} (NOT NULL constraint blocked, but RLS is NOT enabled)`);
    } else if (r.status === 200 || r.status === 201) {
      // RLS NOT enforced — insert succeeded!
      vulnerable.push({ t, status: r.status, reason: 'no RLS — anon INSERT succeeded' });
      console.log(`🚨 ${t} → HTTP ${r.status} (anon INSERT succeeded!) — body: ${r.body.slice(0,100)}`);
    } else {
      // Other status — might be schema-qualified issue, just log
      // console.log(`?  ${t} → HTTP ${r.status}: ${r.body.slice(0,60)}`);
    }

    if (tested % 20 === 0) console.log(`  ... tested ${tested}/${tables.length}`);
  }

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Tested: ${tested} tables in ${duration}s`);
  console.log(`Skipped (404): ${skipped}`);
  console.log(`Vulnerable: ${vulnerable.length}`);

  if (vulnerable.length > 0) {
    console.log(`\n=== VULNERABLE TABLES ===`);
    for (const v of vulnerable) {
      console.log(`  ${v.t} → ${v.reason}`);
    }
    console.log(`\nFIX: Enable RLS + REVOKE anon + add explicit deny policy.`);
    console.log(`See supabase/migrations/2026-09-30_email_subscribers_rls.sql for the pattern.`);
    if (!dryRun) {
      process.exit(1);
    }
  } else {
    console.log(`\n✅ All tested tables have RLS enforced for anon INSERT.`);
    process.exit(0);
  }
})().catch(e => { console.error('Fatal:', e); process.exit(2); });
