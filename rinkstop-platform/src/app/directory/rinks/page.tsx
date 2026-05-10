'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RinksPage() {
  const [rinks, setRinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    fetch(`/api/rinks?${params}`).then(r => r.json()).then(d => {
      setRinks(d || []);
      setLoading(false);
    });
  }, [country]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Rinks & Facilities</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-16"></div>
      <div className="mb-6">
        <input type="text" placeholder="Country" value={country}
          onChange={e => setCountry(e.target.value)} className="input-field w-48" />
      </div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rinks.map((r: any) => (
            <Link key={r.id} href={`/directory/rinks/${r.id}`} className="card-default p-5">
              <h3 className="font-semibold text-lg text-white">{r.name}</h3>
              <p className="text-slate-500 text-sm">{r.city ? `${r.city}, ${r.country}` : r.country}</p>
              {r.ice_size && <p className="text-teal-400 text-sm mt-1">{r.ice_size} ice</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}