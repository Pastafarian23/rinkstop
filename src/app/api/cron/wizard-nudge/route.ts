/**
 * /api/cron/wizard-nudge — Vercel cron entry point for WS14 PR1 wizard nudges.
 *
 * Runs at 13:00 UTC daily (= 08:00 CT). Delegates to the same logic as
 * scripts/cron-wizard-nudge.mjs. Cron secret-gated via Vercel env var
 * CRON_SECRET (per Vercel cron convention).
 *
 * Auth: requires header `Authorization: Bearer $CRON_SECRET`. Returns 401 if
 * missing or wrong.
 *
 * The runtime path is identical to the .mjs version; this file exists so the
 * Vercel cron can call it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SNOOZE_WINDOW_DAYS = 7;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[api/cron/wizard-nudge] starting at', new Date().toISOString());

  // Same logic as the .mjs file. Kept inline to avoid a runtime module
  // boundary between the script + the API.
  //
  // Account-type filter (2026-07-31): only nudge users who have
  // 'parent' as one of their account_types. The wizard copy is parent-flavored
  // ("kid profile linking", "home-rink claim for your child") and makes no
  // sense for coaches/users without a child player. Per Arnel's request after
  // seeing the parent role on his own coach-only account — the `parent` role
  // was a test artifact, but the cron was picking him up anyway.
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, created_at, family_setup_completed_at, profile_account_types!inner(account_type)')
    .is('family_setup_completed_at', null)
    .eq('profile_account_types.account_type', 'parent')
    .limit(1000);

  if (error) {
    console.error('[api/cron/wizard-nudge] profiles read failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, inserted: 0, skipped: 0 });
  }

  const userIds = profiles.map(p => p.user_id);
  const snoozeCutoff = new Date(
    Date.now() - SNOOZE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: recent } = await supabaseAdmin
    .from('consumer_notifications')
    .select('user_id')
    .eq('kind', 'wizard_incomplete')
    .in('user_id', userIds)
    .gt('created_at', snoozeCutoff)
    .is('snooze_until', null);

  const recentlyNudged = new Set((recent || []).map(r => r.user_id));
  const candidates = profiles.filter(p => !recentlyNudged.has(p.user_id));

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  const stepCount = 2;
  const totalSteps = 5;

  for (const p of candidates) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('consumer_notifications')
        .select('id, read_at')
        .eq('user_id', p.user_id)
        .eq('kind', 'wizard_incomplete')
        .eq('source_key', 'wizard_incomplete:nightly')
        .maybeSingle();

      if (existing && !existing.read_at) {
        skipped++;
        continue;
      }
      if (existing) {
        await supabaseAdmin.from('consumer_notifications').delete().eq('id', existing.id);
      }

      const { error: insErr } = await supabaseAdmin.from('consumer_notifications').insert({
        user_id: p.user_id,
        kind: 'wizard_incomplete',
        source_key: 'wizard_incomplete:nightly',
        player_id: null,
        title: 'Finish your Hockey Passport setup',
        body: `You're ${stepCount} of ${totalSteps} steps in. Completing the wizard unlocks your home-rink claim, kid profile linking, and team roster.`,
        metadata: {
          action_url: '/dashboard',
          action_label: 'Resume wizard',
          step_count: stepCount,
          total_steps: totalSteps,
        },
        snooze_until: null,
      } as any);

      if (insErr) {
        if (insErr.code === '23505') {
          skipped++;
          continue;
        }
        console.error('[api/cron/wizard-nudge] insert failed for', p.user_id, insErr);
        failed++;
        continue;
      }
      inserted++;
    } catch (err) {
      console.error('[api/cron/wizard-nudge] unexpected for', p.user_id, err);
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    inserted,
    skipped,
    failed,
  });
}
