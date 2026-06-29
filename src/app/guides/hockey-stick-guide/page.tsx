import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Choose a Hockey Stick',
  description: 'Blade curve, flex, kickpoint, and length  --  what actually matters when buying a hockey stick. The complete guide to finding the right stick for your shot, position, and budget.',
  openGraph: {
    title: 'How to Choose a Hockey Stick',
    description: 'Blade curve, flex, kickpoint, and length  --  what actually matters when buying a hockey stick.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/hockey-stick-guide' },
};

export default function HockeyStickGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>How to Choose a Hockey Stick</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Equipment
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOW TO CHOOSE A HOCKEY STICK
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Blade curve, flex, kickpoint, and length  --  what actually matters when buying your next stick.
      </p>

      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>In this guide:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['Flex', 'Blade Curve', 'Kickpoint', 'Length', 'Lie', 'Material', 'Price'].map(s => (
            <span key={s} style={{ padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', fontSize: '0.75rem', color: '#888' }}>{s}</span>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Choose a Hockey Stick | RinkStop',
        description: 'Blade curve, flex, kickpoint, and length  --  what actually matters when buying a hockey stick.',
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-05-16',
        about: { '@type': 'Thing', name: 'Hockey Equipment' },
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What flex hockey stick should I use?', acceptedAnswer: { '@type': 'Answer', text: 'Your stick flex should be about half your body weight in pounds. A 180lb player should use a 85-90 flex stick. If you倾向于 wrist shots and quick releases, go one flex stiffer. If you take hard slap shots, go one flex softer.' } },
          { '@type': 'Question', name: 'How do I know if my hockey stick is the right length?', acceptedAnswer: { '@type': 'Answer', text: 'Stand barefoot in skates. The stick should reach between your chin and nose when the blade is flat on the ice. If it\'s below your chin, it\'s too short. Above your nose, it\'s too long. Most players err on the side of a stick that\'s slightly short  --  it\'s easier to handle and quicker to release.' } },
          { '@type': 'Question', name: 'What is kickpoint in a hockey stick?', acceptedAnswer: { '@type': 'Answer', text: 'Kickpoint is the spot on the shaft where the stick flexes most when you load it for a shot. A low kickpoint (around the lower third) loads from the blade and is ideal for wrist shots and snap shots. A mid kickpoint loads from the middle and is the most versatile. A high kickpoint is at the hands  --  best for slap shots and one-timers from the blue line.' } },
          { '@type': 'Question', name: 'What blade curve should I get?', acceptedAnswer: { '@type': 'Answer', text: 'Blade curve is personal preference, but general rules: a open-faced curve (P02, P06) helps lift pucks and is good for goalies and players who shoot high. A closed-faced curve (P29, P88) is versatile and good for accurate wrist shots. A heel curve (P92) is great for forehand shots and board plays.' } },
        ],
      }) }} />

      {/* Section 1: Flex */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>FLEX  --  The Most Important Factor</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Flex is how much the shaft bends under pressure, measured in flex points. It's the single most important factor in how a stick performs. Get it wrong and nothing else matters.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.5rem' }}>Rule of thumb: Flex ≈ half your body weight</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {[['75 flex', '110-140 lbs'], ['80 flex', '130-160 lbs'], ['85 flex', '150-180 lbs'], ['90 flex', '170-195 lbs'], ['100 flex', '190-220 lbs'], ['110 flex', '220+ lbs']].map(([f, w]) => (
              <div key={f} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{f}</p>
                <p style={{ fontSize: '0.8125rem', color: '#777' }}>{w}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#999', lineHeight: 1.7, fontSize: '0.875rem' }}>
          <strong style={{ color: '#ccc' }}>Softer flex (75-85):</strong> Easier to load, better for players who rely on quick wrist shots and board play. Good for younger players, beginners, and players under 160lbs.
        </p>
        <p style={{ color: '#999', lineHeight: 1.7, fontSize: '0.875rem', marginTop: '0.5rem' }}>
          <strong style={{ color: '#ccc' }}>Stiffer flex (90-110):</strong> More energy stored on hard shots, better for slap shots and one-timers. Better for stronger players, defensemen taking blue-line shots, and players over 190lbs.
        </p>
      </section>

      {/* Section 2: Length */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>STICK LENGTH</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The most common mistake is buying a stick that's too long. Most players can play with a stick that's slightly short easier than one that's slightly long.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>How to measure: Stand in skates, stick on ice</p>
          <p style={{ color: '#999', lineHeight: 1.7, fontSize: '0.875rem' }}>The stick should reach between your <strong style={{ color: '#fff' }}>chin and nose</strong>. If you're in bare feet, add roughly 1-1.5 inches for the height of your skates.</p>
        </div>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[['Too short', 'Below chin', "Quick release, easy to handle. Can be restrictive for slap shots."], ['Right size', 'Chin to nose', "Ideal range. Versatile for all shots and situations."], ['Too long', 'Above nose', "Harder to handle, slower release. Can affect shot accuracy."]].map(([label, range, desc]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.025)', borderRadius: '8px', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: label === 'Right size' ? '#009650' : '#C8102E', marginBottom: '0.25rem' }}>{label}</p>
                <p style={{ fontSize: '0.75rem', color: '#666' }}>{range}</p>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Kickpoint */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>KICKPOINT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Kickpoint is where the shaft flexes most when you load a shot. It determines what kind of shots the stick excels at.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Low Kickpoint', desc: 'Flexes near the blade (lower third of shaft)', best: 'Wrist shots, snap shots, quick releases  --  ideal for players who shoot in close', ex: 'Bauer Vapor (low), CCM Ribcor (low)' },
            { name: 'Mid Kickpoint', desc: 'Flexes at the center of the shaft', best: 'Most versatile  --  works for a wide range of shots and player styles', ex: 'Bauer Supreme (mid), Warrior Dynasty (mid)' },
            { name: 'High Kickpoint', desc: 'Flexes near the hands (top of shaft)', best: 'Slap shots and one-timers from distance, loads from full extension', ex: 'Bauer Nexus (high), CCM Tacks (high)' },
          ].map(k => (
            <div key={k.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{k.name}</p>
              <p style={{ fontSize: '0.8125rem', color: '#666', marginBottom: '0.5rem' }}>{k.desc}</p>
              <p style={{ fontSize: '0.8125rem', color: '#999', marginBottom: '0.375rem' }}><strong style={{ color: '#ccc' }}>Best for:</strong> {k.best}</p>
              <p style={{ fontSize: '0.8125rem', color: '#555' }}><strong style={{ color: '#777' }}>Examples:</strong> {k.ex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Blade Curve */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>BLADE CURVE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Blade curve affects where the puck goes when you shoot. There are three main types. Most players have a preference, and it develops with experience.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Open Face (P02, P06)', desc: 'Toe of the blade curves inward significantly', for: 'Goalies, players who shoot high, players who need to lift pucks over sticks', risk: 'Can make shots sail high if not controlled' },
            { name: 'Closed Face (P29, P88)', desc: 'Gentle curve through the entire blade', for: 'Versatile shooters, accurate wrist shots, all-around play', risk: 'Less automatic lift on shots' },
            { name: 'Heel Curve (P92)', desc: 'Curve starts from the heel of the blade', for: 'Board battles, forehand wrap shots, plays along the wall', risk: 'Less precise for high shots' },
          ].map(c => (
            <div key={c.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{c.name}</p>
              <p style={{ fontSize: '0.8125rem', color: '#999', marginBottom: '0.5rem' }}>{c.desc}</p>
              <p style={{ fontSize: '0.8125rem', color: '#999', marginBottom: '0.25rem' }}><strong style={{ color: '#ccc' }}>Ideal for:</strong> {c.for}</p>
              <p style={{ fontSize: '0.8125rem', color: '#666' }}><strong style={{ color: '#888' }}>Watch for:</strong> {c.risk}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Lie */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>STICK LIE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Lie is the angle of the blade relative to the shaft  --  measured 1-6 (low to high). A higher lie means the blade sits flatter on the ice when you're in your natural stance. Getting the lie right means the whole blade contacts the ice evenly.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Quick lie guide</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {[['Lie 4', 'Shorter players / smaller skates'], ['Lie 5', 'Average height players'], ['Lie 6', 'Taller players / larger skates']].map(([l, who]) => (
              <div key={l} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{l}</p>
                <p style={{ fontSize: '0.75rem', color: '#777' }}>{who}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Material */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>MATERIAL & PRICE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Most modern sticks are composite (carbon fiber / fiberglass / graphite). Entry-level sticks are often hybrid (composite shaft with binary blade). Ice hockey sticks come in three main constructions:
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Single-piece composite', price: '$180-$400+', pros: 'Lightest, best energy transfer, most consistent flex', cons: 'Expensive, more brittle on contact' },
            { name: 'Two-piece (replaceable blade)', price: '$120-$250', pros: 'Easier to replace blades, good value', cons: 'Slight energy loss at joint, slightly heavier' },
            { name: 'Hybrid (composite shaft + foam blade)', price: '$80-$150', pros: 'Durable, affordable, good for beginners', cons: 'Heavier, less responsive feel' },
          ].map(m => (
            <div key={m.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{m.name}</p>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)' }}>{m.price}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#888', marginBottom: '0.25rem' }}>{m.pros}</p>
              <p style={{ fontSize: '0.8125rem', color: '#666' }}>{m.cons}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Ready to find your team?</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/directory/players" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Browse Players</Link>
          <Link href="/glossary/icing" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Glossary</Link>
        </div>
      </div>

      {/* Cross-link: stick-size calculator (Day 3 Option A) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(200,16,46,0.08) 0%, rgba(255,184,28,0.05) 100%)',
        border: '1px solid rgba(200,16,46,0.25)', borderRadius: '12px',
        padding: '2rem 1.5rem', textAlign: 'center', marginTop: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem', color: '#fff', fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.02em' }}>
          Skip the guesswork — get a recommendation in 10 seconds
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 1.25rem', fontSize: '1rem', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          Our free stick-size calculator uses the chin-to-nose rule and weight-based flex to recommend length, flex rating, and curve family for any height, weight, position, and skill level.
        </p>
        <Link
          href="/tools/hockey-stick-size-calculator"
          style={{
            display: 'inline-block', padding: '0.75rem 1.5rem',
            background: '#C8102E', color: '#fff', borderRadius: '6px',
            textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
          }}
        >
          Try the stick-size calculator →
        </Link>
      </div>
    </div>
  );
}