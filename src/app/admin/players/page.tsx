'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(d => { setPlayers(d.data || []); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this player?')) return;
    await fetch(`/api/players?id=${id}`, { method: 'DELETE' });
    setPlayers(players.filter((p: any) => p.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Players</h1>
        <Link href="/admin/players/new" className="btn-primary">+ Add Player</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Position</th>
            <th className="text-left py-2 px-3">Team</th>
            <th className="text-left py-2 px-3">Nationality</th>
            <th className="text-right py-2 px-3">Actions</th>
          </tr></thead>
          <tbody>
            {players.map((p: any) => (
              <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-2 px-3 font-semibold">{p.first_name} {p.last_name}</td>
                <td className="py-2 px-3 text-slate-400">{p.position?.replace('_',' ')}</td>
                <td className="py-2 px-3 text-slate-400">{p.teams?.name}</td>
                <td className="py-2 px-3 text-slate-400">{p.nationality}</td>
                <td className="py-2 px-3 text-right">
                  <Link href={`/admin/players/${p.id}`} className="text-teal-400 mr-3">Edit</Link>
                  <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}