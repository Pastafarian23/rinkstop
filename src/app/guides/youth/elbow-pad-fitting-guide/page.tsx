import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Elbow Pads: A Parent\'s Guide',
  description: "How to fit hockey elbow pads for your kid — elbow cup position, strap order, length measurement, sizing, and when to size up.",
  openGraph: {
    title: 'How to Fit Hockey Elbow Pads',
    description: "A parent's guide to fitting elbow pads — cup position, strap order, sizing, and when to size up.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/elbow-pad-fitting-guide' },
};

export default function ElbowPadFittingGuideYouth() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Elbow Pad Fitting Guide</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT HOCKEY ELBOW PADS
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        How to fit elbow pads for your kid. Covers what they protect, the elbow cup position test, strap order, length measurement for sizing, and when to size up.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "How to Fit Hockey Elbow Pads: A Parent's Guide | RinkStop",
        description: "Elbow cup position, strap order, length measurement, sizing, and when to size up.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should hockey elbow pads fit on a kid?', acceptedAnswer: { '@type': 'Answer', text: 'The elbow cup should sit centered on the elbow joint. The forearm guard should extend from just below the elbow to about 2 inches above the cuff of the glove, with no gap between them. Tighten the upper strap first, then the lower. The pad should not slide up the tricep or down the forearm when the kid skates.' } },
          { '@type': 'Question', name: 'How do I size youth hockey elbow pads?', acceptedAnswer: { '@type': 'Answer', text: 'Measure from the center of the back of the elbow to the wrist, with the arm slightly bent. Match the measurement to the manufacturer\'s youth chart. Youth sizes typically run 7"-10". The cup staying centered on the elbow is more important than the measurement — if the cup drifts up or down when the kid bends their arm, try a different size.' } },
          { '@type': 'Question', name: 'When should I tighten the upper strap on elbow pads?', acceptedAnswer: { '@type': 'Answer', text: 'Always. Tighten the upper strap first, then the lower. If the upper strap is loose, the elbow pad slides down the tricep, which moves the elbow cup off the joint — exactly where you need protection.' } },
        ],
      }) }} />

      {/* What they protect */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT ELBOW PADS PROTECT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Elbow pads protect the elbow joint, the forearm, and a small portion of the triceps. The elbow cup is the most important part — it absorbs the impact of falls onto the ice, hits against the boards, and the rare puck-to-elbow.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          The fit is straightforward but the common failure mode is the cup drifting off the elbow joint. If the cup is on the tricep or forearm instead of the elbow, the pad is doing nothing where it needs to.
        </p>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Three checks. If any fail, the size is wrong.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Cup position: with the arm straight, the elbow cup should be centered on the elbow joint. If it sits on the tricep or on the forearm, the pad is too big.',
            'Bend test: have the kid bend the arm to 90 degrees. The cup should still be centered on the elbow — not sliding to one side or the other. If the cup drifts, the pad is too big or the straps are in the wrong order.',
            'Gap check: with the glove on, the elbow pad should overlap the glove cuff by about 2 inches. No gap of bare skin between them.',
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

      {/* Strap order */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>STRAP ORDER: UPPER FIRST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Most youth elbow pads have two straps: one above the elbow (bicep area) and one below (forearm area). Always tighten the <strong style={{ color: '#fff' }}>upper strap first</strong>, then the lower. If you tighten the lower strap first, the upper strap pulls the cup down onto the forearm, away from the joint where protection is needed.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Both straps should be snug but not cutting off circulation. If the kid&apos;s fingers tingle or the lower arm goes numb, the lower strap is too tight.
        </p>
      </section>

      {/* Sizing */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SIZING (YOUTH)</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Measure from the center of the back of the elbow to the wrist, with the arm slightly bent. Match the measurement to the manufacturer&apos;s youth chart.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Youth XS', length: '6" – 7"', age: '5-7' },
              { size: 'Youth Small', length: '7" – 8"', age: '7-9' },
              { size: 'Youth Medium', length: '8" – 9"', age: '9-11' },
              { size: 'Youth Large', length: '9" – 10"', age: '11-13' },
              { size: 'Youth XL / Junior', length: '10" – 11"', age: '13+' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.length}</p>
                <p style={{ fontSize: '0.8125rem', color: '#777', textAlign: 'right' }}>Ages {row.age}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* When to size up */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO SIZE UP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Size up when the cup drifts off the elbow joint, the pad slides down the arm during play, or the kid has visibly grown between seasons. Most parents replace elbow pads every 1-2 seasons for kids 8-13.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/youth/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/youth/shoulder-pad-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Shoulder pad fitting →
          </Link>
          <Link href="/guides/youth/hockey-glove-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Glove fitting →
          </Link>
          <Link href="/guides/breaking-in-hockey-gloves" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Breaking in gloves →
          </Link>
        </div>
      </section>
    </div>
  );
}
