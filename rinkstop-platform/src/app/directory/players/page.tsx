'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const POSITIONS = [
  { value: 'goalie', label: 'Goalie' },
  { value: 'defenseman', label: 'Defenseman' },
  { value: 'forward', label: 'Forward' },
];

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (position) params.set('position', position);
    if (country) params.set('country', country);
    fetch(`/api/players?${params}`).then(r => r.json()).then(d => {
      setPlayers(d.data || []);
      setLoading(false);
    });
  }, [search, position, country]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Players</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-16"></div>
      <div className="flex gap-4 mb-6 flex-wrap">
        <input type="text" placeholder="Search by name..." value={search}
          onChange={e => setSearch(e.target.value)} className="input-field flex-1 min-w-[200px]" />
        <select value={position} onChange={e => setPosition(e.target.value)} className="select-field w-48">
          <option value="">All Positions</option>
          {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <input type="text" placeholder="Nationality" value={country}
          onChange={e => setCountry(e.target.value)} className="input-field w-40" />
      </div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p: any) => (
            <Link key={p.id} href={`/directory/players/${p.id}`} className="card-default p-5">
              <div className="flex items-center gap-3">
                {p.headshot_url ? (
                  <img src={p.headshot_url} alt="" className="w-12 h-12 rounded-full object-cover bg-slate-700 ring-2 ring-teal-500/30" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl">🏒</div>
                )}
                <div>
                  <h3 className="font-semibold text-white">{p.first_name} {p.last_name}</h3>
                  <p className="text-slate-500 text-sm">{p.position?.replace('_', ' ')} #{p.jersey_number}</p>
                </div>
              </div>
              {p.teams?.name && <p className="text-teal-400 text-sm mt-1">{p.teams.name}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}