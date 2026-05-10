'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teams?id=${id}`).then(r => r.json()).then(d => {
      setTeam(d?.data?.[0] || null);
    });
    fetch(`/api/players?teamId=${id}`).then(r => r.json()).then(d => setPlayers(d?.data || []));
    fetch(`/api/fixtures?teamId=${id}`).then(r => r.json()).then(d => setFixtures(d || []));
    setLoading(false);
  }, [id]);

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (!team) return <p className="text-slate-400">Team not found</p>;

  return (
    <div>
      <Link href="/directory/teams" className="text-teal-400 text-sm mb-4 inline-block">&larr; Back to Teams</Link>
      <div className="flex items-center gap-6 mb-6">
        {team.logo_url ? (
          <img src={team.logo_url} alt="" className="w-20 h-20 rounded-xl object-contain bg-slate-700 border-2 border-slate-600" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-slate-700 flex items-center justify-center text-4xl border-2 border-slate-600">🏒</div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-white">{team.name}</h1>
          <p className="text-slate-400 text-lg">{team.city ? `${team.city}, ${team.country}` : team.country}</p>
          {team.leagues?.name && <p className="text-teal-400">{team.leagues.name}</p>}
        </div>
      </div>

      <div className="h-[2px] bg-brand-gradient rounded-full w-32 mb-8"></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800">
          <p className="text-slate-500 text-xs">League</p>
          <p className="text-white font-semibold">{team.leagues?.name || '—'}</p>
        </div>
        <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800">
          <p className="text-slate-500 text-xs">City</p>
          <p className="text-white font-semibold">{team.city || '—'}</p>
        </div>
        <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800">
          <p className="text-slate-500 text-xs">Country</p>
          <p className="text-white font-semibold">{team.country || '—'}</p>
        </div>
        <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800">
          <p className="text-slate-500 text-xs">Roster</p>
          <p className="text-white font-semibold">{players.length}</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4 text-white">Roster</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {players.map((p: any) => (
          <Link key={p.id} href={`/directory/players/${p.id}`} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/50 transition-all">
            <p className="font-semibold text-white">{p.first_name} {p.last_name}</p>
            <p className="text-slate-500 text-sm capitalize">{p.position?.replace('_',' ')} · #{p.jersey_number}</p>
          </Link>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-4 text-white">Fixtures</h2>
      <div className="grid gap-3">
        {fixtures.slice(0, 10).map((f: any) => (
          <div key={f.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="text-center">
              <p className="font-semibold text-white">{f.home?.name}</p>
              <p className="text-2xl font-bold text-white mt-1">{f.home_score ?? '–'}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-xs text-slate-500">{new Date(f.scheduled_at).toLocaleDateString()}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${f.status === 'completed' ? 'text-emerald-400' : 'text-teal-400'}`}>
                {f.status?.replace('_', ' ')}
              </span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-white">{f.away?.name}</p>
              <p className="text-2xl font-bold text-white mt-1">{f.away_score ?? '–'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}