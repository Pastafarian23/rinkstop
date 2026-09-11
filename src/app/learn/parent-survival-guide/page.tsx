import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'Hockey Parent Survival Guide — Day 1 to Season 1',
  description: 'Hockey parent survival guide. What to bring, what to say (and not say), how to talk to coaches, and the do/don\'t list for parents of new hockey players.',
  keywords: ['hockey parent guide', 'hockey parent tips', 'first time hockey parent', 'hockey parent survival', 'hockey parent do and dont'],
  alternates: { canonical: 'https://rinkstop.com/learn/parent-survival-guide' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Parent Survival Guide',
    description: 'Day 1, Week 1, Month 1, Season 1. Onboarding for first-time hockey parents.',
    type: 'article',
    url: 'https://rinkstop.com/learn/parent-survival-guide',
    siteName: 'RinkStop',
  }),
};

export default function ParentSurvivalGuidePage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Parent Survival Guide</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOCKEY PARENT SURVIVAL GUIDE
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        Day 1, Week 1, Month 1, Season 1. Onboarding for first-time hockey parents.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Day 1: before the first practice</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>What to bring:</strong> Nothing if the program provides equipment. Otherwise: helmet, gloves, base layers, water bottle, snack for after.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>What to wear:</strong> Layers. Rinks are cold. The bleachers are cold. Bring a jacket.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>What to expect:</strong> A lot of waiting, a lot of dressing help, and a kid who may or may not want to be there. Both reactions are normal.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Week 1: the first practice routine</h2>
        <p style={{ marginBottom: '1rem' }}>
          Establish a routine early. The same drop-off time, the same parking spot, the same snack for after. Kids thrive on routine. Parents do too.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Equipment care:</strong> Take it home wet, lay it out to dry. Don't put it in a sealed bag. The smell will be unforgettable in a bad way.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>After-practice conversations:</strong> Don't grill your kid about what they learned. Better questions: "What was the best part?" "Did the coach do anything cool?" "Are you going back next week?"
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Month 1: the first bumps</h2>
        <p style={{ marginBottom: '1rem' }}>
          Your kid will have at least one bad practice. Maybe a fall, maybe a conflict with another kid, maybe a coach who was sharper than usual. This is normal.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The temptation is to fix it. Talk to the coach, talk to the other parent, talk to the program director. Sometimes that's appropriate. Usually, it's not. Most bumps resolve themselves in a week if you let them.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The one exception: if your kid is being bullied, or if a coach is being verbally abusive, that's not a "bump." That's a problem, and you should escalate. Most coaches and programs are good. The bad ones are obvious and rare.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Season 1: what the year will look like</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Practices:</strong> 1-2 per week for 6U-8U, 2-3 per week for 10U+. Each is 45-90 minutes. You can drop off or stay — both are fine, but consistency matters.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Games (or scrimmages):</strong> House hockey at 6U-8U is mostly intrasquad scrimmages. At 10U+, real games on weekends. Expect 1-2 games per weekend during the season.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Off-ice:</strong> Most kids under 10 don't need off-ice training. They need unstructured play. Running around the yard, riding bikes, playing tag. The best off-ice training for a 7-year-old is "be a kid."
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The 10 things to never say in the bleachers</h2>
        <p style={{ marginBottom: '1rem' }}>
          These are the lines that make coaches wince. Don't say them. Even if you're thinking them.
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>"Why isn't my kid playing more?" — They will play more when they're ready. Trust the coach.</li>
          <li>"He's better than the other kids." — Maybe. Don't compare.</li>
          <li>"The ref missed a call." — They miss calls. Yelling doesn't help.</li>
          <li>"In my day, we..." — Your day is not their day.</li>
          <li>"You should be trying harder." — They know.</li>
          <li>"Why are you benched?" — Ask the coach, not the kid.</li>
          <li>"That other team is dirty." — Even if true, it doesn't help.</li>
          <li>"You played great!" (after a 7-0 loss) — They'll see through it.</li>
          <li>"Why didn't you score?" — Because they're 8.</li>
          <li>"You're not having fun? Maybe we should quit." — Don't put the quit option in their head. Ask what would make it more fun.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to talk to coaches</h2>
        <p style={{ marginBottom: '1rem' }}>
          The right time: after practice, briefly. Not in front of the kid. Not via text unless the coach has set that channel up. Not at a game.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The right questions: "How is [kid] doing?" "What should we work on at home?" "What can I do to help?" Not "Why isn't my kid on the first line?"
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The wrong questions (most of the time): anything about playing time, line combinations, or other kids. Coaches have limited ice time and many players. They make decisions for the team, not for any individual parent.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>When to actually be concerned</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most "concerns" are just adjustment phases. But there are real signals to watch for:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Your kid comes home saying they don't want to go to practice, more than a few times in a row</li>
          <li>Your kid is being singled out negatively by the coach (humiliation, not correction)</li>
          <li>Your kid has physical symptoms (nightmares, stomach aches, refusing to go) that appear around hockey</li>
          <li>Your kid is being bullied by other kids, and the coaches aren't addressing it</li>
          <li>The program culture is openly hostile (parents yelling at refs, coaches screaming at kids)</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          If you see these, talk to the program director. If they don't help, change programs. There's no hockey program worth your kid's mental health.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/first-day-on-ice" style={{ color: '#C8102E' }}>Your first day on the ice</Link></li>
          <li><Link href="/learn/cost-by-age" style={{ color: '#C8102E' }}>Hockey cost by age</Link></li>
          <li><Link href="/learn/choosing-a-program" style={{ color: '#C8102E' }}>Choosing a learn-to-play program</Link></li>
          <li><Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E' }}>Hockey parents handbook (full)</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>


    <LearnJsonLd
      href={`/learn/parent-survival-guide`}
      title={`Hockey Parent Survival Guide`}
      description={`Day 1, Week 1, Month 1, Season 1. Onboarding for first-time parents: what to bring, what to say (and not say), how to talk to coaches.`}
      verified={`2026-09-10`}
      readTime={10}
    />
</main>
  );
}