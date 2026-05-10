'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function LeagueDetail() {
  const { id } = useParams();
  const [league, setLeague] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => {
      const l = d.find((x: any) => x.id === id);
      setLeague(l || null);
    });
    fetch(`/api/teams?leagueId=${id}`).then(r => r.json()).then(d => setTeams(d?.data || []));
  }, [id]);

  if (!league) return <p className="text-slate-400">Loading...</p>;

  return (
    <div>
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

      <div className="h-[2px] bg-brand-gradient rounded-full w-32 mb-8"></div>

      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <h2 className="font-semibold mb-4 text-white">Teams ({teams.length})</h2>
        {teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teams.map((t: any) => (
              <Link key={t.id} href={`/directory/teams/${t.id}`} className="bg-slate-800/50 p-3 rounded-lg hover:bg-slate-800 transition-colors">
                <p className="text-white font-medium">{t.name}</p>
                <p className="text-slate-500 text-sm">{t.city ? `${t.city}, ${t.country}` : t.country}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No teams registered yet.</p>
        )}
      </div>
    </div>
  );
}