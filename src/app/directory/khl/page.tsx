import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'KHL  --  Kontinental Hockey League',
  description: 'Coverage of the KHL (Kontinental Hockey League)  --  top-tier Russian and international hockey with 23 teams across Russia, Belarus, Kazakhstan, and China.',
};

export default function KHLPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>KHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          KHL  --  KONTINENTAL HOCKEY LEAGUE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Europe&apos;s top professional hockey league. 23 teams across Russia, Belarus, Kazakhstan, and China.
        </p>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.75rem' }}>
        The Kontinental Hockey League (KHL) was founded in 2008 and is the premier professional ice hockey league of Russia and much of Eurasia. It is widely regarded as one of the top professional leagues in the world outside of the NHL. The KHL fields 23 teams across Russia, Belarus, Kazakhstan, and China, including international entries from Finland (Helsinki Jokerit participated 2014-2022) and one of the most successful franchises of all time in SKA Saint Petersburg. The league's annual championship is the Gagarin Cup, awarded to the playoff champion since the 2008-09 season. The KHL places a heavy emphasis on player development: roughly 50% of NHL draft picks in a given year come from Russian development paths, including the MHL junior system that feeds KHL rosters.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Pro Leagues', href: '/directory/pro-leagues' },
          { label: 'AHL', href: '/directory/ahl' },
          { label: 'PWHL', href: '/directory/pwhl' },
          { label: 'All Leagues', href: '/directory/leagues' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.55)',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>
            {n.label}
          </Link>
        ))}
      </div>

      {/* League info */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0a2d5a 100%)', border: '1px solid rgba(30,91,156,0.3)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4A90D9', marginBottom: '0.5rem' }}>Kontinental Hockey League</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em' }}>23 TEAMS • 4 CONFERENCES</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Founded 2008 • Based in Moscow (headquarters)</p>
      </div>

      {/* Conferences */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { name: 'Bobrov Division', teams: 'CSKA Moscow, SKA St. Petersburg, Jokerit, Severstal, Spartak Moscow, Torpedo Nizhny Novgorod', color: '#1E5B9C' },
          { name: 'Tarasov Division', teams: 'Dynamo Moscow, Lokomotiv Yaroslavl, Nitra, HC Sochi, Torpedo Moscow Oblast, Vityaz', color: '#C8102E' },
          { name: 'Kharkiv Division', teams: 'Avtomobilist Yekaterinburg, Metallurg Magnitogorsk, Traktor Chelyabinsk, Salavat Yulaev Ufa, Ak Bars Kazan', color: '#1E7B1E' },
          { name: 'Trofey Division', teams: 'Amur Khabarovsk, Admiral Vladivostok, SKA-Neva, Sibir Novosibirsk, Barys Astana, Kunlun Red Star', color: '#7B3FA0' },
        ].map(d => (
          <div key={d.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: d.color }}>Conference</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem', marginBottom: '0.75rem' }}>{d.name}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{d.teams}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Teams', value: '23' },
          { label: 'Countries', value: '4' },
          { label: 'Founded', value: '2008' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Notable teams */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NOTABLE TEAMS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { name: 'SKA St. Petersburg', location: 'St. Petersburg, Russia', color: '#004E9A' },
            { name: 'CSKA Moscow', location: 'Moscow, Russia', color: '#C8102E' },
            { name: 'Jokerit', location: 'Helsinki, Finland', color: '#C4D600' },
            { name: 'Barys Astana', location: 'Astana, Kazakhstan', color: '#00A651' },
            { name: 'Ak Bars Kazan', location: 'Kazan, Russia', color: '#E30613' },
            { name: 'Lokomotiv Yaroslavl', location: 'Yaroslavl, Russia', color: '#FFD700' },
          ].map(t => (
            <div key={t.name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{t.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{t.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}