'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditFixture() {
  const { id } = useParams();
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '', status: 'scheduled' });

  useEffect(() => {
    fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || []));
    fetch(`/api/fixtures?id=${id}`).then(r => r.json()).then(d => { if (d[0]) setForm(d[0]); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/fixtures', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...form }) });
    router.push('/admin/fixtures');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Edit Fixture</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div><label className="block text-sm font-medium mb-1">Home Team</label>
          <select value={form.home_team_id} onChange={e => setForm({...form, home_team_id: e.target.value})} className="select-field">
            <option value="">Select Team</option>
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label className="block text-sm font-medium mb-1">Away Team</label>
          <select value={form.away_team_id} onChange={e => setForm({...form, away_team_id: e.target.value})} className="select-field">
            <option value="">Select Team</option>
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label className="block text-sm font-medium mb-1">Date & Time</label>
          <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Status</label>
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select-field">
            <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            <option value="postponed">Postponed</option>
          </select></div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">Update</button>
          <button type="button" onClick={() => router.push('/admin/fixtures')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}