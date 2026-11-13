import { SignIn } from '@clerk/nextjs';
import { signInAppearance } from '@/lib/clerk-appearance';
import { ClaimIntentCard, parseClaimIntent } from '../../sign-up/ClaimIntentCard';
import styles from '../login.module.css';

// Login page (Phase 4.2, 2026-06-16): preserve the user's intended destination
// across the auth round-trip.
//
// Bug: Previously `forceRedirectUrl="/dashboard"` and `fallbackRedirectUrl="/dashboard"`
// were hard-coded, so any user who hit a deep link like /dashboard/manage/team/abc123
// (or a Stripe success URL, or a shared /directory/rinks/[id] page that requires
// login) would be redirected to /login, then to /dashboard — losing the destination.
//
// Fix: Read `redirect_url` from the URL search params (which the middleware
// sets automatically for protected routes), validate it (must be a relative path
// starting with "/" and not an external URL — prevent open-redirect attacks),
// and pass it through to Clerk. If no redirect_url is present, default to /dashboard.
//
// Safety: the validateRedirectPath() helper ensures we only ever pass
// internal paths (start with "/", no "//", no "javascript:"). External
// URLs are silently dropped to /dashboard.
function isValidRedirectPath(p: string | null | undefined): p is string {
  if (!p || typeof p !== 'string') return false;
  if (!p.startsWith('/')) return false;          // must be relative
  if (p.startsWith('//')) return false;          // protocol-relative
  if (p.startsWith('/\\')) return false;         // backslash trick
  if (p.toLowerCase().includes('javascript:')) return false;
  return true;
}

export default async function LoginPage({
  searchParams,
}: {
  // Next.js 14+: searchParams is a Promise. Await it.
  searchParams: Promise<{ redirect_url?: string; next?: string }>;
}) {
  const sp = await searchParams;
  // 2026-11-13: accept `next` as an alias for `redirect_url`. The pricing
  // page sends guests to `/sign-up?next=...`; without this alias the guest's
  // chosen tier + upgrade intent + Founding Member discount were dropped and
  // they landed on /dashboard after authenticating.
  const requested = sp?.redirect_url ?? sp?.next;
  const safeRedirect = isValidRedirectPath(requested) ? requested : '/dashboard';

  // Preserve redirect_url across the sign-in → sign-up round trip.
  // Clerk's <SignIn> renders a 'Sign up instead' link whose href is
  // controlled by `signUpUrl`. By default, Clerk strips the redirect_url
  // query param when navigating to signUpUrl — so a user who lands on
  // /login?redirect_url=/dashboard/claims?intent=claim&... and clicks
  // 'Sign up instead' would lose the claim context and land on /dashboard
  // after sign-up.
  //
  // Fix (audit fix 2026-08-11): build the signUpUrl with the same
  // redirect_url appended (URL-encoded) so Clerk preserves it. The
  // /sign-up page then parses it (see parseClaimIntent) to render the
  // tier card. isValidRedirectPath guards against open-redirect injection
  // through this hop.
  const signUpUrl = isValidRedirectPath(safeRedirect) && safeRedirect !== '/dashboard'
    ? `/sign-up?redirect_url=${encodeURIComponent(safeRedirect)}`
    : '/sign-up';

  // 2026-11-13 (growth sprint): an existing user who clicks "Claim it free"
  // and then "Sign in" arrives here. The page used to say only "Welcome
  // back — sign in to save players, track favorites, and unlock your
  // dashboard", so the user had no idea they were signing in TO CLAIM A
  // LISTING. The claim intent (entity type, id, name) is in the
  // redirect_url, so we parse it and show the same context the sign-up
  // page shows.
  const claimIntent = parseClaimIntent(
    (sp as Record<string, string | string[] | undefined> | undefined) ?? undefined,
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {claimIntent ? (
          <div style={{ padding: '1.25rem 1.5rem 0' }}>
            <ClaimIntentCard
              entity={claimIntent.entity}
              entityName={claimIntent.entityName}
              tier={claimIntent.tier}
              upgradeTier={claimIntent.upgradeTier}
            />
            <div
              style={{
                marginTop: '-0.5rem',
                marginBottom: '1.25rem',
                fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.5,
              }}
            >
              Sign in and we&rsquo;ll take you straight to this claim.
            </div>
          </div>
        ) : null}
        <div className={styles.clerkWrap}>
          <SignIn
            path="/login"
            routing="path"
            signUpUrl={signUpUrl}
            forceRedirectUrl={safeRedirect}
            fallbackRedirectUrl={safeRedirect}
            appearance={signInAppearance}
          />
        </div>
      </div>
    </div>
  );
}
