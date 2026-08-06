import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Props {
  leagueId: string;
  leagueSlug: string;
  leagueName: string;
}

export async function LeagueTeams({ leagueId, leagueSlug, leagueName }: Props) {
  // Fetch teams for this league
  const { data: teams } = await supabase
    .from('team_workspaces')
    .select('id, slug, name, home_city, logo_url')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(40);

  if (!teams || teams.length === 0) {
    return (
      <section style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Teams in {leagueName}</h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Browse all {leagueName} teams in the directory:{' '}
          <Link href={`/directory/teams?league=${leagueSlug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
            see all {leagueName} teams →
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px' }}>
          Teams in {leagueName}
        </h2>
        <Link href={`/directory/teams?league=${leagueSlug}`} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', textDecoration: 'none' }}>
          See all →
        </Link>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
        {teams.length} tracked team{teams.length === 1 ? '' : 's'} in the {leagueName}.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
        {teams.map((t: any) => (
          <Link
            key={t.id}
            href={t.slug ? `/directory/teams/${t.slug}` : '/directory/teams'}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            {t.logo_url ? (
              <img src={t.logo_url} alt={`${t.name} logo`} style={{ width: 24, height: 24, borderRadius: '4px', objectFit: 'contain', flexShrink: 0 }} loading="lazy" />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: '4px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>🏒</div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
              {t.home_city && <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '1px' }}>{t.home_city}</div>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
