'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (country) params.set('country', country);
    fetch(`/api/teams?${params}`).then(r => r.json()).then(d => {
      setTeams(d.data || []);
      setLoading(false);
    });
  }, [search, country]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Teams</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-16"></div>
      <div className="flex gap-4 mb-6 flex-wrap">
        <input type="text" placeholder="Search teams..." value={search}
          onChange={e => setSearch(e.target.value)} className="input-field flex-1 min-w-[200px]" />
        <input type="text" placeholder="Country" value={country}
          onChange={e => setCountry(e.target.value)} className="input-field w-48" />
      </div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t: any) => (
            <Link key={t.id} href={`/directory/teams/${t.id}`} className="card-default p-5">
              <h3 className="font-semibold text-lg text-white">{t.name}</h3>
              <p className="text-slate-500 text-sm">{t.city ? `${t.city}, ${t.country}` : t.country}</p>
              {t.leagues?.name && <p className="text-teal-400 text-sm mt-1">{t.leagues.name}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}