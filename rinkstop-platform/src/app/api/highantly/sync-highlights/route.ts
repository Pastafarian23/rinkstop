// POST /api/highantly/sync-highlights
// Fetches video highlights from Highantly API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HIGHLIGHTLY_API_KEY = process.env.HIGHLANTLY_API_KEY || process.env.HIGHLIGHTLY_API_KEY || '879d8462-6431-41fd-aa73-151223ff1562';
const RAPIDAPI_HOST = 'hockey-highlights-api.p.rapidapi.com';
const HIGHLIGHTLY_BASE = 'https://hockey.highantly.net';

async function fetchHighantly(endpoint: string): Promise<any> {
  const url = `${HIGHLIGHTLY_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_API_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Highantly ${response.status}: ${text.slice(0,200)}`);
  }
  return response.json();
}

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { count } = await supabase.from('highlightly_highlights').select('id', {count:'exact', head:true});
  return NextResponse.json({ highlights: count });
}

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const teamId = searchParams.get('teamId');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  try {
    // Primary parameter is REQUIRED - use date as default
    const params = new URLSearchParams();
    params.append('date', date);
    if (leagueId) params.append('leagueId', leagueId);
    if (teamId) params.append('teamId', teamId);
    params.append('limit', '20');
    
    const data = await fetchHighantly(`/highlights?${params.toString()}`);
    
    let highlights = [];
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) highlights = data;
      else if (Array.isArray(data.data)) highlights = data.data;
      else if (Array.isArray(data.highlights)) highlights = data.highlights;
    }
    
    if (highlights.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No highlights for this date',
        date,
        count: 0
      });
    }
    
    let inserted = 0;
    for (const h of highlights) {
      const id = h.id || h.videoId || h.externalId;
      if (!id) continue;
      
      const { error } = await supabase.from('highlightly_highlights').upsert({
        id: String(id),
        title: h.title || h.name || 'Highlight',
        description: h.description || h.summary || '',
        video_url: h.videoUrl || h.url || h.video_url || h.embedUrl || '',
        thumbnail_url: h.thumbnailUrl || h.thumbnail || h.image || '',
        date: h.date || h.gameDate || date,
        league_id: String(h.leagueId || leagueId || ''),
        league_name: h.leagueName || h.league || '',
        country_code: h.countryCode || h.country_code || '',
        team_ids: h.teamIds || h.team_ids || [],
        tags: h.tags || [],
        verified: h.type === 'VERIFIED' || h.verified === true,
        last_synced: new Date().toISOString(),
      }, { onConflict: 'id' });
      
      if (!error) inserted++;
    }
    
    return NextResponse.json({ 
      success: true, 
      synced: inserted, 
      total: highlights.length,
      date
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
