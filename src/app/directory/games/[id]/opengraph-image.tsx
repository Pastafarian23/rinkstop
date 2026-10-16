import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = 'Game on RinkStop';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG_DARK = '#0D1117';
const BRAND_RED = '#C8102E';
const GOLD = '#FFB81C';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const DIVIDER = 'rgba(255,255,255,0.08)';

/** Format date like "Oct 4, 2024" */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format time like "7:00 PM ET" */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

export default async function Image({ params }: { params: { id: string } }) {
  const { id } = params;

  let homeName = 'Home Team';
  let awayName = 'Away Team';
  let homeLogo = '';
  let awayLogo = '';
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let status = 'scheduled';
  let scheduledAt = '';
  let leagueName = '';
  let leagueSlug = '';
  let isCompleted = false;

  try {
    const { data: game } = await supabaseAdmin
      .from('fixtures')
      .select(`
        id,
        home_score,
        away_score,
        scheduled_at,
        status,
        league_id,
        game_data,
        home_team_id,
        away_team_id,
        league:leagues!fixtures_league_id_fkey(id, name, slug),
        home_team:teams!fixtures_home_team_id_fkey(id, name, slug, logo_url),
        away_team:teams!fixtures_away_team_id_fkey(id, name, slug, logo_url)
      `)
      .eq('id', id)
      .maybeSingle();

    if (game) {
      scheduledAt = game.scheduled_at || '';
      status = game.status || 'scheduled';
      isCompleted = status === 'completed';
      leagueName = (game.league as any)?.name || '';
      leagueSlug = (game.league as any)?.slug || '';
      homeName = (game.home_team as any)?.name || homeName;
      awayName = (game.away_team as any)?.name || awayName;
      homeLogo = (game.home_team as any)?.logo_url || '';
      awayLogo = (game.away_team as any)?.logo_url || '';
      homeScore = game.home_score;
      awayScore = game.away_score;
    }
  } catch {
    // Fall through with defaults
  }

  const scoreDisplay = isCompleted && homeScore !== null && awayScore !== null;
  const dateStr = scheduledAt ? formatDate(scheduledAt) : '';
  const timeStr = scheduledAt ? formatTime(scheduledAt) : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: BG_DARK,
          display: 'flex',
          flexDirection: 'column',
          color: TEXT_PRIMARY,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '6px',
            background: `linear-gradient(90deg, ${BRAND_RED} 0%, ${GOLD} 60%, ${BRAND_RED} 100%)`,
            display: 'flex',
          }}
        />

        {/* League tag — top left */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {leagueName && (
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: GOLD,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {leagueName}
            </div>
          )}
        </div>

        {/* Center score area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '0px',
            padding: '0 40px',
          }}
        >
          {/* Away team */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              flex: 1,
              maxWidth: '340px',
            }}
          >
            {awayLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={awayLogo}
                alt={awayName}
                height={120}
                style={{ maxHeight: '120px', objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
              />
            ) : (
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: TEXT_MUTED,
                }}
              >
                {awayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: TEXT_PRIMARY,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {awayName}
            </div>
            {scoreDisplay && (
              <div
                style={{
                  fontSize: '96px',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: awayScore! > homeScore! ? GOLD : TEXT_PRIMARY,
                  letterSpacing: '-0.03em',
                }}
              >
                {awayScore}
              </div>
            )}
          </div>

          {/* VS divider */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 32px',
              gap: '12px',
            }}
          >
            {scoreDisplay ? (
              <div style={{ fontSize: '32px', fontWeight: 800, color: TEXT_MUTED }}>—</div>
            ) : (
              <div style={{ fontSize: '40px', fontWeight: 800, color: TEXT_MUTED }}>VS</div>
            )}
            <div style={{ width: '2px', height: '48px', background: DIVIDER }} />
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: isCompleted ? BRAND_RED : TEXT_MUTED,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {isCompleted ? 'FINAL' : 'UPCOMING'}
            </div>
          </div>

          {/* Home team */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              flex: 1,
              maxWidth: '340px',
            }}
          >
            {homeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={homeLogo}
                alt={homeName}
                height={120}
                style={{ maxHeight: '120px', objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
              />
            ) : (
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: TEXT_MUTED,
                }}
              >
                {homeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: TEXT_PRIMARY,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {homeName}
            </div>
            {scoreDisplay && (
              <div
                style={{
                  fontSize: '96px',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: homeScore! > awayScore! ? GOLD : TEXT_PRIMARY,
                  letterSpacing: '-0.03em',
                }}
              >
                {homeScore}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: date/time + RinkStop branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 48px',
            borderTop: `1px solid ${DIVIDER}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {dateStr && (
              <div style={{ fontSize: '22px', fontWeight: 700, color: TEXT_PRIMARY }}>
                {dateStr}
              </div>
            )}
            {timeStr && !isCompleted && (
              <div style={{ fontSize: '18px', color: TEXT_MUTED }}>
                {timeStr}
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: TEXT_MUTED,
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            <span style={{ color: BRAND_RED }}>RINK</span>
            <span>STOP</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
