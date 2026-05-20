import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Skate Fitting Guide | RinkStop',
  description: 'How hockey skates should fit  --  common sizing mistakes, what to look for at a fitting, and when to replace skates. Get the right fit the first time.',
  openGraph: { title: 'Skate Fitting Guide | RinkStop', description: 'How hockey skates should fit, common sizing mistakes, and what to look for at a fitting.', type: 'article' },
  alternates: { canonical: 'https://rinkstop.com/guides/skate-fitting-guide' },
};

export default function SkateFittingGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Skate Fitting Guide</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Equipment</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>SKATE FITTING GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Skates are the most important piece of hockey equipment  --  and the most commonly fitted wrong. Get the right fit, and your skating improves immediately.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Skate Fitting Guide', description: 'How hockey skates should fit, common sizing mistakes, and what to look for at a fitting.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-05-16' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'How should hockey skates fit?', acceptedAnswer: { '@type': 'Answer', text: 'Hockey skates should fit tight  --  like a second skin. Your toes should barely touch (but not press against) the toe cap when standing upright. When you flex your ankle forward, you should have about a quarter-inch of space between your longest toe and the inside of the boot. Skates that fit like running shoes will cause blisters, heel lift, and poor skating form.' } },
        { '@type': 'Question', name: 'Are hockey skate sizes the same as shoe sizes?', acceptedAnswer: { '@type': 'Answer', text: 'No  --  hockey skate sizes run SMALLER than street shoe sizes. A size 8 in Nike Air Max is NOT the same as a size 8 in CCM or Bauer skates. Always get measured at a hockey shop, not a general sporting goods store. Hockey skate sizing is brand-specific and often a half-size to a full size smaller than your shoe size.' } },
        { '@type': 'Question', name: 'How do I know if my hockey skates are too big?', acceptedAnswer: { '@type': 'Answer', text: 'Signs your skates are too big: your heel lifts when you flex your ankle forward; your toes press against the front of the boot when you stand up; you develop blisters after skating; your ankle bones shift side to side inside the boot. Skates that are a half-size too big will cause heel lift, numb toes, and poor edge control.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FITTING PROCESS</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[
              { step: '1', title: 'Get measured, don\'t guess', desc: 'At a hockey-specific shop, use a Brannock device to measure foot length AND width. Most people don\'t know their actual size  --  and hockey skate sizing varies by brand. Write down both measurements.' },
              { step: '2', title: 'Try both skates on  --  laced fully', desc: 'Lace the skates completely, not halfway. The moment you put them on you should feel pressure across the top of the foot and ankle. Walk around for 5 minutes before judging fit. The foot expands during use  --  you want tight when new.' },
              { step: '3', title: 'Check toe space  --  standing', desc: 'With your skate laced and standing upright (not leaning forward), your toes should barely graze the front of the boot. Press up on your toes  --  you should feel no pressure. If your toes press firmly against the front, the skate is too short.' },
              { step: '4', title: 'Check flex  --  ankle forward', desc: 'When you bend your ankle forward into a skating crouch, you should feel about 1/4 inch of space between your longest toe and the front of the boot. If your toes press hard against the front in a crouch, the skate is too short even if standing upright feels okay.' },
              { step: '5', title: 'Check heel lock', desc: 'Your heel should not lift inside the boot when you flex. Press down on the front of the boot  --  your heel should stay locked in place. If you feel movement, the skate is too wide or the holder/runner is not properly secured.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800, color: '#C8102E', flexShrink: 0 }}>{s.step}</div>
                <div><p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{s.title}</p><p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{s.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>COMMON FITTING MISTAKES</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { mistake: 'Buying skates too big "to grow into"', reality: 'Skates that are too large cause heel lift, poor edge contact, and bad habits that are hard to unlearn. Buy skates that fit NOW. Kids\' skates come in half-size increments  --  buy the exact fit, not a size up.', color: '#C8102E' },
            { mistake: 'Assuming shoe size = skate size', reality: 'Hockey skate sizes run 1-2 sizes smaller than street shoes. A men\'s size 9 in shoes is often a size 7.5 or 8 in Bauer. Always measure.', color: '#C8102E' },
            { mistake: 'Not considering foot width', reality: 'Hockey skate makers offer widths: D (regular), EE (wide), and some brands offer B (narrow). Most people are D or EE. A wide foot in a narrow skate = circulation loss, cold feet, early fatigue.', color: '#C8102E' },
            { mistake: 'Buying at a general sporting goods store', reality: 'General sporting goods stores have general staff. Hockey shops have hockey-specific staff who watch players skate and can identify fit problems in real time.', color: '#C8102E' },
          ].map(m => (
            <div key={m.mistake} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.125rem 1.25rem' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: m.color, marginBottom: '0.375rem' }}>{m.mistake}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.65 }}>{m.reality}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SKATE SIZING BY BRAND</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#999', marginBottom: '1rem', lineHeight: 1.65 }}>Hockey skate sizing is NOT standardized across brands. A size 8 in Bauer Supreme fits differently than a size 8 in CCM Ribcor. Always try before buying  --  or know your exact foot measurements and research the brand\'s fit profile.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {[
              { brand: 'Bauer Vapor', fit: 'Narrow / performance', note: 'Low volume, narrow forefoot. Best for players with narrow feet who want a close fit.' },
              { brand: 'Bauer Supreme', fit: 'Regular / wide', note: 'Higher volume, wider fit through the midfoot. Good for average-to-wide feet.' },
              { brand: 'CCM Jetspeed', fit: 'Narrow-medium', note: 'Narrower boot with a more anatomical fit. Good for quick, agile players.' },
              { brand: 'CCM Ribcor', fit: 'Regular / flex', note: 'Softer boot, easier to break in. Good for players who want immediate comfort.' },
              { brand: 'True Hockey', fit: 'Custom-like', note: 'Slightly narrower, anatomical fit. Known for excellent heel lock.' },
              { brand: 'Bauer Nexus', fit: 'Regular-wider', note: 'Wider boot, higher volume. Most comfortable for players with wide feet.' },
            ].map(b => (
              <div key={b.brand} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{b.brand}</p>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.25rem' }}>{b.fit}</p>
                <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>{b.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>BAKING & BREAKING IN</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Modern composite skates are heat-molded. Baking your skates at the right temperature for the right time makes the boot form to your foot shape  --  dramatically improving fit on the first wear. Most hockey shops bake skates for free when you buy them.</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              { step: 'Temperature', tip: '135°C / 275°F for most composite skates. Check manufacturer specs  --  baking at too high a temperature voids the warranty.' },
              { step: 'Time', tip: 'Bake for 6-8 minutes. Less than 6 minutes doesn\'t soften the boot enough; more than 10 risks deforming the boot.' },
              { step: 'After baking', tip: 'Put the skates on immediately and lace fully. Wear them for 10-15 minutes while walking around. The molds start hardening within minutes.' },
              { step: 'First skate', tip: 'On the first on-ice session after baking, skate easy for the first 20 minutes to let the boot settle. Don\'t do full-speed drills until the boot has fully set.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.035)', borderRadius: '6px', alignItems: 'center' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>{s.step}</p>
                <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>{s.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Ready to find your skates?</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/guides/hockey-stick-guide" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Stick Guide</Link>
          <Link href="/glossary" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Glossary</Link>
        </div>
      </div>
    </div>
  );
}