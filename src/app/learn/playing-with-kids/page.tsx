import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'Playing Hockey With Your Kid — A Parent\'s Adult League Guide',
  description: 'How to start playing adult hockey as a parent. Gear, beginner-friendly leagues, what to expect, and how to balance playing with your kid\'s hockey schedule.',
  keywords: ['playing hockey as a parent', 'adult league hockey', 'beginner adult hockey', 'beer league', 'hockey parent plays hockey', 'adult learn to play hockey'],
  alternates: { canonical: 'https://rinkstop.com/learn/playing-with-kids' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Playing Hockey With Your Kid',
    description: 'How to start playing adult hockey as a parent. Gear, beginner-friendly leagues, what to expect.',
    type: 'article',
    url: 'https://rinkstop.com/learn/playing-with-kids',
    siteName: 'RinkStop',
  }),
};

export default function PlayingWithKidsPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Playing Hockey With Your Kid</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        PLAYING HOCKEY WITH YOUR KID
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        How to start playing adult hockey as a parent. Gear, beginner-friendly leagues, what to expect, and how to balance playing with your kid's hockey schedule.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Why more parents are playing</h2>
        <p style={{ marginBottom: '1rem' }}>
          The number of adults playing recreational hockey in the US has roughly doubled over the last 15 years. Most of the growth is in the 30-50 age range. Two reasons:
        </p>
        <p style={{ marginBottom: '1rem' }}>
          First, kids get into hockey, parents want to understand the game, and the only way to really understand hockey is to play it. You can read about it. You can watch it. But until you've tried to stop on skates, you don't know what your kid is going through.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Second, adult hockey is a great way to stay in shape and meet people as an adult. Most adult leagues are friendly to beginners. The beer-after-the-game is real.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What you need to start</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Skates:</strong> The most important purchase. Get them fitted at a hockey store. Used is fine if the boot is still structurally sound. Don't buy box-store skates.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Helmet with cage or visor:</strong> Required by every adult league. Buy new — used helmets can't be verified safe.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Gloves, shin guards, hockey pants, shoulder pads, elbow pads:</strong> All fine used. Most adult leagues have a minimum equipment standard — ask before you buy.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Stick:</strong> A senior stick at chin height is the right starting point. Don't overthink flex and curve for your first season. A P92 mid-flex is the safe pick.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Jock or jill:</strong> Non-negotiable. Yes, even in beginner leagues.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Mouthguard:</strong> Recommended. Required in some leagues.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Budget: $400-700 new for a basic adult set, $200-400 used.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Choosing a league</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most cities have a few adult league options. The categories:
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Beginner / D-level leagues:</strong> For players in their first 1-2 years. No checking, no slap shots, lighter officiating. Look for "D" or "Beginner" or "Novice" in the league name. These are the leagues you want for your first year.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Intermediate / C-level:</strong> For players with 2-4 years of experience. More competitive but still friendly. You'll move up to this when beginner feels slow.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Upper / B and A-level:</strong> Competitive. Many ex-junior and ex-college players. Skip until you have a few years of adult hockey under your belt.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Women's leagues:</strong> If your rink has one and you're a woman, these are great. Beginner-friendly and well-organized.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>50+ leagues:</strong> For older players. Lower contact, more skill. Often a mix of beginners and former competitive players.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What your first year will look like</h2>
        <p style={{ marginBottom: '1rem' }}>
          You'll be terrible. Everyone is terrible at first. Adults who have never skated before are the most common new players in adult hockey. You'll spend most of the first 6 months learning to skate well enough to play.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Most adult leagues run games 1-2 times per week. Each game is an hour with a 10-minute warm-up. The pace is slower than NHL. The checking is gentler. The hits are softer. Most adult leagues explicitly prohibit open-ice body checks.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          You'll get knocked down. You'll fall. You'll take a puck to the foot or the shin. None of this is a big deal. Adult hockey players are a forgiving community. As long as you show up and try, you'll be welcome.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to learn fast</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Take a learn-to-skate-for-adults class.</strong> Most rinks offer these. They run 4-6 weeks. They focus on the things you actually need: balance, forward stride, stops, crossovers. After a class, your adult hockey career accelerates.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Skate before you play.</strong> Public skates, drop-in hockey, stick-and-puck sessions. Get on the ice as often as you can. Skill in hockey is mostly skating skill, and skating skill is reps.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Watch a beginner-friendly NHL game with sound off.</strong> Watch the players' feet. The NHLer is going 25 mph but watch how they use their edges. That's the level of edge work you should be aiming for — it takes years, but watching helps.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Don't skip the gym.</strong> Adult hockey players over 30 need strength and conditioning. Core, hamstrings, hip mobility. The fitter you are off the ice, the more confident you are on it.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Balancing hockey and your kid's hockey</h2>
        <p style={{ marginBottom: '1rem' }}>
          This is the part nobody talks about. If you and your kid are both playing, the schedule gets complex fast.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Some families play on the same nights.</strong> If your rink has a 7pm adult game and your kid's practice is at 6pm, one of you is going to miss something. Plan ahead.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Don't play in a way that makes your kid feel like they lost a parent to hockey.</strong> Kids pick up on this. If your adult hockey is taking time away from their games, that's a problem. Talk to them about it.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Play on the same team as your kid sometimes.</strong> Some rinks have parent-child games or parent-child tournaments. These are the best hockey days you'll have.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Use your adult hockey to get better at understanding your kid's game.</strong> The skills transfer both ways. You'll stop yelling "skate harder!" because you'll know what it's like to try to skate harder.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/how-to-skate" style={{ color: '#C8102E' }}>How to skate</Link></li>
          <li><Link href="/learn/parent-survival-guide" style={{ color: '#C8102E' }}>Hockey parent survival guide</Link></li>
          <li><Link href="/learn/first-day-on-ice" style={{ color: '#C8102E' }}>Your first day on the ice</Link></li>
          <li><Link href="/directory/youth-hockey/adult-leagues" style={{ color: '#C8102E' }}>Find an adult league</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#888" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>

    <LearnJsonLd
      href={"/learn/playing-with-kids"}
      title={`Playing Hockey With Your Kid`}
      description={`Adult-league intro for parents who never played. How to start, what gear you need, how to find a beginner-friendly beer league near you.`}
      verified={"2026-09-10"}
      readTime={8}
    />
</main>
  );
}