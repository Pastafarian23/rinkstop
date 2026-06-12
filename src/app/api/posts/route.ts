import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/posts
 *
 * Cross-link API for the team, league, and player page article feeds.
 * Returns only published posts, filtered by:
 *   - leagueId  → posts where league_id matches (uses partial index)
 *   - teamId    → posts where team_home_id or team_away_id matches
 *   - countrySlug → posts where country_slug matches
 *   - tag       → posts where the tag is in the tags array
 *   - playerId  → posts where player_id matches OR team_home/team_away matches
 *                 the player's current team
 *
 * Query params:
 *   - leagueId: uuid
 *   - teamId: uuid
 *   - playerId: uuid
 *   - countrySlug: string
 *   - tag: string
 *   - limit: 1-50, default 12
 *
 * Cache: 60s server cache. Most article feeds don't need to be real-time.
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { ts: number; data: unknown }>();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const leagueId = url.searchParams.get('leagueId');
  const teamId = url.searchParams.get('teamId');
  const countrySlug = url.searchParams.get('countrySlug');
  const tag = url.searchParams.get('tag');
  const playerId = url.searchParams.get('playerId');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '12', 10) || 12, 50);

  const cacheKey = JSON.stringify({ leagueId, teamId, countrySlug, tag, playerId, limit });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ data: cached.data, cached: true });
  }

  let q = supabase
    .from('posts')
    .select('id, slug, title, subtitle, published_at, game_date, og_image_url, tags, team_home_id, team_away_id, league_id, country_slug, player_id')
    .eq('status', 'published');

  if (leagueId) q = q.eq('league_id', leagueId);
  if (playerId) {
    // Direct featured-player cross-link first; fall back to current-team
    // highlights when the player has no direct player_id link.
    const { data: player } = await supabase
      .from('players')
      .select('team_id')
      .eq('id', playerId)
      .single();
    const teamId = player?.team_id;
    q = q.or(`player_id.eq.${playerId}${teamId ? `,team_home_id.eq.${teamId},team_away_id.eq.${teamId}` : ''}`);
  } else if (teamId) {
    q = q.or(`team_home_id.eq.${teamId},team_away_id.eq.${teamId}`);
  }
  if (countrySlug) q = q.eq('country_slug', countrySlug);
  if (tag) q = q.contains('tags', [tag]);

  q = q.order('published_at', { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const result = (data || []);
  cache.set(cacheKey, { ts: Date.now(), data: result });
  return NextResponse.json({ data: result, cached: false });
}
