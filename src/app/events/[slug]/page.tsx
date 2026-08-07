import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CANONICAL_URL } from '@/lib/constants';
import { COUNTRY_MAP } from '@/lib/country-page';
import ActivityBadge from '@/components/events/ActivityBadge';

type EventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  venue_name: string | null;
  address: string | null;
  price_cents: number | null;
  currency: string;
  early_bird_price_cents: number | null;
  early_bird_until: string | null;
  capacity: number | null;
  spots_remaining: number | null;
  waitlist_enabled: boolean;
  banner_image_url: string | null;
  registration_url: string | null;
  registration_method: string | null;
  hotel_partner_url: string | null;
  hotel_discount_code: string | null;
  status: string;
  rink_id: string;
  rink: { name: string; slug: string; city: string | null; province_state: string | null; country: string | null; cover_photo_url: string | null } | null;
};

type Division = {
  id: string;
  name: string;
  birth_year_min: number | null;
  birth_year_max: number | null;
  skill_level: string;
  gender: string;
  price_cents: number | null;
  capacity: number | null;
  spots_remaining: number | null;
  status: string;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: event } = await supabase
    .from('rink_events')
    .select('title, description, status')
    .eq('slug', slug)
    .in('status', ['published', 'cancelled', 'completed'])
    .eq('visibility', 'public')
    .single();
  if (!event) return { title: 'Event Not Found' };
  const desc = (event.description || '').slice(0, 160);
  return {
    title: `${event.title} — RinkStop`,
    description: desc,
    alternates: { canonical: `${CANONICAL_URL}/events/${slug}` },
    robots: { index: event.status !== 'draft', follow: true },
    openGraph: { title: event.title, description: desc, type: 'website', url: `${CANONICAL_URL}/events/${slug}`, siteName: 'RinkStop' },
    twitter: { card: 'summary_large_image' },
  };
}

function fmtDateRange(starts: string, ends: string): string {
  const s = new Date(starts);
  const e = new Date(ends);
  const dateFmt: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  if (s.toDateString() === e.toDateString()) {
    return `${s.toLocaleDateString('en-US', dateFmt)} · ${s.toLocaleTimeString('en-US', timeFmt)} – ${e.toLocaleTimeString('en-US', timeFmt)}`;
  }
  return `${s.toLocaleDateString('en-US', dateFmt)} ${s.toLocaleTimeString('en-US', timeFmt)} – ${e.toLocaleDateString('en-US', dateFmt)} ${e.toLocaleTimeString('en-US', timeFmt)}`;
}

function fmtPrice(cents: number | null, currency: string): string {
  if (cents == null) return 'Free';
  const d = cents / 100;
  return `$${d.toFixed(d % 1 === 0 ? 0 : 2)} ${currency}`;
}

function icsFor(event: EventRow): string {
  const dt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z?$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RinkStop//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@rinkstop.com`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(event.starts_at)}`,
    `DTEND:${dt(event.ends_at)}`,
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, ' ').slice(0, 500)}`,
    `LOCATION:${(event.venue_name || event.rink?.name || '').replace(/\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: event, error } = await supabase
    .from('rink_events')
    .select('id, slug, title, subtitle, description, event_type, starts_at, ends_at, timezone, registration_opens_at, registration_closes_at, venue_name, address, price_cents, currency, early_bird_price_cents, early_bird_until, capacity, spots_remaining, waitlist_enabled, banner_image_url, registration_url, registration_method, hotel_partner_url, hotel_discount_code, status, rink_id, rink:rinks(name, slug, city, province_state, country, cover_photo_url)')
    .eq('slug', slug)
    .in('status', ['published', 'cancelled', 'completed'])
    .eq('visibility', 'public')
    .single();

  if (error || !event) notFound();
  const e = event as unknown as EventRow;

  const { data: divisions } = await supabase
    .from('event_divisions')
    .select('id, name, birth_year_min, birth_year_max, skill_level, gender, price_cents, capacity, spots_remaining, status')
    .eq('event_id', e.id)
    .order('sort_order', { ascending: true });

  const divs = (divisions || []) as Division[];

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    startDate: e.starts_at,
    endDate: e.ends_at,
    eventStatus: `https://schema.org/Event${e.status === 'cancelled' ? 'Cancelled' : 'Scheduled'}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `${CANONICAL_URL}/events/${e.slug}`,
    ...(e.banner_image_url ? { image: e.banner_image_url } : {}),
    description: e.description || undefined,
    location: {
      '@type': 'Place',
      name: e.venue_name || e.rink?.name || 'Rink',
      address: e.address || (e.rink ? {
        '@type': 'PostalAddress',
        addressLocality: e.rink.city,
        addressRegion: e.rink.province_state,
        addressCountry: e.rink.country,
      } : undefined),
    },
    organizer: e.rink ? { '@type': 'Organization', name: e.rink.name, url: `${CANONICAL_URL}/directory/rinks/${e.rink.slug}` } : undefined,
    offers: e.price_cents != null ? {
      '@type': 'Offer',
      price: (e.price_cents / 100).toFixed(2),
      priceCurrency: e.currency,
      url: e.registration_url || `${CANONICAL_URL}/events/${e.slug}`,
      availability: e.spots_remaining != null && e.spots_remaining > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    } : undefined,
    subEvent: divs.length > 0 ? divs.map((d) => ({
      '@type': 'Event',
      name: d.name,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      offers: d.price_cents != null ? {
        '@type': 'Offer',
        price: (d.price_cents / 100).toFixed(2),
        priceCurrency: e.currency,
      } : undefined,
    })) : undefined,
  };

  const isCancelled = e.status === 'cancelled';
  const isCompleted = e.status === 'completed';

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }} />

      {isCancelled && (
        <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid #dc2626', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', color: '#fca5a5', fontWeight: 600 }}>
          ⚠️ This event has been cancelled. Registration is closed.
        </div>
      )}
      {isCompleted && (
        <div style={{ background: 'rgba(148,163,184,0.15)', border: '1px solid #94a3b8', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', color: '#cbd5e1', fontWeight: 600 }}>
          This event has ended.
        </div>
      )}

      <nav style={{ marginBottom: '12px', fontSize: '13px', color: '#94a3b8' }}>
        <Link href="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <Link href="/events" style={{ color: '#38bdf8', textDecoration: 'none' }}>Events</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{e.title}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div>
          {e.banner_image_url && (
            <img src={e.banner_image_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.04)' }} />
          )}
          <ActivityBadge activityType={e.event_type} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '12px 0' }}>{e.title}</h1>
          {e.subtitle && <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '16px' }}>{e.subtitle}</p>}

          <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#cbd5e1', fontSize: '15px' }}>
              <div>📅 <strong style={{ color: '#fff' }}>{fmtDateRange(e.starts_at, e.ends_at)}</strong></div>
              {e.rink && (
                <div>
                  📍 <Link href={`/directory/rinks/${e.rink.slug}`} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>{e.rink.name}</Link>
                  {e.rink.city && <span style={{ color: '#94a3b8' }}> · {e.rink.city}{e.rink.province_state && `, ${e.rink.province_state}`}{e.rink.country && `, ${COUNTRY_MAP[e.rink.country] || e.rink.country}`}</span>}
                </div>
              )}
              {e.address && <div style={{ color: '#94a3b8', fontSize: '13px' }}>{e.address}</div>}
              {e.registration_opens_at && (
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>Registration opens: {new Date(e.registration_opens_at).toLocaleString('en-US')}</div>
              )}
            </div>
          </div>

          {e.description && (
            <section style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px', color: '#cbd5e1', fontSize: '15px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {e.description}
            </section>
          )}

          {divs.length > 0 && (
            <section style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
              <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Divisions</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px' }}>Division</th>
                    <th style={{ padding: '8px 4px' }}>Year</th>
                    <th style={{ padding: '8px 4px' }}>Skill</th>
                    <th style={{ padding: '8px 4px' }}>Gender</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Spots</th>
                  </tr>
                </thead>
                <tbody>
                  {divs.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 4px', color: '#fff' }}>{d.name}</td>
                      <td style={{ padding: '8px 4px', color: '#cbd5e1' }}>{d.birth_year_min || '—'}–{d.birth_year_max || '—'}</td>
                      <td style={{ padding: '8px 4px', color: '#cbd5e1', textTransform: 'capitalize' }}>{d.skill_level}</td>
                      <td style={{ padding: '8px 4px', color: '#cbd5e1', textTransform: 'capitalize' }}>{d.gender}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', color: '#fff' }}>{fmtPrice(d.price_cents, e.currency)}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', color: d.spots_remaining != null && d.spots_remaining > 0 ? '#86efac' : '#fca5a5' }}>
                        {d.spots_remaining != null ? `${d.spots_remaining}${d.capacity ? `/${d.capacity}` : ''}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {e.hotel_partner_url && (
            <section style={{ background: 'rgba(13,17,23,0.6)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px', color: '#cbd5e1', fontSize: '14px' }}>
              🏨 <a href={e.hotel_partner_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>Book a hotel with our partner block</a>
              {e.hotel_discount_code && <span> · Code: <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{e.hotel_discount_code}</code></span>}
            </section>
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', position: 'sticky', top: '20px' }}>
            {e.early_bird_price_cents != null && e.early_bird_until && new Date(e.early_bird_until) > new Date() ? (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#86efac', fontSize: '13px', fontWeight: 600 }}>Early bird</div>
                <div style={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}>{fmtPrice(e.early_bird_price_cents, e.currency)}</div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>until {new Date(e.early_bird_until).toLocaleDateString('en-US')}</div>
              </div>
            ) : (
              <div style={{ color: e.price_cents == null ? '#86efac' : '#fff', fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
                {fmtPrice(e.price_cents, e.currency)}
              </div>
            )}
            {e.spots_remaining != null && e.capacity != null && (
              <div style={{ color: e.spots_remaining > 0 ? '#86efac' : '#fca5a5', fontSize: '14px', marginBottom: '12px' }}>
                {e.spots_remaining > 0 ? `${e.spots_remaining} of ${e.capacity} spots left` : 'Sold out'}
              </div>
            )}
            {e.registration_url && !isCancelled && (
              <a href={e.registration_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', background: '#38bdf8', color: '#0f172a', padding: '12px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', textDecoration: 'none', marginBottom: '8px' }}>
                Register →
              </a>
            )}
            <a
              href={`/api/events/${e.slug}/ics`}
              style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: '#cbd5e1', padding: '10px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none' }}
            >
              📅 Add to calendar
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
