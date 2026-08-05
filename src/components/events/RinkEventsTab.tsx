/**
 * Rink page "Programming & Events" tab — upcoming events section.
 *
 * Server component. Renders published, public events starting within ~90 days
 * (so the section isn't perpetually empty for slow rinks). Cancelled events
 * show a badge; completed events are filtered out.
 *
 * Reads from `rink_events` (RLS: status='published' AND visibility='public').
 */

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ActivityBadge from './ActivityBadge';

type EventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string;
  banner_image_url: string | null;
  price_cents: number | null;
  currency: string;
  capacity: number | null;
  spots_remaining: number | null;
  status: string;
  registration_url: string | null;
  registration_method: string | null;
};

const FUTURE_WINDOW_DAYS = 90;

function formatEventDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { date, time };
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents == null) return 'Free';
  const dollars = cents / 100;
  return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)} ${currency}`;
}

export default async function RinkEventsTab({ rinkId, rinkSlug }: { rinkId: string; rinkSlug: string }) {
  // Window: 7 days ago (so in-progress events still show) → 90 days from now.
  const now = new Date();
  const pastCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const futureCutoff = new Date(now.getTime() + FUTURE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('rink_events')
    .select('id, slug, title, subtitle, description, event_type, starts_at, ends_at, banner_image_url, price_cents, currency, capacity, spots_remaining, status, registration_url, registration_method')
    .eq('rink_id', rinkId)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('starts_at', pastCutoff.toISOString())
    .lte('starts_at', futureCutoff.toISOString())
    .order('starts_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[rink-debug] RinkEventsTab fetch failed for rink', rinkId, error.message);
    return null;
  }

  const events = (data || []) as EventRow[];

  if (events.length === 0) {
    // Don't show an empty state if the parent already showed one for programming —
    // this empty state would be redundant. Return null and the parent layout
    // will simply not render this section.
    return null;
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', margin: 0 }}>
          Upcoming events
        </h2>
        <Link
          href={`/events/rink/${rinkSlug}`}
          style={{ color: '#38bdf8', fontSize: '13px', textDecoration: 'none' }}
        >
          See all events at this rink →
        </Link>
      </div>
      {events.map((e) => {
        const { date, time } = formatEventDate(e.starts_at);
        const isCancelled = e.status === 'cancelled';
        const href = `/events/${e.slug}`;
        return (
          <Link
            key={e.id}
            href={href}
            style={{
              display: 'grid',
              gridTemplateColumns: e.banner_image_url ? '120px 1fr auto' : '1fr auto',
              gap: '16px',
              alignItems: 'center',
              background: 'rgba(13,17,23,0.6)',
              padding: '16px 20px',
              borderRadius: '12px',
              border: `1px solid ${isCancelled ? '#dc2626' : 'var(--border)'}`,
              textDecoration: 'none',
              opacity: isCancelled ? 0.65 : 1,
            }}
          >
            {e.banner_image_url && (
              <img
                src={e.banner_image_url}
                alt=""
                style={{
                  width: 120,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                }}
                loading="lazy"
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <ActivityBadge activityType={e.event_type} />
                {isCancelled && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(220,38,38,0.15)',
                      border: '1px solid #dc2626',
                      color: '#fca5a5',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    CANCELLED
                  </span>
                )}
              </div>
              <h3
                style={{
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 600,
                  margin: 0,
                  textDecoration: isCancelled ? 'line-through' : 'none',
                }}
              >
                {e.title}
              </h3>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                {date} · {time}
              </span>
              {e.spots_remaining != null && e.capacity != null && !isCancelled && (
                <span
                  style={{
                    color: e.spots_remaining > 0 ? '#86efac' : '#fca5a5',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {e.spots_remaining > 0
                    ? `${e.spots_remaining} of ${e.capacity} spots left`
                    : 'Sold out'}
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '6px',
              }}
            >
              <span
                style={{
                  color: e.price_cents == null ? '#86efac' : '#fff',
                  fontWeight: 600,
                  fontSize: '15px',
                }}
              >
                {formatPrice(e.price_cents, e.currency)}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#38bdf8',
                  fontWeight: 600,
                }}
              >
                Details →
              </span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
