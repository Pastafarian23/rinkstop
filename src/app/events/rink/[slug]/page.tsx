import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CANONICAL_URL } from '@/lib/constants';
import { COUNTRY_MAP } from '@/lib/country-page';
import EventCard from '@/components/events/EventCard';

type Rink = { id: string; name: string; slug: string; city: string | null; province_state: string | null; country: string | null };
type EventRow = {
  id: string; slug: string; title: string; event_type: string; starts_at: string; ends_at: string;
  price_cents: number | null; currency: string; capacity: number | null; spots_remaining: number | null;
  banner_image_url: string | null; registration_url: string | null;
  rink: { name: string; slug: string; city: string | null; province_state: string | null; country: string | null } | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: rink } = await supabase
    .from('rinks')
    .select('name, city, province_state, country')
    .eq(isUuid(slug) ? 'id' : 'slug', slug)
    .single();
  if (!rink) return { title: 'Rink Not Found' };
  return {
    title: `Events at ${rink.name} — RinkStop`,
    description: `Upcoming hockey events, tournaments, camps, and tryouts at ${rink.name}${rink.city ? ` in ${rink.city}` : ''}.`,
    alternates: { canonical: `${CANONICAL_URL}/events/rink/${slug}` },
    openGraph: { title: `Events at ${rink.name}`, type: 'website' },
  };
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export default async function EventsAtRinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: rink } = await supabase
    .from('rinks')
    .select('id, name, slug, city, province_state, country')
    .eq(isUuid(slug) ? 'id' : 'slug', slug)
    .single();
  if (!rink) notFound();
  const r = rink as Rink;

  const { data } = await supabase
    .from('rink_events')
    .select('id, slug, title, event_type, starts_at, ends_at, price_cents, currency, capacity, spots_remaining, banner_image_url, registration_url, rink:rinks(name, slug, city, province_state, country)')
    .eq('rink_id', r.id)
    .eq('status', 'published')
    .eq('visibility', 'public')
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
        <Link href={`/directory/rinks/${r.slug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>{r.name}</Link>
      </nav>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
        Events at {r.name}
      </h1>
      <p style={{ color: '#cbd5e1', fontSize: '15px', marginBottom: '24px', maxWidth: '720px' }}>
        Upcoming tournaments, camps, clinics, and tryouts at {r.name}{r.city ? ` in ${r.city}` : ''}{r.country ? `, ${COUNTRY_MAP[r.country] || r.country}` : ''}.
      </p>
      {events.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', color: '#94a3b8' }}>
          No upcoming events at {r.name} yet. Check the <Link href={`/directory/rinks/${r.slug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>rink page</Link> for full programming.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
