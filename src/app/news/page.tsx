import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { withDefaultOg } from '@/lib/metadata-defaults';
import NewsletterSignup from '@/components/NewsletterSignup';
import SocialProof from '@/components/SocialProof';

const supabase = supabaseAdmin;

export const metadata: Metadata = {
  title: { absolute: 'Hockey News Today — Scores, Highlights & Stories | RinkStop' },
  description:
    'Hockey news today: live NHL, AHL, KHL, PWHL, CHL, NCAA, IIHF scores and game recaps. Updated daily from the global hockey directory covering 1,857 rinks, 2,601 teams, 78 countries.',
  keywords: [
    'hockey news', 'hockey news today', 'hockey scores', 'hockey game recap',
    'NHL news', 'AHL news', 'KHL news', 'PWHL news', 'CHL news', 'NCAA hockey news',
    'IIHF news', 'hockey stories',
  ],
  alternates: { canonical: 'https://rinkstop.com/news' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey News Today — Scores, Highlights & Stories',
    description:
      'Hockey news from NHL, AHL, KHL, PWHL, CHL, NCAA, IIHF. Updated daily from the global hockey directory.',
    url: 'https://rinkstop.com/news',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey News Today',
    description:
      'Hockey news from NHL, AHL, KHL, PWHL, CHL, NCAA, IIHF — all from one global hockey directory.',
  },
};

// ISR-cached for 30 minutes — news moves fast but not every minute.
export const revalidate = 1800;
export const dynamicParams = true;

interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  published_at?: string | null;
  category?: string | null;
  reading_time_minutes?: number | null;
  author_name?: string | null;
  og_image_url?: string | null;
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

/**
 * /news — Hockey News Today landing page.
 *
 * Why this page exists (and the value here is real, not invented):
 *   - "Hockey news today" / "hockey scores" type queries are some of the
 *     highest-volume commercial-intent hockey searches.
 *   - AI Overview / Featured Snippet answers cite sources with recent
 *     dated content + clear "what happened today" structure.
 *   - Hockey parents, coaches, and fans check scores daily. Even with
 *     0% conversion rate, traffic compounds because every visitor who
 *     shares an article drives SEO.
 *
 * Layout:
 *   1. Hero: "Today's Hockey" + email capture (weekly digest signup)
 *   2. "Today's Highlights" rail (top 5 most recent)
 *   3. Full post list (latest 30) grouped by category
 *   4. Related surfaces: directory, passport, dataset license
 *
 * Page has zero manual SEO work. The structure (hero + "today" + clear
 * dates + breadcrumbs) is what gets picked up.
 */
export default async function NewsPage() {
  // Pull latest published posts, ordered by date desc.
  const { data: posts } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, published_at, category, reading_time_minutes, author_name, og_image_url')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(60);

  const list: Post[] = posts || [];
  const todays = list.slice(0, 5);
  const rest = list.slice(5);

  // Group remaining posts by category for the lower section.
  const byCategory: Record<string, Post[]> = {};
  for (const p of rest) {
    const c = p.category || 'Other';
    if (!byCategory[c]) byCategory[c] = [];
    byCategory[c].push(p);
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>News</span>
      </nav>

      {/* Hero + email capture */}
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
        {/* Gold accent stripe */}
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
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: '#FFB81C',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>
          Hockey news today
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 2.75rem)',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.01em',
          lineHeight: 1.05,
          margin: '0 0 0.5rem',
        }}>
          Every hockey game. Every league. <span style={{ color: '#C8102E' }}>One feed.</span>
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '1.0625rem',
          maxWidth: 720,
          margin: '0 0 1.5rem',
          lineHeight: 1.55,
        }}>
          Scores, highlights, and analysis from NHL, AHL, KHL, PWHL, CHL, NCAA, IIHF, and leagues worldwide — pulled from the global hockey directory covering 1,857 rinks across 78 countries.
        </p>
        <div style={{
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
          marginBottom: '1.25rem',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} aria-hidden />
          Updated {todays[0]?.published_at ? formatDate(todays[0].published_at) : 'recently'}
        </div>
      </section>

      {/* Email capture — weekly digest */}
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
          letterSpacing: '0.01em',
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
          Every Friday: new rinks tracked, top team moves, biggest games, and the data points that mattered. No spam. Unsubscribe anytime.
        </p>
        <NewsletterSignup source="news_weekly_digest" />
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem' }}>
          Free forever. Used by coaches in 78 countries.
        </div>
      </section>

      {/* Today's highlights — featured rail */}
      <section
        data-todays-highlights
        aria-label="Today's highlights"
        style={{ marginBottom: '2.5rem' }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h2 style={{
            fontFamily: 'Bebas Neue, Impact, sans-serif',
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.04em',
            margin: 0,
          }}>
            TODAY'S HIGHLIGHTS
          </h2>
          <Link
            href="/news/highlights"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#FFB81C',
              textDecoration: 'none',
            }}
          >
            All highlights →
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {todays.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              No highlights published today yet. Check back soon.
            </div>
          ) : (
            todays.map((post, i) => (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                data-today-index={i}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: i === 0
                    ? 'linear-gradient(135deg, rgba(200,16,46,0.12) 0%, rgba(255,184,28,0.04) 100%)'
                    : 'rgba(255,255,255,0.025)',
                  border: i === 0 ? '1px solid rgba(200,16,46,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#fff',
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
              >
                {i === 0 && (
                  <div style={{
                    width: 4,
                    borderRadius: 4,
                    background: '#C8102E',
                    flexShrink: 0,
                  }} aria-hidden />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.35rem',
                  }}>
                    {post.category && (
                      <span style={{
                        fontSize: '0.5625rem',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 3,
                        background: 'rgba(200,16,46,0.18)',
                        color: '#FF8FA0',
                      }}>
                        {post.category}
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.6875rem',
                      color: 'rgba(255,255,255,0.45)',
                    }}>
                      {formatDate(post.published_at)}
                    </span>
                  </div>
                  <h3 style={{
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    margin: 0,
                    color: '#fff',
                  }}>
                    {decodeEntities(post.title)}
                  </h3>
                  {(post.subtitle || post.excerpt) && (
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.45,
                      margin: '0.35rem 0 0',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {decodeEntities(post.subtitle || post.excerpt)}
                    </p>
                  )}
                </div>
                <div style={{ flexShrink: 0, color: 'var(--red, #C8102E)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'center' }}>
                  Read →
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* All recent posts grouped by category */}
      <section
        data-news-archive
        aria-label="Recent hockey news archive"
        style={{ marginBottom: '2.5rem' }}
      >
        <h2 style={{
          fontFamily: 'Bebas Neue, Impact, sans-serif',
          fontSize: '1.5rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 1rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          MORE HOCKEY NEWS
        </h2>

        {rest.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            Archive is empty. Check back as new posts publish.
          </div>
        ) : (
          Object.entries(byCategory).map(([category, catPosts]) => (
            <div
              key={category}
              data-news-category={category}
              style={{ marginBottom: '1.5rem' }}
            >
              <h3 style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                margin: '0 0 0.75rem',
              }}>
                {category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {catPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/news/${post.slug}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 6,
                      textDecoration: 'none',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '0.9375rem',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {decodeEntities(post.title)}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      {formatDate(post.published_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Social proof — drives traffic-to-conversion */}
      <SocialProof variant="compact" />

      {/* Cross-link to other RinkStop surfaces */}
      <section
        data-news-crosslinks
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
        }}
      >
        <h3 style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          margin: '0 0 1rem',
        }}>
          More from RinkStop
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
        }}>
          <Link
            href="/directory"
            style={{
              padding: '0.875rem 1rem',
              background: 'rgba(255,184,28,0.06)',
              border: '1px solid rgba(255,184,28,0.2)',
              borderRadius: 6,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Hockey Directory</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>
              1,857 rinks, 2,601 teams, 6,351 players.
            </div>
          </Link>
          <Link
            href="/learn"
            style={{
              padding: '0.875rem 1rem',
              background: 'rgba(200,16,46,0.06)',
              border: '1px solid rgba(200,16,46,0.2)',
              borderRadius: 6,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Learn Hockey</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>
              Equipment guides, parent handbooks, FAQ.
            </div>
          </Link>
          <Link
            href="/best-hockey-gear"
            style={{
              padding: '0.875rem 1rem',
              background: 'rgba(20,184,166,0.06)',
              border: '1px solid rgba(20,184,166,0.2)',
              borderRadius: 6,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Best Hockey Gear 2026</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>
              Tested picks for skates, sticks, helmets.
            </div>
          </Link>
          <Link
            href="/dataset-license"
            style={{
              padding: '0.875rem 1rem',
              background: 'rgba(255,184,28,0.06)',
              border: '1px solid rgba(255,184,28,0.2)',
              borderRadius: 6,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Hockey Dataset — $499</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>
              Bulk CSV/JSON for analytics.
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}