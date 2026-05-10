'use client';
import Link from 'next/link';

// Simplified world map SVG paths (approximate continent outlines)
const WorldMap = () => (
  <svg
    viewBox="0 0 800 400"
    className="w-full max-w-lg h-auto opacity-40"
    style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))' }}
  >
    {/* Grid lines */}
    {Array.from({ length: 17 }).map((_, i) => (
      <line key={`v-${i}`} x1={i * 50} y1={0} x2={i * 50} y2={400} stroke="white" strokeWidth="0.5" strokeDasharray="3,6" opacity="0.3" />
    ))}
    {Array.from({ length: 9 }).map((_, i) => (
      <line key={`h-${i}`} x1={0} y1={i * 50} x2={800} y2={i * 50} stroke="white" strokeWidth="0.5" strokeDasharray="3,6" opacity="0.3" />
    ))}

    {/* Simplified continent outlines — dotted white */}
    <g fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.8">
      {/* North America */}
      <path d="M100,40 L80,80 L60,120 L80,160 L140,180 L200,170 L240,140 L260,100 L240,60 L200,40 L180,30 Z" />
      {/* Central America */}
      <path d="M140,180 L120,220 L130,260 L160,280 L180,260 L190,230 Z" />
      {/* South America */}
      <path d="M180,280 L160,320 L170,360 L200,380 L240,370 L260,340 L270,300 L250,270 L220,260 L200,280 Z" />
      {/* Europe */}
      <path d="M340,30 L320,60 L330,100 L370,110 L400,90 L420,70 L410,40 L380,25 Z" />
      {/* Africa */}
      <path d="M370,120 L350,160 L360,220 L400,280 L440,300 L470,270 L480,220 L470,160 L440,130 L400,120 Z" />
      {/* Asia */}
      <path d="M420,30 L400,60 L440,80 L500,60 L560,50 L600,70 L620,110 L600,150 L540,160 L480,150 L440,120 L420,80 Z" />
      {/* Middle East */}
      <path d="M500,110 L520,130 L540,150 L560,130 L550,100 L520,90 Z" />
      {/* India */}
      <path d="M540,150 L560,180 L580,220 L560,260 L530,240 L520,190 Z" />
      {/* Southeast Asia */}
      <path d="M580,180 L620,200 L640,240 L620,270 L580,250 L570,210 Z" />
      {/* East Asia / China */}
      <path d="M600,60 L640,50 L680,60 L700,90 L680,130 L640,140 L600,120 L580,90 Z" />
      {/* Japan */}
      <path d="M720,50 L730,70 L720,90 L700,85 Z" />
      {/* Australia */}
      <path d="M640,240 L680,230 L720,250 L730,280 L710,310 L660,310 L630,280 Z" />
      {/* Europe continuation */}
      <path d="M380,25 L420,15 L440,30 L430,55 L400,60 L380,55 Z" />
      {/* UK */}
      <path d="M350,40 L340,55 L355,65 L370,58 Z" />
    </g>

    {/* Red markers — team/league hotspots */}
    <g>
      {[
        [150, 80], [200, 200],
        [230, 320],
        [600, 80], [660, 100],
        [720, 65],
        [550, 180],
        [400, 250],
        [450, 140],
      ].map(([cx, cy], i) => (
        <g key={`red-${i}`}>
          <circle cx={cx} cy={cy} r="5" fill="#ef4444" opacity="0.9" />
          <circle cx={cx} cy={cy} r="10" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.3" />
        </g>
      ))}
    </g>

    {/* Blue markers — rink/facility locations */}
    <g>
      {[
        [120, 100], [250, 150],
        [360, 50], [400, 40], [380, 80],
        [500, 50], [560, 60],
        [640, 260],
        [420, 200],
      ].map(([cx, cy], i) => (
        <g key={`blue-${i}`}>
          <circle cx={cx} cy={cy} r="5" fill="#38bdf8" opacity="0.9" />
          <circle cx={cx} cy={cy} r="10" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.3" />
        </g>
      ))}
    </g>
  </svg>
);

// Category card with image placeholder and label — matches mockup layout
const CategoryCard = ({ icon, title, imageColor, href }: { icon: string; title: string; imageColor: string; href: string }) => (
  <Link href={href} className="group block">
    <div className="relative overflow-hidden rounded-2xl">
      <div className={`aspect-[4/3] ${imageColor} flex items-center justify-center transition-all duration-300 group-hover:scale-105`}>
        <span className="text-6xl opacity-50">{icon}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3">
        <span className="text-white font-semibold text-lg">{title}</span>
      </div>
    </div>
  </Link>
);

export default function HomePage() {
  const categories = [
    { icon: '🏒', title: 'Teams', color: 'bg-teal-900/60', href: '/directory/teams' },
    { icon: '🏆', title: 'Leagues', color: 'bg-amber-900/60', href: '/directory/leagues' },
    { icon: '🏟️', title: 'Facilities', color: 'bg-slate-800/60', href: '/directory/rinks' },
    { icon: '🥅', title: 'Players', color: 'bg-cyan-900/60', href: '/directory/players' },
    { icon: '📊', title: 'Stats', color: 'bg-purple-900/60', href: '/directory/fixtures' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 md:py-32 text-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-teal-900/20" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-crimson-900/15" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center text-white text-xl font-bold shadow-xl shadow-teal-500/20">
                  🏒
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-3 tracking-tight leading-tight">
                THE WORLD OF<br />
                <span className="bg-gradient-to-r from-teal-400 to-crimson-400 text-transparent bg-clip-text">
                  HOCKEY.
                </span>
              </h1>
              <p className="text-2xl md:text-3xl font-bold text-crimson-400 mb-4 tracking-tight">
                CONNECTED
              </p>
              <p className="text-lg text-slate-400 max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
                The premier destination for discovering hockey teams, players, leagues, rinks, and brands worldwide.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <Link href="/directory/teams" className="btn-primary">
                  🔍 Explore Teams
                </Link>
                <Link href="/directory/players" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 border border-slate-700">
                  👤 Browse Players
                </Link>
              </div>
            </div>
            <div className="flex-1 max-w-lg">
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4">
                <WorldMap />
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                  <span className="text-slate-400">Teams & Leagues</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
                  <span className="text-slate-400">Rinks & Facilities</span>
                </span>
              </div>
            </div>
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

      {/* Category Image Grid — 5 images with labels underneath */}
      <section className="py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">Browse Categories</h2>
        <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
          {categories.map(cat => (
            <CategoryCard
              key={cat.title}
              icon={cat.icon}
              title={cat.title}
              imageColor={cat.color}
              href={cat.href}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="bg-brand-split-subtle rounded-3xl p-12 border border-slate-800 relative overflow-hidden max-w-6xl mx-auto">
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