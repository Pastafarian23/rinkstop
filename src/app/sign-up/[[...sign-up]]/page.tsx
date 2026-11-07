import { SignUp } from '@clerk/nextjs';
import { signInAppearance } from '@/lib/clerk-appearance';
import styles from '../../login/login.module.css';
import { ClaimIntentCard, parseClaimIntent } from '../ClaimIntentCard';
import {
  FOUNDING_PROMO_MAX_REDEMPTIONS,
  FOUNDING_PROMO_PERCENT_OFF,
  FOUNDING_PROMO_RENEWAL_NOTE,
} from '@/lib/founding-promo';

// Sign-up page (audit fix 2026-07-13): preserve the user's intended destination
// across the auth round-trip.
//
// Bug: Previously `forceRedirectUrl="/dashboard"` and `fallbackRedirectUrl="/dashboard"`
// were hard-coded, so any visitor who hit a deep link like /ice-rinks/[id]/claim or
// /dashboard/manage/team/abc123, was redirected to /login?redirect_url=/..., then clicked
// "Sign up instead" → routed to /sign-up with NO redirect param → landed on /dashboard,
// losing their original destination. Funnel leak.
//
// Fix: Mirror the /login handler — read `redirect_url` from searchParams, validate it
// (must be a relative path starting with "/" and not an external URL — prevent
// open-redirect attacks), and pass through to Clerk. If no redirect_url is present,
// default to /dashboard.
//
// Safety: same isValidRedirectPath() body as /login. External URLs are silently
// dropped to /dashboard.
function isValidRedirectPath(p: string | null | undefined): p is string {
  if (!p || typeof p !== 'string') return false;
  if (!p.startsWith('/')) return false;          // must be relative
  if (p.startsWith('//')) return false;          // protocol-relative
  if (p.startsWith('/\\')) return false;         // backslash trick
  if (p.toLowerCase().includes('javascript:')) return false;
  return true;
}

export default async function SignUpPage({
  searchParams,
}: {
  // Next.js 14+: searchParams is a Promise. Await it.
  searchParams: Promise<{ redirect_url?: string; intent?: string; entity?: string; id?: string; name?: string; tier?: string; upgrade?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const requested = sp?.redirect_url;
  const safeRedirect = isValidRedirectPath(requested) ? requested : '/dashboard';

  // Phase 2: detect claim-intent deep links. When a user lands here from
  // /claim-your-listing's "Claim & Verify" button, we render a tier card
  // ABOVE the Clerk form so they see the price and what they're paying for
  // BEFORE creating an account. See ClaimIntentCard.tsx for the parsing
  // rules.
  const claimIntent = parseClaimIntent(sp as Record<string, string | string[] | undefined> | undefined);

  // If this is a claim flow but the caller didn't supply a redirect_url,
  // build a default redirect that points at /dashboard/claims with the
  // entity context. Otherwise the user would land on /dashboard after
  // sign-up and lose the claim intent.
  //
  // Audit fix 2026-08-11: source params from the parsed claimIntent
  // (which merges top-level + redirect_url-embedded params) rather than
  // from raw sp, because the common flow is /login?redirect_url=/dashboard/claims?intent=claim&...
  // where entity/name/id/tier live INSIDE redirect_url, not at the top level.
  let finalRedirect = safeRedirect;
  if (claimIntent && (!requested || requested === '/dashboard')) {
    const params = new URLSearchParams();
    params.set('intent', 'claim');
    params.set('entity', claimIntent.entity);
    const sp_id = sp?.id;
    const sp_id_str = Array.isArray(sp_id) ? sp_id[0] : sp_id;
    if (sp_id_str) params.set('id', sp_id_str);
    params.set('name', claimIntent.entityName);
    params.set('tier', claimIntent.tier);
    finalRedirect = `/dashboard/claims?${params.toString()}`;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {claimIntent ? (
          <div style={{ padding: '1.25rem 1.5rem 0' }}>
            {/* Founding Member promotion — the offer is carried through the
                sign-up step so a visitor sees the same three facts here, on
                the pricing page, and in the first-visit popup. */}
            <div
              data-testid="founding-promo-signup"
              style={{
                marginBottom: '1rem',
                background: 'rgba(255,184,28,0.08)',
                border: '1px solid rgba(255,184,28,0.4)',
                borderRadius: 10,
                padding: '0.875rem 1rem',
              }}
            >
              <div style={{ color: '#FFB81C', fontWeight: 800, fontSize: '0.9375rem', marginBottom: '0.35rem' }}>
                {FOUNDING_PROMO_PERCENT_OFF}% off your first year
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                New customers only — first {FOUNDING_PROMO_MAX_REDEMPTIONS} sign-ups.{' '}
                {FOUNDING_PROMO_RENEWAL_NOTE} Your second year is charged at the standard price.
              </div>
            </div>
            <ClaimIntentCard
              entity={claimIntent.entity}
              entityName={claimIntent.entityName}
              tier={claimIntent.tier}
              upgradeTier={claimIntent.upgradeTier}
            />
          </div>
        ) : null}
        <div className={styles.clerkWrap}>
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/login"
            forceRedirectUrl={finalRedirect}
            fallbackRedirectUrl={finalRedirect}
            appearance={signInAppearance}
          />
        </div>
      </div>
    </div>
  );
}
