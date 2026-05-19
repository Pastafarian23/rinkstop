// POST /api/highantly/sync-highlights
// Fetches video highlights from Highantly API and syncs to Supabase

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;
const RAPIDAPI_HOST = 'hockey-highlights-api.p.rapidapi.com';

let apiCallsToday = 0;

async function fetchHighantly(endpoint: string): Promise<any> {
  if (apiCallsToday >= 7400) throw new Error('API limit');
  
  const response = await fetch(`https://hockey.highantly.net${endpoint}`, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_API_KEY!,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  });
  
  apiCallsToday++;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Highantly ${response.status}: ${text.slice(0,100)}`);
  }
  return response.json();
}

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { count } = await supabase.from('highlightly_highlights').select('id', {count:'exact', head:true});
  return NextResponse.json({ highlights: count, apiCallsToday });
}

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  try {
    // Try different endpoint formats
    let endpoint = `/highlights?limit=${limit}&leagueId=${leagueId || ''}`;
    
    let data;
    try {
      data = await fetchHighantly(endpoint);
    } catch(e: any) {
      // Try alternative format
      if (e.message.includes('400')) {
        endpoint = `/highlights?lmt=${limit}`;
        data = await fetchHighantly(endpoint);
      } else {
        throw e;
      }
    }
    
    // Handle both {data: [...]} and [...] response formats
    let highlights = [];
    if (Array.isArray(data)) {
      highlights = data;
    } else if (data?.data && Array.isArray(data.data)) {
      highlights = data.data;
    } else if (data?.highlights && Array.isArray(data.highlights)) {
      highlights = data.highlights;
    }
    
    let inserted = 0;
    for (const h of highlights) {
      // Handle different field naming conventions
      const id = h.id || h.videoId || h.externalId;
      const title = h.title || h.name || 'Highlight';
      const description = h.description || h.summary || '';
      const video_url = h.videoUrl || h.url || h.video || '';
      const thumbnail_url = h.thumbnailUrl || h.thumbnail || h.image || '';
      const date = h.date || h.gameDate || new Date().toISOString();
      const league_id = h.leagueId || h.league?.id || leagueId || '';
      const league_name = h.leagueName || h.league?.name || h.league || '';
      const country_code = h.countryCode || h.country || '';
      const team_ids = h.teamIds || h.teams || [];
      const tags = h.tags || [];
      const verified = h.verified || false;
      
      if (!id || !title) continue;
      
      const { error } = await supabase.from('highlightly_highlights').upsert({
        id: String(id),
        title,
        description,
        video_url,
        thumbnail_url,
        date,
        league_id: String(league_id),
        league_name,
        country_code,
        team_ids,
        tags,
        verified,
        last_synced: new Date().toISOString(),
      }, { onConflict: 'id' });
      
      if (!error) inserted++;
    }
    
    return NextResponse.json({ 
      success: true, 
      synced: inserted, 
      total: highlights.length, 
      apiCalls: apiCallsToday,
      sample: highlights[0] || null
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
