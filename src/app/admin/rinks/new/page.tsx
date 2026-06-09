'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewRink() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', city: '', state: '', country: '', latitude: '', longitude: '' });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">🏟️</span> New Rink</h1>
          <p>Add a new rink/facility to the directory.</p>
        </div>
        <button type="button" onClick={() => router.push('/admin/rinks')} className="admin-btn admin-btn-secondary">← Cancel</button>
      </div>

      <div className="admin-card p-6 max-w-xl">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch('/api/rinks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...form,
                latitude: form.latitude ? parseFloat(form.latitude) : null,
                longitude: form.longitude ? parseFloat(form.longitude) : null,
              }),
            });
            if (res.ok) router.push('/admin/rinks');
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State / Region</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Latitude</label>
              <input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitude</label>
              <input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="w-full" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Latitude/longitude optional but recommended for map placement.</p>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="admin-btn admin-btn-primary">Create Rink</button>
            <button type="button" onClick={() => router.push('/admin/rinks')} className="admin-btn admin-btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
