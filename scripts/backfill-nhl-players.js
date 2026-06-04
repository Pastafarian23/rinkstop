// Backfill nhl_players table with bio data from Highlightly /players/{id}
// Runs in batches with rate-limiting + resume support
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STATE_FILE = '/tmp/nhl-player-backfill-state.json';
const DELAY_BETWEEN_CALLS_MS = 60;
const BATCH_SIZE = 5;
const PROGRESS_EVERY = 100;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function log(...args) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);
}

async function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { doneIds: [], failedIds: [], lastUpdate: null };
}

async function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function fetchPlayer(id) {
  const url = `https://nhl.highlightly.net/players/${id}`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': process.env.HIGHLIGHTLY_API_KEY,
      'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com',
    },
  });
  if (!res.ok) {
    if (res.status === 429) {
      log('  429 RATE LIMITED - backing off 60s');
      await sleep(60000);
      return fetchPlayer(id);
    }
    return { error: `HTTP ${res.status}` };
  }
  return { data: await res.json() };
}

// Convert "05.03.1977" to "1977-03-05" (ISO)
function toIsoDate(d) {
  if (!d) return null;
  const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return d;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Convert "6' 1\"" to 73 (inches), or "6'1" to 73
function toInches(h) {
  if (!h) return null;
  const m = String(h).match(/(\d+)'\s*(\d+)/);
  if (!m) return null;
  return parseInt(m[1]) * 12 + parseInt(m[2]);
}

// Convert "195 lbs" to 195
function toLbs(w) {
  if (!w) return null;
  const m = String(w).match(/(\d+)/);
  if (!m) return null;
  return parseInt(m[1]);
}

function mapPlayerToRow(apiRow) {
  const p = Array.isArray(apiRow) ? apiRow[0] : apiRow;
  if (!p || !p.id) return null;

  const profile = p.profile || {};
  const team = profile.team || {};
  const position = profile.position || {};
  const draft = profile.draft || {};

  // Split fullName into first/last
  const full = p.fullName || profile.fullName || '';
  const parts = full.trim().split(/\s+/);
  const firstName = parts[0] || null;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;

  return {
    id: String(p.id),
    full_name: full || null,
    first_name: firstName,
    last_name: lastName,
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

async function getAllPlayerIds() {
  const allIds = [];
  let from = 0;
  const batch = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('nhl_players')
      .select('id')
      .range(from, from + batch - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) allIds.push(String(r.id));
    if (data.length < batch) break;
    from += batch;
  }
  return allIds;
}

(async () => {
  log('=== NHL Players Backfill ===');
  const allIds = await getAllPlayerIds();
  log(`Total players in DB: ${allIds.length}`);

  const state = await loadState();
  const doneSet = new Set(state.doneIds);
  const failedSet = new Set(state.failedIds);
  const remaining = allIds.filter(id => !doneSet.has(id) && !failedSet.has(id));
  log(`Already done: ${doneSet.size}, Previously failed: ${failedSet.size}, Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    log('Nothing to do. Exiting.');
    return;
  }

  let processed = 0;
  let ok = 0;
  let failed = 0;
  const startTime = Date.now();
  let rateLimitRemaining = null;

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (id) => {
      try {
        const r = await fetchPlayer(id);
        if (r.error) return { id, error: r.error };
        return { id, data: r.data };
      } catch (e) {
        return { id, error: e.message };
      }
    }));

    const rows = results
      .filter(r => r.data && !r.error)
      .map(r => mapPlayerToRow(r.data))
      .filter(Boolean);

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('nhl_players')
        .upsert(rows, { onConflict: 'id' });
      if (upsertErr) {
        log('  UPSERT ERROR:', upsertErr.message);
        for (const r of results) failedSet.add(r.id);
        failed += results.length;
      } else {
        for (const r of results) {
          if (r.error) {
            failedSet.add(r.id);
            failed++;
          } else {
            doneSet.add(r.id);
            ok++;
          }
        }
      }
    } else {
      for (const r of results) {
        failedSet.add(r.id);
        failed++;
      }
    }

    processed += batch.length;

    if (processed % PROGRESS_EVERY === 0 || i + BATCH_SIZE >= remaining.length) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const eta = (remaining.length - processed) / rate;
      log(`Progress: ${processed}/${remaining.length} (${(processed/remaining.length*100).toFixed(1)}%) | ok=${ok} fail=${failed} | ${rate.toFixed(1)}/s | ETA: ${(eta/60).toFixed(1)} min`);
      state.doneIds = Array.from(doneSet);
      state.failedIds = Array.from(failedSet);
      state.lastUpdate = new Date().toISOString();
      await saveState(state);
    }

    await sleep(DELAY_BETWEEN_CALLS_MS * BATCH_SIZE);
  }

  log(`\n=== Done ===`);
  log(`Total: ${remaining.length}, OK: ${ok}, Failed: ${failed}`);
  log(`State saved to ${STATE_FILE}`);
})().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
