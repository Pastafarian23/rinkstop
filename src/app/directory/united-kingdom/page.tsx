import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function UnitedKingdomPage() {
  // Fetch UK rinks count
  const { count: ukRinksCount } = await supabase
    .from('rinks')
    .select('*', { count: 'exact', head: true })
    .eq('country', 'UK');

  // Fetch UK rinks
  const { data: ukRinks } = await supabase
    .from('rinks')
    .select('name, city, address, phone, website_url, notes')
    .eq('country', 'UK')
    .eq('is_active', true)
    .order('name')
    .limit(30);

  // Fetch UK leagues
  const { data: ukLeagues } = await supabase
    .from('leagues')
    .select('*')
    .or(`country.ilike.%United Kingdom%,country.ilike.%UK%,country.ilike.%GB%`)
    .limit(20);

  // Count UK players
  const { count: ukPlayersCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .or(`nationality.ilike.%United Kingdom%,nationality.ilike.%GB%,nationality.ilike.%British%`);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Breadcrumb */}
      <div className="border-b border-white/10 bg-[#0f0f0f]">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <nav className="flex items-center gap-2 text-sm text-white/60">
            <a href="/directory" className="hover:text-white transition-colors">RinkStop</a>
            <span>›</span>
            <a href="/directory" className="hover:text-white transition-colors">Directory</a>
            <span>›</span>
            <span className="text-white">United Kingdom</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h1
          className="mb-4 text-6xl font-bold tracking-wide"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          HOCKEY IN THE UNITED KINGDOM
        </h1>
        <p className="mx-auto max-w-3xl text-xl text-white/70">
          From the EIHL to NIHL, the UK has a growing hockey scene spanning England, Scotland, Wales, and Northern Ireland.
          Find every rink, league, and team across Britain.
        </p>
      </section>

      {/* Stats Row */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 text-center">
            <div
              className="text-5xl font-bold text-[#C8102E]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {ukRinksCount ?? '--'}
            </div>
            <div className="mt-1 text-sm text-white/50">UK Rinks</div>
            <div className="mt-1 text-xs text-white/30">in our directory</div>
          </div>

          <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#C8102E]/20 px-3 py-1 text-xs font-semibold text-[#C8102E]">
              EIHL
            </div>
            <div
              className="text-5xl font-bold"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              11
            </div>
            <div className="mt-1 text-sm text-white/50">EIHL Teams</div>
            <div className="mt-1 text-xs text-white/30">top professional league</div>
          </div>

          <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 text-center">
            <div
              className="text-5xl font-bold text-[#C8102E]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              12
            </div>
            <div className="mt-1 text-sm text-white/50">NIHL Divisions</div>
            <div className="mt-1 text-xs text-white/30">across UK & Ireland</div>
          </div>

          <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 text-center">
            <div
              className="text-5xl font-bold text-[#C8102E]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              60+
            </div>
            <div className="mt-1 text-sm text-white/50">Permanent Rinks</div>
            <div className="mt-1 text-xs text-white/30">in the United Kingdom</div>
          </div>
        </div>
      </section>

      {/* Hockey Culture */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2
          className="mb-8 text-4xl font-bold"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            borderLeft: '3px solid #C8102E',
            paddingLeft: '12px',
          }}
        >
          HOCKEY IN THE UK
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-8">
            <h3
              className="mb-4 text-2xl font-bold text-[#C8102E]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              THE EIHL — TOP TIER
            </h3>
            <div className="space-y-4 text-white/70 leading-relaxed">
              <p>
                The Elite Ice Hockey League (EIHL) is the premier professional hockey competition in the UK,
                featuring 11 teams across England, Scotland, Wales, and Northern Ireland. The league
                operates from September to March, culminating in a playoff championship.
              </p>
              <p>
                Notable teams include the Belfast Giants (SSE Arena, capacity 18,000), Sheffield Steelers,
                Cardiff Devils, and Coventry Blaze. Several teams have moved or expanded venues in recent
                years, with Manchester Storm relocating to the massive AO Arena for 2026-27.
              </p>
              <p>
                The league attracts players from North America, Europe, and a growing number of British-born
                talent. Import players typically dominate early but the development pipeline for UK-born
                players continues to strengthen through NIHL and the EIHL's own youth systems.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-8">
            <h3
              className="mb-4 text-2xl font-bold text-[#C8102E]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              NIHL — THE FOUNDATION
            </h3>
            <div className="space-y-4 text-white/70 leading-relaxed">
              <p>
                The National Ice Hockey League (NIHL) is the semi-professional tier below the EIHL,
                split into multiple divisions: NIHL 1 (north and south) and NIHL 2. It serves as the
                primary development ground for British players and operates at a community level with
                passionate local fanbases.
              </p>
              <p>
                The NIHL is split into regional conferences allowing for geographic rivalries and
                reducing travel costs. Teams like the billingham Stars, Milton Keynes Thunder, and
                Chelmsford Pacers have built strong local following over decades of consistent play.
              </p>
              <p>
                Above NIHL sits the EPIHL (English Premier Ice Hockey League) as the bridge between
                NIHL and EIHL. The full UK hockey pyramid ranges from recreational beer league hockey
                all the way up to the professional EIHL.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leagues */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2
          className="mb-8 text-4xl font-bold"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            borderLeft: '3px solid #C8102E',
            paddingLeft: '12px',
          }}
        >
          UK HOCKEY LEAGUES
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'EIHL', desc: 'Elite Ice Hockey League — 11 professional teams, top UK tier' },
            { name: 'NIHL 1', desc: 'National Ice Hockey League Division 1 — semi-pro, north & south' },
            { name: 'NIHL 2', desc: 'National Ice Hockey League Division 2 — community level hockey' },
            { name: 'EPIHL', desc: 'English Premier Ice Hockey League — bridge between NIHL and EIHL' },
            { name: 'SNL', desc: 'Scottish National League — Scotland\'s top amateur competition' },
            { name: 'WIHL', desc: 'Welsh Ice Hockey League — recreational and development focused' },
          ].map((league) => (
            <div
              key={league.name}
              className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 hover:border-[#C8102E]/50 transition-colors"
            >
              <h3
                className="mb-2 text-xl font-bold text-[#C8102E]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {league.name}
              </h3>
              <p className="text-sm text-white/60">{league.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* UK Rinks Grid */}
      {ukRinks && ukRinks.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <h2
            className="mb-8 text-4xl font-bold"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              borderLeft: '3px solid #C8102E',
              paddingLeft: '12px',
            }}
          >
            ICE RINKS IN THE UK
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ukRinks.map((rink: { name: string; city: string | null; address: string | null; phone: string | null; website_url: string | null; notes: string | null }) => (
              <div
                key={rink.name}
                className="rounded-xl bg-[#0f0f0f] border border-white/10 p-5 hover:border-[#C8102E]/50 transition-colors"
              >
                <h3 className="font-semibold text-white mb-1">{rink.name}</h3>
                <p className="text-sm text-white/60 mb-2">{rink.city}</p>
                {rink.address && (
                  <p className="text-xs text-white/40 mb-1">{rink.address}</p>
                )}
                {rink.phone && (
                  <p className="text-xs text-white/40 mb-1">📞 {rink.phone}</p>
                )}
                {rink.website_url && (
                  <a
                    href={rink.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#C8102E] hover:underline mb-2 block"
                  >
                    🌐 Visit website
                  </a>
                )}
                {rink.notes && (
                  <p className="text-xs text-white/50 mt-2 italic border-t border-white/10 pt-2">{rink.notes}</p>
                )}
              </div>
            ))}
          </div>
          {ukRinksCount && ukRinksCount > 30 && (
            <p className="mt-4 text-center text-sm text-white/40">
              Showing 30 of {ukRinksCount} rinks in our directory.{' '}
              <a href="/directory" className="text-[#C8102E] hover:underline">Browse all →</a>
            </p>
          )}
        </section>
      )}

      {/* Add Listing CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-[#041E42] to-[#0a1f3d] border border-white/10 p-10 text-center">
          <h2
            className="mb-4 text-3xl font-bold"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            KNOW A UK RINK WE&apos;RE MISSING?
          </h2>
          <p className="text-white/60 mb-6 max-w-xl mx-auto">
            Help us build the most complete hockey directory in the world. If you know a rink, team, or league
            in the UK that should be listed, let us know.
          </p>
          <a
            href="/add-listing"
            style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              padding: '0.75rem 2rem',
              borderRadius: '6px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Submit a Listing
          </a>
        </div>
      </section>
    </div>
  );
}