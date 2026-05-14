'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeagueRelated from '@/components/LeagueRelated';

const BASE_URL = 'https://rinkstop.com';

export default function LeagueDetail() {
  const { id } = useParams();
  const [league, setLeague] = useState<any>(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => {
      const l = d.find((x: any) => x.id === id);
      setLeague(l || null);
    });
    fetch(`/api/teams?leagueId=${id}`).then(r => r.json()).then(d => setTeams(d?.data || []));
  }, [id]);

  useEffect(() => {
    if (!league) return;

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Leagues', item: `${BASE_URL}/directory/leagues` },
        { '@type': 'ListItem', position: 3, name: league.name, item: `${BASE_URL}/directory/leagues/${league.id}` },
      ],
    };

    const leagueSchema = {
      '@context': 'https://schema.org',
      '@type': 'SportsOrganization',
      name: league.name,
      sport: 'Ice hockey',
      url: `${BASE_URL}/directory/leagues/${league.id}`,
      ...(league.alternateName && { alternateName: league.alternateName }),
      ...(league.website_url && { sameAs: [league.website_url] }),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, leagueSchema]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [league]);

  if (!league) return <p className="text-slate-400">Loading...</p>;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      <Breadcrumbs links={[
        { label: 'Directory', href: '/directory' },
        { label: 'Leagues', href: '/directory/leagues' },
        { label: league.name, href: `/directory/leagues/${league.id}` },
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
      {league.description && <p className="text-slate-300 mb-6">{league.description}</p>}
      {league.website_url && (
        <a href={league.website_url} target="_blank" rel="noopener" className="text-teal-400 text-sm mb-6 inline-block hover:underline">
          {league.website_url}
        </a>
      )}

      <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

      <LeagueRelated leagueId={league.id} leagueName={league.name} />
    </div>
  );
}