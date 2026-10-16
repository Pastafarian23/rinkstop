import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const sb = await import('@/lib/supabase').then(m => m.supabaseAdmin);
  // Try team_workspaces
  const { data: tw, error: twErr } = await sb.from('team_workspaces').select('id,name,slug').limit(3);
  // Try teams
  const { data: t, error: tErr } = await sb.from('teams').select('id,name').limit(3);

  return NextResponse.json({
    team_workspaces: { data: tw, error: twErr },
    teams: { data: t, error: tErr },
    timestamp: new Date().toISOString(),
  });
}
