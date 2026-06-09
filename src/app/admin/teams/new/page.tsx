'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTeam() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', city: '', country: '', league_id: '' });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">🏒</span> New Team</h1>
          <p>Add a new team to the directory. Team creation is most efficient via the Highlightly sync job — this form is for manual additions.</p>
        </div>
        <button type="button" onClick={() => router.push('/admin/teams')} className="admin-btn admin-btn-secondary">← Cancel</button>
      </div>

      <div className="admin-card p-6 max-w-xl">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch('/api/teams', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(form),
            });
            if (res.ok) router.push('/admin/teams');
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">League ID</label>
            <input
              value={form.league_id}
              onChange={(e) => setForm({ ...form, league_id: e.target.value })}
              placeholder="UUID (optional — assign later)"
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Leave blank to create an unassigned team. Super admins can assign league later.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="admin-btn admin-btn-primary">Create Team</button>
            <button type="button" onClick={() => router.push('/admin/teams')} className="admin-btn admin-btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
