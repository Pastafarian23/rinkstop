'use client';

// Equipment + Rental Client for rink owner dashboard.
// Tabs: Inventory | Active Rentals | Settings

import { useState, useEffect, useCallback } from 'react';

const EQUIPMENT_TYPES = [
  'skates','stick','helmet','gloves','pants','shin_pads','shoulder_pads',
  'elbow_pads','jersey','sock','puck','cones','goal','net','bag',
  'water_bottle','tape','mouthguard','skate_sharpener','other',
];
const STATUSES = ['active','retired','lost','broken','lent'];
const CONDITIONS = ['new','excellent','good','worn','damaged','needs_repair'];
const RENTAL_STATUSES = ['pending','active','overdue','returned','cancelled'];

function formatPrice(cents: number | null, currency: string): string {
  if (!cents) return '—';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

function StatusBadge({ status, colors }: { status: string; colors: Record<string, { bg: string; fg: string }> | undefined }) {
  const c = colors?.[status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {status}
    </span>
  );
}

export default function EquipmentClient({
  rinkId,
  initialItems,
  initialRentals,
  initialSettings,
  equipmentTypes,
  statusColors,
  rentalStatusColors,
  formatPrice: formatPriceFn,
}: {
  rinkId: string;
  initialItems: any[];
  initialRentals: any[];
  initialSettings: any;
  equipmentTypes: Record<string, string>;
  statusColors: Record<string, { bg: string; fg: string }>;
  rentalStatusColors: Record<string, { bg: string; fg: string }>;
  formatPrice: (cents: number | null, currency: string) => string;
}) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'rentals' | 'settings'>('inventory');
  const [items, setItems] = useState(initialItems);
  const [rentals, setRentals] = useState(initialRentals);
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showItemForm, setShowItemForm] = useState(false);
  const [showRentalForm, setShowRentalForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedRental, setSelectedRental] = useState<any>(null);

  // Form state
  const [itemForm, setItemForm] = useState({ label: '', type: 'other', brand: '', model: '', size: '', status: 'active', condition: 'good', notes: '', acquired_price_cents: '' });
  const [rentalForm, setRentalForm] = useState({ parent_user_id: '', item_id: '', starts_at: '', ends_at: '', deposit_required_cents: '', monthly_rate_cents: '', billing_day: '1', notes: '' });
  const [settingsForm, setSettingsForm] = useState({
    deposit_policy: settings?.deposit_policy || 'required',
    default_deposit_cents: settings?.default_deposit_cents || 0,
    billing_cycle: settings?.billing_cycle || 'monthly',
    billing_day: settings?.billing_day || 1,
    late_fee_cents: settings?.late_fee_cents || 0,
    rental_terms: settings?.rental_terms || '',
  });

  const refreshItems = useCallback(async () => {
    const r = await fetch(`/api/owner/rinks/${rinkId}/equipment/items?limit=100`);
    const j = await r.json();
    if (r.ok) setItems(j.items);
  }, [rinkId]);

  const refreshRentals = useCallback(async () => {
    const r = await fetch(`/api/owner/rinks/${rinkId}/equipment/rentals?limit=100`);
    const j = await r.json();
    if (r.ok) setRentals(j.rentals);
  }, [rinkId]);

  // Item CRUD
  const openNewItem = () => {
    setEditingItem(null);
    setItemForm({ label: '', type: 'other', brand: '', model: '', size: '', status: 'active', condition: 'good', notes: '', acquired_price_cents: '' });
    setShowItemForm(true);
  };

  const openEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({
      label: item.label,
      type: item.type,
      brand: item.brand || '',
      model: item.model || '',
      size: item.size || '',
      status: item.status,
      condition: item.condition,
      notes: item.notes || '',
      acquired_price_cents: item.acquired_price_cents?.toString() || '',
    });
    setShowItemForm(true);
  };

  const saveItem = async () => {
    if (!itemForm.label.trim()) return alert('Label is required.');
    setLoading(true);
    const url = editingItem ? `/api/owner/rinks/${rinkId}/equipment/items/${editingItem.id}` : `/api/owner/rinks/${rinkId}/equipment/items`;
    const method = editingItem ? 'PATCH' : 'POST';
    const body = { ...itemForm, acquired_price_cents: itemForm.acquired_price_cents ? parseInt(itemForm.acquired_price_cents) : null };
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) { await refreshItems(); setShowItemForm(false); }
    else { const j = await r.json(); alert(j.error || 'Failed to save.'); }
    setLoading(false);
  };

  const archiveItem = async (id: string) => {
    if (!confirm('Archive this item? It will be marked as retired and removed from active inventory.')) return;
    const r = await fetch(`/api/owner/rinks/${rinkId}/equipment/items/${id}`, { method: 'DELETE' });
    if (r.ok) await refreshItems();
    else { const j = await r.json(); alert(j.error || 'Failed to archive.'); }
  };

  // Rental creation
  const saveRental = async () => {
    if (!rentalForm.parent_user_id || !rentalForm.item_id || !rentalForm.starts_at) return alert('Parent, item, and start date are required.');
    setLoading(true);
    const body = {
      ...rentalForm,
      deposit_required_cents: rentalForm.deposit_required_cents ? parseInt(rentalForm.deposit_required_cents) : 0,
      monthly_rate_cents: rentalForm.monthly_rate_cents ? parseInt(rentalForm.monthly_rate_cents) : 0,
    };
    const r = await fetch(`/api/owner/rinks/${rinkId}/equipment/rentals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) { await refreshRentals(); await refreshItems(); setShowRentalForm(false); setRentalForm({ parent_user_id: '', item_id: '', starts_at: '', ends_at: '', deposit_required_cents: '', monthly_rate_cents: '', billing_day: '1', notes: '' }); }
    else { const j = await r.json(); alert(j.error || 'Failed to create rental.'); }
    setLoading(false);
  };

  const updateRentalStatus = async (rentalId: string, status: string) => {
    const r = await fetch(`/api/owner/rinks/${rinkId}/equipment/rentals/${rentalId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (r.ok) await refreshRentals();
  };

  // Settings save
  const saveSettings = async () => {
    setLoading(true);
    const r = await fetch(`/api/owner/rinks/${rinkId}/equipment/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm),
    });
    if (r.ok) { const j = await r.json(); setSettings(j.settings); alert('Settings saved.'); }
    else { const j = await r.json(); alert(j.error || 'Failed to save settings.'); }
    setLoading(false);
  };

  // Available items for rental dropdown (active, not currently lent)
  const availableItems = items.filter(i => i.status === 'active');

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {(['inventory', 'rentals', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? 'var(--accent)' : 'transparent',
            color: activeTab === tab ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${activeTab === tab ? 'var(--accent)' : 'var(--border)'}`,
            padding: '0.5rem 1rem',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            textTransform: 'capitalize',
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--fg)' }}>Gear Inventory ({items.length})</h2>
            <button onClick={openNewItem} style={{
              background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem 1rem',
              borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            }}>
              + Add Gear
            </button>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>
              No gear yet. Add your first item to start tracking rentals.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 8, gap: '1rem',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.9rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {equipmentTypes[item.type] || item.type}
                      {item.brand && ` · ${item.brand}`}
                      {item.size && ` · Size ${item.size}`}
                      {item.acquired_price_cents && ` · ${formatPriceFn(item.acquired_price_cents, 'PHP')}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <StatusBadge status={item.status} colors={statusColors} />
                    <StatusBadge status={item.condition} colors={statusColors} />
                    <button onClick={() => openEditItem(item)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
                    <button onClick={() => archiveItem(item.id)} style={{ background: 'transparent', border: '1px solid rgba(200,16,46,0.3)', color: '#FCA5A5', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>Archive</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RENTALS TAB */}
      {activeTab === 'rentals' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--fg)' }}>Active Rentals ({rentals.filter(r => r.status !== 'cancelled' && r.status !== 'returned').length})</h2>
            <button onClick={() => setShowRentalForm(true)} style={{
              background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem 1rem',
              borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            }}>
              + New Rental
            </button>
          </div>

          {rentals.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>
              No rentals yet. Create a rental when a parent checks out gear for their kid.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {rentals.map(rental => (
                <div key={rental.id} style={{
                  padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.95rem' }}>
                        {rental.equipment_items?.label || 'Unknown Item'}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                          ({equipmentTypes[rental.equipment_items?.type] || rental.equipment_items?.type})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Parent: <code style={{ background: 'rgba(148,163,184,0.1)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>{rental.parent_user_id?.slice(0, 8)}...</code>
                        · Started {formatDate(rental.starts_at)}
                        {rental.ends_at && ` · Ends ${formatDate(rental.ends_at)}`}
                      </div>
                    </div>
                    <StatusBadge status={rental.status} colors={rentalStatusColors} />
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {rental.deposit_required_cents > 0 && (
                      <div>Deposit: <strong style={{ color: 'var(--fg)' }}>{formatPriceFn(rental.deposit_required_cents, rental.currency)}</strong>
                        {rental.deposit_paid_cents > 0 && <span style={{ color: '#86EFAC' }}> (paid)</span>}
                        {rental.deposit_paid_cents < rental.deposit_required_cents && <span style={{ color: '#FCD34D' }}> (unpaid)</span>}
                      </div>
                    )}
                    {rental.monthly_rate_cents > 0 && (
                      <div>Monthly: <strong style={{ color: 'var(--fg)' }}>{formatPriceFn(rental.monthly_rate_cents, rental.currency)}</strong></div>
                    )}
                    {rental.next_bill_at && (
                      <div>Next bill: <strong style={{ color: 'var(--fg)' }}>{formatDate(rental.next_bill_at)}</strong></div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {rental.status === 'pending' && (
                      <button onClick={() => updateRentalStatus(rental.id, 'active')} style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#86EFAC', padding: '0.35rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                        Approve & Activate
                      </button>
                    )}
                    {rental.status === 'active' && (
                      <button onClick={() => updateRentalStatus(rental.id, 'returned')} style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#7DD3FC', padding: '0.35rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                        Mark Returned
                      </button>
                    )}
                    {(rental.status === 'active' || rental.status === 'pending') && (
                      <button onClick={() => updateRentalStatus(rental.id, 'cancelled')} style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.3)', color: '#FCA5A5', padding: '0.35rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: 600 }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--fg)' }}>Rental Settings</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>Deposit Policy</label>
              <select value={settingsForm.deposit_policy} onChange={e => setSettingsForm({ ...settingsForm, deposit_policy: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}>
                <option value="required">Required</option>
                <option value="optional">Optional</option>
                <option value="none">None</option>
              </select>
            </div>
            {settingsForm.deposit_policy !== 'none' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>Default Deposit (PHP)</label>
                <input type="number" value={settingsForm.default_deposit_cents} onChange={e => setSettingsForm({ ...settingsForm, default_deposit_cents: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>Billing Cycle</label>
              <select value={settingsForm.billing_cycle} onChange={e => setSettingsForm({ ...settingsForm, billing_cycle: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}>
                <option value="monthly">Monthly</option>
                <option value="per_session">Per Session</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.25rem' }}>Rental Terms (Markdown)</label>
              <textarea value={settingsForm.rental_terms} onChange={e => setSettingsForm({ ...settingsForm, rental_terms: e.target.value })} rows={6} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontFamily: 'monospace', fontSize: '0.85rem' }} />
            </div>
            <button onClick={saveSettings} disabled={loading} style={{
              background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem',
              borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600,
            }}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ADD/EDIT ITEM MODAL */}
      {showItemForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemForm(false)}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--fg)' }}>{editingItem ? 'Edit Gear' : 'Add New Gear'}</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input placeholder="Label (e.g. Bauer Vapor X700)" value={itemForm.label} onChange={e => setItemForm({ ...itemForm, label: e.target.value })} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
              <select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value })} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}>
                {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{equipmentTypes[t] || t}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input placeholder="Brand" value={itemForm.brand} onChange={e => setItemForm({ ...itemForm, brand: e.target.value })} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
                <input placeholder="Model" value={itemForm.model} onChange={e => setItemForm({ ...itemForm, model: e.target.value })} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
              </div>
              <input placeholder="Size (e.g. 10.5, SR, M)" value={itemForm.size} onChange={e => setItemForm({ ...itemForm, size: e.target.value })} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <select value={itemForm.status} onChange={e => setItemForm({ ...itemForm, status: e.target.value })} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={itemForm.condition} onChange={e => setItemForm({ ...itemForm, condition: e.target.value })} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input placeholder="Acquired price (PHP)" type="number" value={itemForm.acquired_price_cents} onChange={e => setItemForm({ ...itemForm, acquired_price_cents: e.target.value })} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
              <textarea placeholder="Notes" value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} rows={3} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowItemForm(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveItem} disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                {loading ? 'Saving...' : editingItem ? 'Update' : 'Add Gear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW RENTAL MODAL */}
      {showRentalForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowRentalForm(false)}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--fg)' }}>New Rental</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Parent User ID</label>
                <input placeholder="Clerk user ID" value={rentalForm.parent_user_id} onChange={e => setRentalForm({ ...rentalForm, parent_user_id: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Gear Item</label>
                <select value={rentalForm.item_id} onChange={e => setRentalForm({ ...rentalForm, item_id: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}>
                  <option value="">Select gear...</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.id}>{item.label} ({equipmentTypes[item.type] || item.type})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start Date</label>
                  <input type="date" value={rentalForm.starts_at} onChange={e => setRentalForm({ ...rentalForm, starts_at: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>End Date (optional)</label>
                  <input type="date" value={rentalForm.ends_at} onChange={e => setRentalForm({ ...rentalForm, ends_at: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Deposit (PHP, optional)</label>
                  <input type="number" placeholder="0" value={rentalForm.deposit_required_cents} onChange={e => setRentalForm({ ...rentalForm, deposit_required_cents: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Monthly Rate (PHP)</label>
                  <input type="number" placeholder="0" value={rentalForm.monthly_rate_cents} onChange={e => setRentalForm({ ...rentalForm, monthly_rate_cents: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }} />
                </div>
              </div>
              <textarea placeholder="Notes" value={rentalForm.notes} onChange={e => setRentalForm({ ...rentalForm, notes: e.target.value })} rows={2} style={{ padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowRentalForm(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveRental} disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                {loading ? 'Creating...' : 'Create Rental'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
