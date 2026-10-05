'use client';

import { useEffect, useState } from 'react';
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
   * Pixel size of the rendered SVG. If omitted, the QR auto-sizes to the
   * viewport: 88px on phones (the original <img> width), 168px on tablets,
   * 240px on desktop. The whole card is ~280px wide so going larger starts
   * to compete with the holder name — 240px is the largest size that keeps
   * the row balanced on a 1440px viewport.
   */
  size?: number;
  /**
   * If true, ignore the `size` prop and pick a responsive size based on the
   * current viewport width. The width is measured client-side because there
   * is no SSR viewport API. On the very first paint we render at `size` (or
   * 88px) to avoid a flash of zero-sized content; then we swap in the
   * measured size once `useEffect` runs.
   *
   * Tiers (2026-10-05):
   *   <640px   →  96px   (small mobile)
   *   <1024px  → 144px   (tablet / small laptop)
   *   <1440px  → 192px   (desktop)
   *   ≥1440px  → 240px   (wide desktop)
   */
  responsive?: boolean;
}

const RESPONSIVE_TIER = (vw: number): number => {
  if (vw < 640) return 96;
  if (vw < 1024) return 144;
  if (vw < 1440) return 192;
  return 240;
};

export default function QrCodeClient({
  qrIdentifier,
  passportId,
  size = 88,
  responsive = false,
}: Props) {
  const [resolvedSize, setResolvedSize] = useState<number>(size);

  useEffect(() => {
    if (!responsive || typeof window === 'undefined') return;
    const compute = () => setResolvedSize(RESPONSIVE_TIER(window.innerWidth));
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [responsive]);

  if (!qrIdentifier) {
    return (
      <div
        role="img"
        aria-label={`QR code unavailable for Hockey Passport ${passportId}`}
        style={{
          width: resolvedSize,
          height: resolvedSize,
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
        width: resolvedSize,
        height: resolvedSize,
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
        size={resolvedSize}
        level="M"
        fgColor="#041E42"
        bgColor="#FFFFFF"
        includeMargin={false}
      />
    </div>
  );
}
