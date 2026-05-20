import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Travel | RinkStop',
  description: 'Plan your hockey road trip. Arena guides, hotel recommendations near major rinks, and tips for traveling to watch live games.',
};

export default function HockeyTravelPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Travel</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY TRAVEL
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Arena guides, road trip planning, and where to watch hockey around the world.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { city: 'Toronto, ON', venues: 'Scotiabank Arena (Leafs), Coca-Cola Coliseum ( Marlies)', note: 'The hockey capital of North America. Two NHL arenas within walking distance downtown.', icon: '🏙️' },
          { city: 'Montreal, QC', venues: 'Bell Centre (Canadiens)', note: 'Hockey history on every block. The Forum site is now a shopping complex  --  still worth a visit.', icon: '🏒' },
          { city: 'Boston, MA', venues: 'TD Garden (Bruins)', note: 'College hockey rivalries run deep here. Catch a Harvard-Yale game at Matthews Arena.', icon: '🎓' },
          { city: 'Minneapolis-St. Paul, MN', venues: 'Xcel Energy Center (Wild)', note: 'The State of Hockey. Minnesota has produced more NHL players per capita than any US state.', icon: '❄️' },
          { city: 'Detroit, MI', venues: 'Little Caesars Arena (Red Wings)', note: 'Original Six. The old Joe Louis Arena site is now redeveloped. Little Caesars is the new home.', icon: '🏚️' },
          { city: 'New York, NY', venues: 'Madison Square Garden (Rangers), UBS Arena (Islanders)', note: 'Two NHL teams, two very different arenas. MSG is iconic; UBS Arena has better sightlines.', icon: '🗽' },
          { city: 'Chicago, IL', venues: 'United Center (Blackhawks)', note: 'Madhouse on Madison. The city that invented the penalty box and built hockey culture in the US heartland.', icon: '🌃' },
          { city: 'Tampa, FL', venues: 'Amalie Arena (Lightning)', note: 'The warm-weather hockey experiment that worked. Arena is walkable to downtown hotels and restaurants.', icon: '🌴' },
        ].map(t => (
          <div key={t.city} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.0625rem', color: '#fff', letterSpacing: '0.04em' }}>{t.city}</h3>
              <span style={{ fontSize: '1.25rem' }}>{t.icon}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600, marginBottom: '0.4rem' }}>{t.venues}</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.65 }}>{t.note}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.875rem' }}>ARENA TIPS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { tip: 'Book hotel blocks early', note: ' NHL arenas are in city centers  --  hotels fill fast on game nights.' },
            { tip: 'Bring a jersey', note: ' You\'ll fit in better and might make friends in the concourse.' },
            { tip: 'Skip the standing-room only', note: ' If you\'re traveling for the experience, a real seat is worth the upgrade.' },
            { tip: 'Explore the neighborhood', note: ' Every arena has pre-game bars and restaurants worth trying.' },
          ].map(t => (
            <div key={t.tip}>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', marginBottom: '0.25rem' }}>{t.tip}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{t.note}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
