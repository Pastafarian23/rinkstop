'use client';

import { QRCodeSVG } from 'qrcode.react';

interface Props {
  /**
   * The opaque QR identifier (UUID) encoded into the QR payload.
   * Decoded by /qr/[qrIdentifier] → /passport/[passportId] redirect.
   */
  qrIdentifier: string;
  /** Public passport id (e.g. RS1-DEMOPLAYER01) — used for ARIA / alt. */
  passportId: string;
  /**
   * Pixel size of the rendered SVG. Defaults to 88 to match the existing
   * <img> dimensions; callers can request larger sizes for print contexts.
   */
  size?: number;
}

/**
 * Client-side QR code generator for the public Passport page.
 *
 * Why client-side: as of 2026-10-05 the entire /api/* surface on rinkstop.com
 * was returning HTTP 500 because of a Vercel build-level issue affecting
 * route handlers. The previous <img src="/api/internal/passport/qr/[id]">
 * pattern was therefore producing broken-image icons on every passport page.
 *
 * Rendering the QR on the client with `qrcode.react` bypasses the broken
 * API surface entirely while still encoding the same canonical
 * `qr_identifier` (UUID) the server-side route used to encode. Single source
 * of truth for the payload is preserved: the value passed in here is the
 * same value the destination `/qr/[qrIdentifier]` resolver decodes.
 */
export default function QrCodeClient({
  qrIdentifier,
  passportId,
  size = 88,
}: Props) {
  if (!qrIdentifier) {
    return (
      <div
        role="img"
        aria-label={`QR code unavailable for Hockey Passport ${passportId}`}
        style={{
          width: size,
          height: size,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#041E42',
          fontSize: 12,
          textAlign: 'center',
          padding: 8,
          borderRadius: 6,
          boxSizing: 'border-box',
        }}
      >
        QR unavailable
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#fff',
        borderRadius: 6,
        padding: 4,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <QRCodeSVG
        value={qrIdentifier}
        size={size}
        level="M"
        fgColor="#041E42"
        bgColor="#FFFFFF"
        includeMargin={false}
      />
    </div>
  );
}