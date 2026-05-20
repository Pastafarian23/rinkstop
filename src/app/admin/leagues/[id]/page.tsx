'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditLeague() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', country: '', level: 'professional', description: '', website_url: '' });

  useEffect(() => {
    fetch(`/api/leagues?id=${id}`).then(r => r.json()).then(d => { if (d[0]) setForm(d[0]); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/leagues', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...form }) });
    router.push('/admin/leagues');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Edit League</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div><label className="block text-sm font-medium mb-1">Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Slug</label>
            <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Country</label>
            <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="input-field" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Level</label>
          <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="select-field">
            <option value="professional">Professional</option><option value="junior">Junior</option>
            <option value="amateur">Amateur</option><option value="youth">Youth</option>
            <option value="recreational">Recreational</option>
          </select></div>
        <div><label className="block text-sm font-medium mb-1">Website</label>
          <input value={form.website_url} onChange={e => setForm({...form, website_url: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field h-24" /></div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">Update</button>
          <button type="button" onClick={() => router.push('/admin/leagues')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}