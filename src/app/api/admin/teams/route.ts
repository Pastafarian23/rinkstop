import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/teams
 * List all teams, paginated, with optional search + league filter.
 * Includes "wrong league_id" filter for finding data-quality issues.
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50', 10), 200);
  const search = searchParams.get('search')?.trim() || '';
  const leagueId = searchParams.get('leagueId') || '';
  const wrongLeague = searchParams.get('wrongLeague') === '1';

  let query = supabaseAdmin
    .from('teams')
    .select('id, name, city, country, league_id, slug, created_at, updated_at, leagues!teams_league_id_fkey(name, slug)', { count: 'exact' });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  query = query.order('name', { ascending: true });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all leagues for the filter dropdown
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name, slug')
    .order('name', { ascending: true });

  // For "wrong league_id" filter, we need to cross-check against Highlightly's authoritative list.
  // This is expensive, so do it only when requested.
  let wrongLeagueIds: Set<string> | null = null;
  if (wrongLeague) {
    const audit = await runLeagueAudit();
    wrongLeagueIds = new Set(audit.wrongTeamIds);
  }

  let filtered = data || [];
  if (wrongLeagueIds) {
    filtered = filtered.filter((t: any) => wrongLeagueIds!.has(t.id));
  }

  return NextResponse.json({
    teams: filtered,
    pagination: { page, pageSize, total: count || 0 },
    leagues: leagues || [],
  });
}

interface AuditResult {
  wrongTeamIds: string[];
  total: number;
}

async function runLeagueAudit(): Promise<AuditResult> {
  // Lightweight version: for each tracked league, fetch from Highlightly,
  // compare to DB teams by normalized name, return wrong-assignment ids.
  const HL_API_KEY = process.env.HIGHLIGHTLY_API_KEY;
  if (!HL_API_KEY) return { wrongTeamIds: [], total: 0 };

  const targets = [
    { hlId: 4188, leagueName: 'WHL' },
    { hlId: 3337, leagueName: 'OHL' },
    { hlId: 5039, leagueName: 'QMJHL' },
    { hlId: 50142, leagueName: 'AHL' },
    { hlId: 30569, leagueName: 'KHL' },
    { hlId: 49291, leagueName: 'NHL' },
  ];

  // Get all expected leagues
  const { data: leagues } = await supabaseAdmin.from('leagues').select('id, name');
  const leagueByName = new Map<string, string>((leagues || []).map((l: any) => [l.name.toLowerCase(), l.id]));

  // Get all team names currently in DB
  const { data: dbTeams } = await supabaseAdmin
    .from('teams')
    .select('id, name, league_id, leagues(name)');
  const allDbTeams = (dbTeams || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    dbLeagueId: t.league_id,
    dbLeagueName: t.leagues?.name || null,
  }));

  const wrong: string[] = [];

  for (const target of targets) {
    const expectedLeagueId = leagueByName.get(target.leagueName.toLowerCase());
    if (!expectedLeagueId) continue;

    try {
      const r = await fetch(`https://hockey.highlightly.net/teams?leagueId=${target.hlId}&limit=100`, {
        headers: {
          'x-rapidapi-key': HL_API_KEY,
          'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
          'User-Agent': 'Mozilla/5.0',
        },
      });
      if (!r.ok) continue;
      const json = await r.json();
      const hlNames = (json.data || []).map((t: any) => normalizeName(t.name));

      for (const db of allDbTeams) {
        const norm = normalizeName(db.name);
        if (hlNames.includes(norm) && db.dbLeagueId !== expectedLeagueId) {
          wrong.push(db.id);
        }
      }
    } catch {
      // skip
    }
  }

  return { wrongTeamIds: wrong, total: allDbTeams.length };
}

function normalizeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['''`]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
