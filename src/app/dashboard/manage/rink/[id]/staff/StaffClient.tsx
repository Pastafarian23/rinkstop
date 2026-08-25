'use client';
//
// StaffClient — client component for staff add/remove interactions.

import { useState } from 'react';

interface StaffMember {
  id: string;
  rink_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  hire_date: string | null;
  hourly_rate_cents: number | null;
  bio: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  rinkId: string;
  rinkName: string;
  initialStaff: StaffMember[];
}

const ROLE_LABELS: Record<string, string> = {
  coach: 'Coach',
  instructor: 'Instructor',
  lifeguard: 'Lifeguard',
  ice_operator: 'Ice Operator',
  front_desk: 'Front Desk',
  manager: 'Manager',
  other: 'Other',
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  inactive: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  terminated: { bg: 'rgba(239,68,68,0.15)', fg: '#FCA5A5' },
};

const ROLES = ['coach','instructor','lifeguard','ice_operator','front_desk','manager','other'];

function formatRate(cents: number | null): string {
  if (cents === null) return '—';
  return `$${(cents / 100).toFixed(2)}/hr`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StaffClient({ rinkId, rinkName, initialStaff }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'coach', status: 'active', hourly_rate_cents: '', hire_date: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/owner/rinks/${rinkId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          role: form.role,
          status: form.status,
          hourly_rate_cents: form.hourly_rate_cents ? parseInt(form.hourly_rate_cents) : null,
          hire_date: form.hire_date || null,
          bio: form.bio || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to add staff member.'); return; }
      // Reload
      const listRes = await fetch(`/api/owner/rinks/${rinkId}/staff`);
      const listJson = await listRes.json();
      setStaff(listJson.staff || []);
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', role: 'coach', status: 'active', hourly_rate_cents: '', hire_date: '', bio: '' });
      setSuccess('Staff member added.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/owner/rinks/${rinkId}/staff/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStaff(prev => prev.filter(s => s.id !== id));
      setSuccess('Staff member removed.');
    } else {
      const json = await res.json();
      setError(json.error || 'Failed to remove staff member.');
    }
  }

  const activeStaff = staff.filter(s => s.status === 'active');
  const inactiveStaff = staff.filter(s => s.status !== 'active');

  return (
    <div>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#7DD3FC', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowAdd(v => !v)}
          style={{ background: showAdd ? 'rgba(255,255,255,0.05)' : '#38BDF8', color: showAdd ? '#94A3B8' : '#0F172A', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          {showAdd ? 'Cancel' : '+ Add staff'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add staff member</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Full name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Hourly rate (USD)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 25.00" value={form.hourly_rate_cents} onChange={e => setForm(f => ({ ...f, hourly_rate_cents: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Hire date</label>
              <input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Bio / Notes</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: '#38BDF8', color: '#0F172A', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Add staff'}</button>
            </div>
          </form>
        </div>
      )}

      {staff.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '0.75rem' }}>No staff yet. Add your first employee or coach above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {activeStaff.length > 0 && (
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
              {activeStaff.length} active
            </div>
          )}
          {activeStaff.map(s => (
            <StaffRow key={s.id} staff={s} rinkId={rinkId} onRemove={handleRemove} />
          ))}
          {inactiveStaff.length > 0 && (
            <>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                Inactive / Terminated
              </div>
              {inactiveStaff.map(s => (
                <StaffRow key={s.id} staff={s} rinkId={rinkId} onRemove={handleRemove} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StaffRow({ staff: s, rinkId, onRemove }: { staff: StaffMember; rinkId: string; onRemove: (id: string, name: string) => void }) {
  const sc = STATUS_COLORS[s.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{s.name}</div>
        <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.125rem' }}>
          {ROLE_LABELS[s.role] || s.role}
          {s.email ? ` · ${s.email}` : ''}
          {s.hire_date ? ` · Hired ${formatDate(s.hire_date)}` : ''}
        </div>
        {s.bio && <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>{s.bio}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
        {s.hourly_rate_cents !== null && (
          <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{formatRate(s.hourly_rate_cents)}</span>
        )}
        <span style={{ background: sc.bg, color: sc.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>
          {s.status}
        </span>
        <button
          onClick={() => onRemove(s.id, s.name)}
          style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer' }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
