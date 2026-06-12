import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Youth Hockey Guide',
  description:
    'How to get started in youth hockey, find a program, and learn the game at every age.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/youth-hockey',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Youth Hockey Guide',
    description:
      'How to get started in youth hockey, find a program, and learn the game at every age.',
    url: 'https://rinkstop.com/directory/youth-hockey',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Youth Hockey Guide',
    description:
      'How to get started in youth hockey, find a program, and learn the game at every age.',
  },
};

// Pure content page — render fresh so editors / future dynamic blocks are safe.
export const dynamic = 'force-dynamic';

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'GETTING STARTED',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <line x1="12" y1="12" x2="12" y2="20"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.3rem' }}>What age can kids start?</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.65 }}>
            Most kids lace up for the first time between ages 4 and 7. Many rinks offer{" "}
            <strong style={{ color: '#fff' }}>"Learn to Play"</strong> programs designed specifically for complete beginners  --  no experience needed. Some even provide equipment so you don't have to buy anything upfront.
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.3rem' }}>Basic gear checklist</p>
          <ul style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <li>Skates  --  get fitted at a local hockey shop, don't guess on size</li>
            <li>Helmet with cage or visor</li>
            <li>Shoulder pads, elbow pads, shin guards</li>
            <li>Hockey pants (breezers) + game socks</li>
            <li>Gloves, stick, and a mouthguard</li>
            <li>Equipment bag  --  a hockey bag or a large duffel works fine</li>
          </ul>
        </div>
        <div>
          <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.3rem' }}>What does first practice look like?</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.65 }}>
            Chaos, mostly. Kids chase pucks, fall down a lot (it's part of learning), and have an absolute blast. Coaches expect zero skill  --  that's the point. Practices focus on getting comfortable on ice: how to stand up, how to fall safely, how to push, and eventually how to glide.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'age-divisions',
    title: 'AGE DIVISIONS',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    content: (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['Division', 'Age Range', 'Notes'].map(h => (
                <th key={h} style={{ textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.625rem', padding: '0.25rem 0.75rem 0.5rem 0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { div: 'Mites / Initiation', ages: '4-6', note: 'Full ice or cross-ice, 100% fun' },
              { div: 'Squirts / Novice', ages: '7-8', note: 'Full ice, begin formal league play' },
              { div: 'Peewee', ages: '9-10', note: 'Checking introduced in some leagues' },
              { div: 'Bantam', ages: '11-12', note: 'Full contact, bigger ice, real strategy' },
              { div: 'Midget / Junior', ages: '13-17', note: 'High school and travel-level hockey' },
              { div: 'Junior / Tier III', ages: '16-20', note: 'Junior leagues, prep for college or pro' },
            ].map(row => (
              <tr key={row.div} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', color: '#fff', fontWeight: 600 }}>{row.div}</td>
                <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', color: 'rgba(255,255,255,0.5)' }}>{row.ages}</td>
                <td style={{ padding: '0.5rem 0 0.5rem 0', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          Age cutoffs vary by league and country  --  some use birth year, others use calendar year. Check with your local program.
        </p>
      </div>
    ),
  },
  {
    id: 'equipment-guide',
    title: 'EQUIPMENT GUIDE',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.65 }}>
          Youth hockey equipment is broadly made by a handful of major brands. We track them in our database  --  here are the ones worth knowing:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
          {[
            { name: 'Bauer', note: 'Largest share of the youth market' },
            { name: 'CCM', note: 'Classic quality, strong in Canada' },
            { name: 'Bauer Vapor', note: 'Lightweight, favored by speedsters' },
            { name: 'Bauer Supreme', note: 'Power-focused, great for shooting' },
            { name: 'Warrior', note: 'Sleek, growing youth popularity' },
            { name: 'True', note: 'Premium, used by pro players too' },
          ].map(brand => (
            <div key={brand.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '5px', padding: '0.75rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', marginBottom: '0.2rem' }}>{brand.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.6875rem', lineHeight: 1.5 }}>{brand.note}</p>
            </div>
          ))}
        </div>
        <Link href="/directory/brands" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--red)', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.25rem' }}>
          View all equipment brands →
        </Link>
      </div>
    ),
  },
  {
    id: 'find-a-program',
    title: 'FIND A PROGRAM NEAR YOU',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.65 }}>
          Youth hockey programs are organized at the local level  --  by city, not by country. We've started building a directory of programs worldwide, from Toronto to Manila.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
          <Link
            href="/directory/youth-hockey/programs?country=Canada"
            className="btn btn-red"
            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '4px' }}
          >
            Canada
          </Link>
          <Link
            href="/directory/youth-hockey/programs?country=USA"
            className="btn btn-red"
            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '4px' }}
          >
            USA
          </Link>
          <Link
            href="/directory/youth-hockey/programs?country=Philippines"
            className="btn btn-red"
            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '4px' }}
          >
            Philippines
          </Link>
          <Link
            href="/directory/youth-hockey/programs"
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '4px' }}
          >
            All Programs →
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: 'for-coaches',
    title: 'FOR COACHES',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.3rem' }}>Best drills for brand new players</p>
          <ul style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <li><strong style={{ color: '#fff' }}>Tunnel skating:</strong> Players skate through a corridor of cones  --  builds balance and edge control</li>
            <li><strong style={{ color: '#fff' }}>Dot-to-dot:</strong> Skate to a face-off dot, stop, push to the next  --  teaches stopping and starting</li>
            <li><strong style={{ color: '#fff' }}>Cross-ice games:</strong> Small-area games on half or quarter ice keep everyone involved and engaged</li>
            <li><strong style={{ color: '#fff' }}>Stickhandling relay:</strong> Dribble the puck through cones  --  fun, builds hand-eye coordination</li>
          </ul>
        </div>
        <div>
          <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.3rem' }}>Practice planning tips</p>
          <ul style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <li>Keep drills short (5-8 min) and cycle frequently  --  young kids lose focus fast</li>
            <li>End every practice with a fun game  --  it's the thing they'll remember</li>
            <li>For Mites and Squirts, the ratio should be 60% games / 40% instruction</li>
            <li>Let kids pick the drill sometimes  --  ownership keeps them coming back</li>
          </ul>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
          We're building a full coaching resources section.{" "}
          <Link href="mailto:support@rinkstop.com" style={{ color: 'var(--red)' }}>Get in touch</Link>{" "}
          if you want to contribute drills or lesson plans.
        </p>
      </div>
    ),
  },
  {
    id: 'global-growth',
    title: 'GLOBAL YOUTH HOCKEY',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.7 }}>
          Hockey is no longer just a North American and Northern European sport. Youth programs are taking root in places you'd least expect  --  and they're growing fast.
        </p>
        {[
          { region: 'Philippines', flag: '🇵🇭', detail: 'With help from the Los Angeles Kings and NHL\'s Hockey Is For Everyone initiative, the Philippines has fielded youth teams in Manila and Cebu. A Filipino kid growing up in Cebu now has a local rink and a league to play in.' },
          { region: 'Southeast Asia', flag: '🌏', detail: 'Thailand, Singapore, and Malaysia have active inline and ice hockey programs. The IIHF has been running development camps in the region since 2015.' },
          { region: 'Africa', flag: '🌍', detail: 'South Africa\'s junior program has been building since 2019. Nigeria and Kenya have started rolling out learn-to-play initiatives through the NHL\'s Explore the Rink program.' },
          { region: 'India', flag: '🇮🇳', detail: 'Delhi and Bangalore have established youth programs, and India sent its first-ever team to the IIHF World Junior Challenge in 2023.' },
        ].map(item => (
          <div key={item.region} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem', alignItems: 'start' }}>
            <span style={{ fontSize: '1.25rem', marginTop: '0.05rem' }}>{item.flag}</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', marginBottom: '0.2rem' }}>{item.region}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', lineHeight: 1.6 }}>{item.detail}</p>
            </div>
          </div>
        ))}
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
          Know of a youth hockey program in a non-traditional market?{" "}
          <Link href="/directory/youth-hockey/programs" style={{ color: 'var(--red)' }}>Add it to our directory.</Link>
        </p>
      </div>
    ),
  },
  {
    id: 'success-stories',
    title: 'SUCCESS STORIES',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'grid', gap: '1rem' }}>
        {[
          {
            name: 'Jesia "J.J." M.  --  Manila, Philippines',
            story: 'Started in a Learn to Play program sponsored by the LA Kings at 6 years old. By 12, she was competing in the Asian Winter Games youth exhibition. Today she coaches the Mite-level program she once started in, passing the game forward to the next generation of Filipino hockey players.',
            tag: 'Philippines',
          },
          {
            name: 'Sam T., born in Ghana, grew up in Toronto',
            story: 'Moved to Canada at age 9, had never seen an ice rink until he arrived. Within three years he was playing rep hockey. He credits his start to a community center program that offered free equipment rental  --  removing the biggest barrier for newcomer families.',
            tag: 'Ghana / Canada',
          },
          {
            name: 'Miranda Chen  --  San Jose, California',
            story: 'Founded the first all-girls hockey program at her high school after being the only girl on her school\'s junior team for two seasons. Today she runs girls-only learn-to-play clinics across the Bay Area and consults for USA Hockey on inclusivity programming.',
            tag: "Girls' Hockey",
          },
        ].map(profile => (
          <div key={profile.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{profile.name}</p>
              <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(255,184,28,0.12)', color: 'var(--gold)', flexShrink: 0 }}>
                {profile.tag}
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', lineHeight: 1.7, fontStyle: 'italic' }}>
              &ldquo;{profile.story}&rdquo;
            </p>
          </div>
        ))}
      </div>
    ),
  },
];

export default function YouthHockeyPage() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1rem 4rem' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', paddingTop: '1.25rem', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Youth Hockey</span>
      </nav>

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #041E42 0%, #0a2744 60%, #112033 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '3px solid var(--red)',
        borderRadius: '8px 8px 0 0',
        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
        marginBottom: '0',
      }}>
        <div className="label" style={{ marginBottom: '0.625rem' }}>New Section</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 0.92, marginBottom: '1rem' }}>
          YOUTH HOCKEY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.875rem, 2vw, 1rem)', maxWidth: '540px', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          Everything you need to know about getting kids on the ice  --  from the first stride to finding the right program, wherever you are in the world.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
          <a href="#getting-started" style={{ background: 'var(--red)', color: '#fff', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none' }}>
            Get Started
          </a>
          <Link href="/directory/youth-hockey/programs" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.5rem 1rem', borderRadius: '4px', border: '1.5px solid rgba(255,255,255,0.2)', textDecoration: 'none' }}>
            Find Programs
          </Link>
        </div>
      </div>

      {/* Intro band */}
      <div style={{
        background: 'var(--s2)',
        borderLeft: '3px solid var(--red)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        borderRadius: '0 0 8px 8px',
        padding: '1.25rem 1.375rem',
        marginBottom: '2rem',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', lineHeight: 1.75, fontStyle: 'italic' }}>
          Hockey teaches kids things team sports rarely do  --  how to recover from a hard fall, how to read a play before it happens, how to trust a teammate you can't see behind you. It's fast, it's physical, and kids who play it tend to grow up knowing how to handle both. That's reason enough. But really, they just love it.
        </p>
      </div>

      {/* Section nav pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} style={{
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.3rem 0.75rem', borderRadius: '3px',
            background: 'var(--s2)', border: '1px solid var(--border)',
            color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s, border-color 0.15s',
          }}>
            {s.title}
          </a>
        ))}
      </div>

      {/* Content Sections */}
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          style={{
            marginBottom: '3rem',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1.25rem',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--red)', flexShrink: 0 }}>{section.icon}</span>
            <h2 className="font-sport" style={{ fontSize: '1.375rem', color: '#fff', letterSpacing: '0.03em' }}>
              {section.title}
            </h2>
          </div>
          {/* Section body */}
          <div style={{ padding: '1.25rem' }}>
            {section.content}
          </div>
        </section>
      ))}

      {/* Bottom CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #C8102E 0%, #9B0D23 100%)',
        borderRadius: '8px',
        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'flex-start',
      }}>
        <h2 className="font-sport" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', color: '#fff', letterSpacing: '0.03em' }}>
          KNOW A YOUTH PROGRAM WE DON&apos;T?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', maxWidth: '460px', lineHeight: 1.6 }}>
          We&apos;re building the most complete global directory of youth hockey programs. If you know of one that should be listed, add it  --  it helps the next parent looking.
        </p>
        <Link href="/directory/youth-hockey/programs" className="btn btn-white" style={{ marginTop: '0.25rem' }}>
          Browse Programs
        </Link>
      </div>
    </div>
  );
}
