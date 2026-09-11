import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'How to Watch Hockey — A Guide for New Fans',
  description: 'How to watch hockey as a new fan. How to follow the play, what the camera is missing, why possession matters, and how to enjoy a game without knowing every rule.',
  keywords: ['how to watch hockey', 'watch hockey for beginners', 'new hockey fan', 'understand hockey', 'hockey rules for fans', 'enjoy hockey'],
  alternates: { canonical: 'https://rinkstop.com/learn/how-to-watch-hockey' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Watch Hockey',
    description: 'For new fans: how to follow the play, what the camera is missing, and how to enjoy a game.',
    type: 'article',
    url: 'https://rinkstop.com/learn/how-to-watch-hockey',
    siteName: 'RinkStop',
  }),
};

export default function HowToWatchHockeyPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>How to Watch Hockey</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO WATCH HOCKEY
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        For new fans: how to follow the play, what the camera is missing, why possession matters, and how to enjoy a game without knowing every rule.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The first thing to know: the camera lies</h2>
        <p style={{ marginBottom: '1rem' }}>
          Hockey is a fast sport. The TV camera follows the puck. This means the camera spends 90% of its time on the puck carrier and 10% of its time on everything else. The 10% is where the game actually lives.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Watch the players without the puck. Watch the defencemen positioning. Watch the forwards setting up for a breakout. Watch the goalie tracking the play. The puck carrier is the least interesting person on the ice.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The 5 things to watch for</h2>
        <p style={{ marginBottom: '1rem' }}>
          When you first start watching hockey, the puck feels like it's teleporting around the ice and you can't follow anything. Here's how to find the structure.
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>The defencemen.</strong> Where they go, the play will go. The defencemen are the structure of every team. Watch them.</li>
          <li><strong>The change.</strong> When the puck goes into the offensive zone, watch the forwards change. NHL players change on the fly, usually within 45 seconds. The change is the most important play in hockey.</li>
          <li><strong>The neutral zone.</strong> The middle of the ice is the hardest part to play in. The team that wins the neutral zone wins the game. Watch for the team that breaks out cleanly vs. the one that gets stopped.</li>
          <li><strong>The goalie.</strong> The goalie's positioning tells you the play. If the goalie is cheating to the glove side, the shooter is probably going top-shelf glove. Goalies position based on where the play is going.</li>
          <li><strong>The hits.</strong> A clean body check is a 0.3-second play that ends with the puck carrier on the ice. If you blink you miss it. The buildup is the forecheck. The hit is the punctuation.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Why the score doesn't tell the story</h2>
        <p style={{ marginBottom: '1rem' }}>
          A 3-1 hockey game can be 60 minutes of one team dominating. A 1-0 game can be wide open end-to-end. The score in hockey is misleading in a way that the score in basketball or football is not.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Instead of looking at the score, look at:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>Shots on goal:</strong> A team with 40 shots and 2 goals dominated. A team with 20 shots and 4 goals got lucky.</li>
          <li><strong>Time of possession:</strong> More time with the puck usually means more chances.</li>
          <li><strong>Power play opportunities:</strong> Drawing penalties is a skill. A team that takes 6 power plays is forcing the other team into mistakes.</li>
          <li><strong>Faceoff win percentage:</strong> Especially in the defensive zone. Winning the draw after an icing means you keep the puck instead of giving it back.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The seasons of hockey</h2>
        <p style={{ marginBottom: '1rem' }}>
          Hockey is an 82-game regular season plus playoffs. The games are different depending on the time of year.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>October-November:</strong> The first month of the season. Teams are still figuring out their line combinations. Defensive systems are rusty. Expect high-scoring games. Standings are mostly meaningless.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>December-February:</strong> The middle of the season. The hockey is more settled, the standings start to take shape. This is the most reliable hockey to watch — teams are in mid-season form, the games are meaningful, the highlights are great.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>March:</strong> The trade deadline. Contending teams get better. Losing teams sell veterans. Standings start to lock in.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>April:</strong> The Stanley Cup Playoffs. Best-of-7 series. The games are tighter, the hits are harder, the goaltending is better. Every shot matters.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>May-June:</strong> The Conference Finals and Stanley Cup Final. The best hockey of the year.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to pick a team</h2>
        <p style={{ marginBottom: '1rem' }}>
          New fans often default to a local team. If you have one, watch them. If you don't, here's how to pick.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The defending Stanley Cup champion</strong> is the most fun to watch at the start of the season — they're the best, and the hockey reflects that. Once they're eliminated in the playoffs, you have a clean break to pick someone new.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>A young rebuilding team</strong> is great for new fans — the players are exciting, the games are often high-scoring, and you grow with the team. Edmonton, Seattle, and Anaheim have all been good "new fan" teams in recent years.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Your hometown team</strong> is the most fun when you can go to games. The cost of a single ticket to a non-marquee team is $30-80. Going to a game is a much better way to learn hockey than watching on TV.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Five rules for a new fan</h2>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>The puck must enter the offensive zone before any attacking player. That's offside.</li>
          <li>You can't shoot the puck from your half all the way down without anyone touching it. That's icing.</li>
          <li>When the whistle blows, play stops. Most whistles are offside or icing.</li>
          <li>Power play = your team has more skaters. Penalty kill = fewer skaters.</li>
          <li>After regulation, it's sudden-death overtime, then shootout. (Playoff games keep going to sudden-death overtime until someone scores.)</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/hockey-rules" style={{ color: '#C8102E' }}>Hockey rules explained</Link></li>
          <li><Link href="/learn/hockey-terminology" style={{ color: '#C8102E' }}>Hockey glossary</Link></li>
          <li><Link href="/learn/hockey-positions-explained" style={{ color: '#C8102E' }}>Hockey positions explained</Link></li>
          <li><Link href="/glossary" style={{ color: '#C8102E' }}>Full glossary (100+ terms)</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>


    <LearnJsonLd
      href={`/learn/how-to-watch-hockey`}
      title={`How to Watch Hockey`}
      description={`For new fans: how to follow the play, what the camera is missing, why possession matters, and how to enjoy a game without knowing every rule.`}
      verified={`2026-09-10`}
      readTime={7}
    />
</main>
  );
}