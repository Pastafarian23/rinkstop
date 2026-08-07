import Link from 'next/link';
import ActivityBadge from './ActivityBadge';

type EventRow = {
  id: string;
  slug: string;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  price_cents: number | null;
  currency: string;
  capacity: number | null;
  spots_remaining: number | null;
  banner_image_url: string | null;
  registration_url: string | null;
  rink: { name: string; slug: string; city: string | null; province_state: string | null; country: string | null } | null;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtPrice(cents: number | null, currency: string): string {
  if (cents == null) return 'Free';
  const dollars = cents / 100;
  return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)} ${currency}`;
}

function locationLine(rink: EventRow['rink']): string {
  if (!rink) return '';
  return [rink.city, rink.province_state, rink.country].filter(Boolean).join(', ');
}

export default function EventCard({ event }: { event: EventRow }) {
  const soldOut = event.capacity != null && event.spots_remaining != null && event.spots_remaining <= 0;
  const href = `/events/${event.slug}`;

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(13,17,23,0.6)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
    >
      {event.banner_image_url && (
        <div
          style={{
            width: '100%',
            height: '140px',
            backgroundImage: `url(${event.banner_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />
      )}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <ActivityBadge activityType={event.event_type} />
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
          {event.title}
        </h3>
        <div style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span>
            📅 {fmtDate(event.starts_at)} · {fmtTime(event.starts_at)}
          </span>
          {event.rink && (
            <span>
              📍 {event.rink.name}{locationLine(event.rink) ? ` · ${locationLine(event.rink)}` : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <span
            style={{
              color: event.price_cents == null ? '#86efac' : '#fff',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            {fmtPrice(event.price_cents, event.currency)}
          </span>
          {soldOut ? (
            <span style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 600 }}>Sold out</span>
          ) : event.spots_remaining != null && event.capacity != null ? (
            <span style={{ color: '#86efac', fontSize: '12px', fontWeight: 600 }}>
              {event.spots_remaining} / {event.capacity} left
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
