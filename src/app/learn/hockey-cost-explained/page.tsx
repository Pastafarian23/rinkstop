import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How Much Does Hockey Cost? — A Complete Cost Guide for Parents and Players',
  description: 'A complete breakdown of hockey costs at every level — registration, equipment, ice time, travel, and tournament fees. What parents and players actually spend each year.',
  keywords: ['hockey cost', 'hockey registration', 'hockey fees', 'ice hockey cost', 'youth hockey cost'],
  alternates: { canonical: 'https://rinkstop.com/learn/hockey-cost-explained' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'How Much Does Hockey Cost? — A Complete Cost Guide',
    description: 'Registration, equipment, ice time, travel, and tournament fees at every level.',
    type: 'article',
    url: 'https://rinkstop.com/learn/hockey-cost-explained',
    siteName: 'RinkStop',
  },
};

export default function HockeyCostExplainedPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>How Much Does Hockey Cost?</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW MUCH DOES HOCKEY COST?
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        A complete breakdown of what hockey actually costs at every level — registration, equipment, ice time, travel, and tournament fees. Numbers are US/Canada averages as of 2025–2026.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The honest answer</h2>
        <p style={{ marginBottom: '1rem' }}>
          Hockey is expensive. It is one of the most expensive youth sports in North America. The cost depends almost entirely on three things: how competitive the player wants to be, where they live, and how much equipment and travel the family chooses to invest in.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          The range is wide. A recreational house-league player in a small town can play for under $500 per year. A travel-tier teenager chasing junior hockey exposure can cost $10,000–$25,000 per year. Both are real hockey. Both are valid.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The four cost categories</h2>
        <p style={{ marginBottom: '1rem' }}>
          Every hockey family&rsquo;s budget falls into four buckets:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Equipment</strong> — skates, sticks, pads, helmet, base layers. One-time cost for the season, with sticks as the recurring expense.</li>
          <li><strong>Ice and registration</strong> — league fees, practice ice, association dues, registration. The recurring baseline.</li>
          <li><strong>Travel and tournaments</strong> — optional but where most of the money goes at competitive levels.</li>
          <li><strong>Off-ice training</strong> — strength, skating coaches, skills sessions. Common at the travel and junior levels.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>House league and recreational: $200–$1,500 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          The most common entry point. Most communities have a local youth hockey association running a house program for ages 5–14. Typical costs:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Registration:</strong> $100–$500 per season, depending on the association and what&rsquo;s included (jersey, ice time, end-of-season trophy).</li>
          <li><strong>Equipment (first year):</strong> $200–$600 if buying used or entry-level new. $400–$1,000 for mid-tier new.</li>
          <li><strong>Equipment (recurring):</strong> Sticks are the only major recurring equipment cost — $40–$80 per stick, replaced every 1–3 months depending on use.</li>
          <li><strong>Travel:</strong> Mostly local — games at the home rink and nearby associations. Maybe $100–$300 per season in gas.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Total for the first year: <strong>$500–$1,500</strong>. After equipment is paid off, ongoing annual cost drops to $400–$1,000 depending on stick usage and registration.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Travel and select (A, AA, AAA): $3,000–$15,000 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          The competitive tier. Costs scale quickly with ambition:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Registration:</strong> $1,000–$4,000 per season, depending on tier and region.</li>
          <li><strong>Tournament fees:</strong> $300–$1,500 per tournament; teams typically play 4–8 tournaments per season. That&rsquo;s $1,200–$12,000 in tournament fees alone.</li>
          <li><strong>Travel:</strong> Out-of-state tournaments and showcases can run $500–$2,000 per trip in airfare, hotel, and meals for the family.</li>
          <li><strong>Off-ice training:</strong> Skating coaches ($80–$200 per session), strength coaches, skills sessions — $1,500–$5,000 per year is typical.</li>
          <li><strong>Equipment upgrades:</strong> Higher-tier skates, sticks, gloves. $300–$600 per year beyond recreational replacement.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Total: <strong>$5,000–$20,000</strong> per year is common. Some AAA families spend $25,000+, especially in Midget and 16U/18U where showcase tournaments cluster around college recruiting.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Junior hockey (USHL, NAHL, CHL): $5,000–$20,000 per year</h2>
        <p style={{ marginBottom: '1rem' }}>
          Major junior is the highest tier of amateur hockey. Players typically live away from home with billet families. Costs:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Tuition:</strong> Most USHL teams charge $5,000–$15,000 per year; some offer partial scholarships. NAHL is similar.</li>
          <li><strong>CHL (OHL/WHL/QMJHL):</strong> The CHL is fully funded — players receive a stipend for education and living expenses, no tuition. The trade-off is loss of NCAA eligibility under current rules.</li>
          <li><strong>BCHL and other Tier 2:</strong> $3,000–$8,000 per year. Often combined with prep school or online schooling.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Total: <strong>$5,000–$20,000</strong>. At major junior, the cost is structured as tuition rather than travel — but the dollar amounts are similar.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>NCAA hockey</h2>
        <p style={{ marginBottom: '1rem' }}>
          NCAA D-I hockey programs offer partial scholarships. Full rides are rare; a typical scholarship covers 25–75% of cost of attendance. Annual cost-of-attendance for NCAA D-I is roughly $30,000–$70,000 depending on the school, with scholarship aid varying widely.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          NCAA D-III and ACHA hockey don&rsquo;t offer athletic scholarships but academic aid is available. ACHA hockey costs range from minimal (club fees) to several thousand dollars per year depending on the program&rsquo;s structure.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Adult recreational hockey</h2>
        <p style={{ marginBottom: '1rem' }}>
          Adult beer league and recreational hockey is dramatically cheaper. Typical costs:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>League fees:</strong> $300–$1,500 per season, depending on the league and number of games.</li>
          <li><strong>Equipment:</strong> Used or entry-level $200–$500; mid-tier $500–$1,000.</li>
          <li><strong>Ice time (drop-in):</strong> $10–$25 per session in most rinks.</li>
          <li><strong>Sticks:</strong> Same as youth — $40–$80 each, replaced as needed.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Total: <strong>$500–$2,500</strong> per year. Adult hockey is the best value in the sport: ice time is the only real cost, and most adult players find it affordable.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Where the money actually goes</h2>
        <p style={{ marginBottom: '1rem' }}>
          For a typical travel-tier family, the breakdown looks roughly like:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Registration: 15–25%</li>
          <li>Equipment (amortized): 10–15%</li>
          <li>Tournaments: 30–45%</li>
          <li>Travel (gas, hotels, flights): 20–30%</li>
          <li>Off-ice training: 5–15%</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Ways to reduce cost without reducing play</h2>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Buy used equipment.</strong> SidelineSwap, Play It Again Sports, and local hockey shop used racks have skates, sticks, pads, and helmets for 50–70% off new. The only items to buy new are helmets (because of impact history) and base layers.</li>
          <li><strong>Stay with house league longer.</strong> Most players don&rsquo;t need travel hockey until at least 12 or 13. Years of high-cost travel before that rarely pay off in development terms.</li>
          <li><strong>Play multiple sports.</strong> Reduces hockey-specific burnout and lets the family spread the off-season cost across other activities.</li>
          <li><strong>Be strategic about tournaments.</strong> Two well-chosen showcase tournaments beat five local ones for both development and exposure.</li>
          <li><strong>Buy sticks in bulk off-season.</strong> Major retailers run clearance sales in March–May. Stocking up then saves 30–40%.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Cost per ice hour</h2>
        <p style={{ marginBottom: '1rem' }}>
          A useful way to think about cost: dollars per hour on the ice. At the recreational level, a $500 season with 30 hours of ice time is roughly $17 per ice hour. At the travel level, $15,000 and 200 hours of ice time is $75 per hour. At junior, similar — the cost is amortized across more ice hours but the raw dollar cost is high.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          The point isn&rsquo;t that travel hockey is bad value — for the player pursuing elite development, it may be the right choice. The point is that you should know what you&rsquo;re paying for and decide deliberately rather than drifting up the cost ladder.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Financial assistance</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most associations have financial assistance programs — they&rsquo;re under-used because families don&rsquo;t know about them. The NHL Players&rsquo; Association, NHL clubs, USA Hockey, Hockey Canada, and most local associations all run subsidized equipment or registration programs. Ask your local association director or the rink&rsquo;s front desk. There is no penalty for asking.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The honest tradeoff</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Hockey costs what it costs. For most families, the financial decision is real and individual. House hockey is excellent. Travel hockey is excellent. Adult hockey is excellent. The sport doesn&rsquo;t require $15,000 per year to love or to be good at — but it often pays $15,000 per year to chase the small chance of going further. Both choices are valid, and the right one depends on your family&rsquo;s goals, budget, and the player&rsquo;s actual trajectory — not the trajectory the tournament brochure promises.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>
    </main>
  );
}
