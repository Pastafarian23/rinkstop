import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Shoulder Pads: A Guide for Adult Players',
  description: "How to fit hockey shoulder pads for adult players — coverage, mobility, chest measurement, tapered vs classic fit, junior sizing for women, and when to upgrade.",
  openGraph: {
    title: 'How to Fit Hockey Shoulder Pads (Adults)',
    description: "A guide for adult players on fitting shoulder pads — fit, sizing, junior sizes for women, and when to upgrade.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult/shoulder-pad-fitting-guide' },
};

export default function ShoulderPadFittingGuideAdult() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/adult" style={{ color: '#555' }}>Adult</Link>
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
        For adult players. Covers coverage and mobility tests, chest measurement, tapered vs classic fit, junior/intermediate sizing for women and smaller-framed men, and when to upgrade.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit Hockey Shoulder Pads: A Guide for Adult Players',
        description: "Coverage, mobility, chest measurement, tapered vs classic fit, junior sizing for women.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should adult hockey shoulder pads fit?', acceptedAnswer: { '@type': 'Answer', text: 'The shoulder caps should sit directly on top of the shoulders. The chest plate should cover the sternum and upper chest. The bicep guards should run about halfway down the upper arm. There should be a 1-2 finger gap between the inside of the neck opening and the throat. The pads should move with you when you raise your arms — no gap should open up between the shoulder cap and the deltoid.' } },
          { '@type': 'Question', name: 'What is the difference between tapered and classic shoulder pads?', acceptedAnswer: { '@type': 'Answer', text: 'Tapered (or "anatomical") shoulder pads are narrower through the chest and waist — the modern fit most NHL players use. They hug the body and feel lighter. Classic pads are roomier with a more traditional fit. Loose pads are designed for goalies. Most adult players do best in tapered; if you have a wider chest-to-waist ratio, classic fits better.' } },
          { '@type': 'Question', name: 'Can adults wear junior shoulder pads?', acceptedAnswer: { '@type': 'Answer', text: 'Yes — many adult women and smaller-framed adult men fit better in junior or intermediate shoulder pads than in senior sizes. Junior pads are shorter (about an inch less in torso length) and narrower through the chest. If senior pads are too wide or hang off your shoulders, try a junior or intermediate. Fit is what matters, not the size label.' } },
        ],
      }) }} />

      {/* Fit styles */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THREE FIT STYLES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Adult shoulder pads come in three fits. The right one depends on your body shape and how you play:
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { style: 'Tapered (anatomical)', desc: 'Narrow through the chest and waist. The modern fit most NHL players use. Hugs the body, feels lighter, allows maximum mobility. Best for players with a slimmer or more athletic build.' },
            { style: 'Classic (traditional)', desc: 'A roomier fit with more space through the chest and torso. Best for players with a wider chest-to-waist ratio, or anyone who finds tapered pads too restrictive. Slightly more padding coverage, slightly less mobility.' },
            { style: 'Loose / relaxed', desc: 'Designed for goalies. Maximum mobility, lightest weight, minimal bulk. Adult skaters generally do NOT want this fit — too much movement means coverage gaps during regular play.' },
          ].map(f => (
            <div key={f.style} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{f.style}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Work through these checks. The pad fails if any of them don&apos;t pass.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Shoulder caps sit directly on top of the shoulders — not floating off the edge, not riding up the neck.',
            'Chest plate covers the sternum and the upper chest. The bicep guards run about halfway down the upper arm.',
            'Neck gap: 1-2 fingers of space between the inside of the neck opening and your throat. Less and the pad is choking; more and it\'s too big.',
            'Mobility test: raise your stick above your head. The shoulder caps should move with you — no gap should open up between the cap and the deltoid.',
            'Coverage test: get into a hockey stance. The pads should still cover the collarbone, the chest, and the upper back. No gaps.',
            'Spine protector covers the shoulder blades and extends to the mid-back.',
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
          Measure chest circumference at the widest point (across the nipples, relaxed). Match the measurement to the brand-specific chart — Bauer, CCM, and Warrior all size slightly differently.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Junior Small', chest: '30" – 33"', note: 'Common for smaller adults and many women' },
              { size: 'Junior Medium', chest: '33" – 36"', note: 'Common for women' },
              { size: 'Junior Large', chest: '36" – 38"', note: 'Common for women and slim men' },
              { size: 'Senior Small', chest: '36" – 38"', note: '' },
              { size: 'Senior Medium', chest: '38" – 40"', note: '' },
              { size: 'Senior Large', chest: '40" – 43"', note: '' },
              { size: 'Senior XL', chest: '43" – 46"', note: '' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.chest}</p>
                <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>{row.note}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>For women:</strong> Many adult women wear Junior or Intermediate shoulder pads. Senior pads are often too wide through the chest, leaving the shoulder caps floating off the deltoid. Junior pads are shorter and narrower, providing a more secure fit. Women-specific pads (Bauer and CCM both have lines) add molded chest cups to address the anatomical fit issue.
        </p>
      </section>

      {/* When to upgrade */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO UPGRADE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Shoulder pads don&apos;t have a "replace by" date the way helmets do — they last until the foam compresses or the plastic cracks. Most adult players replace shoulder pads every 3-5 years with regular play, or sooner if:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The foam has compressed and the pad feels noticeably thinner than when new.</li>
          <li>• The plastic caps are cracked or have visible damage.</li>
          <li>• The straps no longer hold the pad snugly to the body.</li>
          <li>• You&apos;ve moved up a competitive level and want more protection (mid-tier to high-tier pads add extra coverage in the spine and ribs).</li>
        </ul>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/adult/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/adult/helmet-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Helmet fitting →
          </Link>
          <Link href="/guides/adult/elbow-pad-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Elbow pad fitting →
          </Link>
          <Link href="/guides/hockey-positions" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Understanding Positions →
          </Link>
        </div>
      </section>
    </div>
  );
}
