import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import EventCard from '@/components/events/EventCard';
import { CANONICAL_URL } from '@/lib/constants';
import { COUNTRY_MAP } from '@/lib/country-page';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const revalidate = 300;

const EVENT_TYPE_LABEL: Record<string, string> = {
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

type SP = {
  country?: string;
  state?: string;
  type?: string;
  skill?: string;
  gender?: string;
  age_min?: string;
  age_max?: string;
  free?: string;
  has_spots?: string;
  q?: string;
};

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

const ITEMS_PER_PAGE = 12;

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const countryLabel = sp.country ? COUNTRY_MAP[sp.country as keyof typeof COUNTRY_MAP] || sp.country : null;
  const typeLabel = sp.type ? EVENT_TYPE_LABEL[sp.type] || sp.type : null;
  const parts: string[] = [];
  if (typeLabel) parts.push(typeLabel);
  if (sp.state) parts.push(`in ${sp.state}`);
  if (countryLabel) parts.push(countryLabel);
  const head = parts.length ? parts.join(' ') : 'Hockey Events, Tournaments, Camps & Tryouts';
  return {
    title: `${head} — RinkStop`,
    description: `Browse hockey ${(typeLabel || 'events, tournaments, camps, and tryouts').toLowerCase()} ${sp.country ? 'in ' + countryLabel : 'worldwide'}. Real events from claimed rinks. Filter by date, skill level, age, and gender.`,
    alternates: { canonical: `${CANONICAL_URL}/events` },
    robots: { index: true, follow: true },
    openGraph: withDefaultOg({ title: `${head} — RinkStop`, type: 'website', url: `${CANONICAL_URL}/events`, siteName: 'RinkStop' }),
    twitter: { card: 'summary_large_image' },
  };
}

async function getEvents(sp: SP, page: number) {
  let q = supabase
    .from('rink_events')
    .select('id, slug, title, event_type, starts_at, ends_at, price_cents, currency, capacity, spots_remaining, banner_image_url, registration_url, rink:rinks(name, slug, city, province_state, country)')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .range(page * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE + ITEMS_PER_PAGE - 1);

  if (sp.country) q = q.eq('rink.country', sp.country);
  if (sp.state) q = q.eq('rink.province_state', sp.state);
  if (sp.type) q = q.eq('event_type', sp.type);
  if (sp.free === '1') q = q.is('price_cents', null);
  if (sp.has_spots === '1') q = q.gt('spots_remaining', 0);
  if (sp.q) q = q.ilike('title', `%${sp.q}%`);

  return q;
}

async function getCountriesWithEvents() {
  const { data } = await supabase
    .from('rink_events')
    .select('rink:rinks(country)')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .gte('starts_at', new Date().toISOString())
    .not('rink.country', 'is', null);
  const counts = new Map<string, number>();
  for (const r of data || []) {
    const c = (r as any).rink?.country;
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
}

export default async function EventsLandingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = 0;
  const [eventsRes, countries] = await Promise.all([getEvents(sp, page), getCountriesWithEvents()]);
  const events = (eventsRes.data || []) as unknown as EventRow[];

  const filtersActive = Boolean(sp.country || sp.type || sp.state || sp.free || sp.has_spots || sp.q);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <Breadcrumbs />
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
        Hockey Events Near You
      </h1>
      <p style={{ color: '#cbd5e1', fontSize: '15px', marginBottom: '24px', maxWidth: '720px' }}>
        Tournaments, camps, clinics, tryouts, and showcases from claimed rinks. Filter by date, location, type, and skill level. Every event links to its rink page.
      </p>

      <FilterBar sp={sp} />

      {countries.length > 0 && !filtersActive && (
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Browse by country
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {countries.map(([code, n]) => (
              <Link
                key={code}
                href={`/events?country=${encodeURIComponent(code)}`}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: '#cbd5e1', padding: '6px 12px', borderRadius: '999px', fontSize: '13px', textDecoration: 'none' }}
              >
                {COUNTRY_MAP[code as keyof typeof COUNTRY_MAP] || code} <span style={{ color: '#64748b' }}>· {n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {events.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', color: '#94a3b8' }}>
          No events match your filters yet.{' '}
          {sp.country && <>Try removing the country filter, or </>}
          <Link href="/events" style={{ color: '#38bdf8', textDecoration: 'none' }}>clear all filters</Link>.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function Breadcrumbs() {
  return (
    <nav style={{ marginBottom: '12px', fontSize: '13px', color: '#94a3b8' }}>
      <Link href="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>Home</Link>
      <span style={{ margin: '0 6px' }}>/</span>
      <span>Events</span>
    </nav>
  );
}

function FilterBar({ sp }: { sp: SP }) {
  return (
    <form
      method="GET"
      action="/events"
      style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', padding: '12px', background: 'rgba(13,17,23,0.6)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center' }}
    >
      <input
        type="search"
        name="q"
        defaultValue={sp.q || ''}
        placeholder="Search event title…"
        style={{ flex: 1, minWidth: '180px', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
      />
      <select name="country" defaultValue={sp.country || ''} style={selectStyle}>
        <option value="">All countries</option>
        {Object.entries(COUNTRY_MAP).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
      <select name="type" defaultValue={sp.type || ''} style={selectStyle}>
        <option value="">All types</option>
        {Object.entries(EVENT_TYPE_LABEL).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#cbd5e1', fontSize: '13px', padding: '0 8px' }}>
        <input type="checkbox" name="free" value="1" defaultChecked={sp.free === '1'} /> Free
      </label>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#cbd5e1', fontSize: '13px', padding: '0 8px' }}>
        <input type="checkbox" name="has_spots" value="1" defaultChecked={sp.has_spots === '1'} /> Spots open
      </label>
      <button type="submit" style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
        Filter
      </button>
      {(sp.country || sp.type || sp.state || sp.free || sp.has_spots || sp.q) && (
        <Link href="/events" style={{ color: '#94a3b8', fontSize: '13px', textDecoration: 'none', padding: '8px' }}>Clear</Link>
      )}
    </form>
  );
}

const selectStyle: React.CSSProperties = { padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '14px' };
