'use client';

/**
 * AdSenseLoader — server-renders the Google AdSense publisher script.
 *
 * 2026-08-31 (PR #146) — script load vs ad-request gating split.
 *
 * Previously this component only injected the script via useEffect
 * after the user accepted cookies via ConsentBanner. That made the
 * AdSense reviewer (and any curl / crawler) see a site that had
 * ads.txt but no publisher script — which looks like "not running
 * AdSense" — and the resubmit was rejected.
 *
 * New behavior (compliant with both AdSense program policy and GDPR):
 *
 *   1. If `enabled=false` (excluded route — /privacy, /terms, /cookies,
 *      /about, /contact, /advertise, /login, /sign-up, /dashboard,
 *      /admin, /api, /claim-your-listing, /onboarding,
 *      /directory/youth-hockey, /guides/youth), the component renders
 *      no script tag. The exclusion list is computed server-side in
 *      src/app/layout.tsx and is the source of truth.
 *
 *   2. If `enabled=true`, the publisher script tag IS rendered into the
 *      server HTML. This means the script appears in the initial
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

export default function AdSenseLoader({ enabled }: { enabled: boolean }): React.ReactElement | null {
  if (!enabled) return null;

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