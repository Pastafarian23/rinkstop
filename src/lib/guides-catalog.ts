/**
 * guides-catalog.ts
 *
 * Single source of truth for the /guides index page. Every guide on
 * RinkStop is registered here with its title, description, category,
 * audience, and related tools/FAQ. The /guides page renders this
 * data directly so adding a new guide = one entry here, no UI work.
 *
 * Keeping this in a separate file (not inline in page.tsx) so the
 * catalog can be imported by other surfaces — the sitemap, the home
 * page cross-link section, and future "related guides" widgets.
 *
 * Last verified: 2026-09-10.
 */

export type GuideAudience = 'parents' | 'youth' | 'adult' | 'all' | 'referees' | 'coaches';
export type GuideCategory =
  | 'leagues'
  | 'pathways'
  | 'positions'
  | 'training'
  | 'equipment'
  | 'officiating'
  | 'parenting'
  | 'reference';

export interface GuideEntry {
  /** URL path (without site origin) */
  href: string;
  /** Display title (short, scannable) */
  title: string;
  /** 1-line description (max ~150 chars) */
  desc: string;
  /** Primary category — drives the section in /guides */
  category: GuideCategory;
  /** Target audience — drives the "for parents" / "for adults" filter */
  audience: GuideAudience;
  /** Related tool hrefs (for cross-linking) */
  relatedTools?: string[];
  /** ISO date when last content-verified (YYYY-MM-DD) */
  verified: string;
}

export const GUIDES: GuideEntry[] = [
  // ─── Leagues (8) ─────────────────────────────────────────────────────
  {
    href: '/guides/stanley-cup',
    title: 'Stanley Cup Guide',
    desc: '130 years of history, the playoff format, the trophy itself, Conn Smythe, and how a new champion is crowned each June.',
    category: 'leagues',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/iihf-world-championship',
    title: 'IIHF World Championship Guide',
    desc: 'Format, group stages, knockout rounds, and how national teams qualify for the world\'s largest annual hockey tournament.',
    category: 'leagues',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/ahl',
    title: 'AHL Guide',
    desc: 'The American Hockey League — 32 teams, the Calder Cup, and the primary development league for the NHL.',
    category: 'leagues',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/khl',
    title: 'KHL Guide',
    desc: 'The Kontinental Hockey League — 22 teams across Russia and former Soviet states, the Gagarin Cup, and the largest professional league outside the NHL.',
    category: 'leagues',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/chl',
    title: 'CHL Guide',
    desc: 'The Canadian Hockey League — the OHL, WHL, and QMJHL combine for 60+ teams and the Memorial Cup, the primary NHL feeder.',
    category: 'leagues',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/ushl',
    title: 'USHL Guide',
    desc: 'The only Tier 1 USA Hockey junior league, 16 teams across the Midwest, the Clark Cup, and the primary NCAA pipeline.',
    category: 'leagues',
    audience: 'all',
    relatedTools: ['/tools/junior-eligibility-checker'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/pwhl',
    title: 'PWHL Guide',
    desc: 'The Professional Women\'s Hockey League — 8 teams across the US and Canada, the Walter Cup, and the unified top-tier women\'s pro league launched in 2023.',
    category: 'leagues',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/ncaa-hockey',
    title: 'NCAA Hockey Guide',
    desc: 'Division I and III eligibility, scholarship limits, the recruiting calendar, and how to get noticed by college coaches.',
    category: 'leagues',
    audience: 'all',
    relatedTools: ['/tools/junior-eligibility-checker'],
    verified: '2026-09-10',
  },

  // ─── Pathways (2) ────────────────────────────────────────────────────
  {
    href: '/guides/nhl-draft',
    title: 'NHL Draft Guide',
    desc: 'Eligibility, draft order, combine, scouting, and the path from junior or college hockey to the NHL.',
    category: 'pathways',
    audience: 'all',
    relatedTools: ['/tools/junior-eligibility-checker'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth-to-junior-hockey',
    title: 'Youth to Junior Hockey',
    desc: 'What it takes to make the jump from youth travel hockey to junior leagues — NCAA, CHL, USHL, NAHL.',
    category: 'pathways',
    audience: 'parents',
    relatedTools: ['/tools/junior-eligibility-checker'],
    verified: '2026-09-10',
  },

  // ─── Positions (1) ───────────────────────────────────────────────────
  {
    href: '/guides/hockey-positions',
    title: 'Hockey Positions Guide',
    desc: 'Centers, wings, defense, and goalies — what each position does and how they work together on the ice.',
    category: 'positions',
    audience: 'all',
    verified: '2026-09-10',
  },

  // ─── Training (5) ────────────────────────────────────────────────────
  {
    href: '/guides/skating',
    title: 'Hockey Skating Guide',
    desc: 'The forward stride, edge work, crossovers, stopping, transitions, and the drills that build them.',
    category: 'training',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/shooting',
    title: 'Hockey Shooting Guide',
    desc: 'The four main shots: wrist, snap, slap, and backhand, plus accuracy tips and the drills that build them.',
    category: 'training',
    audience: 'all',
    relatedTools: ['/tools/hockey-stick-size-calculator'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/stickhandling',
    title: 'Hockey Stickhandling Guide',
    desc: 'Puck control, deking, soft hands, and the drills that build puck control.',
    category: 'training',
    audience: 'all',
    relatedTools: ['/tools/hockey-stick-size-calculator'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/passing',
    title: 'Hockey Passing Guide',
    desc: 'Forehand, backhand, saucer, one-touch, give-and-go, and breakouts.',
    category: 'training',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/defensive-play',
    title: 'Hockey Defensive Play Guide',
    desc: 'Positioning, gap control, stick checking, and breaking out.',
    category: 'training',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/goaltending',
    title: 'Goaltending Guide',
    desc: 'The last line of defense: the position, the equipment, the core techniques, and how goalies are developed.',
    category: 'training',
    audience: 'all',
    relatedTools: ['/tools/hockey-goalie-gear-sizer'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/off-ice-hockey-training',
    title: 'Off-Ice Training for Hockey',
    desc: 'The best dryland exercises to build explosive power, edge strength, and durability for hockey players.',
    category: 'training',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/strength-conditioning',
    title: 'Hockey Strength and Conditioning',
    desc: 'Off-ice training for hockey: strength, conditioning, plyometrics, mobility, and age-appropriate programs.',
    category: 'training',
    audience: 'all',
    verified: '2026-09-10',
  },
  {
    href: '/guides/hockey-nutrition',
    title: 'Eating for Hockey Performance',
    desc: 'Nutrition strategies for hockey players: pre-game meals, hydration, and recovery eating.',
    category: 'training',
    audience: 'all',
    verified: '2026-09-10',
  },

  // ─── Equipment (1 top-level + 8 youth + 8 adult = 17) ────────────────
  {
    href: '/guides/skate-fitting-guide',
    title: 'Skate Fitting Guide',
    desc: 'How hockey skates should fit — common sizing mistakes, what to look for at a fitting, and when to size up or down.',
    category: 'equipment',
    audience: 'all',
    relatedTools: ['/tools/hockey-skate-size-calculator'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/hockey-stick-guide',
    title: 'How to Choose a Hockey Stick',
    desc: 'Blade curve, flex, kickpoint, and length — what actually matters when buying a hockey stick.',
    category: 'equipment',
    audience: 'all',
    relatedTools: ['/tools/hockey-stick-size-calculator'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/breaking-in-hockey-gloves',
    title: 'Breaking In New Hockey Gloves',
    desc: 'The best methods to break in new hockey gloves without damaging them.',
    category: 'equipment',
    audience: 'all',
    relatedTools: ['/tools/hockey-glove-size-calculator'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/how-to-fit-hockey-equipment',
    title: 'How to Fit Hockey Equipment (Parents)',
    desc: 'A complete guide for parents fitting their kid\'s first set of hockey equipment — every piece, in order.',
    category: 'equipment',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/adult/how-to-fit-hockey-equipment',
    title: 'How to Fit Hockey Equipment (Adults)',
    desc: 'A complete guide for adult players buying their first or next set of hockey equipment — every piece, in order.',
    category: 'equipment',
    audience: 'adult',
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/helmet-fitting-guide',
    title: 'How to Fit a Hockey Helmet (Parents)',
    desc: 'A parent\'s guide to fitting your kid\'s hockey helmet — the single most important piece of safety equipment.',
    category: 'equipment',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/shoulder-pad-fitting-guide',
    title: 'How to Fit Hockey Shoulder Pads (Parents)',
    desc: 'A parent\'s guide to fitting shoulder pads on a youth player — coverage, mobility, sizing.',
    category: 'equipment',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/elbow-pad-fitting-guide',
    title: 'How to Fit Hockey Elbow Pads (Parents)',
    desc: 'A parent\'s guide to fitting elbow pads on a youth player — protection without restricting movement.',
    category: 'equipment',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/hockey-glove-fitting-guide',
    title: 'How to Fit Hockey Gloves (Parents)',
    desc: 'A parent\'s guide to glove sizing for youth players — hand measurement vs. height-based sizing.',
    category: 'equipment',
    audience: 'parents',
    relatedTools: ['/tools/hockey-glove-size-calculator'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/hockey-pants-fitting-guide',
    title: 'How to Fit Hockey Pants (Parents)',
    desc: 'A parent\'s guide to fitting hockey pants or breezers on a youth player — kidney protection + mobility.',
    category: 'equipment',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/shin-guard-fitting-guide',
    title: 'How to Fit Hockey Shin Guards (Parents)',
    desc: 'A parent\'s guide to shin guard sizing and positioning for youth players — knee + shin coverage.',
    category: 'equipment',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/jock-jill-fitting-guide',
    title: 'How to Fit a Hockey Jock or Jill (Parents)',
    desc: 'A parent\'s guide to the base layer — jock for boys, jill for girls, and the sizing that matters.',
    category: 'equipment',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/how-to-tie-hockey-skates',
    title: 'How to Tie Hockey Skates',
    desc: 'A step-by-step guide for beginners — the lacing pattern that prevents heel lift and protects your ankles.',
    category: 'equipment',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/adult/helmet-fitting-guide',
    title: 'How to Fit a Hockey Helmet (Adults)',
    desc: 'An adult player\'s guide to helmet fit — coverage, adjustment, when to replace.',
    category: 'equipment',
    audience: 'adult',
    verified: '2026-09-10',
  },
  {
    href: '/guides/adult/shoulder-pad-fitting-guide',
    title: 'How to Fit Hockey Shoulder Pads (Adults)',
    desc: 'An adult player\'s guide to shoulder pad fit and coverage.',
    category: 'equipment',
    audience: 'adult',
    verified: '2026-09-10',
  },
  {
    href: '/guides/adult/elbow-pad-fitting-guide',
    title: 'How to Fit Hockey Elbow Pads (Adults)',
    desc: 'An adult player\'s guide to elbow pad fit and mobility.',
    category: 'equipment',
    audience: 'adult',
    verified: '2026-09-10',
  },
  {
    href: '/guides/adult/hockey-glove-fitting-guide',
    title: 'How to Fit Hockey Gloves (Adults)',
    desc: 'An adult player\'s guide to glove sizing — half-size considerations, in-store vs online.',
    category: 'equipment',
    audience: 'adult',
    relatedTools: ['/tools/hockey-glove-size-calculator'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/adult/hockey-pants-fitting-guide',
    title: 'How to Fit Hockey Pants (Adults)',
    desc: 'An adult player\'s guide to hockey pants or a girdle — coverage + mobility tradeoffs.',
    category: 'equipment',
    audience: 'adult',
    verified: '2026-09-10',
  },
  {
    href: '/guides/adult/shin-guard-fitting-guide',
    title: 'How to Fit Hockey Shin Guards (Adults)',
    desc: 'An adult player\'s guide to shin guard sizing and positioning.',
    category: 'equipment',
    audience: 'adult',
    verified: '2026-09-10',
  },
  {
    href: '/guides/adult/jock-jill-fitting-guide',
    title: 'How to Fit a Hockey Jock or Jill (Adults)',
    desc: 'An adult player\'s guide to the base layer — sizing, comfort, and the protection that matters.',
    category: 'equipment',
    audience: 'adult',
    verified: '2026-09-10',
  },

  // ─── Officiating (2) ──────────────────────────────────────────────────
  {
    href: '/guides/officiating',
    title: 'Hockey Officiating Guide',
    desc: 'Referees, linesmen, signals, penalties, and how to become an official at any level.',
    category: 'officiating',
    audience: 'referees',
    verified: '2026-09-10',
  },
  {
    href: '/guides/hockey-rules',
    title: 'Hockey Rules Explained',
    desc: 'Every NHL rule in plain language — from icing to offsides, power plays to penalty shots.',
    category: 'officiating',
    audience: 'all',
    verified: '2026-09-10',
  },

  // ─── Parenting (2) ────────────────────────────────────────────────────
  {
    href: '/guides/hockey-parents-handbook',
    title: 'Hockey Parent\'s Handbook',
    desc: 'What to expect at your kid\'s first hockey season — from equipment to game day etiquette. A parent\'s guide from Mites to Midgets.',
    category: 'parenting',
    audience: 'parents',
    relatedTools: ['/tools/hockey-cost-calculator'],
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/house-vs-travel-hockey',
    title: 'House vs Travel Hockey',
    desc: 'How to choose the right level — recreational house, select, or travel/AAA — for your kid\'s age and commitment.',
    category: 'parenting',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/youth/usa-hockey-adm-explained',
    title: 'USA Hockey\'s ADM Explained',
    desc: 'The American Development Model — what the 8 stages look like, the 10 guiding principles, and why early specialization hurts.',
    category: 'parenting',
    audience: 'parents',
    verified: '2026-09-10',
  },
  {
    href: '/guides/hockey-tryout-guide',
    title: 'Hockey Tryout Guide',
    desc: 'How to prepare for hockey tryouts at every level — youth, high school, junior, college, and adult leagues.',
    category: 'parenting',
    audience: 'all',
    verified: '2026-09-10',
  },

  // ─── Reference (1) ───────────────────────────────────────────────────
  {
    href: '/guides/rinkstop-vs-competitors',
    title: 'RinkStop vs SportsEngine, Hudl, Yelp & LinkedIn (2026 Pricing)',
    desc: 'A 2026 pricing comparison of RinkStop vs the closest alternatives for hockey directories, team management, and listings.',
    category: 'reference',
    audience: 'all',
    verified: '2026-09-10',
  },
];

export const GUIDE_CATEGORIES: { id: GuideCategory; title: string; subtitle: string; icon: string }[] = [
  { id: 'parenting', title: 'For Parents', subtitle: 'First-year survival, choosing the right level, and the long view', icon: '👪' },
  { id: 'leagues', title: 'Leagues & Competitions', subtitle: 'How every major league and tournament works', icon: '🏆' },
  { id: 'pathways', title: 'Player Pathways', subtitle: 'From youth travel to junior and the NHL Draft', icon: '🛤️' },
  { id: 'positions', title: 'Positions', subtitle: 'What every player on the ice does', icon: '🏒' },
  { id: 'training', title: 'Training & Skills', subtitle: 'Skating, shooting, stickhandling, and off-ice work', icon: '⛸️' },
  { id: 'equipment', title: 'Equipment & Fit', subtitle: 'How to fit every piece, with separate guides for parents and adult players', icon: '🛡️' },
  { id: 'officiating', title: 'Officiating & Rules', subtitle: 'How the game is governed, and how to become an official', icon: '🥅' },
  { id: 'reference', title: 'Reference', subtitle: 'Pricing comparisons and editorial context', icon: '📊' },
];

export function guidesByCategory(c: GuideCategory): GuideEntry[] {
  return GUIDES.filter((g) => g.category === c);
}
