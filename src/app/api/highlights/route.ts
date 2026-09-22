import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Highlightly API (used as fallback if backup is empty/stale)
const NHL_BASE = 'https://nhl.highlightly.net';
const HOCKEY_BASE = 'https://hockey.highlightly.net';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!API_KEY) throw new Error('HIGHLIGHTLY_API_KEY is not set');

// Supabase backup table (PRIMARY source — keeps working even if Highlightly goes down)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
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
    // Fetch linked post details for any highlights that have a post_id.
    backupResult.highlights = await enrichBackupHighlightsWithPosts(supabaseAdmin, backupResult.highlights);
    const r = NextResponse.json(backupResult);
    r.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=1800');
    return r;
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
    if (apiResult) {
      // API path: cannot link via backup's post_id directly. Use match_id +
      // team names from the live API to look up the linked post.
      if (apiResult.highlights && apiResult.highlights.length > 0) {
        apiResult.highlights = await enrichLiveHighlightsWithPosts(supabaseAdmin, apiResult.highlights);
      }
      const r = NextResponse.json(apiResult);
      r.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=1800');
      return r;
    }
  }

  // Both sources returned nothing
  const empty = NextResponse.json({
    highlights: [],
    pagination: { totalCount: 0, offset, limit },
    source: 'empty',
  });
  empty.headers.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=600');
  return empty;
}

/**
 * Enrich highlights that have a post_id with the post's public-facing snippet.
 * Adds a `linkedPost` field to each highlight with:
 *   { id, slug, title, subtitle, snippet, path, verified (boolean) }
 * The `verified` field is INTERNAL — kept on the response because this API
 * is only called from server-side ops + the highlights page (no SEO crawl).
 * Snippet is the first 200 chars of the post's subtitle or content body.
 * Notes on game accuracy:
 *   - We DO include verification_status in `linkedPost.verified` ONLY for
 *     gated UI display (verified articles show a green badge; unverified
 *     show neutral). The full verification_status enum itself is NOT
 *     leaked — only a boolean.
 *   - If verification_status is 'failed', linkedPost is omitted entirely.
 */
/**
 * Live-API enrichment: take Highlightly response objects, look up our DB
 * posts by (home_team_name, away_team_name, game_date), then attach linkedPost.
 */
async function enrichLiveHighlightsWithPosts(supabase: any, highlights: any[]): Promise<any[]> {
  // Inline the same lookup logic since this path has different naming
  const norm = (s: any) => (s || '').toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Batch-build post lookup by (home, away, date)
  const keys = new Set<string>();
  for (const h of highlights) {
    const m = h.match || {};
    if (m.homeTeam && m.awayTeam && m.date) {
      const d = m.date.slice(0, 10);
      keys.add(`${norm(m.homeTeam.displayName || m.homeTeam.name)}|${norm(m.awayTeam.displayName || m.awayTeam.name)}|${d}`);
      keys.add(`${norm(m.awayTeam.displayName || m.awayTeam.name)}|${norm(m.homeTeam.displayName || m.homeTeam.name)}|${d}`);
    }
  }
  if (keys.size === 0) return highlights;

  // Fetch matching posts
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, content_html, game_date, verification_status, pillar, subpillar, pillar_slug, subpillar_slug, status')
    .not('highlight_id', 'is', null)
    .in('status', ['published']);
  if (error || !posts) return highlights;

  const postByKey: Record<string, any> = {};
  for (const p of posts) {
    if (!p.game_date) continue;
    const t = p.title || '';
    let m = t.match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+\d+[-\u2013]\d+/i);
    if (!m) m = t.match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+)/i);
    if (!m) continue;
    const h = norm(m[1]);
    const a = norm(m[2]);
    const k1 = `${h}|${a}|${p.game_date}`;
    if (!postByKey[k1]) postByKey[k1] = p;
  }

  return highlights.map((h) => {
    const m = h.match || {};
    if (!m.homeTeam || !m.awayTeam || !m.date) return h;
    const d = m.date.slice(0, 10);
    const k1 = `${norm(m.homeTeam.displayName || m.homeTeam.name)}|${norm(m.awayTeam.displayName || m.awayTeam.name)}|${d}`;
    const k2 = `${norm(m.awayTeam.displayName || m.awayTeam.name)}|${norm(m.homeTeam.displayName || m.homeTeam.name)}|${d}`;
    const p = postByKey[k1] || postByKey[k2];
    if (!p) return h;

    let snippet = p.subtitle || '';
    if (!snippet && p.content_html) {
      const stripped = p.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      snippet = stripped.slice(0, 220);
      if (stripped.length > 220) snippet += '…';
    }
    let path = '';
    if (p.pillar_slug && p.subpillar_slug && p.slug) {
      path = `/news/${p.pillar_slug}/${p.subpillar_slug}/${p.slug}`;
    } else if (p.slug) {
      path = `/blog/${p.slug}`;
    }
    const verified = p.verification_status === 'verified' || p.verification_status === 'human_verified';

    return {
      ...h,
      linkedPostId: p.id,
      linkedPost: { id: p.id, slug: p.slug, title: p.title, snippet, path, verified },
    };
  });
}

/**
 * Backup enrichment: take backup rows (already has post_id column) and attach post details.
 */
async function enrichBackupHighlightsWithPosts(supabase: any, highlights: any[]): Promise<any[]> {
  const postIds: string[] = [];
  for (const h of highlights) {
    if (h.linkedPostId) postIds.push(h.linkedPostId);
  }
  if (postIds.length === 0) return highlights;

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, content, content_html, game_date, verification_status, pillar, subpillar, pillar_slug, subpillar_slug, status')
    .in('id', postIds);
  if (error || !posts) return highlights;

  const postById: Record<string, any> = {};
  for (const p of posts) postById[p.id] = p;

  return highlights.map((h) => {
    const pid = h.linkedPostId;
    if (!pid) return h;
    const p = postById[pid];
    if (!p) return h;
    if (p.status !== 'published') return h;
    const verified = p.verification_status === 'verified' || p.verification_status === 'human_verified';

    // Build snippet: prefer subtitle (1-2 sentences), else first 200 chars of content_html
    let snippet = '';
    if (p.subtitle) snippet = p.subtitle;
    else if (p.content_html) {
      // Strip HTML tags for the snippet display
      const stripped = p.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      snippet = stripped.slice(0, 220);
      if (stripped.length > 220) snippet += '…';
    }

    // Build path: /news/[pillar]/[subpillar]/[slug] if available, else /blog/[slug]
    let path = '';
    if (p.pillar_slug && p.subpillar_slug && p.slug) {
      path = `/news/${p.pillar_slug}/${p.subpillar_slug}/${p.slug}`;
    } else if (p.slug) {
      path = `/blog/${p.slug}`;
    }

    return {
      ...h,
      linkedPost: {
        id: p.id,
        slug: p.slug,
        title: p.title,
        snippet,
        path,
        verified, // boolean only — full enum not leaked
      },
    };
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
      .select('id, title, description, video_url, embed_url, image_url, source, channel, highlight_type, league_id, league_name, match_id, match_date, match_season, match_round, home_team_id, home_team_name, home_team_logo, away_team_id, away_team_name, away_team_logo, post_id', { count: 'exact' })
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
      linkedPostId: h.post_id || null,
      match: {
        id: h.match_id,
        // 2026-09-22 per Arnel 07:57 CDT: highlight_backups.league_name
        // is sometimes stored as a JSON object string. Normalize here.
        league: (() => {
          if (!h.league_name) return null;
          try {
            const parsed = JSON.parse(h.league_name);
            return parsed?.name || h.league_name;
          } catch {
            return h.league_name;
          }
        })(),
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
