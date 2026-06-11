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
  // Query cap = max(200, LIMIT * 2) so we have headroom after the existing-post filter.
  const queryCap = Math.max(200, LIMIT * 2);
  const { data: highlights, error } = await sb
    .from('highlight_backups')
    .select('id, title, video_url, source, match_date, home_team_name, away_team_name, league_name, image_url, match_id, description, channel, embed_url')
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
  const filtered = highlights.filter(h => !taken.has(h.id));
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
    ? `NO TRANSCRIPT AVAILABLE. You are writing from a score + period breakdown ONLY. DO NOT invent goal scorers, play-by-play, or specific stats. You may write about the final score, period-by-period flow as shown, what the result means in context of standings/series, and the value of the highlight video. Keep the article more conservative (400-600 words) since the play-by-play is unknown.`
    : '';
  return `Write a hockey game recap article. Facts block below is your ONLY source of truth. If a name/number/score isn't in the block, you cannot use it.
${noTranscriptNote}

FACTS BLOCK:
${JSON.stringify(compactFacts, null, 2)}

REQUIRED STRUCTURE (return this EXACT shape, no preamble, no commentary):

---
title: <60 chars max>
subtitle: <1-2 sentences>
seo_title: <60 chars max>
seo_description: <140-160 chars>
tags: [4-7 lowercase tags]
category: highlights
reading_time_minutes: <5-8>
source_cite: <where transcript came from, e.g. "NHL YouTube broadcast">
---

# <title>

https://www.youtube.com/watch?v=${videoId}

<opening paragraph, 2-3 sentences>

## How the Game Played Out

<body — describe the flow of the game, key moments, goal scorers, periods. Pull everything from the transcript.>

## What the Result Means

<body — what this game means for the standings, the series, both teams.>

## Watch the Highlights

<short paragraph + embed call-to-action>

*Source: <source_cite>*

CRITICAL:
- The article body (everything from "# <title>" onward) MUST be 500-800 words. Do NOT stop after the frontmatter.
- Do NOT invent stats, scores, goal scorers, or sequences.
- Use only verified facts from the block.
- Tone: confident hockey journalist, not a fact dump.

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
  const leagueRaw = highlight.league_name;
  const league = (typeof leagueRaw === 'object' && leagueRaw) ? leagueRaw.name : (leagueRaw || '');

  // Call Highlightly match-list to confirm score
  const hlData = await highlightlyMatchData({ teams, date, league });
  if (!hlData || !hlData.score) {
    throw new Error('Highlightly returned no score data for this game');
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
  return llmResult.markdown;
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

async function insertDraft(highlight, meta, body) {
  // Fall back to extracting title from body if frontmatter didn't have one.
  const title = meta.title || extractTitleFromBody(body) || highlight.title;
  const subtitle = meta.subtitle || '';
  const seo_title = meta.seo_title || title;
  const seo_description = meta.seo_description || subtitle.slice(0, 160) || `Recap of ${highlight.title}`;
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const category = meta.category || 'highlights';
  const reading_time_minutes = meta.reading_time_minutes || Math.max(1, Math.round(body.split(/\s+/).length / 200));
  const source_cite = meta.source_cite || highlight.source || 'YouTube broadcast';

  const slugBase = (seo_title || title).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const { data: slugTaken } = await sb.from('posts').select('id').eq('slug', slugBase).limit(1);
  const slug = slugTaken && slugTaken.length > 0 ? `${slugBase}-${highlight.id}` : slugBase;

  // Append a source-cite footer to the body so the article is self-citing.
  // Strip any existing trailing *Source:* line from the LLM, then add ours.
  const bodyClean = body.replace(/\n*\*Source:.*\*\s*$/m, '').trim();
  const contentWithFooter = `${bodyClean}\n\n*Source: ${source_cite} | Verified via YouTube transcript, source-channel metadata, and web search. Compiled by the RinkStop article pipeline.*`;

  const { data, error } = await sb.from('posts').insert({
    slug,
    title,
    subtitle,
    content: contentWithFooter,
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
  }).select('id, slug, title, status');
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
  try {
    if (!videoData.transcript?.ok && USE_WEB_RECAP) {
      // Web-search recap fallback (used when YouTube is rate-limiting us).
      // The kilo agent has web_search built in via Exa.
      const t0 = Date.now();
      llmArticle = await llmWebRecapDraft(h);
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
    const post = await insertDraft(h, meta, body);
    result.post = post;
    result.steps.insert = { id: post.id, slug: post.slug };
    console.log(`  ✓ inserted draft: ${post.slug}`);
  } catch (e) {
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
