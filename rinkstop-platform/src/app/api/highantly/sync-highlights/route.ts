// POST /api/highantly/sync-highlights
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_KEY = process.env.HIGHLANTLY_API_KEY || process.env.HIGHLIGHTLY_API_KEY || '879d8462-6431-41fd-aa73-151223ff1562';
const HOST = 'hockey-highlights-api.p.rapidapi.com';

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { count } = await supabase.from('highlightly_highlights').select('id', {count:'exact', head:true});
  return NextResponse.json({ highlights: count });
}

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const params = `date=${today}&limit=20`;
    
    console.log(`[sync-highlights] Calling hockey.highantly.net/highlights?${params}`);
    
    const response = await fetch(`https://hockey.highantly.net/highlights?${params}`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': HOST,
      },
    });
    
    const status = response.status;
    const text = await response.text();
    
    console.log(`[sync-highlights] Response status: ${status}, body preview: ${text.slice(0, 300)}`);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Highantly ${status}`,
        detail: text.slice(0, 200),
        status
      }, { status: 500 });
    }
    
    const data = JSON.parse(text);
    let highlights = [];
    if (Array.isArray(data)) highlights = data;
    else if (Array.isArray(data?.data)) highlights = data.data;
    
    if (highlights.length === 0) {
      return NextResponse.json({ success: true, message: 'no highlights', count: 0, today });
    }
    
    let inserted = 0;
    for (const h of highlights.slice(0, 50)) {
      const id = h.id || h.videoId;
      if (!id) continue;
      
      const { error } = await supabase.from('highlightly_highlights').upsert({
        id: String(id),
        title: h.title || 'Highlight',
        description: h.description || '',
        video_url: h.videoUrl || h.embedUrl || '',
        thumbnail_url: h.thumbnailUrl || '',
        date: h.date || today,
        league_id: String(h.leagueId || ''),
        league_name: h.leagueName || '',
        verified: h.type === 'VERIFIED',
        last_synced: new Date().toISOString(),
      }, { onConflict: 'id' });
      
      if (!error) inserted++;
    }
    
    return NextResponse.json({ success: true, synced: inserted, total: highlights.length, sample: highlights[0] });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
