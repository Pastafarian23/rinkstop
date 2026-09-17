#!/usr/bin/env node
/**
 * Backfill missing international teams into the `teams` table.
 *
 * Per Arnel directive (2026-09-17): "Proceed" with INSERT-only backfill.
 * Option (b): INSERT missing teams, skip wrong-league UPDATEs.
 *
 * Reads every HL game from the past N days, extracts unique team
 * displayNames, and INSERTs any not already in `teams`. League mapping
 * comes from the fixture's league_id.
 *
 * Modes:
 *   node scripts/_backfill-intl-teams.cjs                    # default: dry-run, prints diff
 *   node scripts/_backfill-intl-teams.cjs --apply           # actually INSERT
 *   node scripts/_backfill-intl-teams.cjs --days=30         # lookback window (default 30)
 *   node scripts/_backfill-intl-teams.cjs --leagues=khl,shl  # restrict to specific leagues
 *
 * Slug strategy:
 *   - Lowercase
 *   - Hyphens for spaces
 *   - Strip non-ASCII (transliterate Russian: Салават → salavat)
 *   - Strip punctuation except hyphens
 *   - Collapse multiple hyphens
 *   - Append -2, -3 etc if slug collides
 *
 * tri_code stays NULL (HL doesn't expose it; only NHL needs it).
 *
 * Reversible: every INSERT logs team name + id; DELETE by name restores state.
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const APPLY = !!args.apply;
const DAYS = parseInt(String(args.days ?? '30'), 10);
const FILTER_LEAGUES = args.leagues ? String(args.leagues).split(',') : null;

// International league_ids (verified 2026-09-17 against /leagues)
const INTL_LEAGUE_IDS = [
  '69d4de0c-b072-4f52-8950-eb728acdc7f9', // SHL
  '03e919d1-2180-443b-aba4-6719d25d2eff', // DEL
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752', // KHL
  'e052d66a-6f63-42da-94fc-25a809203c2f', // MHL
  '30fef7f6-0054-4605-83b7-ec619b72f328', // VHL
  'dead3e40-9f79-4488-a50b-755eb9a8cee0', // SPHL
  'dc212fdb-98bd-4fd5-842c-598ba34565b5', // Liiga
];

// Cyrillic-to-Latin transliteration map (common Russian club name parts)
const TRANSLIT = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};
function transliterate(s) {
  return s.toLowerCase().split('').map(c => TRANSLIT[c] ?? c).join('');
}

function slugify(name) {
  let s = transliterate(name);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip accents
  s = s.replace(/[^a-z0-9\s-]/g, ' ');                       // non-alphanumeric → space
  s = s.replace(/\s+/g, '-').toLowerCase();                  // spaces → hyphens
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');           // collapse + trim hyphens
  return s || 'team';
}

async function allRows(builder) {
  // Single .limit() call works with .in() filters; avoid .range() pagination
  const { data } = await builder.limit(50000);
  return data || [];
}

async function main() {
  console.log('=== Backfill missing international teams ===');
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Lookback: ${DAYS} days`);
  console.log();

  // 1. Read HL games from past N days
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const until = new Date(Date.now() + DAYS * 86400000).toISOString();
  const allFixtures = await allRows(sb.from('fixtures')
    .select('id, league_id, game_data, scheduled_at')
    .in('league_id', INTL_LEAGUE_IDS)
    .gte('scheduled_at', since)
    .lte('scheduled_at', until));
  console.log(`Fixtures in window: ${allFixtures.length}`);

  // 2. Extract unique (teamName, league_id) pairs
  const teamByName = new Map();  // name → { league_id, fixture_count }
  for (const f of allFixtures) {
    const d = f.game_data || {};
    const lid = f.league_id;
    if (FILTER_LEAGUES && d.hl_league_name && !FILTER_LEAGUES.includes(d.hl_league_name)) continue;
    for (const side of ['home_team_name', 'away_team_name']) {
      const name = d[side];
      if (!name) continue;
      const key = name;
      if (!teamByName.has(key)) teamByName.set(key, { league_id: lid, league_name: d.hl_league_name, count: 0 });
      teamByName.get(key).count++;
    }
  }
  console.log(`Unique team names from HL: ${teamByName.size}`);

  // 3. Check which are already in `teams` — load ALL teams (not limited)
  async function fetchAllTeams() {
  const all = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await sb.from('teams').select('id, name, league_id').range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

const existing = await fetchAllTeams();
  console.log(`Existing teams in DB: ${existing.length}`);

  // Build exact match map + fuzzy lookup per league
  const existingByName = new Map();
  const existingByLeague = new Map(); // league_id -> array of {name, id}
  for (const t of existing) {
    const lower = (t.name || '').toLowerCase().trim();
    if (!existingByName.has(lower)) existingByName.set(lower, t);
    if (!existingByLeague.has(t.league_id)) existingByLeague.set(t.league_id, []);
    existingByLeague.get(t.league_id).push({ name: t.name, id: t.id });
  }

  // 4. Build list of teams to INSERT (not already in DB by name, with fuzzy match)
  const toInsert = [];
  const alreadyThere = [];
  for (const [name, info] of teamByName.entries()) {
    const lower = name.toLowerCase().trim();
    if (existingByName.has(lower)) {
      alreadyThere.push({ name, existing: existingByName.get(lower), info });
      continue;
    }
    // Fuzzy: check if HL name is contained in any existing team in same league
    let fuzzyMatch = null;
    const leagueTeams = existingByLeague.get(info.league_id) || [];
    for (const t of leagueTeams) {
      if (t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase())) {
        fuzzyMatch = t;
        break;
      }
    }
    if (fuzzyMatch) {
      alreadyThere.push({ name, existing: fuzzyMatch, info, fuzzy: true });
    } else {
      toInsert.push({ name, league_id: info.league_id, league_name: info.league_name, count: info.count });
    }
  }
  console.log(`Already in DB (exact + fuzzy): ${alreadyThere.length}, Need INSERT: ${toInsert.length}`);
  console.log();

  if (toInsert.length === 0) {
    console.log('Nothing to insert. Done.');
    process.exit(0);
  }

  // 5. Group by league for the report
  const byLeague = new Map();
  for (const t of toInsert) {
    const key = t.league_name || t.league_id;
    if (!byLeague.has(key)) byLeague.set(key, []);
    byLeague.get(key).push(t);
  }

  console.log('=== TEAMS TO INSERT (per league) ===');
  for (const [leagueName, teams] of byLeague.entries()) {
    console.log(`\n${leagueName} (${teams.length}):`);
    teams.sort((a, b) => b.count - a.count);
    for (const t of teams) {
      const slug = slugify(t.name);
      const flag = slug.length < 4 ? '⚠️  SHORT SLUG' : '';
      console.log(`  ${slug.padEnd(40)} ← "${t.name}" (${t.count} games)${flag}`);
    }
  }

  // 6. Execute INSERTs (or just report)
  if (!APPLY) {
    console.log('\n=== DRY RUN — no INSERTs performed. Run with --apply to commit. ===');
    process.exit(0);
  }

  console.log('\n=== APPLY MODE — inserting... ===');
  
  // Pre-load all existing slugs for collision avoidance
  const { data: existingSlugs } = await sb.from('teams').select('slug');
  const slugSet = new Set(existingSlugs?.map(t => t.slug) || []);

  let inserted = 0, skipped = 0;
  for (const t of toInsert) {
    let slug = slugify(t.name);
    // Avoid slug collision
    let n = 2;
    while (slugSet.has(slug)) {
      slug = slugify(t.name) + '-' + n;
      n++;
    }
    slugSet.add(slug);

    const row = {
      name: t.name,
      slug,
      league_id: t.league_id,
      is_active: true,
      claimable: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb.from('teams').insert(row).select('id').single();
    if (error) {
      console.log(`  ✗ ${t.name}: ${error.message}`);
      skipped++;
    } else {
      console.log(`  ✓ ${t.name} → ${data.id}`);
      inserted++;
    }
  }
  console.log(`\nInserted: ${inserted}, Skipped (errors): ${skipped}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });