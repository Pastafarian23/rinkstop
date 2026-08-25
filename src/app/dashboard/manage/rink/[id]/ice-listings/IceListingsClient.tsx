'use client';

import { useState } from 'react';

interface Listing {
  id: string;
  rink_id: string;
  title: string;
  description: string | null;
  requested_price_cents: number | null;
  currency: string;
  start_time: string;
  end_time: string;
  timezone: string;
  age_group: string | null;
  skill_level: string | null;
  slot_type: string | null;
  visibility: string;
  status: string;
  created_at: string;
}

interface Props {
  rinkId: string;
  rinkName: string;
  initialListings: Listing[];
}

const SLOT_TYPES = ['open_pickup','practice','game','tournament','clinic','free_skate','rentals','other'];
const SKILL_LEVELS = ['all','beginner','intermediate','advanced','elite'];
const VISIBILITY_OPTIONS = ['public','connection_only','private'];
const STATUS_OPTIONS = ['available','booked','cancelled'];

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return 'Free';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function IceListingsClient({ rinkId, rinkName, initialListings }: Props) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', requested_price_cents: '', slot_type: 'open_pickup',
    start_time: '', end_time: '', timezone: 'America/Chicago', age_group: '',
    skill_level: 'all', visibility: 'public', status: 'available',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/owner/rinks/${rinkId}/ice-listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          requested_price_cents: form.requested_price_cents ? parseInt(form.requested_price_cents) : null,
          currency: 'USD',
          start_time: form.start_time,
          end_time: form.end_time,
          timezone: form.timezone,
          age_group: form.age_group || null,
          skill_level: form.skill_level || null,
          slot_type: form.slot_type || null,
          visibility: form.visibility,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to add listing.'); return; }
      const listRes = await fetch(`/api/owner/rinks/${rinkId}/ice-listings`);
      const listJson = await listRes.json();
      setListings(listJson.listings || []);
      setShowAdd(false);
      setForm({ title: '', description: '', requested_price_cents: '', slot_type: 'open_pickup', start_time: '', end_time: '', timezone: 'America/Chicago', age_group: '', skill_level: 'all', visibility: 'public', status: 'available' });
      setSuccess('Listing added to marketplace.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'available' ? 'cancelled' : 'available';
    const res = await fetch(`/api/owner/rinks/${rinkId}/ice-listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this listing?')) return;
    const res = await fetch(`/api/owner/rinks/${rinkId}/ice-listings/${id}`, { method: 'DELETE' });
    if (res.ok) setListings(prev => prev.filter(l => l.id !== id));
  }

  const activeListings = listings.filter(l => l.status !== 'cancelled');

  return (
    <div>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#7DD3FC', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={() => setShowAdd(v => !v)} style={{ background: showAdd ? 'rgba(255,255,255,0.05)' : '#38BDF8', color: showAdd ? '#94A3B8' : '#0F172A', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
          {showAdd ? 'Cancel' : '+ New listing'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add ice listing</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Listing title *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Open Ice — Saturday 10am" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional details about this slot..." style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Start time *</label>
              <input type="datetime-local" required value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>End time *</label>
              <input type="datetime-local" required value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Slot type</label>
              <select value={form.slot_type} onChange={e => setForm(f => ({ ...f, slot_type: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }}>
                {SLOT_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Price (USD)</label>
              <input type="number" min="0" step="0.01" placeholder="Leave empty for free" value={form.requested_price_cents} onChange={e => setForm(f => ({ ...f, requested_price_cents: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Skill level</label>
              <select value={form.skill_level} onChange={e => setForm(f => ({ ...f, skill_level: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }}>
                {SKILL_LEVELS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Visibility</label>
              <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', boxSizing: 'border-box' }}>
                <option value="public">Public (marketplace)</option>
                <option value="connection_only">Connection only</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: '#38BDF8', color: '#0F172A', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Add listing'}</button>
            </div>
          </form>
        </div>
      )}

      {activeListings.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem' }}>No active listings. Create one above to list ice on the marketplace.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeListings.map(listing => (
            <div key={listing.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{listing.title}</div>
                <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                  {formatDateTime(listing.start_time)} – {listing.slot_type?.replace(/_/g, ' ')}
                  {listing.age_group ? ` · ${listing.age_group}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{formatPrice(listing.requested_price_cents, listing.currency)}</span>
                <span style={{ background: listing.visibility === 'public' ? 'rgba(56,189,248,0.15)' : 'rgba(148,163,184,0.15)', color: listing.visibility === 'public' ? '#7DD3FC' : '#94A3B8', padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>
                  {listing.visibility}
                </span>
                <button onClick={() => handleToggleStatus(listing.id, listing.status)} style={{ background: 'rgba(255,184,28,0.1)', color: '#FCD34D', border: '1px solid rgba(255,184,28,0.3)', borderRadius: 6, padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  {listing.status === 'available' ? 'Pause' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(listing.id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
