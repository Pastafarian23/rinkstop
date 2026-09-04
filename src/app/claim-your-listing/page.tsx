import type { Metadata } from 'next';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { trackPageView } from '@/lib/analytics';
import { getDirectoryCounts } from '@/lib/directory-counts';
import { ClaimButton } from './ClaimButton';
import { ClaimAbandonTracker } from './ClaimAbandonTracker';
import AddListingLink from './AddListingLink';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Claim Your Listing on RinkStop',
  description:
    "Search for your rink or team's RinkStop listing and claim it. Verified listings get a checkmark, lead capture, and featured rotation.",
  alternates: { canonical: 'https://rinkstop.com/claim-your-listing' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Claim Your Listing on RinkStop',
    description: "Search for your rink or team and claim your listing. Verified listings get a checkmark, lead capture, and featured rotation.",
    url: 'https://rinkstop.com/claim-your-listing',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary',
    title: 'Claim Your Listing on RinkStop',
    description: 'Search for your rink or team and claim your listing.',
  },
};

export const dynamic = 'force-dynamic';

// TEMPORARY HOT-PATCH — Claude audit 2026-08-05 #1 (CRITICAL 500).
// /claim-your-listing has been returning 500, blocking the top-of-funnel
// paid conversion path (linked from homepage banner rotator, footer, pricing).
// Instead of waiting on Batch B's structural fix, this redirects the whole
// route to the working /login → /dashboard/claims flow used by individual
// listing pages. Same destination, working path, revenue-restoring.
//
// Sign-up and sign-in both honor ?redirect_url=... (audit-verified 2026-08-05),
// so first-time claimers hit /sign-up?redirect_url=/dashboard/claims and land
// on /dashboard/claims after email verification — no dead-end.
//
// TIME-BOX: remove this redirect when Batch B lands and the page renders 200.
// Owner: KiloClaw. Tracked in LEDGER under audit-fixes Batch B.
//
// IMPORTANT: the redirect MUST live INSIDE the default-exported component
// body, not at module top-level. Next.js evaluates every module during
// `next build` to collect page metadata; a top-level `redirect()` throws
// `NEXT_REDIRECT` and breaks the build. Inside the component body it
// only fires per-request.

type ClaimType = 'rink' | 'team' | 'player';

/**
 * Per-tab header copy (eyebrow, subhead, search placeholder).
 *
 * The Player tab previously inherited the rink/team copy — "For Rink Operators &
 * Team Administrators", "Type your rink or team name or city…". That read as
 * confusing for parents landing on the Player tab. Now each tab gets copy that
 * matches the audience and the cheapest paid tier required to claim.
 *
 * Pricing source-of-truth is src/lib/pricing.ts — these strings intentionally
 * mirror the cheapest paid tier per entity type rather than reading from
 * formatTierPrice() at module scope (the latter would require making the
 * helper importable in a server component without breaking the existing
 * client-side usage; the price is stable and rarely changes).
 */
const HEADER_COPY: Record<ClaimType, { eyebrow: string; sub: string; placeholder: string; bannerLabel: string; bannerPrice: string }> = {
  rink: {
    eyebrow: 'For Rink Operators',
    sub: 'Search for your rink below. Claiming is free — verification is also free for every profile type. Upgrade to Business Listing ($99/yr) only if you want lead capture, photos, hours, and other tools.',
    placeholder: 'Type your rink name or city…',
    bannerLabel: 'Rink operators',
    bannerPrice: 'a free verified business profile',
  },
  team: {
    eyebrow: 'For Team & Club Administrators',
    sub: 'Search for your team below. Claiming is free — verification is also free for every profile type. Upgrade to Club Starter ($149/yr) only if you want roster management, dues collection, and other tools.',
    placeholder: 'Type your team name or city…',
    bannerLabel: 'Team & club admins',
    bannerPrice: 'a free verified team profile',
  },
  player: {
    eyebrow: 'For Players & Parents',
    sub: 'Search for your player profile below. Claiming is free — verification is also free for every profile type. Upgrade to Hockey Passport ($24.99/yr) only if you want the Hockey Passport, payments, and other tools.',
    placeholder: 'Type a player first or last name…',
    bannerLabel: 'Players & parents',
    bannerPrice: 'a free verified identity',
  },
};

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

  // Fail-safe wrapper: any Supabase error in the search path must NOT 500
  // the page. Return an empty array on any thrown error so the EmptyState
  // renders a polite "search above" message instead of crashing the
  // conversion funnel.
  // The try/catch wraps ONLY the Supabase query + claim-status read below,
  // not the entire function body — wrapping the return would be unreachable
  // code. The catch returns `[]` so the EmptyState renders cleanly.
  let claimByEntityId = new Map<string, string>();
  try {

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
      .from('team_workspaces')
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
    rows = (data || []).map((p: any): RowShape => ({
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
  } catch (e) {
    // Fail-safe: never let a Supabase error in the search path 500 the
    // page. Return an empty array so the EmptyState renders a polite
    // "search above" message instead of crashing the conversion funnel.
    console.error('[claim-your-listing] search failed:', e);
    return [];
  }
}


export default async function ClaimYourListingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  // Run as the first per-request step when the hot-patch is active. Lives
  // inside the component body so Next.js's static page-collection phase
  // doesn't evaluate it during `next build`.

  const { q, type: typeParam } = await searchParams;
  const query = (q || '').trim();
  // Validate the type param. Default to rink if missing or invalid.
  const type: ClaimType =
    typeParam === 'team' || typeParam === 'player' ? typeParam : 'rink';

  // HOT-PATCH REMOVED 2026-08-11 (claim flow Phase 1).
  // The original redirect to /sign-up was put in place on 2026-08-05 to work
  // around a 500 error. The 500 has since been resolved (the underlying
  // searchEntities code now has try/catch around all Supabase calls) and the
  // search UI was being bypassed. Surfacing the search UI is the whole point
  // of the redesign: users need to find their listing (or add a new one)
  // BEFORE they sign up. Redirecting them straight to sign-up was hiding the
  // actual conversion surface.
  //
  // The rest of this component (auth context, search, results, JSX) was
  // built and is now active. See /tmp/claim-flow-revised.md for the plan.

  // Auth context — used to (a) decide if we show a "sign in to claim"
  // CTA above the search and (b) bucket funnel metrics by signed-in state.
  // Failures here shouldn't break the page.
  let signedInUserId: string | null = null;
  let pendingDraftCount = 0;
  try {
    const session = await auth();
    const cu = await currentUser();
    const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
    const userId = await resolveCanonicalUserId(session.userId, userEmail);
    if (userId) {
      signedInUserId = userId;
      // Count in-progress claim drafts for this user. If they have any,
      // we surface a "Resume your draft" prompt above the search.
      const { count } = await supabaseAdmin
        .from('claim_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      pendingDraftCount = count || 0;
    }
  } catch {
    // ignore — page renders fine without auth context
  }

  const isSignedIn = signedInUserId !== null;

  const results = query.length >= 2 ? await searchEntities(query, type) : [];

  // Featured claimable listings — removed 2026-08-11 during Phase 1 cleanup.
  // The previous FeaturedClaimableSection component is unreachable in the JSX
  // tree and loadFeaturedClaimable() timed out on no-query page views, causing
  // a Vercel 500. EmptyState already provides the 'add a new listing' CTA.
  // Kept as a const so the analytics payload below still has a stable shape.
  const featuredClaimable: null = null;
  // Directory counts — single source of truth shared with the homepage and
  // About page. Passed to EmptyState so the "1,900+ rinks" claim stays in
  // sync with the actual directory size.
  // Wrapped in try/catch so a Supabase outage (or a transient RPC error)
  // doesn't 500 the page. Zero counts render fine — the EmptyState just
  // shows "0+ rinks" instead of "1,858+ rinks".
  let counts = { rinks: 0, teams: 0, players: 0, leagues: 0, cities: 0, countries: 0 };
  try {
    counts = await getDirectoryCounts();
  } catch {
    // never let counts break the page
  }

  // Server-side analytics: track this page view with the search query
  // Plus: capture whether the user searched or landed empty (helps split
  // "browse" traffic from "intent" traffic). query is hashed lightly if
  // non-empty so we can group by similar terms without storing PII.
  try {
    await trackPageView({
      name: 'claim_search_viewed',
      pathname: '/claim-your-listing',
      props: {
        query_length: query.length,
        query_hash: query ? simpleHash(query) : null,
        result_count: results.length,
        had_query: query.length >= 2,
        entity_type: type,
        had_featured: !!featuredClaimable,
        zero_results: query.length >= 2 && results.length === 0,
        is_signed_in: isSignedIn,
        pending_drafts: pendingDraftCount,
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
        {/* WS9: abandon tracker — fires claim_search_abandoned on pagehide
            if the user typed a query but didn't click any claim button.
            Pure client component, no UI impact. */}
        <ClaimAbandonTracker
          queryHash={query ? simpleHash(query) : null}
          queryLength={query.length}
          resultCount={results.length}
          entityType={type}
        />
        {/* Header — per-tab eyebrow + subhead so the page reads correctly on
            the Player tab (which serves players/families, not just rink/team ops).
            Tab-aware copy only fires on the eyebrow + subhead. Title stays
            "Claim Your Listing" so deep-links and OG previews stay stable. */}
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', letterSpacing: '0.18em', color: '#FFB81C', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.75rem' }}>
            {HEADER_COPY[type].eyebrow}
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
            {HEADER_COPY[type].sub}
          </p>
        </div>

        {/* Funnel CTA banners — aim to convert the 99.5% drop from search view
            → button click. Two variants:
              (a) anonymous + has draft in progress: tell them to sign in to claim
              (b) anonymous + no draft: nudge them toward /pricing so they know
                  the cost BEFORE they search and bounce.
            Signed-in + has pending draft: encourage them to finish what they started. */}
        {isSignedIn && pendingDraftCount > 0 && (
          <div
            style={{
              background: 'rgba(20,184,166,0.08)',
              border: '1px solid rgba(20,184,166,0.4)',
              borderRadius: 10,
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 200, color: '#14B8A6', fontSize: '0.9rem' }}>
              <strong style={{ color: '#fff' }}>You have {pendingDraftCount} claim draft{pendingDraftCount === 1 ? '' : 's'} in progress.</strong>{' '}
              Finish your draft to submit it for review.
            </div>
            <Link
              href="/dashboard/claims"
              style={{
                background: '#14B8A6',
                color: '#0a0a0a',
                padding: '0.55rem 1.1rem',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
              }}
            >
              Resume draft →
            </Link>
          </div>
        )}
        {!isSignedIn && (
          <div
            style={{
              background: 'rgba(255,184,28,0.06)',
              border: '1px solid rgba(255,184,28,0.3)',
              borderRadius: 10,
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 200, color: '#FFB81C', fontSize: '0.9rem' }}>
              <strong style={{ color: '#fff' }}>{HEADER_COPY[type].bannerLabel}: </strong>
              you&rsquo;ll need a RinkStop account and{' '}
              {HEADER_COPY[type].bannerPrice}
              {' '}to claim. See plans before you search.
            </div>
            <Link
              href={`/pricing${query ? `?intent=claim&type=${type}` : '?intent=claim'}`}
              style={{
                background: 'transparent',
                color: '#FFB81C',
                border: '1px solid #FFB81C',
                padding: '0.55rem 1.1rem',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
              }}
            >
              See plans →
            </Link>
          </div>
        )}

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
          <TypeTab href={`/claim-your-listing${query ? `?q=${encodeURIComponent(query)}&type=rink` : '?type=rink'}`} label="Rinks · free to claim" active={type === 'rink'} />
          <TypeTab href={`/claim-your-listing${query ? `?q=${encodeURIComponent(query)}&type=team` : '?type=team'}`} label="Teams · free to claim" active={type === 'team'} />
          <TypeTab href={`/claim-your-listing${query ? `?q=${encodeURIComponent(query)}&type=player` : '?type=player'}`} label="Players · free to claim" active={type === 'player'} />
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
              placeholder={HEADER_COPY[type].placeholder}
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
          <EmptyState type={type} counts={counts} />
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
          <NoResults query={query} type={type} />
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

function EmptyState({ type, counts }: { type: ClaimType; counts: { rinks: number; teams: number; players: number } }) {
  // WS7 PR2: previously hardcoded 'rink' language regardless of tab.
  // Now matches the type the user clicked and adds an /add-listing CTA so
  // users whose entity doesn't exist can submit it instead of bouncing.
  // Counts are passed in from the server component so the directory-size
  // claim stays consistent with the homepage and About page (no more
  // drifting "1,900+ rinks" literal).
  const rinksLabel = `${counts.rinks.toLocaleString()}+ rinks`;
  const teamsLabel = `${counts.teams.toLocaleString()}+ teams`;
  const playersLabel = `${counts.players.toLocaleString()}+ players`;
  const copy: Record<ClaimType, { find: string; explain: string; addLabel: string; dirCount: string }> = {
    rink: {
      find: 'Find your rink',
      explain: `Type your rink name or city in the box above. We have ${rinksLabel} in the directory.`,
      addLabel: 'Add a new rink →',
      dirCount: rinksLabel,
    },
    team: {
      find: 'Find your team',
      explain: `Type your team name or city in the box above. ${teamsLabel} across every league level.`,
      addLabel: 'Add a new team →',
      dirCount: teamsLabel,
    },
    player: {
      find: 'Find a player',
      explain: `Type a first or last name in the box above. ${playersLabel} indexed.`,
      addLabel: 'Add a new player →',
      dirCount: playersLabel,
    },
  };
  const c = copy[type];

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
        {c.find}
      </div>
      <div style={{ fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
        {c.explain}
      </div>
      <AddListingLink
        href={`/add-listing?type=${type}`}
        testId={`add-listing-${type}-empty`}
        source="empty_state"
        entityType={type}
        style={{
          display: 'inline-block',
          background: 'transparent',
          color: '#FFB81C',
          border: '1px solid #FFB81C',
          padding: '0.5rem 1.1rem',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {c.addLabel}
      </AddListingLink>
    </div>
  );
}

function NoResults({ query, type }: { query: string; type: ClaimType }) {
  // Per-entity-type copy. The previous version hardcoded rink language
  // regardless of which tab the user was searching on, which read as a
  // confusing bug — "team XYZ not found, Add Your Rink" made no sense.
  const copy: Record<ClaimType, { notFound: string; addLabel: string; explanation: string; differentSearch: string }> = {
    rink: {
      notFound: 'No rinks found for',
      addLabel: 'Add Your Rink →',
      explanation: 'Try a different name, or just your city.',
      differentSearch: 'If your rink isn\u2019t in our directory yet, you can add it.',
    },
    team: {
      notFound: 'No teams found for',
      addLabel: 'Add Your Team →',
      explanation: 'Try a different team name or city.',
      differentSearch: 'If your team isn\u2019t in our directory yet, you can add it.',
    },
    player: {
      notFound: 'No players found for',
      addLabel: 'Add This Player →',
      explanation: 'Try a different name, or use last name only.',
      differentSearch: 'If this player isn\u2019t in our directory yet, you can add them.',
    },
  };
  const c = copy[type];

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
        {c.notFound} &ldquo;{query}&rdquo;
      </div>
      <div style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
        {c.explanation} {c.differentSearch}
      </div>
      <AddListingLink
        href={`/add-listing${type ? `?type=${type}` : ''}`}
        testId={`add-listing-${type}-noresults`}
        source="no_results"
        entityType={type}
        query={query}
        queryHash={query ? simpleHash(query) : null}
        queryLength={query.length}
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
        {c.addLabel}
      </AddListingLink>
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
            href={`/login?redirect_url=${encodeURIComponent(`/dashboard/claims?intent=claim&entity=${rink.type}&id=${rink.id}&name=${encodeURIComponent(rink.name)}&source=${rink.type}&tier=${rink.type === 'team' ? 'club_starter' : rink.type === 'player' ? 'verified_identity' : 'business_listing'}`)}`}
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

/**
 * Simple non-cryptographic 32-bit FNV-1a hash. Used to bucket search terms
 * for funnel analysis without storing raw query strings (privacy + size).
 * Collisions are fine for funnel bucketing (~4B buckets, queries are <100 chars).
 */
function simpleHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
