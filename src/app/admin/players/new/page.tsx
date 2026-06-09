'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPlayer() {
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({
    first_name: '', last_name: '', slug: '', team_id: '', position: 'forward',
    jersey_number: 0, shoots: '', catches: '', height_cm: 0, weight_kg: 0,
    nationality: '', bio: '', headshot_url: ''
  });

  useEffect(() => { fetch('/api/teams').then(r => r.json()).then(d => setTeams(d.data || [])); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    router.push('/admin/players');
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">⭐</span> New Player</h1>
          <p>Add a new player profile to the directory.</p>
        </div>
        <button type="button" onClick={() => router.push('/admin/players')} className="admin-btn admin-btn-secondary">← Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">First Name *</label>
            <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Last Name *</label>
            <input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="input-field" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Slug</label>
          <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Team</label>
          <select value={form.team_id} onChange={e => setForm({...form, team_id: e.target.value})} className="select-field">
            <option value="">No Team</option>
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label className="block text-sm font-medium mb-1">Position</label>
          <select value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="select-field">
            <option value="forward">Forward</option><option value="defenseman">Defenseman</option>
            <option value="goalie">Goalie</option><option value="center">Center</option>
            <option value="left_wing">Left Wing</option><option value="right_wing">Right Wing</option>
          </select></div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1">Jersey #</label>
            <input type="number" value={form.jersey_number || ''} onChange={e => setForm({...form, jersey_number: parseInt(e.target.value)})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Shoots</label>
            <select value={form.shoots} onChange={e => setForm({...form, shoots: e.target.value})} className="select-field">
              <option value=""> -- </option><option value="left">Left</option><option value="right">Right</option>
            </select></div>
          <div><label className="block text-sm font-medium mb-1">Catches</label>
            <select value={form.catches} onChange={e => setForm({...form, catches: e.target.value})} className="select-field">
              <option value=""> -- </option><option value="left">Left</option><option value="right">Right</option>
            </select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Height (cm)</label>
            <input type="number" value={form.height_cm || ''} onChange={e => setForm({...form, height_cm: parseInt(e.target.value)})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Weight (kg)</label>
            <input type="number" value={form.weight_kg || ''} onChange={e => setForm({...form, weight_kg: parseInt(e.target.value)})} className="input-field" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Nationality</label>
          <input value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Headshot URL</label>
          <input value={form.headshot_url} onChange={e => setForm({...form, headshot_url: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Bio</label>
          <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="input-field h-24" /></div>
        <button type="submit" className="admin-btn admin-btn-primary">Create Player</button>
      </form>
    </div>
  );
}

