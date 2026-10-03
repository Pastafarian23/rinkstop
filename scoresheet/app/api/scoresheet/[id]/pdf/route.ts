/**
 * GET /api/scoresheet/[id]/pdf
 *
 * Returns the game as a PDF scoresheet. Available to:
 *   - The game owner (signed in, owns the game)
 *   - Anyone with a public_share_token (Phase C)
 *
 * For now: owner-only. The PDF is generated on-demand; no caching
 * since game data changes between requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '@/lib/supabase';
import { buildScoresheetPdf } from '@/lib/pdf-scoresheet';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';  // pdf-lib needs node, not edge

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

  // Get scorekeeper name from Clerk. We don't have a users table
  // populated yet, so we just use the userId prefix.
  const scorekeeperName = userId.startsWith('user_') ? `User ${userId.slice(5, 13)}` : userId;

  try {
    const pdfBytes = await buildScoresheetPdf({
      game: game as any,
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
