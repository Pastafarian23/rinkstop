// Highlightly adapter for the game-stats foundation.
//
// Handles 100+ leagues via the same code path. NHL = full play-by-play + boxscore.
// Everyone else = final score + period scores (Highlightly doesn't expose goal events).
//
// Usage:
//   import { fetchHighlightlyGameStats } from './highlightly-adapter.mjs';
//   const stats = await fetchHighlightlyGameStats({ fixture, apiKey, leagueName, host });
//   // returns { events, periodScores, boxscore, source } | null
//
// Note: NHL games have rich data (events + overallStatistics). Non-NHL games
// have only final + period scores. The adapter is honest about which is which.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOSTS = {
  hockey: { base: 'https://hockey.highlightly.net', host: 'hockey-highlights-api.p.rapidapi.com' },
  nhl:    { base: 'https://nhl.highlightly.net',     host: 'nhl-ncaah-api.p.rapidapi.com' },
};

const TEST = process.env.HL_TEST === '1';

/**
 * Map a league_name from RinkStop's DB → Highlightly numeric league ID.
 * Only the leagues that actually have completed fixtures in the DB are mapped.
 * Adding more leagues is one-line work.
 *
 * Source: probed live on 2026-06-14. See docs/highlightly-coverage-audit.md.
 */
const HL_LEAGUE_IDS = {
  'National Hockey League': { id: 0, host: 'nhl' },  // 0 = no leagueId, search by date
  'American Hockey League': { id: 50142, host: 'hockey' },
  'Ontario Hockey League':  { id: 3337,  host: 'hockey' },
  'Western Hockey League':  { id: 4188,  host: 'hockey' },
  'NCAA Division 1 Men\'s Hockey': { id: 0, host: 'nhl' },  // 0 = no leagueId, search by date
};

/**
 * Look up a Highlightly match ID by league + team names + scheduled date.
 * Returns matchId (string/number) or null.
 *
 * For NHL: caller should use fixtures.game_data->>'nhl_game_id' instead,
 * which is the NHL.com game id, NOT a Highlightly id. This function is
 * for non-NHL leagues only.
 */
export async function findHighlightlyMatchId({ leagueName, homeTeamName, awayTeamName, scheduledAt, apiKey }) {
  const hl = HL_LEAGUE_IDS[leagueName];
  if (!hl) {
    console.error(`[hl-adapter] no Highlightly mapping for league "${leagueName}"`);
    return null;
  }
  if (hl.id === null) {
    // No Highlightly mapping for this league. Bail.
    if (TEST) console.log(`[hl-adapter] no Highlightly id for ${leagueName}`);
    return null;
  }
  const { base, host } = HOSTS[hl.host];
  const date = new Date(scheduledAt);
  const dStr = date.toISOString().slice(0, 10);
  const dayBefore = new Date(date); dayBefore.setUTCDate(date.getUTCDate() - 1);
  const dayAfter = new Date(date); dayAfter.setUTCDate(date.getUTCDate() + 1);
  const dates = [dayBefore.toISOString().slice(0, 10), dStr, dayAfter.toISOString().slice(0, 10)];

  // Normalize team names: strip "the", lowercase, take last word
  const homeKey = homeTeamName.replace(/^the\s+/i, '').toLowerCase().split(/\s+/).pop();
  const awayKey = awayTeamName.replace(/^the\s+/i, '').toLowerCase().split(/\s+/).pop();

  for (const d of dates) {
    let url;
    if (hl.id) {
      // hockey.highlightly.net style: use leagueId filter
      url = `${base}/matches?leagueId=${hl.id}&date=${d}&limit=20`;
    } else {
      // nhl.highlightly.net style: no leagueId filter, just date
      url = `${base}/matches?date=${d}&limit=50`;
    }
    try {
      const res = await fetch(url, {
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': host },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const j = await res.json();
      for (const m of (j.data || [])) {
        // For nhl.highlightly.net without leagueId filter, filter by league name
        if (!hl.id && m.league !== 'NCAA' && m.league !== 'NHL') continue;
        const hn = (m.homeTeam?.name || m.homeTeam?.displayName || '').toLowerCase();
        const an = (m.awayTeam?.name || m.awayTeam?.displayName || '').toLowerCase();
        if ((hn.includes(homeKey) || hn.split(/\s+/).pop() === homeKey) &&
            (an.includes(awayKey) || an.split(/\s+/).pop() === awayKey)) {
          return { matchId: m.id, leagueId: hl.id, host: hl.host, base, hostHost: host };
        }
      }
    } catch (e) {
      console.error(`[hl-adapter] fetch error for ${d}:`, e.message);
    }
  }
  return null;
}

/**
 * Get the full match detail from Highlightly. Returns the match object
 * (not wrapped in array). Use the league host returned by findHighlightlyMatchId.
 */
export async function getHighlightlyMatchDetail({ matchId, base, hostHost, apiKey }) {
  const url = `${base}/matches/${matchId}`;
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': hostHost },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const arr = await res.json();
  return Array.isArray(arr) ? arr[0] : arr;
}

/**
 * Normalize a Highlightly match detail to the foundation's expected shape.
 *
 * Returns:
 *   {
 *     source: 'highlightly',
 *     finalHome, finalAway,         // numbers
 *     periodScores: { p1, p2, p3, ot, so },  // strings like '1 - 2' or null
 *     wasOT, wasSO,                  // booleans
 *     events: [ { period, clock, team, type, scorerName, assists, ... } ],  // may be empty
 *     boxscore: [ { teamId, teamName, stats: { name: value } } ],  // may be empty
 *     complete: boolean,             // false if no final score
 *   }
 */
export function normalizeHighlightlyDetail(detail) {
  if (!detail) return null;
  const sc = detail.state?.score || {};
  const current = sc.current || '';
  // Parse "X - Y" or "X-Y"
  let finalHome = null, finalAway = null;
  const m = current.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (m) {
    // Highlightly convention: "home - away" per probe — wait, earlier was
    // "Maple Leafs 3 - 1 Wild" which means "home 3 - away 1" actually
    // Let me verify by checking state.score.firstPeriod against known scores.
    // From probe: "5 - 0" was the current for the "finished" NCAA game
    // We need to verify which side is home. The probe showed:
    //   homeTeam.name: "Capitals", state.score.current: "2 - 4"
    //   where the actual game was "Capitals 2, Maple Leafs 4"
    // So current is "home - away" ✓
    finalHome = parseInt(m[1], 10);
    finalAway = parseInt(m[2], 10);
  }

  const wasOT = !!(sc.overTime && sc.overTime !== '0 - 0' && sc.overTime !== '0-0');
  const wasSO = !!(sc.penalties && sc.penalties !== '0 - 0' && sc.penalties !== '0-0');

  // Normalize events
  const events = (detail.events || [])
    .filter(e => e.isScoringPlay && e.type === 'Goal')
    .map(e => ({
      period: e.period,
      timeInPeriod: e.clock,
      team: e.team?.abbreviation || e.team?.name,
      scorerName: e.primaryParticipant?.name?.default || extractScorerName(e.description),
      shotType: extractShotType(e.description),
      assists: (e.secondaryParticipants || []).map(p => ({
        name: p.name?.default || p.name,
        jerseyNumber: p.jerseyNumber,
      })),
      isPowerPlay: /PPG|power play/i.test(e.description || ''),
      isShortHanded: /SHG|short handed/i.test(e.description || ''),
      scoreAfter: extractScoreAfter(e.description),
    }));

  // Normalize boxscore
  const boxscore = (detail.overallStatistics || []).map(row => ({
    teamId: row.team?.id,
    teamName: row.team?.name,
    teamAbbrev: row.team?.abbreviation,
    stats: Object.fromEntries((row.data || []).map(s => [s.displayName, s.value])),
  }));

  return {
    source: 'highlightly',
    finalHome,
    finalAway,
    periodScores: {
      p1: sc.firstPeriod || null,
      p2: sc.secondPeriod || null,
      p3: sc.thirdPeriod || null,
      ot: sc.overTime || null,
      so: sc.penalties || null,
    },
    wasOT,
    wasSO,
    events,
    boxscore,
    complete: finalHome !== null && finalAway !== null,
  };
}

function extractScorerName(description) {
  if (!description) return null;
  // "P. Dorofeyev, Golden Knights (J. Eichel, T. Hertl) PPG. Score now 1-0."
  // Take everything before the first comma
  return description.split(',')[0].trim();
}

function extractShotType(description) {
  if (!description) return null;
  const m = description.match(/\b(Snap Shot|Wrist Shot|Slap Shot|Backhand|Tip-In|Wrap-Around|Backhand|Deflected|Penalty Shot)\b/i);
  return m ? m[1] : null;
}

function extractScoreAfter(description) {
  if (!description) return null;
  const m = description.match(/Score now (\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  return { home: parseInt(m[1], 10), away: parseInt(m[2], 10) };
}

/**
 * Top-level: take a fixture (from Supabase) + supabase client + API key,
 * find the Highlightly match, return normalized stats.
 *
 * Returns null if:
 *   - No league mapping for this league
 *   - No match found in Highlightly for this date + teams
 *   - API call failed
 */
export async function fetchHighlightlyGameStats({ fixture, leagueName, apiKey, supabase }) {
  if (TEST) console.log(`[hl-adapter] starting for ${fixture.id} (${leagueName})`);

  const lookup = HL_LEAGUE_IDS[leagueName];
  if (!lookup) {
    if (TEST) console.log(`[hl-adapter] no mapping for league ${leagueName}`);
    return null;
  }
  if (lookup.id === null) {
    if (TEST) console.log(`[hl-adapter] ${leagueName} uses NHL.com path, not Highlightly`);
    return null;
  }

  // Look up team names (RinkStop teams table has 'name' directly, not display_name)
  const { data: homeTeam } = await supabase.from('teams').select('id, name, city').eq('id', fixture.home_team_id).single();
  const { data: awayTeam } = await supabase.from('teams').select('id, name, city').eq('id', fixture.away_team_id).single();
  if (!homeTeam || !awayTeam) {
    if (TEST) console.log(`[hl-adapter] missing team names for ${fixture.id} (home=${!!homeTeam} away=${!!awayTeam})`);
    return null;
  }

  // Highlightly uses team.name which already includes the city
  // (e.g. "Vegas Golden Knights", "Carolina Hurricanes") — same as RinkStop's teams.name
  // So just use team.name directly. The matcher's lastWord logic will handle the rest.
  const homeDisplay = homeTeam.name;
  const awayDisplay = awayTeam.name;

  const found = await findHighlightlyMatchId({
    leagueName,
    homeTeamName: homeDisplay,
    awayTeamName: awayDisplay,
    scheduledAt: fixture.scheduled_at,
    apiKey,
  });
  if (!found) {
    if (TEST) console.log(`[hl-adapter] no match found for ${fixture.id}`);
    return null;
  }
  if (TEST) console.log(`[hl-adapter] found matchId=${found.matchId} host=${found.host}`);

  const detail = await getHighlightlyMatchDetail({ ...found, apiKey });
  if (!detail) return null;

  return normalizeHighlightlyDetail(detail);
}
