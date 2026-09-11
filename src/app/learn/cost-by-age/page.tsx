import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'Hockey Cost by Age — What Youth Hockey Costs from 6U to 18U',
  description: 'Hockey cost by age group: 6U, 8U, 10U, 12U, 14U, 16U, 18U. Registration, equipment, ice time, travel. Plus the cost calculator and how to budget.',
  keywords: ['hockey cost by age', 'hockey cost', 'youth hockey cost', 'how much does hockey cost', 'hockey budget', 'hockey family budget'],
  alternates: { canonical: 'https://rinkstop.com/learn/cost-by-age' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Cost by Age',
    description: 'What youth hockey costs from 6U to 18U. Registration, equipment, ice time, travel.',
    type: 'article',
    url: 'https://rinkstop.com/learn/cost-by-age',
    siteName: 'RinkStop',
  }),
};

export default function CostByAgePage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Cost by Age</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOCKEY COST BY AGE
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        What youth hockey actually costs from 6U to 18U. Registration, equipment, ice time, travel — and the surprises that double the bill.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Use the cost calculator first</h2>
        <p style={{ marginBottom: '1rem' }}>
          This page gives you the age-by-age ranges. For a personalized estimate by your state and your kid's level, use the <Link href="/tools/hockey-cost-calculator" style={{ color: '#C8102E' }}>hockey cost calculator</Link>. The numbers below are 2026 averages across the US, drawn from RinkStop's directory data and program-published fees.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>6U (ages 5-6): $400-800 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          The cheapest year. Most learn-to-play programs include equipment for the first 4-8 weeks. After that, you're buying gear that the kid will outgrow by next year. Don't overspend on premium equipment for a 6-year-old.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Registration:</strong> $100-300. <strong>Equipment (new):</strong> $250-500. <strong>Equipment (used):</strong> $80-150. <strong>Travel:</strong> $0 (in-town only).
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>8U (ages 7-8): $500-1,200 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          The first year of "real" house hockey. The kid is starting to skate confidently, scrimmages are getting more structured, and you'll start buying your own equipment if you haven't already.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Registration:</strong> $200-500. <strong>Equipment:</strong> $300-600 new or $100-200 used. <strong>Travel:</strong> $0-200 (in-town and nearby).
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>10U (ages 9-10): $1,000-2,500 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          This is the decision year. House hockey is still relatively cheap. Travel hockey starts becoming an option, and the cost jumps significantly. The ADM recommends staying in house through 10U unless your kid is clearly a top-tier player.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>House registration:</strong> $400-800. <strong>Travel registration:</strong> $2,000-4,000. <strong>Equipment (refresh):</strong> $200-500. <strong>Travel costs (travel only):</strong> $1,000-3,000.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>12U (ages 11-12): $1,500-5,000 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          The body-check age. Hockey changes at 12U — checking is allowed in most leagues, the game gets faster, and the commitment deepens. House hockey is still a fine choice. Travel starts to mean real travel — out of state weekends, hotels, restaurants.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>House:</strong> $500-1,500. <strong>Travel (regional):</strong> $3,000-7,000. <strong>Travel (elite, AAA):</strong> $5,000-15,000+. <strong>Equipment (full refresh):</strong> $400-800.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>14U (ages 13-14): $2,500-10,000 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          The high school decision. In hockey-strong states (Minnesota, Michigan, Massachusetts, Wisconsin, New England, parts of New York), high school hockey is the dominant development path and it's mostly free. In other states, travel hockey is the only option.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>High school (where available):</strong> $300-1,500. <strong>Travel (regional):</strong> $4,000-10,000. <strong>Travel (elite):</strong> $8,000-25,000. <strong>Off-ice training:</strong> $1,000-3,000 (skating coaches, strength coaches).
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>16U (ages 15-16): $5,000-25,000 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          The junior decision. If your kid is good enough to be drafted into the CHL or recruited by USHL/NAHL teams, this is when the conversation starts. Most kids at this age are still in high school or travel, but the top-tier players have moved to prep schools or junior rosters.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>High school + showcase:</strong> $1,000-3,000. <strong>Prep school:</strong> $25,000-65,000 (tuition + hockey). <strong>NAHL/NCDC:</strong> $15,000-30,000. <strong>USHL:</strong> Billet (free) + small stipend.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>18U (ages 17-18): $5,000-30,000 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          The recruiting year. NCAA D1 scholarships range from partial to full. NAHL, NCDC, and BCHL are pay-to-play but offer good development. Junior A and major junior are the most competitive options.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>NCAA D1:</strong> Tuition (often partially or fully covered). <strong>NCAA D3 / ACHA:</strong> Tuition, but smaller scholarships. <strong>USHL:</strong> Billet (free) + small stipend. <strong>CHL:</strong> Free + small stipend.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The hidden costs nobody warns you about</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Off-ice training:</strong> Skating coaches charge $50-150 per session. Most travel players do 1-2 per week during the season. That's $5,000-15,000 per year.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Travel for tournaments:</strong> Most travel teams play 6-10 out-of-town tournaments per year. Each one is $500-2,000 for the family (hotel, food, gas). That's $3,000-20,000 per year on top of registration.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Off-season training:</strong> Summer hockey camps run $500-2,000 per week. Power skating schools run $300-800 per week. A serious player does 4-6 weeks of off-season training. That's $5,000-15,000 per summer.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Equipment refresh:</strong> Skates last 1-3 years depending on use. Helmets should be replaced every 5-7 years. Gloves and pants last 2-3 seasons. You can stretch this with used gear, but at some point you need to buy new.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Time cost:</strong> The single biggest expense. Travel hockey is 9-12 months a year. A 14U travel player spends 15-20 hours per week on hockey. The family's time is the real cost.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to save money without compromising the experience</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Buy used equipment.</strong> Used hockey gear is 40-60% off new and works just as well. Check your rink's pro shop, Facebook marketplace, and sideline swap.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Stay in house longer.</strong> The ADM is correct. Most kids don't need travel hockey before 14U. The kids who play house through 12U and then jump to travel are often better than the kids who started travel at 10U.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Play multiple sports through 12-13.</strong> The best hockey players in the world played multiple sports growing up. Specializing early doesn't help and may hurt.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Skip the showcase tournaments until 16U.</strong> Showcase tournaments cost $1,500-3,000 per event and only matter for NCAA D1 recruiting. If your kid isn't on a D1 track by 16, the money is better spent elsewhere.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Use the cost calculator annually.</strong> Costs change. Your kid's level changes. Run the calculator at the start of each season and budget for what the year actually costs, not what last year cost.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/tools/hockey-cost-calculator" style={{ color: '#C8102E' }}>Hockey cost calculator</Link></li>
          <li><Link href="/learn/hockey-development-pathway" style={{ color: '#C8102E' }}>Hockey development pathway</Link></li>
          <li><Link href="/learn/choosing-a-program" style={{ color: '#C8102E' }}>How to choose a learn-to-play program</Link></li>
          <li><Link href="/learn/equipment-on-a-budget" style={{ color: '#C8102E' }}>Equipment on a budget</Link></li>
          <li><Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E' }}>Hockey parents handbook</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#888" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

    <LearnJsonLd
      href={"/learn/cost-by-age"}
      title={`Hockey Cost by Age`}
      description={`What youth hockey costs from 6U to 18U: registration, equipment, ice time, travel. Includes the cost calculator link.`}
      verified={"2026-09-10"}
      readTime={8}
    />
</main>
  );
}