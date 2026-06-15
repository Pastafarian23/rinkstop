'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BulkActionBar from '@/components/admin/BulkActionBar';

export default function AdminPlayers() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(d => { setPlayers(d.data || []); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this player?')) return;
    await fetch(`/api/players?id=${id}`, { method: 'DELETE' });
    setPlayers(players.filter((p) => p.id !== id));
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">⭐</span> Players</h1>
          <p>Manage player profiles, positions, and team assignments.</p>
        </div>
        <Link href="/admin/players/new" className="admin-btn admin-btn-primary">+ Add Player</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="admin-card">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="text-left py-3 px-4 w-8">
                <input
                  type="checkbox"
                  checked={players.length > 0 && players.every((p) => selected.has(p.id))}
                  onChange={() => {
                    const allSelected = players.every((p) => selected.has(p.id));
                    const next = new Set(selected);
                    if (allSelected) {
                      players.forEach((p) => next.delete(p.id));
                    } else {
                      players.forEach((p) => next.add(p.id));
                    }
                    setSelected(next);
                  }}
                  className="rounded border-slate-700"
                  title="Select all"
                />
              </th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Position</th>
              <th className="text-left py-3 px-4">Team</th>
              <th className="text-left py-3 px-4">Nationality</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {players.map((p) => (
                <tr
                  key={p.id}
                  style={selected.has(p.id) ? { background: 'rgba(45,212,191,0.06)' } : undefined}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        setSelected(next);
                      }}
                      className="rounded border-slate-700"
                    />
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{p.first_name} {p.last_name}</td>
                  <td className="py-3 px-4 text-slate-400">{p.position?.replace('_',' ')}</td>
                  <td className="py-3 px-4 text-slate-400">{p.teams?.name}</td>
                  <td className="py-3 px-4 text-slate-400">{p.nationality}</td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/admin/players/${p.id}`} className="text-teal-400 mr-3">Edit</Link>
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BulkActionBar
        entity="players"
        selected={selected}
        onClear={() => setSelected(new Set())}
        onComplete={() => window.location.reload()}
      />
    </div>
  );
}
