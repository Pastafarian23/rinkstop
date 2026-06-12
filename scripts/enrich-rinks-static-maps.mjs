#!/usr/bin/env node
/**
 * One-time (resumable) backfill: pre-bake a static Google Maps thumbnail for
 * every active rink and store the image in Supabase Storage. The card UI
 * then renders our public Supabase URL — never the Google-signed URL — so
 * the Google API key is never leaked into browser HTML.
 *
 *   node scripts/enrich-rinks-static-maps.mjs [limit]
 *
 * Default limit: 5000. Resumable: skips rows where static_map_url IS NOT NULL.
 * Filters out rinks without valid lat/lon (NULL or 0,0).
 *
 * Requires GOOGLE_MAPS_API_KEY in env (loaded from google-maps.json by the
 * task wrapper if env is unset).
 */
import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ---- Config ---------------------------------------------------------------------------
const BUCKET = 'rink-maps';
const BUCKET_PUBLIC_URL_PREFIX = `https://yszheonqyyskkjoxoexk.supabase.co/storage/v1/object/public/${BUCKET}`;
const PATH_PREFIX = 'static';
const ZOOM = 13;
const IMG_W = 400;
const IMG_H = 200;
const MAPTYPE = 'roadmap';
const SLEEP_MS = 300;

// CLI arg: limit (default 5000)
const LIMIT = parseInt(process.argv[2] || '5000', 10);

// ---- Google Maps API key resolution ----------------------------------------------------
// Prefer env; fall back to /root/.openclaw/credentials/google-maps.json (gateway key store).
let GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  try {
    const j = JSON.parse(readFileSync('/root/.openclaw/credentials/google-maps.json', 'utf8'));
    GOOGLE_MAPS_API_KEY = j.key;
  } catch (e) {
    console.error('GOOGLE_MAPS_API_KEY env var is not set and google-maps.json could not be read:', e.message);
    process.exit(1);
  }
}
if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.length !== 39) {
  console.error(`Google Maps key looks wrong (length ${GOOGLE_MAPS_API_KEY?.length}, expected 39). Aborting.`);
  process.exit(1);
}

// ---- Supabase client -------------------------------------------------------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ---- Helpers ---------------------------------------------------------------------------
function log(...args) { console.log(`[map ${new Date().toISOString()}]`, ...args); }

function buildStaticMapUrl(lat, lon) {
  const u = new URL('https://maps.googleapis.com/maps/api/staticmap');
  u.searchParams.set('center', `${lat},${lon}`);
  u.searchParams.set('zoom', String(ZOOM));
  u.searchParams.set('size', `${IMG_W}x${IMG_H}`);
  u.searchParams.set('maptype', MAPTYPE);
  u.searchParams.set('key', GOOGLE_MAPS_API_KEY);
  return u.toString();
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // \x89PNG

function isPng(buf) {
  return buf && buf.length >= 4 && buf.compare(PNG_MAGIC, 0, 4, 0, 4) === 0;
}

async function ensureBucket() {
  // List buckets via service role; create if missing.
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`listBuckets failed: ${error.message}`);
  if (buckets?.find(b => b.name === BUCKET)) {
    log(`bucket "${BUCKET}" already exists`);
    return;
  }
  log(`bucket "${BUCKET}" not found — creating (public-read)...`);
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '1MB', // Static Map 400x200 PNGs are ~10–40 KB; 1MB headroom is plenty.
    allowedMimeTypes: ['image/png'],
  });
  if (createErr) throw new Error(`createBucket failed: ${createErr.message}`);
  log(`bucket "${BUCKET}" created`);
}

async function downloadPng(url, outPath) {
  // Use curl: -f fail on HTTP >=400, -s silent, -o file out.
  // We then read the bytes and check the PNG magic.
  try { unlinkSync(outPath); } catch {}
  try {
    execSync(`curl -sS -f -L --max-time 20 -o ${JSON.stringify(outPath)} ${JSON.stringify(url)}`, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    return { ok: false, reason: `curl exit ${e.status ?? '?'}: ${(e.stderr?.toString() || '').slice(0, 200)}` };
  }
  let buf;
  try { buf = readFileSync(outPath); } catch (e) { return { ok: false, reason: 'read failed: ' + e.message }; }
  if (!isPng(buf)) {
    // Body is probably an XML error or HTML — log a hint.
    const head = buf.slice(0, 200).toString('utf8').replace(/\s+/g, ' ').slice(0, 180);
    return { ok: false, reason: `not a PNG (head: ${head})` };
  }
  return { ok: true, bytes: buf.length, buf };
}

async function uploadPng(path, buf) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: 'image/png', upsert: true, cacheControl: '31536000' });
  if (error) throw new Error(`upload failed: ${error.message}`);
}

async function saveStaticMapUrl(rinkId, publicUrl) {
  const { error } = await supabase
    .from('rinks')
    .update({ static_map_url: publicUrl })
    .eq('id', rinkId);
  if (error) throw new Error(`DB update failed: ${error.message}`);
}

// ---- Main -----------------------------------------------------------------------------
async function main() {
  log(`limit=${LIMIT}, bucket=${BUCKET}, path=${PATH_PREFIX}/<id>.png, ${IMG_W}x${IMG_H} zoom=${ZOOM}`);
  await ensureBucket();

  log('querying rinks needing maps...');
  const { data: rinks, error } = await supabase
    .from('rinks')
    .select('id, name, slug, latitude, longitude')
    .eq('is_active', true)
    .is('static_map_url', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .neq('latitude', 0)
    .neq('longitude', 0)
    // Skip placeholders/closed — they have no real location to map.
    .neq('status', 'closed')
    .neq('status', 'placeholder')
    .order('id', { ascending: true })
    .limit(LIMIT);
  if (error) throw error;
  log(`found ${rinks.length} rinks to enrich`);

  if (!rinks.length) { log('nothing to do'); return; }

  let ok = 0, fail = 0, totalBytes = 0;
  const failures = [];
  const start = Date.now();

  for (let i = 0; i < rinks.length; i++) {
    const r = rinks[i];
    const url = buildStaticMapUrl(r.latitude, r.longitude);
    const tmpPath = join(tmpdir(), `map-${r.id}.png`);
    const dl = await downloadPng(url, tmpPath);
    if (!dl.ok) {
      fail++;
      failures.push({ id: r.id, name: r.name, reason: dl.reason });
      log(`[${i + 1}/${rinks.length}] FAIL ${r.name} (${r.id}) — ${dl.reason}`);
      try { unlinkSync(tmpPath); } catch {}
      await new Promise(res => setTimeout(res, SLEEP_MS));
      continue;
    }
    const objectPath = `${PATH_PREFIX}/${r.id}.png`;
    try {
      await uploadPng(objectPath, dl.buf);
    } catch (e) {
      fail++;
      failures.push({ id: r.id, name: r.name, reason: 'upload: ' + e.message });
      log(`[${i + 1}/${rinks.length}] UPLOAD-FAIL ${r.name} (${r.id}) — ${e.message}`);
      try { unlinkSync(tmpPath); } catch {}
      await new Promise(res => setTimeout(res, SLEEP_MS));
      continue;
    }
    const publicUrl = `${BUCKET_PUBLIC_URL_PREFIX}/${objectPath}`;
    try {
      await saveStaticMapUrl(r.id, publicUrl);
    } catch (e) {
      fail++;
      failures.push({ id: r.id, name: r.name, reason: 'db: ' + e.message });
      log(`[${i + 1}/${rinks.length}] DB-FAIL ${r.name} (${r.id}) — ${e.message}`);
      try { unlinkSync(tmpPath); } catch {}
      await new Promise(res => setTimeout(res, SLEEP_MS));
      continue;
    }
    ok++;
    totalBytes += dl.bytes;
    log(`[${i + 1}/${rinks.length}] ${r.name} -> uploaded ${dl.bytes} bytes -> ${publicUrl}`);
    try { unlinkSync(tmpPath); } catch {}

    if ((i + 1) % 25 === 0) {
      const elapsed = (Date.now() - start) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = (rinks.length - i - 1) / rate;
      log(`--- progress ${ok} ok / ${fail} fail / ${rinks.length} total | ${rate.toFixed(1)}/s | ETA ${Math.round(remaining)}s ---`);
    }
    await new Promise(res => setTimeout(res, SLEEP_MS));
  }

  const elapsed = (Date.now() - start) / 1000;
  log(`done. ok=${ok} fail=${fail} totalBytes=${totalBytes} elapsed=${elapsed.toFixed(1)}s`);
  if (failures.length) {
    log(`failures (${failures.length}):`);
    for (const f of failures.slice(0, 20)) log(`  - ${f.id} ${f.name}: ${f.reason}`);
    if (failures.length > 20) log(`  ... and ${failures.length - 20} more`);
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
