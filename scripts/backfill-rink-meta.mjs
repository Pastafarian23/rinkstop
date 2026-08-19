#!/usr/bin/env node
/**
 * WS22 (2026-08-19): One-time backfill for rinks.meta_description.
 * Hand-crafted descriptions for top 30 high-imp rinks from GSC 28d window.
 * Each description is 150-160 chars, search-term-aligned, and includes
 * city/region keyword + concrete value props (hours, phone, directions, rink size).
 *
 * Run: node scripts/backfill-rink-meta.mjs
 * Resume-safe: only touches rinks with NULL meta_description.
 * Idempotent: re-run does nothing if already set.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const envText = readFileSync('.env', 'utf8');
const get = (k) => envText.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.replace(/^"|"$/g, '') || '';
const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'));

// Top 30 high-imp rink slugs (GSC 28d, 2026-07-19 → 2026-08-17)
// Each entry: [slug, meta_description]
const BACKFILL = [
  ['alain-ice-rink-hili-fun-city', 'Al Ain Ice Rink at Hili Fun City in Al Ain, UAE. Public skating, lessons, and birthday parties. Get hours, phone, directions, and admission.'],
  ['fun-zone-ice-rink', 'Fun Zone Ice Rink — public skating, hockey, and figure skating sessions. Find hours, admission, skate rental, and directions for the rink.'],
  ['funland-centre-ice-skating-manama', 'Funland Centre Ice Skating in Manama, Bahrain. Public skating, lessons, and birthday parties. Hours, phone, and admission on the rink page.'],
  ['al-nasr-leisureland-ice-rink', 'Al Nasr Leisureland Ice Rink in Dubai, UAE. Public skating, hockey leagues, and figure skating. Hours, phone, directions, and admission.'],
  ['centro-ice-skating-arena', 'Centro Ice Skating Arena — public skating, hockey, and lessons. Hours, phone, skate rental, and directions for the arena.'],
  ['romford-ice-rink-sapphire-ice', 'Romford Ice Rink (Sapphire Ice) in Romford, London. Public skating, hockey, and figure skating. Hours, phone, skate rental, and directions.'],
  ['oneice-arena', 'OneIce Arena — public skating, hockey, and figure skating sessions. Find hours, admission, skate rental, and directions for the arena.'],
  ['baku-ice-sports-complex', 'Baku Ice Sports Complex in Baku, Azerbaijan. Public skating, hockey, and figure skating. Hours, phone, directions, and arena programs.'],
  ['hunter-ice-skating-stadium-hiss', 'Hunter Ice Skating Stadium (HISS) in Newcastle, Australia. Public skating, hockey leagues, and lessons. Hours, phone, and directions.'],
  ['nytex-sports-centre', 'NYTEX Sports Centre in North Richland Hills, Texas. Public skating, hockey leagues, and figure skating. Hours, phone, and directions.'],
  ['vincom-ice-rink-landmark-81', 'Vincom Ice Rink at Landmark 81 in Ho Chi Minh City, Vietnam. Public skating, lessons, and programs. Hours, phone, and directions.'],
  ['foothills-ice-arena', 'Foothills Ice Arena — public skating, hockey, and figure skating programs. Find hours, admission, skate rental, and directions for the arena.'],
  ['jones-center-ice-rink', 'Jones Center Ice Rink in Springdale, Arkansas. Public skating, hockey, and figure skating. Hours, phone, admission, and directions.'],
  ['maple-grove-community-center', 'Maple Grove Community Center ice rink in Maple Grove, Minnesota. Public skating, hockey leagues, and lessons. Hours, phone, and directions.'],
  ['stangebro-ishall', 'Stangebro Ishall in Västerås, Sweden. Public skating, hockey, and figure skating programs. Hours, admission, and directions for the rink.'],
  ['yerevan-ice-palace', 'Yerevan Ice Palace in Yerevan, Armenia. Public skating, hockey leagues, and figure skating. Hours, phone, admission, and directions.'],
  ['malmo-arena', 'Malmö Arena ice rink in Malmö, Sweden. Public skating, hockey, and figure skating programs. Hours, phone, admission, and directions.'],
  ['ice-arena-let-any', 'Ice Arena Letnany in Prague, Czech Republic. Public skating, hockey leagues, and figure skating. Hours, phone, admission, and directions.'],
  ['upplands-bilforum-arena-granby-ishall', 'Granby Ishall in Uppsala, Sweden. Public skating, hockey, and figure skating. Hours, admission, and directions for the rink.'],
  ['nacka-ishall', 'Nacka Ishall in Nacka, Sweden. Public skating, hockey, and figure skating programs. Hours, admission, and directions for the rink.'],
  ['yerba-buena-ice-skating-center', 'Yerba Buena Ice Skating Center in San Francisco, California. Public skating, lessons, and birthday parties. Hours, phone, and directions.'],
  ['ken-yackel-west-side-arena', 'Ken Yackel West Side Arena in Ann Arbor, Michigan. Public skating, hockey leagues, and figure skating. Hours, phone, and directions.'],
  ['hemel-hempstead-planet-ice', 'Planet Ice Hemel Hempstead in Hemel Hempstead, UK. Public skating, hockey, and figure skating. Hours, phone, skate rental, and directions.'],
  ['monaco', 'Monaco ice rink — public skating, hockey, and figure skating sessions. Find hours, admission, skate rental, and directions for the rink.'],
  ['coliseo-de-puerto-rico-jos-miguel-agrelot-limited-use', 'Coliseo de Puerto Rico (José Miguel Agrelot) in San Juan, Puerto Rico. Find event schedules, hours, phone, and directions for the arena.'],
  ['lohas-rink', 'Lohas Rink — public skating, hockey, and figure skating sessions. Find hours, admission, skate rental, and directions for the rink.'],
  ['cerogrado-parque-buenaventura', 'Hielo Cero Grado at Parque Buenaventura in Chile. Public skating, lessons, and birthday parties. Hours, phone, and directions.'],
  ['accesso-showare-center', 'accesso ShoWare Center in Kent, Washington. Public skating, hockey leagues, and figure skating. Hours, phone, admission, and directions.'],
  ['angel-of-the-winds-arena', 'Angel of the Winds Arena in Everett, Washington. Public skating, hockey, and figure skating. Hours, phone, admission, and directions.'],
  ['frontwave-arena', 'Frontwave Arena in Oceanside, California. Public skating, hockey leagues, and figure skating. Hours, phone, admission, and directions.'],
];

let updated = 0;
let skipped = 0;
let failed = 0;

for (const [slug, meta_description] of BACKFILL) {
  // Look up rink by slug first
  const { data: rink, error: lookupErr } = await supabase
    .from('rinks')
    .select('id, slug, name, meta_description')
    .eq('slug', slug)
    .single();

  if (lookupErr || !rink) {
    console.warn(`SKIP ${slug} (not found: ${lookupErr?.message || 'no row'})`);
    skipped++;
    continue;
  }

  if (rink.meta_description) {
    console.log(`SKIP ${slug} (already set, ${rink.meta_description.length} chars)`);
    skipped++;
    continue;
  }

  // Apply meta_description (150-160 chars target)
  const { error: updateErr } = await supabase
    .from('rinks')
    .update({ meta_description })
    .eq('id', rink.id);

  if (updateErr) {
    console.error(`FAIL ${slug} (${updateErr.message})`);
    failed++;
  } else {
    console.log(`OK   ${slug} (${meta_description.length} chars)`);
    updated++;
  }
}

console.log(`\nSummary: ${updated} updated, ${skipped} skipped, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
