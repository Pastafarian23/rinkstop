import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';

export const metadata: Metadata = {
  title: 'Learn Hockey - Beginners Guide to Ice Hockey',
  description: 'Complete beginner guide to hockey: learn hockey rules, positions, skating techniques, and equipment. Everything you need to start playing hockey.',
};

const SKILL_LEVELS = [
  { level: 'Beginner', icon: '🎿', color: '#4CAF50', desc: 'New to hockey — start here' },
  { level: 'Intermediate', icon: '⛸️', color: '#FF9800', desc: 'Know basics, building skills' },
  { level: 'Advanced', icon: '🏒', color: '#C8102E', desc: 'Competitive player level' },
];

const POSITIONS = [
  { name: 'Forward', short: 'F', roles: ['Left Wing (LW)', 'Center (C)', 'Right Wing (RW)'], desc: 'Primary offensive players who lead attacks and score goals.' },
  { name: 'Defense', short: 'D', roles: ['Left Defense (LD)', 'Right Defense (RD)'], desc: 'Protect the goal, block shots, and initiate breakouts.' },
  { name: 'Goaltender', short: 'G', roles: ['Goalie'], desc: 'Stop the puck from entering the net. The last line of defense.' },
];

const GUIDE_CATEGORIES = [
  {
    title: 'HOCKEY FUNDAMENTALS',
    icon: '📖',
    guides: [
      { href: '/learn/hockey-rules', title: 'Hockey Rules', desc: 'Complete guide to NHL rules, penalties, and gameplay', time: '12 min read' },
      { href: '/learn/hockey-positions', title: 'Hockey Positions', desc: 'Understanding each position and their responsibilities', time: '8 min read' },
      { href: '/learn/hockey-terminology', title: 'Hockey Glossary', desc: 'Common hockey terms and slang explained', time: '6 min read' },
    ]
  },
  {
    title: 'SKATING & SKILLS',
    icon: '⛸️',
    guides: [
      { href: '/learn/how-to-skate', title: 'How to Skate', desc: 'Step-by-step guide to learning hockey skating', time: '15 min read' },
      { href: '/learn/stopping', title: 'How to Stop', desc: 'Master the hockey stop in 3 easy techniques', time: '10 min read' },
      { href: '/learn/crossovers', title: 'Crossovers', desc: 'Build speed with proper crossover technique', time: '8 min read' },
    ]
  },
  {
    title: 'EQUIPMENT',
    icon: '🛡️',
    guides: [
      { href: '/learn/hockey-equipment', title: 'Equipment Guide', desc: 'Full list of required and recommended gear', time: '12 min read' },
      { href: '/learn/skate-fitting', title: 'Skate Fitting', desc: 'How to fit hockey skates for optimal performance', time: '7 min read' },
      { href: '/learn/stick-fitting', title: 'Stick Fitting', desc: 'Choosing the right stick: length, flex, curve', time: '9 min read' },
    ]
  },
  {
    title: 'GAMEPLAY',
    icon: '🎯',
    guides: [
      { href: '/learn/face-offs', title: 'Face-offs', desc: 'How to win face-offs: techniques and positioning', time: '6 min read' },
      { href: '/learn/passing', title: 'Passing', desc: 'Types of passes and when to use them', time: '8 min read' },
      { href: '/learn/shooting', title: 'Shooting', desc: 'Wrist shots, snap shots, slap shots — techniques', time: '10 min read' },
    ]
  },
];

export default function LearnHubPage() {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Learn Hockey' },
  ];

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <Breadcrumb items={breadcrumbItems} />

      {/* Hero */}
      <section style={{ marginBottom: '3rem', textAlign: 'center', padding: '3rem 1rem', background: 'linear-gradient(135deg, #041E42 0%, #0a2d5c 100%)', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', color: '#C8102E', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Your Hockey Journey Starts Here</div>
          <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2.5rem, 6vw, 4rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>LEARN HOCKEY</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.0625rem', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
            From your first strides on ice to understanding NHL rules — everything a new player or fan needs to know, in one place.
          </p>
          <Link href="/directory/youth-hockey/learn-to-play" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#C8102E', color: '#fff', borderRadius: '6px', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none' }}>
            Find Learn to Play Programs Near You →
          </Link>
        </div>
      </section>

      {/* Why Learn Hockey */}
      <section style={{ marginBottom: '3rem', background: 'var(--s2)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHY PLAY HOCKEY?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: '❤️', title: 'Fitness', desc: 'Hockey burns calories, builds leg strength, and improves cardiovascular health faster than most sports.' },
            { icon: '🧠', title: 'Mental Toughness', desc: 'Fast-paced decision making builds mental acuity. You think faster, react quicker.' },
            { icon: '🤝', title: 'Community', desc: 'Hockey teams become families. The locker room bonds run deeper than any office friendship.' },
            { icon: '🌍', title: 'Global Sport', desc: 'From <Link href="/hockey/canada" style="color:#C8102E">Canada</Link> to <Link href="/hockey/russia" style="color:#C8102E">Russia</Link> to <Link href="/hockey/japan" style="color:#C8102E">Japan</Link> — hockey connects you worldwide.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.75rem' }}>{item.icon}</span>
              <div>
                <h3 style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{item.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: item.desc }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill Levels */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.5rem' }}>FIND YOUR LEVEL</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {SKILL_LEVELS.map((item, i) => (
            <div key={item.level} style={{ background: 'var(--s2)', borderRadius: '8px', padding: '1.5rem', border: `2px solid ${item.color}`, borderLeft: `4px solid ${item.color}` }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{item.icon}</div>
              <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: item.color, letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{item.level.toUpperCase()}</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.9375rem' }}>{item.desc}</p>
              <Link href={`/directory/youth-hockey/programs?level=${item.level.toLowerCase()}`} style={{ display: 'inline-block', padding: '0.5rem 1rem', background: item.color, color: '#fff', borderRadius: '4px', fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none' }}>
                Find Programs
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Hockey Positions */}
      <section style={{ marginBottom: '3rem', background: 'var(--s2)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>HOCKEY POSITIONS</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          A hockey team has <strong style={{ color: '#fff' }}>6 players on the ice</strong> at a time (one goalie + 5 skaters). Each position has specific responsibilities that contribute to team success.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {POSITIONS.map(pos => (
            <div key={pos.name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', background: '#C8102E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem', color: '#fff' }}>{pos.short}</div>
                <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em' }}>{pos.name.toUpperCase()}</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {pos.roles.map(r => (
                  <span key={r} style={{ background: 'rgba(200,16,46,0.2)', color: '#C8102E', padding: '0.25rem 0.625rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{r}</span>
                ))}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.5 }}>{pos.desc}</p>
            </div>
          ))}
        </div>
        <Link href="/learn/hockey-positions" style={{ display: 'inline-block', marginTop: '1.25rem', padding: '0.625rem 1.25rem', background: '#C8102E', color: '#fff', borderRadius: '6px', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>
          Full Positions Guide →
        </Link>
      </section>

      {/* Learning Paths */}
      {GUIDE_CATEGORIES.map(cat => (
        <section key={cat.title} style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>{cat.title}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {cat.guides.map(g => (
              <Link key={g.href} href={g.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: 'var(--s2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                
                >
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{g.title}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>{g.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{g.time}</span>
                  <span style={{ color: '#C8102E', fontSize: '1.25rem' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Find Local Programs */}
      <section style={{ background: 'linear-gradient(135deg, #C8102E 0%, #8a0a1e 100%)', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>READY TO GET ON THE ICE?</h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '1.5rem', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          Find beginner-friendly Learn to Play programs, youth hockey leagues, and adult hockey near you.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/directory/youth-hockey/learn-to-play" style={{ padding: '0.75rem 1.5rem', background: '#fff', color: '#C8102E', borderRadius: '6px', fontWeight: 700, textDecoration: 'none' }}>Learn to Play Programs</Link>
          <Link href="/directory/youth-hockey" style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', fontWeight: 700, textDecoration: 'none' }}>Youth Hockey</Link>
          <Link href="/directory/youth-hockey/adult-leagues" style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', fontWeight: 700, textDecoration: 'none' }}>Adult Leagues</Link>
        </div>
      </section>

      {/* Schema markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Learn Hockey",
          "description": "Complete beginner guide to hockey: learn hockey rules, positions, skating techniques, and equipment.",
          "url": "https://rinkstop.com/learn",
          "mainEntity": {
            "@type": "ItemList",
            "name": "Hockey Learning Guides",
            "itemListElement": GUIDE_CATEGORIES.flatMap(cat => cat.guides).map((g, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "name": g.title,
              "url": `https://rinkstop.com${g.href}`
            }))
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://rinkstop.com" },
              { "@type": "ListItem", "position": 2, "name": "Learn Hockey", "item": "https://rinkstop.com/learn" }
            ]
          }
        })
      }} />
    </main>
  );
}