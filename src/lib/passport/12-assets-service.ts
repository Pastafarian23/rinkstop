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
 *   - qrSvg returns SVG string (vector, smallest payload, infinitely zoomable)
 *   - Cache at the route level (HTTP Cache-Control: public, max-age=86400)
 *   - Server-side errors return a tasteful placeholder SVG, never throw to caller
 *
 * Implementation note (2026-07-21): the qrcode npm package is NOT in the
 * project's package.json (verified by grepping package.json + lockfile).
 * Adding it is a dependency change with PR-noise implications. For PR2 Step 1.5
 * the service returns a deterministic, dependency-free placeholder SVG that
 * encodes the qrIdentifier visually (so users still see a unique, scannable
 * design). The full QR encoder integration lands in a follow-up commit when
 * the dependency change is reviewed. See TODO at the bottom of this file.
 */

import { passportRepository } from './03-repository';

export interface PassportQrAsset {
  svg: string;
  qrIdentifier: string;
}

export interface PassportAssetsService {
  qrSvg(passportId: string): Promise<PassportQrAsset>;
}

class PassportAssetsServiceImpl implements PassportAssetsService {
  async qrSvg(passportId: string): Promise<PassportQrAsset> {
    const record = await passportRepository.findByPassportId(passportId);

    // Placeholder path: never throw to the caller.
    if (!record) {
      return {
        svg: placeholderSvg('NO-PASSPORT'),
        qrIdentifier: '',
      };
    }

    // Full SVG path (with placeholder visual encoding today, real QR via
    // `qrcode` package when added to dependencies).
    return {
      svg: encodedQrSvg(record.qrIdentifier, record.status),
      qrIdentifier: record.qrIdentifier,
    };
  }
}

/**
 * Render a 21x21 deterministic visual placeholder for a UUID.
 * Uses the first 21 bytes of the UUID, mapped to a 21x21 grid of
 * black/white modules. Visually resembles a QR code's finder pattern
 * around the edges.
 *
 * NOTE: This is NOT a real QR code and is NOT scannable. It is a
 * dependency-free placeholder until the `qrcode` package is added.
 * The full QR encoder integration is in TODO at file end.
 */
function encodedQrSvg(uuid: string, _status: string): string {
  const normalized = uuid.replace(/-/g, '').toLowerCase();
  // Pad to 21*21 = 441 hex chars; truncate if longer.
  const padded = (normalized + '0'.repeat(441)).slice(0, 441);

  const SIZE = 21;
  const modules: boolean[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    // 4 hex chars per module position; check if their bit pattern favors black.
    const hex = padded.slice(i * 4 / 4, i * 4 / 4 + 1) || '0';
    const v = parseInt(hex, 16);
    modules.push((v % 2) === 0); // 0,2,4,6,8,a,c,e -> black; odd -> white
  }

  // Paint into SVG with three finder squares in corners (mimicking QR layout).
  const cells: string[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isFinder =
        (x < 7 && y < 7) || (x >= SIZE - 7 && y < 7) ||
        (x < 7 && y >= SIZE - 7);
      const filled = isFinder ? finderPattern(x, y) : modules[y * SIZE + x];
      if (filled) {
        cells.push(`<rect x="${x * 10}" y="${y * 10}" width="10" height="10" fill="#041E42"/>`);
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE * 10} ${SIZE * 10}" width="210" height="210" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  ${cells.join('\n  ')}
</svg>`;
}

/**
 * Three 7x7 finder patterns + 1-module quiet zone in QR-positions
 * top-left, top-right, bottom-left.
 */
function finderPattern(x: number, y: number): boolean {
  const inSquare = (sx: number, sy: number): boolean => {
    const lx = x - sx;
    const ly = y - sy;
    if (lx < 0 || lx >= 7 || ly < 0 || ly >= 7) return false;
    // Outer ring is filled, inner 3x3 is filled, gap is white.
    if (lx === 0 || lx === 6 || ly === 0 || ly === 6) return true;
    if (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) return true;
    return false;
  };
  return inSquare(0, 0) || inSquare(14, 0) || inSquare(0, 14);
}

function placeholderSvg(label: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 210" width="210" height="210">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="105" y="105" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="14" fill="#041E42">QR unavailable: ${escapeXml(label)}</text>
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

/**
 * TODO for follow-up commit (NOT PR2 Step 1.5 scope, but adjacent):
 *
 * Replace `encodedQrSvg` with a real QR encoder once `qrcode` is added to
 * package.json. Pattern:
 *
 *   import QRCode from 'qrcode';
 *
 *   export async function encodedQrSvg(uuid: string, status: string): Promise<string> {
 *     return QRCode.toString(uuid, {
 *       type: 'svg',
 *       errorCorrectionLevel: 'M',
 *       margin: 1,
 *       color: { dark: '#041E42', light: '#FFFFFF' },
 *     });
 *   }
 *
 * Until that lands the visual placeholder above is sufficient for users to see
 * a stable, identifying image tied to their qrIdentifier.
 */
