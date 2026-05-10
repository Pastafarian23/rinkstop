'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function BrandDetail() {
  const { id } = useParams();
  const [brand, setBrand] = useState<any>(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(d => {
      const b = d.find((x: any) => x.id === id);
      setBrand(b || null);
    });
    fetch('/api/teams').then(r => r.json()).then(d => setTeams(d?.data || []));
  }, [id]);

  if (!brand) return <p className="text-slate-400">Loading...</p>;

  const brandTeams = teams.filter((t: any) => t.brand_id === id);

  return (
    <div>
      <Link href="/directory/brands" className="text-teal-400 text-sm mb-4 inline-block">&larr; Back to Brands</Link>
      <div className="flex items-center gap-6 mb-6">
        {brand.logo_url ? (
          <img src={brand.logo_url} alt="" className="w-16 h-16 rounded-lg object-contain bg-slate-700 border-2 border-slate-600" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center text-2xl border-2 border-slate-600">🏷️</div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-white">{brand.name}</h1>
          <p className="text-teal-400 capitalize">{brand.category?.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="h-[2px] bg-brand-gradient rounded-full w-32 mb-8"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
          <h2 className="font-semibold mb-3 text-white">Details</h2>
          <dl className="space-y-2 text-sm">
            {brand.country_of_origin && <div><dt className="text-slate-500">Origin</dt><dd className="text-slate-300">{brand.country_of_origin}</dd></div>}
            {brand.website_url && <div><dt className="text-slate-500">Website</dt><dd><a href={brand.website_url} className="text-teal-400 hover:underline">{brand.website_url}</a></dd></div>}
          </dl>
        </div>
        {brand.description && (
          <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
            <h2 className="font-semibold mb-3 text-white">About</h2>
            <p className="text-slate-300 leading-relaxed">{brand.description}</p>
          </div>
        )}
      </div>
      {brandTeams.length > 0 && (
        <div className="mt-8 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
          <h2 className="font-semibold mb-4 text-white">Teams Using {brand.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {brandTeams.map((t: any) => (
              <Link key={t.id} href={`/directory/teams/${t.id}`} className="bg-slate-800/50 p-3 rounded-lg hover:bg-slate-800 transition-colors">
                <p className="text-white font-medium">{t.name}</p>
                <p className="text-slate-500 text-sm">{t.city ? `${t.city}, ${t.country}` : t.country}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}