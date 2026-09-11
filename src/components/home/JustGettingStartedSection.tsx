import Link from 'next/link';

/**
 * "Just Getting Started?" cross-link section.
 *
 * Originally inline in src/app/page.tsx. Extracted so it can be placed in
 * different positions on the home page (e.g., earlier for first-time
 * visitors per the 2026-09-11 quality audit, audit item #14).
 *
 * Renders 12 /learn cards in a grid:
 *   - First-time / parent / fan entry points (first-day-on-ice, age, rules)
 *   - Foundational skills (skate, watch)
 *   - Pathway (development, cost, parent-survival)
 *   - Adult / equipment (playing-with-kids, equipment, skate-fit)
 */
const CARDS: Array<{ href: string; emoji: string; title: string; desc: string }> = [
  {
    href: '/learn/first-day-on-ice',
    emoji: '🥇',
    title: 'Your First Day on the Ice',
    desc: 'The walk-through for parents: parking lot, dressing room, ice.',
  },
  {
    href: '/learn/age-to-start-hockey',
    emoji: '👶',
    title: 'When to Start Hockey',
    desc: 'Age-by-region answer + when to specialize.',
  },
  {
    href: '/learn/hockey-rules',
    emoji: '📖',
    title: 'Hockey Rules',
    desc: 'Offside, icing, penalties — the 12-minute primer.',
  },
  {
    href: '/learn/choosing-a-program',
    emoji: '📋',
    title: 'Choosing a Program',
    desc: '7 questions to ask + red flags to avoid.',
  },
  {
    href: '/learn/how-to-skate',
    emoji: '⛸️',
    title: 'How to Skate',
    desc: "First-time skater's guide: stance, stride, glide.",
  },
  {
    href: '/learn/how-to-watch-hockey',
    emoji: '📺',
    title: 'How to Watch Hockey',
    desc: 'For new fans: how to follow the play.',
  },
  {
    href: '/learn/hockey-development-pathway',
    emoji: '🛤️',
    title: 'Development Pathway',
    desc: '7 levels from Learn-to-Play to Pro.',
  },
  {
    href: '/learn/cost-by-age',
    emoji: '💵',
    title: 'Hockey Cost by Age',
    desc: '6U to 18U cost breakdown.',
  },
  {
    href: '/learn/parent-survival-guide',
    emoji: '👪',
    title: 'Parent Survival Guide',
    desc: 'Day 1 to Season 1 — onboarding for new parents.',
  },
  {
    href: '/learn/playing-with-kids',
    emoji: '🏒',
    title: 'Playing With Your Kid',
    desc: 'Adult-league intro for parents who never played.',
  },
  {
    href: '/learn/equipment-on-a-budget',
    emoji: '🛒',
    title: 'Equipment on a Budget',
    desc: 'What to buy new, used, and skip.',
  },
  {
    href: '/learn/your-first-skate-fit',
    emoji: '👟',
    title: 'Your First Skate Fit',
    desc: 'At the store, step by step.',
  },
];

export default function JustGettingStartedSection() {
  return (
    <section
      style={{
        background: '#0D1117',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '2.5rem 0',
      }}
    >
      <div className="container">
        <div className="sec-head">
          <div>
            <div className="label">New to Hockey</div>
            <h2
              className="font-sport"
              style={{
                fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
                color: '#fff',
              }}
            >
              JUST GETTING STARTED?
            </h2>
          </div>
          <Link href="/learn" className="sec-link">
            All learn pages →
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              style={{
                display: 'block',
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                textDecoration: 'none',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{c.emoji}</div>
              <div
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: '0.25rem',
                }}
              >
                {c.title}
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.5,
                }}
              >
                {c.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
