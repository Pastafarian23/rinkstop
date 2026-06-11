import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Pants (Breezers): A Parent\'s Guide',
  description: "How to fit hockey pants for your kid — waistband position, kidney pad coverage, thigh guard length, sizing, and when to size up.",
  openGraph: {
    title: 'How to Fit Hockey Pants',
    description: "A parent's guide to fitting hockey pants — waistband, kidney pad, thigh guard, sizing, and when to size up.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/hockey-pants-fitting-guide' },
};

export default function HockeyPantsFittingGuideYouth() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Pants Fitting Guide</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT HOCKEY PANTS (BREEZERS)
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        How to fit hockey pants for your kid. Covers waistband position, kidney pad coverage, thigh guard length, sizing by waist measurement, and when to size up.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "How to Fit Hockey Pants (Breezers): A Parent's Guide | RinkStop",
        description: "Waistband position, kidney pad coverage, thigh guard length, sizing, and when to size up.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How should hockey pants fit on a kid?', acceptedAnswer: { '@type': 'Answer', text: 'The waistband should sit at the natural waist — just above the hip bone. The kidney pad (the padded section on the lower back) should cover from the bottom of the ribs to the top of the hips, with the spine protected down the center. The thigh guards should extend from the bottom of the hip padding to just above the knee, with a small overlap with the shin guards. The pants should not bind in the crotch, slide down the waist, or ride up the back when the kid is in a hockey stance.' } },
          { '@type': 'Question', name: 'How do I size youth hockey pants?', acceptedAnswer: { '@type': 'Answer', text: 'Measure the waist circumference at the natural waist (just above the hip bone). Match the measurement to the manufacturer\'s youth chart. Hockey pants run large compared to street pants — a 24" waist kid typically wears Youth Small. If the kid is between sizes, size up: too-small pants will compress the waist when they skate.' } },
          { '@type': 'Question', name: 'Can my kid wear a girdle instead of hockey pants?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, though pants are more common in youth hockey. A girdle is a compression-fit base layer with padding sewn in at the hips, tailbone, thighs, and kidneys. Lighter, more mobile, and increasingly popular. Most kids do fine in either — try both to see which the kid prefers. The fit principles are the same: waistband at the natural waist, kidney pad coverage, thigh guard length.' } },
        ],
      }) }} />

      {/* What they protect */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT HOCKEY PANTS PROTECT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Hockey pants (also called breezers) protect the lower back, kidneys, hips, thighs, and tailbone. They sit at the natural waist and extend down to the top of the shin guards. The kidney pad on the back is the most important piece — a puck to the lower back is the most common serious-impact injury in hockey.
        </p>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Work through these checks. The pants fail if any of them don&apos;t pass.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Waistband: the waistband should sit at the natural waist — just above the hip bone. If the pants are too big, the waistband sags toward the hips. If too small, they dig into the stomach when the kid bends.',
            'Kidney pad: the padded section on the lower back should cover from the bottom of the ribs to the top of the hips, with the spine protected down the center.',
            'Thigh guards: extend from the bottom of the hip padding to just above the knee. There should be a small overlap with the top of the shin guards — no skin showing when the kid is in a stride.',
            'Stance test: have the kid get into a hockey stance. The pants should not bind in the crotch, slide down the waist, or ride up the back.',
            'Movement test: have the kid skate a few strides. The pants should not shift or slide. If they do, tighten the waist belt or the lace at the back.',
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
          Measure the waist circumference at the natural waist (just above the hip bone). Match the measurement to the manufacturer&apos;s youth chart. Hockey pants run large — a 24-inch kid typically wears Youth Small.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Youth XS', waist: '20" – 22"', age: '5-7' },
              { size: 'Youth Small', waist: '22" – 24"', age: '7-9' },
              { size: 'Youth Medium', waist: '24" – 26"', age: '9-11' },
              { size: 'Youth Large', waist: '26" – 28"', age: '11-13' },
              { size: 'Youth XL / Junior', waist: '28" – 30"', age: '13+' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.waist}</p>
                <p style={{ fontSize: '0.8125rem', color: '#777', textAlign: 'right' }}>Ages {row.age}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          <strong style={{ color: '#ccc' }}>Note on belts and laces:</strong> most youth hockey pants have an internal belt or a back lace for fine-tuning the waist. If the kid is between sizes, drop down a size and tighten the belt to fit — this gives a slightly narrower leg for skating.
        </p>
      </section>

      {/* When to size up */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO SIZE UP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Size up when the waistband sags toward the hips even with the belt fully tightened, the kidney pad no longer covers from the ribs to the hips, or the kid has visibly grown between seasons. Most parents replace pants every 2 seasons for kids 8-13.
        </p>
      </section>

      {/* Used gear */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>USED HOCKEY PANTS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Pants are one of the safest pieces of equipment to buy used. Check that the plastic thigh guards aren&apos;t cracked, the foam is firm (not crumbling), the belt or lace is functional, and the kidney pad is intact. The main concern is fit — youth sizes are specific to the kid&apos;s waist measurement, so a used pair only works if it actually fits the player.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/youth/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/youth/shin-guard-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Shin guard fitting →
          </Link>
          <Link href="/guides/youth/jock-jill-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Jock / Jill fitting →
          </Link>
          <Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Parent&apos;s Handbook →
          </Link>
        </div>
      </section>
    </div>
  );
}
