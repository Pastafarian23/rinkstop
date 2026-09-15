/**
 * NHL.com API client — source of truth for all NHL data.
 *
 * Endpoints used:
 *  - GET /v1/club-schedule-season/{triCode}/20252026   — per-team full schedule
 *  - GET /v1/roster/{triCode}/20252026                 — per-team roster
 *  - GET /stats/rest/en/team/summary                   — team stats
 *  - GET /stats/rest/en/skater/summary                 — skater stats
 *  - GET /stats/rest/en/goalie/summary                 — goalie stats
 *  - GET /v1/schedule/{date}                           — daily schedule
 *
 * Base URLs (verified live):
 *  - https://api-web.nhle.com/v1/...
 *  - https://api.nhle.com/stats/rest/en/...
 *
 * Rate limits: ~100 req/s burst, 10 req/s sustained. Implement 110ms
 * inter-request delay as a safety margin.
 *
 * This module is the RAW fetch layer. It does no DB writes. It returns
 * parsed JSON. Downstream code decides what to do with it.
 */

const NHL_COM_BASE = 'https://api-web.nhle.com/v1';
const NHL_STATS_BASE = 'https://api.nhle.com/stats/rest/en';

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

const DELAY_MS = 110; // ~9 req/s — safe below NHL.com's 10 req/s floor

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic rate-limit backoff.
 * @param {string} url
 * @param {object} opts - passed through to fetch
 * @param {number} retries - max retries on 429
 */
async function fetchWithBackoff(url, opts = {}, retries = 5) {
  const res = await fetch(url, opts);
  if (res.status === 429) {
    if (retries <= 0) throw new Error(`429 from ${url} after all retries`);
    const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
    console.warn(`[nhl-com] 429 from ${url}. retrying in ${retryAfter}s (${retries} left)`);
    await sleep(retryAfter * 1000);
    return fetchWithBackoff(url, opts, retries - 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}: ${await res.text().then(t => t.slice(0, 200))}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Schedule (per-team)
// ---------------------------------------------------------------------------

/**
 * Fetch full season schedule for one team from NHL.com.
 * Each game appears in BOTH participating teams' feeds — callers must dedup.
 *
 * @param {string} triCode  - 3-letter abbreviation: 'TOR', 'BOS', 'UTA', etc.
 * @param {string} seasonId - 8-digit: '20242025', '20252026', '20262027'
 * @returns {Promise<object[]>} Array of game objects
 */
async function fetchTeamSchedule(triCode, seasonId = '20252026') {
  const url = `${NHL_COM_BASE}/club-schedule-season/${triCode}/${seasonId}`;
  const data = await fetchWithBackoff(url);
  return data.games || [];
}

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

/**
 * Fetch current roster for one team from NHL.com.
 *
 * @param {string} triCode  - 3-letter abbreviation
 * @param {string} seasonId - 8-digit seasonId
 * @returns {Promise<object>} { forwards: [], defensemen: [], goalies: [], bench: [] }
 */
async function fetchTeamRoster(triCode, seasonId = '20252026') {
  const url = `${NHL_COM_BASE}/roster/${triCode}/${seasonId}`;
  const data = await fetchWithBackoff(url);
  return {
    forwards: data.forwards || [],
    defensemen: data.defensemen || [],
    goalies: data.goalies || [],
    bench: data.bench || [],
  };
}

// ---------------------------------------------------------------------------
// Team stats
// ---------------------------------------------------------------------------

/**
 * Fetch team stats summary for a season.
 *
 * @param {string} seasonId - 8-digit seasonId
 * @param {number} gameTypeId - 2 = regular season, 3 = playoffs
 * @returns {Promise<object[]>} Array of 32 team stat rows
 */
async function fetchTeamStats(seasonId = '20252026', gameTypeId = 2) {
  const season = seasonId; // NHL.com uses 8-digit directly
  const url = `${NHL_STATS_BASE}/team/summary?cayenneExp=seasonId=${season}%20and%20gameTypeId=${gameTypeId}`;
  const data = await fetchWithBackoff(url);
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Skater stats
// ---------------------------------------------------------------------------

/**
 * Fetch skater stats for a season. Returns ALL skaters (limit=-1).
 *
 * @param {string} seasonId  - 8-digit seasonId
 * @param {number} gameTypeId - 2 = regular season, 3 = playoffs
 * @returns {Promise<object[]>}
 */
async function fetchSkaterStats(seasonId = '20252026', gameTypeId = 2) {
  const url = `${NHL_STATS_BASE}/skater/summary?limit=-1&cayenneExp=seasonId=${seasonId}%20and%20gameTypeId=${gameTypeId}`;
  const data = await fetchWithBackoff(url);
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Goalie stats
// ---------------------------------------------------------------------------

/**
 * Fetch goalie stats for a season. Returns ALL goalies (limit=-1).
 *
 * @param {string} seasonId  - 8-digit seasonId
 * @param {number} gameTypeId - 2 = regular season, 3 = playoffs
 * @returns {Promise<object[]>}
 */
async function fetchGoalieStats(seasonId = '20252026', gameTypeId = 2) {
  const url = `${NHL_STATS_BASE}/goalie/summary?limit=-1&cayenneExp=seasonId=${seasonId}%20and%20gameTypeId=${gameTypeId}`;
  const data = await fetchWithBackoff(url);
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  fetchTeamSchedule,
  fetchTeamRoster,
  fetchTeamStats,
  fetchSkaterStats,
  fetchGoalieStats,
  fetchWithBackoff,
  NHL_COM_BASE,
  NHL_STATS_BASE,
};
