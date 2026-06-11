import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };
const VALID_TYPES = ['player', 'team', 'league', 'rink'] as const;

// GET /api/entities/[type]/[id]
// Returns a single entity's public display data for use in DM thread headers
// (e.g. showing "Re: [Kid Name]" when a parent DMs a coach on behalf of their kid).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  const ip = getClientIP(request);
  const result = await checkRateLimit(`[id]:${ip}`, RL);
  maybeCleanup();

  if (!VALID_TYPES.includes(type as any)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: 'id required.' }, { status: 400 });
  }

  let name: string | null = null;
  let url: string | null = null;
  let payload: any = null;

  if (type === 'player') {
    const { data } = await supabaseAdmin.from('players').select('id, first_name, last_name, slug').eq('id', id).maybeSingle();
    if (data) {
      name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Player';
      url = `/directory/players/${data.slug || data.id}`;
      payload = data;
    }
  } else if (type === 'team') {
    const { data } = await supabaseAdmin.from('teams').select('id, name, slug').eq('id', id).maybeSingle();
    if (data) {
      name = data.name || 'Team';
      url = `/directory/teams/${data.slug || data.id}`;
      payload = data;
    }
  } else if (type === 'league') {
    const { data } = await supabaseAdmin.from('leagues').select('id, name, slug').eq('id', id).maybeSingle();
    if (data) {
      name = data.name || 'League';
      url = `/leagues/${data.slug || data.id}`;
      payload = data;
    }
  } else if (type === 'rink') {
    const { data } = await supabaseAdmin.from('rinks').select('id, name, slug').eq('id', id).maybeSingle();
    if (data) {
      name = data.name || 'Rink';
      url = `/directory/rinks/${data.slug || data.id}`;
      payload = data;
    }
  }

  if (!name) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const res = NextResponse.json({ [type]: payload, name, url });
  return applyRateLimitHeaders(res, result);
}
