import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Fit Hockey Equipment: A Complete Guide for Parents | RinkStop',
  description: "How to fit every piece of hockey equipment for kids — helmet (HECC certified), shoulder pads, elbow pads, shin guards, pants, gloves, jock/jill, and mouthguard. Includes fit checks, sizing, and when to size up.",
  openGraph: {
    title: 'How to Fit Hockey Equipment | RinkStop',
    description: "A parent's complete guide to fitting hockey equipment — fit tests for every piece, sizing, and when to size up.",
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/how-to-fit-hockey-equipment' },
};

export default function HowToFitHockeyEquipmentYouth() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>How to Fit Hockey Equipment</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Parents
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO FIT HOCKEY EQUIPMENT
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        A complete guide for parents. Covers every piece of equipment — helmet, shoulder pads, elbow pads, shin guards, pants, gloves, jock/jill, and mouthguard — with the fit test, what to measure, and when to size up.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Fit Hockey Equipment: A Complete Guide for Parents | RinkStop',
        description: "How to fit every piece of hockey equipment for kids — helmet, shoulder pads, elbow pads, shin guards, pants, gloves, jock/jill, mouthguard.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How do I know if a hockey helmet fits my kid?', acceptedAnswer: { '@type': 'Answer', text: 'A proper-fitting helmet sits about a finger-width above the eyebrows (not higher, not lower), does not move when the kid shakes their head, has no gap between the cheek pads and the cheeks, and the chin strap is snug with room for one finger under the chin. If the helmet rocks side-to-side or front-to-back, the size is wrong.' } },
          { '@type': 'Question', name: 'How tight should hockey gloves be?', acceptedAnswer: { '@type': 'Answer', text: 'Hockey gloves should fit snug with no extra space at the fingertips — fingertips should just reach the end of the glove. A simple test: open the hand fully. The palm material should be taut across the palm with no loose folds. There should be roughly a quarter-inch of space between the fingers and the end of the glove. Too loose and the player loses stick feel; too tight and the hands cramp.' } },
          { '@type': 'Question', name: 'When should I size up hockey equipment?', acceptedAnswer: { '@type': 'Answer', text: 'Replace or size up when (1) the piece visibly constricts movement, (2) coverage gaps appear during normal play, (3) your kid regularly complains of pain, (4) the helmet rocks on the head, or (5) the season has ended and the kid has clearly grown. Most parents size up between seasons rather than mid-season unless the fit becomes a safety issue.' } },
          { '@type': 'Question', name: 'Is it safe to buy used hockey equipment?', acceptedAnswer: { '@type': 'Answer', text: 'Some used equipment is fine; some is not. Helmets and mouthguards should always be bought new — used helmets may have invisible structural damage from impacts, and the foam degrades over time. Shoulder pads, elbow pads, shin guards, pants, and gloves are commonly bought used and are safe if the plastic is intact, the foam is in good shape, and the straps still hold. Skates should also be bought new because they mold to the previous wearer\'s foot.' } },
          { '@type': 'Question', name: 'What is the most important piece of hockey equipment to fit properly?', acceptedAnswer: { '@type': 'Answer', text: 'The helmet, by a wide margin. A properly fitted HECC-certified helmet is the single biggest factor in preventing head injuries. The second most important is the jock or jill (pelvic protection). Beyond safety, properly fitted skates and shin guards are the biggest factors in player comfort and long-term development.' } },
        ],
      }) }} />

      {/* Intro */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHY FIT MATTERS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Hockey equipment is sized to fail. A shoulder pad that doesn&apos;t cover the collarbone doesn&apos;t protect the collarbone. A helmet that rocks on the head doesn&apos;t protect the brain. Shin guards that don&apos;t reach the top of the skate let a puck straight up the leg. Most youth hockey injuries from equipment aren&apos;t caused by the wrong brand — they&apos;re caused by the wrong size.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          On the other side, oversized gear is a problem too. A glove that&apos;s too big makes it impossible to feel the stick. Shoulder pads that hang off the shoulders block arm movement. Pants that gap at the waist slide down and expose the lower back. The right fit is the one that&apos;s snug enough to stay in place, but loose enough to allow full mobility.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          The rest of this guide walks through every piece of equipment, the fit test for each, what to measure, and the most common mistakes parents make.
        </p>
      </section>

      {/* The Universal Fit Tests */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE UNIVERSAL FIT TESTS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Three tests work for almost every piece of equipment. If a piece fails any of them, it doesn&apos;t fit.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'The Shake Test', desc: 'Have the kid put on the piece and shake their head, jump, or mimic a skating stride. If the equipment shifts visibly, it\'s too loose.' },
            { name: 'The Coverage Test', desc: 'Have the kid get into a hockey stance (knees bent, stick on the ice in front of them). Look for gaps. If you can see skin between pieces, or if a pad slides out of position, the size is wrong.' },
            { name: 'The Movement Test', desc: 'Have them raise their arms overhead, rotate their torso, and pretend to take a slap shot. The equipment should move WITH them, not against them. If they can\'t make a full motion, the piece is too small.' },
          ].map(t => (
            <div key={t.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{t.name}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Helmet */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HELMET + CAGE / VISOR</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The helmet is the single most important piece of equipment your kid wears. Get this right above all else.
        </p>

        <div style={{ background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>Non-negotiable: USA Hockey certification</p>
          <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>
            Every helmet worn in USA Hockey sanctioned play (and in most high school and college leagues) must carry an <strong style={{ color: '#fff' }}>HECC certification sticker</strong>. HECC certification means the helmet has been tested to ASTM F1045 (helmets) and ASTM F513 (face masks) standards by an independent lab. Helmets with a CSA label are certified for Hockey Canada play. You can verify a helmet is still certified at hecc.org or csagroup.org.
          </p>
        </div>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit it</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              { step: '1', desc: 'Measure the head. Wrap a soft tape measure around the head about 1 inch above the eyebrows — the widest part. Use the measurement to find the right size on the manufacturer\'s chart.' },
              { step: '2', desc: 'Position. The front edge of the helmet should sit about one finger-width above the eyebrows. Not higher (it exposes the forehead) and not lower (it blocks vision).' },
              { step: '3', desc: 'Shake test. With the chin strap fastened, have the kid shake their head firmly. The helmet should NOT move. If it rocks, the size or shape is wrong.' },
              { step: '4', desc: 'Cheek pads. The cheek pads should touch the cheeks firmly with no gaps. If there\'s daylight between the pad and the cheek, try thicker cheek pads (most helmets come with multiple thicknesses).' },
              { step: '5', desc: 'Chin strap. Snug enough that you can fit only one finger between the strap and the chin. A loose strap is the #1 reason helmets fail to protect.' },
              { step: '6', desc: 'Cage or visor. The cage should sit about a finger-width off the nose and not touch the chin. Visors must be HECC-certified (CAN/CSA Z262.2 standard).' },
            ].map(s => (
              <div key={s.step} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: '0.75rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#C8102E' }}>{s.step}</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>When to replace:</strong> Immediately after any significant impact. Helmets are single-use safety devices — even if a hit doesn&apos;t crack the shell, the foam is designed to absorb one major impact and is compromised afterward. Also replace if the helmet is more than 5-7 years old (check the manufacture date stamped on the sticker), if the inside is crumbling, or if the kid has outgrown the size.
        </p>
      </section>

      {/* Shoulder Pads */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SHOULDER PADS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Shoulder pads protect the shoulders, collarbone, upper chest, upper back, and the top of the biceps. They run from the base of the neck to the top of the bicep, and they wrap around the chest and back.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'The shoulder caps should sit DIRECTLY on top of the shoulders, not hanging off the edge and not riding up the neck.',
              'With the arms at the sides, the chest plate should cover the sternum and the upper chest, with the bicep guards running about halfway down the upper arm.',
              'Have the kid raise their stick above their head. The shoulder caps should move with the shoulders — no gap should open up between the cap and the deltoid.',
              'Run a finger along the inside of the neck opening. There should be a 1-2 finger gap between the pad and the throat. Less than that and the pad is choking them; more and the pad is too big.',
              'On the back, the spine protector should cover the shoulder blades and extend down to the mid-back.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure chest circumference at the widest point. Match the measurement to the manufacturer&apos;s youth sizing chart. Sizes typically run from XS (smallest youth) to XL (largest youth), then junior, then senior. If your kid is between sizes, size up — shoulder pads compress the chest on impact, and a too-small pad will limit their ability to breathe during play.
        </p>
      </section>

      {/* Elbow Pads */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ELBOW PADS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Elbow pads protect the elbow joint and the forearm. The fit is straightforward — too tight and the kid can&apos;t bend the arm, too loose and the pad slides down the forearm and exposes the elbow.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'The elbow cup should sit centered on the elbow joint. If it\'s drifting up the tricep or down the forearm, the pad is too big.',
              'Have the kid bend the arm to 90 degrees. The cup should still be centered on the elbow — it should not slide to one side.',
              'The forearm guard should extend from just below the elbow to about 2 inches above the cuff of the glove, with no gap between them.',
              'Straps should be snug but not cutting off circulation. Two straps (one above, one below the elbow) is standard. Tighten the upper strap first.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure from the center of the back of the elbow to the wrist. Match the measurement to the manufacturer&apos;s chart.
        </p>
      </section>

      {/* Hockey Pants */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOCKEY PANTS (BREEZERS)</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Hockey pants (also called breezers) protect the lower back, kidneys, hips, thighs, and tailbone. They sit at the natural waist and extend down to the top of the shin guards.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'The waistband should sit at the natural waist — typically just above the hip bone. If the pants are too big, the waistband will sag toward the hips. If too small, they\'ll dig into the stomach when the kid bends.',
              'The kidney pad (the padded section on the lower back) should cover from the bottom of the ribs to the top of the hips, with the spine protected down the center.',
              'The thigh guards should extend from the bottom of the hip padding to just above the knee. There should be a small overlap with the top of the shin guards — no skin showing when the kid is in a stride.',
              'Have the kid get into a hockey stance. The pants should not bind in the crotch, slide down the waist, or ride up the back.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure waist circumference at the natural waist. Match the measurement to the manufacturer&apos;s chart. Hockey pants run large compared to street pants — a 24-inch waist kid typically wears Youth Small.
        </p>
      </section>

      {/* Shin Guards */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SHIN GUARDS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Shin guards protect the shin, the knee, and the lower thigh. The fit is the most-often-misjudged piece of equipment because the right length depends on the player&apos;s height and how they wear them (under the tongue of the skate or outside).
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'The knee cup should sit centered on the kneecap. If the cup drifts above or below the knee when the kid skates, the size is wrong.',
              'The shin section should run from just below the knee to the top of the skate tongue. There should be NO gap between the bottom of the shin guard and the top of the skate.',
              'The thigh guard (the upper flap) should extend at least halfway up the thigh and tuck under the bottom of the hockey pants.',
              'Straps (typically 2-3 elastic straps) should be snug enough that the shin guard doesn\'t slide down when the kid skates, but not so tight that they cut off circulation.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure from the center of the kneecap straight down to the top of the skate, then add about 1 inch. Match the measurement to the manufacturer&apos;s chart. Shin guards are typically sized in inches (8", 9", 10", etc.).
        </p>
      </section>

      {/* Gloves */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GLOVES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Hockey gloves protect the hands, fingers, wrists, and forearms. The fit directly affects stick feel — a glove that&apos;s too big makes it impossible to grip the stick properly.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit them</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'Open the hand fully. The palm material should be taut across the palm — no loose folds, no extra material bunching up.',
              'Fingertips should just reach the end of the glove, with about a quarter-inch of space. Less than that and the fingers are crowded; more and the stick slips.',
              'The cuff should overlap the elbow pad by 1-2 inches. No gap of skin between glove and pad.',
              'Squeeze the stick. The player should be able to feel the stick through the glove. If they can\'t, the padding is too thick for their hand size.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0' }}>
          <strong style={{ color: '#ccc' }}>Sizing:</strong> Measure from the base of the palm to the tip of the middle finger. Youth gloves run 8&quot;-11&quot;, junior 11&quot;-12&quot;, senior 12&quot;-15&quot;. The fit is highly personal — some players prefer a tighter glove for better feel, others a looser one for mobility.
        </p>
      </section>

      {/* Jock / Jill */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>JOCK / JILL + BASE LAYER</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The jock (for boys) or jill (for girls) protects the pelvic region. Most modern versions integrate the protective cup or pelvic shield into compression shorts. Some players wear a traditional jock strap with a separate cup; the integrated compression short is more common in youth hockey.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to fit it</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'Measure the waist just above the hips. Match the measurement to the brand-specific sizing chart (Bauer, CCM, and Shock Doctor all size differently).',
              'The waistband should sit comfortably at the natural waist without digging in or sagging.',
              'The protective cup or pelvic shield should fully cover the pelvic area with no gaps in coverage. For boys, the cup should be centered and held firmly by the jock strap.',
              'The compression short should be tight enough to hold the padding in place during play but not restrict breathing or movement.',
              'Sock tabs (small Velcro tabs inside the leg openings) should be used to attach the hockey socks. If there are no tabs, the socks will fall down during play.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: '0.625rem', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>✓</p>
                <p style={{ fontSize: '0.8125rem', color: '#bbb', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mouthguard */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>MOUTHGUARD</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          A mouthguard is required in all USA Hockey sanctioned play. It protects the teeth, jaw, and — most importantly — reduces the risk of concussion by absorbing and distributing impact forces.
        </p>

        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Two options</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Boil-and-bite ($5-$20)</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>A thermoplastic mouthguard you soften in hot water, then bite into to mold it to your teeth. The standard for youth hockey. Replace every 6-12 months, or sooner if it shows wear or stops fitting.</p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Custom ($80-$300)</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>Made by a dentist from a mold of the player&apos;s teeth. Better fit, more comfortable, slightly better protection. Worth it for adult players or any player wearing braces.</p>
            </div>
          </div>
        </div>
      </section>

      {/* When to Size Up */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHEN TO SIZE UP</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Kids grow. The trade-off is buying gear that fits today vs. gear that fits for two seasons. The general rule: fit for the season you&apos;re in, not the one after. A piece that&apos;s slightly too big is a safety hazard.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Signs it&apos;s time to replace or size up:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#aaa', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>• The piece visibly constricts movement during play</li>
          <li>• Coverage gaps appear when the kid is in a hockey stance</li>
          <li>• The kid regularly complains of pain, numbness, or pinching</li>
          <li>• The helmet rocks on the head even after re-adjusting</li>
          <li>• Straps are maxed out and the piece still slides</li>
        </ul>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginTop: '1rem', fontSize: '0.9375rem' }}>
          Most parents size up between seasons rather than mid-season unless the fit becomes a safety issue. For growth-spurt years (typically 11-13 for boys, 9-11 for girls), plan to replace at least 2-3 pieces each season.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/skate-fitting-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Skate Fitting Guide →
          </Link>
          <Link href="/guides/hockey-stick-guide" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            How to Choose the Right Stick →
          </Link>
          <Link href="/guides/breaking-in-hockey-gloves" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Breaking In Hockey Gloves →
          </Link>
          <Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Parent&apos;s Handbook →
          </Link>
        </div>
      </section>
    </div>
  );
}
