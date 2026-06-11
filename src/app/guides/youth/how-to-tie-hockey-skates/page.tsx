import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Tie Hockey Skates: A Step-by-Step Guide for Beginners | RinkStop',
  description: 'How to tie hockey skates properly — the standard crisscross lacing method, fixing lace bite, the right knot, and advanced techniques (lock lacing, double cross, dropping an eyelet).',
  openGraph: {
    title: 'How to Tie Hockey Skates | RinkStop',
    description: 'Step-by-step hockey skate lacing for beginners — standard crisscross, lace bite fixes, and advanced methods.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/how-to-tie-hockey-skates' },
};

export default function HowToTieHockeySkates() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>How to Tie Hockey Skates</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Parents
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO TIE HOCKEY SKATES
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        A step-by-step guide to lacing hockey skates the right way. Covers the standard crisscross method, the knot, how to fix lace bite, and three advanced techniques (lock, double cross, drop eyelet) for specific problems.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to Tie Hockey Skates',
        description: 'Step-by-step guide to lacing hockey skates properly, including the standard crisscross method, fixing lace bite, and advanced techniques.',
        totalTime: 'PT3M',
        step: [
          { '@type': 'HowToStep', position: 1, name: 'Get seated and press your foot into the boot', text: 'Sit on a bench with your skate on a mat. Press your foot firmly back into the heel pocket before you start lacing — this is the position your foot should be in for the entire lacing process.' },
          { '@type': 'HowToStep', position: 2, name: 'Thread the lace through the bottom eyelets from outside in', text: 'Start at the toe of the skate. Push each end of the lace through the first eyelet on the same side, going from the outside of the boot toward the inside.' },
          { '@type': 'HowToStep', position: 3, name: 'Pull both ends even', text: 'Pull the lace through until both ends are even. Uneven laces lead to an uneven knot at the top.' },
          { '@type': 'HowToStep', position: 4, name: 'Crisscross up the boot, one eyelet at a time', text: 'Cross the right lace over to the left side and the left lace over to the right side, threading each through the next eyelet up. Work your way up the entire boot this way.' },
          { '@type': 'HowToStep', position: 5, name: 'Pull each section snug, not tight', text: 'After each cross, pull both ends snug. Don\'t pull as hard as you can — you want firm, even pressure, not a tourniquet.' },
          { '@type': 'HowToStep', position: 6, name: 'Tighten ankle area carefully', text: 'The eyelets closest to your ankle (usually the second-from-top pair) are where most players lace tightest. This is what locks your heel into the boot.' },
          { '@type': 'HowToStep', position: 7, name: 'Cross the laces twice at the top', text: 'When you reach the top eyelets, cross the laces over each other twice (not once) before making your knot. This locks the knot in place.' },
          { '@type': 'HowToStep', position: 8, name: 'Tie a double bow knot', text: 'Tie a bow (loop and pull through) the way you would tie a shoe, then tie a second bow on top of the first. The double bow is the standard hockey knot — it won\'t come undone mid-game.' },
        ],
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What is the correct way to lace hockey skates?', acceptedAnswer: { '@type': 'Answer', text: 'The standard method is crisscross lacing from the bottom eyelets to the top, threading each lace from outside the boot to inside, then crossing over to the opposite side. Pull each section snug (not tight) as you go, and finish with a double-crossed knot and a double bow at the top.' } },
          { '@type': 'Question', name: 'What is lace bite in hockey skates?', acceptedAnswer: { '@type': 'Answer', text: 'Lace bite is pain and pressure on the front of the ankle caused by laces pulled too tight over the tongue. It can cut a game or practice short and, over time, cause inflammation. The fix is to skip a lower eyelet pair (so the laces don\'t pass directly over the ankle bone) or to use lock lacing at the top to redirect pressure away from the front of the ankle.' } },
          { '@type': 'Question', name: 'Should hockey skates be laced tight?', acceptedAnswer: { '@type': 'Answer', text: 'Skates should be laced snugly — firm pressure, no slack — but not so tight they cut off circulation. The ankle area should be the tightest, since that\'s what locks your heel into the boot. The toe and lower foot should be snug but not compressed. If your toes are going numb, the laces are too tight.' } },
          { '@type': 'Question', name: 'How long should hockey skate laces be?', acceptedAnswer: { '@type': 'Answer', text: 'Adult hockey skate laces are typically 96" to 120" long, depending on the number of eyelets. Youth laces are 72" to 96". When in doubt, bring the skates to the shop and ask them to measure. Laces should be long enough to tie a secure double bow, but not so long that excess lace becomes a tripping hazard.' } },
          { '@type': 'Question', name: 'Why do hockey players skip eyelets at the top?', acceptedAnswer: { '@type': 'Answer', text: 'Skipping the top eyelet (called "dropping an eyelet") gives the ankle more forward flex — meaning a deeper knee bend and longer stride. Many NHL players do this. It\'s also useful for beginners who are still building ankle strength, and for anyone with a high instep. The trade-off is less ankle support.' } },
        ],
      }) }} />

      {/* Why it matters */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHY PROPER LACING MATTERS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Skates are the only piece of hockey equipment that&apos;s between the player and the ice for every stride, every turn, every stop. Laced properly, they lock your heel in place, support your ankle, and let you push hard without your foot sliding around. Laced poorly, they cause blisters, lace bite, ankle injuries, and lost power on every stride.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          For beginners especially, the right lacing is the difference between "hockey is fun" and "my feet hurt." Take three minutes to learn it right.
        </p>
      </section>

      {/* Before you start */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>BEFORE YOU START</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              { step: 'Sit down', desc: 'Lace while seated on a bench, with the skate on a rubber mat or carpet. Never lace while standing.' },
              { step: 'Heel pushed back', desc: 'Press your foot firmly back into the heel pocket. Your toes should lightly touch the front of the boot — that\'s the right position.' },
              { step: 'Tongue placement', desc: 'Make sure the tongue is centered and not twisted. A twisted tongue creates a pressure point that gets worse as you tighten.' },
              { step: 'Loose laces to start', desc: 'Pull all the slack out of the laces before tightening. You\'re going to tighten from the toe up, not the top down.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', padding: '0.625rem 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'center' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{s.step}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The standard method */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE STANDARD CRISSCROSS METHOD</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          This is the lacing 90% of hockey players use. It&apos;s simple, secure, and works for almost everyone. Master this first; learn the advanced methods only if you have a specific problem to solve.
        </p>

        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { step: 1, title: 'Thread the lace through the bottom eyelets', desc: 'From outside the boot, push each end of the lace through the first eyelet on its own side. The lace should now have one end coming out of the inside of the left eyelet, the other out of the inside of the right eyelet.' },
            { step: 2, title: 'Pull both ends even', desc: 'Pull the lace through until both ends are the same length. This matters — uneven laces mean you\'ll run out of lace on one side at the top.' },
            { step: 3, title: 'Cross over and up', desc: 'Take the right lace and thread it through the next eyelet up on the left side (from outside in). Do the same with the left lace on the right side. You now have an X across the tongue.' },
            { step: 4, title: 'Repeat, working up the boot', desc: 'Continue crisscrossing one eyelet at a time, all the way up the boot. Every time you cross, the laces should pass over the tongue and through the next eyelet up on the opposite side.' },
            { step: 5, title: 'Snug, not tight, at every level', desc: 'After each cross, pull both ends to remove slack. You want firm pressure, but not enough to compress the foot. If your toes start to tingle, you\'ve gone too far.' },
            { step: 6, title: 'Tighten the ankle area', desc: 'The second-from-top eyelet pair is where the laces should be tightest. This is what locks your heel in the boot and prevents your foot from sliding side-to-side.' },
            { step: 7, title: 'Cross the laces twice at the top', desc: 'At the top eyelets, cross the laces over each other twice (not just once). This is the secret to a knot that doesn\'t slip mid-stride.' },
            { step: 8, title: 'Tie a double bow', desc: 'Make a loop with one end, wrap the other end around it, pull through — that\'s a bow. Repeat. The double bow is the standard hockey finish.' },
          ].map(s => (
            <div key={s.step} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.375rem' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Step {s.step}</p>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{s.title}</p>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fixing lace bite */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FIXING LACE BITE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Lace bite is a sharp pain on the front of the ankle, caused by the laces pressing into the tendon that runs across the top of the foot. It can ruin a game. Three reliable fixes:
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { title: 'Skip a lower eyelet pair', desc: 'The simplest fix. Don\'t thread the lace through one of the eyelet pairs in the lower ankle area. This creates a gap so the laces don\'t pass directly over the tendon. The rest of the lacing stays the same.' },
            { title: 'Use lock lacing at the top', desc: 'Lock lacing redirects the lacing pattern so the pressure is on the sides of the ankle, not the front. Details below in the advanced section.' },
            { title: 'Replace the tongue', desc: 'If lace bite is chronic, the issue might be a thin or worn tongue. Aftermarket tongues with extra padding (Bauer, Sherwood, and CCM all sell them) add cushion directly over the tendon.' },
          ].map(f => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{f.title}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced methods */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THREE ADVANCED METHODS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Most players stick with the standard crisscross. These three are worth knowing for specific problems.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>Lock lacing — for lace bite or extra ankle support</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6, marginBottom: '0.5rem' }}>
              <strong style={{ color: '#bbb' }}>How:</strong> Lace the skate normally up to the second-from-top eyelet. At the top, cross the laces, then thread each end through the top eyelet on the same side (don\'t cross at the very top). Pull snug, then tie normally.
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>
              <strong style={{ color: '#bbb' }}>Why:</strong> The pattern redirects pressure to the sides of the ankle, not the front. Excellent for players prone to lace bite or anyone wanting extra heel lock.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>Double cross lacing — for laces that keep slipping</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6, marginBottom: '0.5rem' }}>
              <strong style={{ color: '#bbb' }}>How:</strong> Lace the skate normally. At the top eyelets, cross the laces over each other twice (instead of once) before making your bow.
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>
              <strong style={{ color: '#bbb' }}>Why:</strong> The double cross creates extra friction at the top, which keeps the laces from loosening during play. Trade-off: harder to untie at the end of a game.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>Dropping an eyelet — for more ankle flex</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6, marginBottom: '0.5rem' }}>
              <strong style={{ color: '#bbb' }}>How:</strong> Lace the skate normally all the way up, but skip the very top eyelet pair. Tie off below the top.
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>
              <strong style={{ color: '#bbb' }}>Why:</strong> Skipping the top eyelet gives the ankle more forward flex — a deeper knee bend and a longer, more powerful stride. Many NHL players do this. Trade-off: less ankle support, so it\'s not ideal for beginners still building ankle strength.
            </p>
          </div>
        </div>
      </section>

      {/* Lace length reference */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>LACE LENGTH QUICK REFERENCE</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Youth (skate size 1-3)', length: '72" – 84"' },
              { size: 'Youth (skate size 3-6)', length: '84" – 96"' },
              { size: 'Junior (skate size 6-9)', length: '96" – 108"' },
              { size: 'Senior (skate size 9+)', length: '108" – 120"' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', textAlign: 'right', fontWeight: 600 }}>{row.length}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          When in doubt, bring the skates to a hockey shop and ask. Most shops will measure the eyelets and sell you the right length. Laces should be long enough for a comfortable double bow, but not so long that the extra lace dangles into the blade.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/skate-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Skate Fitting Guide →
          </Link>
          <Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Parent&apos;s Handbook →
          </Link>
          <Link href="/guides/youth/usa-hockey-adm-explained" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            USA Hockey&apos;s ADM Explained →
          </Link>
        </div>
      </section>
    </div>
  );
}
