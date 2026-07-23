/**
 * Workspace registry — single source of truth for the /dashboard hub.
 *
 * Three user-facing workspaces per Arnel's 2026-07-02 directive:
 * - Personal (player/parent/scout/fan + every verified identity)
 * - Organization (coach/team_admin/referee/league_admin)
 * - Business (rink_operator/business)
 *
 * Admin lives on /admin/* and is NOT mounted under /dashboard.
 *
 * Each workspace declares:
 * - id: stable key for tracking
 * - name: display label
 * - description: one-line subtitle
 * - icon: emoji
 * - requiredAccountTypes: account types that unlock this workspace
 *   (empty array = always available, e.g. Personal)
 * - minTier: minimum tier required to USE the workspace (gates
 *   management features inside, but the workspace card is always
 *   visible per Arnel's rule "never hide locked features")
 * - subpages: the existing /dashboard/* subpages that belong here
 *   with their min-tier and gated flag
 */

import { TierName } from '../pricing';

export interface WorkspaceSubpage {
  /** URL path (relative to /dashboard or absolute for non-dashboard paths) */
  href: string;
  /** Display label */
  label: string;
  /** Optional emoji icon */
  emoji?: string;
  /** Minimum tier required to access (null = free / no gate) */
  minTier: TierName | null;
  /** Subtitle shown under the label */
  description?: string;
}

export interface WorkspaceDef {
  id: 'personal' | 'organization' | 'business';
  name: string;
  description: string;
  icon: string;
  /** Account types that unlock this workspace (empty = always available) */
  requiredAccountTypes: string[];
  /** Minimum tier required to USE management features (null = no gate) */
  minTier: TierName | null;
  /** Default CTA target — where the "Open" button goes */
  primaryHref: string;
  /** Subpages that belong to this workspace */
  subpages: WorkspaceSubpage[];
}

export const WORKSPACES: WorkspaceDef[] = [
  {
    id: 'personal',
    name: 'Personal',
    description: 'Your profile, identity, passport, documents, and connections.',
    icon: '👤',
    requiredAccountTypes: [], // every user has Personal
    minTier: null,
    primaryHref: '/dashboard/profile',
    subpages: [
      { href: '/dashboard/profile',       label: 'Profile',            emoji: '👤', minTier: null,                       description: 'Your public profile and account info' },
      { href: '/dashboard/identity',      label: 'Identity',           emoji: '🪪', minTier: 'verified_identity',         description: 'Government-ID verification' },
      { href: '/dashboard/passport',     label: 'Hockey Passport',    emoji: '📋', minTier: 'verified_identity',         description: 'Your career record, team history, stats' },
      { href: '/dashboard/documents',     label: 'Documents',          emoji: '📁', minTier: 'verified_identity',         description: 'Waivers, releases, and shared team documents' },
      { href: '/dashboard/family',        label: 'Family Hub',         emoji: '👨‍👩‍👧', minTier: 'identity_plus',              description: 'Manage linked family accounts' },
      { href: '/dashboard/favorites',     label: 'Favorites',          emoji: '⭐', minTier: null,                       description: 'Saved players, rinks, teams' },
      { href: '/dashboard/inbox',         label: 'Inbox',              emoji: '✉️', minTier: null,                       description: 'Your messages and connection requests' },
      { href: '/dashboard/connections',   label: 'Connections',        emoji: '🤝', minTier: null,                       description: 'People you are connected with' },
      { href: '/dashboard/subscription',  label: 'Subscription',       emoji: '💳', minTier: null,                       description: 'Your current plan and billing' },
      { href: '/dashboard/settings',      label: 'Settings',           emoji: '⚙️', minTier: null,                       description: 'Account, notifications, privacy' },
      { href: '/dashboard/support',       label: 'Support',            emoji: '💬', minTier: null,                       description: 'Get help' },
      { href: '/dashboard/roles',         label: 'Roles & Records',    emoji: '🎭', minTier: null,                       description: 'Add/remove account types' },
    ],
  },
  {
    id: 'organization',
    name: 'Organization',
    description: 'Teams, players, coaches, officials, registrations, finance.',
    icon: '🏒',
    requiredAccountTypes: ['coach', 'team_admin', 'referee', 'league_admin'],
    minTier: 'club_starter',
    primaryHref: '/dashboard/team',
    subpages: [
      { href: '/dashboard/team',          label: 'My Teams',           emoji: '🏒', minTier: 'club_starter',              description: 'Teams you manage' },
      { href: '/dashboard/team/new',      label: 'Create Team',        emoji: '➕', minTier: 'club_starter',              description: 'Start a new team workspace' },
      { href: '/dashboard/coach-feed',    label: 'Coach Feed',         emoji: '📰', minTier: 'club_starter',              description: 'Posts and updates from coaches' },
      { href: '/dashboard/plans',         label: 'Practice Plans',     emoji: '📝', minTier: 'club_pro',                  description: 'Drills, practice plans, sharing' },
      { href: '/dashboard/schedule',      label: 'Schedule',           emoji: '📅', minTier: 'club_starter',              description: 'Team schedule and game calendar' },
      { href: '/dashboard/referee/games', label: 'Referee Games',      emoji: '🟥', minTier: 'club_starter',              description: 'Games you officiate' },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Listings, leads, reviews, bookings for your rink or business.',
    icon: '🏟️',
    requiredAccountTypes: ['rink_operator', 'business'],
    minTier: 'business_listing',
    primaryHref: '/dashboard/listings',
    subpages: [
      { href: '/dashboard/listings',      label: 'My Listings',        emoji: '📋', minTier: 'business_listing',           description: 'Your rink or business listings' },
      { href: '/dashboard/leads',         label: 'Leads',              emoji: '🎯', minTier: 'business_listing',           description: 'Customer inquiries and lead capture' },
      { href: '/dashboard/reviews',       label: 'Reviews',            emoji: '⭐', minTier: 'business_listing',           description: 'Customer reviews and responses' },
    ],
  },
];

/**
 * Determine which workspaces a user has access to based on their account types.
 * A workspace is "unlocked" if either:
 *   - The user has one of the workspace's requiredAccountTypes, OR
 *   - The workspace has no requiredAccountTypes (Personal)
 * A workspace is "fully available" if it's unlocked AND the user has the
 * minTier (or there's no minTier).
 *
 * The card is always VISIBLE per Arnel's "never hide locked features" rule.
 * The 🔒 + opacity + upgrade CTA handle the locked state.
 */
export interface WorkspaceAccess {
  workspace: WorkspaceDef;
  unlocked: boolean;            // user has the right account type
  fullyAvailable: boolean;      // unlocked AND has minTier
  requiredTier: TierName | null;
}

export function getWorkspaceAccess(
  accountTypes: string[],
  userTier: TierName | string | null,
  tierAtLeastFn: (actual: string, min: string) => boolean,
): WorkspaceAccess[] {
  return WORKSPACES.map((ws) => {
    const unlocked =
      ws.requiredAccountTypes.length === 0 ||
      ws.requiredAccountTypes.some((t) => accountTypes.includes(t));
    const fullyAvailable = unlocked && (
      ws.minTier === null ||
      tierAtLeastFn(userTier || 'free', ws.minTier)
    );
    return {
      workspace: ws,
      unlocked,
      fullyAvailable,
      requiredTier: ws.minTier,
    };
  });
}

/** Format a tier name for display (e.g. 'verified_identity' -> 'Verified Identity') */
export function tierDisplayName(tier: TierName | string | null | undefined): string {
  if (!tier) return 'Free';
  const map: Record<string, string> = {
    free: 'Free',
    verified_identity: 'Verified Identity',
    identity_plus: 'Identity Plus',
    club_starter: 'Club Starter',
    club_pro: 'Club Pro',
    club_elite: 'Club Elite',
    league: 'League',
    federation: 'Federation',
    business_listing: 'Business Listing',
    business_plus: 'Business Plus',
  };
  return map[tier] || tier;
}