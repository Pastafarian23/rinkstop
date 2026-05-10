'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function RinkDetail() {
  const { id } = useParams();
  const [rink, setRink] = useState<any>(null);
  const [fixtures, setFixtures] = useState([]);

  useEffect(() => {
    fetch('/api/rinks').then(r => r.json()).then(d => {
      const r_ = d.find((x: any) => x.id === id);
      setRink(r_ || null);
    });
    fetch(`/api/fixtures?venueId=${id}`).then(r => r.json()).then(d => setFixtures(d || []));
  }, [id]);

  if (!rink) return <p className="text-slate-400">Loading...</p>;

  return (
    <div>
      <Link href="/directory/rinks" className="text-teal-400 text-sm mb-4 inline-block">&larr; Back to Rinks</Link>
      <h1 className="text-3xl font-bold mb-6 text-white">{rink.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
          <h2 className="font-semibold mb-3 text-white">Details</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Location</dt><dd className="text-slate-300">{rink.city}, {rink.province_state}, {rink.country}</dd></div>
            <div><dt className="text-slate-500">Address</dt><dd className="text-slate-300">{rink.address}</dd></div>
            <div><dt className="text-slate-500">Ice</dt><dd className="text-slate-300">{rink.ice_size} · {rink.surface_type}</dd></div>
            {rink.capacity && <div><dt className="text-slate-500">Capacity</dt><dd className="text-slate-300">{rink.capacity.toLocaleString()}</dd></div>}
          </dl>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
          <h2 className="font-semibold mb-3 text-white">Contact</h2>
          <dl className="space-y-2 text-sm">
            {rink.phone && <div><dt className="text-slate-500">Phone</dt><dd className="text-slate-300">{rink.phone}</dd></div>}
            {rink.email && <div><dt className="text-slate-500">Email</dt><dd className="text-slate-300">{rink.email}</dd></div>}
            {rink.website_url && <div><dt className="text-slate-500">Website</dt><dd><a href={rink.website_url} className="text-teal-400 hover:underline">{rink.website_url}</a></dd></div>}
          </dl>
        </div>
      </div>
      {fixtures.length > 0 && (
        <div className="mt-8 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
          <h2 className="font-semibold mb-4 text-white">Events at this Rink</h2>
          <div className="grid gap-3">
            {fixtures.slice(0, 5).map((f: any) => (
              <div key={f.id} className="bg-slate-800/50 p-3 rounded-lg flex items-center justify-between">
                <p className="text-slate-400 text-sm">{new Date(f.scheduled_at).toLocaleDateString()}</p>
                <p className="text-white font-medium">{f.home?.name} vs {f.away?.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}