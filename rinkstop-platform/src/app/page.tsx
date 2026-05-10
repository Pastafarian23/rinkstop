'use client';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    { icon: '🏒', title: 'Teams', desc: 'Browse teams by league and country', href: '/directory/teams' },
    { icon: '🥅', title: 'Players', desc: 'Search by position, team, or nationality', href: '/directory/players' },
    { icon: '🏆', title: 'Leagues', desc: 'Professional, junior, amateur & youth', href: '/directory/leagues' },
    { icon: '🏟️', title: 'Rinks', desc: 'Find rinks and facilities worldwide', href: '/directory/rinks' },
    { icon: '🏷️', title: 'Brands', desc: 'Equipment & apparel brands', href: '/directory/brands' },
    { icon: '📅', title: 'Fixtures', desc: 'Upcoming games & schedules', href: '/directory/fixtures' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative py-24 text-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-teal-900/30" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-crimson-900/30" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-brand-gradient flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-teal-500/20">
              🏒
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
            Global Hockey
            <br />
            <span className="bg-gradient-to-r from-teal-400 to-crimson-400 text-transparent bg-clip-text">
              Directory
            </span>
          </h1>
          <div className="flex justify-center mb-2">
            <div className="h-[2px] w-16 bg-brand-gradient rounded-full"></div>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The premier destination for discovering hockey teams, players, leagues, rinks, and brands worldwide.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/directory/teams" className="btn-primary">
              🔍 Explore Teams
            </Link>
            <Link href="/directory/players" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 border border-slate-700">
              👤 Browse Players
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-6 gap-4">
          {['Teams', 'Players', 'Leagues', 'Rinks', 'Brands', 'Fixtures'].map(label => (
            <div key={label} className="text-center p-4 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="text-2xl font-black text-brand-teal">—</div>
              <div className="text-xs text-slate-600 mt-1 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-4 text-white">Explore the Directory</h2>
        <p className="text-center text-slate-500 mb-12 max-w-xl mx-auto">
          Browse comprehensive listings across every category of the hockey world.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <Link key={f.title} href={f.href} className="card-default p-6">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="bg-brand-split-subtle rounded-3xl p-12 border border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.3) 0%, rgba(239,68,68,0.3) 100%)' }} />
          <div className="relative z-10 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">🏒 Join the Global Hockey Community</h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              Contribute your team, league, rink, or brand data.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/admin/teams/new" className="inline-flex items-center gap-2 bg-brand-gradient text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition-all">
                + Add a Team
              </Link>
              <Link href="/admin/leagues/new" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-6 py-3 rounded-lg border border-slate-700">
                + Add a League
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
export default HomePage;