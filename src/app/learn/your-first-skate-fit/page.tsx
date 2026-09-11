import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import LearnJsonLd from '@/components/LearnJsonLd';

export const metadata: Metadata = {
  title: 'Your First Skate Fit — At the Store, Step-by-Step',
  description: 'Your first skate fit at the store, step by step. What to ask the fitter, what to look for, what to walk away from, and what to do if the first pair doesn\'t work.',
  keywords: ['first skate fit', 'hockey skate fitting at store', 'getting skates fitted', 'hockey skate fitter', 'hockey skate fitting near me'],
  alternates: { canonical: 'https://rinkstop.com/learn/your-first-skate-fit' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Your First Skate Fit',
    description: 'At the store, step by step. What to ask, what to look for, what to walk away from.',
    type: 'article',
    url: 'https://rinkstop.com/learn/your-first-skate-fit',
    siteName: 'RinkStop',
  }),
};

export default function YourFirstSkateFitPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Your First Skate Fit</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        YOUR FIRST SKATE FIT
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        At the store, step by step. What to ask the fitter, what to look for, and what to walk away from.
      </p>

      <div style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Before you go</h2>
        <p style={{ marginBottom: '1rem' }}>
          Use the <Link href="/tools/hockey-skate-size-calculator" style={{ color: '#C8102E' }}>skate size calculator</Link> to translate your US shoe size to a starting point. The result is a starting point, not a destination. Sizes vary by brand and model.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Wear the socks you'll skate in.</strong> Thin hockey socks. Not thick gym socks. Not dress socks. The wrong socks change the fit by half a size or more.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Bring your kid's shin guards.</strong> If they have them. A skate should be fitted with shin guards in the skate. Most stores have loaners, but bring what you have.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>At the store: the right questions</h2>
        <p style={{ marginBottom: '1rem' }}>
          A good fitter asks you more questions than you ask them. The conversation should go:
        </p>
        <p style={{ marginBottom: '1rem' }}>
          "How long have you been playing?" "How many times a week?" "What level are you at?" "Any foot issues — wide forefoot, bunions, arch problems?" "Do you have orthotics?"
        </p>
        <p style={{ marginBottom: '1rem' }}>
          If the fitter doesn't ask at least some of these, they're not actually fitting — they're selling. Find another fitter.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The 8 checks during the fit</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>1. The insole check.</strong> Take the insole out of the skate. Stand on it. Your heel should be at the back of the insole. Your big toe should almost reach the front. If there's more than ¼ inch of insole showing in front of your toes, the skate is too long.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>2. The toe room check.</strong> Stand up straight with weight on both feet. Your toes should just touch the front of the boot. They shouldn't be curled or crunched. There's an old rule: "you should be able to fit one finger between your heel and the back of the boot." This is approximately right.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>3. The heel-lock check.</strong> Lace the skate properly. Lean forward. Your heel should stay planted. If your heel lifts more than a few millimeters, the boot is too wide or too long.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>4. The ankle support check.</strong> Push your ankle side to side inside the boot. The boot should resist this motion. If the ankle flops over easily, the boot is too soft. Some stiffness is normal in modern skates — it breaks in over 4-8 hours of ice time.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>5. The width check.</strong> Stand up. Look down at your foot inside the boot. The ball of your foot should be over the widest part of the boot. If your foot spills over the insole, the boot is too narrow. If your foot slides side to side, too wide.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>6. The forward lean check.</strong> Bend your knees like you're in a hockey stance. Your shins should push into the tongue of the boot. The boot should support you — you shouldn't feel like you're going to fall forward.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>7. The 10-minute stand.</strong> Stand in the skates for 10 minutes. Walk around. If a hot spot develops, the fit is wrong. Skates that feel snug but bearable in 10 minutes will be fine after break-in. Skates that already hurt will hurt more.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>8. The lacing test.</strong> Lace the skates the way the fitter shows you. Snug at the toe, slightly looser in the middle, snug at the top. Then stand and bend your knees. Your heel should stay locked.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What to walk away from</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The fitter who only measures your foot length.</strong> Foot length is one input. Width, arch height, ankle stability, and intended use all matter. A length-only fitter is going to sell you the wrong skate.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The fitter who doesn't watch you stand and walk in the skates.</strong> A skate that feels fine sitting is not a fitted skate. The fitter needs to see you stand, lean, walk, and bend.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The store that doesn't have a sharpening service.</strong> A skate you buy new needs to be sharpened before its first use. If the store doesn't sharpen, you have to go somewhere else for it. Most good hockey stores do.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>The "try it and see" return policy.</strong> Skates that don't fit can't be returned once they're sharpened. A good store will let you walk around the store in them for 15-20 minutes before committing. Some stores have a "first fit" guarantee where they'll re-fit free if the first pair doesn't work after break-in.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The breaking-in myth</h2>
        <p style={{ marginBottom: '1rem' }}>
          "Skates need to be broken in" is true in a narrow sense and wrong in a bigger one.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>What's true:</strong> A new skate is stiffer than a broken-in skate. After 4-8 hours of ice time, the boot softens slightly and conforms to your foot. The lacing pattern gets easier. The padding compresses.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>What's wrong:</strong> A skate that hurts on day one will still hurt on day 30. The break-in is mild and gradual. Pain is a sign of a bad fit, not a sign of "needing more time."
        </p>
        <p style={{ marginBottom: '1rem' }}>
          If your kid complains of pain in the first 3 sessions, go back to the fitter. Don't wait.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>After the fit: the first month</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Wear them around the house.</strong> 1-2 hours a day for the first week, with skate guards on. The heat from your foot softens the boot.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Take them to a public skate or stick-and-puck.</strong> The first 30 minutes on ice is the most important break-in period. Walk, glide, do basic stops. Don't try to do laps.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Dry them properly after every session.</strong> Pull the tongue forward. Open the boot. Stuff newspaper or use moisture-wicking boot trees. Don't leave them in a sealed bag.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Get them sharpened before the first game.</strong> New skates come dull. Most stores sharpen free with a purchase. If yours doesn't, plan on $5-15 for a sharpening.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Re-evaluate after 5 sessions.</strong> If hot spots develop, return to the fitter. Most stores will punch or heat-mold the boot to fix pressure points. Don't just live with the pain.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>When to get a second pair</h2>
        <p style={{ marginBottom: '1rem' }}>
          Most kids outgrow skates every 1-2 years. Signs it's time for a new pair:
        </p>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Toes are cramped at the end of the boot (not just touching the front — actually crunched)</li>
          <li>The ankle support has broken down and the foot rolls inside the boot</li>
          <li>Your kid is complaining about foot or ankle pain that wasn't there before</li>
          <li>The boot is visibly worn (cracked sole, broken eyelets, separated sole)</li>
          <li>You can fit two fingers between the heel and the back of the boot (a clear sign they've outgrown them)</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related reading</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/tools/hockey-skate-size-calculator" style={{ color: '#C8102E' }}>Skate size calculator</Link></li>
          <li><Link href="/learn/skate-fitting" style={{ color: '#C8102E' }}>How to fit hockey skates</Link></li>
          <li><Link href="/learn/equipment-on-a-budget" style={{ color: '#C8102E' }}>Equipment on a budget</Link></li>
          <li><Link href="/learn/cost-by-age" style={{ color: '#C8102E' }}>Hockey cost by age</Link></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Last updated 2026-09-10. AI-assisted, human-reviewed by RinkStop editorial.</p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>


    <LearnJsonLd
      href={`/learn/your-first-skate-fit`}
      title={`Your First Skate Fit`}
      description={`At the store, step-by-step: what to ask the fitter, what to look for, what to walk away from, and what to do if the first pair doesn&apos;t work.`}
      verified={`2026-09-10`}
      readTime={6}
    />
</main>
  );
}