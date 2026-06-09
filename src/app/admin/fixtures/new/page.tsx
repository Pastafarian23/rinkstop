'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewFixture() {
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '', status: 'scheduled' });

  useEffect(() => { fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || [])); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/fixtures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    router.push('/admin/fixtures');
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">📅</span> New Fixture</h1>
          <p>Schedule a new fixture in the calendar.</p>
        </div>
        <button type="button" onClick={() => router.push('/admin/fixtures')} className="admin-btn admin-btn-secondary">← Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div><label className="block text-sm font-medium mb-1">Home Team *</label>
          <select required value={form.home_team_id} onChange={e => setForm({...form, home_team_id: e.target.value})} className="select-field">
            <option value="">Select Team</option>
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label className="block text-sm font-medium mb-1">Away Team *</label>
          <select required value={form.away_team_id} onChange={e => setForm({...form, away_team_id: e.target.value})} className="select-field">
            <option value="">Select Team</option>
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label className="block text-sm font-medium mb-1">Date & Time *</label>
          <input required type="datetime-local" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Status</label>
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select-field">
            <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            <option value="postponed">Postponed</option>
          </select></div>
        <button type="submit" className="admin-btn admin-btn-primary">Create Fixture</button>
      </form>
    </div>
  );
}
