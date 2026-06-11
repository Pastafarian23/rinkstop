import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Elbow Pads: A Guide for Adult Players',
  description: "How to fit hockey elbow pads for adult players — elbow cup position, strap order, length measurement, junior sizing, and when to upgrade.",
  openGraph: {
    title: 'How to Fit Hockey Elbow Pads (Adults)',
    description: "A guide for adult players on fitting elbow pads — cup position, strap order, sizing, and junior sizes.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult/elbow-pad-fitting-guide' },
};

export default function ElbowPadFittingGuideAdult() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/adult" style={{ color: '#555' }}>Adult</Link>
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
        For adult players. Covers elbow cup position, strap order, length measurement, junior/intermediate sizing for women and smaller-framed men, and when to upgrade.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit Hockey Elbow Pads: A Guide for Adult Players | RinkStop',
        description: "Elbow cup position, strap order, length measurement, junior sizing for women and smaller-framed men.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should adult hockey elbow pads fit?', acceptedAnswer: { '@type': 'Answer', text: 'The elbow cup should be centered on the elbow joint. The forearm guard should extend from just below the elbow to about 2 inches above the cuff of the glove. Tighten the upper strap first, then the lower. The pad should not slide up the tricep or down the forearm during play.' } },
          { '@type': 'Question', name: 'How do I size adult hockey elbow pads?', acceptedAnswer: { '@type': 'Answer', text: 'Measure from the center of the back of the elbow to the wrist, with the arm slightly bent. Senior sizes typically run 11"-14". Many adult women and smaller-framed men fit better in junior or intermediate sizes (10"-12"). The cup staying centered on the elbow is more important than the measurement alone.' } },
          { '@type': 'Question', name: 'Are elbow pads safe to buy used?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, with inspection. Check that the elbow cup isn\'t cracked, the foam isn\'t compressed or crumbling, and both straps are functional. Used elbow pads are a great way for an adult newcomer to save money — the protective technology hasn\'t changed much in 10 years, and the fit is what matters.' } },
        ],
      }) }} />

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Three checks. If any fail, the size is wrong.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Cup position: with the arm straight, the elbow cup should be centered on the elbow joint. If it sits on the tricep or on the forearm, the pad is too big.',
            'Bend test: bend the arm to 90 degrees. The cup should still be centered on the elbow — not sliding to one side or the other. If the cup drifts, the pad is too big or the straps are in the wrong order.',
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
          Always tighten the <strong style={{ color: '#fff' }}>upper strap first</strong>, then the lower. The upper strap holds the cup against the elbow joint. If you tighten the lower strap first, the upper strap pulls the cup down onto the forearm, away from the joint where protection is needed.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Both straps should be snug but not cutting off circulation. Numbness or tingling in the fingers means the lower strap is too tight.
        </p>
      </section>

      {/* Sizing */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SIZING (ADULT)</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Measure from the center of the back of the elbow to the wrist, with the arm slightly bent. Match the measurement to the brand-specific chart.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Junior Medium', length: '9" – 10"', note: 'Common for smaller adults and women' },
              { size: 'Junior Large', length: '10" – 11"', note: 'Common for women' },
              { size: 'Intermediate', length: '11" – 12"', note: 'Common for women and slim men' },
              { size: 'Senior Small', length: '11" – 12"', note: '' },
              { size: 'Senior Medium', length: '12" – 13"', note: '' },
              { size: 'Senior Large', length: '13" – 14"', note: '' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.length}</p>
                <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>{row.note}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>For women and smaller-framed men:</strong> intermediate or junior elbow pads are often a better fit than senior. Senior pads are sized for larger forearms; if the cup is centered on the elbow but the forearm guard is too wide, drop down a size.
        </p>
      </section>

      {/* When to upgrade */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO UPGRADE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Elbow pads don&apos;t have a hard "replace by" date. Most adult players replace them every 3-5 years with regular play, or sooner if:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The foam has compressed and the pad feels noticeably thinner than when new.</li>
          <li>• The elbow cup is cracked or has visible damage.</li>
          <li>• The straps no longer hold the pad snugly.</li>
          <li>• You&apos;re moving up a competitive level and want more protection — higher-end pads add segmented foam, more bicep coverage, and better articulation.</li>
        </ul>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/adult/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/adult/shoulder-pad-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Shoulder pad fitting →
          </Link>
          <Link href="/guides/adult/hockey-glove-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
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
