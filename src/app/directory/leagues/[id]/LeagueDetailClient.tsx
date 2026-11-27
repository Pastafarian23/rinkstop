'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeagueRelated from '@/components/LeagueRelated';
import SocialActions from '@/components/SocialActions';
import EmailCaptureInline from '@/components/EmailCaptureInline';
import { buildLeagueShare } from '@/lib/share';
import DestinationFeed from '@/components/DestinationFeed';
import { listFromPayload } from '@/lib/league-refresh';
import { interpretLeagueListResponse, LEAGUE_NOT_FOUND_MESSAGE, LEAGUE_ERROR_MESSAGE, LEAGUE_REQUEST_TIMEOUT_MS } from '@/lib/league-load-state';

const BASE_URL = 'https://rinkstop.com';

export default function LeagueDetailClient({
  id,
  initialLeague = null,
  initialFollowersCount = 0,
  viewerIsAdmin = false,
}: {
  id: string;
  initialLeague?: any | null;
  initialFollowersCount?: number;
  viewerIsAdmin?: boolean;
}) {
  // Server-fetched league is the first render, so the H1 is in the initial HTML.
  // The effect below still refreshes it on the client, as before.
  const [league, setLeague] = useState<any>(initialLeague);
  const [teams, setTeams] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const param = String(id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);

    // A failed, malformed, or partial refresh keeps the server-rendered league on screen.
    // Bounded request: a slow or stalled refresh resolves to an error, never an endless Loading.
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), LEAGUE_REQUEST_TIMEOUT_MS) : null;
    fetch('/api/leagues', controller ? { signal: controller.signal } : undefined)
      .then(r => {
        if (!r.ok) return interpretLeagueListResponse(false, null, param);
        return r.json().then(
          (body: unknown) => interpretLeagueListResponse(true, body, param),
          () => interpretLeagueListResponse(false, null, param),
        );
      })
      .then(outcome => {
        if (cancelled) return;
        if (outcome.kind === 'error') {
          // Keep a server-rendered league on screen; only show an error when there is none.
          setLoadMessage(LEAGUE_ERROR_MESSAGE);
          return;
        }
        if (outcome.kind === 'not_found') {
          setLoadMessage(LEAGUE_NOT_FOUND_MESSAGE);
          return;
        }
        const found: any = outcome.league;
        if (isUuid && found.slug && found.slug !== param) {
          window.location.replace(`/directory/leagues/${found.slug}`);
          return;
        }
        setLoadMessage(null);
        setLeague(found);
        fetch(`/api/posts?leagueId=${found.id}&limit=12`)
          .then(r => (r.ok ? r.json() : null))
          .then(p => { if (!cancelled) setArticles(listFromPayload(p)); })
          .catch(() => {});
      })
      .catch(() => { if (!cancelled) setLoadMessage(LEAGUE_ERROR_MESSAGE); })
      .finally(() => { if (timer) clearTimeout(timer); });

    fetch(`/api/teams?leagueId=${param}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setTeams(listFromPayload(d)); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [id]);

  if (!league) {
    // Explicit outcomes only: a message when the league is missing or the request failed.
    if (loadMessage) return <p className="text-slate-400">{loadMessage}</p>;
    return <p className="text-slate-400">Loading...</p>;
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <Breadcrumbs links={[
        { label: 'Directory', href: '/directory' },
        { label: 'Leagues', href: '/directory/leagues' },
        { label: league.name, href: `/directory/leagues/${league.slug || league.id}` },
      ]} />
      <Link href="/directory/leagues" className="text-teal-400 text-sm mb-4 inline-block">&larr; Back to Leagues</Link>
      <div className="flex items-center gap-4 mb-6">
        {league.logo_url && <img src={league.logo_url} alt={`${league.name} logo`} className="w-16 h-16 rounded-lg object-contain bg-slate-700" />}
        <div>
          <h1 className="text-3xl font-bold text-white">{league.name}</h1>
          <p className="text-teal-400 capitalize">{league.level?.replace('_', ' ')}</p>
          <p className="text-slate-400">{league.country}</p>
        </div>
      </div>
      <div className="mb-6">
        <SocialActions
          followeeType="league"
          followeeId={league.id}
          followeeName={league.name}
          favoriteType="league"
          favoriteId={league.id}
          favoriteName={league.name}
          initialFollowersCount={initialFollowersCount}
          share={buildLeagueShare({
            id: league.id,
            name: league.name,
            slug: league.slug,
            country: league.country,
            level: league.level,
          })}
          size="md"
        />
      </div>
      <div className="mb-6">
        <EmailCaptureInline
          pitch={`Get notified when ${league.name} has new articles, announcements, or job postings.`}
          cta="Email me updates"
          entityType="league"
          entityId={league.id}
          entityName={league.name}
          intent="email_capture"
        />
      </div>
      {league.description && <p className="text-slate-300 mb-6">{league.description}</p>}

      {/* Standings link for leagues with automated data */}
      {(league as any).slug && (() => {
        const standingsLeagues = new Set(['nhl', 'ahl', 'pwhl', 'echl', 'khl', 'shl', 'liiga', 'ohl', 'qmjhl', 'ushl', 'whl']);
        if (!standingsLeagues.has((league as any).slug)) return null;
        const season = `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`;
        return (
          <Link
            href={`/directory/leagues/${(league as any).slug}/${season}/standings`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 8, padding: '0.5rem 1rem', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}
          >
            📊 {new Date().getFullYear()}-{String(new Date().getFullYear() + 1).slice(2)} Standings
          </Link>
        );
      })()}
      {league.website_url && (
        <a href={league.website_url} target="_blank" rel="noopener" className="text-teal-400 text-sm mb-6 inline-block hover:underline">
          {league.website_url}
        </a>
      )}

      <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

      {articles.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>Latest Highlights</h2>
            <Link href={`/news?league=${league.slug}`} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>All highlights →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.625rem' }}>
            {articles.map((a: any) => (
              <Link key={a.id} href={`/news/${a.slug}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
                {a.og_image_url && (
                  <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#1a2D45' }}>
                    <img src={a.og_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </div>
                )}
                <div style={{ padding: '0.625rem 0.875rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', lineHeight: 1.3, margin: '0 0 0.25rem' }}>{a.title}</p>
                  {a.subtitle && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, margin: 0 }}>{a.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* League hub posts */}
      {(league as any).id && (
        <LeagueHubSection leagueId={(league as any).id} leagueName={league.name} viewerIsAdmin={viewerIsAdmin} />
      )}

      <LeagueRelated leagueId={league.id} leagueName={league.name} />
    </div>
  );
}

function LeagueHubSection({ leagueId, leagueName, viewerIsAdmin = false }: { leagueId: string; leagueName: string; viewerIsAdmin?: boolean }) {
  return (
    <DestinationFeed
      targetType="league"
      targetId={leagueId}
      name={leagueName}
      viewerIsAdmin={viewerIsAdmin}
      composerLabel={`${leagueName} hub`}
    />
  );
}
