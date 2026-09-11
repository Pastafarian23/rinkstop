import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'How to Choose a Learn-to-Play Hockey Program — 7 Questions to Ask',
  description: 'How to choose a learn-to-play hockey program. 7 questions to ask, red flags to avoid, what to bring on day 1, and the difference between house, travel, and select programs.',
  keywords: ['how to choose learn to play hockey', 'hockey program for beginner', 'youth hockey program', 'house vs travel hockey', 'hockey program red flags'],
  alternates: { canonical: 'https://rinkstop.com/learn/choosing-a-program' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'How to Choose a Learn-to-Play Hockey Program',
    description: '7 questions to ask before signing up. Red flags, costs, and what to expect.',
    type: 'article',
    url: 'https://rinkstop.com/learn/choosing-a-program',
    siteName: 'RinkStop',
  }),
};

export default function ChoosingAProgramPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Choosing a Program</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW TO CHOOSE A LEARN-TO-PLAY PROGRAM
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        Seven questions to ask before signing up. The red flags. What to expect on day 1. And the difference between house, travel, and select programs.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Before you sign up: the 7 questions</h2>
        <p style={{ marginBottom: '1rem' }}>
          Email or call the program director. The good ones will answer all of these without hesitation.
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>What's the coach-to-player ratio?</strong> 1:5 or better is the standard for learn-to-play. Worse than 1:8 means your kid will spend the session standing in line.</li>
          <li><strong>How much ice time do they actually get?</strong> A 60-minute session with 15 kids means each kid skates for maybe 30 minutes total. Some programs have 20+ kids on the ice at once — that's not learn-to-play, that's a free-for-all.</li>
          <li><strong>What's the practice-to-game ratio?</strong> For 6U and 8U, the ADM recommends 3-4 practices for every game. If a program is running 50/50, it's following a different philosophy than the official one.</li>
          <li><strong>Are the coaches USA Hockey certified (or Hockey Canada equivalent)?</strong> "Hockey coaches" should mean people who have completed the age-appropriate certification. A parent with a kid in the program is not a coach in the relevant sense.</li>
          <li><strong>What's the cost, and what does it include?</strong> Equipment, ice time, jerseys, end-of-season events. Hidden costs (travel, extra ice, tournaments) often exceed the listed registration.</li>
          <li><strong>What is the program's philosophy on playing time and positions?</strong> For 6U-10U, every kid should play, every kid should try every position, and no kid should sit on the bench. If a program has "first-line" and "second-line" at age 8, they're not following the ADM.</li>
          <li><strong>What's the drop-out rate at age 12?</strong> Programs that follow the ADM retain 80%+ of players through Bantam. Programs that burn kids out retain 30-40%. Ask the director directly.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Red flags to walk away from</h2>
        <p style={{ marginBottom: '1rem' }}>
          Some programs are better avoided. The signs:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li><strong>"Tryouts" at 6U or 8U.</strong> The ADM is clear: no tryouts before age 10. If a program cuts 6-year-olds, run.</li>
          <li><strong>Year-round commitment before age 10.</strong> Kids need off-seasons. Year-round hockey at age 7 is a sign the program is optimizing for revenue, not development.</li>
          <li><strong>Travel at 8U.</strong> "Travel hockey" at age 8 is developmentally inappropriate. House hockey is correct at that age.</li>
          <li><strong>High coach turnover.</strong> If coaches leave every year, there's a problem with how the program is run.</li>
          <li><strong>No parent communication.</strong> If the program doesn't email you about schedule changes, practice plans, or your kid's development, they don't value parent involvement.</li>
          <li><strong>Win-focused culture at young ages.</strong> If a 10U program talks more about wins than development, they're optimizing for the wrong things.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>House vs travel vs select</h2>
        <p style={{ marginBottom: '1rem' }}>
          The three levels of youth hockey. Most kids stay in house for years before considering travel. That's correct.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>House hockey</strong> is the local rec program. Kids play in their home association. Practices are 1-2 times a week, games are on weekends. Cost is lowest. Time commitment is lowest. Most kids should stay in house through at least 10U. Some never leave and that's fine — house is the foundation.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Select hockey</strong> is the next level up from house. Tryouts happen (usually around 10U-12U). Kids play on a "select" team within their association. More practices, more games, more travel (within the region). Cost is 2-3x house. Time commitment is significantly higher.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Travel hockey</strong> is a step beyond select. Kids play on a team drawn from a wider geographic area (often an entire state or province). Practices are 3-4 times a week, games are every weekend, travel is significant. Cost is 3-5x house. Time commitment is 9-12 months a year.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The right progression for most kids: house through 10U, select at 12U if interested, travel at 14U+ if the kid is serious. Some kids stay in house forever and play high school hockey. That's a legitimate path.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What to bring on day 1</h2>
        <p style={{ marginBottom: '1rem' }}>
          For the first session, the program will tell you. Most learn-to-play programs provide equipment for the first 4-8 weeks. After that, you need:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Hockey helmet with cage or visor (USA Hockey certified for the current year)</li>
          <li>Hockey gloves</li>
          <li>Shin guards (hockey, not soccer)</li>
          <li>Hockey pants or breezers</li>
          <li>Shoulder pads (some programs provide for the first season)</li>
          <li>Elbow pads (some programs provide)</li>
          <li>Hockey skates (rentals work for the first month; you'll want your own after)</li>
          <li>Hockey socks (garter style or knit)</li>
          <li>A jock or jill</li>
          <li>Base layers (long underwear, moisture-wicking)</li>
          <li>A hockey stick (senior stick cut to chin height is fine for kids 6U-10U)</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The first 4-8 weeks: rental vs. buy</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most programs include equipment for the first month. Use this time to confirm your kid likes hockey before you spend $300-500 on gear they'll outgrow by next year.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Kids 6U-8U outgrow equipment every season. Don't buy top-of-the-line gear for a 6-year-old. The premium doesn't help their development and the resale value is minimal.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          What to buy new: helmet (used helmets can't be verified safe), skates (fit matters more than condition), and a stick. Everything else is fine used.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          What to buy used: pants, shoulder pads, elbow pads, shin guards, gloves, hockey socks. Look for used gear at your rink's pro shop, on sideline swap, or on Facebook marketplace.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/learn/first-day-on-ice" style={{ color: '#C8102E' }}>Your first day on the ice</Link></li>
          <li><Link href="/learn/cost-by-age" style={{ color: '#C8102E' }}>Hockey cost by age</Link></li>
          <li><Link href="/learn/age-to-start-hockey" style={{ color: '#C8102E' }}>When can my kid start hockey?</Link></li>
          <li><Link href="/learn/equipment-on-a-budget" style={{ color: '#C8102E' }}>Equipment on a budget</Link></li>
          <li><Link href="/directory/youth-hockey/learn-to-play" style={{ color: '#C8102E' }}>Find a learn-to-play program</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>
    </main>
  );
}