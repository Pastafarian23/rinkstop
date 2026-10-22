// src/app/api/cron/media-reaper/route.ts
//
// Reclaims storage quota for media whose retention window has expired.
//
// WHAT IT DOES
// Media assets whose last reference disappeared are kept for a grace period
// (30 days, set by the database trigger in media_asset_sync_refcount) so an
// accidental delete is recoverable. After that window the file costs money and
// serves nothing, and this endpoint deletes it.
//
// WHY IT EXISTS
// Before the ledger, deleting a post freed no storage at all — the object
// stayed in the bucket forever and kept consuming the owner's allowance. The
// ledger fixed accounting; this closes the physical side so reclaimed quota
// also means reclaimed disk.
//
// SAFETY
//   • Only assets with ref_count = 0 AND retained_until < now() are eligible.
//     The database enforces both conditions in expired_media_assets(), so a
//     race (an asset re-referenced between list and delete) is caught by
//     release_expired_media_asset() refusing to drop the ledger row.
//   • Storage is deleted BEFORE the ledger row. Dying mid-way leaves a ledger
//     row pointing at a missing file, which the next run cleans up. The reverse
//     order would orphan real files with no record — unrecoverable cost.
//   • It never touches buckets outside the four accounted media buckets.
//
// Schedule: daily. Wired in vercel.json.

import { NextResponse } from 'next/server';
import { reapExpiredAssets } from '@/lib/media-ledger';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitRaw = Number(new URL(request.url).searchParams.get('limit') ?? '200');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 200;

  const result = await reapExpiredAssets(limit);

  return NextResponse.json({
    ok: result.errors === 0,
    deleted: result.deleted,
    bytesReclaimed: result.bytesReclaimed,
    mbReclaimed: Math.round((result.bytesReclaimed / 1048576) * 100) / 100,
    errors: result.errors,
  });
}