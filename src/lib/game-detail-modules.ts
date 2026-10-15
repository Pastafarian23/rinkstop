import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { historicalAliasLabel, displayNameForGame } from '@/lib/franchise-name-lookup';

// 2026-10-15 (Arnel 09:03 directive): server-rendered box-score /
// venue / linked-articles / linked-highlights / historical-alias
// data for /directory/games/[id]. All wrapped in unstable_cache with
// the game id (plus status / tier where relevant) in the key so
// cache poisoning can't cross tenants.
//
// All blocks hide themselves when their data source is empty — the
// page calls these getters, gets back possibly-null / possibly-empty
// shapes, and the JSX skips rendering.  Zero browser-side Supabase
// queries: every read happens here in the server module loader.

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export type GameStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed';

// Cache-version prefix — bump when a getter's signature or query
// changes so old entries are ignored immediately.
const CACHE_VERSION = 'v3';

// --- Venue & boxscore-supporting data (from NHL.com game_data) ------
// 2026-10-15: this used to live in /api/game/[id]/boxscore which 500'd
// per the 2026-10-09 collision incident.  We now extract the bits we
// can from fixtures.game_data (NHL.com payload, when present).

export interface VenueData {
  name: string | null;
  timezone: string | null;
  utcOffset: string | null;
}

export interface BroadcastData {
  network: string;
  market: string | null;
  countryCode: string | null;
}

export interface RecapLinkData {
  threeMinRecap: string | null;
  condensedGame: string | null;
  gameCenterLink: string | null;
  winningGoalieName: string | null;
  winningGoaliePlayerId: number | null;
  periodType: string | null; // "REG", "OT", "SO"
}

export interface BoxscoreLite {
  /** "Highlightly" or "nhl.com" — which source the data came from. */
  source: 'nhl.com' | 'highlightly' | null;
  /** League name as known by the source (e.g. "NHL"). */
  leagueName: string | null;
  /** Period-by-period scores (may be empty for non-NHL or pre-2010). */
  periodScores: { period: string; home: number; away: number }[];
  /** Score-discrepancy note: only set if DB score differs from source score. */
  scoreDiscrepancy: { home: { db: number; hl: number }; away: { db: number; hl: number } } | null;
  /** The three-stars of the game (NHL.com summary, when present). */
  threeStars: { name: string; teamAbbrev: string | null }[];
  /** The winning goalie's name + id. */
  goalies: {
    home: { name: string; playerId: number | null; decision: 'W' | 'L' | 'OTL' | null } | null;
    away: { name: string; playerId: number | null; decision: 'W' | 'L' | 'OTL' | null } | null;
  };
  /** Shots on goal (from NHL.com summary when present). */
  teamStats: { home: { sog: number | null }; away: { sog: number | null } } | null;
}

/** Extract venue, broadcasts, recap link, and a slim boxscore from
 *  fixtures.game_data (NHL.com payload) for completed NHL games.
 *  Returns nulls when the field is missing. */
export async function getVenueAndBoxscore(
  id: string,
  gameData: any,
  status: GameStatus,
  scheduledAt: string,
  homeTeamName: string,
  awayTeamName: string,
  dbHomeScore: number | null,
  dbAwayScore: number | null,
  homeTeamAbbrev: string | null,
  awayTeamAbbrev: string | null,
): Promise<{
  venue: VenueData;
  broadcasts: BroadcastData[];
  recap: RecapLinkData;
  boxscore: BoxscoreLite | null;
}> {
  // Compute a tier so the cache can be invalidated when status
  // changes (the key includes the tier — see below).
  const tier = tierForStatus(status, scheduledAt);
  const fetchImpl = unstable_cache(
    async () => {
      const venueName = typeof gameData?.venue?.default === 'string' ? gameData.venue.default : null;
      const venueTimezone = typeof gameData?.venueTimezone === 'string' ? gameData.venueTimezone : null;
      const venueUtcOffset = typeof gameData?.venueUTCOffset === 'string' ? gameData.venueUTCOffset : null;
      const broadcasts: BroadcastData[] = Array.isArray(gameData?.tvBroadcasts)
        ? gameData.tvBroadcasts
            .map((b: any) => ({
              network: typeof b?.network === 'string' ? b.network : '',
              market: typeof b?.market === 'string' ? b.market : null,
              countryCode: typeof b?.countryCode === 'string' ? b.countryCode : null,
            }))
            .filter((b: BroadcastData) => b.network)
        : [];

      const winningGoalieName =
        gameData?.winningGoalie?.lastName?.default
          ? `${gameData.winningGoalie.firstInitial?.default ?? ''} ${gameData.winningGoalie.lastName.default}`.trim()
          : null;
      const winningGoaliePlayerId =
        typeof gameData?.winningGoalie?.playerId === 'number' ? gameData.winningGoalie.playerId : null;
      const periodType =
        typeof gameData?.gameOutcome?.lastPeriodType === 'string'
          ? gameData.gameOutcome.lastPeriodType
          : null;

      const recap: RecapLinkData = {
        threeMinRecap: typeof gameData?.threeMinRecap === 'string' ? gameData.threeMinRecap : null,
        condensedGame: typeof gameData?.condensedGame === 'string' ? gameData.condensedGame : null,
        gameCenterLink: typeof gameData?.gameCenterLink === 'string' ? gameData.gameCenterLink : null,
        winningGoalieName,
        winningGoaliePlayerId,
        periodType,
      };

      // Only build a boxscore for completed games.  For non-NHL or
      // games without NHL.com game_data, this stays null and the
      // page hides every box-score block.
      let boxscore: BoxscoreLite | null = null;
      if (status === 'completed' && (venueName || winningGoalieName || gameData?.periodDescriptor)) {
        // Score-discrepancy: DB score vs NHL.com gameData score.
        const hlHome = typeof gameData?.homeTeam?.score === 'number' ? gameData.homeTeam.score : null;
        const hlAway = typeof gameData?.awayTeam?.score === 'number' ? gameData.awayTeam.score : null;
        const scoreDiscrepancy =
          dbHomeScore !== null &&
          dbAwayScore !== null &&
          hlHome !== null &&
          hlAway !== null &&
          (dbHomeScore !== hlHome || dbAwayScore !== hlAway)
            ? { home: { db: dbHomeScore, hl: hlHome }, away: { db: dbAwayScore, hl: hlAway } }
            : null;

        // We don't have period-by-period scores in fixtures.game_data
        // (the NHL.com summary payload doesn't include them at this
        // level of detail), so periodScores stays empty.  The page
        // hides the "Period Scores" block when this is empty.
        const periodScores: { period: string; home: number; away: number }[] = [];

        // Three-stars: not in the summary payload either.  Empty
        // means the page hides the block.
        const threeStars: { name: string; teamAbbrev: string | null }[] = [];

        // Goalies: only the winning goalie is in the summary.  We
        // surface that on the winning side and leave the loser null.
        const winningAbbrev =
          periodType === 'SO' && hlHome !== null && hlAway !== null
            ? hlHome > hlAway
              ? homeTeamAbbrev
              : awayTeamAbbrev
            : hlHome !== null && hlAway !== null
            ? hlHome > hlAway
              ? homeTeamAbbrev
              : awayTeamAbbrev
            : null;
        const goalies: BoxscoreLite['goalies'] = {
          home:
            winningGoalieName && winningAbbrev === homeTeamAbbrev
              ? { name: winningGoalieName, playerId: winningGoaliePlayerId, decision: 'W' }
              : null,
          away:
            winningGoalieName && winningAbbrev === awayTeamAbbrev
              ? { name: winningGoalieName, playerId: winningGoaliePlayerId, decision: 'W' }
              : null,
        };

        // Shots on goal: not in the summary payload.  Empty means
        // the page hides the block.
        const teamStats: BoxscoreLite['teamStats'] = { home: { sog: null }, away: { sog: null } };

        boxscore = {
          source: 'nhl.com',
          leagueName: 'NHL',
          periodScores,
          scoreDiscrepancy,
          threeStars,
          goalies,
          teamStats,
        };
      }

      return {
        venue: { name: venueName, timezone: venueTimezone, utcOffset: venueUtcOffset },
        broadcasts,
        recap,
        boxscore,
      };
    },
    // The id is in the key; status + tier are also in the key so a
    // status flip (scheduled → in_progress → completed) lands on a
    // fresh cache entry instead of serving the old one.
    ['game-detail-extra', CACHE_VERSION, id, status, String(tier)],
    { revalidate: tier, tags: ['game-detail', `game:${id}`] },
  );
  return fetchImpl();
}

// --- Linked articles (server-side, replaces the old client join) ----

export interface LinkedArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  reading_time_minutes: number | null;
  author_name: string | null;
  published_at: string | null;
  path: string;
}

export async function getLinkedArticles(
  id: string,
  gameData: any,
  gameDate: string,
  homeTeamName: string | null,
  awayTeamName: string | null,
  status: GameStatus,
  scheduledAt: string,
): Promise<LinkedArticle[]> {
  // Only attempt this for completed games; we use the scheduled_at
  // day as the join window.
  if (!homeTeamName || !awayTeamName) return [];
  const tier = tierForStatus(status, scheduledAt);
  const fetchImpl = unstable_cache(
    async (): Promise<LinkedArticle[]> => {
      try {
        const sb = getSupabase();
        const { data: articles } = await sb
          .from('posts')
          .select('id, slug, title, subtitle, category, reading_time_minutes, author_name, published_at, highlight_id')
          .eq('status', 'published')
          .not('highlight_id', 'is', null)
          .order('published_at', { ascending: false })
          .limit(50);
        const articlesList = (articles as any[]) || [];
        if (articlesList.length === 0) return [];
        const hlIds = articlesList.map((a: any) => a.highlight_id).filter(Boolean);
        if (hlIds.length === 0) return [];
        const { data: matchingHighlights } = await sb
          .from('highlight_backups')
          .select('id, home_team_name, away_team_name, match_date')
          .in('id', hlIds)
          .gte('match_date', `${gameDate}T00:00:00Z`)
          .lt('match_date', `${gameDate}T23:59:59Z`);
        const matchesList = (matchingHighlights as any[]) || [];
        if (matchesList.length === 0) return [];
        const hlSet = new Set(matchesList.map((h: any) => h.id));
        return articlesList
          .filter((a: any) => hlSet.has(a.highlight_id))
          .filter((a: any) => {
            const hl = matchesList.find((h: any) => h.id === a.highlight_id);
            if (!hl) return false;
            return hl.home_team_name === homeTeamName || hl.away_team_name === awayTeamName;
          })
          .map((a: any) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            subtitle: a.subtitle ?? null,
            category: a.category ?? null,
            reading_time_minutes: a.reading_time_minutes ?? null,
            author_name: a.author_name ?? null,
            published_at: a.published_at ?? null,
            path: `/news/${a.slug}`,
          }))
          .slice(0, 5);
      } catch {
        return [];
      }
    },
    ['game-detail-linked-articles', CACHE_VERSION, id, status, String(tier)],
    { revalidate: tier, tags: ['game-detail', `game:${id}`] },
  );
  return fetchImpl();
}

// --- Linked highlights (videos) --------------------------------------
// 2026-10-15: highlight_backups.video_url / embed_url is the source.
// Filter by team names + match_date window.

export interface LinkedHighlight {
  id: number;
  title: string;
  video_url: string | null;
  embed_url: string | null;
  source: string | null;
  channel: string | null;
  league_name: string | null;
  image_url: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
}

export async function getLinkedHighlights(
  id: string,
  gameDate: string,
  homeTeamName: string | null,
  awayTeamName: string | null,
  status: GameStatus,
  scheduledAt: string,
): Promise<LinkedHighlight[]> {
  if (!homeTeamName || !awayTeamName) return [];
  const tier = tierForStatus(status, scheduledAt);
  const fetchImpl = unstable_cache(
    async (): Promise<LinkedHighlight[]> => {
      try {
        const sb = getSupabase();
        const { data: rows } = await sb
          .from('highlight_backups')
          .select('id, title, video_url, embed_url, source, channel, league_name, image_url, home_team_name, away_team_name, match_date')
          .or(`home_team_name.eq.${homeTeamName},away_team_name.eq.${awayTeamName}`)
          .gte('match_date', `${gameDate}T00:00:00Z`)
          .lt('match_date', `${gameDate}T23:59:59Z`)
          .order('match_date', { ascending: false })
          .limit(5);
        return (rows || []).map((h: any) => ({
          id: h.id,
          title: h.title,
          video_url: h.video_url ?? null,
          embed_url: h.embed_url ?? null,
          source: h.source ?? null,
          channel: h.channel ?? null,
          league_name: h.league_name ?? null,
          image_url: h.image_url ?? null,
          home_team_name: h.home_team_name ?? null,
          away_team_name: h.away_team_name ?? null,
        }));
      } catch {
        return [];
      }
    },
    ['game-detail-linked-highlights', CACHE_VERSION, id, status, String(tier)],
    { revalidate: tier, tags: ['game-detail', `game:${id}`] },
  );
  return fetchImpl();
}

// --- Historical alias (Phoenix Coyotes → Utah HC) -------------------
// Pure CPU, no DB call. Delegates to the franchise-name helper.

export interface HistoricalAlias {
  homeAlias: string | undefined;
  awayAlias: string | undefined;
  homeChainLink: string | null;
  awayChainLink: string | null;
}

export function getHistoricalAliases(
  homeSlug: string | null,
  awaySlug: string | null,
  scheduledAt: string,
): HistoricalAlias {
  const homeDisplay = homeSlug ? displayNameForGame(homeSlug, scheduledAt) : null;
  const awayDisplay = awaySlug ? displayNameForGame(awaySlug, scheduledAt) : null;
  return {
    homeAlias: homeSlug ? historicalAliasLabel(homeSlug, scheduledAt) : undefined,
    awayAlias: awaySlug ? historicalAliasLabel(awaySlug, scheduledAt) : undefined,
    homeChainLink: homeDisplay && homeDisplay.isHistorical ? `/directory/nhl/history#${homeDisplay.currentSlug}` : null,
    awayChainLink: awayDisplay && awayDisplay.isHistorical ? `/directory/nhl/history#${awayDisplay.currentSlug}` : null,
  };
}

// --- Tier helper (matches src/lib/game-modules.ts) ------------------

function tierForStatus(status: GameStatus | undefined, scheduledAt: string | undefined): number {
  if (!status) return 3600;
  if (status === 'in_progress') return 30;
  if (status === 'completed' || status === 'cancelled') return 86400;
  if (status === 'scheduled' || status === 'postponed') {
    if (!scheduledAt) return 3600;
    const minutesUntil = (new Date(scheduledAt).getTime() - Date.now()) / 60000;
    if (minutesUntil < 0) return 30;
    if (minutesUntil < 60 * 24 * 7) return 300;
    return 3600;
  }
  return 3600;
}
