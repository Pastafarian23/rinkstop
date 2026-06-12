import type { Metadata } from 'next';
import { teamsByDivision } from '@/lib/nhl-teams-canonical';
import { supabaseAdmin } from '@/lib/supabase';
import { NhlStanding } from '@/lib/nhl-data';
import DivisionView from '@/components/NhlDivisionView';

export const metadata: Metadata = {
  title: 'NHL Metropolitan Division | Teams, Records, Standings',
  description: 'NHL Metropolitan Division teams. Current standings and team pages.',
};

async function getLatestSeason(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('nhl_standings')
    .select('season')
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.season ?? null;
}

async function getDivisionStandings(teamNames: string[], season: string): Promise<NhlStanding[]> {
  const { data } = await supabaseAdmin
    .from('nhl_standings')
    .select('*')
    .eq('season', season)
    .in('team_name', teamNames)
    .order('rank', { ascending: true });
  return (data || []) as NhlStanding[];
}

export default async function MetropolitanPage() {
  const teams = teamsByDivision('Metropolitan');
  const teamNames = teams.map(t => t.name);
  const season = await getLatestSeason();
  const standings = season ? await getDivisionStandings(teamNames, season) : [];
  const standingsByName = Object.fromEntries(standings.map(s => [s.team_name, s]));
  return <DivisionView
    title="Metropolitan"
    teams={teams}
    standingsByName={standingsByName}
    season={season}
    accentColor="#1E3A5F"
  />;
}
