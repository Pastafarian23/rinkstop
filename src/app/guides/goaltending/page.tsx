import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Goaltending Guide - Position, Equipment, Technique, and How Goalies Are Developed',
  description: 'Everything you need to know about hockey goaltending: the position, the equipment, the core techniques, how goalies are developed through junior and pro hockey, and the greatest goalies in NHL history.',
  openGraph: {
    title: 'Goaltending Guide',
    description: 'Goaltending position, equipment, techniques, development paths, and the greats of NHL history.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/goaltending' },
};

export default function GoaltendingGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Goaltending</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>GOALTENDING GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The last line of defense - the position, the equipment, the techniques, and how goalies are developed from youth hockey to the NHL.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Goaltending Guide', description: 'Goaltending position, equipment, techniques, development paths, and the greats of NHL history.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE GOALTENDER POSITION</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The goaltender (often called goalie, netminder, or tender) is the player whose job is to prevent the puck from entering the net. Each team plays one goalie at a time; teams typically dress two goalies per game (a starter and a backup) and carry two or three on the active roster.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { label: 'Players on ice', value: '1 per team at any time' },
            { label: 'Equipment weight', value: '35-50 lbs (NHL-caliber), 10 lbs (youth)' },
            { label: 'Primary skills', value: 'Positioning, tracking, reflexes, mental composure' },
            { label: 'Average NHL career length', value: '4-6 years (rare to play 15+ seasons)' },
            { label: 'Average peak age', value: 'Late 20s to mid-30s (later than skaters)' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EQUIPMENT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Goaltenders wear significantly more equipment than skaters, both for protection (pucks travel 80-100 mph in the NHL) and to provide a larger blocking surface.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { piece: 'Leg pads', detail: 'Two large rectangular pads covering the front of the legs and knees. Modern pads are 11+ inches wide.' },
            { piece: 'Blocker', detail: 'A rectangular pad worn on the stick hand. Used to deflect shots away from the net.' },
            { piece: 'Catching glove (trapper)', detail: 'A large mitt worn on the glove hand. Used to catch and freeze the puck.' },
            { piece: 'Chest protector', detail: 'Worn over the torso, covering shoulders, chest, ribs, and abdomen.' },
            { piece: 'Goalie mask', detail: 'A fiberglass or composite helmet with a cage or certified visor. Mandatory in every organized league.' },
            { piece: 'Goalie skates', detail: 'A specialized skate with a lower-cut boot for mobility and a thicker cowling to protect the foot.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.piece}</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>CORE TECHNIQUES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Modern goaltending combines several distinct techniques. A goalie training focuses on positioning, recovery, and reading the play:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Butterfly', desc: 'Drop to both knees with pads flared to cover the bottom of the net. The dominant low-shot technique since the 1990s.' },
            { name: 'RVH (Reverse-Vertical-Horizontal)', desc: 'A post-integration technique: one knee down, the other pad angled against the post. Used for low shots from sharp angles.' },
            { name: 'Stand-up (stand-up goalie)', desc: 'Remain upright to take away the top of the net. Now rarely used as a primary style but appears in specific situations.' },
            { name: 'VH (Vertical-Horizontal)', desc: 'A precursor to the RVH, popularized by Patrick Roy. Uses the blocker side against the post with a flared pad.' },
            { name: 'Recovery', desc: 'The technique of returning to a balanced position after making a save.' },
            { name: 'Tracking', desc: 'Following the puck from the shooter stick through the release and into the goalie body. The fundamental skill all others build on.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.name}</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>DEVELOPMENT PATH</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Goalies develop differently than skaters. The position rewards mental composure and pattern recognition as much as raw athleticism, and most NHL starters don't reach their prime until their late 20s or 30s.</p>
        <ol style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Play youth or minor hockey; goalies typically specialize in the position by age 10-12</li>
          <li style={{ marginBottom: '0.5rem' }}>Play 2-4 seasons in a junior league (CHL, USHL, NAHL, or European equivalents)</li>
          <li style={{ marginBottom: '0.5rem' }}>Get drafted by an NHL organization (goalies are typically drafted in the mid-to-late rounds)</li>
          <li style={{ marginBottom: '0.5rem' }}>Spend 1-3 seasons in the AHL or ECHL developing</li>
          <li style={{ marginBottom: '0.5rem' }}>Earn NHL starts, typically as a backup before becoming a starter</li>
          <li style={{ marginBottom: '0.5rem' }}>Reach peak performance in late 20s to mid-30s; many starters play into their late 30s</li>
        </ol>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GREAT NHL GOALIES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The all-time leaders by regular-season wins:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { rank: 1, name: 'Martin Brodeur', wins: 691, cups: '3 Stanley Cups' },
            { rank: 2, name: 'Patrick Roy', wins: 551, cups: '4 Stanley Cups' },
            { rank: 3, name: 'Roberto Luongo', wins: 489, cups: '0 Stanley Cups' },
            { rank: 4, name: 'Marc-Andre Fleury', wins: 575, cups: '1 Stanley Cup' },
            { rank: 5, name: 'Henrik Lundqvist', wins: 459, cups: '0 Stanley Cups' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', alignItems: 'center' }}>
              <span style={{ color: '#C8102E', fontSize: '0.9375rem', fontWeight: 800, textAlign: 'right' }}>{row.rank}</span>
              <span style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 600 }}>{row.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', textAlign: 'right' }}>{row.wins} W</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem' }}>{row.cups}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-rules" style={{ color: '#C8102E' }}>Hockey Rules for Beginners</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/nhl-draft" style={{ color: '#C8102E' }}>NHL Draft Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/ahl" style={{ color: '#C8102E' }}>AHL Guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
