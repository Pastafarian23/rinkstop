'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export type Category = 'pro_shop' | 'sharpening' | 'camp' | 'training' | 'equipment' | 'other';
export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'pro_shop',   label: 'Pro shop',     emoji: '🛍️' },
  { value: 'sharpening', label: 'Sharpening',   emoji: '🪒' },
  { value: 'camp',       label: 'Camp / clinic', emoji: '🏒' },
  { value: 'training',   label: 'Training',     emoji: '💪' },
  { value: 'equipment',  label: 'Equipment',    emoji: '🥇' },
  { value: 'other',      label: 'Other',        emoji: '•' },
];

export interface Listing {
  id: string;
  owner_user_id: string;
  listing_type: string;
  business_name: string;
  category: Category;
  description: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  logo_url: string | null;
  photos: string[];
  hours: Record<string, string> | null;
  is_published: boolean;
  is_featured?: boolean;
  featured_at?: string | null;
  featured_until?: string | null;
  tier: string;
  created_at: string;
  updated_at: string;
}

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export default function ListingsManager({ userTier = 'free' }: { userTier?: string } = {}) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [editing, setEditing] = useState<Listing | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/listings');
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load listings');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {editing === null && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
                YOUR BUSINESS LISTINGS
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
                Pro shops, sharpening, camps, training — anything that isn&rsquo;t a rink, team, or league.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing('new')}
              style={{
                background: '#14B8A6', color: '#0a0a0a', border: 'none', borderRadius: 6,
                padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              + New listing
            </button>
          </div>

          {listings === null ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Loading…</div>
          ) : listings.length === 0 ? (
            <EmptyState onCreate={() => setEditing('new')} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onEdit={() => setEditing(l)}
                  onDeleted={load}
                  userTier={userTier}
                  onChange={load}
                />
              ))}
            </div>
          )}
        </>
      )}

      {editing !== null && (
        <ListingForm
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      style={{
        background: '#0f0f0f', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12,
        padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
      }}
    >
      <div style={{ fontSize: '2.5rem' }}>🛍️</div>
      <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
        NO LISTINGS YET
      </h3>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: 420, margin: 0, lineHeight: 1.5 }}>
        Pro shop, sharpening, camp, or training? Add a listing to appear in the directory and start receiving leads.
      </p>
      <button
        type="button"
        onClick={onCreate}
        style={{
          background: '#14B8A6', color: '#0a0a0a', border: 'none', borderRadius: 6,
          padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
          marginTop: '0.5rem', letterSpacing: '0.03em',
        }}
      >
        Create your first listing
      </button>
    </div>
  );
}

function ListingCard({ listing, onEdit, onDeleted, userTier, onChange }: { listing: Listing; onEdit: () => void; onDeleted: () => void; userTier: string; onChange: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      onDeleted();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  }

  const cat = CATEGORIES.find((c) => c.value === listing.category);
  const cover = listing.photos[0] || null;

  return (
    <div
      style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div
        style={{
          aspectRatio: '16/9', background: cover ? `url(${cover}) center/cover` : 'linear-gradient(135deg, #1e1e1e 0%, #0a0a0a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '2.5rem',
        }}
      >
        {!cover && (cat?.emoji || '🛍️')}
      </div>
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
            {listing.business_name}
          </h3>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: '0.1rem 0.5rem', borderRadius: 999,
            background: listing.is_published ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.05)',
            color: listing.is_published ? '#14B8A6' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${listing.is_published ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            {listing.is_published ? 'Published' : 'Draft'}
          </span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          {cat?.emoji} {cat?.label}{listing.location ? ` · ${listing.location}` : ''}
        </div>
        {listing.description && (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {listing.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              background: 'transparent', border: '1px solid #1e1e1e', color: '#fff', borderRadius: 6,
              padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <FeatureButton listing={listing} userTier={userTier} onChange={onChange} />
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              style={{
                background: 'transparent', border: '1px solid rgba(200,16,46,0.3)', color: '#FF6B7A', borderRadius: 6,
                padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Delete
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: '#C8102E', border: 'none', color: '#fff', borderRadius: 6,
                  padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, cursor: deleting ? 'wait' : 'pointer',
                }}
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', borderRadius: 6,
                  padding: '0.4rem 0.85rem', fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface FormProps {
  initial: Listing | null;  // null = create new
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}

function ListingForm({ initial, onCancel, onSaved }: FormProps) {
  const [businessName, setBusinessName] = useState(initial?.business_name || '');
  const [category, setCategory] = useState<Category>(initial?.category || 'pro_shop');
  const [description, setDescription] = useState(initial?.description || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [contactEmail, setContactEmail] = useState(initial?.contact_email || '');
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone || '');
  const [website, setWebsite] = useState(initial?.website || '');
  const [hours, setHours] = useState<Record<string, string>>(initial?.hours || {});
  const [photos, setPhotos] = useState<string[]>(initial?.photos || []);
  const [isPublished, setIsPublished] = useState(initial?.is_published || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(initial?.id || null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        business_name: businessName,
        category,
        description: description || null,
        location: location || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        website: website || null,
        hours: Object.keys(hours).length > 0 ? hours : null,
        is_published: isPublished,
      };
      const url = savedId ? `/api/listings/${savedId}` : '/api/listings';
      const method = savedId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Save failed (${res.status})`);
      }
      const data = await res.json();
      const newId = data.listing?.id || savedId;
      if (newId && newId !== savedId) setSavedId(newId);
      // Stay on the form so the user can upload photos. Show a saved message.
      setError(null);
      alert('Saved.');
      if (savedId) {
        // If they were editing an existing listing, go back to the list.
        await onSaved();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.75rem',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}
    >
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.4rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
          {initial ? 'EDIT LISTING' : 'NEW LISTING'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
          Fill in the basics. You can publish when you&rsquo;re ready.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <Field label="Business name" required>
        <input
          type="text" required minLength={2} maxLength={120}
          value={businessName} onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Joe's Hockey Shop"
          style={inputStyle}
        />
      </Field>

      <Field label="Category" required>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {CATEGORIES.map((c) => (
            <label
              key={c.value}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem',
                border: category === c.value ? '2px solid #14B8A6' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', background: category === c.value ? 'rgba(20,184,166,0.08)' : 'transparent',
                color: '#fff',
              }}
            >
              <input type="radio" name="category" value={c.value} checked={category === c.value} onChange={() => setCategory(c.value)} style={{ display: 'none' }} />
              <span style={{ fontSize: '1rem' }}>{c.emoji}</span>
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Description" hint="Up to 2000 characters. Tell people what you offer.">
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          rows={4} maxLength={2000}
          placeholder="Full-service pro shop with skate sharpening, equipment fitting, and team sales. Open year-round."
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
        />
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 2 }}>{description.length} / 2000</div>
      </Field>

      <Field label="Location" hint="Free-form. City, region, or service area.">
        <input
          type="text" maxLength={200}
          value={location} onChange={(e) => setLocation(e.target.value)}
          placeholder="Cebu City, Philippines"
          style={inputStyle}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Field label="Contact email">
          <input
            type="email" maxLength={254}
            value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
            placeholder="shop@example.com"
            style={inputStyle}
          />
        </Field>
        <Field label="Contact phone">
          <input
            type="tel" maxLength={50}
            value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+63 32 123 4567"
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Website">
        <input
          type="url" maxLength={500}
          value={website} onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          style={inputStyle}
        />
      </Field>

      <Field label="Hours" hint="Optional. Free-form, one line per day you want to show. Leave a day blank to hide it.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {DAYS.map((d) => (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: 30, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {d.label}
              </span>
              <input
                type="text" maxLength={40}
                value={hours[d.key] || ''}
                onChange={(e) => setHours((h) => ({ ...h, [d.key]: e.target.value }))}
                placeholder="9–17"
                style={{ ...inputStyle, padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
              />
            </div>
          ))}
        </div>
      </Field>

      <Field label="Photos" hint="Up to 8 photos (DB allows 12). Reorder with arrows, click × to remove.">
        <PhotoManager
          listingId={savedId}
          photos={photos}
          onChange={setPhotos}
        />
      </Field>

      <Field label="">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#fff', fontSize: '0.9rem' }}>
          <input
            type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)}
            style={{ accentColor: '#14B8A6', width: 16, height: 16 }}
          />
          <span>Publish this listing</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>(otherwise saved as draft)</span>
        </label>
      </Field>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #1e1e1e', paddingTop: '1rem' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: '#14B8A6', color: '#0a0a0a', border: 'none', borderRadius: 6,
            padding: '0.625rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : (initial ? 'Save changes' : 'Create listing')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 6,
            padding: '0.625rem 1.25rem', fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        {!savedId && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            Save once before adding photos.
          </span>
        )}
        {savedId && (
          <Link href={`/dashboard/leads?listing=${savedId}`} style={{ color: '#FFB81C', fontSize: '0.85rem', textDecoration: 'none', marginLeft: 'auto' }}>
            View leads →
          </Link>
        )}
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 6, color: '#fff',
  padding: '0.5rem 0.75rem', fontSize: '0.9rem', width: '100%', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.02em' }}>
        {label}{required && <span style={{ color: '#C8102E', marginLeft: 2 }}>*</span>}
        {hint && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 6 }}>· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function PhotoManager({ listingId, photos, onChange }: { listingId: string | null; photos: string[]; onChange: (next: string[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!listingId) {
      setError('Save the listing first to add photos.');
      return;
    }
    if (photos.length >= 12) {
      setError('Maximum 12 photos.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const next = [...photos];
      for (const file of Array.from(files)) {
        if (next.length >= 12) break;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('listing_id', listingId);
        const res = await fetch('/api/listings/photos', { method: 'POST', body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed (${res.status})`);
        }
        const data = await res.json();
        next.push(data.url);
      }
      onChange(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removeAt(idx: number) {
    const url = photos[idx];
    if (!listingId) {
      // No DB row yet — just remove locally
      const next = photos.filter((_, i) => i !== idx);
      onChange(next);
      return;
    }
    try {
      const res = await fetch('/api/listings/photos/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Remove failed (${res.status})`);
      }
      const next = photos.filter((_, i) => i !== idx);
      onChange(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= photos.length) return;
    const arr = [...photos];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((url, i) => (
          <div
            key={url}
            style={{
              position: 'relative', width: 110, height: 110, borderRadius: 6, overflow: 'hidden',
              border: '1px solid #1e1e1e', background: '#0a0a0a',
            }}
          >
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', gap: 2 }}>
              <button
                type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 22, height: 22, borderRadius: 4, cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.3 : 1, fontSize: 11 }}
              >↑</button>
              <button
                type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Move down"
                style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 22, height: 22, borderRadius: 4, cursor: i === photos.length - 1 ? 'not-allowed' : 'pointer', opacity: i === photos.length - 1 ? 0.3 : 1, fontSize: 11 }}
              >↓</button>
            </div>
            <button
              type="button" onClick={() => removeAt(i)} aria-label="Remove photo"
              style={{
                position: 'absolute', top: 4, right: 4,
                background: 'rgba(200,16,46,0.9)', border: 'none', color: '#fff', width: 22, height: 22, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >×</button>
            {i === 0 && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#FFB81C', fontSize: 9, fontWeight: 700, padding: '2px 0', textAlign: 'center', letterSpacing: '0.05em' }}>
                COVER
              </div>
            )}
          </div>
        ))}
        {photos.length < 12 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !listingId}
            title={!listingId ? 'Save the listing first' : 'Add photo'}
            style={{
              width: 110, height: 110, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.2)',
              background: 'transparent', color: listingId ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
              cursor: !listingId ? 'not-allowed' : (uploading ? 'wait' : 'pointer'),
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.75rem',
            }}
          >
            <span style={{ fontSize: 22 }}>＋</span>
            <span>{uploading ? 'Uploading…' : 'Add photo'}</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && (
        <div style={{ marginTop: 6, color: '#FF6B7A', fontSize: '0.8rem' }}>{error}</div>
      )}
    </div>
  );
}

// Phase 1c-2: Featured placement toggle. Tier-gated on Business Plus+.
// Free feature in v1 (no payment); v2 will gate behind a payment flow.
function FeatureButton({ listing, userTier, onChange }: { listing: Listing; userTier: string; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tierOk = userTier === 'business_plus' || userTier === 'founding_member' || (userTier as string) === 'club_elite' || (userTier as string) === 'club_pro';
  // The pricing page promises Featured Placement at Business Plus ($299/yr).
  // We also allow Founding Member and Club Pro/Elite (tier hierarchy; the gate
  // function is the same one used in the API route — kept inline here to
  // avoid a circular import).
  const isFeatured = listing.is_featured === true && (!listing.featured_until || listing.featured_until > new Date().toISOString());
  const canFeature = tierOk;

  if (!canFeature) {
    return (
      <span
        title="Featured placement requires Business Plus or higher"
        style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)',
          borderRadius: 6, padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'not-allowed',
        }}
      >
        ⭐ Featured (Business Plus)
      </span>
    );
  }

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listing.id}/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !isFeatured, duration_days: 30 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed (${res.status})`);
      }
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        data-testid="listing-feature-toggle"
        title={isFeatured ? 'Click to remove featured placement' : 'Promote to top of directory search (30 days)'}
        style={{
          background: isFeatured ? 'rgba(255,184,28,0.12)' : 'transparent',
          border: `1px solid ${isFeatured ? 'rgba(255,184,28,0.4)' : 'rgba(255,255,255,0.15)'}`,
          color: isFeatured ? '#FFB81C' : 'rgba(255,255,255,0.7)',
          borderRadius: 6,
          padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? '…' : isFeatured ? '⭐ Featured (click to remove)' : '⭐ Promote to Featured'}
      </button>
      {error ? (
        <div
          role="alert"
          style={{
            marginTop: 4, fontSize: '0.75rem', color: '#FF6B7A',
            background: 'rgba(200,16,46,0.12)', border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: 4, padding: '0.3rem 0.5rem',
          }}
        >
          {error}
        </div>
      ) : null}
    </>
  );
}
