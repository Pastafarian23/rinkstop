import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit a Hockey Jock or Jill: A Guide for Adult Players',
  description: "How to fit a hockey jock or jill for adult players — jock vs jill difference, waist measurement, women-specific fit, sizing, and when to upgrade.",
  openGraph: {
    title: 'How to Fit a Hockey Jock or Jill (Adults)',
    description: "A guide for adult players on fitting a jock or jill — jock vs jill, fit, women-specific considerations, and when to upgrade.",
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult/jock-jill-fitting-guide' },
};

export default function JockJillFittingGuideAdult() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/adult" style={{ color: '#555' }}>Adult</Link>
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
        For adult players. Covers the difference between a jock and a jill, waist measurement, women-specific fit, sizing, and when to upgrade.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit a Hockey Jock or Jill: A Guide for Adult Players | RinkStop',
        description: "Jock vs jill, fit, women-specific considerations, when to upgrade.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Do I need a jock or a jill?', acceptedAnswer: { '@type': 'Answer', text: 'Men wear a jock (with a hard cup), women wear a jill (with a pelvic shield). Required in USA Hockey sanctioned play, beer league, and adult pickup. The cup and shield protect different anatomy, and a jill is not a jock with the cup removed — the design is different.' } },
          { '@type': 'Question', name: 'How should adult jocks and jills fit?', acceptedAnswer: { '@type': 'Answer', text: 'The compression short should be snug at the waist and over the hips. The cup or shield should be centered over the pelvic area with no shifting during play. The compression short should have Velcro sock tabs inside the leg openings to hold the hockey socks up.' } },
          { '@type': 'Question', name: 'Should women wear a jill or a jock with the cup removed?', acceptedAnswer: { '@type': 'Answer', text: 'Wear a jill. A jill is designed for female anatomy with different protective geometry — the shield is contoured for the lower abdomen and pelvic floor, which a cup is not. Wearing a jock with no cup leaves gaps in protection. Most major brands (Bauer, Sher-Wood, McDavid) make jill-specific designs.' } },
        ],
      }) }} />

      {/* Jock vs Jill */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>JOCK VS. JILL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The two pieces protect different anatomy. A jill is not a jock with the cup removed — the design and protective geometry are different.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Jock (men)</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>A hard protective cup held in place by a jock strap (traditional) or integrated compression short (modern). Most adult men wear the integrated short style. The cup is sized separately from the short and can be replaced independently.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Jill (women)</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>A pelvic shield designed for female anatomy. The shield is contoured for the lower abdomen and pelvic floor, with different protective geometry than a cup. Modern jills are integrated into compression shorts that fit over the hips. Brands like Bauer, Sher-Wood, and McDavid make jill-specific designs.</p>
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
            'Waistband: sits comfortably at the natural waist without digging in or sagging. The compression short should be snug — the goal is to keep the protective element in place during play.',
            'Cup or shield position: centered over the pelvic area with no gaps in coverage. For men, the cup is held by the jock strap or compression short. For women, the pelvic shield should fully cover the lower abdomen and pelvic floor.',
            'Sock tabs: most compression shorts have small Velcro tabs inside the leg openings. These attach to the hockey socks and hold them up during play. If the shorts don\'t have tabs, the socks will fall down.',
            'Movement test: skate a few strides and get into a hockey stance. The cup/shield should not shift, the compression short should not ride up or slide down, and the sock tabs should hold the socks in place.',
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
          Measure the waist just above the hips. Match the measurement to the brand-specific chart. Brand sizing varies: Bauer, CCM, Shock Doctor, and McDavid all size slightly differently. The chart below is a typical adult size range; always check the actual product page.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Junior Small', waist: '28" – 30"', note: 'Common for women' },
              { size: 'Junior Medium', waist: '30" – 32"', note: 'Common for women' },
              { size: 'Senior Small', waist: '28" – 30"', note: '' },
              { size: 'Senior Medium', waist: '30" – 34"', note: '' },
              { size: 'Senior Large', waist: '34" – 38"', note: '' },
              { size: 'Senior XL', waist: '38" – 42"', note: '' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.waist}</p>
                <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>{row.note}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>Cup sizing (men):</strong> the cup is usually separate from the short. If a cup is included, it&apos;s typically a "Standard" or "Large" adult size. If a replacement is needed, most men wear a cup sized by waist (not by the short size). Check the cup packaging for the sizing chart.
        </p>
      </section>

      {/* Women-specific fit */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WOMEN-SPECIFIC FIT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Women-specific jills are designed with female anatomy in mind: the shield is contoured to the lower abdomen and pelvic floor, the compression short is cut for the female hip-to-waist ratio, and the fit doesn&apos;t gap at the waist. The standard jock shape is designed for male anatomy and won&apos;t fit women the same way.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          If women-specific jills aren&apos;t available in your size, junior jills are the next-best option — the geometry is similar and the cut is smaller. Avoid wearing a jock with the cup removed: it leaves the lower abdomen and pelvic floor unprotected.
        </p>
      </section>

      {/* When to upgrade */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO UPGRADE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Jocks and jills don&apos;t have a hard "replace by" date. Most adult players replace them every 3-5 years, or sooner if:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The cup or shield has cracked, has visible damage, or has compressed.</li>
          <li>• The compression short has lost elasticity and no longer stays snug.</li>
          <li>• The sock tabs are stretched out and no longer hold the socks.</li>
          <li>• You&apos;re moving up a competitive level and want better protection (higher-end jocks/jills add reinforced stitching, better ventilation, and segmented shields).</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>
          For men, you can replace the cup independently if the short is still in good condition. For women, the shield is usually integrated into the short and replaces as a unit.
        </p>
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
          <Link href="/guides/adult/shin-guard-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Shin guard fitting →
          </Link>
          <Link href="/guides/hockey-rules" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Rules 101 →
          </Link>
        </div>
      </section>
    </div>
  );
}
