'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState([]);

  useEffect(() => {
    fetch('/api/teams').then(r => r.json()).then(d => { setTeams(d.data || []); setLoading(false); });
    fetch('/api/leagues').then(r => r.json()).then(d => setLeagues(d || []));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    await fetch(`/api/teams?id=${id}`, { method: 'DELETE' });
    setTeams(teams.filter((t: any) => t.id !== id));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Manage Teams</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <Link href="/admin/teams/new" className="inline-flex items-center gap-2 bg-brand-gradient text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all shadow-md mb-6">+ Add Team</Link>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-800">
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">League</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Country</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {teams.map((t: any) => (
                <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-semibold text-white">{t.name}</td>
                  <td className="py-3 px-4 text-slate-400">{t.leagues?.name}</td>
                  <td className="py-3 px-4 text-slate-400">{t.country}</td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/admin/teams/${t.id}`} className="text-teal-400 mr-3 hover:text-teal-300">Edit</Link>
                    <button onClick={() => handleDelete(t.id)} className="text-brand-crimson hover:text-crimson-300">Delete</button>
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