/**
 * learn-catalog.ts
 *
 * Single source of truth for the /learn index page and the
 * /sitemap-learn.xml sub-sitemap. Mirrors the /guides-catalog pattern
 * (src/lib/guides-catalog.ts) so the codebase has a consistent shape
 * for the index pages.
 *
 * Last verified: 2026-09-10.
 */

export type LearnCategory =
  | 'fundamentals'
  | 'getting-started'
  | 'skills'
  | 'parenting'
  | 'fan'
  | 'program';

export interface LearnEntry {
  /** URL path (without site origin) */
  href: string;
  /** Display title (short, scannable) */
  title: string;
  /** 1-line description */
  desc: string;
  /** Primary category — drives the section in /learn */
  category: LearnCategory;
  /** ISO date when last content-verified (YYYY-MM-DD) */
  verified: string;
  /** Read time in minutes (for the index card) */
  readTime: number;
  /** Related tools (cross-link from /learn index to /tools) */
  relatedTools?: string[];
  /** Related guides (cross-link from /learn index to /guides) */
  relatedGuides?: string[];
}

/**
 * Existing + new /learn pages. This catalog is the single source of
 * truth — the /learn index page and the /sitemap-learn.xml both render
 * from this array. Adding a new page = one entry here, no UI work.
 */
export const LEARN: LearnEntry[] = [
  // ─── Fundamentals (12 — the core 10 from Phase 1 + the 2 pre-existing) ─
  {
    href: '/learn/hockey-rules',
    title: 'Hockey Rules for Beginners',
    desc: 'Every NHL rule in plain language. Offside, icing, faceoffs, penalties, power plays, and overtime — the 12-minute primer new fans and players need.',
    category: 'fundamentals',
    verified: '2026-09-10',
    readTime: 12,
    relatedGuides: ['/guides/hockey-rules'],
  },
  {
    href: '/learn/hockey-terminology',
    title: 'Hockey Glossary',
    desc: '70+ hockey terms and slang words. From apple, biscuit, and barn to five-hole, tic-tac-toe, and bar down — every beginner hockey term explained.',
    category: 'fundamentals',
    verified: '2026-09-10',
    readTime: 6,
  },
  {
    href: '/learn/hockey-positions-explained',
    title: 'Hockey Positions Explained',
    desc: 'Forwards, defensemen, and goalies — what each position does, how they work together, and the role each plays in a system.',
    category: 'fundamentals',
    verified: '2026-09-10',
    readTime: 8,
    relatedGuides: ['/guides/hockey-positions'],
  },
  {
    href: '/learn/hockey-equipment-guide',
    title: 'Hockey Equipment Guide',
    desc: 'Every piece a hockey player needs: skates, sticks, helmets, pads, and the specialized gear goalies rely on. Head-to-toe for skaters and goalies.',
    category: 'fundamentals',
    verified: '2026-09-10',
    readTime: 12,
    relatedTools: ['/tools/hockey-skate-size-calculator', '/tools/hockey-glove-size-calculator', '/tools/hockey-stick-size-calculator', '/tools/hockey-goalie-gear-sizer'],
    relatedGuides: ['/guides/hockey-stick-guide', '/guides/skate-fitting-guide'],
  },
  {
    href: '/learn/how-to-skate',
    title: 'How to Skate',
    desc: 'A first-time skater\u2019s guide. Hockey stance, stride, balance, falling, getting up. Step-by-step for adults and kids who have never been on ice.',
    category: 'skills',
    verified: '2026-09-10',
    readTime: 15,
    relatedGuides: ['/guides/skating'],
  },
  {
    href: '/learn/stopping',
    title: 'How to Stop on Ice Skates',
    desc: 'Snowplow stop (beginner), one-foot snowplow stop, and the T-stop. The right way to stop without falling.',
    category: 'skills',
    verified: '2026-09-10',
    readTime: 10,
  },
  {
    href: '/learn/crossovers',
    title: 'How to Do Crossovers',
    desc: 'Forward and backward crossovers, the 5-step progression, when to use each, and the moves that let you turn at speed.',
    category: 'skills',
    verified: '2026-09-10',
    readTime: 8,
    relatedGuides: ['/guides/skating'],
  },
  {
    href: '/learn/skate-fitting',
    title: 'How to Fit Hockey Skates',
    desc: 'A step-by-step guide for beginners. Heel lock, toe room, ankle support, the lace test, width, and how to break in new skates.',
    category: 'skills',
    verified: '2026-09-10',
    readTime: 7,
    relatedTools: ['/tools/hockey-skate-size-calculator'],
    relatedGuides: ['/guides/skate-fitting-guide'],
  },
  {
    href: '/learn/stick-fitting',
    title: 'How to Choose a Hockey Stick',
    desc: 'Length by height, flex by weight, blade curves (P92, P88, P28), lie angle, and how to cut a stick to fit.',
    category: 'skills',
    verified: '2026-09-10',
    readTime: 9,
    relatedTools: ['/tools/hockey-stick-size-calculator'],
    relatedGuides: ['/guides/hockey-stick-guide'],
  },
  {
    href: '/learn/face-offs',
    title: 'How to Win Face-offs',
    desc: 'Center technique, wing technique, the grip, stick position, timing, and the rules on what you can and can\u2019t do at the dot.',
    category: 'skills',
    verified: '2026-09-10',
    readTime: 7,
  },
  {
    href: '/learn/passing',
    title: 'How to Pass a Hockey Puck',
    desc: 'Forehand, backhand, saucer, one-touch, give-and-go. The right pass for every situation, with technique breakdowns for each.',
    category: 'skills',
    verified: '2026-09-10',
    readTime: 9,
    relatedGuides: ['/guides/passing'],
  },
  {
    href: '/learn/shooting',
    title: 'How to Shoot a Hockey Puck',
    desc: 'Wrist, snap, slap, backhand. The right shot for every situation, where to aim, and how to practice.',
    category: 'skills',
    verified: '2026-09-10',
    readTime: 10,
    relatedGuides: ['/guides/shooting', '/guides/stickhandling'],
  },,
  // ─── The 10 unique-to-RinkStop pages (Phase 3) ──────────────────────────

  {
    href: '/learn/first-day-on-ice',
    title: 'Your First Day on the Ice',
    desc: 'What to expect at your first learn-to-play session: the parking lot, the dressing room, the ice, and the other parents.',
    category: 'getting-started',
    verified: '2026-09-10',
    readTime: 6,
  },
  {
    href: '/learn/age-to-start-hockey',
    title: 'When Can My Kid Start Hockey?',
    desc: 'The age-by-region answer (USA Hockey ADM, Hockey Canada, IIHF), when to specialize, and when to switch sports.',
    category: 'parenting',
    verified: '2026-09-10',
    readTime: 7,
    relatedTools: ['/tools/junior-eligibility-checker', '/tools/hockey-cost-calculator'],
    relatedGuides: ['/guides/youth-to-junior-hockey', '/guides/youth/usa-hockey-adm-explained'],
  },
  {
    href: '/learn/choosing-a-program',
    title: 'How to Choose a Learn-to-Play Program',
    desc: 'The 7 questions to ask before signing your kid up. Cost, ice time, coach-to-player ratio, what to bring, red flags.',
    category: 'getting-started',
    verified: '2026-09-10',
    readTime: 8,
    relatedGuides: ['/guides/youth/house-vs-travel-hockey', '/guides/hockey-parents-handbook'],
  },
  {
    href: '/learn/hockey-development-pathway',
    title: 'Hockey Development Pathway',
    desc: 'The North American path: Learn to Play → House → Travel → High School → Junior → College → Pro. Each level, what to expect, what it costs.',
    category: 'getting-started',
    verified: '2026-09-10',
    readTime: 12,
    relatedTools: ['/tools/junior-eligibility-checker', '/tools/hockey-cost-calculator'],
    relatedGuides: ['/guides/nhl-draft', '/guides/ncaa-hockey', '/guides/youth-to-junior-hockey'],
  },
  {
    href: '/learn/cost-by-age',
    title: 'Hockey Cost by Age',
    desc: 'What youth hockey costs from 6U to 18U: registration, equipment, ice time, travel. Includes the cost calculator link.',
    category: 'parenting',
    verified: '2026-09-10',
    readTime: 8,
    relatedTools: ['/tools/hockey-cost-calculator'],
    relatedGuides: ['/guides/hockey-parents-handbook'],
  },
  {
    href: '/learn/parent-survival-guide',
    title: 'Hockey Parent Survival Guide',
    desc: 'Day 1, Week 1, Month 1, Season 1. Onboarding for first-time parents: what to bring, what to say (and not say), how to talk to coaches.',
    category: 'parenting',
    verified: '2026-09-10',
    readTime: 10,
    relatedGuides: ['/guides/hockey-parents-handbook'],
  },
  {
    href: '/learn/playing-with-kids',
    title: 'Playing Hockey With Your Kid',
    desc: 'Adult-league intro for parents who never played. How to start, what gear you need, how to find a beginner-friendly beer league near you.',
    category: 'getting-started',
    verified: '2026-09-10',
    readTime: 8,
  },
  {
    href: '/learn/how-to-watch-hockey',
    title: 'How to Watch Hockey',
    desc: 'For new fans: how to follow the play, what the camera is missing, why possession matters, and how to enjoy a game without knowing every rule.',
    category: 'fan',
    verified: '2026-09-10',
    readTime: 7,
  },
  {
    href: '/learn/equipment-on-a-budget',
    title: 'Hockey Equipment on a Budget',
    desc: 'What to buy new vs. used vs. borrow, what to skip, what NOT to cheap out on. Plus the cost calculator link and gear libraries.',
    category: 'parenting',
    verified: '2026-09-10',
    readTime: 7,
    relatedTools: ['/tools/hockey-skate-size-calculator', '/tools/hockey-cost-calculator'],
  },
  {
    href: '/learn/your-first-skate-fit',
    title: 'Your First Skate Fit',
    desc: 'At the store, step-by-step: what to ask the fitter, what to look for, what to walk away from, and what to do if the first pair doesn\u2019t work.',
    category: 'getting-started',
    verified: '2026-09-10',
    readTime: 6,
    relatedTools: ['/tools/hockey-skate-size-calculator'],
    relatedGuides: ['/guides/skate-fitting-guide'],
  },
  // ─── Pre-existing /learn pages (not in PR #1 catalog originally) ─────
  {
    href: '/learn/hockey-cost-explained',
    title: 'How Much Does Hockey Cost?',
    desc: 'A complete cost guide for parents and players. The real costs of hockey by age, level, and region — registration, equipment, ice time, travel, and the hidden expenses most people forget.',
    category: 'parenting',
    verified: '2026-09-10',
    readTime: 8,
    relatedTools: ['/tools/hockey-cost-calculator'],
    relatedGuides: ['/guides/hockey-parents-handbook'],
  },
  {
    href: '/learn/hockey-development-explained',
    title: 'How Hockey Development Works',
    desc: 'Pathways from youth to pro. The seven levels of hockey development, what to expect at each, and how to plan a realistic long-term path for a developing player.',
    category: 'getting-started',
    verified: '2026-09-10',
    readTime: 9,
    relatedTools: ['/tools/junior-eligibility-checker'],
    relatedGuides: ['/guides/nhl-draft', '/guides/ncaa-hockey', '/guides/youth-to-junior-hockey'],
  },
];

export const LEARN_CATEGORIES: { id: LearnCategory; title: string; subtitle: string; icon: string }[] = [
  { id: 'getting-started', title: 'Getting Started', subtitle: 'Your first day, your first program, your first skate', icon: '🥇' },
  { id: 'fundamentals', title: 'Hockey Fundamentals', subtitle: 'Rules, positions, equipment, terminology', icon: '📖' },
  { id: 'skills', title: 'Skills & Technique', subtitle: 'Skating, stopping, passing, shooting, stick-fitting', icon: '⛸️' },
  { id: 'parenting', title: 'For Parents', subtitle: 'When to start, what it costs, how to choose a program', icon: '👪' },
  { id: 'fan', title: 'For New Fans', subtitle: 'How to watch, how to follow the play, how to enjoy a game', icon: '📺' },
  { id: 'program', title: 'Programs & Leagues', subtitle: 'Find a learn-to-play, a youth league, an adult league', icon: '🏒' },
];

export function learnByCategory(c: LearnCategory): LearnEntry[] {
  return LEARN.filter((l) => l.category === c);
}

/** Total guide count for the index header. */
export const LEARN_TOTAL = LEARN.length;
