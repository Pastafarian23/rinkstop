import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Shin Guards: A Parent\'s Guide',
  description: "How to fit hockey shin guards for your kid — knee cup position, shin length, thigh guard overlap, length measurement, sizing, and when to size up.",
  openGraph: {
    title: 'How to Fit Hockey Shin Guards',
    description: "A parent's guide to fitting shin guards — knee cup, shin length, thigh guard, sizing, and when to size up.",
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/shin-guard-fitting-guide' },
};

export default function ShinGuardFittingGuideYouth() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Shin Guard Fitting Guide</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT HOCKEY SHIN GUARDS
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        How to fit shin guards for your kid. Covers the knee cup position test, the critical no-gap rule at the top of the skate, length measurement for sizing, and when to size up.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "How to Fit Hockey Shin Guards: A Parent's Guide | RinkStop",
        description: "Knee cup position, shin length, thigh guard overlap, length measurement, sizing, when to size up.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should hockey shin guards fit on a kid?', acceptedAnswer: { '@type': 'Answer', text: 'The knee cup should sit centered on the kneecap. The shin section should run from just below the knee to the top of the skate tongue — there should be no gap of bare skin between the bottom of the shin guard and the top of the skate. The thigh guard should extend at least halfway up the thigh and tuck under the bottom of the hockey pants.' } },
          { '@type': 'Question', name: 'How do I size youth hockey shin guards?', acceptedAnswer: { '@type': 'Answer', text: 'Measure from the center of the kneecap straight down to the top of the skate, then add about 1 inch. Match the measurement to the manufacturer\'s chart. Youth sizes typically run 8"-12". The "no gap" rule is more important than the measurement — if the bottom of the shin guard doesn\'t overlap the top of the skate, the size is wrong regardless of what the chart says.' } },
          { '@type': 'Question', name: 'Is a gap between the shin guard and the skate dangerous?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. A puck through a gap in shin-guard coverage can find the leg. The most common gap is between the bottom of the shin guard and the top of the skate tongue — even a 1-inch gap leaves the lower shin exposed. Always test the fit with the kid\'s actual skates on.' } },
        ],
      }) }} />

      {/* What they protect */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT SHIN GUARDS PROTECT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Shin guards protect the shin, the knee, and the lower thigh. The fit is the most-often-misjudged piece of equipment because the right length depends on the player&apos;s height and how they wear the gear.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          The single most important rule: <strong style={{ color: '#fff' }}>no gap of bare skin between the bottom of the shin guard and the top of the skate</strong>. A puck through a gap finds the leg.
        </p>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Three checks. The shin guard fails if any of them don&apos;t pass.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Knee cup is centered on the kneecap. If the cup drifts above or below the knee when the kid skates, the size is wrong.',
            'No gap at the skate: with the kid\'s skates on, the bottom of the shin guard should overlap the top of the skate tongue. No bare shin showing.',
            'Thigh guard overlap: the upper flap of the shin guard should extend at least halfway up the thigh and tuck under the bottom of the hockey pants. No skin visible when the kid is in a stride.',
            'Strap test: have the kid skate a few strides. The shin guard should not slide down the leg. If it does, the straps need tightening — but if the straps are maxed out and it still slides, the size is wrong.',
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
          Measure from the center of the kneecap straight down to the top of the skate, then add about 1 inch. Match the measurement to the manufacturer&apos;s chart. Always measure with the kid&apos;s actual skates on, since the height of the skate tongue affects the result.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Youth 7"', height: '3\'0" – 3\'6"', age: '4-6' },
              { size: 'Youth 8"', height: '3\'6" – 4\'0"', age: '6-7' },
              { size: 'Youth 9"', height: '4\'0" – 4\'6"', age: '7-9' },
              { size: 'Youth 10"', height: '4\'6" – 5\'0"', age: '9-11' },
              { size: 'Youth 11" / Junior 12"', height: '5\'0" – 5\'4"', age: '11-13' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.height}</p>
                <p style={{ fontSize: '0.8125rem', color: '#777', textAlign: 'right' }}>Ages {row.age}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>Skates-on measurement is the only one that matters.</strong> The height of the skate tongue varies by brand and model — a 1-inch difference is the difference between a properly fitting shin guard and a gap-exposed leg.
        </p>
      </section>

      {/* When to size up */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO SIZE UP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Size up when:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The bottom of the shin guard no longer overlaps the top of the skate.</li>
          <li>• The knee cup drifts off the kneecap when the kid skates.</li>
          <li>• The thigh guard no longer tucks under the hockey pants.</li>
          <li>• The straps are maxed out and the shin guard still slides down.</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>
          Most parents replace shin guards every 1-2 seasons for kids 8-13. The growth-spurt years (typically 11-13 for boys, 9-11 for girls) are when shin guards need to be replaced most often.
        </p>
      </section>

      {/* Used gear */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.12em', marginBottom: '1rem' }}>USED SHIN GUARDS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Safe to buy used. Check that the knee cup is intact (no cracks), the foam is firm (not compressed or crumbling), all straps are functional, and the buckles or Velcro closures still hold. As with pants, the main concern is fit — used shin guards only work if they actually fit the player.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/youth/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/youth/hockey-pants-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey pants fitting →
          </Link>
          <Link href="/guides/skate-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Skate Fitting Guide →
          </Link>
        </div>
      </section>
    </div>
  );
}
