import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

const americanNHLStars = [
  { name: 'Auston Matthews', team: 'New York Rangers', position: 'C', drafted: '2016' },
  { name: 'Patrick Kane', team: 'Detroit Red Wings', position: 'RW', drafted: '2007' },
  { name: 'Jack Eichel', team: 'Vegas Golden Knights', position: 'C', drafted: '2015' },
  { name: 'Matthew Tkachuk', team: 'Florida Panthers', position: 'LW', drafted: '2016' },
  { name: 'Kyle Connor', team: 'Winnipeg Jets', position: 'LW', drafted: '2015' },
  { name: 'Jake Guentzel', team: 'Tampa Bay Lightning', position: 'LW', drafted: '2013' },
  { name: 'Cam Atkinson', team: 'St. Louis Blues', position: 'RW', drafted: '2008' },
  { name: 'John Carlson', team: 'Washington Capitals', position: 'D', drafted: '2008' },
  { name: 'Seth Jones', team: 'Chicago Blackhawks', position: 'D', drafted: '2013' },
  { name: 'Connor Hellebuyck', team: 'Winnipeg Jets', position: 'G', drafted: '2012' },
];

export default async function UnitedStatesPage() {
  // Fetch American NHL players count
  const { count: americanPlayersCount } = await supabase
    .from('players')
    .select('*, teams(*, leagues(*))', { count: 'exact', head: true })
    .ilike('nationality', '%US%')
    .not('teams', 'is', null);

  // Fetch US rinks count
  const { count: usRinksCount } = await supabase
    .from('rinks')
    .select('*', { count: 'exact', head: true })
    .or('country.ilike.%United States%,country.ilike.%US%');

  // Fetch leagues in the US
  const { data: usLeagues } = await supabase
    .from('leagues')
    .select('*')
    .or(`country.ilike.%United States%,country.ilike.%US%,slug.ilike.%nhl%,slug.ilike.%ushl%,slug.ilike.%nahl%,slug.ilike.%ncaa%,name.ilike.%NHL%,name.ilike.%NCAA%`)
    .limit(20);

  // Fetch US rinks
  const { data: usRinks } = await supabase
    .from('rinks')
    .select('id, name, city, rink_type, capacity')
    .or('country.ilike.%United States%,country.ilike.%US%')
    .eq('is_active', true)
    .order('name')
    .limit(24);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many Americans play in the NHL?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'As of 2024, approximately 25-30% of NHL players are American-born, representing the fastest-growing nationality in the league. The number has increased dramatically since the 1970s when Americans made up less than 5% of the league.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the USHL?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The United States Hockey League (USHL) is the top junior hockey league in the United States, serving as a development path to college hockey and the NHL. It is the only Tier 1 junior league in the US, featuring players ages 16-20.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does NCAA hockey development work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'NCAA Division I hockey is a major development pathway for NHL talent. Players typically play 2-4 years of junior hockey (USHL, NAHL, or Canadian junior leagues) before joining college programs. The NCAA-eligibility rules and the college-first development model distinguish the American pathway from the Canadian CHL route.',
        },
      },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Hockey in the United States',
    description: 'The fastest-growing hockey market in the world. NHL, NCAA, USHL, NAHL  --  the American hockey pipeline has never been stronger.',
    author: { '@type': 'Organization', name: 'RinkStop' },
    publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
    datePublished: new Date().toISOString().split('T')[0],
  };

  return (
    <>

<div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Breadcrumb */}
        <div className="border-b border-white/10 bg-[#0f0f0f]">
          <div className="mx-auto max-w-7xl px-6 py-3">
            <nav className="flex items-center gap-2 text-sm text-white/60">
              <a href="/directory" className="hover:text-white transition-colors">RinkStop</a>
              <span>›</span>
              <a href="/directory" className="hover:text-white transition-colors">Directory</a>
              <span>›</span>
              <span className="text-white">United States</span>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <section className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1
            className="mb-4 text-6xl font-bold tracking-wide"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            HOCKEY IN THE UNITED STATES
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-white/70">
            The fastest-growing hockey market in the world. 25 NHL teams, 60+ NCAA Division I programs,
            and a youth system that feeds the world&apos;s best league.
          </p>
        </section>

        {/* Stats Row */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 text-center">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#C8102E]/20 px-3 py-1 text-xs font-semibold text-[#C8102E]">
                IIHF Rank
              </div>
              <div
                className="text-5xl font-bold"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                #2-4
              </div>
              <div className="mt-1 text-sm text-white/50">World Ranking</div>
            </div>

            <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 text-center">
              <div
                className="text-5xl font-bold text-[#C8102E]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {americanPlayersCount ?? ' -- '}
              </div>
              <div className="mt-1 text-sm text-white/50">American NHL Players</div>
              <div className="mt-1 text-xs text-white/30">with US nationality</div>
            </div>

            <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 text-center">
              <div
                className="text-5xl font-bold text-[#C8102E]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {usRinksCount ?? ' -- '}
              </div>
              <div className="mt-1 text-sm text-white/50">US Registered Rinks</div>
              <div className="mt-1 text-xs text-white/30">in our directory</div>
            </div>

            <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-6 text-center">
              <div
                className="text-5xl font-bold text-[#C8102E]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                25
              </div>
              <div className="mt-1 text-sm text-white/50">NHL Teams in US</div>
              <div className="mt-1 text-xs text-white/30">of 32 total franchises</div>
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
            HOCKEY CULTURE
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left: Growth */}
            <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-8">
              <h3
                className="mb-4 text-2xl font-bold text-[#C8102E]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                THE AMERICAN RISE
              </h3>
              <div className="space-y-4 text-white/70 leading-relaxed">
                <p>
                  In the 1970s, American players made up less than 5% of NHL rosters. Today, that number
                  exceeds 25%, with projections suggesting Americans could rival Canadians within the
                  next decade.
                </p>
                <p>
                  Minnesota has long been known as the cradle of American hockey  --  producing more NHL
                  players per capita than any other state. Massachusetts and the Boston area follow
                  closely, with strong programs at every level from youth to the NHL.
                </p>
                <p>
                  The explosion of youth hockey began in the 1990s and has continued to accelerate.
                  rinks in suburban communities, school programs, and travel hockey have all contributed
                  to a deep talent pool that now consistently produces world-class players.
                </p>
              </div>
            </div>

            {/* Right: Systems */}
            <div className="rounded-xl bg-[#0f0f0f] border border-white/10 p-8">
              <h3
                className="mb-4 text-2xl font-bold text-[#C8102E]"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                AMERICAN VS CANADIAN PATHWAYS
              </h3>
              <div className="space-y-4 text-white/70 leading-relaxed">
                <p>
                  <strong className="text-white">NCAA Route (US):</strong> Players typically play
                  2-4 years of junior hockey (USHL, NAHL) before joining NCAA Division I programs.
                  College hockey serves as both education and elite development  --  players can play
                  in the NCAA until age 21-22 before turning pro.
                </p>
                <p>
                  <strong className="text-white">CHL Route (Canada):</strong> The Canadian Hockey
                  League (OHL, WHL, QMJHL) offers an alternative path for 16-20 year olds. Major
                  Junior teams operate as full-time professional-caliber developmental clubs.
                </p>
                <p>
                  <strong className="text-white">USDP & NTDP:</strong> The United States Development
                  Program and National Team Development Program in Ann Arbor, Michigan identify and
                  train the top American prospects. Many NTDP alumni become first-round NHL draft
                  picks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Leagues Grid */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <h2
            className="mb-8 text-4xl font-bold"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              borderLeft: '3px solid #C8102E',
              paddingLeft: '12px',
            }}
          >
            LEAGUES IN THE UNITED STATES
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'NHL', desc: 'National Hockey League  --  32 teams, the world\'s premier pro league' },
              { name: 'AHL', desc: 'American Hockey League  --  top minor league, developmental pipeline' },
              { name: 'NCAA Division I', desc: '60+ college programs, major NCAA tournament (Frozen Four)' },
              { name: 'USHL', desc: 'United States Hockey League  --  top Tier 1 junior league for ages 16-20' },
              { name: 'NAHL', desc: 'North American Hockey League  --  Tier 2 junior, 6 divisions across the US' },
              { name: 'USPHL Premier', desc: 'US Premier Hockey League  --  top Tier 3 junior and youth hockey' },
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

        {/* NHL Stars from the USA */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <h2
            className="mb-8 text-4xl font-bold"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              borderLeft: '3px solid #C8102E',
              paddingLeft: '12px',
            }}
          >
            NHL STARS FROM THE USA
          </h2>
          <div className="overflow-x-auto rounded-xl bg-[#0f0f0f] border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-white/50">
                  <th className="px-6 py-4 font-normal">PLAYER</th>
                  <th className="px-6 py-4 font-normal">TEAM</th>
                  <th className="px-6 py-4 font-normal">POS</th>
                  <th className="px-6 py-4 font-normal">DRAFTED</th>
                </tr>
              </thead>
              <tbody>
                {americanNHLStars.map((player, i) => (
                  <tr
                    key={player.name}
                    className={`border-b border-white/5 ${i !== americanNHLStars.length - 1 ? '' : ''}`}
                  >
                    <td className="px-6 py-4 font-semibold text-white">{player.name}</td>
                    <td className="px-6 py-4 text-white/70">{player.team}</td>
                    <td className="px-6 py-4 text-white/50">{player.position}</td>
                    <td className="px-6 py-4 text-white/50">{player.drafted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* American Rinks Grid */}
        {usRinks && usRinks.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 pb-24">
            <h2
              className="mb-8 text-4xl font-bold"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                borderLeft: '3px solid #C8102E',
                paddingLeft: '12px',
              }}
            >
              AMERICAN RINKS
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {usRinks.map((rink: { id: number; name: string; city: string; rink_type: string | null; capacity: number | null }) => (
                <Link
                  key={rink.id}
                  href={`/directory/rinks/${rink.id}`}
                  className="block rounded-xl bg-[#0f0f0f] border border-white/10 p-5 hover:border-[#C8102E]/50 transition-colors no-underline"
                >
                  <h3 className="font-semibold text-white mb-1">{rink.name}</h3>
                  <p className="text-sm text-white/60">{rink.city}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                    <span className="rounded bg-white/5 px-2 py-1">{rink.rink_type ?? 'Ice Rink'}</span>
                    {rink.capacity && (
                      <span>Cap: {rink.capacity.toLocaleString()}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {usRinks.length === 24 && (
              <p className="mt-4 text-center text-sm text-white/40">
                Showing 24 of {usRinksCount}+ rinks in our directory.{' '}
                <a href="/directory" className="text-[#C8102E] hover:underline">Browse all →</a>
              </p>
            )}
          </section>
        )}
      </div>
    </>
  );
}