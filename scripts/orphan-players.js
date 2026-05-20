const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');

async function audit() {
  const { data: orphans } = await supabase.from('players').select('id, first_name, last_name, position, nationality, height_cm, weight_kg, is_active, headshot_url').is('team_id', null);
  console.log('Total orphaned: ' + orphans.length);

  const byPos = {};
  for (const p of orphans) {
    byPos[p.position] = (byPos[p.position] || 0) + 1;
  }
  console.log('\nBy position:');
  const sorted = Object.entries(byPos).sort(function(a, b) { return b[1] - a[1]; });
  for (const pair of sorted) console.log('  ' + pair[0] + ': ' + pair[1]);

  const active = orphans.filter(function(p) { return p.is_active; }).length;
  console.log('\nActive: ' + active + ' | Inactive: ' + (orphans.length - active));

  const withHeight = orphans.filter(function(p) { return p.height_cm; }).length;
  const withHeadshot = orphans.filter(function(p) { return p.headshot_url; }).length;
  console.log('With height data: ' + withHeight + ' | With headshot: ' + withHeadshot);

  // Sample 30 orphans with height (likely active recent players)
  const withHt = orphans.filter(function(p) { return p.height_cm; });
  console.log('\nSample 30 orphaned players WITH height data:');
  for (const p of withHt.slice(0, 30)) {
    console.log('  ' + p.first_name + ' ' + p.last_name + ' | ' + p.position + ' | ' + (p.nationality || 'n/a') + ' | ht=' + p.height_cm + 'cm wt=' + p.weight_kg + 'kg | active=' + p.is_active);
  }

  // Show top nationalities
  const byNat = {};
  for (const p of orphans) {
    const n = p.nationality || 'unknown';
    byNat[n] = (byNat[n] || 0) + 1;
  }
  console.log('\nBy nationality:');
  const natSorted = Object.entries(byNat).sort(function(a, b) { return b[1] - a[1]; });
  for (const pair of natSorted.slice(0, 15)) console.log('  ' + pair[0] + ': ' + pair[1]);
}
audit().catch(console.error);