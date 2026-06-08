// Phase 3: NCAA bio backfill from ESPN + cleanup
// Idempotent: re-runs are safe (UPDATE based on current state)

const fs = require('fs');
for (const line of fs.readFileSync('.env','utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const { createClient } = require('@supabase/supabase-js');
const pat = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json','utf8')).pat;
const ref = 'yszheonqyyskkjoxoexk';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const changes = JSON.parse(fs.readFileSync('/tmp/ncaa-espn-changeset.json','utf8'));
const benchIds = [35027357, 35027372, 75015347, 75015452, 75015332, 35024432, 35027312, 75015497, 75015527, 77062112, 77062217];
const dupeIds = [80137982, 80137457]; // keep 79131887 (Joona Vaisanen WMU) and 79134137 (Dakoda Rheaume-Mullen MICH)

async function run(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  const t = await r.text();
  if (r.status >= 400) {
    console.error('SQL failed status=' + r.status + ' body=' + t.slice(0, 500));
    return false;
  }
  return true;
}

async function buildBulkSQL() {
  // Build a single multi-row UPDATE...FROM (VALUES) for efficiency
  // For each change: update nhl_players set height=..., weight=..., birth_date=..., shoots_catches=..., source='espn' where id = ...
  // 885 rows is a lot; use CASE statement inside UPDATE for compactness
  const ids = changes.map(c => c.id);
  // Use temp approach: build a CASE-based UPDATE per column
  // Actually safer to do one UPDATE per row in a transaction OR use a single bulk SQL with VALUES
  // Use a single UPDATE with a VALUES list as a derived table
  
  // Build a VALUES list with explicit columns
  const vals = changes.map(c => {
    const height = c.height != null ? c.height : 'NULL::integer';
    const weight = c.weight != null ? c.weight : 'NULL::integer';
    const bday = c.birth_date ? `'${c.birth_date}'::date` : 'NULL::date';
    const hand = c.shoots_catches ? `'${c.shoots_catches}'` : 'NULL::text';
    return `(${c.id}, ${height}, ${weight}, ${bday}, ${hand})`;
  }).join(',\n');
  
  return `
WITH bio_updates(id, h, w, b, hand) AS (
  VALUES
${vals}
)
UPDATE nhl_players p
SET
  height = COALESCE(bio_updates.h, p.height),
  weight = COALESCE(bio_updates.w, p.weight),
  birth_date = COALESCE(bio_updates.b, p.birth_date),
  shoots = COALESCE(bio_updates.hand, p.shoots),
  source = 'espn',
  updated_at = now()
FROM bio_updates
WHERE p.id = bio_updates.id
  AND p.league_name = 'NCAA';
`.trim();
}

(async () => {
  // Step 1: bulk bio update
  console.log('=== STEP 1: Bio backfill (885 rows from ESPN) ===');
  const sql1 = await buildBulkSQL();
  fs.writeFileSync('sql/phase3-bio-update.sql', sql1);
  const r1 = await run(sql1);
  console.log('Bio update:', r1 ? 'OK' : 'FAILED');
  if (!r1) process.exit(1);
  
  // Step 2: bench cleanup
  console.log('\\n=== STEP 2: Bench placeholder cleanup (11 rows) ===');
  const sql2 = `UPDATE nhl_players SET is_active = false, updated_at = now() WHERE id IN (${benchIds.join(',')}) AND league_name = 'NCAA';`;
  fs.writeFileSync('sql/phase3-bench-cleanup.sql', sql2);
  const r2 = await run(sql2);
  console.log('Bench cleanup:', r2 ? 'OK' : 'FAILED');
  
  // Step 3: dupe cleanup
  console.log('\\n=== STEP 3: Dupe cleanup (4 rows from 2 groups) ===');
  const sql3 = `UPDATE nhl_players SET is_active = false, updated_at = now() WHERE id IN (${dupeIds.join(',')}) AND league_name = 'NCAA';`;
  fs.writeFileSync('sql/phase3-dupe-cleanup.sql', sql3);
  const r3 = await run(sql3);
  console.log('Dupe cleanup:', r3 ? 'OK' : 'FAILED');
  
  // Step 4: verification
  console.log('\\n=== STEP 4: POST-VERIFICATION ===');
  
  const benchLeft = await s.from('nhl_players').select('id,full_name,is_active').eq('league_name','NCAA').like('full_name','%Bench%');
  console.log('Bench rows still active:', (benchLeft.data||[]).filter(r => r.is_active === true).length);
  console.log('Bench rows total:', (benchLeft.data||[]).length);
  
  const dupesLeft = await s.from('nhl_players').select('id,full_name,current_team_abbreviation,is_active').eq('league_name','NCAA').in('id', dupeIds);
  console.log('Dupe rows still active:', (dupesLeft.data||[]).filter(r => r.is_active === true).length);
  
  // Bio coverage
  let all = [];
  let from = 0;
  while (true) {
    const r = await s.from('nhl_players').select('id,full_name,height,weight,birth_date,shoots_catches,source,is_active,league_name,current_team_abbreviation,position_abbreviation,jersey_number').eq('league_name','NCAA').range(from, from+999);
    if (!r.data?.length) break;
    all = all.concat(r.data);
    if (r.data.length < 1000) break;
    from += 1000;
  }
  const active = all.filter(p => p.is_active === true);
  const inactive = all.filter(p => p.is_active === false);
  console.log('\\n=== NCAA POST-PHASE-3 STATE ===');
  console.log('Total rows:', all.length);
  console.log('  active:', active.length);
  console.log('  inactive:', inactive.length);
  console.log('\\n=== BIO COVERAGE (active only) ===');
  console.log('  height:', active.filter(p => p.height != null).length, '/', active.length);
  console.log('  weight:', active.filter(p => p.weight != null).length, '/', active.length);
  console.log('  birth_date:', active.filter(p => p.birth_date != null).length, '/', active.length);
  console.log('  shoots_catches:', active.filter(p => p.shoots_catches != null).length, '/', active.length);
  console.log('  position:', active.filter(p => p.position_abbreviation != null).length, '/', active.length);
  console.log('  jersey:', active.filter(p => p.jersey_number != null).length, '/', active.length);
  console.log('\\n=== SOURCE DISTRIBUTION (active) ===');
  const src = {};
  for (const p of active) src[p.source||'null'] = (src[p.source||'null']||0)+1;
  for (const k of Object.keys(src)) console.log('  ' + k + ':', src[k]);
  
  // Sample 5 updated rows
  console.log('\\n=== SAMPLE 5 ACTIVE WITH FULL BIOS ===');
  const withBios = active.filter(p => p.height && p.weight && p.birth_date).slice(0, 5);
  for (const p of withBios) {
    console.log('  ' + p.id + '  ' + p.full_name + '  ' + (p.current_team_abbreviation||'-') + '  h=' + p.height + ' w=' + p.weight + ' bday=' + (p.birth_date||'-') + ' hand=' + (p.shoots_catches||'-') + ' src=' + p.source);
  }
})();
