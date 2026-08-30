import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEntityOwner, getFollowersCount } from '@/lib/ownership';

export const dynamic = 'force-dynamic';

function getDirectAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const sb = getDirectAdminClient();
  if (!sb) return NextResponse.json({ error: 'no admin client' }, { status: 500 });

  const steps: any = { id, isUuid, env: { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: !!process.env.SUPABASE_SERVICE_ROLE_KEY } };

  // Step 1: direct query
  const { data: seoPlayer, error: q1err } = await sb
    .from('players')
    .select('id, first_name, last_name, slug, position, headshot_url, teams(name)')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();
  steps.query1 = { found: !!seoPlayer, error: q1err?.message || null, name: seoPlayer ? `${seoPlayer.first_name} ${seoPlayer.last_name}` : null };

  // Step 2: ownership proxy
  try {
    const owner = await getEntityOwner('player', id);
    steps.ownership = { result: owner };
  } catch (e: any) {
    steps.ownership = { error: e?.message || String(e) };
  }

  // Step 3: followers
  try {
    const fc = await getFollowersCount('player', id);
    steps.followers = { count: fc };
  } catch (e: any) {
    steps.followers = { error: e?.message || String(e) };
  }

  // Step 4: build the same React component
  if (seoPlayer) {
    const teamArr: any[] = Array.isArray(seoPlayer.teams) ? seoPlayer.teams : (seoPlayer.teams ? [seoPlayer.teams] : []);
    const teamName = teamArr[0]?.name || null;
    steps.playerInfo = {
      name: `${seoPlayer.first_name} ${seoPlayer.last_name}`,
      position: seoPlayer.position,
      teamName
    };
  }

  return NextResponse.json(steps);
}
