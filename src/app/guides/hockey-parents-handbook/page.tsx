import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Hockey Parent's Handbook",
  description: "What to expect at your kid's first hockey season  --  from equipment to game day etiquette. A parent's guide to navigating youth hockey from Mites to Midgets.",
  openGraph: {
    title: "Hockey Parent's Handbook",
    description: "What to expect at your kid's first hockey season  --  from equipment to game day etiquette.",
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/hockey-parents-handbook' },
};

export default function HockeyParentsHandbook() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Parent&apos;s Handbook</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Parents
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOCKEY PARENT&apos;S HANDBOOK
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        What to expect at your kid&apos;s first hockey season  --  from buying equipment to knowing when to stay quiet at the glass. This guide is for every parent whose child just stepped on the ice for the first time.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "Hockey Parent's Handbook",
        description: "What to expect at your kid's first hockey season  --  from equipment to game day etiquette.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-05-16',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How much does youth hockey cost per year?', acceptedAnswer: { '@type': 'Answer', text: 'Youth hockey costs vary widely by association and region. Learn to Play programs (first-timers) can cost $200-$500. Travel hockey typically runs $3,000-$10,000+ per year when you include registration, ice time, equipment, tournaments, and travel. Budget for 2-3x your association fee for total costs.' } },
          { '@type': 'Question', name: 'What equipment does a beginner hockey player need?', acceptedAnswer: { '@type': 'Answer', text: 'Beginners need: hockey skates, helmet (with cage), shoulder pads, elbow pads, shin guards (pants), gloves, a stick, and a bag. All of this can be purchased as a "beginner bundle" at most hockey shops. Budget $400-$800 for new gear. Buy skates and helmets new; other gear can often be bought used.' } },
          { '@type': 'Question', name: 'What should parents say to their kid after a hockey game?', acceptedAnswer: { '@type': 'Answer', text: 'Ask one question: "Did you have fun?" That&apos;s it. Don&apos;t critique shifts, criticize the coach, or talk about winning or losing until your kid brings it up. The single biggest factor in kids staying in hockey past age 13 is whether it&apos;s fun  --  and parents have more influence on this than coaches.' } },
          { '@type': 'Question', name: 'When should kids start hockey?', acceptedAnswer: { '@type': 'Answer', text: 'Most kids start between ages 4 and 7. Learn to Skate programs that incorporate hockey basics are ideal for first-timers under 5. Starting at 8-10 is still very normal. The key is readiness: can the child follow instructions, handle losing without melting down, and is the family ready for the commitment?' } },
        ],
      }) }} />

      {/* Getting Started */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GETTING STARTED</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>
          Your first decision isn&apos;t about hockey  --  it&apos;s about skating. If your child can&apos;t skate, they can&apos;t play hockey. Most local associations run &quot;Learn to Play&quot; programs that teach skating first, then introduce hockey skills. These are the best entry point.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Age guide by level</p>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              { age: 'Ages 3-6', label: 'Learn to Skate / Junior Mites', note: 'Skating fundamentals only. No checking, no pressure.' },
              { age: 'Ages 6-8', label: 'Mites (8U)', note: 'Cross-ice games, no scores kept, no tryouts.' },
              { age: 'Ages 8-10', label: 'Squirts (10U)', note: 'Full ice, local travel begins, first tournaments.' },
              { age: 'Ages 10-12', label: 'Pee Wee (12U)', note: 'Body contact introduced, more competitive.' },
              { age: 'Ages 12-14', label: 'Bantam (14U)', note: 'Checking introduced, bigger ice surface.' },
              { age: 'Ages 14-18', label: 'Midget / Junior', note: 'High school, junior, or club pathways diverge.' },
            ].map(a => (
              <div key={a.age} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.035)', borderRadius: '6px', alignItems: 'center' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>{a.age}</p>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{a.label}</p>
                  <p style={{ fontSize: '0.75rem', color: '#777' }}>{a.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipment */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EQUIPMENT  --  WHAT YOU ACTUALLY NEED</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Hockey equipment is sold as individual pieces and in bundles. For beginners, bundles are almost always the better deal  --  you&apos;ll get everything you need for $400-$800 new. As your child grows, you&apos;ll replace individual pieces as they wear out or outgrow them.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { item: 'Hockey skates', buy: 'Buy new', why: 'Skates must fit precisely  --  used skates are molded to someone else\'s foot. A bad fit causes bad habits on the ice.', budget: '$100-$300' },
              { item: 'Helmet + cage', buy: 'Buy new', why: 'Safety equipment. Ensure it fits properly and the cage has no rust or cracks.', budget: '$80-$200' },
              { item: 'Shoulder pads', buy: 'Used is fine', why: 'Protection doesn\'t degrade. Check for cracked plastic shells before buying.', budget: '$50-$150 used' },
              { item: 'Elbow pads', buy: 'Used is fine', why: 'Same as shoulder pads. Check straps and velcro.', budget: '$30-$80 used' },
              { item: 'Shin guards (pants)', buy: 'Used is fine', why: 'Look for intact plastic padding. Waistband should fit snug.', budget: '$40-$100 used' },
              { item: 'Gloves', buy: 'New or quality used', why: 'Gloves mold to the hand. Poorly fitting gloves affect stick handling.', budget: '$50-$150' },
              { item: 'Hockey stick', buy: 'Start with junior stick', why: 'Get the right flex for their size. A stick that\'s too stiff won\'t develop proper shooting technique.', budget: '$50-$150' },
              { item: 'Equipment bag', buy: 'Any size works', why: 'Needs to fit a helmet, pads, skates, and stick. Hockey bags are designed for this.', budget: '$40-$120' },
            ].map(e => (
              <div key={e.item} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{e.item}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>{e.why}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.125rem' }}>{e.buy}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#555' }}>{e.budget}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <strong style={{ color: '#ccc' }}>Pro tip:</strong> Buy skates at a hockey shop, not a general sporting goods store. The staff at hockey shops can measure foot size and recommend the right fit. Skates that are a half-size too big will ruin a beginner&apos;s skating form.
        </p>
      </section>

      {/* Cost */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT IT ACTUALLY COSTS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Hockey is expensive. The association fee is only the beginning. Here&apos;s a realistic breakdown of what to budget for a travel hockey season:
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          {[
            { item: 'Association / league registration', low: '$1,500', high: '$4,000' },
            { item: 'Tournament fees (3-5 tournaments)', low: '$500', high: '$1,500' },
            { item: 'Ice time / practice fees', low: '$500', high: '$1,500' },
            { item: 'Coaching fees', low: '$300', high: '$1,000' },
            { item: 'Equipment (new per season if growing)', low: '$200', high: '$600' },
            { item: 'Travel / hotel for tournaments', low: '$300', high: '$2,000' },
            { item: 'Total estimated', low: '$3,300', high: '$10,600' },
          ].map(c => (
            <div key={c.item} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: '0.5rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '0.8125rem', color: '#999' }}>{c.item}</p>
              <p style={{ fontSize: '0.75rem', color: '#555', textAlign: 'right' }}>{c.low}</p>
              <p style={{ fontSize: '0.75rem', color: '#C8102E', textAlign: 'right', fontWeight: 700 }}>{c.high}</p>
            </div>
          ))}
        </div>
        <p style={{ color: '#888', fontSize: '0.8125rem', lineHeight: 1.6 }}>
          Learn to Play programs and in-town recreation leagues are at the lower end. Travel / AAA hockey is at the high end. Many associations offer scholarships  --  ask your association coordinator.
        </p>
      </section>

      {/* Game Day */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GAME DAY ETIQUETTE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Youth hockey has a culture problem with parents  --  most of it at the rink. Here&apos;s what every parent needs to know:
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { title: 'Stay off the bench', desc: 'Unless you&apos;re a coach or a formally designated team manager, you are not allowed near the bench area. This is non-negotiable at every association.' },
            { title: 'Don&apos;t coach from the stands', desc: 'Kids can hear everything you say. If you&apos;re yelling instructions at your kid from the stands, you&apos;re undermining the coach and confusing your child.' },
            { title: 'Don&apos;t talk about the refs', desc: 'Youth hockey referees are often kids themselves (or adults working their first games). Abusing them is the fastest way to get ejected  --  and your kid suspended.' },
            { title: 'Save the car talk for after', desc: 'The ride home is where most parents ruin the experience. If you&apos;re going to talk about the game, ask "Did you have fun?" first  --  and mean it.' },
            { title: 'Cheer for all the kids', desc: '"Good job!" and "Nice try!" apply to every kid on the ice  --  not just yours. Teams win together; teams lose together.' },
          ].map(r => (
            <div key={r.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{r.title}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What to Say */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE RIGHT THINGS TO SAY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Sports psychologists who study youth athlete dropout rates consistently find the same pattern: kids who stay in sports longest have parents who focus on effort, learning, and fun  --  not winning and performance metrics.
        </p>
        <div style={{ background: 'rgba(0,150,80,0.06)', border: '1px solid rgba(0,150,80,0.2)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#009650', marginBottom: '0.75rem' }}>Say these instead:</p>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              '"Did you have fun today?"',
              '"What was the best part of practice?"',
              '"You worked really hard out there."',
              '"I liked how you helped your teammate up."',
              '"That was a great effort  --  I can see you improving."',
            ].map(s => (
              <p key={s} style={{ fontSize: '0.8125rem', color: '#777', paddingLeft: '1rem', borderLeft: '2px solid rgba(0,150,80,0.3)' }}>{s}</p>
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(200,16,46,0.05)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.75rem' }}>Avoid these:</p>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              '"You should have passed it there."',
              '"Why weren\'t you hitting anyone?"',
              '"You let in a weak goal."',
              '"That was a stupid play."',
              '"You played like a pylon."',
            ].map(s => (
              <p key={s} style={{ fontSize: '0.8125rem', color: '#666', paddingLeft: '1rem', borderLeft: '2px solid rgba(200,16,46,0.3)' }}>{s}</p>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Explore more hockey content</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/glossary" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Glossary</Link>
          <Link href="/guides/hockey-positions" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Positions Guide</Link>
        </div>
      </div>
    </div>
  );
}