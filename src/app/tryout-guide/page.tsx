import { Metadata } from 'next';
import TryoutGuideForm from '@/components/TryoutGuideForm';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'The Hockey Tryout Survival Guide (Free PDF)',
  description:
    'A 25-page guide for hockey parents. What coaches actually look for, how to prep in 2 weeks, what to say on the car ride home. Free download from a 20-year coach.',
  openGraph: withDefaultOg({
    title: 'The Hockey Tryout Survival Guide',
    description:
      'Free 25-page guide for hockey parents. Written by a 20-year coach. No spam, no upsell — just the guide.',
  }),
};

const PREVIEW_SECTIONS = [
  {
    title: 'What coaches actually evaluate',
    body:
      'It\'s not just skill. Coaches look at 5 things, in this order: skating, hockey sense, work ethic, coachability, and puck skill. Most parents have the order backwards. Learn what coaches really want and how to help your kid show it in 60 minutes.',
  },
  {
    title: 'The 2-week prep plan',
    body:
      'You can\'t build a player in 14 days, but you can sharpen edges, fix equipment, and prioritize rest. Here\'s the realistic prep plan that actually moves the needle — without burning your kid out before they step on the ice.',
  },
  {
    title: 'The 3 things that disqualify kids on the spot',
    body:
      'Not listening. Skating through drills. Bad attitude with refs or teammates. Every coach has a list. This chapter tells you exactly what gets kids cut, and how to make sure your kid doesn\'t make the list.',
  },
  {
    title: 'The car ride home — 5 scripts',
    body:
      'The biggest mistake parents make is debriefing the entire ride home. Here are 5 lines that work better than any TED talk — whether your kid made the team or not.',
  },
  {
    title: 'If they didn\'t make it',
    body:
      'The chapter I wish every parent would read twice. What to say, what not to say, and why "growth mindset" lectures usually backfire. Includes a real story of a kid who got cut and what happened next.',
  },
  {
    title: 'Junior hockey tryouts',
    body:
      'Different game entirely. The kid is half the equation, the family is the other half. Billets, interviews, and the economics of paying to play. Includes the Philippines angle — what it looks like to try out for North American junior hockey from a country with zero rinks.',
  },
];

export default function TryoutGuidePage() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#e2e8f0' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(180deg, #041E42 0%, #0a0a0a 100%)',
        padding: '3rem 1.25rem 2.5rem',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '0.875rem', letterSpacing: '0.15em',
            color: '#FFB81C', margin: '0 0 0.5rem',
          }}>
            FREE PDF · 25 PAGES · 2025-26 EDITION
          </p>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            color: '#fff', margin: '0 0 0.75rem',
            lineHeight: 1, letterSpacing: '0.02em',
          }}>
            THE HOCKEY TRYOUT SURVIVAL GUIDE
          </h1>
          <p style={{
            color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6,
            margin: '0 0 1rem', maxWidth: 600,
          }}>
            What every parent needs to know before, during, and after tryouts.
            Written by a coach with 20 years on the ice — in Chicago, the Philippines,
            and everywhere in between.
          </p>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
            By Coach Arnel Larracas · RinkStop.com
          </p>
        </div>
      </section>

      {/* Body */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.25rem' }}>

        {/* Email form (above the fold for the lead magnet itself) */}
        <div style={{
          background: 'linear-gradient(180deg, #C8102E 0%, #8b0a1e 100%)',
          borderRadius: 12, padding: '1.75rem', marginBottom: '2.5rem',
          boxShadow: '0 4px 24px rgba(200,16,46,0.3)',
        }}>
          <TryoutGuideForm source="tryout_guide" magSource="tryout_guide_v1" />
        </div>

        {/* What's inside */}
        <h2 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em',
          margin: '0 0 1.25rem',
        }}>
          WHAT'S INSIDE
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
          {PREVIEW_SECTIONS.map((s, i) => (
            <div key={s.title} style={{
              background: '#0f0f0f', border: '1px solid #1e1e1e',
              borderRadius: 10, padding: '1.25rem',
              display: 'flex', gap: '1rem',
            }}>
              <div style={{
                flexShrink: 0, width: 36, height: 36,
                background: '#041E42', color: '#FFB81C',
                borderRadius: 8, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.1rem', fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <div>
                <h3 style={{
                  margin: '0 0 0.4rem', color: '#fff',
                  fontSize: '1.05rem', fontWeight: 600,
                }}>
                  {s.title}
                </h3>
                <p style={{
                  margin: 0, color: '#94a3b8',
                  fontSize: '0.9rem', lineHeight: 1.6,
                }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Email form (second CTA at the bottom) */}
        <div style={{
          background: 'linear-gradient(180deg, #C8102E 0%, #8b0a1e 100%)',
          borderRadius: 12, padding: '1.75rem', marginBottom: '2.5rem',
          boxShadow: '0 4px 24px rgba(200,16,46,0.3)',
        }}>
          <TryoutGuideForm source="tryout_guide" magSource="tryout_guide_v1" />
        </div>

        {/* About the author */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e',
          borderRadius: 12, padding: '1.5rem', marginBottom: '2rem',
        }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em',
            margin: '0 0 0.75rem',
          }}>
            ABOUT THE AUTHOR
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>
            Coach Arnel Larracas has been coaching hockey for 20+ years — from mites
            to junior, in Chicago, the Philippines, and everywhere in between. He
            founded RinkStop.com to grow the game in non-traditional markets and
            help parents navigate a sport that can be confusing from the outside.
          </p>
        </div>

        {/* FAQ */}
        <h2 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em',
          margin: '0 0 1rem',
        }}>
          FAQ
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { q: 'Is this guide really free?', a: 'Yes. We ask for your email so we can let you know when we update the guide each season, but you can unsubscribe in one click and we don\'t share your email with anyone.' },
            { q: 'What age is this guide for?', a: 'Mites through 18U. Most of the content applies to any tryout age. There\'s a dedicated section on junior tryouts (16U/18U/NAHL/USHL) at the end.' },
            { q: 'Do I get a real PDF?', a: 'Yes — open the guide in your browser and use "Save as PDF" or "Print to PDF." Works in Chrome, Safari, Firefox. Looks great on phones too.' },
            { q: 'Will I get spammed?', a: 'No. The signup is for the guide plus an occasional email when we add new content. One-click unsubscribe at the bottom of every email.' },
          ].map(({ q, a }) => (
            <details key={q} style={{
              background: '#0f0f0f', border: '1px solid #1e1e1e',
              borderRadius: 8, padding: '1rem 1.25rem',
            }}>
              <summary style={{
                cursor: 'pointer', color: '#fff', fontWeight: 500,
                listStyle: 'none', fontSize: '0.95rem', userSelect: 'none',
              }}>
                {q}
              </summary>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, margin: '0.75rem 0 0' }}>
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
