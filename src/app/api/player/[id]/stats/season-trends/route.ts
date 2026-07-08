/**
 * /api/player/[id]/stats/season-trends
 *
 * Phase 1c-4 Advanced Player Analytics.
 *
 * GET returns the career stats (from highlightly_career_stats) plus achievement
 * milestones for a single player.
 *
 * Tier gate: Identity Plus+ OR Business Listing+ (matches the Family Hub gate).
 * Ownership: caller must manage this player via managed_profiles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { getUserTier } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-stats:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const tier = await getUserTier(userId);
  if (
    !tierAtLeastSameTrack(tier, 'identity_plus') &&
    !tierAtLeastSameTrack(tier, 'business_listing')
  ) {
    const res = NextResponse.json(
      { error: 'Advanced analytics requires Identity Plus or higher.', code: 'tier_required' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { id } = await params;
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug, highlightly_id, birth_date')
    .eq('id', id)
    .maybeSingle();
  if (!player) {
    const res = NextResponse.json({ error: 'Player not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }

  const { data: linkRow } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', id)
    .limit(1)
    .maybeSingle();
  if (!linkRow) {
    const res = NextResponse.json({ error: 'Not your player.' }, { status: 403 });
    return applyRateLimitHeaders(res, rl);
  }

  const highlightlyId = player.highlightly_id || id;
  const { data: stats, error: statsErr } = await supabaseAdmin
    .from('highlightly_career_stats')
    .select(
      'season, season_type, games_played, goals, assists, points, penalty_minutes, plus_minus, wins, losses, overtime_losses, goals_against, saves, save_percentage, goals_against_average, shutouts, additional_stats'
    )
    .eq('player_id', highlightlyId)
    .order('season', { ascending: true });
  if (statsErr) {
    console.error('[player-stats-season-trends] stats fetch failed:', statsErr);
  }
  const statsRows = (stats || []) as Array<{
    season: string;
    season_type: string;
    games_played: number | null;
    goals: number | null;
    assists: number | null;
    points: number | null;
    penalty_minutes: number | null;
    plus_minus: number | null;
    wins: number | null;
    losses: number | null;
    overtime_losses: number | null;
    goals_against: number | null;
    saves: number | null;
    save_percentage: number | null;
    goals_against_average: number | null;
    shutouts: number | null;
    additional_stats: any;
  }>;

  const { data: achievements } = await supabaseAdmin
    .from('player_achievements')
    .select('title, description, achieved_at, created_at')
    .eq('player_id', id)
    .order('achieved_at', { ascending: true });
  const milestonesRows = (achievements || []) as Array<{
    title: string;
    description: string | null;
    achieved_at: string | null;
    created_at: string;
  }>;

  const res = NextResponse.json({
    ok: true,
    player: {
      id: player.id,
      first_name: player.first_name,
      last_name: player.last_name,
      slug: player.slug,
    },
    career_stats: statsRows.map((s) => ({
      season: s.season,
      season_type: s.season_type,
      games_played: s.games_played,
      goals: s.goals,
      assists: s.assists,
      points: s.points,
      penalty_minutes: s.penalty_minutes,
      plus_minus: s.plus_minus,
      wins: s.wins,
      losses: s.losses,
      overtime_losses: s.overtime_losses,
      saves: s.saves,
      save_percentage: s.save_percentage,
      goals_against_average: s.goals_against_average,
      shutouts: s.shutouts,
    })),
    milestones: milestonesRows.map((m) => ({
      title: m.title,
      description: m.description,
      achieved_at: m.achieved_at,
    })),
  });
  return applyRateLimitHeaders(res, rl);
}
