// GET /api/admin/leagues/list
// Return the full league list (id, name, slug) for admin bulk-action
// dropdowns. No search filter — just every league, sorted by name.
//
// Used by BulkActionBar on /admin/teams. Limited to 500 rows (we have
// nowhere near that many leagues; this is just a safety bound).

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const { data, error } = await supabaseAdmin
    .from('leagues')
    .select('id, name, slug')
    .order('name', { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ leagues: data || [] });
}
