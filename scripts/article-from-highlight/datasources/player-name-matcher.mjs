/**
 * Player name extractor: finds a player_id from the highlight's title or
 * description. Built 2026-06-12 per Arnel's directive:
 *
 *   "If a player is specified in highlight, then player name should be
 *    matched."
 *
 * Strategy:
 *   1. Parse the highlight title for proper-name patterns (e.g. "Connor
 *      McDavid Hat Trick", "Staal two goals")
 *   2. Match against the players table (first_name + last_name)
 *   3. Bias to players on the home/away team for that game (when known)
 *
 * Returns { playerId, fullName } or null.
 */

const STOP_PHRASES = [
  'hat trick', 'two goals', 'three goals', 'one goal', 'goals in',
  'highlights', 'highlights:', 'top shelf', 'career first', 'career-high',
  'overtime winner', 'overtime goal', 'in ot', 'in so', 'shootout winner',
  'winner', 'goal', 'goals', 'score', 'scores', 'scores in', 'leads',
  'past', 'over', 'against', 'top', 'edges', 'downs', 'beats', 'defeats',
  'tops', 'stuns', 'rolls', 'crushes', 'shocks', 'stops', 'blanked',
  'shutout', 'two goal', 'three goal', 'one goal', 'overtime', 'in',
  'the', 'a', 'an', 'and', 'as', 'with', 'by', 'from', 'for',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'stanley cup', 'playoffs', 'playoff', 'final', 'finals', 'game 1', 'game 2',
  'game 3', 'game 4', 'game 5', 'game 6', 'game 7',
];

/**
 * Extract candidate names from a highlight title.
 * Returns an array of { firstName, lastName } objects, longest first.
 */
export function extractCandidateNames(title) {
  if (!title) return [];
  // Strip emojis and punctuation; preserve word boundaries
  const cleaned = title
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ')
    .replace(/[·•|,;:'"!?()\[\]]/g, ' ')
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  
  const words = cleaned.split(' ');
  // Scan for bigrams (first+last) of capitalised words that aren't
  // stop phrases. We require both words to be Capitalised because hockey
  // highlight titles follow Title Case.
  const candidates = [];
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (!isCapitalised(w1) || !isCapitalised(w2)) continue;
    if (STOP_PHRASES.includes(w1.toLowerCase()) || STOP_PHRASES.includes(w2.toLowerCase())) continue;
    if (w1.length < 2 || w2.length < 2) continue;
    candidates.push({ firstName: w1, lastName: w2 });
  }
  // Also try trigrams (rare but possible: "Connor Mc David")
  for (let i = 0; i < words.length - 2; i++) {
    const w1 = words[i], w2 = words[i + 1], w3 = words[i + 2];
    if (!isCapitalised(w1) || !isCapitalised(w2) || !isCapitalised(w3)) continue;
    if (STOP_PHRASES.includes(w1.toLowerCase()) || STOP_PHRASES.includes(w3.toLowerCase())) continue;
    if (w1.length < 2 || w3.length < 2) continue;
    // Only add if w2 is short (e.g. "Mc") — common in "Mc David" or "Van Der"
    if (w2.length <= 4) {
      candidates.push({ firstName: w1, lastName: w3 });
    }
  }
  return candidates;
}

function isCapitalised(w) {
  return /^[A-Z][a-zA-Z'-]+$/.test(w);
}

/**
 * Match candidates against the players table.
 *
 * @param {object} sb - supabase client
 * @param {string[]} candidates - array of { firstName, lastName }
 * @param {object} [opts]
 * @param {string} [opts.teamId] - bias to players on this team
 * @returns {Promise<{ playerId: string, fullName: string }|null>}
 */
export async function matchPlayerInCandidates(sb, candidates, opts = {}) {
  if (!candidates || candidates.length === 0) return null;
  
  // Try each candidate in order. Prefer matches where the player is on
  // the relevant team.
  for (const c of candidates) {
    // 1. Try exact first + last match
    const { data: exact } = await sb.from('players')
      .select('id, first_name, last_name, team_id')
      .eq('first_name', c.firstName)
      .eq('last_name', c.lastName)
      .limit(5);
    if (exact && exact.length > 0) {
      // If team_id is provided, prefer a player on that team
      if (opts.teamId) {
        const teamMatch = exact.find(p => p.team_id === opts.teamId);
        if (teamMatch) return formatResult(teamMatch);
      }
      return formatResult(exact[0]);
    }
    // 2. Try case-insensitive starts-with (handles "Conn" → "Connor")
    const { data: starts } = await sb.from('players')
      .select('id, first_name, last_name, team_id')
      .ilike('first_name', `${c.firstName}%`)
      .ilike('last_name', `${c.lastName}%`)
      .limit(5);
    if (starts && starts.length > 0) {
      if (opts.teamId) {
        const teamMatch = starts.find(p => p.team_id === opts.teamId);
        if (teamMatch) return formatResult(teamMatch);
      }
      return formatResult(starts[0]);
    }
  }
  return null;
}

function formatResult(p) {
  return {
    playerId: p.id,
    fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    currentTeamName: null, // joined separately if needed
  };
}

/**
 * High-level: extract a player from a highlight title and match to DB.
 *
 * @param {object} sb - supabase client
 * @param {string} title - the highlight title
 * @param {string} [homeTeamId] - home team id (for team-biased match)
 * @param {string} [awayTeamId] - away team id
 * @returns {Promise<{ playerId: string, fullName: string }|null>}
 */
export async function findPlayerInTitle(sb, title, homeTeamId, awayTeamId) {
  const candidates = extractCandidateNames(title);
  if (candidates.length === 0) return null;
  
  // Try team-biased match first (home/away)
  if (homeTeamId) {
    const r = await matchPlayerInCandidates(sb, candidates, { teamId: homeTeamId });
    if (r) return r;
  }
  if (awayTeamId) {
    const r = await matchPlayerInCandidates(sb, candidates, { teamId: awayTeamId });
    if (r) return r;
  }
  // Fall back to non-biased match
  const fallback = await matchPlayerInCandidates(sb, candidates, {});
  if (fallback) return fallback;

  // Last resort: single-name match. Highlight titles often lead with
  // a surname (e.g. "Staal Two Goals"). When the team is known we
  // require a team-biased match (safe). Without a team we still try
  // but limit to a single exact match (no starts-with to avoid noise).
  const singleName = (title || '').match(/^([A-Z][a-zA-Z'-]+)\b/)?.[1];
  if (singleName && singleName.length >= 4) {
    const { data: byLast } = await sb.from('players')
      .select('id, first_name, last_name, team_id')
      .eq('last_name', singleName)
      .limit(20);
    if (byLast && byLast.length > 0) {
      // With a team, require team-biased
      const teamId = homeTeamId || awayTeamId;
      if (teamId) {
        const teamMatch = byLast.find(p => p.team_id === teamId);
        if (teamMatch) return formatResult(teamMatch);
      } else {
        // No team context: only return if there's exactly one match
        // (unambiguous). Otherwise return null to avoid wrong attribution.
        if (byLast.length === 1) return formatResult(byLast[0]);
      }
    }
  }
  return null;
}
