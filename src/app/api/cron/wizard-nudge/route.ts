/**
 * /api/cron/wizard-nudge — WS14 PR2 wizard step granularity.
 *
 * Emits a `wizard_incomplete` consumer notification for any user whose
 * family_setup_completed_at IS NULL and who hasn't had a nudge in the
 * last 7 days. Uses real wizard progress (persona-aware step count +
 * persona-aware body copy) instead of the previous hardcoded "2 of 5"
 * placeholder.
 *
 * Runs at 13:00 UTC daily (= 08:00 CT). Delegates to the same logic as
 * scripts/cron-wizard-nudge.mjs. Cron secret-gated via Vercel env var
 * CRON_SECRET (per Vercel cron convention).
 *
 * Auth: requires header `Authorization: Bearer $CRON_SECRET`. Returns 401 if
 * missing or wrong.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { loadWizardProgress, wizardIncompleteBody } from '@/lib/wizardState';

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

  // Find candidates: any user with family_setup_completed_at IS NULL.
  // Previously filtered on account_type='parent' (PR #76 workaround for
  // parent-flavored copy). Persona-aware copy now handles all personas,
  // so the filter is dropped.
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, created_at, family_setup_completed_at')
    .is('family_setup_completed_at', null)
    .limit(1000);

  if (error) {
    console.error('[api/cron/wizard-nudge] profiles read failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, inserted: 0, skipped: 0 });
  }

  const userIds = profiles.map((p) => p.user_id);
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

  const recentlyNudged = new Set((recent || []).map((r) => r.user_id));
  const candidates = profiles.filter((p) => !recentlyNudged.has(p.user_id));

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

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

      // Load real wizard progress (persona + stepCount + totalSteps).
      // identityVerified=false is conservative — the wizard counts it as done
      // only when the session flag is set server-side, which we can't check
      // here cheaply. Users who verified see 1 fewer step; that's fine.
      const progress = await loadWizardProgress(p.user_id);

      const { error: insErr } = await supabaseAdmin.from('consumer_notifications').insert({
        user_id: p.user_id,
        kind: 'wizard_incomplete',
        source_key: 'wizard_incomplete:nightly',
        player_id: null,
        title: 'Finish your Hockey Passport setup',
        body: wizardIncompleteBody(progress.persona, progress.stepCount, progress.totalSteps),
        metadata: {
          action_url: '/dashboard',
          action_label: 'Resume wizard',
          step_count: progress.stepCount,
          total_steps: progress.totalSteps,
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
