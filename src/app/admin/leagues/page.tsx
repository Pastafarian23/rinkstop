'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminLeagues() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => { setLeagues(d || []); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this league?')) return;
    await fetch(`/api/leagues?id=${id}`, { method: 'DELETE' });
    setLeagues(leagues.filter((l: any) => l.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Leagues</h1>
        <Link href="/admin/leagues/new" className="btn-primary">+ Add League</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Country</th>
            <th className="text-left py-2 px-3">Level</th>
            <th className="text-right py-2 px-3">Actions</th>
          </tr></thead>
          <tbody>
            {leagues.map((l: any) => (
              <tr key={l.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-2 px-3 font-semibold">{l.name}</td>
                <td className="py-2 px-3 text-slate-400">{l.country}</td>
                <td className="py-2 px-3 text-slate-400 capitalize">{l.level}</td>
                <td className="py-2 px-3 text-right">
                  <Link href={`/admin/leagues/${l.id}`} className="text-teal-400 mr-3">Edit</Link>
                  <button onClick={() => handleDelete(l.id)} className="text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}