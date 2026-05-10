'use client';
import { useRouter } from 'next/navigation';

export default function NewRink() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', city: '', province_state: '', country: '', address: '', latitude: 0, longitude: 0, capacity: 0, ice_size: 'NHL', surface_type: 'ice', website_url: '', phone: '', email: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/rinks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    router.push('/admin/rinks');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">New Rink</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-32"></div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div><label className="block text-sm font-medium mb-1">Name *</label>
          <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Slug *</label>
          <input required value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">City</label>
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Province/State</label>
            <input value={form.province_state} onChange={e => setForm({...form, province_state: e.target.value})} className="input-field" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Country</label>
          <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Address</label>
          <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" /></div>
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
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Website</label>
          <input value={form.website_url} onChange={e => setForm({...form, website_url: e.target.value})} className="input-field" /></div>
        <button type="submit" className="btn-primary">Create Rink</button>
      </form>
    </div>
  );
}

import { useRouter } from 'next/navigation';
import { useState } from 'react';