import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Highlightly API (used as fallback if backup is empty/stale)
const NHL_BASE = 'https://nhl.highlightly.net';
const HOCKEY_BASE = 'https://hockey.highlightly.net';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY || '***REMOVED***';

// Supabase backup table (PRIMARY source — keeps working even if Highlightly goes down)
const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '***REMOVED***';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const homeTeamName = searchParams.get('homeTeamName');
  const awayTeamName = searchParams.get('awayTeamName');
  const matchId = searchParams.get('matchId');
  const date = searchParams.get('date');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const leagueName = searchParams.get('leagueName');
  const leagueId = searchParams.get('leagueId');
  const teamName = searchParams.get('teamName'); // matches home OR away
  const source = searchParams.get('source'); // 'youtube' | 'espn' | etc.
  const season = searchParams.get('season');
  const youtubeOnly = searchParams.get('youtubeOnly') === 'true' || source === 'youtube';
  const fallbackToApi = searchParams.get('fallback') !== 'false'; // default true
  
  // === STEP 1: Try backup table as PRIMARY ===
  const backupResult = await getHighlightsFromBackup({
    limit,
    offset,
    youtubeOnly,
    leagueName,
    leagueId,
    homeTeamName,
    awayTeamName,
    teamName,
    matchId,
    date,
    dateFrom,
    dateTo,
    season,
  });
  
  // If backup returned results, use them
  if (backupResult && backupResult.highlights && backupResult.highlights.length > 0) {
    return NextResponse.json(backupResult);
  }
  
  // === STEP 2: Backup is empty for this query — fall back to Highlightly API ===
  if (fallbackToApi) {
    const apiResult = await getHighlightsFromHighlightly({
      limit,
      offset,
      homeTeamName,
      awayTeamName,
      matchId,
      date,
      leagueName,
      youtubeOnly,
    });
    if (apiResult) return NextResponse.json(apiResult);
  }
  
  // Both sources returned nothing
  return NextResponse.json({
    highlights: [],
    pagination: { totalCount: 0, offset, limit },
    source: 'empty',
  });
}

async function getHighlightsFromBackup(opts: {
  limit: number;
  offset: number;
  youtubeOnly: boolean;
  leagueName?: string | null;
  leagueId?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  teamName?: string | null;
  matchId?: string | null;
  date?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  season?: string | null;
}) {
  try {
    const {
      limit, offset, youtubeOnly,
      leagueName, leagueId, homeTeamName, awayTeamName, teamName,
      matchId, date, dateFrom, dateTo, season
    } = opts;
    
    let query = supabaseAdmin
      .from('highlight_backups')
      .select('id, title, description, video_url, embed_url, image_url, source, channel, highlight_type, league_id, league_name, match_id, match_date, match_season, match_round, home_team_id, home_team_name, home_team_logo, away_team_id, away_team_name, away_team_logo', { count: 'exact' })
      .order('match_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (youtubeOnly) {
      query = query.eq('source', 'youtube');
    }
    
    if (leagueId) {
      query = query.eq('league_id', parseInt(leagueId));
    } else if (leagueName) {
      // Match either the simple league name or the JSON string from Highlightly
      query = query.or(`league_name.eq."${leagueName}",league_name.ilike.%${leagueName}%`);
    }
    
    if (homeTeamName) {
      query = query.ilike('home_team_name', `%${homeTeamName}%`);
    }
    
    if (awayTeamName) {
      query = query.ilike('away_team_name', `%${awayTeamName}%`);
    }
    
    if (teamName) {
      // Match home OR away
      query = query.or(`home_team_name.ilike.%${teamName}%,away_team_name.ilike.%${teamName}%`);
    }
    
    if (matchId) {
      query = query.eq('match_id', parseInt(matchId));
    }
    
    if (date) {
      // Match the day (single date)
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query = query.gte('match_date', start.toISOString()).lt('match_date', end.toISOString());
    } else {
      if (dateFrom) query = query.gte('match_date', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('match_date', new Date(dateTo).toISOString());
    }
    
    if (season) {
      query = query.eq('match_season', parseInt(season));
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Backup table error:', error);
      return null;
    }
    
    const highlights = (data || []).map(h => ({
      id: h.id,
      title: h.title,
      description: h.description || '',
      type: h.highlight_type,
      url: h.video_url,
      embedUrl: h.embed_url,
      imageUrl: h.image_url,
      source: h.source,
      channel: h.channel,
      match: {
        id: h.match_id,
        league: h.league_name,
        leagueId: h.league_id,
        season: h.match_season,
        date: h.match_date,
        round: h.match_round,
        homeTeam: h.home_team_name ? {
          id: h.home_team_id,
          name: h.home_team_name,
          displayName: h.home_team_name,
          abbreviation: '',
          logo: h.home_team_logo,
        } : null,
        awayTeam: h.away_team_name ? {
          id: h.away_team_id,
          name: h.away_team_name,
          displayName: h.away_team_name,
          abbreviation: '',
          logo: h.away_team_logo,
        } : null,
      },
    }));
    
    return {
      highlights,
      pagination: {
        totalCount: count || highlights.length,
        offset,
        limit,
      },
      source: 'backup',
    };
  } catch (error) {
    console.error('Backup fallback error:', error);
    return null;
  }
}

async function getHighlightsFromHighlightly(opts: {
  limit: number;
  offset: number;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  matchId?: string | null;
  date?: string | null;
  leagueName?: string | null;
  youtubeOnly: boolean;
}) {
  const { limit, offset, homeTeamName, awayTeamName, matchId, date, leagueName, youtubeOnly } = opts;
  
  const isNHL = !leagueName || leagueName.toUpperCase() === 'NHL' || leagueName.toUpperCase() === 'NHL/NCAAH';
  const BASE_URL = isNHL ? NHL_BASE : HOCKEY_BASE;
  const RAPIDAPI_HOST = isNHL ? 'nhl-ncaah-api.p.rapidapi.com' : 'hockey-highlights-api.p.rapidapi.com';
  
  const params = new URLSearchParams();
  params.append('limit', String(Math.min(limit, 5)));
  params.append('offset', String(offset));
  if (homeTeamName) params.append('homeTeamName', homeTeamName);
  if (awayTeamName) params.append('awayTeamName', awayTeamName);
  if (matchId) params.append('matchId', matchId);
  if (date) params.append('date', date);
  if (leagueName) params.append('leagueName', leagueName);
  
  try {
    const url = `${BASE_URL}/highlights?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      },
      next: { revalidate: 60 }
    });
    
    if (!res.ok) {
      console.log('Highlightly API failed, status:', res.status);
      return null;
    }
    
    const data = await res.json();
    
    let all = (data.data || []).map((h: any) => ({
      id: h.id,
      title: h.title,
      description: h.description || '',
      type: h.type,
      url: h.url,
      embedUrl: h.embedUrl,
      imageUrl: h.imgUrl,
      source: h.source,
      channel: h.channel,
      match: {
        id: h.match?.id,
        league: h.match?.league,
        leagueId: h.match?.leagueId,
        season: h.match?.season,
        date: h.match?.date,
        round: h.match?.round,
        homeTeam: h.match?.homeTeam ? {
          id: h.match.homeTeam.id,
          name: h.match.homeTeam.name,
          displayName: h.match.homeTeam.displayName,
          abbreviation: h.match.homeTeam.abbreviation,
          logo: h.match.homeTeam.logo,
        } : null,
        awayTeam: h.match?.awayTeam ? {
          id: h.match.awayTeam.id,
          name: h.match.awayTeam.name,
          displayName: h.match.awayTeam.displayName,
          abbreviation: h.match.awayTeam.abbreviation,
          logo: h.match.awayTeam.logo,
        } : null,
      },
    }));
    
    if (youtubeOnly) {
      all = all.filter((h: any) => h.source === 'youtube' || !!h.embedUrl);
    }
    
    return {
      highlights: all,
      pagination: {
        totalCount: data.pagination?.totalCount || all.length,
        offset,
        limit,
      },
      plan: data.plan,
      source: 'highlightly',
    };
  } catch (error) {
    console.error('Highlights API error:', error);
    return null;
  }
}
