import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Gloves: A Guide for Adult Players | RinkStop',
  description: "How to fit hockey gloves for adult players — palm gap test, finger length, cuff overlap, length measurement, junior/intermediate sizing for women, and when to upgrade.",
  openGraph: {
    title: 'How to Fit Hockey Gloves (Adults) | RinkStop',
    description: "A guide for adult players on fitting hockey gloves — palm gap, finger length, sizing, and junior sizes.",
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult/hockey-glove-fitting-guide' },
};

export default function HockeyGloveFittingGuideAdult() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/adult" style={{ color: '#555' }}>Adult</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Glove Fitting Guide</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT HOCKEY GLOVES
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        For adult players. Covers the palm gap test, finger length, cuff overlap, length measurement, junior/intermediate sizing for women and smaller-framed men, and when to upgrade.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit Hockey Gloves: A Guide for Adult Players | RinkStop',
        description: "Palm gap test, finger length, cuff overlap, length measurement, junior sizing for women.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should adult hockey gloves fit?', acceptedAnswer: { '@type': 'Answer', text: 'Open the hand fully — the palm material should be taut across the palm with no loose folds. Fingertips should just reach the end of the glove, with about a quarter-inch of space. The cuff should overlap the elbow pad by 1-2 inches. You should be able to feel the stick through the glove — if you can\'t, the padding is too thick for your hand size.' } },
          { '@type': 'Question', name: 'How do I size adult hockey gloves?', acceptedAnswer: { '@type': 'Answer', text: 'Measure from the base of the palm to the tip of the middle finger, with the hand open. Senior gloves run 13"-15", intermediate 12"-13", junior 11"-12". Many adult women and smaller-framed men prefer a 12" or 13" intermediate or junior glove for better stick feel.' } },
          { '@type': 'Question', name: 'Should hockey gloves be tight or loose?', acceptedAnswer: { '@type': 'Answer', text: 'Depends on what you value more. A tight glove gives you better stick feel and puck control. A looser glove gives you more mobility and feels less restrictive. Most adult players prefer a glove that\'s snug but not tight — palm material taut across the palm, no finger crowding, no palm bunching. Try both fits before committing to one.' } },
        ],
      }) }} />

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Four checks. The glove fails if any of them don&apos;t pass.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Palm gap: open the hand fully. The palm material should be taut across the palm with no loose folds or bunching.',
            'Finger length: fingertips should just reach the end of the glove, with about a quarter-inch of space.',
            'Cuff overlap: with the elbow pad on, the cuff of the glove should overlap the elbow pad by 1-2 inches.',
            'Stick feel: grip a stick. You should be able to feel the tape through the glove. If you can\'t feel the stick, the padding is too thick for your hand.',
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
          Measure from the base of the palm to the tip of the middle finger, with the hand open. Match the measurement to the brand-specific chart.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Junior 11"', hand: '11-12"', note: 'Common for women and smaller adults' },
              { size: 'Junior 12"', hand: '12-13"', note: 'Common for women' },
              { size: 'Intermediate 13"', hand: '13-14"', note: 'Common for women and slim men' },
              { size: 'Senior 14"', hand: '14-15"', note: '' },
              { size: 'Senior 15"', hand: '15-16"', note: '' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.hand}</p>
                <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>{row.note}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>For women:</strong> many adult women wear a 12" or 13" intermediate or junior glove. Senior gloves are sized for larger hands; the fingers and palm are wider, which makes stick feel worse. Some brands (Bauer, CCM) now offer women-specific gloves with narrower palms and shorter fingers — better for women with smaller hands.
        </p>
      </section>

      {/* When to upgrade */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO UPGRADE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Gloves don&apos;t have a hard "replace by" date. Most adult players replace them every 3-5 years with regular play, or sooner if:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The palm is worn through or has visible holes.</li>
          <li>• The padding has compressed and the protection feels noticeably thinner.</li>
          <li>• The cuff or wrist closure is no longer functional.</li>
          <li>• You&apos;re moving up a competitive level and want more protection (higher-end gloves add segmented foam, better wrist articulation, and reinforced palms).</li>
        </ul>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/adult/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/breaking-in-hockey-gloves" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Breaking in hockey gloves →
          </Link>
          <Link href="/guides/adult/elbow-pad-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Elbow pad fitting →
          </Link>
          <Link href="/guides/hockey-stick-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            How to choose the right stick →
          </Link>
        </div>
      </section>
    </div>
  );
}
