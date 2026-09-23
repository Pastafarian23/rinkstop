#!/usr/bin/env node
/**
 * _repair-hl-scores-once.cjs — 2026-09-21
 *
 * One-time repair script for the HL-score-inversion bug found in the
 * 2026-09-21 audit. Before the fix, _daily-scores-ingest.cjs wrote
 * awayScore to fixtures.home_score (and vice versa). 26 completed HL
 * fixtures in DB from 2026-09-05 to 2026-09-19 still have inverted
 * scores because HL's date-search API only returns games from the
 * last ~5 days.
 *
 * This script queries the Highlightly detail endpoint
 *   GET /matches/{hl_match_id}
 * which returns a list with [0].state.score.current = "<home> - <away>"
 * and [0].homeTeam.name + [0].awayTeam.name, and UPDATEs each fixture's
 * home_score / away_score with the corrected values.
 *
 * Idempotent: only runs on fixtures with updated_at < 2026-09-21 (the
 * day the fix was deployed and the date-search re-run repaired the
 * 2026-09-20 batch). Dry-run by default; pass --write to actually
 * UPDATE rows.
 *
 * Usage:
 *   node scripts/_repair-hl-scores-once.cjs           # dry-run
 *   node scripts/_repair-hl-scores-once.cjs --write   # apply UPDATEs
 *
 * Expected runtime: ~30-60s for 26 fixtures at ~200ms/req.
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
const HOST = 'hockey-highlights-api.p.rapidapi.com';
const BASE = 'https://hockey.highlightly.net';

const WRITE = process.argv.includes('--write');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchHlMatchDetail(hlMatchId) {
  // Returns the list shape; the score lives at [0].state.score.current.
  const res = await fetch(`${BASE}/matches/${hlMatchId}`, {
    headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': HOST },
  });
  if (!res.ok) {
    throw new Error(`HL detail ${hlMatchId}: HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function main() {
  // Find all HL-sourced fixtures that were last updated BEFORE today's fix.
  const { data: stale, error } = await supabase
    .from('fixtures')
    .select('id, scheduled_at, home_score, away_score, status, game_data')
    .not('game_data->hl_match_id', 'is', null)
    .eq('status', 'completed')
    .lt('updated_at', '2026-09-21')
    .order('scheduled_at', { ascending: true });
  if (error) {
    console.error('Failed to load stale fixtures:', error.message);
    process.exit(1);
  }
  console.log(`Found ${stale.length} stale HL fixtures to inspect`);
  if (stale.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let repaired = 0;
  let unchanged = 0;
  let skipped = 0;
  let errors = 0;

  for (const f of stale) {
    const hlId = f.game_data?.hl_match_id;
    const dbHome = f.home_score;
    const dbAway = f.away_score;
    const dbHomeTeam = f.game_data?.home_team_name;
    const dbAwayTeam = f.game_data?.away_team_name;
    try {
      const detail = await fetchHlMatchDetail(hlId);
      const scoreStr = detail?.state?.score?.current;
      if (!scoreStr || !scoreStr.includes('-')) {
        console.log(`  [skip ${hlId}] no score in detail response`);
        skipped++;
        continue;
      }
      const [srcHome, srcAway] = scoreStr.split('-').map(s => parseInt(s.trim(), 10));
      if (Number.isNaN(srcHome) || Number.isNaN(srcAway)) {
        console.log(`  [skip ${hlId}] unparseable score "${scoreStr}"`);
        skipped++;
        continue;
      }

      const inverted = (srcHome === dbAway && srcAway === dbHome);
      const same = (srcHome === dbHome && srcAway === dbAway);
      if (same) {
        unchanged++;
      } else if (inverted) {
        console.log(`  [REPAIR ${f.scheduled_at.slice(0,10)} ${hlId}] ${dbHomeTeam} ${dbHome}-${dbAway} → ${srcHome}-${srcAway}`);
        if (WRITE) {
          const { error: updErr } = await supabase
            .from('fixtures')
            .update({
              home_score: srcHome,
              away_score: srcAway,
              updated_at: new Date().toISOString(),
            })
            .eq('id', f.id);
          if (updErr) {
            console.log(`    ✗ UPDATE failed: ${updErr.message}`);
            errors++;
            continue;
          }
        }
        repaired++;
      } else {
        console.log(`  [mismatch ${hlId}] DB=${dbHome}-${dbAway} HL=${srcHome}-${srcAway} — manual review`);
        errors++;
      }
    } catch (e) {
      console.log(`  [error ${hlId}] ${e.message}`);
      errors++;
    }
    await sleep(150); // rate limit
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log(`Repaired: ${repaired}`);
  console.log(`Already correct: ${unchanged}`);
  console.log(`Skipped (no score): ${skipped}`);
  console.log(`Errors / mismatches: ${errors}`);
  console.log('Completed at:', new Date().toISOString());
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
