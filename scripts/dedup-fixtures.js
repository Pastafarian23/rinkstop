/**
 * DEDUP FIXTURES — Remove duplicate rows per (scheduled_at + teams) group.
 * For each group, keep the row with the most complete data:
 *   1. Has both team_ids + non-null scores (completed game)
 *   2. Has both team_ids (scheduled/in-progress)
 *   3. Most recent created_at
 *
 * Run: node scripts/dedup-fixtures.js [--dry-run] [--league=nhl|whl|ohl|qmjhl|ahl|khl|pwhl]
 */
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');

const dryRun = process.argv.includes('--dry-run');
const leagueArg = process.argv.find(a => a.startsWith('--league='))?.split('=')[1];

// Score a row by data completeness — higher = better
function score(row) {
  let s = 0;
  if (row.home_team_id && row.away_team_id) s += 100;
  if (row.home_score !== null && row.away_score !== null) s += 50;
  if (row.status === 'completed') s += 10;
  if (row.status === 'in_progress') s += 5;
  if (row.status === 'scheduled') s += 1;
  // Use created_at as tiebreaker (more recent = higher)
  // Convert ISO to sortable string
  if (row.created_at) s += new Date(row.created_at).getTime() / 1e15;
  return s;
}

async function processLeague(league) {
  console.log(`\n=== ${league.slug} ===`);
  let rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, scheduled_at, home_team_id, away_team_id, game_data, status, home_score, away_score, created_at')
      .eq('league_id', league.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  Total: ${rows.length}`);

  // Group
  const groups = {};
  for (const f of rows) {
    let teamKey;
    if (f.home_team_id && f.away_team_id) {
      teamKey = `${f.home_team_id}|${f.away_team_id}`;
    } else {
      const h = f.game_data?.home_team?.abbrev || 'X';
      const a = f.game_data?.away_team?.abbrev || 'X';
      teamKey = `${a}@${h}`;
    }
    const key = `${f.scheduled_at}|${teamKey}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }

  // Find dupes and pick winners
  const idsToDelete = [];
  let dupGroups = 0;
  for (const [k, v] of Object.entries(groups)) {
    if (v.length === 1) continue;
    dupGroups++;
    // Sort by score descending
    v.sort((a, b) => score(b) - score(a));
    // Keep first, delete the rest
    for (let i = 1; i < v.length; i++) {
      idsToDelete.push(v[i].id);
    }
  }
  console.log(`  Dup groups: ${dupGroups}, IDs to delete: ${idsToDelete.length}`);

  if (dryRun || idsToDelete.length === 0) {
    if (dryRun) console.log(`  [DRY RUN — no changes]`);
    return 0;
  }

  // Delete in batches of 100
  let deleted = 0;
  for (let i = 0; i < idsToDelete.length; i += 100) {
    const batch = idsToDelete.slice(i, i + 100);
    const { error } = await supabase.from('fixtures').delete().in('id', batch);
    if (error) {
      console.error(`  FAIL batch ${i}-${i + batch.length}: ${error.message}`);
      break;
    }
    deleted += batch.length;
  }
  console.log(`  Deleted: ${deleted}`);
  return deleted;
}

async function main() {
  let leagues = [];
  if (leagueArg) {
    const { data: l } = await supabase.from('leagues').select('id, slug, name').eq('slug', leagueArg).single();
    if (!l) { console.error(`League ${leagueArg} not found`); return; }
    leagues = [l];
  } else {
    // Default: leagues known to have dupes
    const slugs = ['nhl', 'whl', 'ohl', 'qmjhl'];
    const { data } = await supabase.from('leagues').select('id, slug, name').in('slug', slugs);
    leagues = data || [];
  }

  let totalDeleted = 0;
  for (const l of leagues) {
    totalDeleted += await processLeague(l);
  }
  console.log(`\nTotal deleted: ${totalDeleted}`);
  if (dryRun) console.log('(DRY RUN)');
}

main().catch(err => { console.error(err); process.exit(1); });
