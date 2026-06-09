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
      <div className="page-header">
        <h1><span aria-hidden="true">📈</span> Stats</h1>
        <p>Player stats by season — calculated from individual game records.</p>
      </div>
      <div className="admin-card p-4 mb-4" style={{ marginBottom: '1rem' }}>
        <p className="text-slate-400 text-sm">
          <strong className="text-teal-400">{stats.length}</strong> stat entries loaded.
        </p>
      </div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="text-left py-3 px-4">Player</th>
                <th className="text-center py-3 px-4">G</th>
                <th className="text-center py-3 px-4">A</th>
                <th className="text-center py-3 px-4">PTS</th>
                <th className="text-center py-3 px-4">+/-</th>
                <th className="text-center py-3 px-4">PIM</th>
                <th className="text-center py-3 px-4">SOG</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr></thead>
              <tbody>
                {stats.map((s: any) => (
                  <tr key={s.id}>
                    <td className="py-2 px-4 text-white">{s.players?.first_name} {s.players?.last_name}</td>
                    <td className="py-2 px-4 text-center text-slate-300">{s.goals}</td>
                    <td className="py-2 px-4 text-center text-slate-300">{s.assists}</td>
                    <td className="py-2 px-4 text-center font-semibold text-teal-400">{s.points}</td>
                    <td className="py-2 px-4 text-center text-slate-300">{s.plus_minus}</td>
                    <td className="py-2 px-4 text-center text-slate-300">{s.penalty_minutes}</td>
                    <td className="py-2 px-4 text-center text-slate-300">{s.shots_on_goal}</td>
                    <td className="py-2 px-4 text-right">
                      <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}