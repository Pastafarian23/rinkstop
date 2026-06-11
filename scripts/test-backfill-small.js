require('./load-secrets.cjs');
// Quick test: backfill 10 players to verify pipeline
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function toIsoDate(d) {
  if (!d) return null;
  const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return d;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
function toInches(h) {
  if (!h) return null;
  const m = String(h).match(/(\d+)'\s*(\d+)/);
  if (!m) return null;
  return parseInt(m[1]) * 12 + parseInt(m[2]);
}
function toLbs(w) {
  if (!w) return null;
  const m = String(w).match(/(\d+)/);
  if (!m) return null;
  return parseInt(m[1]);
}

async function fetchPlayer(id) {
  const res = await fetch(`https://nhl.highlightly.net/players/${id}`, {
    headers: {
      'x-rapidapi-key': process.env.HIGHLIGHTLY_API_KEY,
      'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com',
    },
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { data: await res.json() };
}

function mapPlayerToRow(apiRow) {
  const p = Array.isArray(apiRow) ? apiRow[0] : apiRow;
  if (!p || !p.id) return null;
  const profile = p.profile || {};
  const team = profile.team || {};
  const position = profile.position || {};
  const draft = profile.draft || {};
  const full = p.fullName || profile.fullName || '';
  const parts = full.trim().split(/\s+/);
  return {
    id: String(p.id),
    full_name: full || null,
    first_name: parts[0] || null,
    last_name: parts.length > 1 ? parts.slice(1).join(' ') : null,
    logo: p.logo || null,
    birth_date: toIsoDate(profile.birthDate),
    birth_country: profile.birthPlace ? (profile.birthPlace.split(',').pop() || '').trim() || null : null,
    nationality: profile.birthPlace ? (profile.birthPlace.split(',').pop() || '').trim() || null : null,
    height: toInches(profile.height),
    weight: toLbs(profile.weight),
    position: position.main || null,
    jersey_number: profile.jersey || null,
    draft_year: draft.year ?? null,
    draft_round: draft.round ?? null,
    draft_pick: draft.pick ?? null,
    current_team_id: team.id ? String(team.id) : null,
    updated_at: new Date().toISOString(),
  };
}

(async () => {
  // Get 10 player IDs (skip first 1952 since we already updated it)
  const { data: players } = await supabase
    .from('nhl_players')
    .select('id, full_name')
    .range(1, 10);
  console.log('Testing 10 players:', players.map(p => p.id).join(', '));

  let ok = 0, fail = 0;
  for (const p of players) {
    const r = await fetchPlayer(p.id);
    if (r.error) {
      console.log(`  ❌ ${p.id} ${p.full_name}: ${r.error}`);
      fail++;
      continue;
    }
    const row = mapPlayerToRow(r.data);
    const { error: upErr } = await supabase.from('nhl_players').upsert(row, { onConflict: 'id' });
    if (upErr) {
      console.log(`  ❌ ${p.id} ${p.full_name} UPSERT: ${upErr.message}`);
      fail++;
    } else {
      console.log(`  ✅ ${p.id} ${p.full_name} → pos=${row.position} team=${row.current_team_id} ht=${row.height}`);
      ok++;
    }
    await sleep(80);
  }
  console.log(`\nResult: ${ok} ok, ${fail} fail`);
})();
