#!/usr/bin/env node
/**
 * mark-all-unsourceable.mjs
 *
 * Re-marker that processes ALL YouTube highlights (not just the 792 most
 * recent) and sets data_available=true/false based on whether Highlightly
 * or NHL.com has match data for that team/date.
 *
 * Resumable: tracks progress in /tmp/mark-all-checkpoint.json.
 * SIGTERM-safe: writes checkpoint on exit.
 *
 * Usage: node scripts/article-from-highlight/mark-all-unsourceable.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getMatchData, normalizeLeague } from './match-data.mjs';

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

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const HIGHLIGHTLY_API_KEY = env.HIGHLIGHTLY_API_KEY;
const CHECKPOINT = '/tmp/mark-all-checkpoint.json';

const sleep = ms => new Promise(r => setTimeout(r, ms));

let checkpoint = { processed: [], offset: 0, unsourceable: 0, sourceable: 0 };
if (existsSync(CHECKPOINT)) {
  try { checkpoint = JSON.parse(readFileSync(CHECKPOINT, 'utf8')); } catch {}
}
const processedSet = new Set(checkpoint.processed);

const writeCheckpoint = () => writeFileSync(CHECKPOINT, JSON.stringify(checkpoint));

process.on('SIGTERM', () => { writeCheckpoint(); process.exit(0); });
process.on('SIGINT', () => { writeCheckpoint(); process.exit(0); });

async function main() {
  let total = 0;
  // Get total
  const { count: t1 } = await sb
    .from('highlight_backups')
    .select('id', { count: 'exact', head: true })
    .ilike('video_url', '%youtube.com%');
  total = t1 || 0;
  console.log(`Total YouTube highlights: ${total}`);
  console.log(`Already processed: ${processedSet.size}`);
  console.log(`Remaining: ${total - processedSet.size}`);

  let off = checkpoint.offset;
  let batchNum = 0;
  while (off < total) {
    batchNum++;
    const { data: chunk } = await sb
      .from('highlight_backups')
      .select('id, home_team_name, away_team_name, match_date, league_name')
      .ilike('video_url', '%youtube.com%')
      .order('match_date', { ascending: false })
      .range(off, off + 199);
    if (!chunk || chunk.length === 0) break;
    let batchSourceable = 0;
    let batchUnsourceable = 0;
    for (const h of chunk) {
      if (processedSet.has(h.id)) continue;
      const teams = [h.home_team_name, h.away_team_name].filter(Boolean);
      const date = (h.match_date || '').slice(0, 10);
      const league = normalizeLeague(h.league_name);
      const match = await getMatchData({ teams, date, league, apiKey: HIGHLIGHTLY_API_KEY });
      const avail = !!match;
      await sb.from('highlight_backups').update({ data_available: avail }).eq('id', h.id);
      processedSet.add(h.id);
      checkpoint.processed.push(h.id);
      if (avail) {
        checkpoint.sourceable++;
        batchSourceable++;
      } else {
        checkpoint.unsourceable++;
        batchUnsourceable++;
      }
      await sleep(80);
    }
    checkpoint.offset = off + 200;
    writeCheckpoint();
    if (batchNum % 5 === 0) {
      console.log(`  batch ${batchNum}: offset=${off}, sourceable+=${batchSourceable}, unsourceable+=${batchUnsourceable}, total sourceable=${checkpoint.sourceable}, unsourceable=${checkpoint.unsourceable}`);
    }
    off += 200;
  }
  console.log(`\nDone. Sourceable: ${checkpoint.sourceable}, Unsourceable: ${checkpoint.unsourceable}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
