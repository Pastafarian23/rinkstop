#!/usr/bin/env node
/**
 * One-time cleanup: delete per-tier duplicate identity_verify_recommended
 * notifications created before the source_key dedup fix (PR #179, 2026-08-31).
 *
 * Bug: `emitIdentityVerifyRecommended(userId, benefitKey, benefitLabel)` used
 * `sourceKey = verify_recommended:${benefitKey}`, so each tier click on
 * /pricing created a separate row. UNIQUE (user_id, source_key, kind) couldn't
 * dedupe across tiers.
 *
 * Fix: sourceKey is now fixed at `verify_recommended:any_benefit` so all
 * identity-verify recommendations per user collapse to one row.
 *
 * Cleanup: keep the OLDEST `identity_verify_recommended` row per user (the
 * most relevant to them — created first), delete the rest.
 *
 * Run with: node scripts/cleanup-duplicate-identity-verify-notifications.mjs
 *
 * ARNEL-APPROVED ONLY. This deletes user notifications. After running, the
 * user will see only one notification (or zero, if they already read or
 * dismissed one).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // 1. Find all identity_verify_recommended rows, grouped by user_id.
  const { data: rows, error } = await supabase
    .from('consumer_notifications')
    .select('id, user_id, kind, source_key, created_at, read_at, snooze_until')
    .eq('kind', 'identity_verify_recommended')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('select failed:', error);
    process.exit(1);
  }

  // 2. Group by user_id. Keep the oldest, delete the rest.
  const byUser = new Map();
  for (const r of rows || []) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id).push(r);
  }

  const toDelete = [];
  let kept = 0;
  for (const [userId, userRows] of byUser) {
    // Prefer: read_or_snoozed > unread. If any row is read or snoozed, keep
    // that one (the user has interacted with the recommendation before).
    // Otherwise keep the oldest.
    const interacted = userRows.find(
      (r) => r.read_at !== null || r.snooze_until !== null
    );
    const keeper = interacted || userRows[0];
    kept++;
    for (const r of userRows) {
      if (r.id !== keeper.id) toDelete.push(r.id);
    }
  }

  console.log(`Users with duplicates: ${byUser.size}`);
  console.log(`Rows to keep (1 per user): ${kept}`);
  console.log(`Rows to delete: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  // 3. Delete in batches of 100 to avoid hitting row-size limits.
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const { error: delErr } = await supabase
      .from('consumer_notifications')
      .delete()
      .in('id', batch);
    if (delErr) {
      console.error(`delete batch ${i} failed:`, delErr);
      process.exit(1);
    }
    deleted += batch.length;
    console.log(`  deleted ${deleted}/${toDelete.length}`);
  }

  console.log(`Done. ${deleted} duplicate notifications removed.`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});