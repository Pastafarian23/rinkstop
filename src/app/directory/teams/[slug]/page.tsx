import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import TeamDetailClient from './TeamDetailClient';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import { teamPageDecision } from '@/lib/seo';
import { getEntityOwner, getFollowersCount } from '@/lib/ownership';
import { buildTeamShare } from '@/lib/share';

const BASE_URL = 'https://rinkstop.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ slug: string }>;
}

interface TeamRow {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  country: string | null;
  league_id: string | null;
  home_rink_id: string | null;
  logo_url: string | null;
  leagues?: { name: string } | null;
}

interface PlayerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  jersey_number: number | null;
  headshot_url: string | null;
}

/**
 * Fetch team by slug or UUID. If the URL has a UUID, the team may not
 * have a slug yet — we 301-redirect to the canonical /directory/teams/{slug}
 * URL so the address bar is human-readable and SEO-friendly.
 *
 * Uses Supabase directly (not the /api/teams self-call) so we don't burn
 * a serverless roundtrip in the metadata function.
 */
async function fetchTeamBySlugOrId(slug: string): Promise<TeamRow | null> {
  const isUuid = UUID_RE.test(slug);
  if (isUuid) {
    const { data, error } = await supabase
      .from('teams')
      .select('*, leagues(name)')
      .eq('id', slug)
      .maybeSingle();
    if (error || !data) return null;
    return data as TeamRow;
  }
  const { data, error } = await supabase
    .from('teams')
    .select('*, leagues(name)')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as TeamRow;
}

/**
 * Fetch the team + roster in parallel. Returns null if the team is missing
 * (caller should redirect or notFound). The page body is rendered as a
 * client component for the interactive parts (favorites, contact form);
 * the server component just pre-loads the data and injects the schema
 * + canonical via generateMetadata.
 */
interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  published_at: string;
  game_date: string | null;
  og_image_url: string | null;
}

async function fetchTeamArticles(teamId: string, limit: number = 12): Promise<ArticleRow[]> {
  // Latest published articles for this team (home or away).
  // Uses the partial indexes on posts_team_home_id_published_at_idx and
  // posts_team_away_id_published_at_idx (added 2026-06-12).
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, published_at, game_date, og_image_url')
    .eq('status', 'published')
    .or(`team_home_id.eq.${teamId},team_away_id.eq.${teamId}`)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('fetchTeamArticles error:', error);
    return [];
  }
  return (data || []) as ArticleRow[];
}

async function fetchTeamAndRoster(slug: string): Promise<{ team: TeamRow; players: PlayerRow[] } | null> {
  const isUuid = UUID_RE.test(slug);
  const team = await fetchTeamBySlugOrId(slug);
  if (!team) return null;

  // If the URL was a UUID, redirect to the canonical slug. This is the
  // server-side equivalent of the previous client-side UUID redirect.
  if (isUuid && team.slug && team.slug !== slug) {
    redirect(`/directory/teams/${team.slug}`);
  }

  const { data: playersData } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, jersey_number, headshot_url')
    .eq('team_id', team.id)
    .eq('is_active', true)
    .order('jersey_number', { ascending: true, nullsFirst: false })
    .limit(60);

  return { team, players: (playersData || []) as PlayerRow[] };
}

/**
 * Estimate the unique word count the page will render. This is used by
 * generateMetadata to decide whether to apply noindex for thin pages.
 * Server-side — we can't actually count React tree words, so we
 * approximate from data: the rich static copy + the roster.
 */
function estimateTeamUniqueWordCount(team: TeamRow, players: PlayerRow[]): number {
  // Each player contributes ~5 unique words (name + position)
  const playerWords = players.length * 5;
  // Baseline always-rendered sections: header, location, roster header
  const baseline = 30;
  // City/country/captain/etc. add a small amount each
  const fieldBonus =
    (team.city ? 2 : 0) +
    (team.country ? 2 : 0) +
    (team.league_id ? 3 : 0) +
    (team.logo_url ? 1 : 0);
  return playerWords + baseline + fieldBonus;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const result = await fetchTeamAndRoster(slug);
    if (!result) {
      return {
        title: 'Team Not Found',
        robots: { index: false, follow: true },
      };
    }
    const { team, players } = result;

    const location = [team.city, team.country].filter(Boolean).join(', ');
    const leagueName = team.leagues?.name;
    const titleBase = leagueName
      ? `${team.name} Hockey Team | ${leagueName}`
      : `${team.name} Hockey Team`;
    const description = leagueName
      ? `${team.name} (${leagueName}${location ? `, ${location}` : ''}) roster, schedule, home arena, and stats. Follow the team on RinkStop.`
      : `${team.name}${location ? ` (${location})` : ''} roster, schedule, home arena, and stats. Follow the team on RinkStop.`;

    // Phase 1b SEO: noindex for thin team pages
    const fields = ['city', 'country', 'league_id', 'home_rink_id', 'logo_url'];
    const fieldCount = fields.filter(f => (team as any)[f] != null && (team as any)[f] !== '').length;
    const uniqueWordCount = estimateTeamUniqueWordCount(team, players);
    const decision = teamPageDecision(fieldCount, uniqueWordCount);

    return {
      title: titleBase,
      description,
      alternates: {
        canonical: `${BASE_URL}/directory/teams/${team.slug || slug}`,
      },
      robots: { index: decision.indexable, follow: true },
      openGraph: {
        title: titleBase,
        description,
        type: 'website',
        ...(team.logo_url ? { images: [{ url: team.logo_url, width: 200, height: 200, alt: team.name }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: titleBase,
        description,
        ...(team.logo_url ? { images: [team.logo_url] } : {}),
      },
    };
  } catch (err) {
    console.error('Team metadata error:', err);
    return { title: 'Team' };
  }
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const result = await fetchTeamAndRoster(slug);
  const articles = result ? await fetchTeamArticles(result.team.id) : [];
  if (!result) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>Team not found</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>Check the URL or browse all teams.</p>
        <Link href="/directory/teams" style={{ color: 'var(--red)', display: 'block', marginTop: '1rem' }}>← Browse All Teams</Link>
      </div>
    );
  }

  const { team, players } = result;

  // Social: fetch owner + initial follower count in parallel with the team data
  const [owner, initialFollowersCount] = await Promise.all([
    getEntityOwner('team', team.id),
    getFollowersCount('team', team.id),
  ]);

  // JSON-LD: SportsTeam + BreadcrumbList. Server-rendered, no client script injection.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SportsTeam',
        name: team.name,
        sport: 'Ice hockey',
        url: `${BASE_URL}/directory/teams/${team.slug}`,
        ...(team.logo_url ? { logo: team.logo_url } : {}),
        ...(team.leagues?.name ? { memberOf: { '@type': 'SportsOrganization', name: team.leagues.name } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Teams', item: `${BASE_URL}/directory/teams` },
          { '@type': 'ListItem', position: 3, name: team.name, item: `${BASE_URL}/directory/teams/${team.slug}` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Claim this listing — only renders on unclaimed teams. Renders above the
          main team header so the CTA is the first thing an unverified visitor sees. */}
      <ClaimThisListingMount entityType="team" entityId={team.id} entityName={team.name} />
      <TeamDetailClient team={team} players={players} articles={articles} ownerUserId={owner?.userId ?? null} initialFollowersCount={initialFollowersCount} share={buildTeamShare(team)} />
    </>
  );
}
