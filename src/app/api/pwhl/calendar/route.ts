import { NextRequest, NextResponse } from 'next/server';
import { PWHL_FRANCHISES } from '@/lib/pwhl-franchises';
import { getPwhlSchedule, gamesForTeam, teamName } from '@/lib/pwhl-schedule';
import { buildPwhlIcs } from '@/lib/pwhl-calendar';

/**
 * Calendar feed (iCalendar) for the official 2026-27 PWHL schedule.
 *   /api/pwhl/calendar                          every game (12 preseason + 180 regular season)
 *   /api/pwhl/calendar?team=toronto-sceptres    one franchise (canonical slug)
 * Public data only; identical for every visitor, so it is cacheable.
 */
export const revalidate = 600;

export async function GET(request: NextRequest) {
  const team = request.nextUrl.searchParams.get('team');
  if (team && !PWHL_FRANCHISES.some((f) => f.slug === team)) {
    return NextResponse.json({ error: 'unknown team' }, { status: 404 });
  }
  const sched = await getPwhlSchedule();
  const games = team ? gamesForTeam(sched.games, team) : sched.games;
  const name = team ? teamName(team) + ' 2026-27' : 'PWHL 2026-27';
  const body = buildPwhlIcs(games, { name });
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="' + (team || 'pwhl') + '-2026-27.ics"',
      'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
