'use client';
/**
 * src/components/YourTeams.tsx
 *
 * 2026-10-14 (Phase 5): 'Your teams' strip on the home page. Reads
 * the followed teams from localStorage (rs_followed_teams, same key
 * FollowButton writes to) and fetches their latest + next games from
 * /api/followed-teams-games. No login required.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'rs_followed_teams';

interface Opponent { id: string; name: string; slug: string | null }
interface LastGame {
  id: string; scheduled_at: string; opponent: Opponent | null; opponent_is_home: boolean;
  home_score: number | null; away_score: number | null; status: string;
}
interface NextGame {
  id: string; scheduled_at: string; opponent: Opponent | null; opponent_is_home: boolean; status: string;
}
interface FollowedTeam {
  team: { id: string; name: string; slug: string; logo_url: string | null };
  lastGame: LastGame | null;
  nextGame: NextGame | null;
}

export default function YourTeams() {
  const [teams, setTeams] = useState<FollowedTeam[] | null>(null);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const read = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const arr = Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
        setSlugs(arr);
        return arr;
      } catch { return []; }
    };
    const initial = read();
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setSlugs(detail);
    };
    window.addEventListener('rs_followed_changed', onChange as EventListener);
    return () => window.removeEventListener('rs_followed_changed', onChange as EventListener);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (slugs.length === 0) { setTeams([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/followed-teams-games?slugs=${encodeURIComponent(slugs.join(','))}`);
        if (!r.ok) { setTeams([]); return; }
        const j = await r.json();
        if (!cancelled) setTeams(j.teams || []);
      } catch { if (!cancelled) setTeams([]); }
    })();
    return () => { cancelled = true; };
  }, [slugs, hydrated]);

  // SSR: render a stable shell so the layout doesn't shift. We only
  // reveal content after hydration so the user sees "follow a team"
  // instructions if they have no followed teams yet.
  if (!hydrated) {
    return (
      <div data-your-teams>
        <div style={{ height: '120px' }} />
      </div>
    );
  }

  if (slugs.length === 0) {
    return (
      <section data-your-teams style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 0' }}>
        <div className="container">
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>YOUR TEAMS</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
            Follow a team on its profile page (look for the ☆ Follow button) to track their latest result and next game here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section data-your-teams style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 0' }}>
      <div className="container">
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', marginBottom: '1rem' }}>YOUR TEAMS</h2>
        {!teams ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Loading…</div>
        ) : teams.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>No games found for the teams you follow.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {teams.map((t) => (
              <div key={t.team.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.875rem' }}>
                <Link href={`/directory/teams/${t.team.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit', marginBottom: '0.5rem' }}>
                  {t.team.logo_url && <img src={t.team.logo_url} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />}
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.team.name}</span>
                </Link>
                {t.lastGame && (
                  <Link href={`/directory/games/${t.lastGame.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', textDecoration: 'none', color: 'inherit', fontSize: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Last</span>
                    <span style={{ color: '#fff' }}>
                      {t.lastGame.opponent_is_home ? 'vs' : '@'} {t.lastGame.opponent?.name || '?'}
                    </span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{t.lastGame.away_score}–{t.lastGame.home_score}</span>
                  </Link>
                )}
                {t.nextGame && (
                  <Link href={`/directory/games/${t.nextGame.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', textDecoration: 'none', color: 'inherit', fontSize: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Next</span>
                    <span style={{ color: '#fff' }}>
                      {t.nextGame.opponent_is_home ? 'vs' : '@'} {t.nextGame.opponent?.name || '?'}
                    </span>
                    <span style={{ color: '#FFB81C' }}>{new Date(t.nextGame.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </Link>
                )}
                {!t.lastGame && !t.nextGame && (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>No recent or upcoming games.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
