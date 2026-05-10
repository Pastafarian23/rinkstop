import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('');
  const [level, setLevel] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (level) params.set('level', level);
    fetch(`/api/leagues?${params}`).then(r => r.json()).then(d => {
      setLeagues(d || []);
      setLoading(false);
    });
  }, [country, level]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Leagues</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-16"></div>
      <div className="flex gap-4 mb-6 flex-wrap">
        <input type="text" placeholder="Country" value={country}
          onChange={e => setCountry(e.target.value)} className="input-field w-48" />
        <select value={level} onChange={e => setLevel(e.target.value)} className="select-field w-48">
          <option value="">All Levels</option>
          <option value="professional">Professional</option>
          <option value="junior">Junior</option>
          <option value="amateur">Amateur</option>
          <option value="youth">Youth</option>
          <option value="recreational">Recreational</option>
        </select>
      </div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leagues.map((l: any) => (
            <Link key={l.id} href={`/directory/leagues/${l.id}`} className="card-default p-5">
              <h3 className="font-semibold text-lg text-white">{l.name}</h3>
              <p className="text-slate-500 text-sm">{l.country} · {l.level?.replace('_',' ')}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}