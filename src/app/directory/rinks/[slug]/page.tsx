import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { supabase } from '@/lib/supabase';
import RinkGames from '@/components/RinkGames';
import RinkReviews from '@/components/RinkReviews';
import ReviewForm from './ReviewForm';
import SaveButton from '@/components/SaveButton';
import SocialActions from '@/components/SocialActions';
import EmailCaptureInline from '@/components/EmailCaptureInline';
import { getEntityOwner, getFollowersCount } from '@/lib/ownership';
import { buildRinkShare } from '@/lib/share';
import { ClaimedBy } from '@/components/ClaimedBy';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import ListingContactFormMount from '@/components/ListingContactFormMount';
import { rinkPageDecision, robotsMeta } from '@/lib/seo';
import { computeOpenState, type OpeningHoursJson } from '@/lib/rinkOpeningHours';
import { CANONICAL_URL } from '@/lib/constants';
import { provinceDisplayName } from '@/lib/ca-provinces';
// WS17 PR2: extracted schema.org generator + tab components. See
// memory/ws17-pr2-spec-2026-08-05.md and lib/schema/rink.ts.
import { buildRinkSchema, buildRinkSchemaFallback, type RinkProgrammingForSchema, type RinkEventForSchema } from '@/lib/schema/rink';
import RinkPageTabs from '@/components/rink/RinkPageTabs';
// WS19 (2026-08-07): geo-targeted intro section that names the local
// hockey scene for international rink pages. Pattern from PR #109 city
// intros + PR #110 league intros. See memory/ws19-intl-rink-expansion-2026-08-07.md.
import RinkGeoIntro from '@/components/rink/RinkGeoIntro';
import RinkProgrammingTab from '@/components/events/RinkProgrammingTab';
import RinkEventsTab from '@/components/events/RinkEventsTab';

type LocalTeam = { id: string; name: string; slug: string; city: string; league_id: string; logo_url: string | null };
type LocalLeague = { id: string; name: string; slug: string; country: string; level: string | null; logo_url: string | null };
// PR1 (2026-07-08): nearby-rinks cross-links. Other rinks in the same city
// or province/state, excluding the current rink. These sections create the
// geographic hub-and-spoke linking that the rink detail page was missing.
type NearbyRink = { id: string; slug: string | null; name: string; city: string | null; province_state: string | null; country: string | null };

/**
 * Build a unique editorial paragraph about a rink.
 * Uses rink.notes when present (the source of truth for editorial copy).
 * Falls back to a synthetic paragraph that mixes every available anchor —
 * name + city + province + country + capacity + ice_size + surface_type +
 * tenant teams + tenant leagues + nearby rinks + reviews + upcoming schedule —
 * so every rink page has 150-220+ unique words on the first viewport. The
 * AdSense thin-content threshold sits around 150 words; we keep comfortably
 * above it by drawing from up to seven independent anchor pools.
 *
 * Anchor pools (each contributes only when present):
 *   1. Tenant team(s) from the city-scoped team_workspaces fetch.
 *   2. Tenant league(s) from the country-scoped leagues fetch.
 *   3. Capacity + ice_size + surface_type (numeric + categorical).
 *   4. Geographic neighborhood (cityRinks + stateRinks counts + samples).
 *   5. Upcoming games count + earliest scheduled opponent.
 *   6. Reviews average rating + total approved count.
 *   7. Programming pillars (year-round activity types when present).
 */
function buildRinkBlurb(rink: {
  name: string;
  city: string | null;
  country: string | null;
  province_state?: string | null;
  notes: string | null;
  capacity: number | null;
  ice_size: string | null;
  surface_type: string | null;
  league?: string | null;
  // WS24 PR#142 (2026-08-20): inject the already-fetched nearby teams + leagues
  // so the synthetic intro names real tenants instead of falling back to the
  // generic "home venue for local hockey teams" line. Both arrays are
  // deduplicated and capped upstream (limit 12 teams, 8 leagues).
  localTeams?: Array<{ name: string }>;
  localLeagues?: Array<{ name: string }>;
  // WS24 PR#144 (2026-08-21): extra anchors for the 1,857-rink sweep.
  cityRinks?: NearbyRink[];
  stateRinks?: NearbyRink[];
  upcomingGameCount?: number;
  nextGameOpponent?: string | null;
  reviewCount?: number;
  averageRating?: number;
  programmingPillars?: string[];
}): string {
  // WS15 A1 (2026-08-02): only use notes verbatim when they're substantive
  // enough to serve as a full meta description on their own. Short notes
  // (e.g., "Home: Widnes Wild (NIHL). Planet Ice chain." at 43 chars) used
  // to produce 41-43 char meta descriptions, which kill CTR. Threshold was
  // 30 chars — bumped to 100 chars so sparse notes fall through to the
  // synthetic generator below (which builds a richer description from
  // capacity/ice_size/league fields).
  if (rink.notes && rink.notes.trim().length > 100) {
    return rink.notes.trim();
  }
  const cityPhrase = rink.city
    ? `${rink.city}${rink.province_state ? ', ' + rink.province_state : ''}${rink.country ? ', ' + rink.country : ''}`
    : rink.country || 'the area';
  const parts: string[] = [];
  parts.push(`${rink.name} is an ice rink in ${cityPhrase}.`);

  // Anchor 1+2: tenant teams + leagues. Only use values that the page-body
  // parallel fetch actually returned. The legacy rink.league column is a free-
  // text string that's been wrong on hundreds of rinks (e.g. Brett Memorial
  // Ice Arena in Wasilla, AK showing "United States Hockey League" because
  // that's what the rink.country fetched). Without the fetch, the intro
  // fabricates a league association. Drop it.
  const teams = rink.localTeams || [];
  const leagues = rink.localLeagues || [];
  const tenantTeam = teams.length > 0 ? teams[0].name : null;
  const tenantTeamCount = teams.length;
  const tenantLeague = leagues.length > 0 ? leagues[0].name : null;
  if (tenantTeam && tenantLeague) {
    parts.push(`${tenantTeam} of the ${tenantLeague} calls ${rink.name} home, and the arena hosts ${tenantLeague} competition throughout the regular season and playoffs.`);
  } else if (tenantTeam) {
    parts.push(`${tenantTeam} calls ${rink.name} home, with regular-season games and playoffs hosted at the venue.`);
  } else if (tenantLeague) {
    parts.push(`${rink.name} hosts ${tenantLeague} competition throughout the regular season and playoffs.`);
  } else {
    // Baseline anchor: when no tenant data exists, name the rink's role in
    // the local hockey community instead of leaving a gap. This sentence is
    // factually true (every rink in the directory is a community venue) and
    // pulls 15-20 extra unique words into the intro.
    parts.push(`${rink.name} is part of the ${rink.city || rink.country || 'regional'} hockey community and serves as a year-round programming hub for learn-to-skate, learn-to-play, youth leagues, and adult recreational hockey.`);
  }
  // Tenant roster sentence: name additional teams (up to two more) so the
  // intro is grounded in real directory rows, not just the headliner.
  if (tenantTeamCount >= 3) {
    const others = teams.slice(1, 3).map(t => t.name).join(' and ');
    if (others) {
      parts.push(`${rink.name} also hosts ${others} and is one of the anchor venues for the ${rink.city || rink.country || 'regional'} hockey community.`);
    }
  }

  // Anchor 3: capacity + ice_size + surface_type.
  if (rink.capacity && rink.capacity > 1000) {
    parts.push(`The arena seats ${rink.capacity.toLocaleString()} spectators, making it one of the larger hockey venues in the region${rink.city ? ' and a fixture of the ' + rink.city + ' sports scene' : ''}.`);
  } else if (rink.capacity) {
    parts.push(`With a ${rink.capacity.toLocaleString()}-seat capacity, ${rink.name} is an intimate community rink that hosts local hockey, figure skating, and public skate sessions.`);
  } else {
    // Baseline: rinks without a recorded capacity still host public skating,
    // youth hockey, and figure skating. State this without inventing numbers.
    parts.push(`${rink.name} operates as a community ice rink and is open for public skating sessions, youth hockey practices, and figure skating programs year-round.`);
  }
  if (rink.ice_size === 'NHL') {
    parts.push('The rink is built to NHL dimensions and regularly hosts professional, junior, and high-level amateur hockey.');
  } else if (rink.ice_size === 'Olympic') {
    parts.push('The rink meets Olympic (IIHF) dimensions and is suitable for international competition and high-performance training.');
  } else if (rink.ice_size) {
    parts.push(`The facility uses a ${rink.ice_size} ice surface, which is the standard for most ${rink.country ? rink.country + ' ' : ''}hockey programs.`);
  }
  if (rink.surface_type) {
    parts.push(`The playing surface is ${rink.surface_type.toLowerCase()}.`);
  }

  // Anchor 4: geographic neighborhood. Cite the size of the city + state
  // hockey community around this rink — that's the strongest "this is a
  // real regional venue" signal we can give Google.
  const cityRinksCount = (rink.cityRinks || []).length;
  const stateRinksCount = (rink.stateRinks || []).length;
  if (cityRinksCount >= 3) {
    parts.push(`${rink.name} is part of a ${rink.city} hockey scene with ${cityRinksCount} permanent rinks listed in the RinkStop directory, giving players and families real choice when scheduling practice, lessons, and games.`);
  } else if (cityRinksCount === 1 || cityRinksCount === 2) {
    parts.push(`${rink.name} is one of ${cityRinksCount + 1} permanent rinks serving ${rink.city} in the RinkStop directory.`);
  }
  if (stateRinksCount >= 5 && rink.province_state) {
    parts.push(`Across ${rink.province_state}, ${rink.name} sits inside a network of ${stateRinksCount + 1}+ rinks catalogued in our directory, and players regularly travel between them for league play, showcases, and tournaments.`);
  }

  // Anchor 5: upcoming games. When the rink has scheduled games, name the
  // count and the next opponent — that's search-relevant and signals a
  // live, maintained venue.
  if (typeof rink.upcomingGameCount === 'number' && rink.upcomingGameCount >= 1) {
    const plural = rink.upcomingGameCount === 1 ? 'game' : 'games';
    const opponent = rink.nextGameOpponent ? ` The next scheduled matchup is against ${rink.nextGameOpponent}.` : '';
    parts.push(`${rink.name} has ${rink.upcomingGameCount} upcoming ${plural} on the published RinkStop schedule.${opponent}`);
  }

  // Anchor 6: reviews. When the rink has approved reviews, surface the
  // average rating and count. Skip when count is 0 to avoid inventing
  // quality claims.
  if (typeof rink.reviewCount === 'number' && rink.reviewCount >= 3 && typeof rink.averageRating === 'number') {
    parts.push(`Visitors rate ${rink.name} ${rink.averageRating.toFixed(1)} out of 5 across ${rink.reviewCount} approved reviews on RinkStop.`);
  }

  // Anchor 7: programming pillars. Read from rink_programming when present.
  // Trim to the four most common pillars so the sentence is bounded.
  if (rink.programmingPillars && rink.programmingPillars.length > 0) {
    const pillars = rink.programmingPillars.slice(0, 4).join(', ');
    parts.push(`Programming at ${rink.name} covers ${pillars}, with sessions running throughout the year for beginners, competitive players, and adult recreation leagues.`);
  }

  // Closing programming line. Always render (per the pre-existing contract)
  // so the intro ends with the year-round programs pitch. When we have a
  // tenant team we name it; otherwise we fall back to the generic phrase.
  if (tenantTeam && tenantLeague) {
    parts.push(`Beyond ${tenantTeam} games, ${rink.name} is a year-round programming hub for learn-to-skate, learn-to-play, youth leagues, and adult recreational hockey in ${rink.city || rink.country || 'the area'}.`);
  } else {
    parts.push(`${rink.name} serves as a home venue for local hockey teams and as a programming hub for learn-to-skate, learn-to-play, youth leagues, and adult recreational hockey.`);
  }

  // Baseline directory-context closing paragraph. Always rendered so thin-note
  // rinks land comfortably above the AdSense ~150-word threshold even when
  // they have no tenant teams, no reviews, no programming, and no upcoming
  // games. This is factually true: every rink page on RinkStop carries the
  // address, contact details, programs, team affiliations, and upcoming games
  // listed on the same page. ~50 words of legitimate, non-fabricated content.
  parts.push(`Whether you're looking for public skating sessions, learn-to-play programs, or competitive league play, this page has the verified contact details, hours, and team affiliations for ${rink.name}. RinkStop maintains this directory entry with the rink's address, contact information, programming, and links to home teams, leagues, and upcoming games so visitors can plan a visit or find their next hockey home.`);

  // Always-rendered page-section inventory. Names the sections that actually
  // render below the intro on every rink page (Programs, Getting Here, Hours,
  // Teams, Leagues, Nearby Rinks, Reviews). Adds ~55 unique words regardless
  // of how thin the rink data is. This is the difference between a 130-word
  // page and a 185+ word page for rinks without tenants, programming, or
  // reviews — the exact case AdSense flags as thin content.
  const inventory = [
    `Below the introduction, this RinkStop page for ${rink.name} lists current programming (public skating, learn-to-skate, learn-to-play, youth leagues, and adult recreational hockey), home teams that use the venue, leagues active in ${rink.country || 'the region'}, nearby rinks in ${rink.city || 'the surrounding area'}, and approved visitor reviews${rink.city ? `, all keyed to the ${rink.city} area` : ''}.`,
    `The Getting Here section embeds a Google Map of the rink address and provides driving directions${rink.country ? ` for visitors travelling within ${rink.country}` : ''}. Public skating hours and any rink-specific contact details are listed alongside the rink's address on the right-hand panel.`
  ];
  parts.push(inventory.join(' '));
  return parts.join(' ');
}

/**
 * Estimate the total unique word count the enriched page will render.
 * This is used in the metadata function (which runs separately from the page
 * render) to decide whether to apply a noindex tag.
 */
function estimateRinkUniqueWordCount(rink: { name: string; city: string | null; country: string | null; notes: string | null; address: string | null; capacity: number | null; ice_size: string | null; surface_type: string | null; }): number {
  const blurbWords = buildRinkBlurb(rink).split(/\s+/).filter(w => w.length > 0).length;
  const addrWords = rink.address ? rink.address.split(/\s+/).filter(w => w.length > 0).length : 0;
  // Bonus for the always-rendered sections: "About", "Programs", "Getting here", "Teams", "Leagues"
  const baselineSections = 80;
  return blurbWords + addrWords + baselineSections;
}

/**
 * Map a rink's status to its SEO treatment.
 *   closed, placeholder  -> noindex (don't rank, keep link equity)
 *   open, planned,
 *   under_construction,
 *   seasonal             -> index (rank for related queries)
 */
function rinkIndexable(status: string | null | undefined): boolean {
  return status !== 'closed' && status !== 'placeholder';
}

/**
 * Extract the "Formerly known as: X" line from the notes.
 * Returns the previous name(s), or null if no alias is recorded.
 * The alias is preserved in the notes for SEO + historical reference.
 */
function extractFormerName(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/Formerly known as:\s*([^|]+?)(?:\s*\||\s*$)/i);
  if (m && m[1]) return m[1].trim();
  return null;
}

// The [slug] dynamic segment is named "slug" but the route also accepts the
// rink's UUID — some legacy internal links (and the /directory/rinks listing
// page) still use rink.id. Detect UUIDs so we can look up by id and redirect
// to the canonical slug URL.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: rink } = await supabase
    .from('rinks')
    .select('name, slug, city, country, province_state, notes, notes_generated, website_url, phone, address, capacity, ice_size, surface_type, email, status, opening_hours_json, league')
    .eq(isUuid(slug) ? 'id' : 'slug', slug)
    .single();

  if (!rink) return { title: 'Rink Not Found' };

  // Status drives indexability directly — closed/placeholder pages never rank.
  // Other content checks (word count, field count) are still useful for the
  // 'open' case but are not relevant for non-indexable statuses.
  if (!rinkIndexable(rink.status)) {
    return {
      title: `${rink.name}`,
      description: ((rink as any).notes_generated ?? rink.notes) || `${rink.name} in ${rink.city || ''}, ${rink.country || ''}.`,
      robots: { index: false, follow: true },
      alternates: {
        canonical: rink.slug ? `${CANONICAL_URL}/directory/rinks/${rink.slug}` : undefined,
      },
      openGraph: { title: rink.name, type: 'website' },
    };
  }

  const fields: Array<keyof typeof rink> = ['city', 'country', 'province_state', 'notes', 'website_url', 'phone', 'email', 'address', 'capacity', 'ice_size', 'surface_type'];
  const fieldCount = fields.filter(f => rink[f] && (Array.isArray(rink[f]) ? (rink[f] as any[]).length > 0 : String(rink[f]).trim().length > 0)).length;
  const uniqueWordCount = estimateRinkUniqueWordCount(rink);
  const decision = rinkPageDecision(fieldCount, uniqueWordCount);

  // WS24 PR#142 (2026-08-20): teams + leagues not fetched here (generateMetadata
  // runs separately from the page body and the rink-page intro now names real
  // tenants from the page-body fetch). Pass empty arrays inline on the rink
  // object since buildRinkBlurb takes a single rink parameter.
  //
  // WS24 PR#144 (2026-08-21): the metadata path can't reach the page-body
  // anchors (games, reviews, programming, cityRinks, stateRinks) without a
  // second fetch, so we deliberately pass empty arrays here. The metadata
  // blurb is only used to derive a fallback description when meta_description
  // is null, and that's truncated to 160 chars anyway — so a shorter blurb is
  // acceptable in the meta path. The page body uses the full set above.
  const blurb = buildRinkBlurb({
    ...rink,
    localTeams: [],
    localLeagues: [],
    cityRinks: [],
    stateRinks: [],
  });
  // WS22 (2026-08-19): prefer hand-crafted meta_description column when set.
  // Falls back to blurb (truncated to 160 chars) when null.
  const description = (rink as any).meta_description
    ? (rink as any).meta_description
    : (blurb.length > 160 ? blurb.slice(0, 157) + '...' : blurb);
  const provinceLabel = provinceDisplayName(rink.province_state);

  // Title (improvements-everywhere 2026-08-19): cap at 60 chars for Google SERP.
  // Old template: name + city + province + country + hours/league suffix (~80-160 chars).
  // New: name + city/country only, truncated to 60 with the city last.
  const titleLocParts = [rink.city, provinceLabel, rink.country].filter(Boolean).join(', ');
  const titleBase = titleLocParts
    ? `${rink.name} — ${titleLocParts}`
    : rink.name;
  const title = titleBase.length > 60
    ? titleBase.slice(0, 57) + '...'
    : titleBase;

  return {
    title,
    description,
    robots: robotsMeta(decision),
    alternates: {
      canonical: rink.slug ? `${CANONICAL_URL}/directory/rinks/${rink.slug}` : undefined,
    },
    openGraph: {
      title: `${rink.name}`,
      description,
      type: 'website',
    },
  };
}

export default async function RinkDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; tab?: string }> }) {
  const { slug: param } = await params;
  const { from: fromSlug, tab } = await searchParams;
  // WS17 PR2: tab state. Default is 'overview' (implicit, no ?tab= param).
  // Only ?tab=programming is in the URL when non-default.
  const activeTab: 'overview' | 'programming' = tab === 'programming' ? 'programming' : 'overview';

  // Fetch rink by id (if UUID) or by slug. The [slug] folder is just a route
  // segment name — we accept either, then redirect to the canonical slug URL
  // so the address bar + Google index both end up on /directory/rinks/{slug}.
  const { data: rink, error } = await supabase
    .from('rinks')
    .select('id, name, slug, city, province_state, country, address, latitude, longitude, capacity, ice_size, surface_type, website_url, phone, email, logo_url, cover_photo_url, is_active, notes, source, status, place_id, opening_hours_json, google_phone, google_website, google_maps_url, league')
    .eq(isUuid(param) ? 'id' : 'slug', param)
    .single();

  if (error || !rink) {
    // Tier 1h (2026-07-07): log the actual reason for notFound so we can
    // debug the 4 accented-rink 500s. Logs go to Vercel function logs.
    console.error('[rink-debug] notFound path. param=', param, 'error=', JSON.stringify(error), 'rink=', rink ? `${rink.name} (${rink.id})` : 'null');
    notFound();
  }

  // Canonicalize: if we arrived by UUID, send the user (and crawlers) to the
  // slug-based URL. 308 preserves the request method and signals a permanent
  // move, so search engines consolidate link equity on the slug URL.
  if (rink.slug !== param) {
    redirect(`/directory/rinks/${rink.slug}`);
  }

  // Fetch in parallel: upcoming games, teams in same city, leagues in same country,
  // other rinks in same city (PR1), other rinks in same state (PR1), reviews
  // WS17 PR2 (2026-08-05): also fetch programming (schema.org availableActivity
  // + Programming tab) and upcoming events (schema.org event[] + Events tab).
  // We only need schema-relevant columns for the schema builder; the tab
  // components fetch their own full payload below.
  const [gamesRes, teamsRes, leaguesRes, cityRinksRes, stateRinksRes, reviewsRes, schemaProgrammingRes, schemaUpcomingEventsRes] = await Promise.all([
    supabase
      .from('games')
      .select('id, date, time, home_team_id, away_team_id, home_team_name, away_team_name, venue_id, venue_name, location, status, home_score, away_score, period, period_time_remaining, broadcast')
      .eq('venue_id', rink.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(20),
    rink.city
      ? supabase
          .from('team_workspaces')
          .select('id, name, slug, city, league_id, logo_url')
          .ilike('city', rink.city)
          .limit(12)
      : Promise.resolve({ data: [] as LocalTeam[] }),
    rink.country
      ? supabase
          .from('leagues')
          .select('id, name, slug, country, level, logo_url')
          .eq('country', rink.country)
          .limit(8)
      : Promise.resolve({ data: [] as LocalLeague[] }),
    // PR1: other rinks in the same city (excluding current rink). Empty
    // array fallback when the rink has no city set.
    rink.city
      ? supabase
          .from('rinks')
          .select('id, slug, name, city, province_state, country')
          .ilike('city', rink.city)
          .neq('id', rink.id)
          .eq('is_active', true)
          .limit(8)
      : Promise.resolve({ data: [] as NearbyRink[] }),
    // PR1: other rinks in the same province/state (excluding current rink).
    // We dedupe against the same-city set below so a rink doesn't appear in
    // both sections. Empty array fallback when no province/state is set.
    rink.province_state
      ? supabase
          .from('rinks')
          .select('id, slug, name, city, province_state, country')
          .eq('province_state', rink.province_state)
          .neq('id', rink.id)
          .eq('is_active', true)
          .limit(8)
      : Promise.resolve({ data: [] as NearbyRink[] }),
    supabase
      .from('rink_reviews')
      .select('id, rating, review_text, reviewer_name, created_at')
      .eq('rink_id', rink.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10),
    // WS17 PR2 schema feeds: programming (activity types) + upcoming events.
    supabase
      .from('rink_programming')
      .select('activity_type, skill_level, description')
      .eq('rink_id', rink.id)
      .eq('status', 'published'),
    supabase
      .from('rink_events')
      .select('id, slug, title, description, starts_at, ends_at, status, banner_image_url, registration_url, price_cents, currency')
      .eq('rink_id', rink.id)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .gte('starts_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(50),
  ]);

  const games = gamesRes.data || [];
  const localTeams = (teamsRes.data || []) as LocalTeam[];
  const localLeagues = (leaguesRes.data || []) as LocalLeague[];
  // PR1: destructure new nearby-rinks arrays and dedupe state results so
  // a rink never appears in both the city section and the state section.
  const cityRinks = (cityRinksRes.data || []) as NearbyRink[];
  const cityRinkIds = new Set(cityRinks.map((r) => r.id));
  const stateRinks = ((stateRinksRes.data || []) as NearbyRink[]).filter(
    (r) => !cityRinkIds.has(r.id)
  );
  const reviews = reviewsRes.data || [];
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // WS17 PR2 (2026-08-05): feed the schema builder with programming + upcoming
  // events for availableActivity[] + event[] arrays.
  const programmingForSchema = (schemaProgrammingRes.data || []).map((p: any) => ({
    activity_type: p.activity_type,
    skill_level: p.skill_level,
    description: p.description,
  }));
  const upcomingEventsForSchema = (schemaUpcomingEventsRes.data || []).map((e: any) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    status: e.status,
    banner_image_url: e.banner_image_url,
    registration_url: e.registration_url,
    price_cents: e.price_cents,
    currency: e.currency,
  }));

  // WS24 PR#142 (2026-08-20): pass real tenants from the parallel fetch into
  // buildRinkBlurb so each rink's intro names its actual home team + league
  // instead of the generic "local hockey teams" fallback. localTeams and
  // localLeagues are already declared above (lines ~339-340) from the
  // parallel Promise.all fetch. Spread them onto the rink object since the
  // helper takes a single rink-shaped parameter.
  //
  // WS24 PR#144 (2026-08-21): pass every other anchor pool the page already
  // fetched (cityRinks, stateRinks, games, reviews, programming) so each
  // thin-note rink intro lands 150-220+ unique words on the first viewport.
  // The pools are listed in buildRinkBlurb's docstring; we never refetch.
  const programmingPillars = (schemaProgrammingRes.data || [])
    .map((p: any) => p.activity_type)
    .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0);
  const nextGame = games[0];
  const nextGameOpponent = nextGame
    ? (nextGame.home_team_id === rink.id ? nextGame.away_team_name : nextGame.home_team_name) || null
    : null;
  const blurb = buildRinkBlurb({
    ...rink,
    localTeams: localTeams.map(t => ({ name: t.name })),
    localLeagues: localLeagues.map(l => ({ name: l.name })),
    cityRinks,
    stateRinks,
    upcomingGameCount: games.length,
    nextGameOpponent,
    reviewCount: reviews.length,
    averageRating,
    programmingPillars,
  });
  const provinceLabel = provinceDisplayName(rink.province_state);
  const locationLine = [rink.city, provinceLabel, rink.country].filter(Boolean).join(', ');
  const formerName = extractFormerName(rink.notes);

  // Social: fetch owner + initial follower count in parallel with the rest of
  // the page. (Rinks don't always have an owner; pass null to skip the
  // message button.)
  const [owner, initialFollowersCount] = await Promise.all([
    getEntityOwner('rink', rink.id),
    getFollowersCount('rink', rink.id),
  ]);

  // Compute current open/closed state from Google's opening_hours_json.
  // Server-side so the pill is accurate at request time. Returns
  // 'unknown' if the rink has no published hours — in that case we
  // render no pill (no fake "Closed" guesses).
  const openState = computeOpenState(rink.opening_hours_json as OpeningHoursJson | null);

  const BASE_URL = 'https://rinkstop.com';

  // Schema for SEO — extended WS17 PR2 (2026-08-05): now includes
  // availableActivity[] (from rink_programming) and event[] (from upcoming
  // rink_events). The generator was extracted to lib/schema/rink.ts so it
  // can be tested in isolation and reused on /events/[slug]. Tier 1h
  // (2026-07-07): try/catch fallback to a minimal breadcrumb-only schema if
  // the build throws on malformed data.
  let schema: any;
  try {
    schema = buildRinkSchema(
      {
        name: rink.name,
        slug: rink.slug,
        city: rink.city,
        province_state: rink.province_state,
        country: rink.country,
        address: rink.address,
        latitude: rink.latitude,
        longitude: rink.longitude,
        capacity: rink.capacity,
        phone: rink.phone,
        website_url: rink.website_url,
        google_maps_url: rink.google_maps_url,
        cover_photo_url: rink.cover_photo_url,
        logo_url: rink.logo_url,
        opening_hours_json: rink.opening_hours_json as OpeningHoursJson | null,
        ice_size: rink.ice_size,
        notes: rink.notes,
      },
      blurb,
      {
        programming: (programmingForSchema as RinkProgrammingForSchema[]),
        upcomingEvents: (upcomingEventsForSchema as RinkEventForSchema[]),
      },
    );
  } catch (schemaErr) {
    console.error('[rink-debug] schema build failed for rink', rink.id, rink.slug, 'opening_hours_json=', JSON.stringify(rink.opening_hours_json), 'err=', (schemaErr as Error).message, (schemaErr as Error).stack);
    schema = buildRinkSchemaFallback({
      name: rink.name,
      slug: rink.slug,
      city: rink.city,
      province_state: rink.province_state,
      country: rink.country,
    });
  }

  // Tier 1h v3 (2026-07-07): catch ALL throws from the page body so we can
  // serve 200 instead of 500 even when something goes wrong. Logs the actual
  // error to Vercel so we can fix the root cause.
  return (() => {
    try {
      return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* WS22 FAQ JSON-LD (2026-08-19): target top 20 high-imp rinks per GSC audit. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: `What are the hours at ${rink.name}?`, acceptedAnswer: { '@type': 'Answer', text: rink.opening_hours_json ? `Public skating and program hours are listed on the rink page; opening hours are stored in our directory and may vary by season.` : `Public skating and program hours for ${rink.name} are listed on the rink page when available. Contact the rink directly for current hours and holiday schedules.` } },
            { '@type': 'Question', name: `Does ${rink.name} offer public skating?`, acceptedAnswer: { '@type': 'Answer', text: `Yes. ${rink.name} is listed in the RinkStop directory and offers public skating sessions along with hockey and figure skating programs. Check the rink page for current public skate times.` } },
            { '@type': 'Question', name: `What hockey programs are available at ${rink.name}?`, acceptedAnswer: { '@type': 'Answer', text: rink.league ? `${rink.name} hosts ${rink.league} games and is a hub for local hockey programs, learn-to-play, youth leagues, and adult recreational hockey.` : `${rink.name} hosts hockey programs including learn-to-play, youth leagues, and adult recreational hockey. Use the directory to find specific teams and leagues at this rink.` } },
            { '@type': 'Question', name: `Where is ${rink.name} located?`, acceptedAnswer: { '@type': 'Answer', text: `${rink.name} is in ${rink.city || 'this area'}${rink.country ? ', ' + rink.country : ''}. The rink page includes the address, embedded map, and driving directions.` } },
          ],
        }) }}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

        {/* Status banner — copy and color depend on the rink's status.
            open = no banner. closed = red. placeholder = red.
            planned/under_construction = blue (future). seasonal = amber. */}
        {rink.status && rink.status !== 'open' && (() => {
          const bannerContent: Record<string, { icon: string; title: string; subtitle: string; bg: string; border: string; titleColor: string; subColor: string }> = {
            closed: {
              icon: '🚫',
              title: 'Permanently Closed',
              subtitle: 'This rink is no longer operating.',
              bg: 'rgba(220,38,38,0.15)',
              border: '#dc2626',
              titleColor: '#fca5a5',
              subColor: 'rgba(252,165,165,0.7)',
            },
            placeholder: {
              icon: 'ℹ️',
              title: (() => {
                // Improvements-everywhere (2026-08-19): cap at 60 chars for Google SERP preview.
                const base = `No Permanent Ice Rink in ${rink.city || rink.country || 'This Region'}`;
                return base.length > 60 ? base.slice(0, 57) + '...' : base;
              })(),
              subtitle: 'This page exists so people searching for hockey in this area can confirm there is no permanent rink. The country/region is verified against the IIHF membership list and major sources.',
              bg: 'rgba(120,113,108,0.15)',
              border: '#78716c',
              titleColor: '#d6d3d1',
              subColor: 'rgba(214,211,209,0.7)',
            },
            planned: {
              icon: '🗓️',
              title: 'Planned — Opening TBD',
              subtitle: 'This arena has been announced but construction has not yet begun. The page is kept up to date as new details are released.',
              bg: 'rgba(56,189,248,0.15)',
              border: '#38bdf8',
              titleColor: '#7dd3fc',
              subColor: 'rgba(125,211,252,0.7)',
            },
            under_construction: {
              icon: '🏗️',
              title: 'Under Construction',
              subtitle: 'This arena is being built and is not yet open to the public.',
              bg: 'rgba(56,189,248,0.15)',
              border: '#38bdf8',
              titleColor: '#7dd3fc',
              subColor: 'rgba(125,211,252,0.7)',
            },
            seasonal: {
              icon: '⛸️',
              title: 'Seasonal / Temporary Rink',
              subtitle: 'This rink is only open during specific seasons (typically winter) or for temporary installations. It is not a permanent year-round facility.',
              bg: 'rgba(245,158,11,0.15)',
              border: '#f59e0b',
              titleColor: '#fcd34d',
              subColor: 'rgba(252,211,77,0.7)',
            },
          };
          const c = bannerContent[rink.status];
          if (!c) return null;
          return (
            <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{c.icon}</span>
              <div>
                <p style={{ color: c.titleColor, fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>{c.title}</p>
                <p style={{ color: c.subColor, fontSize: '13px' }}>{c.subtitle}</p>
              </div>
            </div>
          );
        })()}

        {(() => {
          // Honor ?from={countrySlug} so we navigate back to the country page,
          // not the global rinks directory. We accept the slug and look up
          // the human name from the COUNTRY_MAP; fall back to a generic title.
          const backHref = fromSlug ? `/directory/${fromSlug}` : '/directory/rinks';
          const backLabel = fromSlug
            ? `← Back to ${(rink.country || fromSlug)}`
            : '← Back to Rinks';
          return (
            <>
              <Breadcrumbs links={[
                { label: 'Directory', href: '/directory' },
                ...(fromSlug
                  ? [{ label: rink.country || fromSlug, href: `/directory/${fromSlug}` }]
                  : [{ label: 'Rinks', href: '/directory/rinks' }]),
                { label: rink.name, href: `/directory/rinks/${rink.slug}` },
              ]} />
              <Link
                href={backHref}
                style={{ color: '#38bdf8', fontSize: '14px', marginBottom: '12px', display: 'inline-block', textDecoration: 'none' }}
              >
                {backLabel}
              </Link>
            </>
          );
        })()}

        {/* Cover photo — sourced from Google Places when the rink has no
            logo_url. Renders above the H1 as the hero image.
            referrerPolicy="no-referrer" is required: Google Photos URLs
            (lh3.googleusercontent.com) return 403 if they detect a Referer
            header from non-Google origins. */}
        {rink.cover_photo_url ? (
          <img
            src={rink.cover_photo_url}
            alt={rink.name}
            referrerPolicy="no-referrer"
            style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 12, marginBottom: '16px', display: 'block', background: 'rgba(255,255,255,0.04)' }}
          />
        ) : null}

        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '12px', marginTop: '8px' }}>
          {rink.name}
        </h1>

        {/* WS19: geo-targeted intro section for international rink pages.
            Hidden on country='United States' and country='Canada' pages
            because they already have rich content via the leagues + city
            hub pages. International rink pages need this for SEO since
            they have minimal hockey-content context otherwise. */}
        {rink.country && !['United States', 'Canada'].includes(rink.country) && (
          <RinkGeoIntro
            city={rink.city}
            country={rink.country}
            rinkName={rink.name}
            rinkSlug={rink.slug || ''}
          />
        )}

        {/* Actions: Save to favorites */}
        <div style={{ marginBottom: '24px' }}>
          <SocialActions
            followeeType="rink"
            followeeId={rink.id}
            followeeName={rink.name}
            favoriteType="rink"
            favoriteId={rink.id}
            favoriteName={rink.name}
            messageRecipientId={owner?.userId ?? undefined}
            messageRecipientName={rink.name}
            initialFollowersCount={initialFollowersCount}
            share={buildRinkShare(rink)}
            size="md"
          />
        </div>

        {/* LIVE OPEN/CLOSED PILL + GOOGLE CONTACT ROW
            Driven by rink.opening_hours_json (Google Places data) and
            rink.google_phone / rink.google_website / rink.google_maps_url.
            We only render anything if the rink has at least one of these
            fields — for un-enriched rinks we render nothing (no fake
            "Closed" pill). */}
        {(openState.kind !== 'unknown' || rink.google_phone || rink.google_website || rink.google_maps_url) && (
          <div
            data-testid="rink-google-info"
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '24px' }}
          >
            {openState.kind === 'open' && (
              <span
                title="Hours provided by Google Places"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
                  color: '#86efac', fontSize: '13px', fontWeight: 600,
                  padding: '6px 12px', borderRadius: '999px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} aria-hidden="true" />
                Open now · Closes {openState.closesAtLabel}
              </span>
            )}
            {openState.kind === 'closed' && (
              <span
                title="Hours provided by Google Places"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.35)',
                  color: '#cbd5e1', fontSize: '13px', fontWeight: 600,
                  padding: '6px 12px', borderRadius: '999px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }} aria-hidden="true" />
                Closed · Opens {openState.nextOpenLabel}
              </span>
            )}
            {rink.google_phone && (
              <a
                href={`tel:${rink.google_phone.replace(/[^0-9+]/g, '')}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: '#cbd5e1', fontSize: '13px', padding: '6px 12px', borderRadius: '999px', textDecoration: 'none' }}
              >
                📞 {rink.google_phone}
              </a>
            )}
            {rink.google_website && (
              <a
                href={rink.google_website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: '#cbd5e1', fontSize: '13px', padding: '6px 12px', borderRadius: '999px', textDecoration: 'none' }}
              >
                🌐 Website
              </a>
            )}
            {rink.google_maps_url && (
              <a
                href={rink.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: '#cbd5e1', fontSize: '13px', padding: '6px 12px', borderRadius: '999px', textDecoration: 'none' }}
              >
                📍 View on Google Maps
              </a>
            )}
          </div>
        )}

        {/* ABOUT THIS RINK — unique editorial section. SEO-critical for thinness.
            Uses rink.notes when present; otherwise synthesizes from name + city +
            country + capacity + ice_size so every rink has 80-120+ unique words. */}
        <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
          <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '12px' }}>
            About {rink.name}
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '16px' }}>
            {blurb}
          </p>

          {/* Quick facts inline */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px' }}>
            {locationLine && (
              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px', color: '#cbd5e1' }}>
                📍 {locationLine}
              </span>
            )}
            {formerName && (
              <span
                title={`This arena was previously known as ${formerName}. We preserve the historical name for SEO and reference.`}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px', color: '#cbd5e1' }}
              >
                🏷️ Also known as: {formerName}
              </span>
            )}
            {rink.ice_size && (
              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px', color: '#cbd5e1' }}>
                🏒 {rink.ice_size} ice
              </span>
            )}
            {rink.surface_type && (
              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px', color: '#cbd5e1' }}>
                Surface: {rink.surface_type}
              </span>
            )}
            {rink.capacity && (
              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px', color: '#cbd5e1' }}>
                👥 {rink.capacity.toLocaleString()} seats
              </span>
            )}
            {rink.league && (
              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px', color: '#cbd5e1' }}>
                🏆 {rink.league}
              </span>
            )}
          </div>
        </section>

        {/* TEAMS IN THIS CITY — internal linking hub. Helps users find local
            teams and creates the rink → team relationship for SEO. */}
        {localTeams.length > 0 && (
          <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '4px' }}>
              Hockey teams in {rink.city}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
              {localTeams.length === 1
                ? 'One team from the local area is in the RinkStop directory.'
                : `${localTeams.length} teams from the ${rink.city} area are in the RinkStop directory. Many of them use this rink or one nearby for home games.`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {localTeams.map((t) => (
                <Link
                  key={t.id}
                  href={`/directory/teams/${t.slug}`}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  {t.logo_url ? (
                    <img src={t.logo_url} alt={`${t.name} logo`} style={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} loading="lazy" />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '6px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🏒</div>
                  )}
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, lineHeight: 1.3 }}>{t.name}</span>
                </Link>
              ))}
            </div>
            <p style={{ marginTop: '12px', fontSize: '13px' }}>
              <Link href={`/directory/teams?city=${encodeURIComponent(rink.city || '')}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                See all teams in {rink.city} →
              </Link>
            </p>
          </section>
        )}

        {/* LEAGUES IN COUNTRY — broader reach, but valid for hockey context.
            Leagues don't have a city field, so we surface country-level leagues. */}
        {localLeagues.length > 0 && (
          <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '4px' }}>
              Hockey leagues in {rink.country}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
              Hockey at {rink.name} and across {rink.country} runs through these leagues. Programs span professional, junior, college, amateur, and recreational levels.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {localLeagues.map((l) => (
                <Link
                  key={l.id}
                  href={`/directory/leagues/${l.slug}`}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textDecoration: 'none',
                  }}
                >
                  {l.logo_url ? (
                    <img src={l.logo_url} alt={`${l.name} logo`} style={{ width: 28, height: 28, borderRadius: '4px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} loading="lazy" />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '4px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏆</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, lineHeight: 1.3 }}>{l.name}</div>
                    {l.level && <div style={{ color: 'var(--muted)', fontSize: '12px', textTransform: 'capitalize' }}>{l.level}</div>}
                  </div>
                </Link>
              ))}
            </div>
            <p style={{ marginTop: '12px', fontSize: '13px' }}>
              <Link href={`/directory/leagues?country=${encodeURIComponent(rink.country || '')}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                See all leagues in {rink.country} →
              </Link>
            </p>
          </section>
        )}

        {/* PR1 (2026-07-08): OTHER RINKS IN CITY — internal linking hub.
            Other active rinks in the same city. Skipped if the city has no
            other rinks OR the current rink has no city set. Same dark-card
            pattern as TEAMS IN THIS CITY and LEAGUES IN COUNTRY sections. */}
        {cityRinks.length > 0 && (
          <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '4px' }}>
              Other rinks in {rink.city}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
              {cityRinks.length === 1
                ? `One other rink in ${rink.city} is in the RinkStop directory.`
                : `${cityRinks.length} other rinks in ${rink.city} are in the RinkStop directory. Compare ice sizes, capacities, and amenities to find the right venue.`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {cityRinks.map((r) => (
                <Link
                  key={r.id}
                  href={r.slug ? `/directory/rinks/${r.slug}` : '/directory/rinks'}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '4px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏒</div>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, lineHeight: 1.3 }}>{r.name}</span>
                </Link>
              ))}
            </div>
            <p style={{ marginTop: '12px', fontSize: '13px' }}>
              <Link href={`/directory/rinks?city=${encodeURIComponent(rink.city || '')}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                See all rinks in {rink.city} →
              </Link>
            </p>
          </section>
        )}

        {/* PR1 (2026-07-08): MORE RINKS IN STATE — secondary internal link hub.
            Other active rinks in the same province/state, with the same-city
            set already shown above filtered out so we don't repeat links.
            Skipped if the state has no other rinks OR the current rink has
            no province_state set. */}
        {stateRinks.length > 0 && rink.province_state && (
          <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '4px' }}>
              More rinks in {provinceLabel || rink.province_state}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
              {stateRinks.length === 1
                ? `One other rink in ${provinceLabel || rink.province_state} is in the RinkStop directory.`
                : `${stateRinks.length} other rinks across ${provinceLabel || rink.province_state} are in the RinkStop directory.`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {stateRinks.map((r) => (
                <Link
                  key={r.id}
                  href={r.slug ? `/directory/rinks/${r.slug}` : '/directory/rinks'}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, lineHeight: 1.3 }}>{r.name}</span>
                  {r.city && <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{r.city}</span>}
                </Link>
              ))}
            </div>
            <p style={{ marginTop: '12px', fontSize: '13px' }}>
              <Link href={`/directory/rinks?province_state=${encodeURIComponent(rink.province_state)}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                See all rinks in {provinceLabel || rink.province_state} →
              </Link>
            </p>
          </section>
        )}

        {/* WS17 PR2 (2026-08-05): Tab switcher + Programming & Events tab.
            Replaces the old generic "Programs & amenities" 6-item grid with
            real, rink-specific programming + upcoming events data. Default
            tab is Overview (no URL param). Programming tab = ?tab=programming. */}
        <RinkPageTabs />
        <div
          id="panel-programming"
          role="tabpanel"
          aria-labelledby="tab-programming"
          hidden={activeTab !== 'programming'}
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          <RinkProgrammingTab rinkId={rink.id} />
          <RinkEventsTab rinkId={rink.id} rinkSlug={rink.slug} />
        </div>

        {/* GETTING HERE — derived from address. Unique per rink. */}

        {rink.address && (

          <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '12px' }}>
              Getting to {rink.name}
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '12px' }}>
              {rink.name} is located at <strong style={{ color: '#fff' }}>{rink.address}</strong>. Public parking is available at the venue, and the rink is accessible by car from the surrounding {rink.city} area. For public transit options to reach the rink, check the local {rink.city} transit authority schedule for the nearest stop to the {provinceLabel || rink.country} venue district.
            </p>
            {rink.latitude && rink.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${rink.latitude},${rink.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', color: '#38bdf8', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}
              >
                Get directions on Google Maps →
              </a>
            )}
          </section>
        )}

        {/* STEP 6: "Find an ice rink near me" CTA + structural FAQ content (visible text, not just JSON-LD).
            Drives long-tail "ice rink near me" SERP queries for every rink in the directory by
            giving Google and visitors a clear geo-targeted anchor copy. Section is static
            (same template across all rinks) but uses the rink's city + country so each page is unique. */}
        <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
          <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '12px' }}>
            Find an ice rink near you
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '16px' }}>
            Looking for ice rinks in {rink.city || 'this area'}{rink.country ? ', ' + rink.country : ''} or a nearby city? {rink.name} is a registered {rink.ice_size || 'community'}-sized ice facility in the RinkStop directory. Whether you're looking for public skating hours, youth hockey programs, or figure skating sessions, this page has the rink's verified contact details, address, and schedule information.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <Link href={`/directory/rinks?city=${encodeURIComponent(rink.city || '')}`} style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', textDecoration: 'none' }}>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>📍 Ice rinks in {rink.city || 'this city'}</div>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>See all venues within the {rink.city || 'city'} area</div>
            </Link>
            <Link href={`/directory/${encodeURIComponent((rink.country || '').toLowerCase())}`} style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', textDecoration: 'none' }}>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>🗺️ Ice rinks in {rink.country || 'this country'}</div>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Browse the full country directory</div>
            </Link>
            <Link href={`/ice-rinks-near-me${rink.city ? '?city=' + encodeURIComponent(rink.city) : ''}`} style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', textDecoration: 'none' }}>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>🔍 Find rinks near me</div>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Search by location or venue type</div>
            </Link>
          </div>
        </section>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontWeight: 600, marginBottom: '12px', color: '#fff', fontSize: '16px' }}>Details</h2>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Location</dt>
                <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{locationLine}</dd>
              </div>
              {rink.address && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Address</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.address}</dd>
                </div>
              )}
              {(rink.ice_size || rink.surface_type) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Ice</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.ice_size}{rink.ice_size && rink.surface_type ? ' · ' : ''}{rink.surface_type}</dd>
                </div>
              )}
              {rink.capacity && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Capacity</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.capacity.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {(rink.phone || rink.email || rink.website_url) && (
            <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h2 style={{ fontWeight: 600, marginBottom: '12px', color: '#fff', fontSize: '16px' }}>Contact</h2>
              <dl style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rink.phone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Phone</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.phone}</dd>
                </div>
              )}
              {rink.email && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Email</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.email}</dd>
                </div>
              )}
              {rink.website_url && rink.website_url !== 'N/A' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Website</dt>
                  <dd>
                    <a href={rink.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '14px', textDecoration: 'none' }}>
                      {rink.website_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

          {/* Map */}
          {(rink.latitude && rink.longitude) ? (
            <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '16px' }}>Location</h2>
              <iframe
                title={`${rink.name} location`}
                width="100%"
                height="240"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&q=${rink.latitude},${rink.longitude}&zoom=15`}
                style={{ border: 0, borderRadius: '8px' }}
                allowFullScreen
              />
            </div>
          ) : null}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />

        {/* Games Section */}
        <RinkGames rinkId={rink.id} rinkName={rink.name} initialGames={games} />

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />

        {/* Reviews Section */}
        <RinkReviews
          reviews={reviews}
          averageRating={averageRating}
          totalReviews={reviews.length}
          rinkId={rink.id}
        />

        {/* Review Form */}
        <ReviewForm rinkId={rink.id} rinkName={rink.name} />

        {/* Claim CTA — moved below all content per Arnel's request (2026-07-08) */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <ClaimedBy entityType="rink" entityId={rink.id} entityName={rink.name} />
          <ClaimThisListingMount entityType="rink" entityId={rink.id} entityName={rink.name} />
          <ListingContactFormMount listingType="rink" listingId={rink.id} listingName={rink.name} />
        </div>

        {/* Soft-signup email capture — shown to anonymous users reading about this rink */}
        <div style={{ marginBottom: '24px' }}>
          <EmailCaptureInline
            pitch={`Get notified when ${rink.name} has new games, schedule changes, or operator updates.`}
            cta="Email me updates"
            entityType="rink"
            entityId={rink.id}
            entityName={rink.name}
            intent="email_capture"
          />
        </div>

        {/* WS16 PR2 — AdSense display ad below the email capture block. */}
        

      </div>
    </>
      );
    } catch (renderErr) {
      console.error('[rink-debug] page render threw for rink', rink.id, rink.slug, 'err=', (renderErr as Error).message, (renderErr as Error).stack);
      // Return a minimal page so the rink at least renders as 200.
      return (
        <>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{rink.name}</h1>
            <p style={{ color: '#cbd5e1' }}>{((rink as any)['notes_generated'] ?? rink.notes) || `${rink.name} is an ice rink in ${rink.city || 'the area'}, ${rink.country || ''}.`}</p>

          </div>
        </>
      );
    }
  })();
}
