import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function main() {
  // 1. Count total approved claims
  const { count: totalClaims } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  console.log('Total approved claims:', totalClaims);

  // 2. Count total rinks in DB
  const { count: totalRinks } = await supabase
    .from('rink_directory')
    .select('*', { count: 'exact', head: true });
  console.log('Total rinks in DB:', totalRinks);

  // 3. Find rinks that are NOT claimed (no approved claim for them)
  // First get all approved claim entity_ids where claim_type = 'rink'
  const { data: approvedRinkClaims } = await supabase
    .from('claims')
    .select('entity_id')
    .eq('status', 'approved')
    .eq('claim_type', 'rink');
  
  const claimedRinkIds = new Set((approvedRinkClaims || []).map(c => c.entity_id));
  console.log('Claimed rink IDs count:', claimedRinkIds.size);

  // 4. Get unclaimed rinks - sample 20
  const { data: allRinks } = await supabase
    .from('rink_directory')
    .select('id, name, city, country, website, status')
    .limit(100);

  const unclaimed = (allRinks || []).filter(r => !claimedRinkIds.has(r.id));
  console.log('Unclaimed rinks (first 100):', unclaimed.length);
  console.log('Sample unclaimed rinks:');
  unclaimed.slice(0, 20).forEach(r => {
    console.log(`  - ${r.name} | ${r.city}, ${r.country} | ${r.website || 'no website'}`);
  });
}

main().catch(console.error);
