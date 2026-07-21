/**
 * src/lib/passport/12-assets-service.ts
 *
 * Passport Assets Service
 *
 * Single source of truth for all visual / sharable / exportable assets
 * derived from a Passport. The Passport Card (and every other surface —
 * public Passport, Wallet pass, physical print, recruiter view) requests
 * assets through this service. The service hides the implementation
 * details (QR generation, PDF assembly, wallet-pass packaging, etc.).
 *
 * Current assets (PR2 scope):
 *   - qrSvg(passportId): SVG for the Passport's QR code
 *
 * Future assets (out of scope for PR2 but contract supports them):
 *   - walletPass(passportId): pkpass bundle (WS6)
 *   - pdfExport(passportId): printable PDF (WS5)
 *   - badgeImage(passportId, level): verification badge PNG (WS4)
 *   - socialShareCard(passportId): OG image (WS6)
 *
 * Per PR2 plan §1.5:
 *   - Encodes the OPAQUE qrIdentifier (UUID). Never the Passport URL or id.
 *   - Returns SVG (vector, small payload, infinitely zoomable).
 *   - Cached at the route layer (HTTP Cache-Control: public, max-age=86400).
 *   - Server-side errors return a tasteful placeholder SVG — never throws
 *     to the caller.
 */

import QRCode from 'qrcode';
import { passportRepository } from './03-repository';

export interface PassportQrAsset {
  svg: string;
  qrIdentifier: string;
}

export interface PassportAssetsService {
  qrSvg(passportId: string): Promise<PassportQrAsset>;
}

const QR_OPTS = {
  type: 'svg' as const,
  errorCorrectionLevel: 'M' as const,
  margin: 1,
  color: { dark: '#041E42', light: '#FFFFFF' },
  width: 256,
};

class PassportAssetsServiceImpl implements PassportAssetsService {
  async qrSvg(passportId: string): Promise<PassportQrAsset> {
    try {
      const record = await passportRepository.findByPassportId(passportId);
      if (!record) {
        return { svg: placeholderSvg('NO-PASSPORT'), qrIdentifier: '' };
      }
      const svg = await QRCode.toString(record.qrIdentifier, QR_OPTS);
      return { svg, qrIdentifier: record.qrIdentifier };
    } catch (err) {
      // Never throw to caller; surface a tasteful fallback and log for ops.
      console.error('[passportAssetsService.qrSvg] error:', err);
      return {
        svg: placeholderSvg('UNAVAILABLE'),
        qrIdentifier: '',
      };
    }
  }
}

/**
 * Single-line fallback SVG used for both "Passport not found" and
 * encoder-failure paths. Same brand colors so the Card UI never visually
 * breaks.
 */
function placeholderSvg(label: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, system-ui, sans-serif" font-size="16" fill="#041E42">QR unavailable: ${escapeXml(label)}</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export const passportAssetsService: PassportAssetsService =
  new PassportAssetsServiceImpl();
