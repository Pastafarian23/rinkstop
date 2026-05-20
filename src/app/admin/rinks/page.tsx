'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminRinks() {
  const [rinks, setRinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rinks').then(r => r.json()).then(d => { setRinks(d || []); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rink?')) return;
    await fetch(`/api/rinks?id=${id}`, { method: 'DELETE' });
    setRinks(rinks.filter((r: any) => r.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Rinks</h1>
        <Link href="/admin/rinks/new" className="btn-primary">+ Add Rink</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Location</th>
            <th className="text-left py-2 px-3">Ice Size</th>
            <th className="text-right py-2 px-3">Actions</th>
          </tr></thead>
          <tbody>
            {rinks.map((r: any) => (
              <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-2 px-3 font-semibold">{r.name}</td>
                <td className="py-2 px-3 text-slate-400">{r.city}, {r.country}</td>
                <td className="py-2 px-3 text-slate-400">{r.ice_size}</td>
                <td className="py-2 px-3 text-right">
                  <Link href={`/admin/rinks/${r.id}`} className="text-teal-400 mr-3">Edit</Link>
                  <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}