/**
 * Generic article renderer for non-NHL leagues.
 *
 * Built 2026-06-12 to support multi-league article re-write.
 * Takes a normalized match data object (from any source adapter) plus
 * league metadata and renders a deterministic markdown article.
 *
 * Unlike NHL.com's `nhlcom-article-data.mjs` which has full PBP/goals/
 * goalies/three-stars data, this renderer only handles the data common
 * to all sources: final score, home/away, venue, date, OT/SO flag.
 * Goal-scorer detail, goalie lines, and three stars are NHL-only.
 *
 * This is acceptable because:
 *   1. Most non-NHL leagues don't have a clean public source with PBP
 *   2. The LLM is NEVER involved — every claim traces to a field
 *   3. Sources are cited explicitly (HockeyTech, KHL API, etc.)
 *   4. We say what we know; we don't invent what we don't
 *
 * Renders to markdown (matches the NHL renderer's format).
 */

function escapeMarkdown(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function formatScore(score) {
  if (!score || typeof score !== 'string') return '';
  return score.replace(/\s*-\s*/, '-').trim();
}

function buildTitle({ home, away, score, wasOT, wasSO, league }) {
  const sc = formatScore(score);
  if (!sc) return null;
  const [awayScore, homeScore] = sc.split('-').map(n => parseInt(n, 10));
  if (isNaN(awayScore) || isNaN(homeScore)) return null;
  let winner, loser, winnerScore, loserScore;
  if (homeScore > awayScore) {
    winner = home; loser = away; winnerScore = homeScore; loserScore = awayScore;
  } else {
    winner = away; loser = home; winnerScore = awayScore; loserScore = homeScore;
  }
  const otBit = wasOT ? ' in OT' : wasSO ? ' in SO' : '';
  return `${escapeMarkdown(winner)} top ${escapeMarkdown(loser)} ${winnerScore}-${loserScore}${otBit}`;
}

function buildSubtitle({ home, away, score, wasOT, wasSO, date, venue }) {
  const sc = formatScore(score);
  if (!sc) return '';
  const [awayScore, homeScore] = sc.split('-').map(n => parseInt(n, 10));
  if (isNaN(awayScore) || isNaN(homeScore)) return '';
  const otBit = wasOT ? ' in OT' : wasSO ? ' in SO' : '';
  return `${date} — ${away} ${awayScore}, ${home} ${homeScore}. Final${otBit}.`;
}

/**
 * Render a markdown article from a generic match data object.
 *
 * @param {object} opts
 * @param {object} opts.match - normalized match data (from any source)
 * @param {object} opts.league - { id, name, source, country } from league-mapper
 * @returns {string|null} markdown, or null if data is too incomplete
 */
export function renderGenericArticle({ match, league }) {
  if (!match || !match.home || !match.away || !match.score) return null;
  const title = buildTitle({
    home: match.home, away: match.away, score: match.score,
    wasOT: match.wasOT, wasSO: match.wasSO, league: league?.name,
  });
  if (!title) return null;
  const date = (match.startTimeUTC || '').slice(0, 10) || 'Date TBD';
  const subtitle = buildSubtitle({
    home: match.home, away: match.away, score: match.score,
    wasOT: match.wasOT, wasSO: match.wasSO, date, venue: match.venue,
  });
  
  const sourceLabel = sourceDisplayName(match.source);
  const sourceUrl = sourceUrlFor(match);
  
  // Build a clean, deterministic body. NHL.com renderer is much richer;
  // this is the conservative "what we know" version.
  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  if (subtitle) { lines.push(`*${subtitle}*`); lines.push(''); }
  lines.push(`**Final score:** ${match.away} ${formatScore(match.score).split('-')[0]}, ${match.home} ${formatScore(match.score).split('-')[1]}.`);
  if (match.wasOT) lines.push('The game was decided in overtime.');
  else if (match.wasSO) lines.push('The game was decided in a shootout.');
  if (match.venue) lines.push(`**Venue:** ${match.venue}.`);
  lines.push('');
  if (league?.name) {
    lines.push(`**League:** ${league.name}.`);
    lines.push('');
  }
  if (sourceLabel) {
    lines.push(`*Source: ${sourceLabel}${sourceUrl ? ` ([game details](${sourceUrl}))` : ''}.*`);
    lines.push('');
  }
  // No LLM narrative. The above is everything we can verify from
  // structured source data. Adding more would mean inventing.
  return lines.join('\n').trim();
}

function sourceDisplayName(source) {
  if (source === 'hockeytech') return 'HockeyTech league stats';
  if (source === 'khl-api') return 'KHL/WHL/MHL public API';
  if (source === 'iihf-fixturedownload') return 'IIHF/FixtureDownload';
  if (source === 'ncaa') return 'NCAA.com (via henrygd.me)';
  if (source === 'highlightly') return 'Highlightly';
  if (source === 'nhl.com') return 'NHL.com boxscore';
  return source || 'league source';
}

function sourceUrlFor(match) {
  // For NHL: link to the gamecenter page
  if (match.source === 'nhl.com' && match.gameId) {
    return `https://www.nhl.com/gamecenter/${match.gameId}`;
  }
  return null;
}

/**
 * Build a slug for the article. Includes a disambiguator based on the
 * gameId (or post id as fallback) to handle duplicates.
 */
export function buildGenericSlug({ match, league, postId }) {
  const home = (match.home || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const away = (match.away || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const sc = formatScore(match.score || '');
  const date = (match.startTimeUTC || '').slice(0, 10);
  const base = `${away}-${home}-${sc}-${date}`.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const disambig = match.gameId || (postId ? postId.replace(/-/g, '').slice(0, 6) : '');
  return disambig ? `${base}-${disambig}`.slice(0, 90) : base.slice(0, 90);
}
