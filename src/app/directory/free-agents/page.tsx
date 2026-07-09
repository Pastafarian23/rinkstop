import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import FreeAgentsIndexClient from './FreeAgentsIndexClient';

interface FreeAgentRow {
  user_id: string;
  display_name: string | null;
  username: string | null;
  free_agent_status: string;
  free_agent_position: string | null;
  free_agent_skill_level: string | null;
  free_agent_radius_km: number | null;
  free_agent_notes: string | null;
  free_agent_show_location: boolean | null;
  free_agent_updated_at: string | null;
  location: string | null;
}

export const metadata: Metadata = {
  title: 'Free Agents — Find Hockey Players Near You',
  description:
    'Browse hockey free agents looking for teams, sub opportunities, or pickup games. Search by position, skill level, and radius. Powered by RinkStop.',
  // noindex until we have meaningful content — prevents empty pages from polluting search.
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://rinkstop.com/directory/free-agents' },
};

// Server-component fetch; failure → empty list, never throw.
async function loadFreeAgents(): Promise<FreeAgentRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, username, free_agent_status, free_agent_position, free_agent_skill_level, free_agent_radius_km, free_agent_notes, free_agent_show_location, free_agent_updated_at, location')
      .in('free_agent_status', ['looking', 'sub_needed_today'])
      .order('free_agent_updated_at', { ascending: false })
      .limit(200);
    return (data as FreeAgentRow[]) ?? [];
  } catch (e) {
    console.error('[directory/free-agents] load failed:', e);
    return [];
  }
}

export default async function FreeAgentsIndexPage() {
  const rows = await loadFreeAgents();
  return <FreeAgentsIndexClient rows={rows} />;
}
