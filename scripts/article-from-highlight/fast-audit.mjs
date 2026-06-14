#!/usr/bin/env node
/**
 * fast-audit.mjs
 *
 * Stricter, faster version of audit-published-articles.mjs.
 *
 * Key differences from the original:
 * - Hard 8s per-article timeout (was unlimited → would hang on bad source)
 * - Per-source hard 5s timeouts (was 8s/10s per source, but a single source
 *   could still block the chain)
 * - Skips sources gracefully on error/timeout (don't block the whole run)
 * - Logs EVERY article result, not just failures (so we can see progress)
 * - Parallel source queries with Promise.race (first one to return wins)
 * - Treats unverified articles as failures (archive)
 *
 * Behavior:
 *   - Dry run (default): just report what would happen
 *   - --execute: archive bad articles in Supabase
 */

import { readFileSync, existsSync } from 'fs';
const ENV_FILE = '/root/.openclaw/workspace/rinkstop-platform/.env';
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;

const execute = process.argv.includes('--execute');
const PER_ARTICLE_TIMEOUT_MS = 12000;
const SOURCE_TIMEOUT_MS = 5000;

console.log(`Mode: ${execute ? 'EXECUTE (will archive)' : 'DRY RUN (no changes)'}`);

// Lightweight isFinalScore
const isFinalScore = s => typeof s === 'string' && /^\d+\s*[-–—]\s*\d+$/.test(s.trim());

// Fetch with timeout
async function fetchJSON(url, opts = {}, timeoutMs = SOURCE_TIMEOUT_MS) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function teamsToAbbrevs(teams) {
  const NHL_TEAMS = {
    'Anaheim Ducks':'ANA','Ducks':'ANA','Boston Bruins':'BOS','Bruins':'BOS',
    'Buffalo Sabres':'BUF','Sabres':'BUF','Calgary Flames':'CGY','Flames':'CGY',
    'Carolina Hurricanes':'CAR','Hurricanes':'CAR','Chicago Blackhawks':'CHI','Blackhawks':'CHI',
    'Colorado Avalanche':'COL','Avalanche':'COL','Columbus Blue Jackets':'CBJ','Blue Jackets':'CBJ',
    'Dallas Stars':'DAL','Stars':'DAL','Detroit Red Wings':'DET','Red Wings':'DET',
    'Edmonton Oilers':'EDM','Oilers':'EDM','Florida Panthers':'FLA','Panthers':'FLA',
    'Los Angeles Kings':'LAK','Kings':'LAK','Minnesota Wild':'MIN','Wild':'MIN',
    'Montreal Canadiens':'MTL','Canadiens':'MTL','Montréal Canadiens':'MTL',
    'Nashville Predators':'NSH','Predators':'NSH','New Jersey Devils':'NJD','Devils':'NJD',
    'New York Islanders':'NYI','Islanders':'NYI','New York Rangers':'NYR','Rangers':'NYR',
    'Ottawa Senators':'OTT','Senators':'OTT','Philadelphia Flyers':'PHI','Flyers':'PHI',
    'Pittsburgh Penguins':'PIT','Penguins':'PIT','San Jose Sharks':'SJS','Sharks':'SJS',
    'Seattle Kraken':'SEA','Kraken':'SEA','St. Louis Blues':'STL','Blues':'STL',
    'St Louis Blues':'STL','Tampa Bay Lightning':'TBL','Lightning':'TBL',
    'Toronto Maple Leafs':'TOR','Maple Leafs':'TOR','Utah Mammoth':'UTA','Mammoth':'UTA',
    'Vancouver Canucks':'VAN','Canucks':'VAN','Vegas Golden Knights':'VGK','Golden Knights':'VGK',
    'Washington Capitals':'WSH','Capitals':'WSH','Winnipeg Jets':'WPG','Jets':'WPG',
  };
  const abbrevs = new Set();
  for (const t of teams) {
    const noThe = t.replace(/^the\s+/i, '').trim();
    if (NHL_TEAMS[noThe]) abbrevs.add(NHL_TEAMS[noThe]);
    const last = noThe.split(/\s+/).pop();
    if (NHL_TEAMS[last]) abbrevs.add(NHL_TEAMS[last]);
  }
  return abbrevs;
}

/**
 * Try NHL.com and Highlightly in parallel. Return first source with a
 * verifiable final score, or null if all fail.
 */
async function fastMatch(teams, date, league) {
  const leagueUpper = (league || '').toUpperCase();
  const sources = [];

  if (leagueUpper === 'NHL') {
    const wantAbbrevs = teamsToAbbrevs(teams);
    if (wantAbbrevs.size) {
      sources.push((async () => {
        // Try EXACT date first. NHL.com returns games for the date and a
        // +/- range, so we filter strictly to the requested date. This
        // prevents the bug where a back-to-back playoff game on day+1
        // gets matched as the wrong game.
        const d0 = new Date(date + 'T00:00:00Z');
        const exactDate = d0.toISOString().slice(0, 10);
        const j = await fetchJSON(`https://api-web.nhle.com/v1/schedule/${exactDate}`);
        for (const day of (j?.gameWeek || [])) {
          if (day.date !== exactDate) continue;
          for (const g of (day.games || [])) {
            if (wantAbbrevs.has(g.homeTeam?.abbrev) && wantAbbrevs.has(g.awayTeam?.abbrev)) {
              const sc = `${g.awayTeam?.score}-${g.homeTeam?.score}`;
              if (isFinalScore(sc)) {
                const periodType = g.periodDescriptor?.periodType;
                return {
                  source: 'nhl.com',
                  score: sc,
                  wasOT: periodType === 'OT',
                  wasSO: periodType === 'SO',
                };
              }
            }
          }
        }
        return null;
      })());
    }
  }

  // Highlightly (works for any league)
  if (HIGHLIGHTLY_API_KEY && teams.length) {
    const teamKeys = teams.map(t => {
      const noThe = t.replace(/^the\s+/i, '').toLowerCase().trim();
      return { full: noThe, last: noThe.split(/\s+/).pop() };
    });
    const endpoints = [
      { base: 'https://hockey.highlightly.net', host: 'hockey-highlights-api.p.rapidapi.com' },
      { base: 'https://nhl.highlightly.net', host: 'nhl-ncaah-api.p.rapidapi.com' },
    ];
    const d0 = new Date(date + 'T00:00:00Z');
    const exactDate = d0.toISOString().slice(0, 10);
    // Try exact date first, then ±1 day as fallback
    const dates = [exactDate];
    for (const off of [-1, 1]) {
      const d = new Date(d0);
      d.setUTCDate(d0.getUTCDate() + off);
      dates.push(d.toISOString().slice(0, 10));
    }
    sources.push((async () => {
      // First pass: try to find a match on the EXACT date only.
      // If found, return it directly (no ±1 day fallback) — this prevents
      // a back-to-back playoff game on day+1 from being matched incorrectly.
      for (const ep of endpoints) {
        const j = await fetchJSON(
          `${ep.base}/matches?date=${exactDate}&limit=30`,
          { headers: { 'x-rapidapi-key': HIGHLIGHTLY_API_KEY, 'x-rapidapi-host': ep.host } }
        );
        for (const m of (j?.data || [])) {
          const homeName = (m.homeTeam?.name || m.homeTeam?.displayName || '').toLowerCase();
          const awayName = (m.awayTeam?.name || m.awayTeam?.displayName || '').toLowerCase();
          const homeHas = teamKeys.some(k => homeName.includes(k.last) || homeName.includes(k.full));
          const awayHas = teamKeys.some(k => awayName.includes(k.last) || awayName.includes(k.full));
          if (homeHas && awayHas) {
            const sc = m.state?.score?.current || '';
            if (isFinalScore(sc)) {
              const otGoals = m.state?.score?.overTime && m.state.score.overTime !== '0 - 0';
              const soGoals = m.state?.score?.penalties && m.state.score.penalties !== '0 - 0';
              return { source: 'highlightly', score: sc, wasOT: !!otGoals, wasSO: !!soGoals };
            }
          }
        }
      }
      // Second pass: fall back to ±1 day (for non-NHL leagues where the
      // local-date match_date might be off by a TZ from the API date)
      for (const ep of endpoints) {
        for (const off of [-1, 1]) {
          const d = new Date(d0);
          d.setUTCDate(d0.getUTCDate() + off);
          const adjDate = d.toISOString().slice(0, 10);
          const j = await fetchJSON(
            `${ep.base}/matches?date=${adjDate}&limit=30`,
            { headers: { 'x-rapidapi-key': HIGHLIGHTLY_API_KEY, 'x-rapidapi-host': ep.host } }
          );
          for (const m of (j?.data || [])) {
            const homeName = (m.homeTeam?.name || m.homeTeam?.displayName || '').toLowerCase();
            const awayName = (m.awayTeam?.name || m.awayTeam?.displayName || '').toLowerCase();
            const homeHas = teamKeys.some(k => homeName.includes(k.last) || homeName.includes(k.full));
            const awayHas = teamKeys.some(k => awayName.includes(k.last) || awayName.includes(k.full));
            if (homeHas && awayHas) {
              const sc = m.state?.score?.current || '';
              if (isFinalScore(sc)) {
                const otGoals = m.state?.score?.overTime && m.state.score.overTime !== '0 - 0';
                const soGoals = m.state?.score?.penalties && m.state.score.penalties !== '0 - 0';
                return { source: 'highlightly', score: sc, wasOT: !!otGoals, wasSO: !!soGoals, _dateOffset: off };
              }
            }
          }
        }
      }
      return null;
    })());
  }

  // Wait for first success, or all to fail
  const results = await Promise.allSettled(sources);
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) return r.value;
  }
  return null;
}

function analyzeArticle(title, body, match) {
  if (!match) return { ok: false, issues: ['no source has a final score'] };
  const fullBody = (title + ' ' + body).toLowerCase();
  const [homeS, awayS] = match.score.split(/\s*[-–—]\s*/);
  const homeW = parseInt(homeS);
  const awayW = parseInt(awayS);
  if (Number.isFinite(homeW) && Number.isFinite(awayW)) {
    const homeAway = new RegExp(`\\b${homeW}\\s*[-–to]+\\s*${awayW}\\b`).test(fullBody);
    const awayHome = new RegExp(`\\b${awayW}\\s*[-–to]+\\s*${homeW}\\b`).test(fullBody);
    if (!homeAway && !awayHome) {
      return { ok: false, issues: [`expected score ${match.score} not present in any direction`] };
    }
  }
  const articleClaimsOT = /\bovertime\b|\bin ot\b|\b OT\b/i.test(title + '\n' + body);
  const articleClaimsSO = /shootout/i.test(title + '\n' + body);
  if (articleClaimsOT && !match.wasOT) {
    return { ok: false, issues: [`article claims OT but source says ${match.score} regulation`] };
  }
  if (articleClaimsSO && !match.wasSO) {
    return { ok: false, issues: [`article claims shootout but source says ${match.score}`] };
  }
  return { ok: true, issues: [] };
}

async function main() {
  console.log('Loading PUBLISHED articles with highlight_id...');
  const { data: posts, error } = await sb
    .from('posts')
    .select('id, highlight_id, title, content')
    .eq('status', 'published')
    .not('highlight_id', 'is', null)
    .order('published_at', { ascending: false });
  if (error) { console.error(error); return; }
  console.log(`Found ${posts.length} published articles to audit`);

  const hlIds = [...new Set(posts.map(p => p.highlight_id).filter(Boolean))];
  console.log(`Loading ${hlIds.length} unique highlight records (chunked)...`);
  const hlMap = new Map();
  for (let i = 0; i < hlIds.length; i += 200) {
    const chunk = hlIds.slice(i, i + 200);
    const { data: hls } = await sb
      .from('highlight_backups')
      .select('id, home_team_name, away_team_name, match_date, league_name')
      .in('id', chunk);
    for (const h of (hls || [])) hlMap.set(h.id, h);
  }
  console.log(`Loaded ${hlMap.size} highlights`);

  let clean = 0, wouldArchive = 0, archived = 0;
  const reasons = {};
  const archived_ids = [];

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const h = hlMap.get(p.highlight_id);
    const stamp = `[${i+1}/${posts.length}]`;
    if (!h) {
      console.log(`  ${stamp} no-highlight: ${p.title}`);
      reasons['no_highlight'] = (reasons['no_highlight'] || 0) + 1;
      wouldArchive++;
      if (execute) { await sb.from('posts').update({ status: 'archived' }).eq('id', p.id); archived++; archived_ids.push(p.id); }
      continue;
    }
    const teams = [h.home_team_name, h.away_team_name].filter(Boolean);
    const date = (h.match_date || '').slice(0, 10);
    const league = (() => {
      const lr = h.league_name;
      if (!lr) return '';
      if (typeof lr === 'object') return lr.name || '';
      if (typeof lr === 'string') {
        if (lr.trim().startsWith('{')) { try { return JSON.parse(lr).name || ''; } catch {} }
        return lr.trim();
      }
      return '';
    })();

    let match;
    try {
      match = await Promise.race([
        fastMatch(teams, date, league),
        new Promise((_, rej) => setTimeout(() => rej(new Error('12s article timeout')), PER_ARTICLE_TIMEOUT_MS)),
      ]);
    } catch (e) {
      match = null;
    }

    const check = analyzeArticle(p.title, p.content || '', match);
    if (check.ok) {
      clean++;
      // Brief clean log so we can see progress
      if (i % 25 === 0) console.log(`  ${stamp} clean (${match?.source || '?'}): ${p.title}`);
      continue;
    }
    console.log(`  ${stamp} FAIL: ${p.title} — ${check.issues.join('; ')}`);
    for (const r of check.issues) {
      const k = r.match(/^[^(]+/)?.[0]?.trim() || r;
      reasons[k] = (reasons[k] || 0) + 1;
    }
    wouldArchive++;
    if (execute) { await sb.from('posts').update({ status: 'archived' }).eq('id', p.id); archived++; archived_ids.push(p.id); }
  }

  console.log(`\n=== Audit Summary ===`);
  console.log(`Clean (passed all checks): ${clean}`);
  console.log(`Would archive:             ${wouldArchive}`);
  console.log(`Actually archived:         ${archived}`);
  console.log(`\nIssue breakdown:`);
  for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}x ${k}`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
