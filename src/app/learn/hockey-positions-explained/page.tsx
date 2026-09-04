import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Positions Explained — Forwards, Defensemen, Goalies',
  description: 'A complete guide to every hockey position: centers, wings, defensemen, goalies. What each position does on the ice, the skills that matter, and how NHL teams deploy them.',
  keywords: ['hockey positions', 'centers', 'wings', 'defensemen', 'goalies', 'hockey roles'],
  alternates: { canonical: 'https://rinkstop.com/learn/hockey-positions-explained' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Positions Explained — A Complete Guide',
    description: 'What every hockey position does on the ice, the skills that matter, and how modern NHL teams deploy them.',
    type: 'article',
    url: 'https://rinkstop.com/learn/hockey-positions-explained',
    siteName: 'RinkStop',
  }),
};

export default function HockeyPositionsExplainedPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Positions Explained</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOCKEY POSITIONS EXPLAINED
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        A complete guide to every position on the ice — what each role does during a shift, the skills that matter, and how modern teams deploy them.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The basics: three position groups, six skater roles, one goalie</h2>
        <p style={{ marginBottom: '1rem' }}>
          A hockey team fields 20 players per game: 12 forwards (4 lines of 3), 6 defensemen (3 pairs), and 2 goalies (1 starter, 1 backup). The forwards are split into <strong>centers</strong> and <strong>wings</strong>; the defensemen into <strong>left</strong> and <strong>right</strong>. On the ice at any moment: 5 skaters + 1 goalie per side.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          That structure hasn't changed since the NHL expanded from the Original Six era, but the way the roles are deployed has evolved dramatically. The 1980s Montreal Canadiens and the 2024 Florida Panthers both ice 12 forwards and 6 defensemen, but almost nothing else about their usage is the same.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Center</h2>
        <p style={{ marginBottom: '1rem' }}>
          The center takes the faceoff, drives the primary offensive transition, and covers the most ice of any forward. The job has three components that don't overlap with wings:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Faceoffs.</strong> Centers take roughly 80% of draws. Win percentage on faceoffs is a tracked stat for a reason — possession starts there.</li>
          <li><strong>Defensive responsibility.</strong> The center is the first forward back. On a 2-on-1 against, the center is the low guy, not the wing. The center covers the slot in the defensive zone and reads the rush.</li>
          <li><strong>Puck distribution.</strong> Centers are the playmaker of the line. Elite centers — Connor McDavid, Auston Matthews, Nathan MacKinnon — drive offense by carrying and distributing the puck through the neutral zone at speed.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          The skill set is unusual: centers need to be both the best skater on the line <em>and</em> the best defensive forward. Most modern NHL teams deploy one of three center archetypes:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Two-way center.</strong> Selke-caliber. Plays both ends of the ice, eats top opposition minutes, leads the penalty kill. Examples: Patrice Bergeron (career), Aleksander Barkov.</li>
          <li><strong>Scoring center.</strong> Top-six scoring forward. Takes easier defensive zone faceoffs (the wing covers the d-zone draw). Examples: Connor McDavid, Auston Matthews.</li>
          <li><strong>Bottom-six grinder.</strong> Energy line, fourth line, penalty kill specialist. Examples: Marcus Foligno, Blake Coleman.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Wings (left wing and right wing)</h2>
        <p style={{ marginBottom: '1rem' }}>
          Wings play on either side of the center. The L and R designation matters less than the role:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Scoring wing.</strong> Finishes the play. Plays off the center, drives the net, shoots from the circles. Examples: David Pastrnak, Nikita Kucherov (he's a right wing), Kirill Kaprizov.</li>
          <li><strong>Power forward.</strong> Combines scoring with physical play. Drives the net, finishes checks, plays in front of the net on the power play. Examples: Tom Wilson, Matthew Tkachuk, Aleksander Ovechkin (career).</li>
          <li><strong>Two-way wing.</strong> Plays responsibly at both ends. Often paired with a scoring center to balance the line. Examples: Jordan Staal, Brandon Tanev.</li>
          <li><strong>Energy wing.</strong> Bottom-six, agitator, penalty kill. Examples: Nic Deslauriers, Mathieu Olivier.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          The difference between left and right wing is largely about handedness and faceoff dot positioning, but in modern hockey the distinction has blurred. Most top-six wings can play either side — David Pastrnak and Nikita Kucherov both shoot left and play right wing.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Defensemen</h2>
        <p style={{ marginBottom: '1rem' }}>
          Six defensemen, three pairs. The pair is the unit: a top-pair defenseman almost never plays without a partner. The job is to:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Break out pucks.</strong> The first pass out of the defensive zone is the most important pass in hockey. Elite defensemen make this pass cleanly under pressure.</li>
          <li><strong>Defend the slot and the net-front.</strong> Box out, clear the crease, win battles in front of the goalie.</li>
          <li><strong>Join the rush.</strong> The activation — when a defenseman pinches or jumps into the offensive zone — is one of the most discussed decisions in modern hockey. Roman Josi, Cale Makar, and Quinn Hughes are all defensemen who lead their teams in shot contribution because they activate aggressively.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          Defensemen come in three flavors:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Top-pair, two-way defenseman.</strong> Plays 24+ minutes a night, all situations. Norris Trophy contenders. Examples: Cale Makar, Victor Hedman, Roman Josi.</li>
          <li><strong>Offensive defenseman.</strong> Quarterback of the power play. Activates into the rush. Examples: Quinn Hughes, Adam Fox.</li>
          <li><strong>Defensive defenseman / shutdown D.</strong> Starts in the defensive zone, plays the penalty kill, eats matchups against top opposition. Examples: Jaccob Slavin, Esa Lindell.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Goalie</h2>
        <p style={{ marginBottom: '1rem' }}>
          One goalie plays the whole game unless they&rsquo;re pulled or injured. There is no &ldquo;goalie rotation&rdquo; in the modern NHL — the starter plays 55&ndash;65 games per season and the backup plays the rest.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The job is fundamentally different from every other position:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Track the puck through traffic.</strong> Goalies face 30&ndash;35 shots per game with bodies, sticks, and the net in front of them. Visual tracking is the skill.</li>
          <li><strong>Positionally efficient.</strong> Modern goalies play a structured positional game (butterfly, hybrid, or RVH depending on the angle). Goals happen when positioning breaks down, not when reflexes fail.</li>
          <li><strong>Puck-handling.</strong> Since the 2000s, goalies are expected to play the puck behind the net and on dump-ins. Connor Hellebuyck, Igor Shesterkin, and Linus Ullmark are all above-average puck-handlers; this is no longer optional at the top level.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Goalies are evaluated differently from skaters. The most important stat is <strong>save percentage (SV%)</strong>, with high-danger save percentage (HDSV%) and goals saved above expected (GSAx) as the modern refinements. A .920 SV% is average; .930+ is Vezina-caliber; .940+ is historic.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How modern NHL teams deploy these positions</h2>
        <p style={{ marginBottom: '1rem' }}>
          Three structural shifts in the last 20 years changed how NHL coaches deploy the 5 skaters on the ice:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>The fourth forward line is now an actual line.</strong> Bottom-six forwards are specialized: grinders, PK specialists, energy players. The fourth line averages 10&ndash;12 minutes per game and has a defined role, not just &ldquo;shut down&rdquo; minutes.</li>
          <li><strong>Defensemen activate aggressively.</strong> The 1-3-1 neutral zone forecheck and the 2-1-2 hold demand that defensemen read the rush and either pinch or retreat. The &ldquo;stay-at-home defenseman&rdquo; archetype is nearly extinct at the top level.</li>
          <li><strong>The power play has become a specialty unit.</strong> Modern PP1 is five players — usually a scoring center, two wings, an offensive defenseman at the point, and a net-front presence. The systems (umbrella, 1-3-1, overload) are studied in detail because special teams decide close games.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What this means for following the game</h2>
        <p style={{ marginBottom: '1rem' }}>
          Once you know the positions, watching hockey gets dramatically easier. You start to see why a coach rolls four lines instead of three, why a defenseman pinches on the weak side, why a goalie plays the puck instead of freezing it, why a power play looks like an umbrella and not a 1-3-1.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          It also makes the player pages on RinkStop make more sense. When you read about a center, you know the role before you read the bio. When you read about an offensive defenseman, you know what to look for on the ice.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Sources</h2>
        <p style={{ marginBottom: '1rem' }}>
          This guide draws on public coverage of NHL positional roles and how teams deploy them. The statistics and role archetypes referenced here are documented across league game reports, official NHL.com position guides, and Hockey Reference&rsquo;s positional splits.
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><a href="https://www.nhl.com/stats/team" style={{ color: '#C8102E' }}>NHL.com — Team Statistics</a></li>
          <li><a href="https://www.hockey-reference.com/" style={{ color: '#C8102E' }}>Hockey Reference — Positional Splits</a></li>
          <li><a href="https://www.nhl.com/news/tag/hockey-101" style={{ color: '#C8102E' }}>NHL.com Hockey 101</a></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/directory/players" style={{ color: '#C8102E' }}>Browse all hockey players</Link></li>
          <li><Link href="/directory/teams" style={{ color: '#C8102E' }}>Browse all hockey teams</Link></li>
          <li><Link href="/learn" style={{ color: '#C8102E' }}>More RinkStop Learn guides</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>
    </main>
  );
}
