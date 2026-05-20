'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => { setStats(d || []); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stat entry?')) return;
    await fetch(`/api/stats?id=${id}`, { method: 'DELETE' });
    setStats(stats.filter((s: any) => s.id !== id));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Manage Stats</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 mb-4">
        <p className="text-slate-400 text-sm">
          <strong className="text-teal-400">{stats.length}</strong> stat entries loaded.
          Stats are calculated from individual game records.
        </p>
      </div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-800">
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Player</th>
              <th className="text-center py-3 px-4 text-slate-500 font-medium">G</th>
              <th className="text-center py-3 px-4 text-slate-500 font-medium">A</th>
              <th className="text-center py-3 px-4 text-slate-500 font-medium">PTS</th>
              <th className="text-center py-3 px-4 text-slate-500 font-medium">+/-</th>
              <th className="text-center py-3 px-4 text-slate-500 font-medium">PIM</th>
              <th className="text-center py-3 px-4 text-slate-500 font-medium">SOG</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {stats.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-2 px-4">{s.players?.first_name} {s.players?.last_name}</td>
                  <td className="py-2 px-4 text-center">{s.goals}</td>
                  <td className="py-2 px-4 text-center">{s.assists}</td>
                  <td className="py-2 px-4 text-center font-semibold text-teal-400">{s.points}</td>
                  <td className="py-2 px-4 text-center">{s.plus_minus}</td>
                  <td className="py-2 px-4 text-center">{s.penalty_minutes}</td>
                  <td className="py-2 px-4 text-center">{s.shots_on_goal}</td>
                  <td className="py-2 px-4 text-right">
                    <button onClick={() => handleDelete(s.id)} className="text-brand-crimson hover:text-crimson-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}