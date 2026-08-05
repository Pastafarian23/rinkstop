import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CANONICAL_URL } from '@/lib/constants';
import { COUNTRY_MAP } from '@/lib/country-page';
import EventCard from '@/components/events/EventCard';

function stateLabel(state: string): string {
  return state.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

type EventRow = {
  id: string; slug: string; title: string; event_type: string; starts_at: string; ends_at: string;
  price_cents: number | null; currency: string; capacity: number | null; spots_remaining: number | null;
  banner_image_url: string | null; registration_url: string | null;
  rink: { name: string; slug: string; city: string | null; province_state: string | null; country: string | null } | null;
};

export async function generateMetadata({ params }: { params: Promise<{ country: string; state: string }> }): Promise<Metadata> {
  const { country, state } = await params;
  const countryLabel = COUNTRY_MAP[country] || country;
  const label = stateLabel(state);
  return {
    title: `Hockey Events in ${label}, ${countryLabel} — RinkStop`,
    description: `Upcoming tournaments, camps, clinics, and tryouts at hockey rinks in ${label}, ${countryLabel}.`,
    alternates: { canonical: `${CANONICAL_URL}/events/region/${country}/${state}` },
    openGraph: { title: `Hockey Events in ${label}, ${countryLabel}`, type: 'website' },
  };
}

export default async function EventsInStatePage({ params }: { params: Promise<{ country: string; state: string }> }) {
  const { country, state } = await params;
  const countryLabel = COUNTRY_MAP[country] || country;
  const label = stateLabel(state);

  const { data } = await supabase
    .from('rink_events')
    .select('id, slug, title, event_type, starts_at, ends_at, price_cents, currency, capacity, spots_remaining, banner_image_url, registration_url, rink:rinks(name, slug, city, province_state, country)')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .eq('rink.country', country)
    .eq('rink.province_state', state)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(60);
  const events = (data || []) as unknown as EventRow[];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ marginBottom: '12px', fontSize: '13px', color: '#94a3b8' }}>
        <Link href="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <Link href="/events" style={{ color: '#38bdf8', textDecoration: 'none' }}>Events</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <Link href={`/events/region/${country}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>{countryLabel}</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{label}</span>
      </nav>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
        Hockey Events in {label}, {countryLabel}
      </h1>
      <p style={{ color: '#cbd5e1', fontSize: '15px', marginBottom: '24px', maxWidth: '720px' }}>
        Upcoming tournaments, camps, clinics, and tryouts at hockey rinks in {label}.
      </p>
      {events.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', color: '#94a3b8' }}>
          No upcoming events in {label} yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
