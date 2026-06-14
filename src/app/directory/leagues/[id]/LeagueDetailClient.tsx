'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeagueRelated from '@/components/LeagueRelated';
import SocialActions from '@/components/SocialActions';
import EmailCaptureInline from '@/components/EmailCaptureInline';
import { buildLeagueShare } from '@/lib/share';

const BASE_URL = 'https://rinkstop.com';

export default function LeagueDetailClient({ id, initialFollowersCount = 0 }: { id: string; initialFollowersCount?: number }) {
  const [league, setLeague] = useState<any>(null);
  const [teams, setTeams] = useState([]);
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    const param = String(id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
    fetch('/api/leagues').then(r => r.json()).then(d => {
      const list = d || [];
      const found = list.find((x: any) => x.slug === param) || list.find((x: any) => x.id === param);
      if (found) {
        if (isUuid && found.slug && found.slug !== param) {
          window.location.replace(`/directory/leagues/${found.slug}`);
          return;
        }
        setLeague(found);
        fetch(`/api/posts?leagueId=${found.id}&limit=12`).then(r => r.json()).then(d => {
          const items = d?.data || d || [];
          setArticles(items);
        }).catch(() => {});
      } else {
        setLeague(null);
      }
    });
    fetch(`/api/teams?leagueId=${param}`).then(r => r.json()).then(d => setTeams(d?.data || []));
  }, [id]);

  if (!league) return <p className="text-slate-400">Loading...</p>;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <Breadcrumbs links={[
        { label: 'Directory', href: '/directory' },
        { label: 'Leagues', href: '/directory/leagues' },
        { label: league.name, href: `/directory/leagues/${league.slug || league.id}` },
      ]} />
      <Link href="/directory/leagues" className="text-teal-400 text-sm mb-4 inline-block">&larr; Back to Leagues</Link>
      <div className="flex items-center gap-4 mb-6">
        {league.logo_url && <img src={league.logo_url} alt="" className="w-16 h-16 rounded-lg object-contain bg-slate-700" />}
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

      <LeagueRelated leagueId={league.id} leagueName={league.name} />
    </div>
  );
}
