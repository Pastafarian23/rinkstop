import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Pants or a Girdle: A Guide for Adult Players',
  description: "How to fit hockey pants or a girdle for adult players — pants vs girdle comparison, waistband position, kidney pad coverage, women-specific fit, and when to upgrade.",
  openGraph: {
    title: 'How to Fit Hockey Pants or a Girdle (Adults)',
    description: "A guide for adult players — pants vs girdle, fit, women-specific considerations, and when to upgrade.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult/hockey-pants-fitting-guide' },
};

export default function HockeyPantsFittingGuideAdult() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/adult" style={{ color: '#555' }}>Adult</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Pants Fitting Guide</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT HOCKEY PANTS OR A GIRDLE
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        For adult players. Covers pants vs girdle, waistband position, kidney pad coverage, women-specific fit (roomier hips, shorter torso), sizing, and when to upgrade.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit Hockey Pants or a Girdle: A Guide for Adult Players',
        description: "Pants vs girdle, fit, women-specific considerations, and when to upgrade.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Should I wear hockey pants or a girdle?', acceptedAnswer: { '@type': 'Answer', text: 'Depends on your priorities. Pants are the traditional choice — more protective, easier to put on, preferred by most adult players. A girdle is a compression-fit base layer with padding sewn in at the hips, tailbone, thighs, and kidneys. Lighter, more mobile, and preferred by players who want a low-profile feel. Most adult players try both and decide based on comfort. New adult players are usually best served by pants — easier to fit and more forgiving on sizing.' } },
          { '@type': 'Question', name: 'How do adult hockey pants fit differently for women?', acceptedAnswer: { '@type': 'Answer', text: 'Women-specific pants are cut roomier through the hips and shorter in the torso to match a female silhouette. Standard male pants often gap at the waist on women, slide down during play, and leave the lower back exposed. If women-specific pants aren\'t available in your size, look for pants with adjustable waist belts or a girdle (the compression fit adapts to a wider hip-to-waist ratio more easily than traditional pants).' } },
          { '@type': 'Question', name: 'How should adult hockey pants fit?', acceptedAnswer: { '@type': 'Answer', text: 'The waistband should sit at the natural waist — just above the hip bone. The kidney pad (the padded section on the lower back) should cover from the bottom of the ribs to the top of the hips, with the spine protected down the center. The thigh guards should extend from the bottom of the hip padding to just above the knee, with a small overlap with the shin guards. The pants should not bind in the crotch, slide down the waist, or ride up the back when you are in a hockey stance.' } },
        ],
      }) }} />

      {/* Pants vs Girdle */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>PANTS VS. GIRDLE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          For adult players, you have two choices for lower-body protection. The fit principles are the same; the feel and protection profile differ.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Hockey pants (breezers)</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>Padded shorts with a tall waist, integrated kidney protection, and large thigh guards. Easier to put on and take off. More protective, especially for blocking shots. The default for most adult players and the safer choice for new players.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Hockey girdle</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>A compression-fit base layer with padding sewn in at the hips, tailbone, thighs, and kidneys. Lighter, more mobile, lower profile. Preferred by players who want to feel fast — common among college and pro players, increasingly popular in adult leagues. Better for women and players with a wider hip-to-waist ratio.</p>
          </div>
        </div>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST (BOTH)</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Same checks apply to both pants and girdles.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            'Waistband sits at the natural waist — just above the hip bone. If the pants/girdle are too big, the waistband sags toward the hips. If too small, it digs into the stomach when you bend.',
            'Kidney pad covers from the bottom of the ribs to the top of the hips, with the spine protected down the center.',
            'Thigh guards extend from the bottom of the hip padding to just above the knee, with a small overlap with the shin guards.',
            'Stance test: get into a hockey stance. The pants/girdle should not bind in the crotch, slide down the waist, or ride up the back.',
            'Movement test: skate a few strides. The pants/girdle should not shift or slide. If they do, tighten the belt or back lace.',
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
          Measure waist circumference at the natural waist (just above the hip bone). Match the measurement to the brand-specific chart. Hockey pants run large compared to street pants — a 32-inch adult waist typically wears a Senior Medium.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Junior Medium', waist: '28" – 30"', note: 'Common for women and smaller adults' },
              { size: 'Junior Large', waist: '30" – 32"', note: 'Common for women' },
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
          <strong style={{ color: '#ccc' }}>For women:</strong> junior pants often fit better than senior pants. Senior pants are designed for male hip geometry; on women, they gap at the waist and slide down. If women-specific pants aren&apos;t available in your size, junior pants or a girdle (the compression fit adapts more easily) are the next-best options.
        </p>
      </section>

      {/* When to upgrade */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO UPGRADE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Hockey pants and girdles don&apos;t have a hard "replace by" date. Most adult players replace them every 3-5 years, or sooner if:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The foam has compressed and the padding feels noticeably thinner than when new.</li>
          <li>• The plastic thigh guards are cracked.</li>
          <li>• The belt or back lace no longer holds the pants snugly.</li>
          <li>• You&apos;re moving up a competitive level and want more protection (higher-end pants add segmented foam, more kidney coverage, and better articulation).</li>
        </ul>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/adult/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/adult/shin-guard-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Shin guard fitting →
          </Link>
          <Link href="/guides/adult/jock-jill-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Jock / Jill fitting →
          </Link>
          <Link href="/guides/hockey-positions" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Understanding Positions →
          </Link>
        </div>
      </section>
    </div>
  );
}
