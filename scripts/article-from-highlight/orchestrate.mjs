#!/usr/bin/env node
/**
 * Article-from-highlight orchestrator.
 *
 * Given a highlight (or auto-find candidates), this script:
 *   1. Loads the highlight from highlight_backups.
 *   2. Fetches YouTube oEmbed + transcript.
 *   3. Pulls supplemental data from our fixtures table (if available).
 *   4. Outputs a structured "facts block" for the LLM step.
 *   5. (Optional) spawns `kilo run --auto` as the LLM step.
 *   6. (Optional) inserts the LLM's draft into posts as draft.
 *
 * Modes:
 *   --highlight-id=N   Process one specific highlight by id.
 *   --auto             Process highlights from the last 24h with no draft. (default)
 *   --dry-run          Compute facts block but don't LLM-draft or insert.
 *   --skip-llm         Compute facts + run LLM but don't insert.
 *   --limit=N          Cap on highlights per run (default 3).
 *
 * The cron agent turn wraps this and does the web-search recap fetch + the
 * final fact-check + the ops message. The deterministic work (DB, transcript,
 * LLM) is here so the agent turn stays small and re-runnable.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import { getMatchData, normalizeLeague } from './match-data.mjs';
import { buildAndCheckSlug, SlugCollisionError, SlugValidationError, lookupTeamIdByName } from './slug-builder.mjs';

// Load env from the Next.js .env file.
const envFile = '/root/.openclaw/workspace/rinkstop-platform/.env';
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing Supabase env'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// --- League UUID mapping for cross-source verification ---
// Map league NAME (from HL/NHL.com) to our fixtures.league_id UUID.
// Used by the web-recap fallback path to stamp posts.league_id when no
// fixtures row exists. Only leagues the audit pipeline can route to.
// Add new leagues as we verify their fixtures.league_id UUIDs against
// the live fixtures table — DO NOT guess (added 2026-09-21 per Arnel
// 'no fabricated data' directive).
const LEAGUE_NAME_TO_UUID = {
  'NHL': '2b5f2b9d-84b9-4edb-8373-a732b72f4e40',
  'AHL': 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611',
  'SHL': '69d4de0c-b072-4f52-8950-eb728acdc7f9',
  'DEL': '03e919d1-2180-443b-aba4-6719d25d2eff',
  'KHL': 'a08f6dac-eb1f-48b6-a11b-56fbb5642752',
  'MHL': 'e052d66a-6f63-42da-94fc-25a809203c2f',
  'VHL': '30fef7f6-0054-4605-83b7-ec619b72f328',
  'SPHL': 'dead3e40-9f79-4488-a50b-755eb9a8cee0',
  'Liiga': 'dc212fdb-98bd-4fd5-842c-598ba34565b5',
  // OHL/WHL/QMJHL/ECHL/USHL — UUIDs not yet verified against the live
  // fixtures table. Add after verification to prevent silent misroutes.
};

// --- CLI args ---
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const MODE = args['highlight-id'] ? 'single' : 'auto';
const HIGHLIGHT_ID = args['highlight-id'] ? parseInt(String(args['highlight-id']), 10) : null;
const LIMIT = parseInt(String(args.limit ?? '3'), 10);
const DRY_RUN = !!args['dry-run'];
const SKIP_LLM = !!args['skip-llm'];
const USE_WEB_RECAP = !!args['use-web-recap'];

// Resolve the rinkstop-platform dir for spawning kilo (it needs a project context).
const RINKSTOP_DIR = process.env.RINKSTOP_DIR || '/root/.openclaw/workspace/rinkstop-platform';

// Extract a YouTube video ID from any common URL form.
function extractVideoId(url) {
  if (!url) return '';
  const m1 = url.match(/[?&]v=([\w-]{6,15})/);
  if (m1) return m1[1];
  const m2 = url.match(/youtu\.be\/([\w-]{6,15})/);
  if (m2) return m2[1];
  const m3 = url.match(/embed\/([\w-]{6,15})/);
  if (m3) return m3[1];
  return '';
}

/**
 * Find candidate highlights: those from the last 24h (or as overridden by
 * --since-hours) with no associated draft. "Last 24h" is match_date, not
 * created_at — we want to write about games that already happened, not games
 * that just synced.
 */
async function findCandidates() {
  const sinceHours = parseInt(String(args['since-hours'] ?? '24'), 10);
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  // Filter to YouTube-hosted videos only. The LLM step relies on the
  // YouTube transcript for play-by-play facts. Non-YouTube sources
  // (ESPN, Sportsnet) will be handled in a follow-up path.
  // Also filter to highlights with data_available=true (set by
  // mark-all-unsourceable) so we skip leagues we know we can't source.
  // Query cap = max(1000, LIMIT * 4) so we have headroom after the
  // existing-post filter (we've backfilled ~2500 so the first 200 often
  // return 0 candidates because they're all linked).
  const queryCap = Math.max(1000, LIMIT * 4);
  const { data: highlights, error } = await sb
    .from('highlight_backups')
    .select('id, title, video_url, source, match_date, home_team_name, away_team_name, league_name, image_url, match_id, description, channel, embed_url, data_available')
    .gte('match_date', since)
    .not('video_url', 'is', null)
    .ilike('video_url', '%youtube.com%')
    .order('match_date', { ascending: false })
    .limit(queryCap);
  if (error) throw error;

  // Filter out those that already have a post linked.
  const ids = highlights.map(h => h.id);
  if (ids.length === 0) return [];
  const { data: existing, error: e2 } = await sb
    .from('posts')
    .select('highlight_id')
    .in('highlight_id', ids);
  if (e2) throw e2;
  const taken = new Set((existing || []).map(p => p.highlight_id));
  // Sort: well-covered leagues first (NHL playoffs, AHL playoffs, Memorial Cup,
  // IIHF) so we get the highest-quality articles first. The throttle bails after
  // 25 consecutive no-data results, so this prevents it from cutting off the
  // good leagues by hitting failures from under-covered leagues first.
  const LEAGUE_PRIORITY = {
    'NHL': 1,
    'AHL': 2,
    'IIHF': 3,
    'Memorial Cup': 4,
    'World Championship': 5,
    'World Juniors': 6,
    'Olympics': 7,
    'QMJHL': 8,
    'OHL': 9,
    'WHL': 10,
    'KHL': 11,
    'SHL': 12,
    'DEL': 13,
    'NLA': 14,
    'ECHL': 15,
    'SPHL': 16,
  };
  function leagueKey(h) {
    const lg = h.league_name;
    const name = (lg && typeof lg === 'object' && lg.name) ? lg.name : (lg || '');
    return LEAGUE_PRIORITY[name] || 99;
  }
  const filtered = highlights.filter(h => !taken.has(h.id) && (h.data_available !== false));
  filtered.sort((a, b) => {
    const lp = leagueKey(a) - leagueKey(b);
    if (lp !== 0) return lp;
    // Same league: newer first
    return (b.match_date || '').localeCompare(a.match_date || '');
  });
  return filtered.slice(0, LIMIT);
}

/**
 * Pull supplemental facts from our fixtures table (NHL/CHL/PWHL/NCAAH only).
 * Returns null if no fixture match — that's fine, we just don't have stats
 * for leagues we don't sync.
 */
async function fixturesForHighlight(h) {
  if (!h.match_id) return null;
  // match_id from Highlightly is per-league. Our fixtures table has a different
  // game_data->>nhl_game_id pattern. Try to find by team names + date instead.
  const matchDay = (h.match_date || '').slice(0, 10);
  if (!matchDay) return null;
  // NOTE: fixtures table does NOT have home_team_name / away_team_name columns
  // (verified live 2026-09-21 via PostgREST 42703). Team names live in the
  // `teams` table and must be looked up by FK when needed. See
  // lookupTeamNamesByIds() below.
  const { data, error } = await sb
    .from('fixtures')
    .select('id, league_id, scheduled_at, home_team_id, away_team_id, home_score, away_score, status, game_data')
    .gte('scheduled_at', `${matchDay}T00:00:00Z`)
    .lt('scheduled_at', `${matchDay}T23:59:59Z`)
    .limit(50);
  if (error || !data) return null;
  // No team name lookup in this query — caller does the matching. For now
  // return all games that day for the caller to filter.
  return data;
}

/**
 * Resolve team display names from FKs in a single query.
 * Returns { [teamId]: name } for the IDs found in the `teams` table.
 * Missing IDs are silently omitted from the result.
 *
 * Why this exists: the fixtures table does NOT have home_team_name /
 * away_team_name columns (verified live 2026-09-21). To inject the
 * "Final Score: Team A N, Team B M" line in the article body — which
 * the audit pipeline's extractClaims() parses to verify the score — we
 * need the team names. The audit pipeline's regex looks for
 * `final\s+score[:\s]+...(\d+)\s*\.?\s*$`, so we need both the name and
 * the score from the fixture row.
 */
async function lookupTeamNamesByIds(teamIds) {
  const ids = Array.from(new Set((teamIds || []).filter(Boolean)));
  if (ids.length === 0) return {};
  try {
    const { data, error } = await sb
      .from('teams')
      .select('id, name')
      .in('id', ids);
    if (error || !data) return {};
    const map = {};
    for (const row of data) map[row.id] = row.name;
    return map;
  } catch (e) {
    console.error('[lookupTeamNamesByIds] failed:', e);
    return {};
  }
}

/**
 * Resolve a single best fixture row for the given highlight.
 * Strategy: query all fixtures on the same UTC date, then narrow by team
 * FK (home_team_id/away_team_id from the highlight's teams table matches,
 * with name-matching fallback).
 *
 * Returns { id, league_id, scheduled_at, home_team_id, away_team_id,
 *          home_score, away_score, status } or null if nothing matches.
 *
 * Why this matters: the audit pipeline uses posts.league_id to pick the
 * right adapter (NHL.com vs Highlightly vs HockeyTech). Without these
 * fields stamped onto the post row, audit fails with CANNOT_VERIFY and
 * the article is held for human review (which is exactly what happened
 * to the 2 drafts from the 2026-09-21 cron run).
 */
async function findFixtureForHighlight(h) {
  const matchDay = (h.match_date || '').slice(0, 10);
  if (!matchDay) return null;
  const candidates = await fixturesForHighlight(h);
  if (!candidates || candidates.length === 0) return null;

  // Resolve team IDs from names (the highlight row already has names but
  // not FKs).
  const homeTeamId = await lookupTeamIdByName(sb, h.home_team_name);
  const awayTeamId = await lookupTeamIdByName(sb, h.away_team_name);

  // Score each candidate by how well its FKs align with the highlight's
  // resolved team IDs. FK matching is the primary signal — name matching
  // would require a JOIN on teams, which we don't need here because the
  // highlight row already has team NAMES and lookupTeamIdByName converts
  // those to IDs.
  function score(c) {
    let s = 0;
    if (homeTeamId && c.home_team_id === homeTeamId) s += 4;
    if (awayTeamId && c.away_team_id === awayTeamId) s += 4;
    if (homeTeamId && c.away_team_id === homeTeamId) s += 2; // home/away could be swapped in highlights
    if (awayTeamId && c.home_team_id === awayTeamId) s += 2;
    return s;
  }
  candidates.sort((a, b) => score(b) - score(a));
  const best = candidates[0];
  if (score(best) < 2) return null; // No reliable match
  // Look up display names for the matched FKs. The fixtures table does NOT
  // store home_team_name/away_team_name (verified live 2026-09-21), so we
  // fetch them from the teams table here. Failure is non-fatal — insertDraft
  // will fall back to the highlight's own home_team_name/away_team_name.
  const nameMap = await lookupTeamNamesByIds([best.home_team_id, best.away_team_id]);
  best.home_team_name = nameMap[best.home_team_id] || h.home_team_name || null;
  best.away_team_name = nameMap[best.away_team_id] || h.away_team_name || null;
  return best;
}

/**
 * Fetch video data via the Python helper.
 * Returns { video_id, oembed, transcript }.
 */
function fetchVideoData(videoUrl) {
  const script = '/root/.openclaw/workspace/rinkstop-platform/scripts/article-from-highlight/fetch_video_data.py';
  try {
    const out = execSync(`python3 ${script} ${JSON.stringify(videoUrl)}`, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024, // transcript text can be 30k+
      timeout: 90_000, // Python helper has its own 90s cap; this is a backstop
    });
    return JSON.parse(out);
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 300) || 'unknown' };
  }
}

/**
 * Spawn `kilo run --auto` for the LLM draft step. Uses a fast model
 * (gpt-mini-latest) by default to stay within the 110s exec budget.
 * Returns the generated markdown. Force-kills at 100s with SIGKILL if SIGTERM
 * doesn't close the process within 5s.
 */
function llmDraft(factsBlock, options = {}) {
  return new Promise((resolve, reject) => {
    const prompt = buildLlmPrompt(factsBlock, options);
    const model = process.env.LLM_MODEL || 'kilo/~openai/gpt-mini-latest';
    const proc = spawn('kilo', ['run', '--auto', '--model', model, prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, KILOCODE_API_KEY: process.env.KILOCODE_API_KEY },
    });
    let stdout = '', stderr = '';
    const softTimer = setTimeout(() => {
      // First signal: SIGTERM
      proc.kill('SIGTERM');
      hardTimer = setTimeout(() => proc.kill('SIGKILL'), 5000);
    }, 100_000);
    let hardTimer = null;
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      clearTimeout(softTimer);
      if (hardTimer) clearTimeout(hardTimer);
      if (code !== 0 && !stdout) {
        return reject(new Error(`kilo exit ${code}: ${stderr.slice(0, 300)}`));
      }
      // The LLM may add a final line like "---" or chat — pull the article out.
      const md = extractArticle(stdout);
      resolve({ markdown: md, raw: stdout, stderr });
    });
  });
}

/**
 * Strip the LLM's chat wrapper and return the article markdown.
 * Handles either YAML frontmatter-first or H1-first articles.
 * Heuristic: find the first `---` block or first markdown heading.
 */
function extractArticle(raw) {
  const lines = raw.split('\n');
  // Look for frontmatter first (--- followed by key: lines, then ---)
  let fmStart = -1, fmEnd = -1;
  if (lines[0] && lines[0].trim() === '---') {
    for (let i = 1; i < Math.min(lines.length, 20); i++) {
      if (lines[i].trim() === '---') { fmStart = 0; fmEnd = i; break; }
    }
  }
  // Look for first heading
  let hStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#\s+\S/) || lines[i].match(/^##\s+\S/)) { hStart = i; break; }
  }
  // Use the frontmatter if found, else the heading, else the whole text
  const start = fmStart === 0 ? 0 : hStart;
  if (start === -1) return raw;
  // Find the end: a `---` separator followed by non-content (chat-style),
  // or end of input.
  let end = lines.length;
  const contentStart = fmEnd !== -1 ? fmEnd + 1 : start + 1;
  for (let i = contentStart; i < lines.length; i++) {
    if (lines[i].match(/^---\s*$/)) { end = i; break; }
  }
  return lines.slice(start, end).join('\n').trim();
}

/**
 * Parse a YAML frontmatter block from a markdown article. Returns the
 * metadata as a plain object and the body (after the frontmatter) as a
 * separate string. Looks for the frontmatter at the start of the input.
 * This is intentionally a tiny parser — just enough for the keys we use.
 */
function parseFrontmatter(article) {
  const lines = article.split('\n');
  if (lines[0]?.trim() !== '---') return { meta: {}, body: article };
  let endIdx = -1;
  for (let i = 1; i < Math.min(lines.length, 30); i++) {
    if (lines[i].trim() === '---') { endIdx = i; break; }
  }
  if (endIdx === -1) return { meta: {}, body: article };
  const meta = {};
  for (const line of lines.slice(1, endIdx)) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim().replace(/^['"]|['"]$/g, '');
    if (val.startsWith('[') && val.endsWith(']')) {
      // Strip the brackets, split on commas, trim each item. Handles both
      // JSON-style ["a", "b"] and unquoted [a, b, c] from the LLM.
      const inner = val.slice(1, -1).trim();
      if (inner === '') {
        meta[key] = [];
      } else {
        const items = inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        // Try JSON first; fall back to plain split.
        try { meta[key] = JSON.parse(val); } catch { meta[key] = items; }
      }
    } else if (/^\d+$/.test(val)) {
      meta[key] = parseInt(val, 10);
    } else {
      meta[key] = val;
    }
  }
  const body = lines.slice(endIdx + 1).join('\n').trim();
  return { meta, body };
}

/**
 * Best-effort extraction of the article title and subtitle from a body
 * that starts with `# Title` (or `## Title`) followed by an italic or
 * plain first paragraph.
 */
function extractTitleFromBody(body) {
  const lines = body.split('\n');
  let title = '';
  for (const line of lines) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) { title = m[1].replace(/\*+$/, '').trim(); break; }
  }
  if (!title) {
    const m = body.match(/^#\s+(.+?)$/m);
    if (m) title = m[1].trim();
  }
  return title;
}

/**
 * Extract the winner (and only the winner) from a title.
 * Returns 'home' | 'away' | 'tie' | null.
 *
 * Heuristic: which team name appears first (and in a winning context)?
 * Win-verbs: edges, beats, tops, handles, downs, rolls past, blanks,
 * shuts out, stuns, knocks off, earns (road win), fall to, drop to,
 * surrender to, lose to.
 *
 * Tie-verbs: tied, draw (rare in hockey articles).
 *
 * Does NOT parse scores from the title — that's separately handled in
 * the social-draft pipeline. We just need the winner.
 */
function extractWinnerFromTitle(title, homeName, awayName) {
  if (!title) return null;
  const lower = title.toLowerCase();
  const homeLow = (homeName || '').toLowerCase();
  const awayLow = (awayName || '').toLowerCase();

  // Build "last word" versions for fuzzy matching (e.g. "Pittsburgh Penguins" → "penguins")
  const homeLast = homeLow.split(/\s+/).filter(w => w.length > 2).pop() || '';
  const awayLast = awayLow.split(/\s+/).filter(w => w.length > 2).pop() || '';

  // Tie phrases
  if (/\btied\b/.test(lower)) return 'tie';
  // "earn N-N road win" — the team named first (typically away) won
  if (/\broad win\b/.test(lower)) {
    // Identify which team is mentioned first
    const homeIdx = lower.indexOf(homeLast);
    const awayIdx = lower.indexOf(awayLast);
    if (homeIdx >= 0 && (awayIdx < 0 || homeIdx < awayIdx)) return 'home';
    if (awayIdx >= 0) return 'away';
    return null;
  }

  // Win verbs (subject of verb is the winner)
  const WIN_VERBS = 'edge[sd]?|beat(?:en)?|top[s]?|handle[sd]?|down(?:ed)?|roll[s]? past|blank(?:ed)?|shut[s]? out|stun(?:ned)?|knock[s]?? off|stuns?';
  const LOSS_VERBS = 'falls? to|drops? to|loses? to|surrenders? to|lose to|fall to|drop to';

  // Try win verbs: "<winner> <verb> <loser>"
  const winRe = new RegExp(`([\\w'\\-\\.]+)\\s+(?:${WIN_VERBS})\\s+([\\w'\\-\\.]+)`, 'i');
  const wm = winRe.exec(title);
  if (wm) {
    const beforeVerb = wm[1].toLowerCase().trim();
    const afterVerb = wm[2].toLowerCase().trim();
    // Determine which team the "before" subject is
    if (beforeVerb.includes(homeLast) || homeLast.includes(beforeVerb.split(/\s+/).pop() || '')) {
      return 'home';
    }
    if (beforeVerb.includes(awayLast) || awayLast.includes(beforeVerb.split(/\s+/).pop() || '')) {
      return 'away';
    }
    // "before" matched the loser's name? Then winner is the OTHER team.
    if (afterVerb.includes(homeLast) || homeLast.includes(afterVerb.split(/\s+/).pop() || '')) {
      return 'away';
    }
    if (afterVerb.includes(awayLast) || awayLast.includes(afterVerb.split(/\s+/).pop() || '')) {
      return 'home';
    }
  }

  // Try loss verbs: "<loser> <loss-verb> <winner>"
  const lossRe = new RegExp(`([\\w'\\-\\.]+)\\s+(?:${LOSS_VERBS})\\s+([\\w'\\-\\.]+)`, 'i');
  const lm = lossRe.exec(title);
  if (lm) {
    const subject = lm[1].toLowerCase().trim();
    const target = lm[2].toLowerCase().trim();
    if (subject.includes(homeLast) || homeLast.includes(subject.split(/\s+/).pop() || '')) {
      return 'away'; // home lost
    }
    if (subject.includes(awayLast) || awayLast.includes(subject.split(/\s+/).pop() || '')) {
      return 'home'; // away lost
    }
    if (target.includes(homeLast)) return 'home';
    if (target.includes(awayLast)) return 'away';
  }

  return null;
}

function buildLlmPrompt(factsBlock, options = {}) {
  const noTranscript = options.noTranscript === true;
  // Trim the transcript to the most relevant bits for the LLM context.
  // The full transcript can be 30k chars; the LLM only needs the rich parts.
  // For long transcripts we keep the first 2000 (game opening, lineups) +
  // last 2000 (final minutes, outcome). Short transcripts are passed whole.
  const compactFacts = { ...factsBlock };
  if (compactFacts.video && compactFacts.video.transcript && compactFacts.video.transcript.text) {
    const t = compactFacts.video.transcript;
    const T = t.text;
    compactFacts.video.transcript = {
      ...t,
      text: T.length > 5000 ? T.slice(0, 2000) + '\n\n[...middle truncated for brevity...]\n\n' + T.slice(-2000) : T,
    };
  }
  const videoId = compactFacts.video?.id || '';
  const noTranscriptNote = noTranscript
    ? `NO TRANSCRIPT AVAILABLE. You are writing a brief news recap from a score + period breakdown ONLY. DO NOT invent goal scorers, goalies, play-by-play sequences, or stats. If a specific fact is not in your facts block, do not mention it. DO NOT hedge, qualify, or add disclaimers about missing data — the score, teams, venue, and period flow are confirmed. Write a confident, factual news brief in the voice of a beat reporter who watched the boxscore update. The 400-600 word target is for substance (period-by-period flow, what the result means, venue context, series/standings implication if relevant). No meta-commentary about the article's own limitations.`
    : '';
  return `Write a hockey game recap article. Facts block below is your ONLY source of truth. If a name/number/score isn't in the block, you cannot use it.
${noTranscriptNote}

FACTS BLOCK:
${JSON.stringify(compactFacts, null, 2)}

REQUIRED STRUCTURE (return this EXACT shape, no preamble, no commentary):

---
title: <60 chars max; must include BOTH team names + score or key fact>
subtitle: <1-2 sentences; include venue + final score>
seo_title: <60 chars max; optimized for Google search — include team names + score>
seo_description: <140-160 chars; include both team names, score, venue, and 1 hook word like "shootout" or "overtime">
tags: [4-7 lowercase tags; include both team-name-slugs in lowercase]
category: highlights
reading_time_minutes: <5-8>
source_cite: <where data came from, e.g. "NHL.com boxscore" or "NHL.com + Highlightly match API">
---

# <title>

https://www.youtube.com/watch?v=${videoId}

<opening paragraph, 2-3 sentences — lead with the most interesting fact, not the basics. For example: "Five different Flyers scored" or "Strome broke a 2-2 tie with 4:31 left in the second." NEVER lead with generic phrases like "In a game between..." or "On Monday night...">

## How the Game Played Out

<2-3 paragraphs covering period-by-period flow (P1/P2/P3), key moments, goal scorers when known. Pull everything from the transcript. Use specific timestamps and player names when available.>

## What the Result Means

<1-2 paragraphs: standings implication, both teams' trajectory, momentum. End with a forward-looking sentence — not a summary.>

## Watch the Highlights

<short paragraph + embed call-to-action>

**Final Score:** <Team A> <score>, <Team B> <score>.

*Source: <source_cite>*

CRITICAL:
- The article body (everything from "# <title>" onward) MUST be 500-800 words. Do NOT stop after the frontmatter.
- DO NOT invent stats, scores, goal scorers, or sequences. If a fact is not in the block, omit it — do not hedge or apologize.
- Use only verified facts from the block.
- Tone: confident hockey journalist, not a fact dump.
- ALWAYS include 3 H2 sections (How the Game Played Out, What the Result Means, Watch the Highlights) with substantive body content under each.
- ALWAYS include the "**Final Score:**" line right before the Source footer — this is required for the audit pipeline to verify your claims.
- seo_title and seo_description must include both team names.
- ${noTranscript ? `When no transcript is available, write like a beat reporter covering a game from the boxscore: lead with the final score and venue, walk through the period flow (P1/P2/P3 from the facts block), explain what the result means in context. NEVER use phrases like "no transcript is available", "the safest read", "we cannot know", "without transcript support" — these are meta-commentary about data limitations and have no place in a published article. If the period breakdown is in the facts block, write about it; if it's not, simply omit the period narrative.` : ''}
- BANNED phrases (any of these in your output = auto-fail): "Because no transcript", "the safest read", "we cannot know", "without transcript support", "broader recap should stay", "the most reliable takeaway", "winning goal is listed as", "winning goalie is listed as", "comfortable Flyers win", "without late drama".

Begin your response with the "---" line. No preamble text.`;
}

/**
 * Insert the LLM's draft into posts as a draft.
 * Accepts a parsed frontmatter object and the body markdown.
 */
async function llmWebRecapDraft(highlight) {
  // Fallback path: when YouTube is rate-limiting us, use the Highlightly
  // match API to get confirmed score data, then call the LLM with a
  // conservative "score + period breakdown" facts block. The LLM writes a
  // box-score style recap that anchors in confirmed data only.
  //
  // The user directive: "video is the story" is NOT sufficient. So we DO
  // not fall back to that. We confirm the score from an independent source
  // (Highlightly) and let the LLM write a richer article that uses the
  // score + period breakdown as the anchor. No invented play-by-play.

  const teams = [highlight.home_team_name, highlight.away_team_name].filter(Boolean);
  const date = (highlight.match_date || '').slice(0, 10);
  const league = normalizeLeague(highlight.league_name);

  // Call multi-source match lookup (Highlightly first, then NHL.com, HockeyTech, NCAA, KHL)
  const hlData = await getMatchData({ teams, date, league, apiKey: process.env.HIGHLIGHTLY_API_KEY });
  if (!hlData || !hlData.score) {
    throw new Error('No data source returned score for this game');
  }

  const factsBlock = {
    highlight: {
      id: highlight.id,
      title: highlight.title,
      source: highlight.source,
      match_date: highlight.match_date,
      home_team: highlight.home_team_name,
      away_team: highlight.away_team_name,
      league: highlight.league_name,
      video_url: highlight.video_url,
    },
    video: { id: extractVideoId(highlight.video_url) },
    fixtures: [hlData],  // single confirmed fixture
    recap_source: 'Highlightly match API (no YouTube transcript available — YouTube rate-limited our IP)',
    note: 'NO TRANSCRIPT AVAILABLE. Final score and period breakdown are confirmed via Highlightly. DO NOT invent goal scorers, play-by-play, or stats that are not in this block. Write a score-anchored recap that respects the verified facts.',
  };

  // Use the same llmDraft path with a slightly different prompt preamble
  const llmResult = await llmDraft(factsBlock, {
    noTranscript: true,
  });
  // Return both the markdown AND the match data so insertDraft can inject
  // a "Final Score:" line even when the fixtures table hasn't been updated
  // yet (added 2026-09-21 per Arnel's 'articles must be published, not held
  // in drafts' directive — without the Final Score line, the audit pipeline
  // returns CANNOT_VERIFY and the article is held indefinitely).
  return {
    markdown: llmResult.markdown,
    matchData: hlData,  // { score, home_team_name, away_team_name, source, ... }
  };
}

async function highlightlyMatchData({ teams, date, league }) {
  // The hockey endpoint is more complete (NHL playoffs, AHL, WCH, Memorial Cup)
  // than the NHL endpoint which only covers regular season. Always try both.
  const endpoints = [
    { base: 'https://hockey.highlightly.net', host: 'hockey-highlights-api.p.rapidapi.com', label: 'hockey' },
    { base: 'https://nhl.highlightly.net', host: 'nhl-ncaah-api.p.rapidapi.com', label: 'nhl' },
  ];

  // Try the dates around the match (in case of timezone drift)
  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dates = [dayBefore.toISOString().slice(0, 10), date, dayAfter.toISOString().slice(0, 10)];

  // Normalize team names: strip "the", lowercase, take last word for matching.
  // e.g. "Montreal Canadiens" -> "canadiens", "Chicago Blackhawks" -> "blackhawks"
  const teamKeys = teams.map(t => {
    const noThe = t.replace(/^the\s+/i, '').toLowerCase().trim();
    const lastWord = noThe.split(/\s+/).pop();
    return { full: noThe, last: lastWord };
  });

  for (const ep of endpoints) {
    for (const d of dates) {
    const url = `${ep.base}/matches?date=${d}&limit=20`;
    try {
      const res = await fetch(url, {
        headers: {
          'x-rapidapi-key': process.env.HIGHLIGHTLY_API_KEY || '',
          'x-rapidapi-host': ep.host,
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) { console.error(`  ⚠️  Highlightly ${d}: HTTP ${res.status}`); continue; }
      const j = await res.json();
      const ms = j.data || [];
      console.error(`  🔍 Highlightly ${d}: ${ms.length} matches`);
      // Find a match where BOTH teams are in the list
      for (const m of ms) {
        const homeName = (m.homeTeam?.name || m.homeTeam?.displayName || '').toLowerCase();
        const awayName = (m.awayTeam?.name || m.awayTeam?.displayName || '').toLowerCase();
        const homeHas = teamKeys.some(k => homeName.includes(k.last) || homeName.includes(k.full));
        const awayHas = teamKeys.some(k => awayName.includes(k.last) || awayName.includes(k.full));
        if (homeHas && awayHas) {
          return {
            id: m.id,
            date: m.date,
            home_team: m.homeTeam?.name || m.homeTeam?.displayName,
            away_team: m.awayTeam?.name || m.awayTeam?.displayName,
            league: m.league?.name,
            week: m.week,
            score: m.state?.score,
            description: m.state?.description,
            source_endpoint: ep.label,
          };
        }
      }
    } catch (e) {
      // continue
    }
    }
  }
  return null;
}

async function insertDraft(highlight, meta, body, fixtureRow, webRecapData = null) {
  // Fall back to extracting title from body if frontmatter didn't have one.
  const title = meta.title || extractTitleFromBody(body) || highlight.title;
  const subtitle = meta.subtitle || '';
  const seo_title = meta.seo_title || title;
  const seo_description = meta.seo_description || subtitle.slice(0, 160) || `Recap of ${highlight.title}`;
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const category = meta.category || 'highlights';
  const reading_time_minutes = meta.reading_time_minutes || Math.max(1, Math.round(body.split(/\s+/).length / 200));
  const source_cite = meta.source_cite || highlight.source || 'YouTube broadcast';

  // Build the slug from team + game_date. Per docs/CLEAN-POST-SLUGS-SPEC.md,
  // the highlight row doesn't have team FKs, so we look them up by name.
  // If a team isn't in the teams table, we fall back to slugifying the raw
  // name (with a warning logged via slug-builder).
  let slug;
  let slugSource;
  let slugWarnings = [];
  try {
    const homeTeamId = await lookupTeamIdByName(sb, highlight.home_team_name);
    const awayTeamId = await lookupTeamIdByName(sb, highlight.away_team_name);
    const built = await buildAndCheckSlug(sb, {
      homeTeamId,
      awayTeamId,
      homeTeamName: highlight.home_team_name,
      awayTeamName: highlight.away_team_name,
      gameDate: highlight.match_date,
    });
    slug = built.slug;
    slugSource = built.source;
    slugWarnings = built.warnings;
    for (const w of slugWarnings) console.error(`  ⚠️  ${w}`);
  } catch (e) {
    if (e instanceof SlugCollisionError) {
      // Per spec §4.4: refuse, don't auto-dedupe. Surface to caller.
      throw e;
    }
    if (e instanceof SlugValidationError) {
      // Fallback to old behavior so the article can still be inserted.
      // This keeps the pipeline running even if team data is missing.
      console.error(`  ⚠️  slug validation failed (${e.message.slice(0, 100)}); falling back to old slug format`);
      const slugBase = (seo_title || title).toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
      const { data: slugTaken } = await sb.from('posts').select('id').eq('slug', slugBase).limit(1);
      slug = slugTaken && slugTaken.length > 0 ? `${slugBase}-${highlight.id}` : slugBase;
      slugSource = 'legacy-fallback';
    } else {
      throw e;
    }
  }

  // Append a source-cite footer to the body so the article is self-citing.
  // Strip any existing trailing *Source:* line from the LLM, then add ours.
  // 2026-09-17: Arnel directed us to drop the "Verified via YouTube
  // transcript..." boilerplate — the standard AI disclaimer lives in
  // the editorial footer on every article, so this line is redundant.
  // 2026-09-21 safeguard: also strip any LLM-written "Final Score:" prose
  // lines — the audit pipeline parses the FIRST "Final Score:" match, and
  // LLM prose ("Final Score: final score and period breakdown...") pre-empts
  // our structured injection, breaking audit verification.
  const bodyClean = body
    .replace(/\n*\*Source:.*\*\s*$/m, '')
    .replace(/^\*?Final Score:[^\n]*(?!\d+-\d+\.)[^\n]*\n+/gim, '')
    .trim();

  // 2026-09-21 safeguard: when the fixture row has a canonical score,
  // inject a structured "Final Score" line right before the Source footer.
  // The audit pipeline parses "Final Score: <Team> N, <Team> M." exactly
  // (see scripts/_audit-pipeline.cjs extractClaims). Without this line
  // the audit returns CANNOT_VERIFY because LLM-generated prose doesn't
  // contain a parseable score claim — even when the score is correct in
  // the body. We use the fixture's ground-truth score, not the LLM's,
  // so the article is verifiable as-written.
  let finalScoreLine = '';
  // Resolve score data with a 3-tier fallback:
  //   1. fixtureRow (from fixtures table) — most reliable, has been cross-verified
  //   2. webRecapData (from live NHL.com/HL fetch) — used when no fixtures row exists
  //   3. none — no score injection, article will be CANNOT_VERIFY at audit time
  let resolvedHomeScore = fixtureRow?.home_score;
  let resolvedAwayScore = fixtureRow?.away_score;
  let resolvedHomeName = fixtureRow?.home_team_name;
  let resolvedAwayName = fixtureRow?.away_team_name;
  if ((typeof resolvedHomeScore !== 'number' || typeof resolvedAwayScore !== 'number'
       || !resolvedHomeName || !resolvedAwayName)
      && webRecapData && webRecapData.score) {
    // webRecapData.score format: "N - M" (home - away) from getMatchData
    const scoreParts = String(webRecapData.score).split('-').map(s => parseInt(s.trim(), 10));
    if (scoreParts.length === 2 && !Number.isNaN(scoreParts[0]) && !Number.isNaN(scoreParts[1])) {
      resolvedHomeScore = scoreParts[0];
      resolvedAwayScore = scoreParts[1];
      resolvedHomeName = resolvedHomeName || webRecapData.home || webRecapData.home_team_name || '';
      resolvedAwayName = resolvedAwayName || webRecapData.away || webRecapData.away_team_name || '';
      console.log(`  ℹ Final Score from web-recap fallback (no fixtures row): ${resolvedHomeName} ${resolvedHomeScore}, ${resolvedAwayName} ${resolvedAwayScore}`);
    }
  }
  if (typeof resolvedHomeScore === 'number' && typeof resolvedAwayScore === 'number'
      && resolvedHomeName && resolvedAwayName) {
    finalScoreLine = `\n\n**Final Score:** ${resolvedHomeName} ${resolvedHomeScore}, ${resolvedAwayName} ${resolvedAwayScore}.`;
  }
  const contentWithFooter = `${bodyClean}${finalScoreLine}\n\n*Source: ${source_cite}*`;

  // Title-vs-score consistency check (added 2026-09-23 per Arnel directive
  // 'Why are you not just drafting posts and preparing them with image in
  // rinkstop ops'). If the LLM-generated title says one team won but the
  // fixture data says the other team won, the article is internally
  // inconsistent. This was happening because highlightly's fixtures import
  // sometimes flips home/away scores. We detect this BEFORE inserting and
  // force the article to draft status (so it doesn't auto-publish) plus
  // append a review note. Audit pipeline + nightly cron should also catch
  // these (see scripts/_audit-pipeline.cjs) but this is the fast-path.
  let titleScoreMismatch = false;
  let titleScoreMismatchNote = '';
  if (fixtureRow && typeof resolvedHomeScore === 'number' && typeof resolvedAwayScore === 'number'
      && title && resolvedHomeName && resolvedAwayName) {
    const titleWinner = extractWinnerFromTitle(title, resolvedHomeName, resolvedAwayName);
    if (titleWinner === 'home' && resolvedHomeScore < resolvedAwayScore) {
      titleScoreMismatch = true;
      titleScoreMismatchNote = `[REVIEW: Title says "${resolvedHomeName} won" but fixture shows ${resolvedHomeScore}-${resolvedAwayScore} (${resolvedAwayName} won). Fixture data may be wrong.]`;
    } else if (titleWinner === 'away' && resolvedAwayScore < resolvedHomeScore) {
      titleScoreMismatch = true;
      titleScoreMismatchNote = `[REVIEW: Title says "${resolvedAwayName} won" but fixture shows ${resolvedHomeScore}-${resolvedAwayScore} (${resolvedHomeName} won). Fixture data may be wrong.]`;
    } else if (titleWinner === 'tie' && resolvedHomeScore !== resolvedAwayScore) {
      titleScoreMismatch = true;
      titleScoreMismatchNote = `[REVIEW: Title says tied but fixture shows ${resolvedHomeScore}-${resolvedAwayScore}. Fixture data may be wrong.]`;
    }
  }
  const finalContent = titleScoreMismatch
    ? `${contentWithFooter}\n\n---\n\n${titleScoreMismatchNote}\n`
    : contentWithFooter;

  const insertPayload = {
    slug,
    title,
    subtitle,
    content: finalContent,
    author_name: 'RinkStop',
    author_role: 'Highlight Desk',
    status: 'draft',
    published_at: null,
    seo_title,
    seo_description,
    og_image_url: highlight.image_url,
    tags,
    category,
    reading_time_minutes,
    view_count: 0,
    is_featured: false,
    highlight_id: highlight.id,
  };
  // 2026-09-21 safeguard: stamp the audit-required fields whenever we
  // have a matching fixtures row, so the audit pipeline can pick the
  // right adapter (NHL.com / Highlightly / HockeyTech) and actually
  // verify the article. Without these, audit returns CANNOT_VERIFY for
  // every league and the article is held indefinitely.
  if (fixtureRow) {
    insertPayload.game_date = (fixtureRow.scheduled_at || highlight.match_date || '').slice(0, 10) || null;
    insertPayload.league_id = fixtureRow.league_id;
    if (fixtureRow.home_team_id) insertPayload.team_home_id = fixtureRow.home_team_id;
    if (fixtureRow.away_team_id) insertPayload.team_away_id = fixtureRow.away_team_id;
  } else if (webRecapData && webRecapData.league) {
    // Web-recap fallback (added 2026-09-21 per Arnel's directive that
    // articles must be published, not held in drafts). When we don't have
    // a fixtures row but we DO have verified match data from NHL.com/Highlightly,
    // stamp league_id + game_date + team FKs so the audit pipeline can pick
    // the right adapter and actually verify the article.
    const leagueName = String(webRecapData.league).trim();
    const leagueUuid = LEAGUE_NAME_TO_UUID[leagueName] || LEAGUE_NAME_TO_UUID[leagueName.toUpperCase()];
    if (leagueUuid) {
      insertPayload.league_id = leagueUuid;
    }
    if (highlight.match_date) insertPayload.game_date = highlight.match_date.slice(0, 10);
    // Try to resolve team FKs by name from webRecapData
    if (webRecapData.home) {
      const { data: htRow } = await sb.from('teams').select('id').ilike('name', String(webRecapData.home).replace(/\s+\(.+?\)/, '')).maybeSingle();
      if (htRow) insertPayload.team_home_id = htRow.id;
    }
    if (webRecapData.away) {
      const { data: atRow } = await sb.from('teams').select('id').ilike('name', String(webRecapData.away).replace(/\s+\(.+?\)/, '')).maybeSingle();
      if (atRow) insertPayload.team_away_id = atRow.id;
    }
  } else if (highlight.match_date) {
    // No fixture match (e.g. NCAA, Swiss NL — leagues we don't sync).
    // Still stamp the game_date so the audit at least knows when.
    insertPayload.game_date = highlight.match_date.slice(0, 10);
  }

  const { data, error } = await sb.from('posts').insert(insertPayload).select('id, slug, title, status');
  if (error) throw error;
  return data[0];
}

/**
 * Process one highlight: gather facts, draft via LLM, insert.
 */
async function processHighlight(h) {
  const result = { highlight_id: h.id, title: h.title, steps: {} };
  console.log(`\n=== Processing highlight ${h.id}: ${h.title} ===`);

  // Step 1: video data
  const videoData = fetchVideoData(h.video_url);
  result.steps.video = {
    ok: !!videoData.ok,
    video_id: videoData.video_id,
    oembed_title: videoData.oembed?.title,
    transcript_snippets: videoData.transcript?.snippet_count || 0,
    transcript_error: videoData.transcript?.error || null,
  };
  if (!videoData.ok) {
    result.error = `video fetch failed: ${videoData.error}`;
    console.error('  ❌ video fetch failed:', videoData.error);
    return result;
  }
  console.log(`  ✓ video_id=${videoData.video_id}, oembed ok, transcript snippets=${videoData.transcript?.snippet_count || 0}`);

  // Step 1.5: require a usable transcript. Without play-by-play facts the
  // LLM has no anchor and will either invent stats or write a mealy
  // "I don't have enough data" stub. Better to skip and let the next run
  // (or a different IP) try again.
  if (!videoData.transcript?.ok && !USE_WEB_RECAP) {
    result.error = `no transcript: ${videoData.transcript?.error || 'unknown'}`;
    result.skipped = true;
    console.error(`  ⚠️  no transcript (${videoData.transcript?.error || 'unknown'}); skipping insert`);
    return result;
  }
  if (!videoData.transcript?.ok && USE_WEB_RECAP) {
    console.log(`  ⚠️  no transcript; using web search fallback`);
    result.steps.video.transcript_skipped = true;
  }

  // Step 2: fixtures
  const fixtures = await fixturesForHighlight(h);
  result.steps.fixtures = fixtures ? { found: fixtures.length } : { found: 0 };
  console.log(`  ✓ fixtures: ${fixtures?.length || 0} candidate rows for match day`);

  // Step 3: assemble facts block
  const factsBlock = {
    highlight: {
      id: h.id,
      title: h.title,
      source: h.source,
      match_date: h.match_date,
      home_team: h.home_team_name,
      away_team: h.away_team_name,
      league: h.league_name,
      video_url: h.video_url,
    },
    video: {
      id: videoData.video_id,
      oembed: videoData.oembed,
      transcript: videoData.transcript?.ok ? {
        snippet_count: videoData.transcript.snippet_count,
        text: videoData.transcript.text,
        samples: videoData.transcript.samples,
      } : null,
    },
    fixtures: fixtures || [],
    // NOTE: recap data (source-channel + league-official) is added by the
    // cron agent turn before calling this script. If recap_text is present
    // in h.recap_text it gets merged here.
    recaps: h.recap_text || null,
  };

  if (DRY_RUN) {
    result.facts_block = factsBlock;
    result.skipped_llm = true;
    console.log('  (dry run: not calling LLM)');
    return result;
  }

  // Step 4: LLM draft
  if (SKIP_LLM) {
    result.facts_block = factsBlock;
    result.skipped_llm = true;
    console.log('  (--skip-llm: not calling LLM)');
    return result;
  }

  let llmArticle;
  let webRecapData = null;
  try {
    if (!videoData.transcript?.ok && USE_WEB_RECAP) {
      // Web-search recap fallback (used when YouTube is rate-limiting us).
      // The kilo agent has web_search built in via Exa.
      const t0 = Date.now();
      const wr = await llmWebRecapDraft(h);
      llmArticle = wr.markdown;
      webRecapData = wr.matchData; // { score, home_team_name, away_team_name, source }
      result.steps.llm = { source: 'web_recap', elapsed_ms: Date.now() - t0 };
    } else {
      const llmResult = await llmDraft(factsBlock);
      llmArticle = llmResult.markdown; // includes YAML frontmatter
    }
  } catch (e) {
    result.error = `LLM failed: ${e.message?.slice(0, 300)}`;
    console.error('  ❌ LLM failed:', e.message?.slice(0, 300));
    return result;
  }
  const { meta, body } = parseFrontmatter(llmArticle);
  result.steps.llm = {
    title: meta.title || extractTitleFromBody(body),
    reading_time: meta.reading_time_minutes,
    word_count: body.split(/\s+/).length,
  };
  console.log(`  ✓ LLM draft: "${result.steps.llm.title}" (${result.steps.llm.word_count} words)`);

  // Stub detection: LLM returned nothing usable (often the case when both YouTube
  // transcript and Highlightly match data are unavailable). Don't pollute the DB
  // with empty drafts — leave the highlight in the candidate pool.
  if (result.steps.llm.word_count < 150) {
    result.error = `stub draft: LLM returned only ${result.steps.llm.word_count} words (likely no data sources available)`;
    console.warn(`  ⚠️  stub draft detected (${result.steps.llm.word_count} words) — skipping insert`);
    return result;
  }

  // Step 5: insert draft
  try {
    // Resolve a matching fixtures row so the audit pipeline can pick the
    // right adapter (NHL.com / HockeyTech / Highlightly) and actually verify
    // the article. Without league_id + game_date + team FKs on the post row,
    // the audit returns CANNOT_VERIFY and the article is held indefinitely.
    const fixtureRow = await findFixtureForHighlight(h);
    if (fixtureRow) {
      result.steps.fixture_match = fixtureRow.id;
      console.log(`  ✓ fixture match: ${fixtureRow.id} (league ${fixtureRow.league_id?.slice(0,8)}...)`);
    }
    // Web-recap fallback: pass the live match data so insertDraft can inject
    // a Final Score line even when the fixtures table hasn't been updated yet
    // (added 2026-09-21 per Arnel's directive that articles must be published,
    // not held in drafts forever).
    const post = await insertDraft(h, meta, body, fixtureRow, webRecapData);
    result.post = post;
    result.steps.insert = { id: post.id, slug: post.slug };
    console.log(`  ✓ inserted draft: ${post.slug}`);
  } catch (e) {
    if (e instanceof SlugCollisionError) {
      // Per docs/CLEAN-POST-SLUGS-SPEC.md §4.4: same teams on same day
      // = refuse, surface, don't auto-dedupe. Surface with full context
      // so Arnel can manually decide.
      result.error = `slug collision: ${e.message}`;
      result.skipped = true;
      result.collision = {
        proposed_slug: e.proposedSlug,
        existing: e.existing,
        highlight_id: h.id,
        home_team: h.home_team_name,
        away_team: h.away_team_name,
        match_date: h.match_date,
      };
      console.error(`  ⛔ slug collision: "${e.proposedSlug}" already exists on post ${e.existing.id}`);
      console.error(`     highlight: ${h.home_team_name} vs ${h.away_team_name} on ${h.match_date}`);
      console.error(`     existing post: highlight_id=${e.existing.highlight_id} published_at=${e.existing.published_at}`);
      return result;
    }
    result.error = `insert failed: ${e.message?.slice(0, 300)}`;
    console.error('  ❌ insert failed:', e.message?.slice(0, 300));
    return result;
  }

  return result;
}

async function main() {
  let candidates;
  if (MODE === 'single') {
    const { data, error } = await sb.from('highlight_backups')
      .select('id, title, video_url, source, match_date, home_team_name, away_team_name, league_name, image_url, match_id, description, channel, embed_url')
      .eq('id', HIGHLIGHT_ID).single();
    if (error || !data) { console.error('Highlight not found:', error); process.exit(1); }
    candidates = [data];
  } else {
    candidates = await findCandidates();
  }
  if (candidates.length === 0) {
    console.log('No candidate highlights to process.');
    process.exit(0);
  }
  console.log(`Processing ${candidates.length} highlight(s)...`);

  const results = [];
  // Throttle: if too many highlights in a row can't find data, bail early.
  // Web-recap failures cluster by league/date (e.g. older AHL pre-2026 has no Highlightly data).
  let consecutiveNoData = 0;
  const MAX_CONSECUTIVE_NO_DATA = 25;
  for (const h of candidates) {
    try {
      const r = await processHighlight(h);
      results.push(r);
      // Count 'no data' results (stub drafts OR llm failures with no usable data)
      const isNoData = r.error && (
        r.error.includes('no score data') ||
        r.error.includes('no transcript') ||
        r.error.includes('stub draft')
      );
      if (isNoData) {
        consecutiveNoData++;
        if (consecutiveNoData >= MAX_CONSECUTIVE_NO_DATA) {
          console.warn(`\n⚠️  ${MAX_CONSECUTIVE_NO_DATA} consecutive no-data results — likely out of data coverage. Stopping early.`);
          break;
        }
      } else {
        consecutiveNoData = 0;
      }
    } catch (e) {
      console.error(`Highlight ${h.id} crashed:`, e);
      results.push({ highlight_id: h.id, error: e.message?.slice(0, 500) });
    }
  }

  console.log('\n=== Summary ===');
  console.log(JSON.stringify({ mode: MODE, dry_run: DRY_RUN, results }, null, 2));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
