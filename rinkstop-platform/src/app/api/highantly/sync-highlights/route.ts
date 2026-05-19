// POST /api/highantly/sync-highlights
// Fetches video highlights from Highantly API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HIGHLIGHTLY_API_KEY = process.env.HIGHLANTLY_API_KEY || process.env.HIGHLIGHTLY_API_KEY;
const RAPIDAPI_HOST = 'hockey-highlights-api.p.rapidapi.com';

let apiCallsToday = 0;

async function fetchHighantly(endpoint: string): Promise<any> {
  if (apiCallsToday >= 7400) throw new Error('API limit');
  
  const url = `https://hockey.highantly.net${endpoint}`;
  console.log(`[Highantly] Calling: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_API_KEY || '879d8462-6431-41fd-aa73-151223ff1562',
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  });
  
  apiCallsToday++;
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Highantly ${response.status}: ${text.slice(0,200)}`);
  }
  return JSON.parse(text);
}

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { count } = await supabase.from('highlightly_highlights').select('id', {count:'exact', head:true});
  return NextResponse.json({ highlights: count, apiCallsToday });
}

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Try simplest endpoint first - no params
    let data;
    let endpoint = '/highlights';
    
    try {
      data = await fetchHighantly(endpoint);
    } catch(e: any) {
      // Try with query params
      const attempts = [
        '/highlights?limit=10',
        '/highlights?lmt=10', 
        '/highlights?count=10',
        '/highlights?limit=10&offset=0',
      ];
      
      for (const ep of attempts) {
        try {
          data = await fetchHighantly(ep);
          break;
        } catch(e2: any) {
          if (attempts.indexOf(ep) === attempts.length - 1) throw e2;
        }
      }
    }
    
    // Handle various response formats
    let highlights = [];
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) highlights = data;
      else if (Array.isArray(data.data)) highlights = data.data;
      else if (Array.isArray(data.highlights)) highlights = data.highlights;
      else if (Array.isArray(data.videos)) highlights = data.videos;
      else if (Array.isArray(data.results)) highlights = data.results;
    }
    
    if (highlights.length === 0) {
      return NextResponse.json({ 
        error: 'No highlights found', 
        dataKeys: data ? Object.keys(data) : [],
        data: data ? JSON.stringify(data).slice(0, 500) : null
      }, { status: 200 });
    }
    
    let inserted = 0;
    for (const h of highlights.slice(0, 50)) {
      const id = h.id || h.videoId || h.externalId || h.external_id;
      if (!id) continue;
      
      const { error } = await supabase.from('highlightly_highlights').upsert({
        id: String(id),
        title: h.title || h.name || 'Highlight',
        description: h.description || h.summary || '',
        video_url: h.videoUrl || h.url || h.video_url || h.video || '',
        thumbnail_url: h.thumbnailUrl || h.thumbnail || h.image || '',
        date: h.date || h.gameDate || new Date().toISOString(),
        league_id: String(h.leagueId || h.league_id || ''),
        league_name: h.leagueName || h.league_name || h.league || '',
        country_code: h.countryCode || h.country_code || '',
        team_ids: h.teamIds || h.team_ids || [],
        tags: h.tags || [],
        verified: h.verified || false,
        last_synced: new Date().toISOString(),
      }, { onConflict: 'id' });
      
      if (!error) inserted++;
    }
    
    return NextResponse.json({ 
      success: true, 
      synced: inserted, 
      total: highlights.length,
      sample: highlights[0] || null
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
