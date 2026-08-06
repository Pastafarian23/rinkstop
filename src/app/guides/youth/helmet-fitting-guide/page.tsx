import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit a Hockey Helmet: A Parent\'s Guide',
  description: "How to fit a hockey helmet for your kid — HECC certification, ASTM F1045 standards, position, shake test, when to replace, and how to verify the helmet is still certified online.",
  openGraph: {
    title: 'How to Fit a Hockey Helmet',
    description: "A parent's guide to fitting a hockey helmet — HECC certification, the shake test, sizing, and when to replace.",
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/helmet-fitting-guide' },
};

export default function HelmetFittingGuideYouth() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
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
        The single most important piece of equipment your kid wears. Covers HECC certification, ASTM standards, the shake test, the right position on the head, chin strap tension, and when to replace.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "How to Fit a Hockey Helmet: A Parent's Guide",
        description: "HECC certification, ASTM F1045 standards, the shake test, chin strap fit, and when to replace a youth hockey helmet.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How do I know if a hockey helmet fits my kid?', acceptedAnswer: { '@type': 'Answer', text: 'A proper-fitting helmet sits about one finger-width above the eyebrows, does not move when the kid shakes their head, has no gaps between the cheek pads and the cheeks, and the chin strap is snug with room for one finger under the chin. If the helmet rocks in any direction, the size or shape is wrong.' } },
          { '@type': 'Question', name: 'How often should you replace a youth hockey helmet?', acceptedAnswer: { '@type': 'Answer', text: 'Replace immediately after any significant impact. Otherwise, replace every 5-7 years, or sooner if the inside foam is crumbling, the shell is cracked, the chin strap is fraying, or the kid has outgrown the size. Helmets are single-use safety devices — even if a hit doesn\'t crack the shell, the foam absorbs one major impact and is compromised afterward.' } },
          { '@type': 'Question', name: 'Can my kid use a used hockey helmet?', acceptedAnswer: { '@type': 'Answer', text: 'No. Always buy hockey helmets new. Used helmets may have invisible structural damage from impacts the previous owner didn\'t report, and the foam degrades over time even without major hits. The certification sticker may also be expired or removed. This is the one piece of equipment you should never buy used.' } },
          { '@type': 'Question', name: 'What is HECC certification on a hockey helmet?', acceptedAnswer: { '@type': 'Answer', text: 'HECC (Hockey Equipment Certification Council) is the independent body that certifies hockey helmets for use in USA Hockey sanctioned play. A HECC-certified helmet has been tested by an accredited lab to ASTM F1045 (helmet coverage and impact) and ASTM F513 (face mask) standards. Look for the HECC sticker on the back or inside of the helmet. You can verify a helmet is still certified at hecc.org.' } },
        ],
      }) }} />

      {/* Why it matters */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHY THE HELMET IS NON-NEGOTIABLE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The helmet is the single most important piece of equipment your kid wears. A properly fitted, certified helmet is the biggest factor in preventing head injuries — including concussions. The other pieces of equipment (shoulder pads, shin guards, etc.) protect against impact. The helmet protects the brain. Get this one right above all else.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Two things have to be true: the helmet has to be <strong style={{ color: '#fff' }}>certified</strong> (not every helmet is legal for play), and it has to <strong style={{ color: '#fff' }}>fit</strong> (a certified helmet that doesn&apos;t fit doesn&apos;t protect).
        </p>
      </section>

      {/* Certification */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>CERTIFICATION: HECC, ASTM, AND CSA</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          In the U.S., every helmet worn in USA Hockey sanctioned play (which includes most youth leagues, high school hockey, and college hockey) must carry an <strong style={{ color: '#fff' }}>HECC certification sticker</strong>. HECC certification means the helmet has been independently tested to:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• <strong style={{ color: '#fff' }}>ASTM F1045</strong> — Standard Performance Specification for Ice Hockey Helmets. Tests coverage (what areas of the head the helmet must protect), shock absorption, and retention system strength.</li>
          <li>• <strong style={{ color: '#fff' }}>ASTM F513</strong> — Standard Safety Specification for Eye and Face Protective Equipment. Tests full face masks for stick-blade penetration, impact resistance, and field of vision.</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          In Canada, the equivalent is <strong style={{ color: '#fff' }}>CSA Z262.1</strong> — look for the round blue and red tamper-proof label. Half visors use the <strong style={{ color: '#fff' }}>CAN/CSA Z262.2</strong> standard.
        </p>
        <div style={{ background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>Verify online</p>
          <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>
            You can confirm a helmet is still certified by searching the manufacturer and model at <a href="https://hecc.org" style={{ color: '#C8102E' }}>hecc.org</a> (US) or <a href="https://www.csagroup.org" style={{ color: '#C8102E' }}>csagroup.org</a> (Canada). If the helmet has a sticker but doesn&apos;t appear in the registry, treat it as uncertified.
          </p>
        </div>
      </section>

      {/* The fit test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE FIT TEST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Work through these five steps in order. If the helmet fails any of them, try a different size, a different shape, or a different brand.
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { step: '1', title: 'Measure the head', desc: 'Wrap a soft tape measure around the head about 1 inch above the eyebrows — the widest part of the head. Use the measurement to find the right size on the manufacturer\'s chart.' },
            { step: '2', title: 'Position', desc: 'The front edge of the helmet should sit about one finger-width above the eyebrows. Not higher (it exposes the forehead to impact) and not lower (it blocks vision).' },
            { step: '3', title: 'Shake test', desc: 'Fasten the chin strap. Have the kid shake their head firmly side-to-side and up-and-down. The helmet should NOT move. If it rocks or shifts, the size or shape is wrong.' },
            { step: '4', title: 'Cheek pads', desc: 'The cheek pads should touch the cheeks firmly with no gaps. If you can see daylight between the pad and the cheek, swap in thicker pads (most helmets come with multiple thicknesses).' },
            { step: '5', title: 'Chin strap', desc: 'Snug enough that you can fit only one finger between the strap and the chin. A loose strap is the #1 reason helmets fail to protect during a fall or hit.' },
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
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SIZING (YOUTH)</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { size: 'Youth XS', head: '19" – 20"', age: '5-7' },
              { size: 'Youth Small', head: '20" – 21"', age: '7-9' },
              { size: 'Youth Medium', head: '21" – 22"', age: '9-12' },
              { size: 'Youth Large / Junior', head: '22" – 23"', age: '12+' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', fontWeight: 600 }}>{row.size}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row.head}</p>
                <p style={{ fontSize: '0.8125rem', color: '#777', textAlign: 'right' }}>Ages {row.age}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          These are general ranges. Every brand fits differently — Bauer tends to be rounder, CCM tends to be more elongated, True fits more like a baseball cap. Always use the manufacturer&apos;s chart and, ideally, try the helmet on the kid before buying.
        </p>
      </section>

      {/* When to replace */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO REPLACE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Replace the helmet in any of these situations:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• <strong style={{ color: '#fff' }}>Immediately after any significant impact</strong> — falls onto concrete, pucks to the head, collisions with the boards. Even if the shell isn&apos;t cracked, the foam has absorbed energy and is compromised.</li>
          <li>• Every <strong style={{ color: '#fff' }}>5-7 years</strong> regardless of impact history. The foam degrades over time.</li>
          <li>• If the <strong style={{ color: '#fff' }}>manufacture date</strong> on the certification sticker is more than 7 years old.</li>
          <li>• If the inside foam is <strong style={{ color: '#fff' }}>crumbling</strong>, the chin strap is fraying, or the shell is cracked.</li>
          <li>• If the kid has <strong style={{ color: '#fff' }}>outgrown the size</strong> — the helmet rocks or doesn&apos;t sit at the right height on the forehead.</li>
        </ul>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/youth/how-to-fit-hockey-equipment" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Full equipment fit guide →
          </Link>
          <Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Parent&apos;s Handbook →
          </Link>
          <Link href="/guides/youth/house-vs-travel-hockey" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            House vs Travel Hockey →
          </Link>
        </div>
      </section>
    </div>
  );
}
