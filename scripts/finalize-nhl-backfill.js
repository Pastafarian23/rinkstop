require('./load-secrets.cjs');
/**
 * Final NHL backfill: 11 real games that passed the phantom check
 * but still need their team_id columns set. The phantom-check
 * (clean-broken-fixtures.js) confirmed they match NHL.com's schedule
 * on date+time+score, so they're real — we just need to look up
 * the team abbrev to get the Supabase team_id.
 *
 * Run: node scripts/finalize-nhl-backfill.js [--dry-run]
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SB_KEY);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const NHL_ABBREV_TO_TEAM_ID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84', BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668',
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4', CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237',
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', CGY: '626458da-d2d4-4a4f-816b-f3796b84cfc4',
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab', COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122',
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c', DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404',
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350', FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb',
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe',
  MTL: 'cff8bd78-5fee-49dc-b0ee-374722efd7b5', NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105',
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72', NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3', OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99', PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, scheduled_at, home_score, away_score')
    .eq('league_id', NHL_LEAGUE_ID)
    .or('home_team_id.is.null,away_team_id.is.null')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;

  console.log(`Remaining broken NHL fixtures: ${data.length}`);

  let updated = 0, unmatched = 0;
  for (const f of data) {
    const date = f.scheduled_at.slice(0, 10);
    const t = new Date(f.scheduled_at);
    const hh = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
    const score = `${f.home_score}-${f.away_score}`;

    const res = await fetch(`https://api-web.nhle.com/v1/score/${date}`);
    if (!res.ok) { unmatched++; continue; }
    const j = await res.json();
    let hit = null;
    for (const g of (j.games || [])) {
      const gt = new Date(g.startTimeUTC);
      const ghh = `${String(gt.getUTCHours()).padStart(2, '0')}:${String(gt.getUTCMinutes()).padStart(2, '0')}`;
      const gscore = `${g.homeTeam.score}-${g.awayTeam.score}`;
      if (ghh === hh && gscore === score) { hit = g; break; }
    }
    if (!hit) {
      console.log(`  ${date} ${hh} ${score}: not matched on NHL.com`);
      unmatched++;
      continue;
    }
    const hId = NHL_ABBREV_TO_TEAM_ID[hit.homeTeam.abbrev];
    const aId = NHL_ABBREV_TO_TEAM_ID[hit.awayTeam.abbrev];
    if (!hId || !aId) {
      console.log(`  ${date}: unknown abbrev ${hit.homeTeam.abbrev}/${hit.awayTeam.abbrev}`);
      unmatched++;
      continue;
    }
    if (!dryRun) {
      const { error: ue } = await supabase
        .from('fixtures')
        .update({ home_team_id: hId, away_team_id: aId, updated_at: new Date().toISOString() })
        .eq('id', f.id);
      if (ue) { console.error(`  FAIL ${f.id}: ${ue.message}`); unmatched++; continue; }
    }
    console.log(`  ${date} ${hh} ${score}: ${hit.awayTeam.abbrev} @ ${hit.homeTeam.abbrev}`);
    updated++;
  }

  console.log(`\nUpdated: ${updated}, Unmatched: ${unmatched}`);
  if (dryRun) console.log('(dry run — no changes written)');
}

main().catch(err => { console.error(err); process.exit(1); });
