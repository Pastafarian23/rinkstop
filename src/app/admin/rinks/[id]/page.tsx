'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditRink() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', city: '', province_state: '', country: '', address: '', latitude: 0, longitude: 0, capacity: 0, ice_size: 'NHL', surface_type: 'ice', website_url: '', phone: '', email: '' });

  useEffect(() => {
    fetch(`/api/rinks?id=${id}`).then(r => r.json()).then(d => { if (d[0]) setForm(d[0]); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/rinks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...form }) });
    router.push('/admin/rinks');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Edit Rink</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div><label className="block text-sm font-medium mb-1">Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Slug</label>
          <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">City</label>
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Province/State</label>
            <input value={form.province_state} onChange={e => setForm({...form, province_state: e.target.value})} className="input-field" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Province/State</label>
          <input value={form.province_state} onChange={e => setForm({...form, province_state: e.target.value})} className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Latitude</label>
            <input type="number" step="any" value={form.latitude || ''} onChange={e => setForm({...form, latitude: parseFloat(e.target.value)})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Longitude</label>
            <input type="number" step="any" value={form.longitude || ''} onChange={e => setForm({...form, longitude: parseFloat(e.target.value)})} className="input-field" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Ice Size</label>
            <select value={form.ice_size} onChange={e => setForm({...form, ice_size: e.target.value})} className="select-field">
              <option value="NHL">NHL</option><option value="Olympic">Olympic</option><option value="Recreational">Recreational</option>
            </select></div>
          <div><label className="block text-sm font-medium mb-1">Surface</label>
            <select value={form.surface_type} onChange={e => setForm({...form, surface_type: e.target.value})} className="select-field">
              <option value="ice">Ice</option><option value="synthetic">Synthetic</option><option value="other">Other</option>
            </select></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Address</label>
          <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Phone</label>
          <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">Update</button>
          <button type="button" onClick={() => router.push('/admin/rinks')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}