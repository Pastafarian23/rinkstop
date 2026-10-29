'use client';

/**
 * MoneyCtaLink — anchor that fires a tracked event before navigating.
 *
 * Used on the revenue-critical pages (/dataset-license, /advertise,
 * /partner-with-us, /hockey-database). Every money CTA on the site should
 * go through this so we can answer "did anyone click?" — previously these
 * CTAs were untracked, which is why $0 revenue had no diagnostic trail.
 *
 * Props:
 *   eventName — event name (must be allowlisted in /api/track)
 *   props     — extra props recorded with the event
 *   children  — link text
 *   href      — destination (external URLs included)
 *   className / style — presentation passthrough
 *   target / rel     — external link passthrough
 */

import { trackClient } from '@/lib/client-track';

export default function MoneyCtaLink({
  eventName,
  props,
  children,
  href,
  className,
  style,
  target,
  rel,
  ariaLabel,
}: {
  eventName: string;
  props?: Record<string, unknown>;
  children: React.ReactNode;
  href: string;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
  ariaLabel?: string;
}) {
  function onClick() {
    trackClient(eventName, props ?? null);
  }

  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      style={style}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      data-money-cta={eventName}
    >
      {children}
    </a>
  );
}
