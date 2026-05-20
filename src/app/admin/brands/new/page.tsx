'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBrand() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', category: 'sticks', country_of_origin: '', website_url: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    router.push('/admin/brands');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">New Brand</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div><label className="block text-sm font-medium mb-1">Name *</label>
          <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Slug *</label>
            <input required value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="select-field">
              <option value="sticks">Sticks</option><option value="skates">Skates</option>
              <option value="helmets">Helmets</option><option value="pads">Pads</option>
              <option value="gloves">Gloves</option><option value="apparel">Apparel</option>
              <option value="accessories">Accessories</option><option value="other">Other</option>
            </select></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Country of Origin</label>
          <input value={form.country_of_origin} onChange={e => setForm({...form, country_of_origin: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Website</label>
          <input value={form.website_url} onChange={e => setForm({...form, website_url: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field h-24" /></div>
        <button type="submit" className="btn-primary">Create Brand</button>
      </form>
    </div>
  );
}