import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'Hockey Glossary — 70+ Hockey Terms and Slang Explained',
  description: 'Hockey terms and slang explained in plain language. From apple, biscuit, and barn to five-hole, apple, and tic-tac-toe — every beginner hockey term.',
  keywords: ['hockey glossary', 'hockey terms', 'hockey slang', 'hockey vocabulary', 'hockey lingo', 'what does apple mean in hockey'],
  alternates: { canonical: 'https://rinkstop.com/learn/hockey-terminology' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Glossary — 70+ Terms Explained',
    description: 'Every hockey term and slang word you need to know to follow the game.',
    type: 'article',
    url: 'https://rinkstop.com/learn/hockey-terminology',
    siteName: 'RinkStop',
  }),
};

export default function HockeyTerminologyPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Glossary</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOCKEY GLOSSARY
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        70+ hockey terms and slang words. Bookmark this — you'll be hearing these for years.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.7, fontSize: '0.95rem' }}>
        <p style={{ marginBottom: '1rem' }}>
          Hockey has its own language, and a lot of it sounds like nonsense to a new fan or player. This is the glossary you'd want on Day 1.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>The puck</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Puck</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The black rubber disc. Officially 1 inch thick, 3 inches in diameter, 6 ounces.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Apple, biscuit, rock, hamburger, donut</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>All slang for the puck. Different terms in different regions and locker rooms.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>The five-hole</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The open space between a goalie's legs. A shot through the five-hole is a "five-hole goal" or, in slang, going "between the pipes" low.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Top shelf</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Upper part of the net. "Top shelf where mom keeps the peanut butter" is the classic goalie comment.</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>The rink</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Blue line</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The line that separates the offensive/defensive zones from the neutral zone. Offsides are called when a player crosses before the puck.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Red line</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Center of the ice. Used for icing calls and (historically) two-line passes.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Faceoff dot</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The 9 spots where faceoffs happen (2 in each zone, 4 in the neutral zone, 1 center).</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Slot</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The area in front of the net between the faceoff circles. Where most goals are scored from.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Point</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The area just inside the blue line where defencemen take shots from. "Shoot from the point" means shoot from the blue line.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>The boards</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The white wall around the rink. "Going to the boards" or "cycling along the boards" means playing the puck behind the opponent's net.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>The crease</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The blue-painted semicircle in front of the net. The goalie's space — opponents can't run into the goalie here.</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Positions</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Forward</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>One of the three skaters responsible for offense. Includes center and two wings.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Center</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The forward who takes most faceoffs and plays both offense and defense. Considered the "quarterback" of the line.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Winger (LW / RW)</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Forwards who play the sides. Left wing and right wing.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Defenceman (D)</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Plays defense. Usually two on the ice at a time.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Goaltender, goalie, netminder, tendy</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The player in the net. "Tendy" is locker-room slang.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>D-man, blueliner</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>More slang for defenceman. A "blueliner" plays at or near the blue line.</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Plays and moves</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Breakaway</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>When a player has the puck and no defender between them and the goalie except the goalie. Penalty shot if fouled.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>One-timer</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A shot taken directly off a pass without stopping the puck first. Hard to defend.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Saucer pass</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A pass that floats over an opponent's stick or a puddle. Named for its flying-saucer shape.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Deke</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Short for "deke" (deception). A move to fake out a defender — usually faking one direction then going another.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Celly, celly</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Slang for a goal celebration. A big celly is a big celebration. Some are choreographed.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Dangle</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>To stickhandle past a defender with a fancy move. "He dangled through three guys" means he made them look silly.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Top cheddar, mitts</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Slang for the hands/gloves. "Top cheddar" is a goal scorer's hands. "Mitts" are the gloves.</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Goaltender slang</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Pipe</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The inside post of the goal. "Off the pipe and in" means a shot that hit the post and went in.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Iron</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Same as the pipe — the post of the goal.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Snipe, snipe show, snipe city</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A perfectly placed shot. Top-shelf snipe = perfect shot to the upper corner.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Bar down</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A shot that hits the crossbar and goes down into the net. Considered one of the prettiest goals.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Glove side / blocker side</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>The two sides of the goalie. Goalies catch with their glove hand; they deflect with their blocker (the square pad on the stick hand). Knowing which side is which helps read shot placement.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Tendy, keeper, puck-stopper</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Slang for goalie. Especially common in the UK and parts of Europe.</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Equipment and arena</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Bucket, bucket helmet</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Slang for helmet. "He got his bucket on" means he's playing safely.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Baggie, bag</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Hockey bag. "Throw it in the bag" means put it in the equipment bag.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Barn</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Slang for the arena, especially a smaller or older one. "We're playing at the barn tonight" means a small, homey rink.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Tape, tape job</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Hockey tape. Players tape their sticks, socks, and pants. A "tape job" is the art of taping your stick the way you like it.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Lumber, stick</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Hockey stick. "He went to the lumber drawer" means a player grabbed a backup stick.</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Game situations</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>5-on-5</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Even-strength play. Each team has 5 skaters + 1 goalie.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>5-on-4, 5-on-3</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Power play situations. The team with more skaters has the man advantage.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>4-on-4</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>When both teams have a player in the box simultaneously. More open ice, more goals.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>3-on-3</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Overtime format. More open ice than any other situation. Lots of goals. Also used in some youth leagues for development.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Empty net</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>When the goalie has been pulled (replaced with a sixth skater) for an offensive advantage. Common in the last minute of a game when a team is losing.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>6-on-5</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A team with the goalie pulled. Same as "extra attacker" or "empty net situation."</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Style and culture</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Bardown, BDN</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A hard, clean hit. Used as an exclamation: "Bardown!"</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Tic-tac-toe, tic-tac</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>When a player passes to one teammate who immediately passes to another without holding the puck. Originated from the Xs-and-Os pattern.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Gordie Howe hat trick</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A goal, an assist, and a fight in the same game. Named for the legendary player who did it often.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Spin-o-rama</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A 360-degree spin move to evade a defender. Legal in some leagues, illegal in others. Famous moment: Peter Forsberg's goal in the 1994 Olympics shootout.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Light the lamp</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>Slang for scoring a goal. Comes from the red goal light that turns on behind the net.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Tape-to-tape</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A pass that travels the full width of the ice, from one defenceman to the other, with no one touching it. Beautiful when it works.</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Stats terms</h2>
        <dl style={{ marginBottom: '1.5rem' }}>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>G, A, P (goals, assists, points)</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>A goal is a goal. An assist is one of the two passes that set up a goal. Points = goals + assists.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>Plus/minus (+/-)</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>If your team scores an even-strength goal while you're on the ice, +1. If they get scored on, -1. Coincidental but useful.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>GAA (goals against average)</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>For goalies: how many goals you let in per 60 minutes. Lower is better.</dd>
          <dt style={{ fontWeight: 700, marginTop: '0.5rem' }}>SV% (save percentage)</dt>
          <dd style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>For goalies: the percentage of shots you stop. Modern NHL goalies save around 0.910 (91%).</dd>
        </dl>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/hockey-rules" style={{ color: '#C8102E' }}>Hockey rules explained</Link></li>
          <li><Link href="/learn/hockey-positions-explained" style={{ color: '#C8102E' }}>Hockey positions explained</Link></li>
          <li><Link href="/learn/how-to-watch-hockey" style={{ color: '#C8102E' }}>How to watch hockey</Link></li>
          <li><Link href="/glossary" style={{ color: '#C8102E' }}>Full hockey glossary (100+ terms)</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2rem', marginBottom: '0.75rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#888" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

    <LearnJsonLd
      href={"/learn/hockey-terminology"}
      title={`Hockey Glossary`}
      description={`70+ hockey terms and slang words. From apple, biscuit, and barn to five-hole, tic-tac-toe, and bar down — every beginner hockey term explained.`}
      verified={"2026-09-10"}
      readTime={6}
    />
</main>
  );
}