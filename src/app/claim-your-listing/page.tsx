import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { trackPageView } from '@/lib/analytics';
import { ClaimButton } from './ClaimButton';

export const metadata: Metadata = {
  title: 'Claim Your Listing on RinkStop',
  description:
    "Search for your rink or team's RinkStop listing and claim it. Verified listings get a checkmark, lead capture, and featured rotation.",
  alternates: { canonical: 'https://rinkstop.com/claim-your-listing' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Claim Your Listing on RinkStop',
    description: "Search for your rink or team and claim your listing. Verified listings get a checkmark, lead capture, and featured rotation.",
    url: 'https://rinkstop.com/claim-your-listing',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Claim Your Listing on RinkStop',
    description: 'Search for your rink or team and claim your listing.',
  },
};

export const dynamic = 'force-dynamic';

type ClaimType = 'rink' | 'team' | 'player';

interface ClaimResult {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  type: ClaimType;
  has_claim: boolean;
  claim_status: string | null;
  // Player-only fields
  is_self_managed?: boolean;
  nationality?: string | null;
  birth_year?: number | null;
}

async function searchEntities(query: string, type: ClaimType): Promise<ClaimResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Pick the right table + columns based on type. We use ilike with %q% for
  // the name column. For rinks we also match city (operators often search by
  // city name). For teams we match city. For players we match first/last name.
  type RowShape = {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    // Player extras:
    user_id?: string | null;
    nationality?: string | null;
    birth_date?: string | null;
  };
  let rows: RowShape[] = [];
  if (type === 'rink') {
    const { data, error } = await supabaseAdmin
      .from('rinks')
      .select('id, slug, name, city, country, is_active')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
      .eq('is_active', true)
      .limit(20);
    if (error || !data) return [];
    rows = data as RowShape[];
  } else if (type === 'team') {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('id, slug, name, city, country')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
      .limit(20);
    if (error || !data) return [];
    rows = data as RowShape[];
  } else if (type === 'player') {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('id, slug, first_name, last_name, nationality, birth_date, user_id, is_active')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .eq('is_active', true)
      .limit(20);
    if (error || !data) return [];
    rows = (data || []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.slug,
      city: null,
      country: p.nationality, // display the country code in the city slot to keep the shape
      user_id: p.user_id,
      nationality: p.nationality,
      birth_date: p.birth_date,
    }));
  }

  // Get the claim status for each returned entity. claims.claim_type must
  // match the selected entity type (rink/team) because the claims endpoint
  // only accepts those two types.
  const entityIds = rows.map((r) => r.id);
  const { data: claims } = await supabaseAdmin
    .from('claims')
    .select('entity_id, status, claim_type')
    .eq('claim_type', type)
    .in('entity_id', entityIds);

  const claimByEntityId = new Map<string, string>();
  for (const c of claims || []) {
    if (!claimByEntityId.has(c.entity_id)) {
      claimByEntityId.set(c.entity_id, c.status);
    }
  }

  return rows.map((r) => {
    const out: ClaimResult = {
      id: r.id,
      slug: r.slug,
      name: r.name,
      city: r.city,
      country: r.country,
      type,
      has_claim: claimByEntityId.has(r.id),
      claim_status: claimByEntityId.get(r.id) || null,
    };
    if (type === 'player') {
      out.is_self_managed = !!r.user_id;
      out.nationality = r.nationality ?? null;
      out.birth_year = r.birth_date ? Number(r.birth_date.slice(0, 4)) : null;
    }
    return out;
  });
}

/**
 * Featured claimable listings — shown when the user lands on /claim-your-listing
 * without typing a query. Aims to convert 162 monthly anonymous visitors (per
 * analytics_events) into actual claim_started clicks.
 *
 * Picks 3 unclaimed rinks, 3 unclaimed teams, and 3 unclaimed players — in
 * markets where SEO traffic actually lands (Chicago, Toronto, Boston, NY, LA,
 * plus one European flavor).
 *
 * Filtering: rinks/teams/players whose slug is NOT in any approved claim row
 * for that claim_type. We use a server-side NOT IN subquery via supabaseAdmin.
 *
 * Failure modes are handled here too: queries that fail return null and the
 * caller renders a polite "search above" message instead.
 */
async function loadFeaturedClaimable(): Promise<{
  rinks: ClaimResult[]; teams: ClaimResult[]; players: ClaimResult[];
} | null> {
  // Curated seed cities that get SEO traffic for "ice rink [city]" / "hockey
  // teams [city]" / "hockey players [city]" searches.
  const FEATURED_CITIES = [
    'Chicago', 'Toronto', 'Boston', 'New York', 'Los Angeles',
    'Detroit', 'Montreal', 'Pittsburgh', 'Edmonton', 'Vancouver',
  ];

  try {
    const [rinkRes, teamRes, playerRes] = await Promise.all([
      supabaseAdmin
        .from('rinks')
        .select('id, slug, name, city, country, state_province')
        .eq('is_active', true)
        .is('deactivated_at', null)
        .in('city', FEATURED_CITIES)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('teams')
        .select('id, slug, name, city, country, state_province')
        .eq('is_active', true)
        .is('deactivated_at', null)
        .in('city', FEATURED_CITIES)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('players')
        .select('id, slug, first_name, last_name, nationality')
        .order('updated_at', { ascending: false })
        .limit(20),
    ]);

    // Filter out already-claimed ones via existing claims table.
    async function filterUnclaimed<T extends { id: string }>(rows: T[], kind: 'rink' | 'team' | 'player'): Promise<T[]> {
      if (!rows || rows.length === 0) return [];
      const ids = rows.map((r) => r.id);
      const { data: claimedRows } = await supabaseAdmin
        .from('claims')
        .select('entity_id')
        .eq('claim_type', kind)
        .eq('status', 'approved')
        .in('entity_id', ids);
      const claimed = new Set((claimedRows ?? []).map((r: any) => r.entity_id));
      return rows.filter((r) => !claimed.has(r.id));
    }

    const rinks = await filterUnclaimed(rinkRes.data ?? [], 'rink');
    const teams = await filterUnclaimed(teamRes.data ?? [], 'team');
    const players = await filterUnclaimed(playerRes.data ?? [], 'player');

    const toClaimResult = (r: any, kind: 'rink' | 'team' | 'player'): ClaimResult => ({
      id: r.id,
      type: kind,
      name: kind === 'player'
        ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Player'
        : r.name,
      slug: r.slug,
      city: r.city ?? null,
      country: kind === 'player' ? (r.nationality ?? null) : (r.country ?? null),
      // We don't re-fetch claim-status for each result card here; this is a teaser
      // view, the per-card CTA falls through to /dashboard/claims which does
      // the full state resolution server-side. has_claim=false is conservative
      // (the worst case: user clicks "Claim" on something already claimed and
      // gets a graceful "already taken" message on the claim form).
      has_claim: false,
      claim_status: null,
      is_self_managed: false,
    });

    return {
      rinks: rinks.slice(0, 3).map((r: any) => toClaimResult(r, 'rink')),
      teams: teams.slice(0, 3).map((r: any) => toClaimResult(r, 'team')),
      players: players.slice(0, 3).map((r: any) => toClaimResult(r, 'player')),
    };
  } catch (e) {
    console.error('[claim-your-listing] featured claimable load failed:', e);
    return null;
  }
}

export default async function ClaimYourListingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type: typeParam } = await searchParams;
  const query = (q || '').trim();
  // Validate the type param. Default to rink if missing or invalid.
  const type: ClaimType =
    typeParam === 'team' || typeParam === 'player' ? typeParam : 'rink';
  const results = query.length >= 2 ? await searchEntities(query, type) : [];

  // Featured claimable listings — shown when the user lands with an empty
  // query so they see what claimable looks like. SEO entry point.
  // Empty result gets rendered as a no-claimable section with a generic hint
  // (this is rare; the rink/team/player tables always have unclaimed entries).
  const featuredClaimable = query.length < 2 ? await loadFeaturedClaimable() : null;

  // Server-side analytics: track this page view with the search query
  try {
    await trackPageView({
      name: 'claim_search_viewed',
      pathname: '/claim-your-listing',
      props: {
        query_length: query.length,
        result_count: results.length,
      },
    });
  } catch {
    // Never let analytics break the page
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
        padding: '3rem 1.5rem 4rem',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', letterSpacing: '0.18em', color: '#FFB81C', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.75rem' }}>
            For Rink Operators & Team Administrators
          </div>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              fontFamily: '"Bebas Neue", Impact, sans-serif',
              letterSpacing: '0.02em',
              lineHeight: 1.1,
            }}
          >
            Claim Your Listing
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
            Search for your rink or team below. Claiming requires a Verified Hockey Identity or other paid plan — browse the directory is always free.
          </p>
        </div>

        {/* Type tabs — pick which entity type to search */}
        <nav
          aria-label="Entity type"
          style={{
            display: 'flex',
            gap: '0.25rem',
            marginBottom: '1.25rem',
            background: '#0a0a0a',
            border: '1px solid #1e1e1e',
            borderRadius: 10,
            padding: '0.25rem',
            width: 'fit-content',
            margin: '0 auto 1.5rem',
          }}
        >
          <TypeTab href={`/claim-your-listing${query ? `?q=${encodeURIComponent(query)}&type=rink` : '?type=rink'}`} label="Rinks" active={type === 'rink'} />
          <TypeTab href={`/claim-your-listing${query ? `?q=${encodeURIComponent(query)}&type=team` : '?type=team'}`} label="Teams" active={type === 'team'} />
          <TypeTab href={`/claim-your-listing${query ? `?q=${encodeURIComponent(query)}&type=player` : '?type=player'}`} label="Players" active={type === 'player'} />
        </nav>

        {/* Search box */}
        <form action="/claim-your-listing" method="GET" style={{ marginBottom: '2rem' }}>
          <input type="hidden" name="type" value={type} />
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              background: '#0f0f0f',
              border: '1px solid #1e1e1e',
              borderRadius: 12,
              padding: '0.5rem',
            }}
          >
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Type your rink or team name or city…"
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '1rem',
                padding: '0.65rem 0.75rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#C8102E',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0.65rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              Search
            </button>
          </div>
        </form>

        {/* Results */}
        {query.length === 0 ? (
          <EmptyState />
        ) : query.length < 2 ? (
          <div
            style={{
              background: '#0f0f0f',
              border: '1px solid #1e1e1e',
              borderRadius: 12,
              padding: '1.5rem',
              textAlign: 'center',
              color: '#9ca3af',
            }}
          >
            Type at least 2 characters to search.
          </div>
        ) : results.length === 0 ? (
          query.length < 2 ? (
            <FeaturedClaimableSection
              featured={featuredClaimable}
              fallback={query}
            />
          ) : (
            <NoResults query={query} />
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              {results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
            </div>
            {results.map((result) => (
              <RinkResultCard key={result.id} rink={result} query={query} />
            ))}
          </div>
        )}
        {/* Why claim? */}
        <div
          style={{
            marginTop: '3rem',
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '1.5rem 1.75rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 1rem 0',
              fontFamily: '"Bebas Neue", Impact, sans-serif',
              letterSpacing: '0.04em',
            }}
          >
            Why Claim Your Listing?
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <BenefitRow icon="📍" text="Appear in search results for your city, state, and country" />
            <BenefitRow icon="📩" text="Receive direct messages from coaches, parents, and players" />
            <BenefitRow icon="🚀" text="Claim your listing with a Verified Hockey Identity or organization plan" />
            <BenefitRow icon="✅" text="Verified checkmark builds trust with players and parents" />
          </ul>
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #1e1e1e' }}>
            <Link
              href="/pricing"
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.1rem',
                background: '#FFB81C',
                color: '#041E42',
                fontWeight: 700,
                fontSize: '0.9rem',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              See plans →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        color: '#9ca3af',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.5rem' }}>
        Find your rink
      </div>
      <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
        Type your rink name or city in the box above. We have 1,900+ rinks in the directory.
      </div>
    </div>
  );
}

/**
 * FeaturedClaimableSection — shown when a visitor lands on /claim-your-listing
 * with an empty query. Renders 3 unclaimed rinks + 3 unclaimed teams + 3
 * unclaimed players from markets known to drive organic SEO traffic.
 *
 * Each row is a slim "Claim this [name]" link that the user can click to
 * land on the existing /dashboard/claims flow. The whole point: give visitors
 * a concrete first action without forcing them to type.
 */
function FeaturedClaimableSection({
  featured,
  fallback,
}: {
  featured: { rinks: ClaimResult[]; teams: ClaimResult[]; players: ClaimResult[] } | null;
  fallback: string;
}) {
  const nothing = !featured || (
    featured.rinks.length === 0 && featured.teams.length === 0 && featured.players.length === 0
  );

  if (nothing) {
    return (
      <div style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12,
        padding: '1.5rem', textAlign: 'center', color: '#9ca3af',
      }}>
        Type a rink, team, or player name above. Even 2 characters will start a search.
      </div>
    );
  }

  const claimHref = (kind: string, id: string, name: string) =>
    `/login?redirect_url=${encodeURIComponent(`/dashboard/claims?entity=${kind}&id=${id}&name=${encodeURIComponent(name)}`)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
      <p style={{
        color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.25rem',
      }}>
        Or pick from recently unclaimed listings — claim yours in 60 seconds.
      </p>

      {featured!.rinks.length > 0 && (
        <FeaturedGroup
          heading="Rinks"
          items={featured!.rinks.map((r) => ({
            id: r.id,
            name: r.name,
            sub: [r.city, r.country].filter(Boolean).join(', '),
            href: claimHref('rink', r.id, r.name),
          }))}
        />
      )}
      {featured!.teams.length > 0 && (
        <FeaturedGroup
          heading="Teams"
          items={featured!.teams.map((r) => ({
            id: r.id,
            name: r.name,
            sub: [r.city, r.country].filter(Boolean).join(', '),
            href: claimHref('team', r.id, r.name),
          }))}
        />
      )}
      {featured!.players.length > 0 && (
        <FeaturedGroup
          heading="Players"
          items={featured!.players.map((r) => ({
            id: r.id,
            name: r.name,
            sub: r.country || '',
            href: claimHref('player', r.id, r.name),
          }))}
        />
      )}
    </div>
  );
}

function FeaturedGroup({
  heading,
  items,
}: {
  heading: string;
  items: Array<{ id: string; name: string; sub: string; href: string }>;
}) {
  return (
    <div>
      <h3 style={{
        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'rgba(255,184,28,0.85)', margin: '0 0 0.5rem', fontWeight: 700,
      }}>
        {heading}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 10,
              padding: '0.7rem 1rem', textDecoration: 'none', color: '#fff',
              fontSize: '0.92rem', fontWeight: 600,
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{it.name}</span>
              {it.sub && (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{it.sub}</span>
              )}
            </div>
            <span style={{
              padding: '0.4rem 0.8rem', background: '#FFB81C', color: '#0a0a0a',
              borderRadius: 6, fontWeight: 700, fontSize: '0.78rem',
            }}>
              Claim this →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>🤷</div>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
        No rinks found for &ldquo;{query}&rdquo;
      </div>
      <div style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
        Try a different name, or just your city. If your rink isn&apos;t in our directory yet, you can add it.
      </div>
      <Link
        href="/add-listing"
        style={{
          display: 'inline-block',
          background: '#041E42',
          color: '#fff',
          padding: '0.65rem 1.5rem',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
        }}
      >
        Add Your Rink →
      </Link>
    </div>
  );
}

function BenefitRow({ icon, text }: { icon: string; text: string }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        color: '#d1d5db',
        fontSize: '0.95rem',
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1.5 }}>{icon}</span>
      <span>{text}</span>
    </li>
  );
}

function TypeTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: 8,
        fontSize: '0.875rem',
        fontWeight: 600,
        textDecoration: 'none',
        background: active ? 'rgba(200,16,46,0.15)' : 'transparent',
        color: active ? '#fff' : '#9ca3af',
        border: `1px solid ${active ? 'rgba(200,16,46,0.4)' : 'transparent'}`,
      }}
    >
      {label}
    </Link>
  );
}

function RinkResultCard({ rink, query }: { rink: ClaimResult; query: string }) {
  const isPlayer = rink.type === 'player';
  const location = isPlayer
    ? [rink.nationality, rink.birth_year ? `b. ${rink.birth_year}` : null].filter(Boolean).join(' · ')
    : [rink.city, rink.country].filter(Boolean).join(', ');
  const alreadyClaimed = rink.has_claim && rink.claim_status === 'approved';
  const pending = rink.has_claim && rink.claim_status === 'pending';
  const isSelfManaged = isPlayer && rink.is_self_managed;

  const viewHref = isPlayer
    ? rink.slug
      ? `/directory/players/${rink.slug}`
      : `/directory/players/${rink.id}`
    : `/${rink.type === 'team' ? 'directory/teams' : 'directory/rinks'}/${rink.slug}`;

  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.05rem',
            marginBottom: '0.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {rink.name}
          {alreadyClaimed && (
            <span style={{ fontSize: '0.7rem', background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 600, letterSpacing: '0.04em' }}>
              CLAIMED
            </span>
          )}
          {pending && (
            <span style={{ fontSize: '0.7rem', background: 'rgba(255,184,28,0.15)', color: '#FFB81C', border: '1px solid rgba(255,184,28,0.4)', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 600, letterSpacing: '0.04em' }}>
              PENDING
            </span>
          )}
          {isSelfManaged && (
            <span style={{ fontSize: '0.7rem', background: 'rgba(20,184,166,0.08)', color: 'rgba(20,184,166,0.8)', border: '1px solid rgba(20,184,166,0.3)', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 600, letterSpacing: '0.04em' }}>
              SELF-MANAGED
            </span>
          )}
        </div>
        {location && (
          <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{location}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link
          href={viewHref}
          style={{
            background: 'transparent',
            color: '#9ca3af',
            border: '1px solid #1e1e1e',
            padding: '0.55rem 1rem',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          View
        </Link>
        {!alreadyClaimed && !pending && !isSelfManaged && (
          <ClaimButton
            href={`/login?redirect_url=${encodeURIComponent(`/dashboard/claims?entity=${rink.type}&id=${rink.id}&name=${encodeURIComponent(rink.name)}&source=${rink.type}&tier=${rink.type === 'team' ? 'club_starter' : rink.type === 'player' ? 'verified_identity' : 'business_listing'}`)}`}
            rinkId={rink.id}
            rinkSlug={rink.slug}
            query={query}
            priceTier={rink.type === 'team' ? 'club_starter' : rink.type === 'player' ? 'verified_identity' : 'business_listing'}
          />
        )}
        {isSelfManaged && (
          <Link
            href={`/dashboard/analytics/${rink.id}`}
            style={{
              background: '#14B8A6',
              color: '#0a0a0a',
              border: 'none',
              padding: '0.55rem 1rem',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            Your analytics →
          </Link>
        )}
      </div>
    </div>
  );
}
