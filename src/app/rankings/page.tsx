import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Rankings',
  description: 'Hockey team and player rankings across NHL, international, junior, college, and amateur leagues.',
};

export default function RankingsPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Rankings</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY RANKINGS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Top teams and players across every level of the sport.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { league: 'NHL Power Rankings', freq: 'Weekly', note: 'All 32 NHL teams ranked by performance, roster changes, and momentum heading into each week.', color: '#1E4D8C' },
          { league: 'NHL Draft Rankings', freq: 'Seasonal', note: 'Top prospects heading into the annual NHL Entry Draft, updated throughout the junior and college seasons.', color: '#1E4D8C' },
          { league: 'IIHF World Rankings', freq: 'Updated live', note: 'Official IIHF men\'s and women\'s national team rankings based on international competition results.', color: '#00A3A3' },
          { league: 'CHL Rankings', freq: 'Weekly', note: 'Top junior teams from the OHL, WHL, and QMJHL compiled by the Canadian Hockey League.', color: '#C8102E' },
          { league: 'NCAA Top 25', freq: 'Weekly', note: 'Top 25 college hockey programs in the United States, voted by coaches and media.', color: '#003087' },
          { league: 'European Club Rankings', freq: 'Seasonal', note: 'Top club teams from the KHL, Swedish Hockey League, Liiga, and other European leagues.', color: '#FFB81C' },
          { league: 'Women\'s Hockey Rankings', freq: 'Updated live', note: 'PWHL and IIHF women\'s national team standings and top club programs.', color: '#C8102E' },
          { league: 'World Junior Best-On-Best', freq: 'Tournament', note: 'Top prospects for the annual World Junior Championship, covering all competing nations.', color: '#1E7B1E' },
        ].map(r => (
          <div key={r.league} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em' }}>{r.league}</h3>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.65, marginBottom: '0.875rem' }}>{r.note}</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: `${r.color}25`, color: r.color }}>{r.league.split(' ')[0]}</span>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.28)' }}>{r.freq}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', lineHeight: 1.7 }}>
          Rankings are compiled from game results, head-to-head matchups, and independent analysis. Follow our news page for weekly updated power rankings across all major leagues.
        </p>
      </div>
    </main>
  );
}
