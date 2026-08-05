// WS16 Tier 1B — backfill notes_generated from buildRinkBlurb template
// Idempotent: only populates WHERE notes_generated IS NULL
// Originals in `notes` are NEVER touched
// Run: npx tsx scripts/backfill-notes-generated.mjs --dry-run
//      npx tsx scripts/backfill-notes-generated.mjs

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function buildRinkBlurb(rink) {
  if (rink.notes && rink.notes.trim().length > 100) return rink.notes.trim();
  const parts = [];
  parts.push(`${rink.name} is an ice rink in ${rink.city || 'the area'}${rink.country ? ', ' + rink.country : ''}.`);
  if (rink.capacity && rink.capacity > 1000) {
    parts.push(`The arena seats ${rink.capacity.toLocaleString()} spectators, making it one of the larger hockey venues in the region${rink.city ? ' and a fixture of the ' + rink.city + ' sports scene' : ''}.`);
  } else if (rink.capacity) {
    parts.push(`With a ${rink.capacity.toLocaleString()}-seat capacity, ${rink.name} is an intimate community rink that hosts local hockey, figure skating, and public skate sessions.`);
  }
  if (rink.league) parts.push(`It serves as a home venue for ${rink.league} competition.`);
  if (rink.ice_size === 'NHL') {
    parts.push('The rink is built to NHL dimensions and regularly hosts professional, junior, and high-level amateur hockey.');
  } else if (rink.ice_size === 'Olympic') {
    parts.push('The rink meets Olympic (IIHF) dimensions and is suitable for international competition and high-performance training.');
  } else if (rink.ice_size) {
    parts.push(`The facility uses a ${rink.ice_size} ice surface, which is the standard for most ${rink.country ? rink.country + ' ' : ''}hockey programs.`);
  }
  parts.push(`${rink.name} serves as a home venue for local hockey teams and as a programming hub for learn-to-skate, learn-to-play, youth leagues, and adult recreational hockey.`);
  return parts.join(' ');
}

const isDryRun = process.argv.includes('--dry-run');
const BATCH_SIZE = 500;

async function backfill() {
  let offset = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const { data: rinks, error } = await supabase
      .from('rinks')
      .select('id, name, city, country, notes, capacity, ice_size, league, notes_generated')
      .eq('status', 'approved')
      .is('notes_generated', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) { console.error('Fetch error:', error); process.exit(1); }
    if (!rinks || rinks.length === 0) break;

    if (isDryRun) {
      for (const r of rinks) {
        const blurb = buildRinkBlurb(r);
        console.log(`  ${r.id}: "${r.name}" → ${blurb.substring(0, 60)}...`);
        totalUpdated++;
      }
    } else {
      const updates = rinks.map(r => ({
        id: r.id,
        notes_generated: buildRinkBlurb(r),
      }));
      const { error: updateError } = await supabase.from('rinks').upsert(updates, { onConflict: 'id' });
      if (updateError) { console.error('Update error:', updateError); process.exit(1); }
      totalUpdated += updates.length;
    }

    totalSkipped += rinks.length;
    offset += BATCH_SIZE;
    console.log(`  Processed ${totalSkipped}...`);
  }

  const verb = isDryRun ? 'would update' : 'updated';
  console.log(`\nDone. ${totalUpdated} rinks ${verb}.`);
}

backfill().catch(e => { console.error(e); process.exit(1); });
