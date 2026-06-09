'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewLeague() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', country: '', level: 'professional', description: '', website_url: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/leagues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    router.push('/admin/leagues');
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">🏆</span> New League</h1>
          <p>Add a new league to the directory.</p>
        </div>
        <button type="button" onClick={() => router.push('/admin/leagues')} className="admin-btn admin-btn-secondary">← Cancel</button>
      </div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div><label className="block text-sm font-medium mb-1">Name *</label>
          <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Slug *</label>
            <input required value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" /></div>
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
        <button type="submit" className="admin-btn admin-btn-primary">Create League</button>
      </form>
    </div>
  );
}
