'use client';

import { usePathname } from 'next/navigation';

/**
 * AdSenseLoader — renders the Google AdSense publisher script.
 *
 * 2026-08-31 (PR #146) — script load vs ad-request gating split.
 *
 * 2026-10-14 — moved pathname-aware exclusion into the client side
 * (was previously computed server-side in src/app/layout.tsx via
 * `headers()`).  Reason: the layout's `headers()` call opts the
 * entire app out of static rendering, so /directory/games/[id] (and
 * any other ISR page) was returning
 * `cache-control: private, no-cache, no-store` instead of being
 * cached.  The fix moves the exclusion check into this client
 * component using `usePathname()` — the layout no longer needs
 * `headers()` at all, so it can stay static and ISR works.
 *
 * New behavior (compliant with both AdSense program policy and GDPR):
 *
 *   1. If the current pathname is in the exclusion list
 *      (/privacy, /terms, /cookies, /about, /contact, /advertise,
 *      /login, /sign-up, /dashboard, /admin, /api,
 *      /claim-your-listing, /onboarding, /directory/youth-hockey,
 *      /guides/youth, /editorial-policy, /corrections,
 *      /data-methodology), the component renders no script tag.
 *      The exclusion list is the single source of truth and was
 *      previously maintained in src/app/layout.tsx.
 *
 *   2. If eligible, the publisher script tag IS rendered into the
 *      initial HTML. This means the script appears in the server
 *      document and is visible to:
 *        - AdSense program-policy reviewers (curl / headless browser)
 *        - Mediapartners-Google (Google's AdSense crawler)
 *        - any other crawler that doesn't run JS
 *      The script loads asynchronously and begins handshake with the
 *      AdSense backend, but does NOT request any ad fills until the
 *      user accepts cookies (see AdSlot's gated push()).
 *
 *   3. Ad FILL requests are gated on consent in AdSlot: until the user
 *      has recorded `localStorage.cookie_consent === 'accepted'`, no
 *      `adsbygoogle.push({...})` call is made by any AdSlot on the
 *      page. This satisfies GDPR / EEA consent requirements — no
 *      personal data is sent to Google before the user accepts.
 *
 *   4. The script has `data-ad-loader="first-party"` and
 *      `data-ad-client="ca-pub-3703811522107586"` attributes so it is
 *      grep-able in rendered HTML for verification.
 *
 * Implementation note: we render a plain <script> tag (not next/script)
 * so the publisher-id ?client= query parameter is preserved exactly as
 * Google documents. next/script's loader normalizes some query params.
 */

const PUBLISHER_CLIENT = 'ca-pub-3703811522107586';

// AdSense policy: ads cannot be served on legal/auth/form/youth pages.
// Single source of truth (previously in src/app/layout.tsx).
const ADSENSE_EXCLUDED_PREFIXES = [
  '/privacy',
  '/terms',
  '/cookies',
  '/login',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/sso-callback',
  '/claim-your-listing',
  '/dashboard',
  '/admin',
  '/onboarding',
  '/api',
  // Youth hockey sections: per Privacy Policy, no personalized or
  // retargeted advertising on pages that may be of interest to minors.
  // AdSense policy + COPPA + Google's TFAT age-treatment framework
  // (2026-05) require this exclusion before AdSense is enabled.
  '/directory/youth-hockey',
  // Youth guide content (learn-to-play, parent guides, transition paths)
  // is also 'directed to children' under COPPA / TFAT — same exclusion.
  '/guides/youth',
];
const ADSENSE_EXCLUDED_EXACT = new Set([
  '/about',
  '/contact',
  '/advertise',
  '/cookies',
  // Trust/policy pages added in PR #184 — same AdSense-exclusion rationale
  // as the originals. Editors don't monetize reader complaints,
  // methodology disclosures, or editorial standards.
  '/editorial-policy',
  '/corrections',
  '/data-methodology',
]);

function isAdsenseEligible(pathname: string): boolean {
  if (!pathname) return true;
  if (ADSENSE_EXCLUDED_EXACT.has(pathname)) return false;
  if (ADSENSE_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return true;
}

export default function AdSenseLoader(): React.ReactElement | null {
  const pathname = usePathname() || '';
  if (!isAdsenseEligible(pathname)) return null;

  return (
    <script
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_CLIENT}`}
      data-ad-loader="first-party"
      data-ad-client={PUBLISHER_CLIENT}
    />
  );
}