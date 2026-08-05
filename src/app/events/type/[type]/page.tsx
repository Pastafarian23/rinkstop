import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CANONICAL_URL } from '@/lib/constants';
import EventCard from '@/components/events/EventCard';

const TYPE_LABEL: Record<string, string> = {
  tournament: 'Tournaments',
  camp: 'Camps',
  clinic: 'Clinics',
  tryout: 'Tryouts',
  showcase: 'Showcases',
  exhibition: 'Exhibitions',
  lesson_series: 'Lesson Series',
  training: 'Training',
  skills_session: 'Skills Sessions',
};

type EventRow = {
  id: string; slug: string; title: string; event_type: string; starts_at: string; ends_at: string;
  price_cents: number | null; currency: string; capacity: number | null; spots_remaining: number | null;
  banner_image_url: string | null; registration_url: string | null;
  rink: { name: string; slug: string; city: string | null; province_state: string | null; country: string | null } | null;
};

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const label = TYPE_LABEL[type] || type.replace(/-/g, ' ');
  return {
    title: `Hockey ${label} — RinkStop`,
    description: `Upcoming ${label.toLowerCase()} at hockey rinks worldwide.`,
    alternates: { canonical: `${CANONICAL_URL}/events/type/${type}` },
    openGraph: { title: `Hockey ${label}`, type: 'website' },
  };
}

export default async function EventsByTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!TYPE_LABEL[type]) notFound();
  const label = TYPE_LABEL[type];

  const { data } = await supabase
    .from('rink_events')
    .select('id, slug, title, event_type, starts_at, ends_at, price_cents, currency, capacity, spots_remaining, banner_image_url, registration_url, rink:rinks(name, slug, city, province_state, country)')
    .eq('event_type', type)
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
        <span>{label}</span>
      </nav>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
        Hockey {label}
      </h1>
      <p style={{ color: '#cbd5e1', fontSize: '15px', marginBottom: '24px', maxWidth: '720px' }}>
        All upcoming {label.toLowerCase()} at hockey rinks worldwide. Filter by location, skill level, and age on the <Link href={`/events?type=${type}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>all-events page</Link>.
      </p>
      {events.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', color: '#94a3b8' }}>
          No upcoming {label.toLowerCase()} yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}

function notFound() {
  const { notFound: nextNotFound } = require('next/navigation');
  nextNotFound();
}
