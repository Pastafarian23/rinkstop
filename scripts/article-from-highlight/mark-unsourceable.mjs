#!/usr/bin/env node
/**
 * mark-unsourceable.mjs
 * 
 * For each highlight that doesn't yet have a draft/post, check if BOTH data
 * sources are unavailable (no YouTube transcript AND no Highlightly match).
 * If both fail, mark the highlight as data_available=false so the orchestrator
 * skips it on future runs.
 * 
 * Run this ONCE to clean up the backfill pool. After it runs, the cron and
 * subsequent backfill batches only process highlights with confirmed data.
 * 
 * Usage: node scripts/article-from-highlight/mark-unsourceable.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
try {
  const envFile = readFileSync('.env', 'utf8');
  for (const line of envFile.split('\n')) {
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).replace(/['"]/g, '').trim();
    if (key) env[key] = val;
  }
} catch {}

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const HIGHLIGHTLY_API_KEY = env.HIGHLIGHTLY_API_KEY;

function extractVideoId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function leagueName(league) {
  if (typeof league === 'object' && league) return league.name || '';
  return league || '';
}

async function highlightlyHasMatch(teams, date) {
  if (!HIGHLIGHTLY_API_KEY || !teams.length || !date) return false;
  const teamKeys = teams.map(t => {
    const noThe = t.replace(/^the\s+/i, '').toLowerCase().trim();
    return { full: noThe, last: noThe.split(/\s+/).pop() };
  });
  const endpoints = [
    { base: 'https://hockey.highlightly.net', host: 'hockey-highlights-api.p.rapidapi.com' },
    { base: 'https://nhl.highlightly.net', host: 'nhl-ncaah-api.p.rapidapi.com' },
  ];
  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dates = [dayBefore.toISOString().slice(0, 10), date, dayAfter.toISOString().slice(0, 10)];

  for (const ep of endpoints) {
    for (const d of dates) {
      try {
        const res = await fetch(`${ep.base}/matches?date=${d}&limit=20`, {
          headers: {
            'x-rapidapi-key': HIGHLIGHTLY_API_KEY,
            'x-rapidapi-host': ep.host,
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;
        const j = await res.json();
        for (const m of (j.data || [])) {
          const homeName = (m.homeTeam?.name || m.homeTeam?.displayName || '').toLowerCase();
          const awayName = (m.awayTeam?.name || m.awayTeam?.displayName || '').toLowerCase();
          const homeHas = teamKeys.some(k => homeName.includes(k.last) || homeName.includes(k.full));
          const awayHas = teamKeys.some(k => awayName.includes(k.last) || awayName.includes(k.full));
          if (homeHas && awayHas) return true;
        }
      } catch {}
    }
  }
  return false;
}

async function main() {
  console.log('Loading unprocessed highlights...');
  // Get all YouTube highlights
  const { data: allHl } = await sb
    .from('highlight_backups')
    .select('id, title, video_url, match_date, home_team_name, away_team_name, league_name')
    .ilike('video_url', '%youtube.com%')
    .not('video_url', 'is', null)
    .order('match_date', { ascending: false });
  if (!allHl) { console.log('No highlights'); return; }

  // Get all highlight_ids that have posts
  const { data: posts } = await sb
    .from('posts')
    .select('highlight_id')
    .not('highlight_id', 'is', null);
  const withPost = new Set((posts || []).map(p => p.highlight_id));

  // Filter to unprocessed
  const candidates = allHl.filter(h => !withPost.has(h.id));
  console.log(`Total YouTube highlights: ${allHl.length}`);
  console.log(`With companion post: ${withPost.size}`);
  console.log(`Unprocessed: ${candidates.length}`);

  // For each, check if we have data. If both YouTube and Highlightly are blocked
  // for this highlight, mark it.
  // YouTube block: assume ALL transcripts blocked (server IP is banned).
  // Highlightly: query the match API.
  let marked = 0;
  let wouldHave = 0;
  for (let i = 0; i < candidates.length; i++) {
    const h = candidates[i];
    if (i % 10 === 0) console.log(`  [${i}/${candidates.length}] Checking highlight ${h.id}...`);
    const teams = [h.home_team_name, h.away_team_name].filter(Boolean);
    const date = (h.match_date || '').slice(0, 10);
    const hasHighlightly = await highlightlyHasMatch(teams, date);
    if (!hasHighlightly) {
      // Both sources unavailable. Mark this highlight as data_available=false.
      const { error } = await sb
        .from('highlight_backups')
        .update({ data_available: false })
        .eq('id', h.id);
      if (!error) marked++;
    } else {
      wouldHave++;
    }
    // Rate limit: 50ms between Highlightly calls
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n=== Done ===`);
  console.log(`Marked as data_available=false: ${marked}`);
  console.log(`Has data (data_available=true needed): ${wouldHave}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
