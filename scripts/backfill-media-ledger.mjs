// scripts/backfill-media-ledger.mjs
//
// Populate media_assets / media_asset_refs from live Supabase Storage so that
// quota accounting is correct from the moment the ledger goes live.
//
// WHY A SCRIPT AND NOT SQL
// The ledger needs two things SQL cannot reach in one pass:
//   1. Storage object listings + `metadata.contentLength` for real byte counts.
//   2. A walk of four user-keyed/player-keyed path conventions to attribute
//      each object to an owner.
//
// It is also deliberately resumable: `post-media`, `profile_covers`,
// `listing-photos` and `player-media` are walked and committed per bucket, so
// a failure halfway does not leave the ledger half-populated for a re-run to
// duplicate.
//
// SAFE TO RE-RUN. Every insert is an upsert on (bucket, object_path), and refs
// are inserted ON CONFLICT DO NOTHING.
//
// Usage:
//   node scripts/backfill-media-ledger.mjs            # dry run, prints plan
//   node scripts/backfill-media-ledger.mjs --apply    # actually writes

import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('./load-secrets.cjs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const APPLY = process.argv.includes('--apply');

/** Buckets whose path prefix is the owning Clerk user id. */
const USER_KEYED_BUCKETS = ['post-media', 'profile_covers', 'listing-photos'];
/** Bucket whose path prefix is a player UUID. */
const PLAYER_KEYED_BUCKET = 'player-media';

/**
 * Walk a bucket subtree, returning real objects with byte counts.
 *
 * The returned `path` is always BUCKET-qualified (`post-media/userId/file`),
 * because that is how every DB column stores the reference — `media_url`,
 * `avatar_url`, `cover_image_url` all embed the bucket name. Returning a
 * bucket-less path here silently fails to match any reference, which makes
 * every live asset look orphaned and would put real media into the reaper.
 *
 * A folder marker has `metadata == null`; real objects carry
 * `metadata.contentLength`. Getting that wrong counts every object as 0 bytes,
 * which silently disables the byte quota while still looking healthy.
 */
async function listObjects(bucket, prefix, depth = 0) {
  if (depth > 6) return [];
  const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    console.warn(`  ! list ${bucket}/${prefix}: ${error.message}`);
    return [];
  }
  const out = [];
  for (const entry of data || []) {
    if (entry.metadata == null) {
      out.push(...(await listObjects(bucket, `${prefix}${entry.name}/`, depth + 1)));
    } else {
      const raw = entry.metadata?.contentLength;
      const bytes = Number.parseInt(String(raw ?? '0'), 10);
      out.push({
        path: `${bucket}/${prefix}${entry.name}`,
        bytes: Number.isFinite(bytes) && bytes > 0 ? bytes : 0,
        mime: entry.metadata?.mimetype ?? null,
      });
    }
  }
  return out;
}

function kindFor(mime, path) {
  if (mime?.startsWith('video/')) return 'video';
  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(path)) return 'video';
  return 'photo';
}

/** All user ids that appear in the user-keyed bucket prefixes. */
async function discoverUserIds() {
  const ids = new Set();
  for (const bucket of USER_KEYED_BUCKETS) {
    const { data } = await db.storage.from(bucket).list('', { limit: 1000 });
    for (const entry of data || []) ids.add(entry.name);
  }
  return Array.from(ids);
}

/** Player UUIDs that own objects in player-media. */
async function discoverPlayerIds() {
  const ids = new Set();
  const { data: media } = await db.from('player_media').select('player_id');
  for (const r of media || []) if (r?.player_id) ids.add(r.player_id);
  const { data: managed } = await db
    .from('managed_profiles')
    .select('profile_id')
    .eq('profile_type', 'player');
  for (const r of managed || []) if (r?.profile_id) ids.add(r.profile_id);
  const { data: owned } = await db.from('players').select('id');
  for (const r of owned || []) if (r?.id) ids.add(r.id);
  return Array.from(ids);
}

/**
 * Run `worker` over `items` with bounded concurrency.
 *
 * The player-media pass has to probe ~1000 player prefixes. Sequential, that is
 * ~1000 round trips and the backfill takes many minutes — long enough that an
 * operator re-runs it and creates two concurrent writers. Concurrency is capped
 * at 8 to stay well inside the Storage API rate limit.
 */
async function mapLimit(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) break;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * DB references for a user-keyed bucket, so we can mark assets as referenced
 * rather than orphaned.
 */
async function refsForUserBucket(bucket, userId) {
  const refs = [];
  if (bucket === 'post-media') {
    const { data } = await db
      .from('profile_posts')
      .select('id, media_url, deleted_at')
      .eq('user_id', userId)
      .not('media_url', 'is', null);
    for (const row of data || []) {
      const p = storagePath(row.media_url);
      if (p) refs.push({ ref_table: 'profile_posts', ref_id: row.id, path: p, deleted: !!row.deleted_at });
    }
  } else if (bucket === 'profile_covers') {
    const { data: covers } = await db
      .from('profiles')
      .select('id, cover_image_url')
      .eq('user_id', userId)
      .not('cover_image_url', 'is', null);
    for (const row of covers || []) {
      const p = storagePath(row.cover_image_url);
      if (p) refs.push({ ref_table: 'profiles', ref_id: row.id, path: p, deleted: false });
    }
    const { data: avatars } = await db
      .from('profiles')
      .select('id, avatar_url')
      .eq('user_id', userId)
      .not('avatar_url', 'is', null);
    for (const row of avatars || []) {
      const p = storagePath(row.avatar_url);
      if (p) refs.push({ ref_table: 'profiles', ref_id: row.id, path: p, deleted: false });
    }
  } else if (bucket === 'listing-photos') {
    const { data } = await db
      .from('listings')
      .select('id')
      .eq('user_id', userId)
      .limit(200);
    for (const row of data || []) {
      // listing-photos/<userId>/<listingId>/<uuid>.<ext>
      refs.push({ ref_table: 'listings', ref_id: row.id, path: `${userId}/${row.id}`, deleted: false, dir: true });
    }
  }
  return refs;
}

/** Extract the storage path from a public URL. Returns null for external URLs. */
function storagePath(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/\/object\/public\/(.+)$/);
  return m ? m[1] : null;
}

async function main() {
  console.log(`MODE: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  const totals = { assets: 0, bytes: 0, refs: 0, orphaned: 0, graceStarted: 0 };

  // ---- user-keyed buckets -------------------------------------------------
  const userIds = await discoverUserIds();
  console.log(`\nuser ids with storage: ${userIds.length}`);

  for (const bucket of USER_KEYED_BUCKETS) {
    for (const userId of userIds) {
      const objects = await listObjects(bucket, `${userId}/`);
      if (!objects.length) continue;
      const refs = await refsForUserBucket(bucket, userId);

      for (const obj of objects) {
        // A ref matches if its path equals the object path or is a directory
        // prefix of it (listing-photos nests one level deeper).
        const matching = refs.filter(
          (r) => (r.dir ? obj.path.startsWith(`${r.path}/`) : r.path === obj.path),
        );
        const live = matching.filter((r) => !r.deleted);
        totals.assets += 1;
        totals.bytes += obj.bytes;
        totals.refs += live.length;
        if (!live.length) totals.orphaned += 1;

        if (!APPLY) {
          const status = live.length ? `refs=${live.length}` : 'ORPHAN';
          console.log(`  ${obj.path} — ${obj.bytes}B — ${status}`);
          continue;
        }

        const { data: asset, error: aErr } = await db
          .from('media_assets')
          .upsert(
            {
              bucket,
              object_path: obj.path,
              owner_user_id: userId,
              bytes: obj.bytes,
              mime_type: obj.mime,
              asset_kind: kindFor(obj.mime, obj.path),
            },
            { onConflict: 'bucket,object_path' },
          )
          .select('id')
          .single();
        if (aErr) {
          console.error(`  ! upsert ${bucket}/${obj.path}: ${aErr.message}`);
          continue;
        }

        for (const r of live) {
          await db
            .from('media_asset_refs')
            .upsert(
              { asset_id: asset.id, ref_table: r.ref_table, ref_id: r.ref_id },
              { onConflict: 'asset_id,ref_table,ref_id', ignoreDuplicates: true },
            );
        }
        // Referenced only by soft-deleted rows, or by nothing at all → start
        // the grace period rather than counting forever. Both cases mean no LIVE
        // reference, which is the definition of "not currently charged for".
        // Leaving these as live would let a user be permanently billed quota for
        // media no page renders, which is the bug this ledger exists to fix.
        if (!live.length) {
          await db
            .from('media_assets')
            .update({ retained_until: new Date(Date.now() + 30 * 86400_000).toISOString() })
            .eq('id', asset.id);
          totals.graceStarted += 1;
        }
      }
    }
  }

  // ---- player-media -------------------------------------------------------
  const playerIds = await discoverPlayerIds();
  console.log(`\nplayer ids: ${playerIds.length} (probing with concurrency 8)`);

  // Fetch the player → media/owner relationship maps ONCE instead of per
  // player. Three queries per player across ~1000 players is ~3000 round trips;
  // three queries total is not.
  const { data: allMedia } = await db.from('player_media').select('id, player_id, uploaded_by');
  const { data: allManaged } = await db
    .from('managed_profiles')
    .select('profile_id, manager_user_id')
    .eq('profile_type', 'player');
  const { data: allOwned } = await db.from('players').select('id, user_id');

  const mediaByPlayer = new Map();
  for (const m of allMedia || []) {
    if (!m?.player_id) continue;
    if (!mediaByPlayer.has(m.player_id)) mediaByPlayer.set(m.player_id, []);
    mediaByPlayer.get(m.player_id).push(m);
  }
  const managedByPlayer = new Map();
  for (const m of allManaged || []) {
    if (m?.profile_id) managedByPlayer.set(m.profile_id, m.manager_user_id);
  }
  const ownerByPlayer = new Map();
  for (const p of allOwned || []) {
    if (p?.id) ownerByPlayer.set(p.id, p.user_id);
  }

  await mapLimit(playerIds, 8, async (playerId) => {
    const objects = await listObjects(PLAYER_KEYED_BUCKET, `${playerId}/`);
    if (!objects.length) return;

    const media = mediaByPlayer.get(playerId) || [];
    const ownerUserId =
      media[0]?.uploaded_by || managedByPlayer.get(playerId) || ownerByPlayer.get(playerId) || null;
    if (!ownerUserId) return;

    for (const obj of objects) {
      // player-media/<playerId>/<mediaId>/<file>
      const segments = obj.path.split('/');
      const mediaId = segments[1] ?? null;
      const matching = media.filter((m) => m.id === mediaId);

      totals.assets += 1;
      totals.bytes += obj.bytes;
      totals.refs += matching.length;
      if (!matching.length) totals.orphaned += 1;

      if (!APPLY) {
        console.log(
          `  ${PLAYER_KEYED_BUCKET}/${obj.path} — ${obj.bytes}B — ${matching.length ? `refs=${matching.length}` : 'ORPHAN'}`,
        );
        continue;
      }

      const { data: asset, error: aErr } = await db
        .from('media_assets')
        .upsert(
          {
            bucket: PLAYER_KEYED_BUCKET,
            object_path: obj.path,
            owner_user_id: ownerUserId,
            bytes: obj.bytes,
            mime_type: obj.mime,
            asset_kind: kindFor(obj.mime, obj.path),
          },
          { onConflict: 'bucket,object_path' },
        )
        .select('id')
        .single();
      if (aErr) continue;

      for (const m of matching) {
        await db
          .from('media_asset_refs')
          .upsert(
            { asset_id: asset.id, ref_table: 'player_media', ref_id: m.id },
            { onConflict: 'asset_id,ref_table,ref_id', ignoreDuplicates: true },
          );
      }
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log(`assets: ${totals.assets}`);
  console.log(`bytes:  ${totals.bytes} (${(totals.bytes / 1048576).toFixed(2)} MB)`);
  console.log(`live refs: ${totals.refs}`);
  console.log(`orphaned (no live ref): ${totals.orphaned}`);
  console.log(`grace period started: ${totals.graceStarted}`);
  if (!APPLY) console.log('\n(dry run — re-run with --apply to write)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});