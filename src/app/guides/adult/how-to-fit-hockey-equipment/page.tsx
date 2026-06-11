import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Equipment: A Guide for Adult Players',
  description: 'How to fit every piece of hockey equipment for adult players — helmet (HECC/CSA), shoulder pads, elbow pads, shin guards, pants vs. girdle, gloves, jock/jill. Includes a section on women-specific gear.',
  openGraph: {
    title: 'How to Fit Hockey Equipment for Adult Players',
    description: 'A complete adult-player guide to fitting hockey equipment — every piece, with a women-specific section.',
    type: 'article',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult/how-to-fit-hockey-equipment' },
};

export default function HowToFitHockeyEquipmentAdult() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/adult" style={{ color: '#555' }}>Adult</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>How to Fit Hockey Equipment</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Adult Players
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT HOCKEY EQUIPMENT
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        A guide for adult players. Covers every piece of equipment — helmet, shoulder pads, elbow pads, pants vs. girdle, shin guards, gloves, jock/jill — with the fit test, what to measure, and a dedicated section on women-specific gear.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit Hockey Equipment: A Guide for Adult Players | RinkStop',
        description: 'How to fit every piece of hockey equipment for adult players, including women-specific gear considerations.',
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How is adult hockey gear sizing different from kids\u2019 gear?', acceptedAnswer: { '@type': 'Answer', text: 'Adult gear uses a full range of S/M/L/XL sizes (and sometimes 2XL), measured by chest, waist, and height. Youth gear is typically sized by age or a single number (e.g., 8", 9", 10" for shin guards). Adult gear also offers more cut options (tapered, classic, roomy) and more position-specific designs. Most adult men wear Senior sizes, while women and smaller players often fit better in Junior or Intermediate sizes.' } },
          { '@type': 'Question', name: 'Can adults use youth or junior hockey equipment?', acceptedAnswer: { '@type': 'Answer', text: 'Sometimes, but it depends on the piece and the player. Many adult women and smaller-framed adult men wear Junior or Intermediate shoulder pads, gloves, and pants because Senior sizes are too bulky. Skates are commonly bought in Junior sizes for adults with smaller feet. Helmets should always be sized for the head circumference — age or gender doesn\'t matter, the measurement does. Other pieces (shin guards, elbow pads) are usually fine in Senior size for most adult players.' } },
          { '@type': 'Question', name: 'What is the difference between hockey pants and a girdle?', acceptedAnswer: { '@type': 'Answer', text: 'Hockey pants are the traditional choice — they look like padded shorts with a tall waist, kidney protection, and integrated thigh guards. A girdle is a compression-fit base layer with padding sewn in (hips, tailbone, thighs, kidneys). Girdles are more mobile, lighter, and preferred by players who want a low-profile feel. Pants are more protective and easier to put on/take off. Most adult players try both before deciding.' } },
          { '@type': 'Question', name: 'What hockey gear is different for women?', acceptedAnswer: { '@type': 'Answer', text: 'Several pieces have meaningful women-specific designs. Shoulder pads have molded chest cups to fit female anatomy and narrower shoulder caps. Hockey pants have roomier hips and shorter torsos. The jill (women\'s pelvic protector) has different protective geometry than a jock — it covers the lower abdomen and pelvic floor with a wider, more contoured shield. Women often wear Junior or Intermediate gloves and pants even at senior skill levels because the fit is better.' } },
          { '@type': 'Question', name: 'Is it safe to buy used hockey equipment as an adult?', acceptedAnswer: { '@type': 'Answer', text: 'Some pieces yes, some no. Helmets and mouthguards should always be bought new. Shoulder pads, elbow pads, shin guards, pants, and gloves are commonly bought used — check that all plastic is intact, foam is firm (not crumbling), and straps are functional. Skates should be bought new because they mold to the previous wearer\'s foot. Used gear is a great way for a new adult player to try the sport without a major upfront investment — start with used shoulder pads, pants, shin guards, and gloves, then buy new for the helmet and skates.' } },
        ],
      }) }} />

      {/* Intro */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ADULT GEAR FIT IS DIFFERENT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          If you played as a kid, you probably don&apos;t remember what your gear felt like. Adult equipment is sized differently, has more options, and the fit principles are slightly different because your body has changed.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Three things make adult gear fit different from youth:
        </p>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { title: 'You\'re not growing anymore.', desc: 'Buy gear that fits today, not gear you\'ll grow into. A slightly-too-big piece is a safety hazard for adults too — it shifts, gaps, and exposes what it should protect.' },
            { title: 'You have body shape to work with.', desc: 'Adult gear comes in tapered, classic, and roomy cuts. A 5\'8" adult with a 32" waist and 44" chest has different needs than a 5\'8" adult with a 38" waist and 42" chest. The right cut matters as much as the right size.' },
            { title: 'You have more choices.', desc: 'Senior, intermediate, and junior sizes often overlap for adults. Many adult women and smaller-framed adult men wear intermediate or junior gear for a better fit. The piece that fits you is the right piece, regardless of the size label.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{item.title}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Helmet */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HELMET + CAGE / VISOR</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          For adult players, the certification requirement depends on where you play:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• <strong style={{ color: '#fff' }}>USA Hockey sanctioned play</strong> (including most adult leagues affiliated with USA Hockey) requires an HECC-certified helmet and face mask. HECC certification means the helmet has been tested to ASTM F1045 (helmets) and ASTM F513 (face masks) standards.</li>
          <li>• <strong style={{ color: '#fff' }}>Hockey Canada sanctioned play</strong> requires a CSA-certified helmet (CAN/CSA Z262.1 standard) — look for the round blue and red tamper-proof label.</li>
          <li>• <strong style={{ color: '#fff' }}>Independent adult leagues</strong> vary. Some require HECC or CSA, some accept any hockey helmet. Check with your league before buying.</li>
          <li>• <strong style={{ color: '#fff' }}>Open skate / recreational</strong> — no certification is legally required, but a certified helmet is strongly recommended.</li>
        </ul>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          You can verify a helmet is still certified at hecc.org or csagroup.org by searching the manufacturer and model.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit it</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'Measure your head: wrap a soft tape measure around the head about 1 inch above the eyebrows — the widest part. Most adult heads run 21"-24" circumference.',
              'Position: the front edge should sit about a finger-width above the eyebrows. Not higher, not lower.',
              'Shake test: with the chin strap fastened, shake your head firmly. The helmet should not move at all. If it rocks, the size or shape is wrong.',
              'Cheek pads should touch the cheeks with no gaps. Most helmets come with multiple cheek-pad thicknesses — swap them to fine-tune the fit.',
              'Chin strap: snug, with room for only one finger between the strap and your chin.',
              'Cage or visor: cage should sit a finger-width off the nose and not touch the chin. Visors must be HECC-certified (CAN/CSA Z262.2 standard for half visors).',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>{i + 1}</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shoulder Pads */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SHOULDER PADS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Adult shoulder pads come in three fits: <strong style={{ color: '#fff' }}>tapered</strong> (narrow through the chest and waist — the modern fit most NHL players use), <strong style={{ color: '#fff' }}>classic</strong> (a roomier, traditional fit), and <strong style={{ color: '#fff' }}>loose/relaxed</strong> (for goalies and players who want maximum mobility).
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'The shoulder caps should sit directly on top of the shoulders — not hanging off, not riding up the neck.',
              'The chest plate should cover the sternum and the upper chest. The bicep guards should run about halfway down the upper arm.',
              'Raise your stick above your head. The shoulder caps should move with you — no gap should open up between the cap and the deltoid.',
              'There should be a 1-2 finger gap between the inside of the neck opening and your throat. Less and you\'re choking; more and the pads are too big.',
              'The spine protector should cover the shoulder blades and extend down to the mid-back.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure chest circumference at the widest point. Senior sizes run S, M, L, XL (some brands go to XXL). Many adult women and smaller-framed men fit best in Junior or Intermediate sizes, which run narrower and shorter. If you&apos;re between sizes, size up — shoulder pads compress the chest on impact, and a too-small pad will limit your breathing.
        </p>
      </section>

      {/* Elbow Pads */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ELBOW PADS</h2>
        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'The elbow cup should sit centered on the elbow joint. If it drifts up the tricep or down the forearm, the pad is too big.',
              'Bend the arm to 90 degrees. The cup should still be centered on the elbow — no sliding to one side.',
              'The forearm guard should extend from just below the elbow to about 2 inches above the cuff of the glove, with no gap between them.',
              'Tighten the upper strap first, then the lower. Snug but not cutting off circulation.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure from the center of the back of the elbow to the wrist. Senior sizes run 11&quot;-14&quot;, intermediate 10&quot;-11&quot;, junior 9&quot;-10&quot;.
        </p>
      </section>

      {/* Pants vs. Girdle */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>PANTS VS. GIRDLE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Adult players have two choices for lower-body protection:
        </p>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>Hockey pants (breezers)</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>The traditional choice. Padded shorts with a tall waist, integrated kidney protection in the back, and large thigh guards. Easier to put on and take off. More protective, especially for blocking shots. The default for most adult players.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>Hockey girdle</p>
            <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>A compression-fit base layer with padding sewn in at the hips, tailbone, thighs, and kidneys. Lighter, more mobile, lower profile. Preferred by players who want to feel fast — common among college and pro players, increasingly popular in adult leagues.</p>
          </div>
        </div>
        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Fit (for both)</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'The waistband should sit at the natural waist — just above the hip bone. If too big, the waistband sags toward the hips. If too small, it digs into the stomach when you bend.',
              'The kidney pad should cover from the bottom of the ribs to the top of the hips, with the spine protected down the center.',
              'The thigh guards should extend from the bottom of the hip padding to just above the knee, with a small overlap with the shin guards.',
              'Get into a hockey stance. The pants or girdle should not bind in the crotch, slide down the waist, or ride up the back.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem', marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure waist circumference at the natural waist. Match to the brand-specific chart. Hockey pants run large compared to street pants — a 32-inch adult waist typically wears a Senior Medium.
        </p>
      </section>

      {/* Shin Guards */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SHIN GUARDS</h2>
        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'The knee cup should sit centered on the kneecap. If the cup drifts above or below the knee when you skate, the size is wrong.',
              'The shin section should run from just below the knee to the top of the skate tongue. There should be NO gap between the bottom of the shin guard and the top of the skate — a puck through that gap will find the leg.',
              'The thigh guard should extend at least halfway up the thigh and tuck under the bottom of the pants or girdle.',
              'Straps should be snug enough that the shin guard doesn\'t slide down when you skate, but not so tight they cut off circulation.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure from the center of the kneecap straight down to the top of the skate, then add about 1 inch. Senior sizes run 14&quot;-17&quot;, intermediate 12&quot;-14&quot;, junior 10&quot;-12&quot;.
        </p>
      </section>

      {/* Gloves */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GLOVES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          For adult players, glove fit is the most personal piece of equipment. A glove that&apos;s too big makes the stick feel like a broom handle. A glove that&apos;s too small cramps the hand and makes it hard to grip the stick.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'Open the hand fully. The palm material should be taut across the palm — no loose folds, no extra material bunching up.',
              'Fingertips should just reach the end of the glove, with about a quarter-inch of space. Less and the fingers are crowded; more and the stick slips.',
              'The cuff should overlap the elbow pad by 1-2 inches. No gap of skin between glove and pad.',
              'Squeeze a stick. You should be able to feel the tape through the glove. If you can\'t, the padding is too thick for your hand size.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure from the base of the palm to the tip of the middle finger. Senior gloves run 13&quot;-15&quot;, intermediate 12&quot;-13&quot;, junior 11&quot;-12&quot;. Many adult women and smaller-framed men prefer a 12&quot; or 13&quot; intermediate or junior glove for better stick feel.
        </p>
      </section>

      {/* Jock / Jill */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>JOCK / JILL + BASE LAYER</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Most adult players wear an integrated compression short with a built-in cup (jock) or pelvic shield (jill). The traditional separate jock + garter belt is still used but less common.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit it</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'Measure waist circumference just above the hips. Match to the brand-specific sizing chart — Bauer, CCM, and Shock Doctor all size differently.',
              'The waistband should sit at the natural waist comfortably — not digging in, not sagging.',
              'The cup or pelvic shield should fully cover the pelvic area with no gaps in coverage.',
              'The compression short should be tight enough to hold the padding in place during play but not restrict breathing.',
              'Sock tabs (Velcro tabs inside the leg openings) hold your hockey socks up. If the shorts don\'t have tabs, the socks will fall down.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Women-Specific Section */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WOMEN-SPECIFIC GEAR</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Women&apos;s hockey equipment has improved dramatically in the last decade. Several pieces are now made specifically for female anatomy, and the fit differences are meaningful — not cosmetic.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            {
              piece: 'Shoulder pads',
              desc: 'Women-specific shoulder pads have molded chest cups that contour to female anatomy, preventing the gapping and pressure points that come from wearing a male-pattern pad. The shoulder caps are typically narrower. Brands that make women-specific shoulder pads include Bauer (women\'s Supreme and Vapor lines) and CCM (women\'s Tacks and Jetspeed lines).'
            },
            {
              piece: 'Hockey pants',
              desc: 'Women\'s pants are cut roomier through the hips and shorter in the torso to match a female silhouette. Standard male pants often gap at the waist on women, slide down during play, and leave the lower back exposed. If women-specific pants aren\'t available in your size, look for pants with adjustable waist belts or consider a girdle (the compression fit adapts to a wider hip-to-waist ratio more easily).'
            },
            {
              piece: 'Jill (pelvic protector)',
              desc: 'A jill is not a jock with the cup removed. The protective geometry is different. A jill covers the lower abdomen and pelvic floor with a contoured shield designed for wider hip geometry. Leading options include the Bauer Women\'s Jill, Sher-Wood Women\'s Pelvic Protector, and McDavid women\'s models. Size by hip measurement using the brand-specific chart, not the size label.'
            },
            {
              piece: 'Gloves',
              desc: 'Many women wear junior or intermediate gloves (12"-13") even at senior skill levels. The narrower hand pattern and shorter fingers provide a better fit than most senior gloves. Some brands now offer women-specific gloves with narrower palms and shorter fingers — Bauer and CCM both have women\'s glove lines.'
            },
            {
              piece: 'Skates',
              desc: 'Skates are generally unisex in design, but women often have a higher instep or narrower heel than men. Aftermarket insoles and a professional fitting at a hockey shop are the best ways to address this. Bauer, CCM, and True all make women\'s-specific skate lines, but the more important factor is fit, not branding.'
            },
            {
              piece: 'Chest protector (optional)',
              desc: 'Most adult women don\'t wear a chest protector unless they play goalie. If you do — for example, in pickup games with slap-shot-heavy players — a women-specific chest protector (or a sports bra with built-in padding) provides better coverage than a male-pattern pad.'
            },
          ].map(item => (
            <div key={item.piece} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{item.piece}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem' }}>
          A practical note: women-specific gear is improving but still has a smaller selection than men&apos;s. You may need to try several brands and models before finding the right fit. Read reviews from women specifically, not general product reviews — the fit feedback from male reviewers won&apos;t tell you what you need to know.
        </p>
      </section>

      {/* Rec vs Competitive */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>REC LEAGUE VS. COMPETITIVE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The level you play affects what gear you need. Most adult players fall into three categories:
        </p>

        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { tier: 'Beer league / pickup', desc: 'You\'re playing for fun and exercise. The gear requirements are usually minimal — most leagues require a helmet (often HECC/CSA certified), and many require a half visor or cage. Mid-range gear in good condition is fine. Many adult players start here.' },
            { tier: 'Adult league (B / C / D levels)', desc: 'More competitive. Slap shots, body contact (in some leagues), and longer seasons. Mid to high-end gear is worth the investment. Many players in this tier start replacing their mid-range gear with higher-end models for the protection and durability.' },
            { tier: 'Adult league (A / AA / AAA levels)', desc: 'Highly competitive, often with ex-college and ex-junior players. High-end gear is expected. Players at this level typically have custom-fitted skates, multiple stick options, and replace gear more frequently.' },
          ].map(t => (
            <div key={t.tier} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{t.tier}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Fit guides for each piece of equipment</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <Link href="/guides/adult/helmet-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Helmet →
          </Link>
          <Link href="/guides/adult/shoulder-pad-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Shoulder pads →
          </Link>
          <Link href="/guides/adult/elbow-pad-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Elbow pads →
          </Link>
          <Link href="/guides/adult/hockey-pants-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Pants or girdle →
          </Link>
          <Link href="/guides/adult/shin-guard-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Shin guards →
          </Link>
          <Link href="/guides/adult/hockey-glove-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Gloves →
          </Link>
          <Link href="/guides/adult/jock-jill-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Jock / Jill →
          </Link>
        </div>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/skate-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Skate Fitting Guide →
          </Link>
          <Link href="/guides/hockey-stick-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            How to Choose the Right Stick →
          </Link>
          <Link href="/guides/hockey-rules" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Rules Explained →
          </Link>
          <Link href="/guides/hockey-positions" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Understanding Hockey Positions →
          </Link>
        </div>
      </section>
    </div>
  );
}
