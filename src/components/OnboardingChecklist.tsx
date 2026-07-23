import { supabaseAdmin } from '@/lib/supabase';

type Step = { id: string; label: string; done: boolean; href: string };

export async function OnboardingChecklist({ userId, profile, types }: { userId: string; profile: any; types: string[] }) {
  const rows = await supabaseAdmin
    .from('hockey_player_team_history')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profile?.id)
    .then(r => ({ teamHistory: r.count ?? 0 }));

  const statsRows = await supabaseAdmin
    .from('hockey_player_stats_season')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profile?.id)
    .then(r => ({ stats: r.count ?? 0 }));

  const fedRow = await supabaseAdmin
    .from('federation_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profile?.id)
    .then(r => ({ federation: (r.count ?? 0) > 0 }));

  const firstMissing = {
    displayName: !(profile?.display_name),
    accountType: types.length === 0,
    teamHistory: (rows.teamHistory ?? 0) === 0,
    stats: (statsRows.stats ?? 0) === 0,
    federation: !fedRow.federation,
  };

  const steps: Step[] = [
    { id: 'name', label: 'Set your display name', done: !firstMissing.displayName, href: '/dashboard/profile' },
    { id: 'roles', label: 'Choose your hockey roles', done: !firstMissing.accountType, href: '/dashboard/roles' },
    { id: 'history', label: 'Add your first team affiliation', done: !firstMissing.teamHistory, href: '/dashboard/passport/team-history/new' },
    { id: 'stats', label: 'Add season stats', done: !firstMissing.stats, href: '/dashboard/passport/stats/new' },
    { id: 'federation', label: 'Add federation registration numbers', done: !firstMissing.federation, href: '/dashboard/passport/federation' },
  ];

  const pending = steps.filter(s => !s.done);
  if (pending.length === 0) return null;

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,184,28,0.22)',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#FFB81C', letterSpacing: '0.05em', margin: 0 }}>
          GETTING STARTED
        </h3>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 600 }}>
          {steps.length - pending.length}/{steps.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {steps.map((s) => (
          <a key={s.id} href={s.href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0.55rem 0.75rem', borderRadius: 8,
            background: s.done ? 'rgba(20,184,166,0.08)' : 'rgba(255,255,255,0.03)',
            border: '1px solid ' + (s.done ? 'rgba(20,184,166,0.18)' : 'rgba(255,255,255,0.08)'),
            color: '#fff', textDecoration: 'none',
          }}>
            <span aria-hidden style={{ fontSize: '0.85rem' }}>{s.done ? '✅' : '⬜️'}</span>
            <span style={{ flex: 1, fontSize: '0.875rem', color: s.done ? 'rgba(255,255,255,0.7)' : '#fff' }}>{s.label}</span>
            {!s.done && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>→</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
