import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Shin Guards: A Guide for Adult Players',
  description: "How to fit hockey shin guards for adult players — knee cup position, shin length, length measurement, sizing by height, and when to upgrade.",
  openGraph: {
    title: 'How to Fit Hockey Shin Guards (Adults)',
    description: "A guide for adult players on fitting shin guards — knee cup, shin length, sizing, and when to upgrade.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult/shin-guard-fitting-guide' },
};

export default function ShinGuardFittingGuideAdult() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/adult" style={{ color: '#555' }}>Adult</Link>
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
        For adult players. Covers the knee cup position test, the no-gap rule at the top of the skate, length measurement for sizing, and when to upgrade.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit Hockey Shin Guards: A Guide for Adult Players | RinkStop',
        description: "Knee cup position, shin length, length measurement, sizing by height, when to upgrade.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should adult hockey shin guards fit?', acceptedAnswer: { '@type': 'Answer', text: 'The knee cup should be centered on the kneecap. The shin section should run from just below the knee to the top of the skate tongue — there should be no gap of bare skin between the bottom of the shin guard and the top of the skate. The thigh guard should extend at least halfway up the thigh and tuck under the bottom of the pants or girdle.' } },
          { '@type': 'Question', name: 'How do I size adult hockey shin guards?', acceptedAnswer: { '@type': 'Answer', text: 'Measure from the center of the kneecap straight down to the top of the skate, then add about 1 inch. Match the measurement to the brand-specific chart. Senior sizes run 14"-17", intermediate 12"-14", junior 10"-12". The "no gap" rule is more important than the measurement — if the bottom of the shin guard doesn\'t overlap the top of the skate, the size is wrong.' } },
          { '@type': 'Question', name: 'Are shin guards safe to buy used?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, with inspection. Check that the knee cup is intact (no cracks), the foam is firm (not compressed or crumbling), and all straps and buckles are functional. Used shin guards are a great way for an adult newcomer to save money — the protective technology hasn\'t changed much in 10 years, and the fit is what matters.' } },
        ],
      }) }} />

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Three checks. The shin guard fails if any of them don&apos;t pass.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Knee cup is centered on the kneecap. If the cup drifts above or below the knee when you skate, the size is wrong.',
            'No gap at the skate: with your skates on, the bottom of the shin guard should overlap the top of the skate tongue. No bare shin showing.',
            'Thigh guard overlap: the upper flap should extend at least halfway up the thigh and tuck under the bottom of the pants or girdle.',
            'Strap test: skate a few strides. The shin guard should not slide down the leg. If the straps are maxed out and it still slides, the size is wrong.',
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SIZING (ADULT)</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Measure from the center of the kneecap straight down to the top of the skate, then add about 1 inch. Match the measurement to the brand-specific chart. Always measure with your actual skates on — the height of the skate tongue affects the result.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Junior 10" – 12"', height: '5\'0" – 5\'4"', note: 'Common for smaller adults and women' },
              { size: 'Intermediate 12" – 14"', height: '5\'4" – 5\'8"', note: 'Common for women and slim men' },
              { size: 'Senior 14"', height: '5\'6" – 5\'8"', note: '' },
              { size: 'Senior 15"', height: '5\'8" – 5\'10"', note: '' },
              { size: 'Senior 16"', height: '5\'10" – 6\'0"', note: '' },
              { size: 'Senior 17"', height: '6\'0" – 6\'4"', note: '' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.height}</p>
                <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>{row.note}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>For women and smaller-framed men:</strong> intermediate or junior shin guards often fit better than senior. The thigh guard on a senior shin guard is sized for larger legs; if the thigh guard is bunching at the top, try a smaller size.
        </p>
      </section>

      {/* When to upgrade */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO UPGRADE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Shin guards don&apos;t have a hard "replace by" date. Most adult players replace them every 3-5 years with regular play, or sooner if:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The foam has compressed and the padding feels noticeably thinner than when new.</li>
          <li>• The knee cup is cracked or has visible damage.</li>
          <li>• The straps no longer hold the shin guard snugly.</li>
          <li>• You&apos;re moving up a competitive level and want more protection (higher-end shin guards add segmented foam, better knee articulation, and more calf coverage).</li>
        </ul>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/adult/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/adult/hockey-pants-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
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
