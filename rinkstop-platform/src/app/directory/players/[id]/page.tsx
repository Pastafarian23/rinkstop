'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import PlayerRelated from '@/components/PlayerRelated';

const BASE_URL = 'https://rinkstop.com';

export default function PlayerDetail() {
  const { id } = useParams();
  const [player, setPlayer] = useState<any>(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players?id=${id}`).then(r => r.json()).then(d => {
      setPlayer(d?.data?.[0] || null);
    });
    fetch(`/api/stats?playerId=${id}`).then(r => r.json()).then(d => setStats(d || []));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!player) return;

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Players', item: `${BASE_URL}/directory/players` },
        { '@type': 'ListItem', position: 3, name: `${player.first_name} ${player.last_name}`, item: `${BASE_URL}/directory/players/${player.id}` },
      ],
    };

    const playerSchema = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: `${player.first_name} ${player.last_name}`,
      url: `${BASE_URL}/directory/players/${player.id}`,
      ...(player.position && { jobTitle: player.position.replace('_', ' ') }),
      ...(player.nationality && { nationality: player.nationality }),
      ...(player.headshot_url && { image: player.headshot_url }),
      ...(player.teams?.name && { memberOf: { '@type': 'SportsTeam', name: player.teams.name } }),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, playerSchema]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [player]);

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (!player) return <p className="text-slate-400">Player not found</p>;

  const POSITIONS: Record<string, string> = {
    goalie: 'Goalie', defenseman: 'Defenseman', left_wing: 'Left Wing',
    right_wing: 'Right Wing', center: 'Center', defense: 'Defense'
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      <Breadcrumbs links={[
        { label: 'Directory', href: '/directory' },
        { label: 'Players', href: '/directory/players' },
        { label: `${player.first_name} ${player.last_name}`, href: `/directory/players/${player.id}` },
      ]} />
      <Link href="/directory/players" className="text-teal-400 text-sm mb-4 inline-block">&larr; Back to Players</Link>
      <div className="flex items-center gap-6 mb-6">
        {player.headshot_url ? (
          <img src={player.headshot_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-teal-500" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-4xl border-2 border-slate-600">🏒</div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-white">{player.first_name} {player.last_name}</h1>
          <p className="text-teal-400 text-lg">#{player.jersey_number} · {POSITIONS[player.position] || player.position}</p>
          <p className="text-slate-400">{player.teams?.name}</p>
          {player.nationality && <p className="text-slate-500 text-sm">{player.nationality}</p>}
        </div>
      </div>

      <div className="h-[2px] bg-brand-gradient rounded-full w-32 mb-8"></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {player.height_cm && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Height</p><p className="text-white font-bold">{player.height_cm}cm</p></div>}
        {player.weight_kg && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Weight</p><p className="text-white font-bold">{player.weight_kg}kg</p></div>}
        {player.shoots && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Shoots</p><p className="text-white font-bold capitalize">{player.shoots}</p></div>}
        {player.catches && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Catches</p><p className="text-white font-bold capitalize">{player.catches}</p></div>}
      </div>

      {/* Related: Current Team, Team Rink, Other Players */}
      <PlayerRelated
        teamId={player.team_id}
        teamName={player.teams?.name || ''}
        teamSlug={player.team_id}
        homeRinkId={player.teams?.home_rink_id}
        homeRinkName={undefined}
      />
    </div>
  );
}