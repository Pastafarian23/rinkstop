import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';
import MarkReadButton from '@/components/learn/MarkReadButton';

export const metadata: Metadata = {
  title: 'Hockey Rules for Beginners — Every NHL Rule in Plain Language',
  description: 'Hockey rules explained in plain language for new fans and players. Covering offside, icing, faceoffs, penalties, power plays, overtime, and the rules every beginner should know.',
  keywords: ['hockey rules', 'hockey rules for beginners', 'NHL rules', 'offside', 'icing', 'penalties', 'power play', 'hockey overtime', 'how to watch hockey'],
  alternates: { canonical: 'https://rinkstop.com/learn/hockey-rules' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Rules for Beginners',
    description: 'Every NHL rule in plain language — offside, icing, faceoffs, penalties, and the rest.',
    type: 'article',
    url: 'https://rinkstop.com/learn/hockey-rules',
    siteName: 'RinkStop',
  }),
};

export default function HockeyRulesPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Hockey Rules</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOCKEY RULES FOR BEGINNERS
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        Every NHL rule explained in plain language. The 12-minute primer new fans and players need.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The basics: how a game works</h2>
        <p style={{ marginBottom: '1rem' }}>
          An NHL game has three 20-minute periods. The clock runs continuously — it only stops for goals, penalties, offside calls, icing calls, and timeouts. If the game is tied at the end of regulation, the teams play a 5-minute sudden-death overtime at 3-on-3 (since 2015). If still tied, the game goes to a shootout — three rounds of one player skating in alone against the goalie, alternating teams. The team that scores more in the shootout wins.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Each team puts six players on the ice at a time: one goaltender and five skaters (two defencemen and three forwards, usually). Teams rotate players on and off the ice in shifts of 45 seconds to two minutes. The longer a player stays on, the more tired they get — the game moves fast because the ice is full of fresh legs.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Offside</h2>
        <p style={{ marginBottom: '1rem' }}>
          Offside is the most-misunderstood rule. Here is the simple version: when a player carries the puck across the opponent's blue line (the line nearest the opponent's goal), every teammate must already be on the same side of the blue line as the puck. If a teammate crosses the blue line ahead of the puck, the play is offside and the referee blows the whistle.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The common mistake is thinking offside is about being in the opponent's zone. It's about the order of crossing the blue line. A team can have all five skaters in the offensive zone — as long as the puck crossed the blue line before the last one did.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The blue line itself is a one-foot-wide blue strip. Skating over it with the puck on your stick makes you the player who established the line. Everyone else must already be across.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Icing</h2>
        <p style={{ marginBottom: '1rem' }}>
          Icing is simpler than offside. If a player shoots the puck from his own side of the red center line all the way down to the other end of the rink (across the opponent's goal line) without it being touched, the play is dead. The faceoff comes back into the team that iced's defensive zone.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Icing exists to prevent a team that's winning from spending the whole game just shooting the puck down the rink to waste time. The rule forces them to actually try to score.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Two exceptions: if a team is short-handed (killing a penalty), they cannot be iced. And if the goalie plays the puck before it crosses the goal line, no icing.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Penalties</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most penalties are two minutes long, served with the offending player in the penalty box. The team that drew the penalty plays with one more skater on the ice — this is a <strong>power play</strong>. If a team is on a 5-on-3 (two players in the box), the power play usually scores, so referees are conservative about calling back-to-back penalties.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Common penalties:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Tripping</strong> — using your stick, knee, or foot to knock a player down. 2 minutes.</li>
          <li><strong>Hooking</strong> — tugging a player with the blade of your stick. 2 minutes.</li>
          <li><strong>Slashing</strong> — swinging your stick at an opponent. 2 minutes (5 if it's a major).</li>
          <li><strong>High-sticking</strong> — hitting an opponent above the shoulders. 2 or 4 minutes depending on severity.</li>
          <li><strong>Slashing</strong> — swinging your stick at an opponent. 2 or 5 minutes depending on whether it draws blood.</li>
          <li><strong>Interference</strong> — impeding a player who doesn't have the puck. 2 minutes.</li>
          <li><strong>Holding</strong> — grabbing a player to stop their movement. 2 minutes.</li>
          <li><strong>Delay of game</strong> — shooting the puck over the glass from your own zone, or other stalling. 2 minutes.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          A <strong>penalty shot</strong> is awarded when a player is fouled on a clear breakaway. The fouled player skates in alone against the goalie. A <strong>five-minute major</strong> (fighting, boarding from behind) gets the player ejected if called as a match penalty; otherwise the team plays the full 5 minutes short-handed.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Faceoffs</h2>
        <p style={{ marginBottom: '1rem' }}>
          Play starts and restarts with a faceoff: the referee drops the puck between two opposing players' sticks at one of the nine faceoff dots on the ice. The two players try to win possession for their team by passing the puck back to a teammate.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          There are rules about faceoff positioning: players must have both skates behind the hash marks on either side of the dot, sticks must be in the air and come down together with the blade flat on the ice. There are restrictions on what the centers can do (no sweeping motion) to prevent teams from cheating the drop.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Power plays and penalty kills</h2>
        <p style={{ marginBottom: '1rem' }}>
          A <strong>power play</strong> is when your team has more skaters than the other (because the other team has someone in the penalty box). A <strong>penalty kill</strong> is the opposite — your team is short-handed and defending.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Power plays are where most of the goals in modern hockey come from. The attacking team pulls the goalie and plays with an extra attacker in some situations (5-on-6 with the goalie pulled is called a 6-on-5, but it's just a power play variation). When a team on the power play scores, the penalty ends.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Offsides vs. Icing — the difference new fans always ask about</h2>
        <p style={{ marginBottom: '1rem' }}>
          Both are stoppages. Both are called by linesmen. The difference: <strong>offside</strong> is about player position relative to the puck and the blue line. <strong>Icing</strong> is about where the puck is shot from and to, with no one touching it.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          If you're confused by either, watch for the linesman raising his arm before blowing the whistle. Arm up = offside is coming (or icing is coming). The whistle confirms which.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Linesmen vs. referees</h2>
        <p style={{ marginBottom: '1rem' }}>
          Every NHL game has four officials on the ice: two <strong>referees</strong> in striped jerseys and two <strong>linesmen</strong> with orange armbands. Referees call all penalties, manage the game, and handle video review. Linesmen call offside and icing, drop faceoffs, and break up fights.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Yes, two refs on the ice. Most fans don't notice because the linesmen are more visible.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What you need to know to enjoy a game</h2>
        <p style={{ marginBottom: '1rem' }}>
          You don't need to memorize all of this to enjoy hockey. The five things that matter most for a new fan:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>The puck must enter the offensive zone before any attacking player.</strong> That's offside.</li>
          <li><strong>You can't shoot the puck from your half all the way down without anyone touching it.</strong> That's icing.</li>
          <li><strong>When the whistle blows, play stops.</strong> Most whistles are offside or icing.</li>
          <li><strong>Power play = your team has more skaters. Penalty kill = fewer skaters.</strong></li>
          <li><strong>After regulation, it's sudden-death overtime, then shootout.</strong></li>
        </ol>
        <p style={{ marginBottom: '1rem' }}>
          Watch a game with those five rules in your head. The rest will fill in.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/hockey-terminology" style={{ color: '#C8102E' }}>Hockey glossary: every term explained</Link></li>
          <li><Link href="/learn/hockey-positions-explained" style={{ color: '#C8102E' }}>Hockey positions explained</Link></li>
          <li><Link href="/learn/how-to-watch-hockey" style={{ color: '#C8102E' }}>How to watch hockey (for new fans)</Link></li>
          <li><Link href="/guides/hockey-rules" style={{ color: '#C8102E' }}>Full hockey rules deep-dive</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <MarkReadButton href="/learn/hockey-rules" title="HOCKEY RULES FOR BEGINNERS" />
      </div>

    <LearnJsonLd
      href={`/learn/hockey-rules`}
      title={`Hockey Rules for Beginners`}
      description={`Every NHL rule in plain language. Offside, icing, faceoffs, penalties, power plays, and overtime — the 12-minute primer new fans and players need.`}
      verified={`2026-09-10`}
      readTime={12}
    />
</main>
  );
}