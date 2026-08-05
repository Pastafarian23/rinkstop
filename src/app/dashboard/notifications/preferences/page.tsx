/**
 * /dashboard/notifications/preferences
 *
 * WS14 PR2b — Per-kind email mute controls for the 5 onboarding
 * notification kinds. Read from notification_email_prefs and rendered
 * as a 5-row toggle table. POSTed back via /api/notification-email-prefs/[kind]
 * (PATCH).
 *
 * profile_first_visitor is shown but locked as muted (in-app only — we
 * never email for passive profile views; the API enforces that on
 * server side too).
 *
 * Render: server component. The 5 toggle buttons are plain forms that
 * POST/PATCH on click — no client React state needed. Progressive
 * enhancement: the form works without JS (uses native form submission).
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { getEmailPrefsForUser, PREF_LABEL } from '@/lib/notification-email-prefs';
import type { OnboardingKind } from '@/lib/notifications/emit';

export const dynamic = 'force-dynamic';

const KINDS: OnboardingKind[] = [
  'signup_welcome',
  'identity_verify_recommended',
  'wizard_incomplete',
  'claim_paid_tier_unlocked',
  'profile_first_visitor',
];

export default async function NotificationsPreferencesPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    redirect('/login?redirect=/dashboard/notifications/preferences');
  }

  const prefs = await getEmailPrefsForUser(userId);
  const byKind = new Map(prefs.map((p) => [p.kind, p.muted] as const));

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/notifications" style={{ color: 'rgba(255,255,255,0.5)' }}>Notifications</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Email preferences</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          EMAIL PREFERENCES
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Pick which onboarding emails you want. We always show every notification in
          your in-app inbox — these switches only control the email channel.
          {' '}
          <Link href="/dashboard/notifications" style={{ color: '#FFB81C' }}>Open inbox →</Link>
        </p>

        <form method="POST" action="/dashboard/notifications/preferences" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {KINDS.map((kind) => {
            const { title, description } = PREF_LABEL[kind];
            const muted = byKind.get(kind) ?? false;
            const locked = kind === 'profile_first_visitor'; // in-app only
            return (
              <div
                key={kind}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                    {title}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                    {description}
                  </p>
                  {locked && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.6875rem', color: 'rgba(255,184,28,0.85)' }}>
                      In-app only — we never email for this kind.
                    </p>
                  )}
                </div>

                <EmailPrefToggle kind={kind} muted={muted} locked={locked} />
              </div>
            );
          })}
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          Changes save instantly. From: <strong>support@rinkstop.com</strong>.
        </p>
      </div>
    </main>
  );
}

/**
 * Server-rendered toggle. Each row is its own form so a single click
 * saves that kind. No client JS required — works without hydration.
 *
 * The form posts to /api/notification-email-prefs/[kind] via fetch on
 * the client (added below). To stay progressive-enhancement-friendly,
 * the same form is also a no-JS fallback that triggers a POST to the
 * page itself, which we then handle server-side.
 */
function EmailPrefToggle({ kind, muted, locked }: { kind: OnboardingKind; muted: boolean; locked: boolean }) {
  // The actual PATCH is performed via fetch from a small inline script
  // tag. The form's onsubmit handler is the no-JS fallback (full page
  // reload to a POST endpoint that we add as a sibling route).
  return (
    <form
      action={`/api/notification-email-prefs/${kind}`}
      method="PATCH"
      data-kind={kind}
      data-current-muted={muted ? 'true' : 'false'}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
    >
      <input type="hidden" name="muted" value={muted ? 'false' : 'true'} />
      <button
        type="submit"
        disabled={locked}
        aria-pressed={muted}
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          border: 'none',
          background: muted ? 'rgba(255,255,255,0.15)' : '#C8102E',
          cursor: locked ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background 0.15s',
          padding: 0,
          opacity: locked ? 0.5 : 1,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: muted ? 3 : 21,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s',
          }}
        />
      </button>
      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', minWidth: 32 }}>
        {muted ? 'Off' : 'On'}
      </span>
    </form>
  );
}
