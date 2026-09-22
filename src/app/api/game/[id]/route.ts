import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const sb = getSupabase();
  const { data: f, error } = await sb
    .from('fixtures')
    .select(`
      id, scheduled_at, status, home_score, away_score, league_id,
      home_team_id, away_team_id, season, game_data,
      home_team:teams!fixtures_home_team_id_fkey(id, name, slug, logo_url, city, country),
      away_team:teams!fixtures_away_team_id_fkey(id, name, slug, logo_url, city, country),
      league:leagues!fixtures_league_id_fkey(id, name, slug, level, country)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!f) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Cross-link: find companion articles (posts.highlight_id) and highlight
  // videos (highlight_backups) for this game's teams + date. Added
  // 2026-09-21 per Arnel's 'scores → games → articles + highlights' directive.
  const gameDate = (f.scheduled_at || '').slice(0, 10);
  let linkedArticles: any[] = [];
  let linkedHighlights: any[] = [];
  if (f.home_team_id && f.away_team_id && gameDate) {
    // Find published articles linked to highlights that match this game
    const { data: articles } = await sb
      .from('posts')
      .select('id, slug, title, subtitle, category, reading_time_minutes, author_name, published_at, highlight_id')
      .eq('status', 'published')
      .not('highlight_id', 'is', null);
    if (articles && articles.length > 0) {
      const hlIds = articles.map(a => a.highlight_id).filter(Boolean);
      const { data: matchingHighlights } = await sb
        .from('highlight_backups')
        .select('id, title, video_url, home_team_name, away_team_name, match_date')
        .in('id', hlIds)
        .gte('match_date', `${gameDate}T00:00:00Z`)
        .lt('match_date', `${gameDate}T23:59:59Z`);
      if (matchingHighlights) {
        const hlMap = new Map(matchingHighlights.map(h => [h.id, h]));
        // Cast home_team / away_team — Supabase nested select returns arrays
        // for !inner joins but objects for single-row. Treat as single.
        const homeTeamName = (f.home_team as any)?.name;
        const awayTeamName = (f.away_team as any)?.name;
        linkedArticles = articles
          .filter(a => {
            const hl = hlMap.get(a.highlight_id);
            if (!hl) return false;
            const htMatch = hl.home_team_name === homeTeamName || hl.away_team_name === awayTeamName;
            return htMatch;
          })
          .map(a => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            subtitle: a.subtitle,
            category: a.category,
            reading_time_minutes: a.reading_time_minutes,
            author_name: a.author_name,
            published_at: a.published_at,
            path: `/news/${a.slug}`,
          }));
      }
    }
    // Find highlight videos for this game's teams + date
    const { data: highlights } = await sb
      .from('highlight_backups')
      .select('id, title, video_url, embed_url, source, channel, home_team_name, away_team_name, league_name, image_url, match_id')
      .or(`home_team_id.eq.${f.home_team_id},away_team_id.eq.${f.home_team_id},home_team_id.eq.${f.away_team_id},away_team_id.eq.${f.away_team_id}`)
      .gte('match_date', `${gameDate}T00:00:00Z`)
      .lt('match_date', `${gameDate}T23:59:59Z`)
      .limit(10);
    if (highlights) {
      linkedHighlights = highlights.map((h: any) => ({
        id: h.id,
        title: h.title,
        video_url: h.video_url,
        embed_url: h.embed_url,
        source: h.source,
        channel: h.channel,
        league_name: h.league_name,
        image_url: h.image_url,
        match_id: h.match_id,
        home_team_name: h.home_team_name,
        away_team_name: h.away_team_name,
      }));
    }
  }

  return NextResponse.json({
    id: f.id,
    date: f.scheduled_at,
    status: f.status,
    scheduled_at: f.scheduled_at,
    home_score: f.home_score,
    away_score: f.away_score,
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
    home_team: f.home_team,
    away_team: f.away_team,
    league: f.league,
    season: f.season,
    game_data: f.game_data,
    // 2026-09-22: HL stores period scores in game_data; surface them so
    // the page can render period-by-period without an extra HL fetch.
    period_scores: f.game_data?.period_scores || null,
    linked_articles: linkedArticles,
    linked_highlights: linkedHighlights,
  });
}
