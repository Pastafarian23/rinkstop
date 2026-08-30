import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getDirectAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(_req: NextRequest) {
  const sb = getDirectAdminClient();
  if (!sb) return NextResponse.json({ error: 'no client' });

  const cols = ['id', 'first_name', 'last_name', 'slug', 'position', 'headshot_url', 'nationality', 'height_cm', 'weight_kg', 'jersey_number', 'shoots', 'catches', 'birth_date', 'bio', 'updated_at', 'highlightly_id', 'current_team_name', 'badge_tier', 'seo_title'];
  const result: any = {};

  for (const col of cols) {
    try {
      const { data, error } = await sb.from('players').select(col).eq('slug', 'leevi-aaltonen').maybeSingle();
      result[col] = error ? `ERROR: ${error.message}` : (data !== null ? 'EXISTS' : 'NULL (col ok)');
    } catch (e: any) {
      result[col] = `THROW: ${e?.message}`;
    }
  }

  return NextResponse.json(result);
}
