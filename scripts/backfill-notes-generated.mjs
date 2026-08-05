import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('missing env');
  process.exit(1);
}
const supabase = createClient(URL, KEY);

function buildRinkBlurb(rink) {
  const name = (rink.name || '').trim();
  if (!name) return null;
  const city = (rink.city || '').trim();
  const country = (rink.country || '').trim();
  const parts = [];
  parts.push(`${name} is an ice rink in ${city || 'the area'}${country ? ', ' + country : ''}.`);
  if (rink.capacity && rink.capacity > 1000) {
    parts.push(`The arena seats ${Number(rink.capacity).toLocaleString()} spectators, making it one of the larger hockey venues in the region${city ? ' and a fixture of the ' + city + ' sports scene' : ''}.`);
  } else if (rink.capacity) {
    parts.push(`With a ${Number(rink.capacity).toLocaleString()}-seat capacity, ${name} is an intimate community rink that hosts local hockey, figure skating, and public skate sessions.`);
  }
  if (rink.league) parts.push(`It serves as a home venue for ${rink.league} competition.`);
  if (rink.ice_size === 'NHL') {
    parts.push('The rink is built to NHL dimensions and regularly hosts professional, junior, and high-level amateur hockey.');
  } else if (rink.ice_size === 'Olympic') {
    parts.push('The rink meets Olympic (IIHF) dimensions and is suitable for international competition and high-performance training.');
  } else if (rink.ice_size) {
    parts.push(`The facility uses a ${rink.ice_size} ice surface, which is the standard for most ${country ? country + ' ' : ''}hockey programs.`);
  }
  parts.push(`${name} serves as a home venue for local hockey teams and as a programming hub for learn-to-skate, learn-to-play, youth leagues, and adult recreational hockey.`);
  return parts.join(' ');
}

const BATCH = 100;
let totalUpdated = 0;
let totalSkipped = 0;
let errors = 0;
let emptyBatches = 0;

while (true) {
  const { data: rinks, error } = await supabase
    .from('rinks')
    .select('id, name, city, country, notes, capacity, ice_size, league, notes_generated')
    .is('notes_generated', null)
    .limit(BATCH);

  if (error) { console.error('Fetch error:', error.message); errors++; break; }
  if (!rinks || rinks.length === 0) break;

  emptyBatches = rinks.length === 0 ? emptyBatches + 1 : 0;

  const updates = [];
  for (const r of rinks) {
    const blurb = buildRinkBlurb(r);
    if (blurb) updates.push({ id: r.id, notes_generated: blurb });
  }
  totalSkipped += rinks.length - updates.length;

  if (updates.length > 0) {
    for (const u of updates) {
      const { error: upError } = await supabase.from('rinks').update({ notes_generated: u.notes_generated }).eq('id', u.id);
      if (upError) { console.error('Update error:', upError.message, 'id=', u.id); errors++; break; }
      totalUpdated += 1;
    }
  }

  console.log(`batch updated ${updates.length} skipped ${rinks.length - updates.length} total ${totalUpdated}`);
  if (errors > 0) break;
}
console.log(`DONE updated=${totalUpdated} skipped=${totalSkipped} errors=${errors}`);
