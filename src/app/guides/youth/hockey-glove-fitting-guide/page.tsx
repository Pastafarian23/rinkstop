import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Gloves: A Parent\'s Guide',
  description: "How to fit hockey gloves for your kid — palm gap test, finger length, cuff-to-elbow overlap, length measurement, sizing, and when to size up.",
  openGraph: {
    title: 'How to Fit Hockey Gloves',
    description: "A parent's guide to fitting hockey gloves — palm gap, finger length, sizing, and when to size up.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/hockey-glove-fitting-guide' },
};

export default function HockeyGloveFittingGuideYouth() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
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
        How to fit hockey gloves for your kid. Covers the palm gap test, finger length, cuff-to-elbow overlap, length measurement for sizing, and when to size up.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "How to Fit Hockey Gloves: A Parent's Guide | RinkStop",
        description: "Palm gap test, finger length, cuff-to-elbow overlap, length measurement, sizing, when to size up.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should hockey gloves fit on a kid?', acceptedAnswer: { '@type': 'Answer', text: 'Open the hand fully — the palm material should be taut across the palm with no loose folds. Fingertips should just reach the end of the glove, with about a quarter-inch of space. The cuff should overlap the elbow pad by 1-2 inches. The kid should be able to feel the stick through the glove — if they can\'t, the padding is too thick for their hand size.' } },
          { '@type': 'Question', name: 'How do I size youth hockey gloves?', acceptedAnswer: { '@type': 'Answer', text: 'Measure from the base of the palm to the tip of the middle finger, with the hand open. Match the measurement to the manufacturer\'s chart. Youth gloves run 8"-11", junior 11"-12", senior 12"-15". The fit is highly personal — some players prefer tighter gloves for better feel, others looser for mobility. The palm gap test is more important than the measurement alone.' } },
          { '@type': 'Question', name: 'Can my kid use used hockey gloves?', acceptedAnswer: { '@type': 'Answer', text: 'Yes — gloves are one of the safest pieces of equipment to buy used. The protective technology doesn\'t change much, and the smell/break-in issues are minor. Check that the palm isn\'t worn through, the cuff is intact, and all the protection panels are still in place. Used gloves are a great way to save money, especially for growing kids who will outgrow them within a season or two.' } },
        ],
      }) }} />

      {/* Why fit matters for stick feel */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHY GLOVE FIT IS PERSONAL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Hockey gloves are the most personal piece of equipment. The fit directly affects stick feel — a glove that&apos;s too big makes it impossible to grip the stick properly, a glove that&apos;s too small cramps the hand and makes the stick feel awkward. Other equipment can be "close enough" — gloves can&apos;t.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Gloves also protect the hands, fingers, wrists, and forearms. The fit has to balance protection with feel. The two aren&apos;t always the same goal.
        </p>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Four checks. The glove fails if any of them don&apos;t pass.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Palm gap: open the hand fully. The palm material should be taut across the palm with no loose folds, no extra material bunching up.',
            'Finger length: fingertips should just reach the end of the glove, with about a quarter-inch of space. Less and the fingers are crowded; more and the stick slips.',
            'Cuff overlap: with the elbow pad on, the cuff of the glove should overlap the elbow pad by 1-2 inches. No gap of bare skin between them.',
            'Stick feel: have the kid grip a stick. They should be able to feel the tape through the glove. If they can\'t feel the stick, the padding is too thick for their hand size.',
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
          Measure from the base of the palm to the tip of the middle finger, with the hand open. Match the measurement to the manufacturer&apos;s chart.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Youth 8"', hand: '5-7' },
              { size: 'Youth 9"', hand: '7-9' },
              { size: 'Youth 10"', hand: '9-11' },
              { size: 'Youth 11"', hand: '11-13' },
              { size: 'Junior 12"', hand: '13+' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999', textAlign: 'right' }}>Ages {row.hand}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          Glove sizing is highly personal. Some kids prefer a tighter glove for better stick feel; others prefer a looser glove for mobility. If the kid is between sizes, try both and have them grip a stick in each before deciding.
        </p>
      </section>

      {/* When to size up */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO SIZE UP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Size up when:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The palm material has visible folds or bunching when the kid opens the hand.</li>
          <li>• The fingertips are more than a quarter-inch from the end of the glove.</li>
          <li>• The cuff no longer overlaps the elbow pad by 1-2 inches.</li>
          <li>• The kid complains of hand cramping or loss of stick feel.</li>
          <li>• The hand has visibly grown between seasons.</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>
          Gloves are typically the first piece of equipment parents replace when a kid outgrows it, because the fit failure is obvious (the kid complains about losing stick feel). Most parents replace gloves every 1-2 seasons for kids 8-13.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/youth/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/breaking-in-hockey-gloves" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Breaking in hockey gloves →
          </Link>
          <Link href="/guides/youth/elbow-pad-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
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
