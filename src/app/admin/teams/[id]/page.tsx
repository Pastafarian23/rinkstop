'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditTeam() {
  const { id } = useParams();
  const router = useRouter();
  const [leagues, setLeagues] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', country: '', city: '', league_id: '' });

  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => setLeagues(d || []));
    fetch(`/api/teams?id=${id}`).then(r => r.json()).then(d => {
      if (d.data?.[0]) setForm(d.data[0]);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/teams', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...form }) });
    router.push('/admin/teams');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Edit Team</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" />
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
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">Update</button>
          <button type="button" onClick={() => router.push('/admin/teams')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}