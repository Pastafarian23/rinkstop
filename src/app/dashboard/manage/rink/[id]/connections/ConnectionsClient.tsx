'use client';
//
// ConnectionsClient — add new connection + display.

import { useState } from 'react';
import Link from 'next/link';

interface Connection {
  id: string;
  org_name: string;
  org_type: string;
  role: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  rinkId: string;
  initialConnections: Connection[];
}

const TYPE_LABELS: Record<string, string> = {
  team: 'Team',
  league: 'League',
  federation: 'Federation',
  school: 'School',
  business: 'Business',
  independent_coach: 'Independent Coach',
  other: 'Other',
};

const ORG_TYPES = ['team','league','federation','school','business','independent_coach','other'];
const ROLES = ['client','partner','vendor','member','affiliate','other'];
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  pending: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  rejected: { bg: 'rgba(239,68,68,0.15)', fg: '#FCA5A5' },
  expired: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
};

export default function ConnectionsClient({ rinkId, initialConnections }: Props) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ org_name: '', org_type: 'team', role: 'client', contact_name: '', contact_email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/owner/rinks/${rinkId}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: form.org_name,
          org_type: form.org_type,
          role: form.role,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to add connection.'); return; }
      const listRes = await fetch(`/api/owner/rinks/${rinkId}/connections`);
      const listJson = await listRes.json();
      setConnections(listJson.connections || []);
      setShowAdd(false);
      setForm({ org_name: '', org_type: 'team', role: 'client', contact_name: '', contact_email: '' });
      setSuccess('Connection added.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (connections.length === 0 && !showAdd) {
    return (
      <div>
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '1rem' }}>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '0.75rem' }}>No connections yet.</p>
          <button onClick={() => setShowAdd(true)} style={{ background: '#38BDF8', color: '#0F172A', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>+ Add first connection</button>
        </div>
        {showAdd && <AddForm form={form} setForm={setForm} onSubmit={handleAdd} saving={saving} onCancel={() => setShowAdd(false)} error={error} />}
      </div>
    );
  }

  return (
    <div>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#7DD3FC', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={() => setShowAdd(v => !v)} style={{ background: showAdd ? 'rgba(255,255,255,0.05)' : '#38BDF8', color: showAdd ? '#94A3B8' : '#0F172A', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
          {showAdd ? 'Cancel' : '+ Add connection'}
        </button>
      </div>

      {showAdd && (
        <AddForm form={form} setForm={setForm} onSubmit={handleAdd} saving={saving} onCancel={() => setShowAdd(false)} error={error} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1rem' }}>
        {connections.map(conn => {
          const sc = STATUS_COLORS[conn.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
          return (
            <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{conn.org_name}</div>
                <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                  {TYPE_LABELS[conn.org_type] || conn.org_type} · {conn.role}
                  {conn.contact_email ? ` · ${conn.contact_email}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                <span style={{ background: sc.bg, color: sc.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>{conn.status}</span>
                <Link href={`/dashboard/manage/rink/${rinkId}/connections/${conn.id}`} style={{ color: '#38BDF8', fontSize: '0.8rem', textDecoration: 'none', padding: '0.25rem 0.5rem' }}>Manage</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddForm({ form, setForm, onSubmit, saving, onCancel, error }: {
  form: { org_name: string; org_type: string; role: string; contact_name: string; contact_email: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  onCancel: () => void;
  error: string;
}) {
  return (
    <div style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add organization connection</h3>
      <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Organization name *</label>
          <input required value={form.org_name} onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Organization type</label>
          <select value={form.org_type} onChange={e => setForm(f => ({ ...f, org_type: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }}>
            {ORG_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Relationship</label>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }}>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Contact name</label>
          <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Contact email</label>
          <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ background: '#38BDF8', color: '#0F172A', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Add connection'}</button>
        </div>
      </form>
    </div>
  );
}
