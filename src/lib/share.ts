// Social sharing helpers.
//
// Two output formats are produced here:
//   1) `buildSharePayload(...)` returns a { title, text, url, image } object
//      for use with the Web Share API (`navigator.share`).
//   2) `buildIntentUrl(platform, payload)` returns a deep-link URL for the
//      platform's intent endpoint (Twitter, Facebook, etc.) used on desktop
//      where the Web Share API is unavailable.
//
// Entity detail pages call `buildSharePayload(...)` server-side and pass
// the result to <SocialActions share={...} />, which renders <ShareButton>.

export type SharePlatform =
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'whatsapp'
  | 'reddit'
  | 'email'
  | 'copy';

export interface SharePayload {
  /** Title for the share dialog. */
  title: string;
  /** Pre-filled text. Used as the tweet body / FB quote / email body / etc. */
  text: string;
  /** Absolute URL being shared. */
  url: string;
  /** Image URL if known. Used for OG previews — not all platforms consume it. */
  image?: string | null;
}

export const SITE_NAME = 'RinkStop';
export const SITE_TAGLINE = 'The global hockey directory';
export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';

/**
 * Build a share payload for a rink.
 */
export function buildRinkShare(rink: {
  name: string;
  slug?: string | null;
  id?: string;
  city?: string | null;
  province_state?: string | null;
  country?: string | null;
}): SharePayload {
  const path = rink.slug
    ? `/directory/rinks/${rink.slug}`
    : `/directory/rinks/${rink.id}`;
  const where = [rink.city, rink.province_state, rink.country].filter(Boolean).join(', ');
  return {
    title: `${rink.name} — ${SITE_NAME}`,
    text: where
      ? `${rink.name} — ice rink in ${where}. Hours, contact info, and more on ${SITE_NAME}.`
      : `${rink.name} on ${SITE_NAME}.`,
    url: `${BASE_URL}${path}`,
  };
}

/**
 * Build a share payload for a team.
 */
export function buildTeamShare(team: {
  name: string;
  slug?: string | null;
  id?: string;
  city?: string | null;
  country?: string | null;
  division?: string | null;
}): SharePayload {
  const path = team.slug ? `/directory/teams/${team.slug}` : `/directory/teams/${team.id}`;
  const loc = [team.city, team.country].filter(Boolean).join(', ');
  const div = team.division ? ` (${team.division})` : '';
  return {
    title: `${team.name} — ${SITE_NAME}`,
    text: loc
      ? `${team.name}${div} — ${loc} hockey team. Roster, schedule, and stats on ${SITE_NAME}.`
      : `${team.name}${div} on ${SITE_NAME}.`,
    url: `${BASE_URL}${path}`,
  };
}

/**
 * Build a share payload for a player.
 */
export function buildPlayerShare(player: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  id: string;
  position?: string | null;
  team_name?: string | null;
}): SharePayload {
  const name =
    player.full_name ||
    `${player.first_name || ''} ${player.last_name || ''}`.trim() ||
    'Hockey player';
  const where = player.team_name ? ` Plays for ${player.team_name}.` : '';
  const pos = player.position ? ` (${player.position})` : '';
  return {
    title: `${name} — ${SITE_NAME}`,
    text: `${name}${pos} on ${SITE_NAME}.${where} Career stats, profile, and more.`,
    url: `${BASE_URL}/directory/players/${player.id}`,
  };
}

/**
 * Build a share payload for a league.
 */
export function buildLeagueShare(league: {
  name: string;
  slug?: string | null;
  id?: string;
  country?: string | null;
  level?: string | null;
}): SharePayload {
  const path = league.slug ? `/directory/leagues/${league.slug}` : `/directory/leagues/${league.id}`;
  const loc = league.country ? ` — ${league.country}` : '';
  const lvl = league.level ? ` (${league.level})` : '';
  return {
    title: `${league.name} — ${SITE_NAME}`,
    text: `${league.name}${lvl}${loc} hockey league on ${SITE_NAME}. Standings, teams, schedule.`,
    url: `${BASE_URL}${path}`,
  };
}

/**
 * Build a share payload for a business listing.
 */
export function buildBusinessShare(listing: {
  business_name: string;
  id: string;
  category?: string | null;
  city?: string | null;
  country?: string | null;
}): SharePayload {
  const where = [listing.city, listing.country].filter(Boolean).join(', ');
  return {
    title: `${listing.business_name} — ${SITE_NAME}`,
    text: where
      ? `${listing.business_name} — ${categoryLabel(listing.category)} in ${where}. Find it on ${SITE_NAME}.`
      : `${listing.business_name} on ${SITE_NAME}.`,
    url: `${BASE_URL}/businesses/${listing.id}`,
  };
}

/**
 * Build a share payload for a user profile.
 * Prefers the public username-based URL; falls back to a search-by-name URL
 * if the user has not yet claimed a username.
 */
export function buildUserShare(user: {
  display_name?: string | null;
  username?: string | null;
  user_id: string;
}): SharePayload {
  const name = user.display_name || user.username || 'Hockey profile';
  const url = user.username
    ? `${BASE_URL}/profile/${user.username}`
    : `${BASE_URL}/directory/users?q=${encodeURIComponent(name)}`;
  return {
    title: `${name} — ${SITE_NAME}`,
    text: user.username
      ? `${name} (@${user.username}) on ${SITE_NAME} — the global hockey directory.`
      : `${name} on ${SITE_NAME} — the global hockey directory.`,
    url,
  };
}

function categoryLabel(c?: string | null): string {
  if (!c) return 'Hockey business';
  const map: Record<string, string> = {
    pro_shop: 'Pro shop',
    sharpening: 'Skate sharpening',
    camp: 'Hockey camp',
    training: 'Training facility',
    equipment: 'Equipment retailer',
    other: 'Hockey business',
  };
  return map[c] || 'Hockey business';
}

/**
 * Build a deep-link URL for a specific social platform's share intent.
 * Each platform has its own intent endpoint with different query params.
 */
export function buildIntentUrl(platform: SharePlatform, p: SharePayload): string {
  switch (platform) {
    case 'twitter': {
      // X/Twitter: max 280 chars. text + url is fine; url is shortened.
      const params = new URLSearchParams({ text: `${p.text} ${p.url}` });
      return `https://twitter.com/intent/tweet?${params.toString()}`;
    }
    case 'facebook': {
      // Facebook: sharer.php takes only `u`. Title/text come from OG tags.
      const params = new URLSearchParams({ u: p.url });
      return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
    }
    case 'linkedin': {
      // LinkedIn: sharing/share-offsite takes only `url`. Title from OG.
      const params = new URLSearchParams({ url: p.url });
      return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
    }
    case 'whatsapp': {
      // wa.me: text includes the URL.
      const params = new URLSearchParams({ text: `${p.text} ${p.url}` });
      return `https://wa.me/?${params.toString()}`;
    }
    case 'reddit': {
      // reddit submit: title + url.
      const params = new URLSearchParams({ url: p.url, title: p.title });
      return `https://www.reddit.com/submit?${params.toString()}`;
    }
    case 'email': {
      const params = new URLSearchParams({
        subject: p.title,
        body: `${p.text}\n\n${p.url}`,
      });
      return `mailto:?${params.toString()}`;
    }
    case 'copy':
      // Not a URL — handled in the component via navigator.clipboard.
      return p.url;
  }
}

/**
 * Platforms to show in the desktop share popover, in display order.
 */
export const DESKTOP_PLATFORMS: SharePlatform[] = [
  'twitter',
  'facebook',
  'linkedin',
  'whatsapp',
  'reddit',
  'email',
  'copy',
];

export const PLATFORM_LABELS: Record<SharePlatform, string> = {
  twitter: 'X / Twitter',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  reddit: 'Reddit',
  email: 'Email',
  copy: 'Copy link',
};
