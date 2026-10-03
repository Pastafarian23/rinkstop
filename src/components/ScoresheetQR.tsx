/**
 * ScoresheetQR — Phase B2 QR code on rinkstop.com /directory/games/[id]
 *
 * Renders a QR code that, when scanned, opens the RinkStop Scoresheet
 * app at:
 *   https://scoresheet.rinkstop.com/new?fixture=<fixture_id>
 *
 * The scoresheet app reads the fixture from the shared Supabase DB and
 * pre-fills the game-creation form. If a scoresheet game is already
 * linked to this fixture AND the current user owns it, the deep-link
 * redirects to the existing game instead.
 *
 * Visibility:
 *   - Only renders for fixtures in `scheduled` status (no QR for
 *     already-completed games; the scoresheet isn't useful retroactively)
 *   - Honors the per-fixture qr_enabled flag in fixture_scoresheet_settings
 *   - Renders a tasteful promo card with a clear CTA
 *
 * The QR image is generated server-side via the existing
 * /api/qr?url=... endpoint (Phase B2 reuses the same endpoint, but
 * allows any rinkstop.com path including cross-domain since scoresheet
 * is a subdomain).
 */

import QRCode from 'qrcode';

interface Props {
  fixtureId: string;
  homeTeamName: string;
  awayTeamName: string;
  /** Whether the fixture has a scoresheet link enabled. Default true. */
  qrEnabled?: boolean;
  /** Pre-rendered SVG (server-side). When provided, no async work. */
  svg?: string;
  /** Status of the fixture; QR is hidden for non-scheduled. */
  status: string;
}

export async function renderScoresheetQR({
  fixtureId,
  qrEnabled = true,
  status,
  svg: providedSvg,
}: {
  fixtureId: string;
  qrEnabled?: boolean;
  status: string;
  svg?: string;
}): Promise<string | null> {
  if (status !== 'scheduled') return null;
  if (!qrEnabled) return null;
  if (providedSvg) return providedSvg;

  const deepLink = `https://scoresheet.rinkstop.com/new?fixture=${encodeURIComponent(fixtureId)}`;
  try {
    const svg = await QRCode.toString(deepLink, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#041E42', light: '#FFFFFF' },
      width: 256,
    });
    return svg;
  } catch (err) {
    console.error('[ScoresheetQR] generation error:', err);
    return null;
  }
}
