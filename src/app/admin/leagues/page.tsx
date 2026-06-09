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
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">🏆</span> Leagues</h1>
          <p>Manage leagues, countries, and competition levels.</p>
        </div>
        <Link href="/admin/leagues/new" className="admin-btn admin-btn-primary">+ Add League</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="admin-card">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Country</th>
              <th className="text-left py-3 px-4">Level</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {leagues.map((l: any) => (
                <tr key={l.id}>
                  <td className="py-3 px-4 font-semibold text-white">{l.name}</td>
                  <td className="py-3 px-4 text-slate-400">{l.country}</td>
                  <td className="py-3 px-4 text-slate-400 capitalize">{l.level}</td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/admin/leagues/${l.id}`} className="text-teal-400 mr-3">Edit</Link>
                    <button onClick={() => handleDelete(l.id)} className="text-red-400 hover:text-red-300">Delete</button>
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