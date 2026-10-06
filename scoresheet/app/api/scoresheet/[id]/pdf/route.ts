/**
 * GET /api/scoresheet/[id]/pdf
 *
 * Returns the game as a PDF scoresheet. Owner-only (Phase C will add
 * public-share-token access).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '@/lib/supabase';
import { buildScoresheetPdf } from '@/lib/pdf-scoresheet';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const { data: game, error: gameError } = await sb
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
  }
  if ((game as any).owner_user_id !== userId) {
    return NextResponse.json({ error: 'Not your game.' }, { status: 403 });
  }

  const { data: events } = await sb
    .from('game_events')
    .select('*')
    .eq('game_id', id)
    .order('period', { ascending: true })
    .order('clock_seconds', { ascending: true })
    .order('sequence_number', { ascending: true });

  // Fetch rink name if rink_id is set.
  let rinkName: string | null = null;
  if ((game as any).rink_id) {
    const { data: rink } = await sb
      .from('rinks')
      .select('name')
      .eq('id', (game as any).rink_id)
      .maybeSingle();
    rinkName = rink?.name || null;
  }

  // Fetch coach names if linked.
  const homeCoachId = (game as any).home_coach_rinkstop_id as string | null;
  const awayCoachId = (game as any).away_coach_rinkstop_id as string | null;
  const coachIds = [homeCoachId, awayCoachId].filter(Boolean) as string[];
  let coachMap = new Map<string, string>();
  if (coachIds.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('user_id, display_name, username')
      .in('user_id', coachIds);
    for (const p of profiles || []) {
      coachMap.set(p.user_id, p.display_name || p.username || '');
    }
  }

  const scorekeeperName = userId.startsWith('user_') ? `User ${userId.slice(5, 13)}` : userId;

  try {
    const pdfBytes = await buildScoresheetPdf({
      game: {
        ...(game as any),
        rink: (game as any).rink_id
          ? { id: (game as any).rink_id, name: rinkName || '' }
          : null,
        home_coach: (game as any).home_coach_name
          ? {
              name: (game as any).home_coach_name,
              rinkstopId: homeCoachId,
            }
          : null,
        away_coach: (game as any).away_coach_name
          ? {
              name: (game as any).away_coach_name,
              rinkstopId: awayCoachId,
            }
          : null,
      },
      events: (events || []) as any[],
      scorekeeperName,
    });

    const safeName = (game as any).home_team_name.replace(/[^a-zA-Z0-9]/g, '_');
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="scoresheet-${safeName}-${(game as any).id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[scoresheet-pdf] generation error:', err);
    return NextResponse.json({ error: 'PDF generation failed.' }, { status: 500 });
  }
}
