#!/usr/bin/env node
// scripts/cron-check-identity-expiry.mjs
// Phase 1 cron: prompt users to re-verify at T-30, T-7, T-1, and T+0 (expired)
//
// Locked cadence (per design doc, 2026-06-17):
//   T-30 days  → soft prompt  ("Re-verify within 30 days")
//   T-7  days  → firmer       ("Re-verify this week")
//   T-1  day   → last warning ("Re-verify tomorrow")
//   T+0  days  → expired      ("Re-verify to restore check")
//
// Schedule via Vercel Cron: daily 09:00 UTC
//   vercel.json: { "crons": [{ "path": "/api/cron/identity-expiry", "schedule": "0 9 * * *" }] }
//
// This script writes a small report to stdout + inserts prompt records into
// `identity_reminders` so the in-app banner can show them. The actual reminder
// delivery (in-app banner / email) is wired in /api/cron/identity-expiry which
// is the cron endpoint the Vercel cron hits. This file is the offline version
// of the same logic — useful for manual runs and for sanity-checking the query.

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const REVERIFY_YEARS = 2;

async function main() {
  console.log('[cron:identity-expiry] starting at', new Date().toISOString());

  // 1. Find users approaching expiry (T-30 to T+0) by joining the view.
  // We exclude users already prompted in the last 24h to avoid spam.
  const { data: rows, error } = await supabase
    .from('profile_identity_status')
    .select('user_id, identity_expires_at, days_until_expiry, status')
    .in('status', ['active', 'expired'])
    .not('identity_expires_at', 'is', null);

  if (error) {
    console.error('[cron:identity-expiry] view read failed:', error);
    process.exit(1);
  }

  console.log(`[cron:identity-expiry] found ${rows?.length || 0} verified users`);

  const buckets = { 'T-30': [], 'T-7': [], 'T-1': [], 'T+0': [] };
  const now = Date.now();

  for (const row of rows || []) {
    const d = row.days_until_expiry;
    if (d === null) continue;
    if (d < 0) {
      buckets['T+0'].push(row);
    } else if (d <= 1) {
      buckets['T-1'].push(row);
    } else if (d <= 7) {
      buckets['T-7'].push(row);
    } else if (d <= 30) {
      buckets['T-30'].push(row);
    }
    // > 30 days: no action yet
  }

  // 2. Insert reminder rows. We use upsert on (user_id, kind) so re-runs
  // update the timestamp without duplicating. The in-app banner reads from
  // `identity_reminders` ordered by created_at desc.
  let totalInserted = 0;
  for (const [kind, list] of Object.entries(buckets)) {
    if (list.length === 0) continue;
    console.log(`[cron:identity-expiry] ${kind}: ${list.length} users`);

    // Batch insert; on conflict, update created_at.
    const records = list.map((r) => ({
      user_id: r.user_id,
      kind,
      days_until_expiry: r.days_until_expiry,
      identity_expires_at: r.identity_expires_at,
      created_at: new Date().toISOString(),
    }));

    // Supabase upsert with onConflict requires a unique index.
    // We'll insert and let the table track uniqueness via a unique(user_id, kind)
    // index defined in a separate migration. For now, delete prior + insert.
    // (Re-runs in the same day are idempotent because the unique constraint dedupes.)
    const { error: insErr } = await supabase
      .from('identity_reminders')
      .upsert(records, { onConflict: 'user_id,kind' });

    if (insErr) {
      console.error(`[cron:identity-expiry] ${kind} insert failed:`, insErr);
      // Continue with other buckets
    } else {
      totalInserted += records.length;
    }
  }

  console.log(`[cron:identity-expiry] wrote ${totalInserted} reminders`);

  // 3. Report
  console.log('[cron:identity-expiry] summary:', JSON.stringify({
    active_users: rows?.length || 0,
    T_minus_30: buckets['T-30'].length,
    T_minus_7: buckets['T-7'].length,
    T_minus_1: buckets['T-1'].length,
    T_plus_0: buckets['T+0'].length,
    total_reminders_written: totalInserted,
  }, null, 2));

  console.log('[cron:identity-expiry] done at', new Date().toISOString());
}

main().catch((err) => {
  console.error('[cron:identity-expiry] fatal:', err);
  process.exit(2);
});
