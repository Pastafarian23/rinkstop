// Re-fetch the 5 rate-limited player IDs and upsert if we get data
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const KEY = process.env.HIGHLIGHTLY_API_KEY;
const STATE_FILE = '/tmp/nhl-player-backfill-state.json';

function toIsoDate(d) {
  if (!d) return null;
  const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return d;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
function toInches(h) { if (!h) return null; const m = String(h).match(/(\d+)'\s*(\d+)/); if (!m) return null; return parseInt(m[1]) * 12 + parseInt(m[2]); }
function toLbs(w) { if (!w) return null; const m = String(w).match(/(\d+)/); if (!m) return null; return parseInt(m[1]); }

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
    birth_place: profile.birthPlace || null,
    birth_country: profile.birthPlace ? (profile.birthPlace.split(',').pop() || '').trim() || null : null,
    nationality: profile.birthPlace ? (profile.birthPlace.split(',').pop() || '').trim() || null : null,
    height: toInches(profile.height),
    weight: toLbs(profile.weight),
    position: position.main || null,
    position_abbreviation: position.abbreviation || null,
    jersey_number: profile.jersey || null,
    is_active: profile.isActive ?? null,
    draft_year: draft.year ?? null,
    draft_round: draft.round ?? null,
    draft_pick: draft.pick ?? null,
    current_team_id: team.id ? String(team.id) : null,
    current_team_name: team.displayName || team.name || null,
    current_team_abbreviation: team.abbreviation || null,
    current_team_logo: team.logo || null,
    league_name: team.league || null,
    updated_at: new Date().toISOString(),
  };
}

async function fetchPlayer(id) {
  const res = await fetch(`https://nhl.highlightly.net/players/${id}`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  if (!res.ok) return { error: `HTTP ${res.status}`, rateLimited: res.status === 429 };
  const data = await res.json();
  return { data };
}

(async () => {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const ids = state.rateLimitedIds || [];
  console.log('Re-trying', ids.length, 'rate-limited players...\n');

  const results = [];
  for (const id of ids) {
    try {
      const r = await fetchPlayer(id);
      if (r.error) {
        console.log(`  ${id}: ERROR ${r.error}`);
        results.push({ id, status: r.error });
      } else if (!r.data || (Array.isArray(r.data) && r.data.length === 0)) {
        console.log(`  ${id}: EMPTY (no data from API)`);
        results.push({ id, status: 'empty' });
      } else {
        const row = mapPlayerToRow(r.data);
        if (!row) {
          console.log(`  ${id}: MAPPING FAILED`);
          results.push({ id, status: 'map_fail' });
        } else {
          const { error: upErr } = await supabase.from('nhl_players').upsert(row, { onConflict: 'id' });
          if (upErr) {
            console.log(`  ${id}: UPSERT ERROR ${upErr.message}`);
            results.push({ id, status: `upsert_error: ${upErr.message}` });
          } else {
            console.log(`  ${id}: OK — wrote ${row.full_name} | pos=${row.position_abbreviation} | j=${row.jersey_number} | team=${row.current_team_name} (${row.league_name})`);
            results.push({ id, status: 'ok', row });
            // Mark as done
            if (!state.doneIds.includes(id)) state.doneIds.push(id);
            state.rateLimitedIds = state.rateLimitedIds.filter(x => x !== id);
          }
        }
      }
    } catch (e) {
      console.log(`  ${id}: EXCEPTION ${e.message}`);
      results.push({ id, status: `exception: ${e.message}` });
    }
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log('\n=== Summary ===');
  const ok = results.filter(r => r.status === 'ok').length;
  const empty = results.filter(r => r.status === 'empty').length;
  const err = results.filter(r => r.status.startsWith('upsert_error') || r.status.startsWith('exception') || r.status.startsWith('map_fail') || r.status.startsWith('HTTP')).length;
  console.log(`  ok=${ok}, empty=${empty}, errors=${err}`);
  if (empty > 0) console.log(`  (Empty means API still returns no data for these IDs.)`);
})();
