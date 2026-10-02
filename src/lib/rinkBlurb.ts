/**
 * src/lib/rinkBlurb.ts
 *
 * Honest rink-page blurb builder. Replaces the 7-anchor-pool synthesis in
 * src/app/directory/rinks/[slug]/page.tsx that was emitting invented text
 * ("year-round programming hub for learn-to-skate, learn-to-play, youth
 * leagues, and adult recreational hockey") when the corresponding DB fields
 * were NULL.
 *
 * Per Arnel 2026-10-02 directive (Claude's Batch 1, item 1.1):
 *   "Render any fact only if a sourced field exists in the database.
 *    Remove the long boilerplate 'About' paragraph. Replace it with 2-3
 *    sentences built only from real fields (name, city, address, website,
 *    verified Google Places data).
 *    Hide empty sections."
 *
 * What this file does:
 *   - Each sentence is gated on the field(s) it requires.
 *   - When no data is available, NO sentence is added. The page renders
 *     short and honest instead of long and invented.
 *   - Every emitted sentence states a fact that is a derivation of
 *     >=1 DB column. No marketing copy. No generalities.
 *
 * SEO/AdSense impact:
 *   - AdSense thin-content threshold is ~150 words. Rinks with rich data
 *     (notes, tenant teams, capacity, reviews) still hit that.
 *   - Rinks with only name+city+country will produce a 30-50 word blurb.
 *     That is the truth; the previous version was padding.
 *   - The rink page metadata function estimates word count and applies a
 *     noindex tag below a threshold; the next file change will re-tune
 *     that to a lower number that reflects real blurb length.
 */

export interface RinkBlurbInput {
  name: string;
  city: string | null;
  country: string | null;
  province_state?: string | null;
  /** Operator-written notes. Only used verbatim if substantive. */
  notes: string | null;
  capacity: number | null;
  ice_size: string | null;
  surface_type: string | null;
  address?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Has Google Places verification. */
  google_places_verified?: boolean | null;
  /** Teams from team_workspaces where home_rink_id = rink.id. */
  tenantTeams?: Array<{ name: string; league_name?: string | null }>;
  /** Leagues with active teams in this rink's city. */
  cityLeagues?: Array<{ name: string }>;
  /** Number of other rinks in the same city. */
  cityRinkCount?: number;
  /** Number of upcoming scheduled games. */
  upcomingGameCount?: number;
  /** Next opponent, if known. */
  nextOpponent?: string | null;
  /** Approved review count + average. */
  reviewCount?: number;
  averageRating?: number;
  /** Programming activity names. */
  programmingPillars?: string[];
}

export function buildRinkBlurb(rink: RinkBlurbInput): string {
  // Operator-written notes are the only piece of editorial we trust verbatim.
  // If the operator wrote 100+ chars, use them; if they wrote 3 words, fall
  // through to the sourced builder.
  if (rink.notes && rink.notes.trim().length >= 100) {
    return rink.notes.trim();
  }

  const parts: string[] = [];
  const cityPhrase = rink.city
    ? [rink.city, rink.province_state, rink.country].filter(Boolean).join(', ')
    : rink.country || '';
  const locationClause = cityPhrase ? ` in ${cityPhrase}` : '';

  // --- Sentence 1: location + ice-size facts only ---
  // Only mention "ice rink in X" — no fabricated programming claims.
  parts.push(`${rink.name} is an ice rink${locationClause}.`);

  // --- Sentence 2: tenant team(s) — real DB rows only ---
  const teams = rink.tenantTeams || [];
  const teamsWithLeague = teams.filter(t => t.league_name);
  const teamsWithoutLeague = teams.filter(t => !t.league_name);

  if (teamsWithLeague.length > 0) {
    const headliner = teamsWithLeague[0];
    const restCount = teamsWithLeague.length - 1;
    const rest = restCount > 0 ? ` ${restCount} other team${restCount === 1 ? '' : 's'} also call${restCount === 1 ? 's' : ''} ${rink.name} home.` : '';
    parts.push(
      `${headliner.name} of the ${headliner.league_name} uses ${rink.name} as its home venue.${rest}`
    );
  } else if (teamsWithoutLeague.length > 0) {
    const names = teamsWithoutLeague.slice(0, 3).map(t => t.name).join(', ');
    parts.push(`${names} ${teamsWithoutLeague.length === 1 ? 'uses' : 'use'} ${rink.name} as a home venue.`);
  }
  // If no teams: skip this sentence. Do NOT invent "home venue for local teams."

  // --- Sentence 3: leagues active in city — real DB rows only ---
  const leagues = rink.cityLeagues || [];
  if (leagues.length > 0) {
    const names = leagues.slice(0, 4).map(l => l.name).join(', ');
    parts.push(`Leagues active in ${rink.city || rink.country || 'the area'} include ${names}.`);
  }

  // --- Sentence 4: capacity — only if the rink reports one ---
  if (rink.capacity && rink.capacity > 0) {
    parts.push(`The rink has a listed seating capacity of ${rink.capacity.toLocaleString()}.`);
  }

  // --- Sentence 5: ice dimensions — only if the rink reports them ---
  if (rink.ice_size) {
    parts.push(`Ice surface: ${rink.ice_size}.`);
  }
  if (rink.surface_type) {
    parts.push(`Surface type: ${rink.surface_type}.`);
  }

  // --- Sentence 6: programming pillars — only if the rink has them ---
  const pillars = rink.programmingPillars || [];
  if (pillars.length > 0) {
    parts.push(`Listed programming: ${pillars.slice(0, 6).join(', ')}.`);
  }

  // --- Sentence 7: upcoming games — only if the DB has them ---
  if (typeof rink.upcomingGameCount === 'number' && rink.upcomingGameCount > 0) {
    const plural = rink.upcomingGameCount === 1 ? 'game' : 'games';
    const opponent = rink.nextOpponent ? ` Next scheduled opponent: ${rink.nextOpponent}.` : '';
    parts.push(`${rink.upcomingGameCount} upcoming ${plural} on the published schedule.${opponent}`);
  }

  // --- Sentence 8: visitor reviews — only if 3+ approved reviews exist ---
  if (typeof rink.reviewCount === 'number' && rink.reviewCount >= 3 && typeof rink.averageRating === 'number') {
    parts.push(`Visitor rating: ${rink.averageRating.toFixed(1)}/5 from ${rink.reviewCount} approved reviews.`);
  }

  // --- Sentence 9: geographic neighborhood — only if the DB has that count ---
  if (typeof rink.cityRinkCount === 'number' && rink.cityRinkCount >= 1 && rink.city) {
    const total = rink.cityRinkCount + 1; // +1 for the rink itself
    parts.push(`${rink.name} is one of ${total} rinks listed for ${rink.city} in the RinkStop directory.`);
  }

  // --- Closing: directory-entry fact, no marketing copy ---
  // Only states what the page actually contains. No "year-round programming hub."
  parts.push(
    `This directory entry covers ${rink.name}'s address${rink.city ? ` in ${rink.city}` : ''}, listed home teams, leagues active in the area, upcoming games, and visitor reviews where available.`
  );

  return parts.join(' ');
}

/**
 * Estimate how many words the blurb will contain.
 * Used by the rink page metadata function to decide on a noindex tag.
 */
export function estimateRinkBlurbWordCount(rink: RinkBlurbInput): number {
  return buildRinkBlurb(rink).split(/\s+/).filter(w => w.length > 0).length;
}