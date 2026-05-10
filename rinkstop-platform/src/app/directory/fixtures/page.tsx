'use client';
import { useState, useEffect } from 'react';

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fixtures').then(r => r.json()).then(d => {
      setFixtures(d || []);
      setLoading(false);
    });
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusColors: Record<string, string> = {
    scheduled: 'text-slate-500',
    in_progress: 'text-teal-400',
    completed: 'text-emerald-400',
    cancelled: 'text-brand-crimson',
    postponed: 'text-amber-400',
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Fixtures & Results</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-24"></div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="grid grid-cols-1 gap-3">
          {fixtures.map((f: any) => (
            <div key={f.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="text-center">
                <p className="font-semibold text-white">{f.home?.name}</p>
                <p className="text-2xl font-bold text-white mt-1">{f.home_score ?? '–'}</p>
              </div>
              <div className="text-center px-4">
                <p className="text-xs text-slate-500">{formatDate(f.scheduled_at)}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${statusColors[f.status] || 'text-slate-500'}`}>
                  {f.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-center">
                <p className="font-semibold text-white">{f.away?.name}</p>
                <p className="text-2xl font-bold text-white mt-1">{f.away_score ?? '–'}</p>
              </div>
              {f.venue?.name && <p className="text-slate-500 text-xs">{f.venue.name}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}