import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit a Hockey Jock or Jill: A Parent\'s Guide',
  description: "How to fit a hockey jock or jill for your kid — waist measurement, jock vs jill difference, sock tabs, sizing by age, and when to size up.",
  openGraph: {
    title: 'How to Fit a Hockey Jock or Jill',
    description: "A parent's guide to fitting a hockey jock or jill — waist measurement, jock vs jill, sock tabs, and sizing.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/jock-jill-fitting-guide' },
};

export default function JockJillFittingGuideYouth() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Jock / Jill Fitting Guide</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT A HOCKEY JOCK OR JILL
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        How to fit a jock (boys) or jill (girls) for your kid. Covers the difference between jock and jill, waist measurement, sock tabs, sizing, and when to size up.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "How to Fit a Hockey Jock or Jill: A Parent's Guide",
        description: "Waist measurement, jock vs jill, sock tabs, sizing by age, when to size up.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What is the difference between a jock and a jill?', acceptedAnswer: { '@type': 'Answer', text: 'A jock is for boys — it includes a hard cup held in place by a jock strap or integrated compression short. A jill is for girls — it includes a pelvic shield designed for female anatomy, with different protective geometry. A jill is not just a jock with the cup removed; the design is different. Both are required in USA Hockey sanctioned play.' } },
          { '@type': 'Question', name: 'How do I size a youth jock or jill?', acceptedAnswer: { '@type': 'Answer', text: 'Measure the waist just above the hips. Match the measurement to the brand-specific youth chart — Bauer, CCM, and Shock Doctor all size differently. A Youth Small typically fits a 22"-24" waist. If the kid is between sizes, size down: a snug fit keeps the protective element in place during play.' } },
          { '@type': 'Question', name: 'Can my kid wear a jock or jill under their hockey pants?', acceptedAnswer: { '@type': 'Answer', text: 'Yes — that\'s exactly how it\'s designed to be worn. The jock or jill is the base layer that sits against the skin, and the hockey pants go over the top. The two pieces of equipment serve different protective purposes: the jock/jill protects the pelvic region, and the pants protect the lower back, kidneys, hips, and thighs. They\'re complementary, not interchangeable.' } },
        ],
      }) }} />

      {/* Jock vs Jill */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>JOCK VS. JILL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The jock (boys) and jill (girls) protect the pelvic region. The two pieces are different in design and construction — a jill is not a jock with the cup removed.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Jock (boys)</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>A hard protective cup held in place by a jock strap (traditional) or integrated compression short (modern). The cup is centered over the pelvic area. Most youth hockey today uses the integrated compression short style — easier to put on, less shifting during play.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Jill (girls)</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>A pelvic shield designed for female anatomy, with different protective geometry than a cup. Modern jills are integrated into compression shorts that fit over the hips and contour to the body. Brands like Bauer, Sher-Wood, and McDavid make jill-specific designs.</p>
          </div>
        </div>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Four checks. The jock/jill fails if any of them don&apos;t pass.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Waistband: sits comfortably at the natural waist without digging in or sagging. The compression short should be snug — the goal is to keep the protective element in place during play, not to provide support.',
            'Cup or shield position: centered over the pelvic area with no gaps in coverage. For boys, the cup is held by the jock strap or compression short. For girls, the pelvic shield should fully cover the lower abdomen and pelvic floor.',
            'Sock tabs: most compression shorts have small Velcro tabs inside the leg openings. These attach to the hockey socks and hold them up during play. If the shorts don\'t have tabs, the socks will fall down.',
            'Movement test: have the kid skate a few strides and get into a hockey stance. The cup/shield should not shift, the compression short should not ride up or slide down, and the sock tabs should hold the socks in place.',
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
          Measure the waist just above the hips. Match the measurement to the brand-specific youth chart. Brand sizing varies: Bauer, CCM, and Shock Doctor all size differently. The chart below is a typical youth size range; always check the actual product page.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Youth Small', waist: '22" – 24"', age: '7-9' },
              { size: 'Youth Medium', waist: '24" – 26"', age: '9-11' },
              { size: 'Youth Large', waist: '26" – 28"', age: '11-13' },
              { size: 'Junior Small', waist: '28" – 30"', age: '13+' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.waist}</p>
                <p style={{ fontSize: '0.8125rem', color: '#777', textAlign: 'right' }}>Ages {row.age}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>Cup sizing (boys):</strong> the cup is usually separate from the short. If a cup is included, it&apos;s typically a "Youth" size. If a replacement is needed, most youth players wear a standard youth cup sized by waist (not by the short size). Check the cup packaging for the sizing chart.
        </p>
      </section>

      {/* When to size up */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO SIZE UP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Size up when:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The compression short is too tight at the waist or hips.</li>
          <li>• The cup or shield has shifted during play.</li>
          <li>• The sock tabs are stretched out and no longer hold the socks.</li>
          <li>• The kid has visibly grown between seasons.</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>
          Most parents replace jocks/jills every 1-2 seasons for kids 8-13. They&apos;re also one of the most common items to buy used, since the protective element rarely wears out and the fit is what matters.
        </p>
      </section>

      {/* Used gear */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>USED JOCKS AND JILLS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Safe to buy used. For boys, replace the cup if it shows any cracks or has been heavily used. For girls, replace the pelvic shield if it has been compressed. The compression short itself is rarely the problem — it&apos;s the protective element that wears out.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Used jocks/jills are a great way for new hockey families to save money, especially during the first season when a kid is still deciding whether they&apos;ll stick with the sport.
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
          <Link href="/guides/youth/shin-guard-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Shin guard fitting →
          </Link>
          <Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Parent&apos;s Handbook →
          </Link>
        </div>
      </section>
    </div>
  );
}
