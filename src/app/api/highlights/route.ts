import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Fix for highlights batch loop - ensure youtubeOnly filter applied
const NHL_BASE = 'https://nhl.highlightly.net';
const HOCKEY_BASE = 'https://hockey.highlightly.net';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY || '***REMOVED***';

// Supabase client for backup fallback
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
  const leagueName = searchParams.get('leagueName');
  const youtubeOnly = searchParams.get('youtubeOnly') === 'true';
  
  // Determine which API base to use based on league
  const isNHL = !leagueName || leagueName.toUpperCase() === 'NHL' || leagueName.toUpperCase() === 'NHL/NCAAH';
  const BASE_URL = isNHL ? NHL_BASE : HOCKEY_BASE;
  const RAPIDAPI_HOST = isNHL ? 'nhl-ncaah-api.p.rapidapi.com' : 'hockey-highlights-api.p.rapidapi.com';
  
  // Build query params
  const params = new URLSearchParams();
  params.append('limit', String(Math.min(limit, 5))); // Highlightly fails with limit > 5
  params.append('offset', String(offset));
  if (homeTeamName) params.append('homeTeamName', homeTeamName);
  if (awayTeamName) params.append('awayTeamName', awayTeamName);
  if (matchId) params.append('matchId', matchId);
  if (date) params.append('date', date);
  if (leagueName) params.append('leagueName', leagueName);
  
  try {
    // Try Highlightly API first
    const url = `${BASE_URL}/highlights?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      },
      next: { revalidate: 60 }
    });
    
    if (res.ok) {
      const data = await res.json();
      
      // Transform Highlightly format to our format
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

      // Filter to YouTube-only if requested
      if (youtubeOnly) {
        all = all.filter((h: any) => h.source === 'youtube' || !!h.embedUrl);
      }

      // Paginate (simulate higher limits by fetching multiple offset batches)
      if (false) {
        const allHighlights: any[] = [...all];
        const batchesNeeded = Math.ceil(limit / 5) - 1;
        
        for (let i = 1; i <= batchesNeeded; i++) {
          const nextOffset = offset + (i * 5);
          const batchParams = new URLSearchParams(params.toString().replace(`offset=${offset}`, `offset=${nextOffset}`));
          const batchUrl = `${BASE_URL}/highlights?${batchParams.toString()}`;
          
          try {
            const batchRes = await fetch(batchUrl, {
              headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
              },
              next: { revalidate: 60 }
            });
            
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              const batch = (batchData.data || []).map((h: any) => ({
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
              
              if (true) {
                batch = batch.filter((h: any) => h.source === 'youtube' || !!h.embedUrl);
              }
              
              allHighlights.push(...batch);
            }
          } catch {
            // Continue with what we have
          }
        }
        
        all = allHighlights.slice(0, limit);
      }

      return NextResponse.json({
        debug: all.length,
        test: "hello",
        highlights: all,
        pagination: {
          totalCount: data.pagination?.totalCount || all.length,
          offset,
          limit,
        },
        plan: data.plan,
        source: 'highlightly',
      });
    }
    
    // API failed - fall back to backup table
    console.log('Highlightly API failed, falling back to backup table');
    return getHighlightsFromBackup(limit, offset, youtubeOnly, leagueName);
    
  } catch (error) {
    console.error('Highlights API error:', error);
    // Fall back to backup table on any error
    return getHighlightsFromBackup(limit, offset, youtubeOnly, leagueName);
  }
}

async function getHighlightsFromBackup(limit: number, offset: number, youtubeOnly: boolean, leagueName?: string | null) {
  try {
    let query = supabaseAdmin
      .from('highlight_backups')
      .select('id, title, description, video_url, embed_url, image_url, source, channel, highlight_type, league_name, match_date, match_season, match_round, home_team_id, home_team_name, home_team_logo, away_team_id, away_team_name, away_team_logo', { count: 'exact' })
      .order('match_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (youtubeOnly) {
      query = query.eq('source', 'youtube');
    }
    
    if (leagueName) {
      query = query.eq('league_name', leagueName);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Backup table error:', error);
      return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 });
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
        id: null,
        league: h.league_name,
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
    
    return NextResponse.json({
      highlights,
      pagination: {
        totalCount: count || highlights.length,
        offset,
        limit,
      },
      source: 'backup',
    });
  } catch (error) {
    console.error('Backup fallback error:', error);
    return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 });
  }
}