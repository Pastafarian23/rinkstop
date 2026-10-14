'use client';

import { useState } from 'react';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError'> {
  /** Element rendered in place of the <img> when the load fails. */
  fallback?: React.ReactNode;
  /** Optional label used by the default fallback. */
  label?: string;
}

/**
 * SafeImage — a regular <img> that hides itself (or renders a fallback)
 * when the URL fails to load. Used for rink cover photos whose
 * `cover_photo_url` is a live Google Places photo URL that can break
 * when Google rotates the photo reference.
 *
 * 2026-10-14 (Arnel feedback): the previous version of the rink page
 * rendered a plain <img src={cover_photo_url}> with no error handler.
 * When Google's photo URL 404s, the browser shows a broken-image
 * glyph. This wrapper hides the broken <img> on error and shows a
 * styled placeholder instead.
 *
 * Defaults to a simple grey box with the alt text, so the page
 * still has a hero-sized element for layout stability — no
 * layout shift when the image fails.
 */
export function SafeImage({ fallback, label, alt, src, ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored || !src) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        role="img"
        aria-label={typeof alt === 'string' ? alt : label || 'image unavailable'}
        style={{
          width: '100%',
          maxHeight: 400,
          minHeight: 160,
          borderRadius: 12,
          marginBottom: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        {label || (typeof alt === 'string' ? alt : 'Photo unavailable')}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
