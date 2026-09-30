import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { withDefaultOg } from '@/lib/metadata-defaults';
import NewsletterSignup from '@/components/NewsletterSignup';

const supabase = supabaseAdmin;

export const metadata: Metadata = {
  title: { absolute: 'Hockey News — Scores, Highlights & Stories | RinkStop' },
  description:
    'Hockey news today: NHL, AHL, KHL, PWHL, CHL, NCAA, IIHF scores and game recaps. Updated daily from the global hockey directory covering 1,857 rinks, 2,601 teams, 78 countries.',
  keywords: [
    'hockey news', 'hockey news today', 'hockey scores', 'hockey game recap',
    'NHL news', 'AHL news', 'KHL news', 'PWHL news', 'CHL news', 'NCAA hockey news',
    'IIHF news', 'hockey stories',
  ],
  alternates: { canonical: 'https://rinkstop.com/news' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey News — Scores, Highlights & Stories',
    description:
      'Hockey news from NHL, AHL, KHL, PWHL, CHL, NCAA, IIHF. Updated daily.',
    url: 'https://rinkstop.com/news',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey News',
    description:
      'Hockey news from NHL, AHL, KHL, PWHL, CHL, NCAA, IIHF — all from one global hockey directory.',
  },
};

export const revalidate = 1800;
export const dynamicParams = true;

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  published_at?: string | null;
  category?: string | null;
  pillar?: string | null;
  league_id?: string | null;
  team_home_id?: string | null;
  team_away_id?: string | null;
  game_date?: string | null;
  reading_time_minutes?: number | null;
  author_name?: string | null;
}

interface League {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  level: string | null;
}

interface Team {
  id: string;
  name: string;
  home_city: string | null;
  home_country: string | null;
  league_id: string | null;
}

function formatDate(date?: string | null) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return date || ''; }
}

function decodeEntities(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(dateStr);
}

/**
 * NonScoreSection — Renders the "More from RinkStop" pillar section.
 *
 * Renders a list of non-highlights posts (Analysis, Guides, Business, Blog)
 * if any exist, OR an empty-state "Coming soon" panel with an email signup
 * if no non-highlights content exists yet.
 *
 * Extracted into its own component to avoid huge inline JSX that's hard
 * to keep syntactically clean. The NewsletterSignup is a client component
 * so this can render either content or empty state with the same wrapper.
 */
function NonScoreSection({
  pillarGroups,
  leagueById,
  formatDate,
  decodeEntities,
}: {
  pillarGroups: Record<string, Post[]>;
  leagueById: Map<string, League>;
  formatDate: (date?: string | null) => string;
  decodeEntities: (s: string | null | undefined) => string;
}) {
  const nonScorePosts = Object.entries(pillarGroups)
    .filter(([pillar]) => !['highlights'].includes(pillar))
    .filter(([, posts]) => posts.length > 0)
    .flatMap(([pillar, posts]) =>
      posts.slice(0, 3).map((post) => ({ ...post, pillar })),
    );

  return (
    <section
      data-featured-pillars
      aria-label="Featured non-score content"
      style={{ marginBottom: '2.5rem' }}
    >
      <h2
        style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: 'rgba(255,184,28,0.7)',
          textTransform: 'uppercase',
          margin: '0 0 1rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,184,28,0.25)',
        }}
      >
        More from RinkStop — Analysis, Guides, Industry
      </h2>

      {nonScorePosts.length === 0 ? (
        <div
          data-pillar-empty
          style={{
            padding: '2rem 1.5rem',
            background: 'rgba(20,184,166,0.04)',
            border: '1px solid rgba(20,184,166,0.2)',
            borderRadius: 10,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              letterSpacing: '0.22em',
              color: 'rgba(20,184,166,0.7)',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}
          >
            Coming soon
          </div>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 800,
              color: '#fff',
              margin: '0 0 0.5rem',
            }}
          >
            Analysis, guides, and industry coverage
          </h3>
          <p
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.9375rem',
              maxWidth: 560,
              margin: '0 auto 1.25rem',
              lineHeight: 1.55,
            }}
          >
            Beyond scores and recaps. Weekly analysis of NHL/NHLPA, NCAA recruiting, equipment innovation, and the business of hockey.
          </p>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <NewsletterSignup source="news_pillar_announcement" />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {nonScorePosts.map((post) => {
            const league = post.league_id ? leagueById.get(post.league_id) : null;
            const pillarAccent: Record<string, string> = {
              nhl: 'rgba(200,16,46,0.18)',
              blog: 'rgba(20,184,166,0.18)',
              guides: 'rgba(255,184,28,0.18)',
              business: 'rgba(168,85,247,0.18)',
              news: 'rgba(20,184,166,0.18)',
              international: 'rgba(20,184,166,0.18)',
              womens: 'rgba(236,72,153,0.18)',
            };
            const pillarColor: Record<string, string> = {
              nhl: '#FF8FA0',
              blog: '#5EEAD4',
              guides: '#FFB81C',
              business: '#C4B5FD',
              news: '#5EEAD4',
              international: '#5EEAD4',
              womens: '#F472B6',
            };
            const accent = pillarAccent[post.pillar] || 'rgba(255,255,255,0.05)';
            const color = pillarColor[post.pillar] || 'rgba(255,255,255,0.85)';
            return (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                data-pillar-tile={post.pillar}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: accent,
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#fff',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 3,
                        background: 'rgba(0,0,0,0.35)',
                        color: color,
                      }}
                    >
                      {post.pillar}
                    </span>
                    {league && (
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>
                        {league.name}
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                      {formatDate(post.published_at)}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: '1.0625rem',
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.3,
                      margin: '0 0 0.3rem',
                    }}
                  >
                    {decodeEntities(post.title)}
                  </h3>
                  {post.subtitle && (
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.45,
                        margin: 0,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}
                    >
                      {decodeEntities(post.subtitle)}
                    </p>
                  )}
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    color: color,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    alignSelf: 'center',
                  }}
                >
                  Read →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * /news — Hockey news landing page.
 *
 * Information architecture (top to bottom):
 *   1. Hero with date stamp + tagline
 *   2. Filter chips (by league, country, level)
 *   3. Featured story (today's #1, large card)
 *   4. Latest stories list (chronological, last 14 days highlighted)
 *   5. Browse by league (large clickable tiles for top leagues)
 *   6. Weekly digest signup
 *   7. Browse the directory (related surfaces)
 *   8. Older archive
 *
 * Why this structure:
 *   - Filter chips at the top match how news sites are organized (NYT, ESPN).
 *   - Featured story surfaces the most recent publication prominently.
 *   - "Browse by league" lets hockey fans go straight to NHL / AHL / KHL etc.
 *   - Chronological list satisfies "what happened recently" queries.
 */
export default async function NewsPage() {
  // 1. Pull posts + leagues + teams in parallel.
  const [postsRes, leaguesRes, teamsRes] = await Promise.all([
    supabase
      .from('posts')
      .select('id, slug, title, subtitle, published_at, category, pillar, league_id, team_home_id, team_away_id, game_date, reading_time_minutes, author_name')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(80),
    supabase
      .from('leagues')
      .select('id, name, slug, country, level')
      .eq('is_active', true),
    supabase
      .from('team_workspaces')
      .select('id, name, home_city, home_country, league_id')
      .eq('is_active', true)
      .in('visibility', ['public', 'unlisted']),
  ]);

  const posts: Post[] = postsRes.data || [];
  const allLeagues: League[] = leaguesRes.data || [];
  const allTeams: Team[] = teamsRes.data || [];

  // Build lookup maps.
  const leagueById = new Map<string, League>();
  for (const l of allLeagues) leagueById.set(l.id, l);
  const teamById = new Map<string, Team>();
  for (const t of allTeams) teamById.set(t.id, t);

  // 2. Derive league counts from posts (every post has a league_id).
  const leaguePostCounts = new Map<string, { league: League; count: number; latestPost: Post | null }>();
  for (const post of posts) {
    if (!post.league_id) continue;
    const league = leagueById.get(post.league_id);
    if (!league) continue;
    const existing = leaguePostCounts.get(post.league_id);
    if (!existing) {
      leaguePostCounts.set(post.league_id, { league, count: 1, latestPost: post });
    } else {
      existing.count++;
      if (!existing.latestPost || new Date(post.published_at || 0) > new Date(existing.latestPost.published_at || 0)) {
        existing.latestPost = post;
      }
    }
  }

  // Top leagues by post count.
  const topLeagues = Array.from(leaguePostCounts.values())
    .filter((lp) => lp.count >= 1)
    .sort((a, b) => b.count - a.count);

  // Derive level facets: which leagues are professional, junior, college, amateur?
  const levels = {
    professional: topLeagues.filter((lp) => lp.league.level === 'professional').sort((a, b) => b.count - a.count).slice(0, 6),
    junior: topLeagues.filter((lp) => lp.league.level === 'junior').sort((a, b) => b.count - a.count).slice(0, 6),
    college: topLeagues.filter((lp) => lp.league.level === 'college').sort((a, b) => b.count - a.count).slice(0, 6),
    amateur: topLeagues.filter((lp) => !['professional', 'junior', 'college'].includes(lp.league.level || '')).sort((a, b) => b.count - a.count).slice(0, 6),
  };

  // Derive country facets: which countries have content?
  const countryFacets = new Map<string, { code: string; count: number; leagues: League[] }>();
  for (const lp of topLeagues) {
    if (!lp.league.country) continue;
    const code = lp.league.country;
    const existing = countryFacets.get(code);
    if (!existing) {
      countryFacets.set(code, { code, count: lp.count, leagues: [lp.league] });
    } else {
      existing.count += lp.count;
      existing.leagues.push(lp.league);
    }
  }
  const topCountryFacets = Array.from(countryFacets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Group posts by pillar so non-highlights get their own section.
  const pillarGroups: Record<string, Post[]> = {};
  for (const post of posts) {
    const key = (post.pillar || 'highlights').toLowerCase();
    if (!pillarGroups[key]) pillarGroups[key] = [];
    pillarGroups[key].push(post);
  }

  // 3. Today's stories (last 3 days).
  const todayMs = Date.now();
  const threeDaysAgo = todayMs - 3 * 24 * 60 * 60 * 1000;
  const recent = posts.filter((p) => new Date(p.published_at || 0).getTime() > threeDaysAgo);
  const featured = recent[0];
  const restOfRecent = recent.slice(1, 12);
  const older = posts.slice(recent.length, 50);

  // 4. Group recent by date for date labels.
  const byDateGroup: Record<string, Post[]> = {};
  for (const post of restOfRecent) {
    const label = relativeTime(post.published_at);
    if (!byDateGroup[label]) byDateGroup[label] = [];
    byDateGroup[label].push(post);
  }

  // Country aggregation from team home_country, when team_home_id is present.
  const countryCounts = new Map<string, number>();
  for (const post of posts) {
    const homeId = post.team_home_id;
    if (!homeId) continue;
    const team = teamById.get(homeId);
    if (team?.home_country) {
      countryCounts.set(team.home_country, (countryCounts.get(team.home_country) || 0) + 1);
    }
  }
  const topCountries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([code, count]) => ({ code, count }));

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>News</span>
      </nav>

      {/* 1. Hero */}
      <section
        data-news-hero
        style={{
          marginBottom: '2rem',
          padding: '2rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(11,30,63,0.6) 0%, rgba(8,21,46,0.4) 100%)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: 14,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent 0%, #FFB81C 50%, transparent 100%)',
          }}
        />
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.22em',
            color: '#FFB81C',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}
        >
          Hockey news
        </div>
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.01em',
            lineHeight: 1.05,
            margin: '0 0 0.5rem',
          }}
        >
          Every hockey game. Every league. <span style={{ color: '#C8102E' }}>One feed.</span>
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '1.0625rem',
            maxWidth: 720,
            margin: '0 0 1rem',
            lineHeight: 1.55,
          }}
        >
          Scores, highlights, and analysis from NHL, AHL, KHL, PWHL, CHL, NCAA, IIHF, and leagues worldwide.
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.85rem',
            background: 'rgba(255,184,28,0.12)',
            border: '1px solid rgba(255,184,28,0.3)',
            borderRadius: 999,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#FFB81C',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} aria-hidden />
          Updated {featured?.published_at ? relativeTime(featured.published_at) : 'recently'}
        </div>
      </section>

      {/* 2. Filter chips — by league and country */}
      <section
        data-news-filters
        aria-label="Filter news by league or country"
        style={{ marginBottom: '2rem' }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}
        >
          Filter by level
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <Link
            href="/news"
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255,184,28,0.15)',
              border: '1.5px solid rgba(255,184,28,0.5)',
              borderRadius: 999,
              color: '#FFB81C',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            All levels
          </Link>
          {levels.professional.length > 0 && (
            <Link
              href="/directory/leagues?level=professional"
              data-level-pill="professional"
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(200,16,46,0.12)',
                border: '1px solid rgba(200,16,46,0.4)',
                borderRadius: 999,
                color: '#FF8FA0',
                fontSize: '0.8125rem',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Professional <span style={{ opacity: 0.6, marginLeft: 4 }}>· {levels.professional.reduce((s, lp) => s + lp.count, 0)}</span>
            </Link>
          )}
          {levels.junior.length > 0 && (
            <Link
              href="/directory/leagues?level=junior"
              data-level-pill="junior"
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,184,28,0.10)',
                border: '1px solid rgba(255,184,28,0.3)',
                borderRadius: 999,
                color: '#FFB81C',
                fontSize: '0.8125rem',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Junior <span style={{ opacity: 0.6, marginLeft: 4 }}>· {levels.junior.reduce((s, lp) => s + lp.count, 0)}</span>
            </Link>
          )}
          {levels.college.length > 0 && (
            <Link
              href="/directory/leagues?level=college"
              data-level-pill="college"
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(20,184,166,0.10)',
                border: '1px solid rgba(20,184,166,0.3)',
                borderRadius: 999,
                color: '#5EEAD4',
                fontSize: '0.8125rem',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              College <span style={{ opacity: 0.6, marginLeft: 4 }}>· {levels.college.reduce((s, lp) => s + lp.count, 0)}</span>
            </Link>
          )}
          {levels.amateur.length > 0 && (
            <Link
              href="/directory/leagues?level=amateur"
              data-level-pill="amateur"
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 999,
                color: 'rgba(255,255,255,0.85)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Amateur <span style={{ opacity: 0.6, marginLeft: 4 }}>· {levels.amateur.reduce((s, lp) => s + lp.count, 0)}</span>
            </Link>
          )}
        </div>

        {/* Country filter row */}
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            marginTop: '1.5rem',
            marginBottom: '0.75rem',
          }}
        >
          Filter by country
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          {topCountryFacets.map(({ code, count }) => (
            <Link
              key={code}
              href={`/directory/${code.toLowerCase()}`}
              data-country-pill={code}
              style={{
                padding: '0.5rem 0.85rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 999,
                color: 'rgba(255,255,255,0.85)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {code} <span style={{ opacity: 0.5, marginLeft: 4 }}>· {count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured story */}
      {featured && (
        <section
          data-featured-story
          aria-label="Featured story"
          style={{ marginBottom: '2.5rem' }}
        >
          <h2
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.22em',
              color: 'rgba(255,184,28,0.7)',
              textTransform: 'uppercase',
              margin: '0 0 1rem',
            }}
          >
            ⭐ Featured
          </h2>
          <Link
            href={`/news/${featured.slug}`}
            style={{
              display: 'block',
              padding: '2rem 2rem',
              background: 'linear-gradient(135deg, rgba(200,16,46,0.18) 0%, rgba(11,30,63,0.6) 100%)',
              border: '2px solid rgba(200,16,46,0.5)',
              borderRadius: 14,
              textDecoration: 'none',
              color: '#fff',
              transition: 'transform 0.15s, border-color 0.15s',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.75rem',
              }}
            >
              {featured.category && (
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 4,
                    background: '#C8102E',
                    color: '#fff',
                  }}
                >
                  {featured.category}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                {relativeTime(featured.published_at)} · {formatDate(featured.published_at)}
              </span>
              {featured.league_id && leagueById.get(featured.league_id) && (
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,184,28,0.8)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {leagueById.get(featured.league_id)!.name}
                </span>
              )}
            </div>
            <h3
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                margin: '0 0 0.6rem',
                color: '#fff',
              }}
            >
              {decodeEntities(featured.title)}
            </h3>
            {featured.subtitle && (
              <p
                style={{
                  fontSize: '1rem',
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.5,
                  margin: 0,
                  maxWidth: 700,
                }}
              >
                {decodeEntities(featured.subtitle)}
              </p>
            )}
            <div style={{ marginTop: '1.25rem', fontSize: '0.8125rem', fontWeight: 700, color: '#FFB81C', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Read full story →
            </div>
          </Link>
        </section>
      )}

      {/* 4. Latest stories — chronological, grouped by date */}
      {restOfRecent.length > 0 && (
        <section
          data-latest-stories
          aria-label="Latest stories"
          style={{ marginBottom: '2.5rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(255,184,28,0.25)',
            }}
          >
            <h2
              style={{
                fontFamily: 'Bebas Neue, Impact, sans-serif',
                fontSize: '1.5rem',
                color: '#fff',
                letterSpacing: '0.04em',
                margin: 0,
              }}
            >
              LATEST STORIES
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Last 7 days
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {Object.entries(byDateGroup).map(([dateLabel, datePosts]) => (
              <div key={dateLabel}>
                <h3
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    color: dateLabel === 'Today' ? '#FFB81C' : 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    margin: '0 0 0.5rem',
                  }}
                >
                  {dateLabel}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {datePosts.map((post) => {
                    const league = post.league_id ? leagueById.get(post.league_id) : null;
                    return (
                      <Link
                        key={post.id}
                        href={`/news/${post.slug}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.875rem 1.125rem',
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6,
                          textDecoration: 'none',
                          color: 'rgba(255,255,255,0.85)',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {league && (
                              <span style={{
                                fontSize: '0.5625rem',
                                fontWeight: 800,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                padding: '0.1rem 0.4rem',
                                borderRadius: 3,
                                background: 'rgba(255,184,28,0.15)',
                                color: '#FFB81C',
                              }}>
                                {league.name}
                              </span>
                            )}
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#fff',
                            }}>
                              {decodeEntities(post.title)}
                            </span>
                          </div>
                          {post.subtitle && (
                            <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {decodeEntities(post.subtitle)}
                            </span>
                          )}
                        </div>
                        <span style={{ flexShrink: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                          {formatDate(post.published_at)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Browse by league — large tiles */}
      {topLeagues.length > 0 && (
        <section
          data-browse-by-league
          aria-label="Browse by league"
          style={{ marginBottom: '2.5rem' }}
        >
          <h2
            style={{
              fontFamily: 'Bebas Neue, Impact, sans-serif',
              fontSize: '1.5rem',
              color: '#fff',
              letterSpacing: '0.04em',
              margin: '0 0 1rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(255,184,28,0.25)',
            }}
          >
            BROWSE BY LEAGUE
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {topLeagues.map(({ league, count }) => (
              <Link
                key={league.id}
                href={`/directory/leagues/${league.slug}`}
                data-league-tile={league.slug}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  padding: '1rem 1.125rem',
                  background: league.level === 'professional'
                    ? 'rgba(200,16,46,0.08)'
                    : 'rgba(255,184,28,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#fff',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
                    {league.name}
                  </span>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.45rem',
                    borderRadius: 999,
                    background: 'rgba(255,184,28,0.15)',
                    color: '#FFB81C',
                    letterSpacing: '0.04em',
                  }}>
                    {count}
                  </span>
                </div>
                {league.country && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                    {league.country} · {league.level || 'amateur'}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. Browse by country */}
      {topCountries.length > 0 && (
        <section
          data-browse-by-country
          aria-label="Browse news by country"
          style={{ marginBottom: '2.5rem' }}
        >
          <h2
            style={{
              fontFamily: 'Bebas Neue, Impact, sans-serif',
              fontSize: '1.5rem',
              color: '#fff',
              letterSpacing: '0.04em',
              margin: '0 0 1rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(255,184,28,0.25)',
            }}
          >
            BROWSE BY COUNTRY
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            {topCountries.map(({ code, count }) => (
              <Link
                key={code}
                href={`/directory/${code.toLowerCase()}`}
                style={{
                  padding: '0.5rem 0.85rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 999,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {code} <span style={{ opacity: 0.5, marginLeft: 4 }}>· {count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. Weekly digest signup */}
      <section
        data-newsletter
        aria-label="Weekly Hockey Digest"
        style={{
          marginBottom: '2.5rem',
          padding: '2rem 1.5rem',
          background: 'rgba(255,184,28,0.04)',
          border: '1px solid rgba(255,184,28,0.18)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <div style={{
          fontSize: '0.6875rem',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: 'rgba(255,184,28,0.7)',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>
          Weekly digest
        </div>
        <h2 style={{
          fontSize: '1.375rem',
          fontWeight: 800,
          color: '#fff',
          margin: '0 0 0.5rem',
        }}>
          Get the weekly hockey digest
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: '0.9375rem',
          maxWidth: 560,
          margin: '0 auto 1.25rem',
          lineHeight: 1.55,
        }}>
          Every Friday: top stories, biggest games, and the data points that mattered. No spam. Unsubscribe anytime.
        </p>
        <NewsletterSignup source="news_weekly_digest" />
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem' }}>
          Free forever. Used by coaches in 78 countries.
        </div>
      </section>

      {/* 8. Featured non-score content (Analysis, Guides, Business, Blog) */}
      <NonScoreSection
        pillarGroups={pillarGroups}
        leagueById={leagueById}
        formatDate={formatDate}
        decodeEntities={decodeEntities}
      />

      {/* 9. Older archive */}
      {older.length > 0 && (
        <section
          data-archive
          aria-label="Older news archive"
          style={{ marginBottom: '2rem' }}
        >
          <h2
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              margin: '0 0 1rem',
            }}
          >
            Older stories
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {older.map((post) => {
              const league = post.league_id ? leagueById.get(post.league_id) : null;
              return (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: 5,
                    textDecoration: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.8125rem',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {league && (
                      <span style={{
                        fontSize: '0.5625rem',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#FFB81C',
                        marginRight: '0.4rem',
                      }}>
                        {league.name}
                      </span>
                    )}
                    {decodeEntities(post.title)}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                    {formatDate(post.published_at)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 9. Browse the directory */}
      <section
        data-news-crosslinks
        aria-label="More from RinkStop"
        style={{
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
        }}
      >
        <h3 style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          margin: '0 0 1rem',
        }}>
          Explore the directory
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
        }}>
          <Link href="/directory" style={linkCardStyle('#FFB81C')}>
            <div style={linkCardTitleStyle}>Hockey Directory</div>
            <div style={linkCardDescStyle}>1,857 rinks, 2,601 teams, 6,351 players.</div>
          </Link>
          <Link href="/learn" style={linkCardStyle('#C8102E')}>
            <div style={linkCardTitleStyle}>Learn Hockey</div>
            <div style={linkCardDescStyle}>Equipment guides, parent handbooks, FAQ.</div>
          </Link>
          <Link href="/learn/best-hockey-gear" style={linkCardStyle('#14B8A6')}>
            <div style={linkCardTitleStyle}>Best Hockey Gear 2026</div>
            <div style={linkCardDescStyle}>Tested picks for skates, sticks, helmets.</div>
          </Link>
          <Link href="/dataset-license" style={linkCardStyle('#FFB81C')}>
            <div style={linkCardTitleStyle}>Hockey Dataset — $499</div>
            <div style={linkCardDescStyle}>Bulk CSV/JSON for analytics.</div>
          </Link>
        </div>
      </section>
    </div>
  );
}

const linkCardStyle = (accent: string): React.CSSProperties => ({
  padding: '0.875rem 1rem',
  background: 'rgba(255,255,255,0.025)',
  border: `1px solid rgba(255,255,255,0.08)`,
  borderRadius: 6,
  color: '#fff',
  textDecoration: 'none',
});
const linkCardTitleStyle: React.CSSProperties = { fontWeight: 700, marginBottom: '0.2rem' };
const linkCardDescStyle: React.CSSProperties = { fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' };