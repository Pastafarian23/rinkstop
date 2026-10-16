/**
 * DEDUP FIXTURES (ALL LEAGUES) — Remove duplicate rows per natural key.
 * Group key: (league_id, scheduled_at, home_team_id, away_team_id)
 *   For rows with NULL team_ids, fall back to (league_id, scheduled_at, game_data abbrev pair)
 *
 * Per group, keep the row with the most complete data:
 *   1. Has both team_ids + non-null scores (completed game) — +150
 *   2. Has both team_ids — +100
 *   3. Status priority: completed > in_progress > scheduled — +1..10
 *   4. Most recent created_at (tiebreaker)
 *
 * Idempotent: re-running is safe. Run as needed; safe to schedule after every sync.
 *
 * Usage:
 *   node scripts/dedup-fixtures-all-leagues.js            (dry run, default)
 *   node scripts/dedup-fixtures-all-leagues.js --execute  (delete dupes)
 *   node scripts/dedup-fixtures-all-leagues.js --execute --league=nhl  (one league)
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const cfg = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) cfg[m[1]] = m[2];
}
const sb = createClient(cfg.NEXT_PUBLIC_SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY);

const execute = process.argv.includes('--execute');
const leagueArg = process.argv.find(a => a.startsWith('--league='))?.split('=')[1];

// Score a row by data completeness — higher = better
function score(r) {
  let s = 0;
  if (r.home_team_id && r.away_team_id) s += 100;
  if (r.home_score !== null && r.away_score !== null) s += 50;
  if (r.status === 'completed') s += 10;
  if (r.status === 'in_progress') s += 5;
  if (r.status === 'scheduled') s += 1;
  if (r.created_at) s += new Date(r.created_at).getTime() / 1e15;
  return s;
}

function rowKey(r) {
  if (r.home_team_id && r.away_team_id) {
    return `${r.scheduled_at}|${r.home_team_id}|${r.away_team_id}`;
  }
  const h = r.game_data?.home_team?.abbrev || r.game_data?.homeTeam?.abbrev || 'X';
  const a = r.game_data?.away_team?.abbrev || r.game_data?.awayTeam?.abbrev || 'X';
  return `${r.scheduled_at}|${a}@${h}`;
}

async function processLeague(lg) {
  let rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from('fixtures')
      .select('id, scheduled_at, home_team_id, away_team_id, game_data, status, home_score, away_score, created_at, league_id')
      .eq('league_id', lg.id)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  if (rows.length === 0) return { slug: lg.slug, rows: 0, groups: 0, dupes: 0, deletes: 0 };

  const groups = {};
  for (const r of rows) {
    (groups[rowKey(r)] = groups[rowKey(r)] || []).push(r);
  }

  const idsToDelete = [];
  const auditEntries = [];   // 2026-10-16 Part 1.6 (Arnel 01:16): for each delete,
                              // record (deleted_row, survivor_row, rule, revert_sql).
  let dupeGroups = 0;
  for (const v of Object.values(groups)) {
    if (v.length === 1) continue;
    dupeGroups++;
    v.sort((a, b) => score(b) - score(a));
    const survivor = v[0];
    for (let i = 1; i < v.length; i++) {
      const deleted = v[i];
      idsToDelete.push(deleted.id);
      auditEntries.push({
        deleted_id: deleted.id,
        deleted_row: deleted,
        survivor_id: survivor.id,
        survivor_row: survivor,
        rule: 'keep_highest_score; latest_created_at_as_tiebreaker',
        revert_sql: buildRevertSql(deleted),
      });
    }
  }

  return {
    slug: lg.slug,
    rows: rows.length,
    groups: Object.keys(groups).length,
    dupes: dupeGroups,
    deletes: idsToDelete.length,
    _ids: idsToDelete,
    _audit: auditEntries,
  };
}

// 2026-10-16 Part 1.6: generate a parameterized INSERT statement that re-creates
// the deleted row from the JSONB snapshot. This is the revert payload.
function buildRevertSql(row) {
  function lit(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    return 'NULL';
  }
  const cols = ['id','league_id','scheduled_at','home_team_id','away_team_id',
    'venue_id','home_score','away_score','status','season'];
  const vals = cols.map(c => lit(row[c] ?? null)).join(', ');
  return `INSERT INTO public.fixtures (${cols.join(', ')}) VALUES (${vals});`;
}

async function main() {
  let leagues;
  if (leagueArg) {
    const { data } = await sb.from('leagues').select('id, slug, name').eq('slug', leagueArg).maybeSingle();
    if (!data) { console.error(`League not found: ${leagueArg}`); return; }
    leagues = [data];
  } else {
    const { data } = await sb.from('leagues').select('id, slug, name');
    leagues = data || [];
  }
  console.log(`Processing ${leagues.length} league(s)${execute ? ' [EXECUTE]' : ' [DRY RUN]'}\n`);

  const summary = [];
  let totalIds = [];
  for (const lg of leagues) {
    const s = await processLeague(lg);
    if (s._ids) totalIds.push(...s._ids);
    summary.push(s);
  }

  const active = summary.filter(s => s.rows > 0);
  console.log('Per-league summary:');
  console.table(active.map(({ slug, rows, groups, dupes, deletes }) => ({ slug, rows, groups, dupes, deletes })));
  const totalRows = active.reduce((a, s) => a + s.rows, 0);
  const totalGroups = active.reduce((a, s) => a + s.groups, 0);
  const totalDupes = active.reduce((a, s) => a + s.dupes, 0);
  const totalDeletes = active.reduce((a, s) => a + s.deletes, 0);
  console.log(`\nTotals: rows=${totalRows}, distinct matchups=${totalGroups}, dupe groups=${totalDupes}, IDs to delete=${totalDeletes}`);

  if (execute && totalIds.length) {
    // 2026-10-16 Part 1.6: write audit entries BEFORE the delete so even a
    // crash mid-delete leaves the audit trail intact.
    const { randomUUID } = require('crypto');
    const runId = randomUUID();
    const allAudit = summary.flatMap(s => (s._audit || []).map(a => ({ ...a, league_slug: s.slug, run_id: runId })));
    console.log(`\nWriting ${allAudit.length} audit rows to public.fixture_dedup_audit (run_id=${runId})…`);
    let auditWritten = 0;
    for (let i = 0; i < allAudit.length; i += 500) {
      const batch = allAudit.slice(i, i + 500);
      const { error, count } = await sb
        .from('fixture_dedup_audit')
        .insert(batch, { count: 'exact' });
      if (error) {
        console.error(`  Audit batch ${i/500} failed:`, error.message);
        console.error('  ABORTING delete to avoid unrecoverable loss. Fix the audit table and re-run.');
        return;
      }
      auditWritten += count ?? batch.length;
    }
    console.log(`  ${auditWritten} audit rows written.`);

    console.log(`\nDeleting ${totalIds.length} duplicate rows in batches of 500…`);
    let deleted = 0;
    for (let i = 0; i < totalIds.length; i += 500) {
      const batch = totalIds.slice(i, i + 500);
      const { error, count } = await sb
        .from('fixtures')
        .delete({ count: 'exact' })
        .in('id', batch);
      if (error) { console.error(`  Batch ${i/500} failed:`, error.message); continue; }
      deleted += count ?? batch.length;
      console.log(`  Deleted ${deleted}/${totalIds.length}`);
    }
    console.log(`Done. ${deleted} rows deleted. Audit run_id: ${runId}`);
    // Print revert path so it's easy to find later
    const revertFile = `/tmp/dedup-revert-${runId}.sql`;
    const revertSql = allAudit.map(a => `-- league=${a.league_slug} deleted=${a.deleted_id} survivor=${a.survivor_id}\n${a.revert_sql}`).join('\n\n');
    fs.writeFileSync(revertFile, revertSql);
    console.log(`Revert SQL written to ${revertFile}`);
  } else if (!execute) {
    console.log('\n[DRY RUN] Re-run with --execute to delete.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
