'use client';

/**
 * TopNavQuickLinks — always-visible primary nav row.
 *
 * 2026-10-01 (Arnel directive): the directory was getting 70% of organic
 * clicks but ZERO clicks to /pricing, /passport, /claim-your-listing. The
 * menu panel was 100+ links deep and these high-intent paths were buried
 * in footer columns labeled "Account" and "Company". Now the top nav
 * surfaces the 4 actions most visitors actually want:
 *
 *   - Directory  (find a rink/team/player)
 *   - Scores     (NHL/AHL/PWHL/KHL/Liiga/etc. live)
 *   - News       (recent articles)
 *   - Learn      (beginner guides)
 *
 * On the desktop nav, "Pricing" already lives in the top-right corner
 * (see layout.tsx). This row sits between the logo and Pricing so the 4
 * primary actions + Pricing form the always-visible top-tier. The Menu
 * button still opens the deep dropdown for power navigation (Browse
 * Hockey, Get Listed, Free Tools, About).
 *
 * Hidden on mobile (< 1024px) — the hamburger drawer handles everything
 * small-screen. The CSS class `.nav-quick-links` enforces this in
 * globals.css.
 */
import Link from 'next/link';

const QUICK_LINKS: { href: string; label: string; key: string }[] = [
  { key: 'directory', href: '/directory',         label: 'Directory' },
  { key: 'scores',    href: '/directory/games',  label: 'Scores'    },
  { key: 'news',      href: '/news',              label: 'News'      },
  { key: 'learn',     href: '/learn',             label: 'Learn'     },
];

export default function TopNavQuickLinks() {
  return (
    <nav
      aria-label="Primary"
      className="nav-quick-links"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.125rem',
        flex: 1,
        justifyContent: 'center',
      }}
    >
      {QUICK_LINKS.map((l) => (
        <Link
          key={l.key}
          href={l.href}
          data-top-nav-link={l.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 0.875rem',
            color: 'rgba(255,255,255,0.78)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.01em',
            textDecoration: 'none',
            borderRadius: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}