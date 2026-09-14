/**
 * GtagLoader — server-renders the Google Analytics 4 (gtag.js) snippet
 * for the configured Measurement ID. Mirrors the AdSenseLoader pattern:
 * when `enabled=true`, the gtag.js script tag + inline config snippet are
 * rendered into the initial server HTML so:
 *
 *   - GA4 property reviewers (and any curl / crawler / Mediapartners-Google
 *     style bot) see a live gtag integration in the rendered document.
 *   - Page-view pings fire on first paint, before client-side hydration.
 *
 * When `enabled=false` (Measurement ID not configured), the component
 * renders nothing — no network call, no script tag. This is the same
 * fail-closed pattern used by AdSenseLoader so an unset env var never
 * ships a half-broken analytics integration to production.
 *
 * Consent posture:
 *
 *   GA4 page-view pings are non-personal by default (Google anonymizes
 *   IPs at the property level since 2023). The first-party ConsentBanner
 *   still controls the cookie-consent record (`localStorage.cookie_consent`)
 *   that AdSense uses. GA page_views are NOT additionally gated on that
 *   record because (a) the audience is primarily US/Canada — non-EEA,
 *   (b) IP-anonymization is on by default, (c) gating the config call
 *   would require a client component which would delay first page_view
 *   past hydration. If EEA traffic becomes meaningful, layer a
 *   `gtag('consent', 'update', ...)` call gated on the consent record
 *   here without changing the loader's server-rendered structure.
 *
 * Implementation note: we render a plain <script> tag (not next/script)
 * so the Measurement ID query parameter is preserved exactly as Google
 * documents. next/script's loader normalizes some query params.
 *
 * Verification (post-deploy):
 *   curl -s https://rinkstop.com | grep -oE 'googletagmanager\.com/gtag/js\?id=[^"]+'
 *     → https://www.googletagmanager.com/gtag/js?id=G-VVHTWGN23V
 *   curl -s https://rinkstop.com | grep -oE 'gtag\(.config.,.G-[A-Z0-9]+.\)'
 *     → gtag('config', 'G-VVHTWGN23V')
 *   In GA4 dashboard: Realtime should show 1 active user within 30s of any page load.
 */

export default function GtagLoader({ measurementId }: { measurementId?: string | undefined }): React.ReactElement | null {
  if (!measurementId || !measurementId.startsWith('G-')) {
    return null;
  }

  // Inline snippet matches Google's recommended gtag.js install pattern.
  // Wrapped in a template string so JSX doesn't escape the curly braces.
  const inlineConfig = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');
`.trim();

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        data-gtag-loader="first-party"
        data-ga-measurement-id={measurementId}
      />
      <script
        dangerouslySetInnerHTML={{ __html: inlineConfig }}
        data-gtag-config="first-party"
        data-ga-measurement-id={measurementId}
      />
    </>
  );
}
