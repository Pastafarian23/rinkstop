import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Test 1: Simple select
  const r1 = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  // Test 2: Select with team join
  const r2 = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug, teams(name, leagues(name))')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  // Test 3: The exact query from the page
  const r3 = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug, position, headshot_url, nationality, height_cm, weight_kg, jersey_number, shoots, catches, birth_date, bio, updated_at, highlightly_id, badge_tier, teams(name, slug, leagues(name, slug, country))')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  return NextResponse.json({
    id,
    isUuid,
    test1: { found: !!r1.data, data: r1.data, error: r1.error?.message },
    test2: { found: !!r2.data, data: r2.data, error: r2.error?.message },
    test3: { found: !!r3.data, data: r3.data, error: r3.error?.message },
  });
}
