/**
 * Onboarding notification emitters — WS14 PR1
 *
 * One function per kind, all using the same idempotent insert pattern.
 * Two layers of dedup:
 *   1. UNIQUE (user_id, source_key, kind) — DB-level idempotency.
 *   2. If a row already exists for (user_id, source_key, kind):
 *      - If read_at is null AND snooze_until is null → caller should skip
 *        (already surfaced, user hasn't seen it yet).
 *      - If read_at is set → DELETE the row before INSERT to refresh state
 *        (matches Phase 1b-4 deriver pattern in /api/consumer-notifications POST).
 *
 * For onboarding kinds (welcome, identity_verify_recommended, claim_paid_tier_unlocked,
 * profile_first_visitor), we typically want one-shot behavior. Pass `oneShot: true`
 * to set snooze_until = now() + 365d on insert — the row cannot be re-derived
 * for a year. User can still dismiss it (read_at = now()).
 *
 * For wizard_incomplete: NOT one-shot. The cron emits daily. Snooze is
 * managed by the cron itself (only emits if no unread row exists).
 *
 * Auth model: every function is service-role. Caller (a route handler, a
 * server component, a cron job) has already verified the user.
 *
 * Errors are caught and logged. Notification failures must never break the
 * primary flow that triggered them (e.g., a paid claim email should still
 * arrive even if the in-app notification insert fails).
 */

import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { unstable_cache } from 'next/cache';

const KIND_LABEL: Record<OnboardingKind, string> = {
  signup_welcome: 'signup welcome',
  identity_verify_recommended: 'identity verify recommended',
  wizard_incomplete: 'wizard incomplete',
  claim_paid_tier_unlocked: 'claim paid tier unlocked',
  profile_first_visitor: 'profile first visitor',
};

/**
 * Per-kind email mute preference (WS14 PR2).
 * Reads notification_email_prefs; default muted=false (email ON).
 * Cached 60s per (user, kind) — same hot-path as v_user_visible_certifications.
 *
 * profile_first_visitor never emails regardless of mute (the in-app
 * notification is the only signal — a lurker viewing your profile
 * should never generate an inbox ping for you).
 */
export async function isEmailMuted(userId: string, kind: OnboardingKind): Promise<boolean> {
  if (kind === 'profile_first_visitor') return true;
  const cached = unstable_cache(
    async () => {
      const { data, error } = await supabaseAdmin
        .from('notification_email_prefs')
        .select('muted')
        .eq('user_id', userId)
        .eq('kind', kind)
        .maybeSingle();
      if (error) {
        console.error('[emit] isEmailMuted lookup failed:', error);
        // Default-on if the lookup fails: don't silence a notification
        // that the user already opted in to.
        return false;
      }
      return data?.muted === true;
    },
    [`email-mute:${userId}:${kind}`],
    { revalidate: 60, tags: [`email-mute:${userId}`] }
  );
  return cached();
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export type OnboardingKind =
  | 'signup_welcome'
  | 'identity_verify_recommended'
  | 'wizard_incomplete'
  | 'claim_paid_tier_unlocked'
  | 'profile_first_visitor';

export interface EmitInput {
  userId: string;
  kind: OnboardingKind;
  sourceKey: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  playerId?: string | null;
  oneShot?: boolean;
  metadata?: Record<string, unknown>;
}

interface InboxRow {
  user_id: string;
  kind: OnboardingKind;
  source_key: string;
  player_id: string | null;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  snooze_until: string | null;
}

export interface EmitResult {
  ok: boolean;
  inserted: boolean;
  skipped: boolean;
  reason?: string;
}

/**
 * Insert a single onboarding notification row, idempotent.
 *
 * Returns { ok, inserted, skipped, reason } so callers can log + decide.
 *
 * Idempotency rule (DB-level):
 *   - SELECT existing row by (user_id, source_key, kind).
 *   - If exists + unread + not snoozed → skip (inserted=false, skipped=true).
 *   - If exists + read OR snoozed → DELETE + INSERT.
 *   - If not exists → INSERT.
 *
 * If `oneShot: true`, snooze_until = now() + 365d on the inserted/refreshed row.
 */
export async function emitOnboardingNotification(input: EmitInput): Promise<EmitResult> {
  const {
    userId,
    kind,
    sourceKey,
    title,
    body,
    actionUrl,
    actionLabel,
    playerId = null,
    oneShot = false,
    metadata: extraMeta = {},
  } = input;

  const metadata: Record<string, unknown> = { ...extraMeta };
  if (actionUrl) metadata.action_url = actionUrl;
  if (actionLabel) metadata.action_label = actionLabel;

  try {
    // 1. Look for an existing row
    const { data: existing, error: selectErr } = await supabaseAdmin
      .from('consumer_notifications')
      .select('id, read_at, snooze_until')
      .eq('user_id', userId)
      .eq('source_key', sourceKey)
      .eq('kind', kind)
      .maybeSingle();

    if (selectErr) {
      console.error('[emit] select existing failed:', selectErr);
      return { ok: false, inserted: false, skipped: false, reason: 'select_failed' };
    }

    if (existing) {
      // Unread + not snoozed → already surfaced, skip re-insert (avoid push spam)
      if (!existing.read_at && !existing.snooze_until) {
        return { ok: true, inserted: false, skipped: true, reason: 'already_unread' };
      }
      // Otherwise (read it before, or snoozed) → refresh by deleting first
      const { error: delErr } = await supabaseAdmin
        .from('consumer_notifications')
        .delete()
        .eq('id', existing.id);
      if (delErr) {
        console.error('[emit] delete existing failed:', delErr);
        return { ok: false, inserted: false, skipped: false, reason: 'delete_failed' };
      }
    }

    // 2. Build the new row
    const row: InboxRow = {
      user_id: userId,
      kind,
      source_key: sourceKey,
      player_id: playerId,
      title,
      body,
      metadata,
      snooze_until: oneShot ? new Date(Date.now() + ONE_YEAR_MS).toISOString() : null,
    };

    // 3. Insert
    const { error: insErr } = await supabaseAdmin
      .from('consumer_notifications')
      .insert(row as any);

    if (insErr) {
      // 23505 = unique violation — race with another concurrent emit. Treat as success-but-skipped.
      if (insErr.code === '23505') {
        return { ok: true, inserted: false, skipped: true, reason: 'race_unique_violation' };
      }
      console.error('[emit] insert failed:', insErr);
      return { ok: false, inserted: false, skipped: false, reason: 'insert_failed' };
    }

    // WS14 PR2: also send an email (best-effort, never blocks the primary flow).
    // Skip profile_first_visitor (in-app only) and check mute preference.
    // We look up the user's email from profiles; if missing, log + skip.
    void (async () => {
      try {
        const muted = await isEmailMuted(userId, kind);
        if (muted) return;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('user_id', userId)
          .maybeSingle();
        const to = profile?.email;
        if (!to) {
          console.warn(`[emit] no email for user ${userId}; in-app notification inserted but email skipped`);
          return;
        }
        const actionUrlAbs = actionUrl
          ? (actionUrl.startsWith('http') ? actionUrl : `https://rinkstop.com${actionUrl}`)
          : null;
        await sendEmail({
          to,
          subject: title,
          template: 'notification',
          data: {
            kind: KIND_LABEL[kind] ?? kind,
            title,
            body,
            actionUrl: actionUrlAbs,
            actionLabel: actionLabel ?? null,
          },
          tag: `notification:${kind}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[emit] email send failed (non-blocking, in-app already inserted): ${msg}`);
      }
    })();

    return { ok: true, inserted: true, skipped: false };
  } catch (err) {
    console.error('[emit] unexpected error:', err);
    return { ok: false, inserted: false, skipped: false, reason: 'unexpected' };
  }
}

/**
 * Check whether an unread onboarding row exists for (userId, kind).
 * Used by the wizard-nudge cron to avoid stacking unread rows.
 */
export async function hasUnreadOnboarding(
  userId: string,
  kind: OnboardingKind,
  sourceKey?: string,
): Promise<boolean> {
  let query = supabaseAdmin
    .from('consumer_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .is('read_at', null);

  if (sourceKey) query = query.eq('source_key', sourceKey);

  const { count, error } = await query;
  if (error) {
    console.error('[emit] hasUnreadOnboarding failed:', error);
    return false;
  }
  return (count ?? 0) > 0;
}

// =============================================================================
// Per-kind helpers
// =============================================================================

/**
 * Welcome notification — fires once on first authenticated dashboard load.
 * Caller (Layout server component) decides "first" by reading Clerk created_at
 * vs profiles.created_at — if profiles row was just created (within 1 minute),
 * emit. Otherwise skip.
 */
export async function emitSignupWelcome(userId: string): Promise<EmitResult> {
  return emitOnboardingNotification({
    userId,
    kind: 'signup_welcome',
    sourceKey: 'signup_welcome:onboarding',
    title: 'Welcome to RinkStop',
    body: 'Your hockey profile is ready. Claim your home rink, add your team, or browse the directory to get started.',
    actionUrl: '/dashboard',
    actionLabel: 'Open dashboard',
    oneShot: true,
    metadata: { source: 'first_dashboard_load' },
  });
}

/**
 * Identity verification recommendation — fires when a free user tries to
 * access a paid-tier benefit that requires identity verification.
 * Caller (e.g., /api/tier/upgrade gate check) decides when to recommend.
 *
 * Pass `benefitKey` so we can dedupe — the same benefit shouldn't fire twice.
 */
export async function emitIdentityVerifyRecommended(
  userId: string,
  benefitKey: string,
  benefitLabel: string,
): Promise<EmitResult> {
  return emitOnboardingNotification({
    userId,
    kind: 'identity_verify_recommended',
    sourceKey: `verify_recommended:${benefitKey}`,
    title: `Verify your identity to unlock ${benefitLabel}`,
    body: `Pro+ tiers add a verified checkmark to your profile and unlock DMs with other verified members. One-time ID verification, takes 2 minutes.`,
    actionUrl: '/dashboard/identity',
    actionLabel: 'Verify identity',
    oneShot: true,
    metadata: { benefit_key: benefitKey, benefit_label: benefitLabel },
  });
}

/**
 * Wizard incomplete — fires from a nightly cron at 8am CT for parents / coaches
 * / orgs who haven't completed their Family Setup Wizard. Not one-shot — the
 * cron re-fires daily until the wizard completes.
 */
export async function emitWizardIncomplete(
  userId: string,
  stepCount: number,
  totalSteps: number,
): Promise<EmitResult> {
  return emitOnboardingNotification({
    userId,
    kind: 'wizard_incomplete',
    sourceKey: 'wizard_incomplete:nightly',
    title: 'Finish your Hockey Passport setup',
    body: `You're ${stepCount} of ${totalSteps} steps in. Completing the wizard unlocks your home-rink claim, kid profile linking, and team roster.`,
    actionUrl: '/dashboard',
    actionLabel: 'Resume wizard',
    oneShot: false,
    metadata: { step_count: stepCount, total_steps: totalSteps },
  });
}

/**
 * Claim paid tier unlocked — fires the first time a user's claim becomes
 * "approved" while on a paid tier (so they were already paying, claim approved,
 * now they get the verified owner badge). NOT one-shot in PR1 — the same
 * user can get multiple claims approved, source_key is per-claim.
 */
export async function emitClaimPaidTierUnlocked(
  userId: string,
  claimId: string,
  entityName: string,
  tierLabel: string,
): Promise<EmitResult> {
  return emitOnboardingNotification({
    userId,
    kind: 'claim_paid_tier_unlocked',
    sourceKey: `claim_paid_unlocked:${claimId}`,
    title: `Your ${tierLabel} claim is approved`,
    body: `${entityName} is now claimed on your profile. As a ${tierLabel} member, your owner badge is live.`,
    actionUrl: `/profile`,
    actionLabel: 'View profile',
    oneShot: false,
    metadata: { claim_id: claimId, entity_name: entityName, tier_label: tierLabel },
  });
}

/**
 * Profile first visitor — fires the first time a non-owner views the user's
 * public profile. The profile page server component detects this and emits
 * once per (viewer, owner) pair.
 */
export async function emitProfileFirstVisitor(
  ownerUserId: string,
  viewerUserId: string,
  viewerDisplayName: string | null,
): Promise<EmitResult> {
  return emitOnboardingNotification({
    userId: ownerUserId,
    kind: 'profile_first_visitor',
    sourceKey: `profile_first_visit:${viewerUserId}`,
    title: `${viewerDisplayName ?? 'Someone'} viewed your profile`,
    body: `Their visit counts as your first profile view — this notification only fires once per person.`,
    actionUrl: '/dashboard/notifications',
    actionLabel: 'See notifications',
    oneShot: true,
    metadata: {
      viewer_user_id: viewerUserId,
      viewer_display_name: viewerDisplayName,
    },
  });
}
