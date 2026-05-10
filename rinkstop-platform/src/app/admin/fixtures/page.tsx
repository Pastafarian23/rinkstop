'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminFixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/fixtures').then(r => r.json()).then(d => { setFixtures(d || []); setLoading(false); });
    fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || []));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fixture?')) return;
    await fetch(`/api/fixtures?id=${id}`, { method: 'DELETE' });
    setFixtures(fixtures.filter((f: any) => f.id !== id));
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Fixtures</h1>
        <Link href="/admin/fixtures/new" className="btn-primary">+ Add Fixture</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3">Date</th>
            <th className="text-left py-2 px-3">Home</th>
            <th className="text-left py-2 px-3">Away</th>
            <th className="text-center py-2 px-3">Score</th>
            <th className="text-left py-2 px-3">Status</th>
            <th className="text-right py-2 px-3">Actions</th>
          </tr></thead>
          <tbody>
            {fixtures.map((f: any) => (
              <tr key={f.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-2 px-3 text-slate-400">{formatDate(f.scheduled_at)}</td>
                <td className="py-2 px-3 font-semibold">{f.home?.name}</td>
                <td className="py-2 px-3">{f.away?.name}</td>
                <td className="py-2 px-3 text-center">{f.home_score ?? '-'} – {f.away_score ?? '-'}</td>
                <td className="py-2 px-3 capitalize">{f.status}</td>
                <td className="py-2 px-3 text-right">
                  <Link href={`/admin/fixtures/${f.id}`} className="text-teal-400 mr-3">Edit</Link>
                  <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}