import Link from 'next/link';
import { NhlStanding } from '@/lib/nhl-data';

export interface NhlCanonicalTeam {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  country: string;
  division: string;
  conference: string;
  primaryColor: string;
  secondaryColor: string;
  founded?: number;
  arena?: string;
}

interface DivisionViewProps {
  title: string;
  teams: NhlCanonicalTeam[];
  standingsByName: Record<string, NhlStanding>;
  season: string | null;
  accentColor: string;
}

export default function DivisionView({ title, teams, standingsByName, season, accentColor }: DivisionViewProps) {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.5)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl" style={{ color: 'rgba(255,255,255,0.5)' }}>NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{title} Division</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.625rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {teams[0]?.conference} Conference · {title} Division
        </span>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: '0.25rem 0 0' }}>
          {title.toUpperCase()} DIVISION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {teams.length} teams {season && `· Season ${season}`}
        </p>
      </div>


      {/* Standings table */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 50px 50px 50px 50px 50px 50px 50px',
          gap: '0.5rem',
          padding: '0.5rem 0.875rem',
          fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.4)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>#</div><div>Team</div><div style={{ textAlign: 'center' }}>GP</div><div style={{ textAlign: 'center' }}>W</div><div style={{ textAlign: 'center' }}>L</div><div style={{ textAlign: 'center' }}>OTL</div><div style={{ textAlign: 'center' }}>PTS</div><div style={{ textAlign: 'center' }}>GF</div><div style={{ textAlign: 'center' }}>GA</div>
        </div>
        {teams.map(t => {
          const st = standingsByName[t.name];
          return (
            <Link key={t.slug} href={`/directory/nhl/teams/${t.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 50px 50px 50px 50px 50px 50px 50px',
                gap: '0.5rem',
                padding: '0.6rem 0.875rem',
                fontSize: '0.8125rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                alignItems: 'center',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{st?.rank ?? '–'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.primaryColor, flexShrink: 0 }} />
                  <span style={{ color: '#fff', fontWeight: 600 }}>{t.name}</span>
                </div>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{st?.played ?? '–'}</div>
                <div style={{ textAlign: 'center', color: '#34d399', fontWeight: 600 }}>{st?.wins ?? '–'}</div>
                <div style={{ textAlign: 'center', color: '#f87171', fontWeight: 600 }}>{st?.losses ?? '–'}</div>
                <div style={{ textAlign: 'center', color: '#fbbf24' }}>{st?.overtime_losses ?? '–'}</div>
                <div style={{ textAlign: 'center', color: '#fff', fontWeight: 700 }}>{st?.points ?? '–'}</div>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{st?.goals_for ?? '–'}</div>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{st?.goals_against ?? '–'}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Team grid */}
      <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
        {title.toUpperCase()} TEAMS
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
        {teams.map(t => (
          <Link key={t.slug} href={`/directory/nhl/teams/${t.slug}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '0.875rem 1rem', textDecoration: 'none',
            borderLeft: `3px solid ${t.primaryColor}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: t.primaryColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
            }}>
              {t.shortName}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{t.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{t.city}, {t.state}</p>
            </div>
            {standingsByName[t.name] && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>{standingsByName[t.name].points}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>PTS</p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
