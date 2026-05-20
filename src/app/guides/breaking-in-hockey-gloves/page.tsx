import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Breaking In New Hockey Gloves | RinkStop',
  description: 'The best methods to break in new hockey gloves without damaging them. Soften the leather, remove the stiff palm, and get game-ready faster.',
  openGraph: { title: 'Breaking In New Hockey Gloves | RinkStop', description: 'The best methods to break in new hockey gloves without damaging them.', type: 'article' },
  alternates: { canonical: 'https://rinkstop.com/guides/breaking-in-hockey-gloves' },
};

export default function BreakingInGloves() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Breaking In Hockey Gloves</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Equipment</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>BREAKING IN NEW HOCKEY GLOVES</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>New hockey gloves are stiff, flat, and uncomfortable. The leather and padding need to mold to your hand shape. Do it right and your gloves feel game-ready in days. Do it wrong and you\'ll be fighting stiff palms all season.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Breaking In New Hockey Gloves', description: 'The best methods to break in new hockey gloves without damaging them.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-05-16' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'How do you break in hockey gloves fast?', acceptedAnswer: { '@type': 'Answer', text: 'The fastest method: wear them while doing housework or watching TV for 2-3 evenings before you need them on the ice. Alternate between wearing them normally and flexing them by hand. Second method: stuff them with a rolled-up sock or balled paper towels to open up the palm and fingers. Never bake hockey gloves  --  the heat damages the foam padding.' } },
        { '@type': 'Question', name: 'Can you put hockey gloves in the oven to break them in?', acceptedAnswer: { '@type': 'Answer', text: 'No  --  never put hockey gloves in an oven, microwave, or any heat source. Hockey gloves contain foam padding and synthetic materials that can melt, deform, or release toxic fumes at even low oven temperatures. Heat also degrades the leather adhesive. Stick to mechanical breaking methods.' } },
        { '@type': 'Question', name: 'How long does it take to break in new hockey gloves?', acceptedAnswer: { '@type': 'Answer', text: 'With aggressive off-ice wearing (2-3 evenings of casual use), most gloves are 80% broken in within a week. Full break-in for the palm and finger wells typically takes 2-4 weeks of on-ice use. Some high-end composite gloves with pre-curved fingers break in faster than traditional flat-cut leather gloves.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT YOU&apos;RE BREAKING IN</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>New gloves have three areas that need breaking in:</p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { area: 'Palm & fingers', problem: 'Leather is flat and unworn. Grip surface feels slick. Can&apos;t feel the puck well.', goal: 'Palm molds to your grip, leather softens, grip surface develops texture.' },
              { area: 'Finger wells', problem: 'Fingers feel boxed-in. Hard to close fingers around the stick. Limited dexterity.', goal: 'Fingers flex naturally inside the well, movement is unrestricted in all directions.' },
              { area: 'Wrist cuff & backhand', problem: 'Stiff cuff restricts wrist movement. Backhand panel doesn&apos;t flex with hand.', goal: 'Full wrist mobility for stickhandling and shooting. Cuff sits flush without gapping.' },
            ].map(a => (
              <div key={a.area} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.25rem' }}>{a.area}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#888' }}>{a.problem}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#009650', marginBottom: '0.25rem' }}>Goal</p>
                  <p style={{ fontSize: '0.8125rem', color: '#888' }}>{a.goal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE METHOD  --  STEP BY STEP</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {[
            { step: '1', title: 'Wear them off the ice first', desc: 'Put the gloves on and wear them while watching TV, doing chores, or working at a desk. Do this for 2-3 evenings before your first game. This is the most natural and effective break-in method  --  your hands flex naturally, working the leather without artificial force.' },
            { step: '2', title: 'Flex the palm by hand', desc: 'Remove the stick from the gloves. With the gloves on, squeeze your fists, spread your fingers wide, and flex the palm repeatedly. Do 3 sets of 20 squeezes per day. This works the foam padding in the palm and helps the leather form to your grip pressure.' },
            { step: '3', title: 'Work each finger individually', desc: 'With the gloves on, roll each finger segment between your thumb and fingers  --  as if you&apos;re rolling dough. Do this for each finger on both gloves. Pay extra attention to the index finger and thumb which do the most stick handling work.' },
            { step: '4', title: 'Open the finger wells with clothespins', desc: 'Buy a roll of paper towels or use old socks. Stuff each finger of the glove tightly  --  fill the finger wells completely. Leave them stuffed overnight. The constant pressure from the inside opens up tight finger wells without any heat or chemicals.' },
            { step: '5', title: 'Use the dryer trick for wrist cuffs only', desc: 'Set your clothes dryer to LOW HEAT. Put the gloves in alone (no other clothes) and tumble for 15 minutes. This softens the cuff leather without damaging the foam padding in the palm and backhand. Do NOT use high heat  --  it will damage the padding. This is optional and only for the cuff.' },
            { step: '6', title: 'First on-ice session  --  easy start', desc: 'On your first time on the ice in new gloves, spend the first 15 minutes doing light stick handling and passing. Don&apos;t do full-speed shooting drills until the gloves have flexed to your hand. The cold ice makes the leather more receptive to molding  --  use this to your advantage.' },
          ].map(s => (
            <div key={s.step} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800, color: '#C8102E', flexShrink: 0 }}>{s.step}</div>
              <div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{s.title}</p>
                <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT NOT TO DO</h2>
        <div style={{ background: 'rgba(200,16,46,0.05)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { thing: 'Oven or microwave baking', why: 'Foam padding melts at low temperatures. The adhesive in leather gloves fails. Fire risk.' },
              { thing: 'Hair dryer on high heat', why: 'Same problem as oven  --  concentrated heat damages padding and leather. Irreversible damage.' },
              { thing: 'Hammering or pounding the leather', why: 'Creates uneven pressure points and deforms the shape. No benefit over manual flexing.' },
              { thing: 'Submerging in water', why: 'Soaking leather causes it to shrink unevenly, stiffens the interior padding, and can cause odor. Damp wiping is fine  --  not soaking.' },
              { thing: 'Cutting the finger wells', why: 'Once cut, you cannot restore it. Some players cut the pinky and ring finger wells for mobility, but this is permanent modification.' },
            ].map(n => (
              <div key={n.thing} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0.75rem', padding: '0.75rem', background: 'rgba(200,16,46,0.05)', borderRadius: '6px' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#C8102E' }}>{n.thing}</p>
                <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>{n.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>More equipment guides</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/guides/hockey-stick-guide" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Stick Guide</Link>
          <Link href="/guides/skate-fitting-guide" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Skate Fitting Guide</Link>
        </div>
      </div>
    </div>
  );
}