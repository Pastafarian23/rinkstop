import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit a Hockey Helmet: A Guide for Adult Players',
  description: "How to fit a hockey helmet for adult players — HECC vs CSA certification, ASTM F1045 standards, the shake test, chin strap fit, and when to replace. Covers rec league requirements too.",
  openGraph: {
    title: 'How to Fit a Hockey Helmet (Adult Players)',
    description: "A guide for adult players on fitting a hockey helmet — HECC and CSA certification, the shake test, and when to replace.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult/helmet-fitting-guide' },
};

export default function HelmetFittingGuideAdult() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/adult" style={{ color: '#555' }}>Adult</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Helmet Fitting Guide</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT A HOCKEY HELMET
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        A guide for adult players. Covers HECC vs CSA certification by league, the shake test, the right position, chin strap tension, rec league requirements, and when to replace.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit a Hockey Helmet: A Guide for Adult Players | RinkStop',
        description: "HECC and CSA certification by league, the shake test, chin strap fit, and when to replace.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Do adult beer league players need an HECC-certified helmet?', acceptedAnswer: { '@type': 'Answer', text: 'Depends on the league. Leagues affiliated with USA Hockey require HECC certification. Independent adult leagues vary — some require it, some just require any hockey helmet. The safest move is to buy a HECC-certified helmet regardless of league rules, since the certification costs the same and you\'ll be compliant anywhere.' } },
          { '@type': 'Question', name: 'How do I know my helmet is still HECC certified?', acceptedAnswer: { '@type': 'Answer', text: 'Look for the HECC sticker on the back or inside of the helmet — it has a tamper-proof adhesive and a manufacture date. You can also search the manufacturer and model at hecc.org to confirm the helmet is in the certified product registry. If the helmet has a sticker but isn\'t in the registry, treat it as uncertified.' } },
          { '@type': 'Question', name: 'How tight should a hockey helmet be on an adult?', acceptedAnswer: { '@type': 'Answer', text: 'Snug, with the front edge one finger-width above the eyebrows. Shake your head firmly with the chin strap fastened — the helmet should not move. The chin strap should allow one finger between the strap and your chin. A loose strap is the #1 reason helmets fail during a fall or collision.' } },
          { '@type': 'Question', name: 'How long does an adult hockey helmet last?', acceptedAnswer: { '@type': 'Answer', text: '5-7 years, or less if you take a significant impact. Helmets are single-use safety devices — even if a hit doesn\'t crack the shell, the foam absorbs one major impact and is compromised afterward. Replace immediately after any hard head hit, and otherwise by the 7-year mark regardless of condition.' } },
        ],
      }) }} />

      {/* Certification by league */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>CERTIFICATION BY LEAGUE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          For adult players, the certification requirement depends on where you play. Most adult leagues fall into one of three buckets:
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { tier: 'USA Hockey sanctioned adult leagues', desc: 'Require an HECC-certified helmet and face mask. HECC certification means the helmet has been tested to ASTM F1045 (helmets) and ASTM F513 (face masks) by an independent lab. The HECC sticker is on the back or inside of the helmet.' },
            { tier: 'Hockey Canada sanctioned leagues', desc: 'Require a CSA-certified helmet (CAN/CSA Z262.1 standard). Look for the round blue and red tamper-proof label. CSA-certified helmets are typically accepted in USA Hockey leagues, but HECC-certified helmets are not accepted in Hockey Canada leagues — check before crossing the border for tournaments.' },
            { tier: 'Independent / pickup / open skate', desc: 'Rules vary. Some independent adult leagues require HECC or CSA, others accept any hockey helmet, others don\'t require a helmet at all. Open public skate typically has no helmet requirement, though wearing one is strongly recommended.' },
          ].map(t => (
            <div key={t.tier} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{t.tier}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{t.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          The safest move: buy HECC-certified regardless of your league&apos;s rules. The certification doesn&apos;t cost more, and you&apos;ll be legal to play in any league that requires it.
        </p>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Work through these five steps in order. If the helmet fails any of them, try a different size, a different shape, or a different brand.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { step: '1', title: 'Measure your head', desc: 'Wrap a soft tape measure around your head about 1 inch above the eyebrows — the widest part. Most adult heads run 21"-24". Use the measurement to find the right size on the manufacturer\'s chart.' },
            { step: '2', title: 'Position', desc: 'The front edge of the helmet should sit about one finger-width above the eyebrows. Not higher (exposes the forehead) and not lower (blocks vision).' },
            { step: '3', title: 'Shake test', desc: 'Fasten the chin strap. Shake your head firmly side-to-side and up-and-down. The helmet should NOT move. If it rocks, the size or shape is wrong.' },
            { step: '4', title: 'Cheek pads', desc: 'The cheek pads should touch your cheeks firmly with no gaps. Most helmets come with multiple cheek-pad thicknesses — swap them to fine-tune the fit.' },
            { step: '5', title: 'Chin strap', desc: 'Snug enough that you can fit only one finger between the strap and your chin. A loose strap is the #1 reason helmets fail during a fall or collision.' },
          ].map(s => (
            <div key={s.step} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.375rem' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Step {s.step}</p>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{s.title}</p>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sizing */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SIZING (ADULT)</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Senior Small', head: '20" – 22"' },
              { size: 'Senior Medium', head: '22" – 23"' },
              { size: 'Senior Large', head: '23" – 24"' },
              { size: 'Senior XL', head: '24" – 25"' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999', textAlign: 'right' }}>{row.head}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          These are general ranges. Every brand fits differently — Bauer tends to be rounder, CCM more elongated, True fits more like a baseball cap. Always use the manufacturer&apos;s chart and try before buying if possible. Many pro shops will let you try on multiple sizes.
        </p>
      </section>

      {/* When to replace */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO REPLACE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Replace the helmet in any of these situations:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• <strong style={{ color: '#fff' }}>Immediately after any significant impact</strong> — falls, pucks to the head, collisions. Even if the shell isn&apos;t cracked, the foam has absorbed energy and is compromised.</li>
          <li>• Every <strong style={{ color: '#fff' }}>5-7 years</strong> regardless of impact history.</li>
          <li>• If the inside foam is <strong style={{ color: '#fff' }}>crumbling</strong>, the chin strap is fraying, or the shell is cracked.</li>
          <li>• If the <strong style={{ color: '#fff' }}>HECC certification sticker</strong> is missing, illegible, or expired (check the manufacture date).</li>
        </ul>
      </section>

      {/* Used gear */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>USED HELMETS: NEVER</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Even for an adult on a tight budget, this is the one piece to never buy used. A used helmet may have invisible structural damage from impacts the previous owner didn&apos;t report (a forgotten practice collision, a hit they dismissed at the time). The foam degrades over time even without major hits. Buy a new helmet — they start around $80 for entry-level HECC-certified models and the safety margin is worth the cost.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/adult/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/hockey-rules" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Rules for Beginners →
          </Link>
          <Link href="/guides/skate-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Skate Fitting Guide →
          </Link>
        </div>
      </section>
    </div>
  );
}
