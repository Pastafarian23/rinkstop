import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const id = 'leevi-aaltonen';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Exactly mimicking the page.tsx query
  const { data: seoPlayer, error } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug, position, headshot_url, nationality, height_cm, weight_kg, jersey_number, shoots, catches, birth_date, bio, updated_at, highlightly_id, badge_tier, teams(name, slug, leagues(name, slug, country))')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  // Also try the generateMetadata query
  const { data: metaPlayer } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, position, nationality, headshot_url, seo_title, current_team_name, teams(name, leagues(name))')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  // Check service role key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyPrefix = serviceKey ? serviceKey.substring(0, 8) : 'MISSING';
  const keyLen = serviceKey ? serviceKey.length : 0;

  return NextResponse.json({
    id,
    isUuid,
    seoPlayerFound: !!seoPlayer,
    seoPlayerError: error?.message,
    metaPlayerFound: !!metaPlayer,
    keyPrefix,
    keyLen,
    // Try direct postgres query as alternative
    rawQuery: null,
  });
}
