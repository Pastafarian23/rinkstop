import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'Hockey Development Pathway — From Learn to Play to Pro',
  description: 'Hockey development pathway in North America: Learn to Play → House → Travel → High School → Junior → College → Pro. Each level, what to expect, and what it costs.',
  keywords: ['hockey development pathway', 'hockey progression', 'learn to play to pro', 'hockey levels', 'hockey pipeline', 'hockey development path'],
  alternates: { canonical: 'https://rinkstop.com/learn/hockey-development-pathway' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Development Pathway',
    description: 'From Learn to Play to Pro. Each level, what to expect, what it costs.',
    type: 'article',
    url: 'https://rinkstop.com/learn/hockey-development-pathway',
    siteName: 'RinkStop',
  }),
};

export default function HockeyDevelopmentPathwayPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Development Pathway</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOCKEY DEVELOPMENT PATHWAY
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        From your kid's first learn-to-play session to (maybe) the NHL. Each level, what to expect, and what it costs.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The full pathway</h2>
        <p style={{ marginBottom: '1rem' }}>
          In North America, the standard youth-to-pro pathway has seven levels. Not every player goes through all of them. Many players stop at high school. Some stop at college. A tiny fraction make it to the NHL. The point of the pathway isn't to push everyone to the pros — it's to give every player a clear ladder of opportunities, with each level building on the last.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Level 1: Learn to Play (ages 4-8)</h2>
        <p style={{ marginBottom: '1rem' }}>
          The entry point. Kids learn to skate, handle a stick, and play with other kids. The focus is fun and basic skill development. No tryouts, no cuts, no stats kept.
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>Time:</strong> 1-2 sessions per week, 45-60 minutes each. <strong>Cost:</strong> $200-500 per year (mostly equipment if you buy your own). <strong>Games:</strong> Intrasquad scrimmages, not real games.</p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Level 2: House hockey (ages 8-14)</h2>
        <p style={{ marginBottom: '1rem' }}>
          The local rec program. Every kid plays. Practices are 2-3 per week, games on weekends. This is where most kids spend their entire hockey career, and that's a legitimate path.
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>Time:</strong> 2-3 sessions per week. <strong>Cost:</strong> $500-2,000 per year. <strong>Games:</strong> Real games, real scores, but the focus is on development not winning.</p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Level 3: Travel hockey (ages 10-18)</h2>
        <p style={{ marginBottom: '1rem' }}>
          For kids who want more competition. Teams draw from a wider area (an entire state or province). Practices are 3-5 per week, games every weekend, tournaments monthly. Travel is significant. This is where the time and money commitment gets real.
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>Time:</strong> 4-6 sessions per week plus 2-3 games. <strong>Cost:</strong> $3,000-15,000+ per year. <strong>Games:</strong> Competitive, scored, ranked. The culture varies by program — some are healthy, some are toxic.</p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Level 4: High school hockey (ages 14-18)</h2>
        <p style={{ marginBottom: '1rem' }}>
          In the US, high school hockey is mostly a Minnesota, Michigan, Massachusetts, Wisconsin, and New England thing. In Canada, it's the dominant path for elite development. If your high school has a team, that's a great option — minimal cost, good competition, social ties that last a lifetime.
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>Time:</strong> 5-6 sessions per week during season (October-March). <strong>Cost:</strong> $200-2,000 (mostly fees and equipment). <strong>Games:</strong> Section/conference schedule, state playoffs if you make it.</p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Level 5: Junior hockey (ages 16-20)</h2>
        <p style={{ marginBottom: '1rem' }}>
          The NHL's main development path. Three major options:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>CHL (Canadian Hockey League):</strong> OHL, WHL, QMJHL. Major junior. Players get drafted at 16. Some go pro directly from the CHL. Most use it as a path to college or pro. Players receive a small stipend but it's not a wage — they're "amateur" by NCAA standards.</li>
          <li><strong>USHL (United States Hockey League):</strong> The only Tier 1 USHL junior league. Players retain NCAA eligibility. Many top USHL players go to NCAA D1. Strongest path for US-born players who want to stay NCAA-eligible.</li>
          <li><strong>NAHL (North American Hockey League):</strong> Tier 2 junior. Lower cost than USHL. Many NAHL players move up to USHL or NCAA D3. Some go pro from NAHL.</li>
          <li><strong>NCDC, BCHL, AJHL, NA3HL, USPHL:</strong> Other junior options with different levels of competitiveness and NCAA eligibility implications.</li>
        </ul>
        <p style={{ marginBottom: '0.5rem' }}><strong>Time:</strong> Full-time hockey, 9-10 months a year. <strong>Cost:</strong> Varies — CHL is funded by the league (small stipends), USHL has a draft and team-funded billets, NAHL/NCDC are pay-to-play ($15-30k per year).</p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Level 6: College hockey (ages 18-22+)</h2>
        <p style={{ marginBottom: '1rem' }}>
          NCAA D1 is the most direct path to the NHL. About 33% of NHL players came through NCAA D1. D3 and ACHA are real options for late developers or players who want a different college experience. NAIA is smaller but legit.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The recruiting process for NCAA D1 starts early — coaches are watching 16U and 18U players. Tier 1 junior is the most common path to NCAA D1. If your kid is a serious hockey player, the recruiting conversation should start at 14U-16U.
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>Time:</strong> 5-6 sessions per week, 30-40 games per season. <strong>Cost:</strong> Tuition (often partial or full scholarship for D1). <strong>Games:</strong> NCAA schedule, Frozen Four if you make it.</p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Level 7: Pro hockey (age 20+)</h2>
        <p style={{ marginBottom: '1rem' }}>
          The NHL is the top league in the world, with about 700 active roster spots. The AHL, ECHL, and various European leagues (SHL, Liiga, KHL, DEL) are the next tier. Most NHLers play 1-2 years in the AHL first.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The realistic path to the NHL: develop through your local program, play high school and junior, get a college opportunity, develop for 4 years, sign as an undrafted free agent or get drafted late. The drafted-out-of-junior route (CHL, USHL → NHL) is the most direct but is statistically rare.
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>Time:</strong> 50-82 games per season plus playoffs. <strong>Pay:</strong> $775k NHL minimum, varies by league. <strong>Competition:</strong> Best in the world.</p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Realistic expectations by level</h2>
        <p style={{ marginBottom: '1rem' }}>
          The funnel narrows fast. Realistic numbers:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>1.8 million kids play USA Hockey-registered hockey (2024-25 season)</li>
          <li>About 1.2 million of those are in the ADM age groups (8U-18U)</li>
          <li>About 25,000 play NCAA hockey across all divisions</li>
          <li>About 3,500 play NCAA D1 hockey</li>
          <li>About 600-700 are on NHL rosters at any time</li>
          <li>That's 1 in 3,000 USA Hockey players making the NHL</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          The 1 in 3,000 number is the honest math. It's not meant to discourage. It's meant to put the journey in perspective: the goal at every level is to develop as a player and have fun. The pro dream is a long shot for everyone, including the kids who make it.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The right move at every level</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>At 6U-8U:</strong> Have fun. Don't specialize. Play multiple sports. The hockey skill development at this age is mostly skating and falling safely.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>At 10U-12U:</strong> Stay in house unless your kid is clearly a top player. Most kids aren't. The ADM is correct.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>At 14U:</strong> The decision point. Travel, high school, or both. This is where the time and money commitment jumps. The decision should be the kid's, not the parent's.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>At 16U:</strong> Junior or college path. Use the <Link href="/tools/junior-eligibility-checker" style={{ color: '#C8102E' }}>junior eligibility checker</Link> to understand the windows. NCAA D1 academic eligibility is a real thing — start the conversation with the school counselor at 15.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>At 18U:</strong> If the kid is still playing and serious, junior or college. If not, that's also a fine outcome — most players stop here and have a great hockey experience to look back on.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/age-to-start-hockey" style={{ color: '#C8102E' }}>When can my kid start hockey?</Link></li>
          <li><Link href="/learn/cost-by-age" style={{ color: '#C8102E' }}>Hockey cost by age</Link></li>
          <li><Link href="/learn/choosing-a-program" style={{ color: '#C8102E' }}>Choosing a learn-to-play program</Link></li>
          <li><Link href="/tools/junior-eligibility-checker" style={{ color: '#C8102E' }}>Junior eligibility checker</Link></li>
          <li><Link href="/guides/nhl-draft" style={{ color: '#C8102E' }}>NHL draft guide</Link></li>
          <li><Link href="/guides/ncaa-hockey" style={{ color: '#C8102E' }}>NCAA hockey guide</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>


    <LearnJsonLd
      href={`/learn/hockey-development-pathway`}
      title={`Hockey Development Pathway`}
      description={`The North American path: Learn to Play → House → Travel → High School → Junior → College → Pro. Each level, what to expect, what it costs.`}
      verified={`2026-09-10`}
      readTime={12}
    />
</main>
  );
}