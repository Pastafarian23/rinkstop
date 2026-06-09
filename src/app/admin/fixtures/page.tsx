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
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">📅</span> Fixtures</h1>
          <p>Schedule, edit, and manage upcoming and past games.</p>
        </div>
        <Link href="/admin/fixtures/new" className="admin-btn admin-btn-primary">+ Add Fixture</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="admin-card">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Home</th>
              <th className="text-left py-3 px-4">Away</th>
              <th className="text-center py-3 px-4">Score</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {fixtures.map((f: any) => (
                <tr key={f.id}>
                  <td className="py-3 px-4 text-slate-400">{formatDate(f.scheduled_at)}</td>
                  <td className="py-3 px-4 font-semibold text-white">{f.home?.name}</td>
                  <td className="py-3 px-4 text-slate-300">{f.away?.name}</td>
                  <td className="py-3 px-4 text-center text-slate-300">{f.home_score ?? '-'} - {f.away_score ?? '-'}</td>
                  <td className="py-3 px-4 capitalize"><span className="admin-pill admin-pill-neutral">{f.status}</span></td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/admin/fixtures/${f.id}`} className="text-teal-400 mr-3">Edit</Link>
                    <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-300">Delete</button>
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