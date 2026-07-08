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

type ClaimType = 'rink' | 'team';

interface ClaimResult {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  type: ClaimType;
  has_claim: boolean;
  claim_status: string | null;
}

async function searchEntities(query: string, type: ClaimType): Promise<ClaimResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Pick the right table + columns based on type. We use ilike with %q% for
  // the name column. For rinks we also match city (operators often search by
  // city name). For teams we match city.
  let rows: Array<{ id: string; slug: string; name: string; city: string | null; country: string | null }> = [];
  if (type === 'rink') {
    const { data, error } = await supabaseAdmin
      .from('rinks')
      .select('id, slug, name, city, country, is_active')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
      .eq('is_active', true)
      .limit(20);
    if (error || !data) return [];
    rows = data as typeof rows;
  } else if (type === 'team') {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('id, slug, name, city, country')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
      .limit(20);
    if (error || !data) return [];
    rows = data as typeof rows;
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

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    city: r.city,
    country: r.country,
    type,
    has_claim: claimByEntityId.has(r.id),
    claim_status: claimByEntityId.get(r.id) || null,
  }));
}

export default async function ClaimYourListingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type: typeParam } = await searchParams;
  const query = (q || '').trim();
  // Validate the type param. Default to rink if missing or invalid.
  const type: ClaimType = typeParam === 'team' ? typeParam : 'rink';
  const results = query.length >= 2 ? await searchEntities(query, type) : [];

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
          <NoResults query={query} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              {results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
            </div>
            {results.map((rink) => (
              <RinkResultCard key={rink.id} rink={rink} query={query} />
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
  const location = [rink.city, rink.country].filter(Boolean).join(', ');
  const alreadyClaimed = rink.has_claim && rink.claim_status === 'approved';
  const pending = rink.has_claim && rink.claim_status === 'pending';

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
            <span
              style={{
                fontSize: '0.7rem',
                background: 'rgba(20,184,166,0.15)',
                color: '#14B8A6',
                border: '1px solid rgba(20,184,166,0.4)',
                padding: '0.15rem 0.5rem',
                borderRadius: 6,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              CLAIMED
            </span>
          )}
          {pending && (
            <span
              style={{
                fontSize: '0.7rem',
                background: 'rgba(255,184,28,0.15)',
                color: '#FFB81C',
                border: '1px solid rgba(255,184,28,0.4)',
                padding: '0.15rem 0.5rem',
                borderRadius: 6,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              PENDING
            </span>
          )}
        </div>
        {location && (
          <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{location}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link
          href={`/directory/rinks/${rink.slug}`}
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
        {!alreadyClaimed && !pending && (
          <ClaimButton
            href={`/login?redirect_url=${encodeURIComponent(`/dashboard/claims?entity=${rink.type}&id=${rink.id}&name=${encodeURIComponent(rink.name)}&source=${rink.type}`)}`}
            rinkId={rink.id}
            rinkSlug={rink.slug}
            query={query}
            priceTier={rink.type === 'team' ? 'club_starter' : 'business_listing'}
          />
        )}
      </div>
    </div>
  );
}
