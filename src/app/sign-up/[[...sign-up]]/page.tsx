import { SignUp } from '@clerk/nextjs';
import { signInAppearance } from '@/lib/clerk-appearance';
import styles from '../../login/login.module.css';

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
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const sp = await searchParams;
  const requested = sp?.redirect_url;
  const safeRedirect = isValidRedirectPath(requested) ? requested : '/dashboard';

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.clerkWrap}>
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/login"
            forceRedirectUrl={safeRedirect}
            fallbackRedirectUrl={safeRedirect}
            appearance={signInAppearance}
          />
        </div>
      </div>
    </div>
  );
}
