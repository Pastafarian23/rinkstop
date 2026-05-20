'use client';
import { useRouter } from 'next/navigation';

export default function NewTeam() {
  const router = useRouter();
  const [leagues, setLeagues] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', country: '', city: '', league_id: '' });

  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => setLeagues(d || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, slug: form.slug || form.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') }),
    });
    router.push('/admin');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">New Team</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">League</label>
          <select value={form.league_id} onChange={e => setForm({...form, league_id: e.target.value})} className="select-field">
            <option value="">None</option>
            {leagues.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary">Create Team</button>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';