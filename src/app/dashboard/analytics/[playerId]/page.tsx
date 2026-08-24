import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { getUserTier } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';

export const dynamic = 'force-dynamic';

interface SeasonRow {
  season: string;
  season_type: string;
  games_played: number | null;
  goals: number | null;
  assists: number | null;
  points: number | null;
  penalty_minutes: number | null;
  plus_minus: number | null;
  wins: number | null;
  losses: number | null;
  overtime_losses: number | null;
  saves: number | null;
  save_percentage: number | null;
  goals_against_average: number | null;
  shutouts: number | null;
}

interface Milestone {
  title: string;
  description: string | null;
  achieved_at: string | null;
}

interface Counts {
  achievements: number;
  documents: number;
  memberships: number;
}

function StatName({ label }: { label: string }) {
  return (
    <span
      style={{
        color: 'rgba(255,255,255,0.45)',
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
  );
}

function BarCell({
  label,
  value,
  max,
  accent,
}: {
  label: string;
  value: number | null;
  max: number;
  accent: string;
}) {
  if (value === null || value === undefined) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <StatName label={label} />
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>—</div>
      </div>
    );
  }
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <StatName label={label} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            flex: 1,
            height: 6,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: accent, borderRadius: 3 }} />
        </div>
        <span
          style={{
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            minWidth: 32,
            textAlign: 'right',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default async function PlayerAnalyticsPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const session = await auth();
  if (!session?.userId) redirect('/login');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  // Tier gate: Hockey Passport Plus+ OR Business Listing+
  const tier = await getUserTier(userId);
  if (
    !tierAtLeastSameTrack(tier, 'identity_plus') &&
    !tierAtLeastSameTrack(tier, 'business_listing')
  ) {
    redirect('/pricing');
  }

  // Resolve player row
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug, highlightly_id')
    .eq('id', playerId)
    .maybeSingle();
  if (!player) notFound();

  // Ownership: viewer is allowed if (a) they manage this player via
  // managed_profiles OR (b) players.user_id = their Clerk id (self-managed).
  const [managedRow, selfRow] = await Promise.all([
    supabaseAdmin
      .from('managed_profiles')
      .select('id')
      .eq('manager_user_id', userId)
      .eq('profile_id', playerId)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('players')
      .select('id')
      .eq('id', playerId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ]);
  const isManaged = !!managedRow.data;
  const isSelf = !!selfRow.data;
  if (!isManaged && !isSelf) {
    redirect('/dashboard');
  }

  // Highlightly career stats (may be empty for youth/domestic players)
  const highlightlyId = player.highlightly_id || playerId;
  const { data: stats } = await supabaseAdmin
    .from('highlightly_career_stats')
    .select(
      'season, season_type, games_played, goals, assists, points, penalty_minutes, plus_minus, wins, losses, overtime_losses, goals_against, saves, save_percentage, goals_against_average, shutouts'
    )
    .eq('player_id', highlightlyId)
    .order('season', { ascending: true });
  const statsRows = (stats || []) as SeasonRow[];

  // Player achievements (milestones)
  const { data: achievements } = await supabaseAdmin
    .from('player_achievements')
    .select('title, description, achieved_at')
    .eq('player_id', playerId)
    .order('achieved_at', { ascending: true });
  const milestones = (achievements || []) as Milestone[];

  // Counts — team memberships query branches on viewer mode
  const membershipsQuery = isManaged
    ? supabaseAdmin
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('is_minor', true)
        .eq('parent_user_id', userId)
        .is('left_at', null)
    : supabaseAdmin
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('left_at', null);

  const [achievementsCountRes, documentsCountRes, membershipsCountRes] = await Promise.all([
    supabaseAdmin
      .from('player_achievements')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', playerId),
    supabaseAdmin
      .from('player_documents')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .neq('status', 'archived'),
    membershipsQuery,
  ]);

  const counts: Counts = {
    achievements: achievementsCountRes.count ?? 0,
    documents: documentsCountRes.count ?? 0,
    memberships: membershipsCountRes.count ?? 0,
  };

  const playerName =
    `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Player';

  // Bar maxes for relative scaling
  const maxG = Math.max(...statsRows.map((s) => s.goals ?? 0), 1);
  const maxA = Math.max(...statsRows.map((s) => s.assists ?? 0), 1);
  const maxPts = Math.max(...statsRows.map((s) => s.points ?? 0), 1);
  const maxPims = Math.max(...statsRows.map((s) => s.penalty_minutes ?? 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 920 }}>
      {/* Header — player-centric, no family framing */}
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '2rem' }} aria-hidden>
          📊
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.5rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}
          >
            {playerName.toUpperCase()}&rsquo;S ANALYTICS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            {isSelf
              ? 'Your career stats, achievements, and team history.'
              : 'Season trends, achievements, and team history.'}
          </p>
        </div>
        {player.slug ? (
          <Link
            href={`/directory/players/${player.slug}`}
            style={{
              padding: '0.45rem 0.9rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: 6,
              fontSize: '0.8rem',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            View public profile →
          </Link>
        ) : null}
      </div>

      {/* RinkStop history — works for any viewer */}
      <section
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem',
        }}
      >
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 1rem',
          }}
        >
          RINKSTOP HISTORY
        </h2>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.25rem',
            background: '#0a0a0a',
            border: '1px solid #141414',
            borderRadius: 10,
            padding: '1rem 1.1rem',
          }}
        >
          {[
            { label: 'Achievements', value: counts.achievements },
            { label: 'Documents', value: counts.documents },
            { label: 'Teams', value: counts.memberships },
          ].map((c) => (
            <div key={c.label} style={{ minWidth: 72 }}>
              <StatName label={c.label} />
              <div
                style={{
                  color: '#fff',
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                }}
              >
                {c.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
                {c.value === 0 ? 'none yet' : 'on record'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Highlightly career stats — only when present */}
      {statsRows.length > 0 ? (
        <section
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 1rem',
            }}
          >
            CAREER STATS
          </h2>

          {/* Aggregates */}
          <div
            style={{
              background: '#0a0a0a',
              border: '1px solid #141414',
              borderRadius: 10,
              padding: '1rem 1.1rem',
              marginBottom: '1rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            {[
              { label: 'Goals', value: statsRows.reduce((s, r) => s + (r.goals ?? 0), 0) },
              { label: 'Assists', value: statsRows.reduce((s, r) => s + (r.assists ?? 0), 0) },
              { label: 'Points', value: statsRows.reduce((s, r) => s + (r.points ?? 0), 0) },
              { label: 'PIMs', value: statsRows.reduce((s, r) => s + (r.penalty_minutes ?? 0), 0) },
            ].map((agg) => (
              <div key={agg.label} style={{ minWidth: 72 }}>
                <StatName label={agg.label} />
                <div
                  style={{
                    color: '#fff',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                  }}
                >
                  {agg.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
                  {statsRows.length} season{statsRows.length === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>

          {/* Per-season */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {statsRows.map((s) => (
              <div
                key={`${s.season}-${s.season_type}`}
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #141414',
                  borderRadius: 8,
                  padding: '0.75rem 1rem',
                }}
              >
                <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {s.season}{' '}
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontWeight: 400 }}>
                    {s.season_type}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <BarCell label="Goals" value={s.goals ?? null} max={maxG} accent="#14B8A6" />
                  <BarCell label="Assists" value={s.assists ?? null} max={maxA} accent="#FFB81C" />
                  <BarCell label="Points" value={s.points ?? null} max={maxPts} accent="#fff" />
                  <BarCell label="PIMs" value={s.penalty_minutes ?? null} max={maxPims} accent="#FF6B7A" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Milestones */}
      {milestones.length > 0 ? (
        <section
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.75rem',
            }}
          >
            CAREER MILESTONES
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {milestones.map((m) => (
              <div
                key={`${m.title}-${m.achieved_at}-${m.description}`}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  padding: '0.55rem 0.75rem',
                  background: '#0f0f0f',
                  border: '1px solid #1e1e1e',
                  borderRadius: 6,
                }}
              >
                <span
                  style={{
                    color: '#FFB81C',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    minWidth: 58,
                  }}
                >
                  {m.achieved_at ? new Date(m.achieved_at).getFullYear() : '—'}
                </span>
                <div>
                  <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{m.title}</div>
                  {m.description ? (
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: 2 }}>
                      {m.description}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}