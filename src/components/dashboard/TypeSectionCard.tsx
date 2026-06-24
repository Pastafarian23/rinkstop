import Link from 'next/link';
// Note: getAccountTypeMeta used to be imported from @/components/AccountTypeBadges,
// but that file is 'use client' and TypeSectionCard is a server component.
// Import from the server-safe helper in @/lib/accountTypeMeta instead.
import { getAccountTypeMeta } from '@/lib/accountTypeMeta';
import type { AccountType } from './dashboardTypes';
import type { TypeSectionData } from './dashboardTypeData';

export interface SectionAction {
  href: string;
  label: string;
  icon: string;
}

interface TypeSectionCardProps {
  type: AccountType;
  primary: AccountType | null;
  data: TypeSectionData;
  username: string | null;
  identityVerified?: boolean; // If user has verified identity (Piece C hardening)
}

// Each type renders ONE section card. The card has a header (type label + primary star),
// a 1-2 line headline number (e.g. "12 rinks", "0 followed teams"), a Quick Actions row,
// and an empty state if applicable. The action set is intentionally small — Phase 1
// is about visibility, not new features. Phase 2/3 fill in the destinations.
function getConfig(t: AccountType, data: TypeSectionData, username: string | null, identityVerified: boolean = true): {
  headline: string;
  cta: SectionAction[];
  empty: { message: string; cta: { href: string; label: string } } | null;
} {
  const profileHref = username ? `/profile/${username}` : '/dashboard/profile';
  switch (t) {
    case 'player':
      return {
        headline: data.player.loaded
          ? 'Your player profile is live'
          : 'Your player profile',
        cta: [
          { href: profileHref, label: 'View public profile', icon: '👁️' },
          { href: '/dashboard/claims', label: 'Claim a record', icon: '✅' },
        ],
        empty: null,
      };
    case 'parent':
      return {
        headline: data.parent.loaded
          ? data.parent.linkedPlayers === 0
            ? "You haven't linked any players yet"
            : `Managing ${data.parent.linkedPlayers} ${data.parent.linkedPlayers === 1 ? 'player' : 'players'}`
          : 'Link a player',
        cta: [
          { href: '/directory/players', label: 'Browse players', icon: '🏒' },
          { href: '/dashboard/claims', label: 'Claim your kid\'s record', icon: '✅' },
        ],
        empty: data.parent.loaded && data.parent.linkedPlayers === 0
          ? { message: "Find your kid's player page and claim it. You can manage their profile, schedule, and team membership from there.", cta: { href: '/directory/players', label: 'Find a player →' } }
          : null,
      };
    case 'coach':
      return {
        headline: data.coach.loaded
          ? data.coach.teamsManaged === 0
            ? "You haven't claimed a team yet"
            : `Coaching ${data.coach.teamsManaged} ${data.coach.teamsManaged === 1 ? 'team' : 'teams'}`
          : 'Your coaching role',
        cta: identityVerified
          ? [
              { href: '/directory/teams', label: 'Find your team', icon: '🏒' },
              { href: '/dashboard/claims', label: 'Claim a team', icon: '✅' },
            ]
          : [
              { href: '/directory/teams', label: 'Find your team', icon: '🏒' },
              { href: '/dashboard/identity', label: 'Verify identity', icon: '🛡️' },
            ],
        empty: data.coach.loaded && data.coach.teamsManaged === 0
          ? { message: 'Claim the team you coach to manage roster, schedule, and incoming parent messages.', cta: { href: '/directory/teams', label: 'Browse teams →' } }
          : null,
      };
    case 'scout':
      return {
        headline: data.scout.loaded
          ? data.scout.followedPlayers === 0
            ? 'No players on your watchlist'
            : `${data.scout.followedPlayers} ${data.scout.followedPlayers === 1 ? 'player' : 'players'} on your watchlist`
          : 'Your watchlist',
        cta: [
          { href: '/directory/players', label: 'Browse players', icon: '🔍' },
          { href: '/dashboard/favorites', label: 'Saved players', icon: '⭐' },
        ],
        empty: data.scout.loaded && data.scout.followedPlayers === 0
          ? { message: 'Follow players to add them to your watchlist. The activity feed will surface their game updates.', cta: { href: '/directory/players', label: 'Find a player →' } }
          : null,
      };
    case 'referee':
      return {
        headline: data.referee.loaded
          ? 'Officiating tools are ready'
          : 'Officiating tools',
        cta: [
          { href: '/directory/teams', label: 'Find a game', icon: '🟥' },
          { href: '/dashboard/support', label: 'Submit game report', icon: '📝' },
        ],
        empty: { message: 'Game reporting and certification tracking are coming in a later phase. For now, find a game and reach the rink through the team page.', cta: { href: '/directory/teams', label: 'Find a team →' } },
      };
    case 'team_admin':
      return {
        headline: data.team_admin.loaded
          ? data.team_admin.teamCount === 0
            ? "You don't manage any teams yet"
            : `Managing ${data.team_admin.teamCount} ${data.team_admin.teamCount === 1 ? 'team' : 'teams'}`
          : 'Your teams',
        cta: [
          { href: '/dashboard/claims', label: 'Claim a team', icon: '✅' },
          { href: '/dashboard/leads', label: 'Team inbox', icon: '📨' },
        ],
        empty: data.team_admin.loaded && data.team_admin.teamCount === 0
          ? { message: 'Claim the team you manage. Roster, schedule, and parent messages will live there.', cta: { href: '/directory/teams', label: 'Browse teams →' } }
          : null,
      };
    case 'league_admin':
      return {
        headline: data.league_admin.loaded
          ? data.league_admin.leagueCount === 0
            ? "You don't run a league yet"
            : `Running ${data.league_admin.leagueCount} ${data.league_admin.leagueCount === 1 ? 'league' : 'leagues'}`
          : 'Your leagues',
        cta: [
          { href: '/dashboard/claims', label: 'Claim a league', icon: '✅' },
          { href: '/directory/leagues', label: 'Browse leagues', icon: '🏆' },
        ],
        empty: data.league_admin.loaded && data.league_admin.leagueCount === 0
          ? { message: 'Claim the league you run to publish standings, divisions, and registration.', cta: { href: '/directory/leagues', label: 'Find a league →' } }
          : null,
      };
    case 'rink_operator':
      return {
        headline: data.rink_operator.loaded
          ? data.rink_operator.rinkCount === 0
            ? "You don't run a rink yet"
            : `Running ${data.rink_operator.rinkCount} ${data.rink_operator.rinkCount === 1 ? 'rink' : 'rinks'}`
          : 'Your rinks',
        cta: [
          { href: '/dashboard/claims', label: 'Claim a rink', icon: '✅' },
          { href: '/dashboard/leads', label: `Leads inbox${data.rink_operator.leads ? ` (${data.rink_operator.leads})` : ''}`, icon: '📨' },
        ],
        empty: data.rink_operator.loaded && data.rink_operator.rinkCount === 0
          ? { message: 'Claim the rink you operate. Hours, photos, and incoming parent inquiries live there.', cta: { href: '/directory/rinks', label: 'Find a rink →' } }
          : null,
      };
    case 'business':
      return {
        headline: data.business.loaded
          ? data.business.listings === 0
            ? "You haven't created a business listing yet"
            : `${data.business.listings} ${data.business.listings === 1 ? 'listing' : 'listings'} live`
          : 'Your business listing',
        cta: [
          { href: '/dashboard/listings', label: 'Manage listings', icon: '🛍️' },
          { href: '/dashboard/leads', label: `Leads inbox${data.business.leads ? ` (${data.business.leads})` : ''}`, icon: '📨' },
        ],
        empty: data.business.loaded && data.business.listings === 0
          ? { message: 'Pro shop, sharpening, or camp? Add a listing to appear in the directory and start receiving leads.', cta: { href: '/dashboard/listings', label: 'Create a listing →' } }
          : null,
      };
    case 'fan':
      return {
        headline: data.fan.loaded
          ? (data.fan.followedTeams + data.fan.followedPlayers) === 0
            ? "You haven't followed anyone yet"
            : `Following ${data.fan.followedTeams} ${data.fan.followedTeams === 1 ? 'team' : 'teams'} and ${data.fan.followedPlayers} ${data.fan.followedPlayers === 1 ? 'player' : 'players'}`
          : 'Your follows',
        cta: [
          { href: '/directory/teams', label: 'Browse teams', icon: '🏒' },
          { href: '/directory/players', label: 'Browse players', icon: '⭐' },
        ],
        empty: data.fan.loaded && (data.fan.followedTeams + data.fan.followedPlayers) === 0
          ? { message: 'Follow teams and players to see their games, posts, and roster moves in your feed.', cta: { href: '/directory/teams', label: 'Find a team →' } }
          : null,
      };
  }
}

export default function TypeSectionCard({ type, primary, data, username, identityVerified = true }: TypeSectionCardProps) {
  const meta = getAccountTypeMeta(type);
  const cfg = getConfig(type, data, username, identityVerified);
  const isPrimary = type === primary;

  return (
    <div
      style={{
        background: '#0f0f0f',
        border: isPrimary ? '1.5px solid #FFB81C' : '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
        position: 'relative',
        boxShadow: isPrimary ? '0 0 0 1px rgba(255,184,28,0.15)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.5rem' }} aria-hidden="true">{meta.emoji}</span>
        <h3
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.05rem',
            color: meta.color,
            letterSpacing: '0.06em',
            margin: 0,
          }}
        >
          {meta.label.toUpperCase()}
        </h3>
        {isPrimary && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0.15rem 0.5rem',
              borderRadius: 999,
              background: 'rgba(255,184,28,0.12)',
              color: '#FFB81C',
              border: '1px solid rgba(255,184,28,0.4)',
            }}
          >
            ⭐ Primary
          </span>
        )}
      </div>

      <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 1rem' }}>
        {cfg.headline}
      </p>

      {cfg.empty ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '0.875rem 1rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', margin: '0 0 0.625rem', lineHeight: 1.45 }}>
            {cfg.empty.message}
          </p>
          <Link
            href={cfg.empty.cta.href}
            style={{
              display: 'inline-block',
              padding: '0.4rem 0.85rem',
              background: 'transparent',
              border: `1px solid ${meta.color}`,
              color: meta.color,
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {cfg.empty.cta.label}
          </Link>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cfg.cta.map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.5rem 0.85rem',
              background: '#141414',
              border: '1px solid #1e1e1e',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <span aria-hidden="true">{a.icon}</span>
            <span>{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
