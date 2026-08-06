import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Shoulder Pads: A Parent\'s Guide',
  description: "How to fit hockey shoulder pads for your kid — coverage test, mobility test, chest measurement, sizing, and when to size up.",
  openGraph: {
    title: 'How to Fit Hockey Shoulder Pads',
    description: "A parent's guide to fitting shoulder pads — coverage, mobility, sizing, and when to size up.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/shoulder-pad-fitting-guide' },
};

export default function ShoulderPadFittingGuideYouth() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Shoulder Pad Fitting Guide</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT HOCKEY SHOULDER PADS
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        How to fit shoulder pads for your kid. Covers what they protect, the coverage and mobility tests, chest measurement for sizing, and how to know when to size up.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "How to Fit Hockey Shoulder Pads: A Parent's Guide",
        description: "Coverage test, mobility test, chest measurement, sizing, and when to size up.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should hockey shoulder pads fit on a kid?', acceptedAnswer: { '@type': 'Answer', text: 'The shoulder caps should sit directly on top of the shoulders — not hanging off the edge and not riding up the neck. The chest plate should cover the sternum and upper chest. The bicep guards should run about halfway down the upper arm. The pads should move with the kid when they raise their arms, with no gap opening between the shoulder cap and the deltoid.' } },
          { '@type': 'Question', name: 'How do I size youth hockey shoulder pads?', acceptedAnswer: { '@type': 'Answer', text: 'Measure chest circumference at the widest point. Match the measurement to the manufacturer\'s youth sizing chart. Sizes typically run from Youth XS (smallest) to Youth XL, then Junior, then Senior. If your kid is between sizes, size up — shoulder pads compress the chest on impact, and a too-small pad will limit their ability to breathe during play.' } },
          { '@type': 'Question', name: 'Can my kid use used shoulder pads?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, with inspection. Check that the plastic caps aren\'t cracked, the foam isn\'t crumbling, and all straps are functional. The main concern with used shoulder pads is fit — youth sizes are very specific to the player\'s chest measurement, so a used pad is only a good deal if it actually fits.' } },
        ],
      }) }} />

      {/* What they protect */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT SHOULDER PADS PROTECT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Shoulder pads protect the shoulders, collarbone, upper chest, upper back, the top of the biceps, and the spine. They run from the base of the neck to the top of the bicep, wrapping around both the chest and the back.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          A properly fitted shoulder pad covers all of these areas without restricting the player&apos;s ability to raise their arms, rotate their torso, or take a full slap shot. A poorly fitted one either leaves gaps (no protection) or binds (no mobility).
        </p>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Work through these checks. The pad fails if any of them don&apos;t pass.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Shoulder caps sit directly on top of the shoulders — not hanging off the edge, not riding up the neck. A common error is buying a pad that\'s too wide, which leaves the caps floating off the shoulder line.',
            'Chest plate covers the sternum and the upper chest. The bicep guards run about halfway down the upper arm.',
            'Neck gap: run a finger along the inside of the neck opening. There should be a 1-2 finger gap between the pad and the throat. Less and the pad is choking them; more and the pad is too big.',
            'Mobility test: have the kid raise their stick above their head. The shoulder caps should move with the shoulders — no gap should open up between the cap and the deltoid.',
            'Coverage test: have the kid get into a hockey stance. The pads should still cover the collarbone, the chest, and the upper back. No gaps.',
            'Spine protector covers the shoulder blades and extends down to the mid-back.',
          ].map((t, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>{i + 1}</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sizing */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SIZING (YOUTH)</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Measure chest circumference at the widest point (across the nipples, with the kid relaxed and not flexing). Match the measurement to the manufacturer&apos;s youth chart.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Youth XS', chest: '20" – 22"', age: '5-7' },
              { size: 'Youth Small', chest: '22" – 24"', age: '7-9' },
              { size: 'Youth Medium', chest: '24" – 26"', age: '9-11' },
              { size: 'Youth Large', chest: '26" – 28"', age: '11-13' },
              { size: 'Youth XL / Junior', chest: '28" – 30"', age: '13+' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.chest}</p>
                <p style={{ fontSize: '0.8125rem', color: '#777', textAlign: 'right' }}>Ages {row.age}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>Between sizes?</strong> Size up. Shoulder pads compress the chest on impact, and a too-small pad will limit breathing. The mobility test (raise the stick above the head) is the more important check than the chest measurement alone — a slightly wider pad that still allows full movement fits better than a tighter pad that doesn&apos;t.
        </p>
      </section>

      {/* When to size up */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO SIZE UP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Size up when:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The mobility test fails — the kid can&apos;t raise their stick overhead without the pads binding.</li>
          <li>• The chest plate visibly compresses the chest when the kid is in a stance.</li>
          <li>• The neck opening is less than a finger-width from the throat.</li>
          <li>• The bicep guards ride up the arm when the kid plays.</li>
          <li>• The kid has visibly grown — most parents size up shoulder pads every 1-2 seasons for kids 8-13.</li>
        </ul>
      </section>

      {/* Common mistakes */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>COMMON MISTAKES</h2>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { err: 'Buying by age, not by chest measurement.', fix: 'Two 11-year-olds can have chest measurements three inches apart. Always use the chart.' },
            { err: 'Skipping the mobility test.', fix: 'A pad that covers everything but doesn\'t move is a pad the kid can\'t play in. Have them mimic a slap shot before buying.' },
            { err: 'Choosing adult pads to "last longer."', fix: 'Adult pads are wider and longer than youth pads. They\'ll sit on the kid\'s shoulders like a jacket and leave the biceps exposed.' },
            { err: 'Loosening the chest strap to "fix" a tight pad.', fix: 'If the pad binds when the chest strap is snug, the pad is too small. Don\'t paper over the size problem.' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.25rem' }}>✗ {m.err}</p>
              <p style={{ fontSize: '0.8125rem', color: '#999', lineHeight: 1.6 }}><strong style={{ color: '#bbb' }}>Fix:</strong> {m.fix}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/youth/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/youth/helmet-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Helmet fitting →
          </Link>
          <Link href="/guides/youth/elbow-pad-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Elbow pad fitting →
          </Link>
          <Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Parent&apos;s Handbook →
          </Link>
        </div>
      </section>
    </div>
  );
}
