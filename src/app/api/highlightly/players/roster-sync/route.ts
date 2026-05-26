// POST /api/highlightly/players/roster-sync
// Syncs NHL player rosters from highlightly API into Supabase players table
// Query params: batch=N (which 1000-player page to process), dryRun=true

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;
const NHL_BASE_URL = 'https://nhl.highlightly.net';
const RAPIDAPI_HOST = 'nhl-ncaah-api.p.rapidapi.com';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dryRun') === 'true';
  const batchNum = parseInt(searchParams.get('batch') || '0', 10);
  const LIMIT = 1000;

  console.log(`[Roster Sync] Batch ${batchNum}${dryRun ? ' (DRY RUN)' : ''}`);

  try {
    const { supabaseAdmin } = await import('@/lib/supabase');

    // Get total count from API
    const countRes = await fetch(`${NHL_BASE_URL}/players?limit=0`, {
      headers: {
        'x-rapidapi-key': HIGHLIGHTLY_API_KEY!,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    });

    if (!countRes.ok) {
      return NextResponse.json({ error: `API error: ${countRes.status}` }, { status: countRes.status });
    }

    const countData = await countRes.json();
    const totalCount = countData.pagination?.totalCount || 0;
    const totalBatches = Math.ceil(totalCount / LIMIT);

    console.log(`[Roster Sync] Total: ${totalCount}, Batches: ${totalBatches}`);

    if (dryRun) {
      // Count existing slugs
      const existingSlugs = new Set<string>();
      let page = 0;
      while (true) {
        const { data } = await supabaseAdmin
          .from('players')
          .select('slug')
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach((p: any) => { if (p.slug) existingSlugs.add(p.slug); });
        if (data.length < 1000) break;
        page++;
      }
      return NextResponse.json({ 
        totalInAPI: totalCount, 
        totalBatches,
        existingSlugsInDB: existingSlugs.size,
        wouldSyncPerBatch: Math.ceil((totalCount - existingSlugs.size) / totalBatches)
      });
    }

    // Process ONE specific batch
    const offset = batchNum * LIMIT;

    const res = await fetch(`${NHL_BASE_URL}/players?limit=${LIMIT}&offset=${offset}`, {
      headers: {
        'x-rapidapi-key': HIGHLIGHTLY_API_KEY!,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const players = data.data || [];
    console.log(`[Roster Sync] Batch ${batchNum}: fetched ${players.length} players`);

    if (players.length === 0) {
      return NextResponse.json({ batch: batchNum, synced: 0, done: true });
    }

    // Get existing slugs from DB
    const existingSlugs = new Set<string>();
    let page = 0;
    while (true) {
      const { data: d } = await supabaseAdmin
        .from('players')
        .select('slug')
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!d || d.length === 0) break;
      d.forEach((p: any) => { if (p.slug) existingSlugs.add(p.slug); });
      if (d.length < 1000) break;
      page++;
    }

    // Build and filter records
    const newRecords: any[] = [];
    for (const p of players) {
      const fullName = p.fullName || '';
      const parts = fullName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      const slug = `${firstName.toLowerCase()}-${lastName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`.replace(/-+/g, '-').replace(/^-|-$/g, '');

      if (existingSlugs.has(slug)) continue;

      newRecords.push({
        id: randomUUID(),
        highlightly_id: String(p.id),
        first_name: firstName,
        last_name: lastName,
        slug,
        position: p.position || null,
        jersey_number: p.jerseyNumber || null,
        nationality: p.nationality || null,
        birth_date: p.birthDate || null,
        headshot_url: p.logo || null,
        is_active: true,
      });
      existingSlugs.add(slug);
    }

    console.log(`[Roster Sync] Batch ${batchNum}: ${newRecords.length} new records to insert`);

    let synced = 0;
    if (newRecords.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('players')
        .insert(newRecords);

      if (insErr) {
        // Fall back to individual inserts
        for (const rec of newRecords) {
          const { error: e } = await supabaseAdmin
            .from('players')
            .insert(rec);
          if (!e) synced++;
        }
      } else {
        synced = newRecords.length;
      }
    }

    const done = offset + LIMIT >= totalCount;
    console.log(`[Roster Sync] Batch ${batchNum}: synced ${synced}, done=${done}`);

    return NextResponse.json({
      batch: batchNum,
      totalBatches,
      fetched: players.length,
      newRecords,
      synced,
      done,
      nextBatch: done ? null : batchNum + 1,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Roster Sync] Fatal error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}