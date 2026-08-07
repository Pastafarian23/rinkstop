/**
 * Per-kind email preference reader (WS14 PR2b).
 *
 * Reads notification_email_prefs for the current user. Defaults to
 * `muted = false` (email ON) when the row doesn't exist — matches the
 * schema CHECK default.
 *
 * Used by the /dashboard/notifications/preferences server component to
 * render toggle switches.
 *
 * Cache: 60s per (user_id, kind), tagged per-user so a PATCH (in the
 * API route) can revalidate via `revalidateTag('email-mute:${userId}')`.
 * Same shape as the makeEmailMuted/isEmailMuted helpers in
 * src/lib/notifications/emit.ts so the in-app emitter and the UI
 * share the same cache.
 */

import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import type { OnboardingKind } from '@/lib/notifications/emit';

export interface EmailPref {
  kind: OnboardingKind;
  muted: boolean;
}

export async function getEmailPrefsForUser(userId: string): Promise<EmailPref[]> {
  const cached = unstable_cache(
    async () => {
      const { data, error } = await supabaseAdmin
        .from('notification_email_prefs')
        .select('kind, muted')
        .eq('user_id', userId);
      if (error) {
        console.error('[notification-email-prefs] read failed:', error);
        // Fail open: return empty list (no per-kind overrides). UI
        // surfaces email as enabled for every kind.
        return [] as EmailPref[];
      }
      return (data ?? []).map((r) => ({ kind: r.kind as OnboardingKind, muted: !!r.muted }));
    },
    [`email-prefs:${userId}`],
    { revalidate: 60, tags: [`email-mute:${userId}`] }
  );
  return cached();
}

/**
 * Read a single kind's mute preference. Re-exported from here so
 * server components can `import { getEmailPref } from '@/lib/notification-email-prefs'`
 * without reaching into the emitter module.
 */
export async function getEmailPref(userId: string, kind: OnboardingKind): Promise<boolean> {
  const all = await getEmailPrefsForUser(userId);
  const row = all.find((r) => r.kind === kind);
  return row ? row.muted : false;
}

/**
 * Human-friendly labels for the 5 onboarding kinds, used by the UI.
 * Single source of truth — the email template reuses the same labels.
 */
export const PREF_LABEL: Record<OnboardingKind, { title: string; description: string }> = {
  signup_welcome: {
    title: 'Welcome to RinkStop',
    description: 'First-time onboarding email when you sign up. In-app inbox mirror.',
  },
  identity_verify_recommended: {
    title: 'Identity verification prompts',
    description: 'When you try to unlock a paid-tier benefit that needs ID verification.',
  },
  wizard_incomplete: {
    title: 'Setup wizard reminders',
    description: 'Daily reminder if you haven\u2019t finished your Hockey Passport setup.',
  },
  claim_paid_tier_unlocked: {
    title: 'Claim approval notices',
    description: 'When a claim you submitted is approved on a paid tier.',
  },
  profile_first_visitor: {
    title: 'Profile views',
    description: 'In-app only. We never email for passive profile views.',
  },
};
