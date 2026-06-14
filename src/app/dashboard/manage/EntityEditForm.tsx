'use client';

import { useState } from 'react';
import Link from 'next/link';

export type EntityType = 'rink' | 'team' | 'league';

interface EntityEditFormProps {
  type: EntityType;
  id: string;
  initial: Record<string, unknown>;
  slug?: string | null;
  publicHref: string;
}

// Shared edit form for rinks/teams/leagues. The fields are different per
// type, so this component just renders a generic form with the right
// schema passed in. The form does optimistic-ish update (server response
// replaces local state on success).
const SCHEMAS: Record<EntityType, FieldDef[]> = {
  rink: [
    { key: 'name',            label: 'Name',                type: 'text',     required: true, hint: 'Public name shown on the directory page.' },
    { key: 'address',         label: 'Street address',      type: 'text' },
    { key: 'city',            label: 'City',                type: 'text' },
    { key: 'province_state',  label: 'State / Province',    type: 'text' },
    { key: 'country',         label: 'Country',             type: 'text' },
    { key: 'capacity',        label: 'Capacity (seats)',    type: 'number' },
    { key: 'ice_size',        label: 'Ice size',            type: 'text', hint: 'e.g. NHL, Olympic, recreational' },
    { key: 'surface_type',    label: 'Surface type',        type: 'text', hint: 'e.g. indoor, outdoor' },
    { key: 'phone',           label: 'Phone',               type: 'text' },
    { key: 'email',           label: 'Email',               type: 'text' },
    { key: 'website_url',     label: 'Website',             type: 'text' },
    { key: 'notes',           label: 'Public notes',        type: 'textarea', hint: 'Free-form, shown on the directory page (markdown not supported).' },
  ],
  team: [
    { key: 'name',            label: 'Team name',           type: 'text',     required: true },
    { key: 'city',            label: 'City',                type: 'text' },
    { key: 'country',         label: 'Country',             type: 'text' },
    { key: 'division',        label: 'Division / level',    type: 'text', hint: 'e.g. U12, A, Beer League, NHL' },
    { key: 'colors',          label: 'Team colors',         type: 'colors', hint: 'Up to 6, e.g. Red, White' },
    { key: 'website_url',     label: 'Website',             type: 'text' },
  ],
  league: [
    { key: 'name',            label: 'League name',         type: 'text',     required: true },
    { key: 'country',         label: 'Country',             type: 'text' },
    { key: 'level',           label: 'Level',               type: 'text', hint: 'e.g. Youth, Adult, Pro, Recreational' },
    { key: 'description',     label: 'Description',         type: 'textarea', hint: 'Free-form, shown on the directory page (markdown not supported).' },
    { key: 'website_url',     label: 'Website',             type: 'text' },
  ],
};

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'colors';
  required?: boolean;
  hint?: string;
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 6, color: '#fff',
  padding: '0.5rem 0.75rem', fontSize: '0.9rem', width: '100%', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function EntityEditForm({ type, id, initial, slug, publicHref }: EntityEditFormProps) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const f of SCHEMAS[type]) {
      out[f.key] = (initial as any)[f.key] ?? '';
    }
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Strip empty strings to null (clears the field server-side)
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        body[k] = typeof v === 'string' && v === '' ? null : v;
      }
      const res = await fetch(`/api/manage/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || `Save failed (${res.status})`);
      }
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.75rem',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          {SCHEMAS[type].find((f) => f.key === 'name') ? `Edit ${type}` : 'Edit'}
        </h2>
        <Link
          href={publicHref}
          target="_blank" rel="noopener noreferrer"
          style={{ color: '#14B8A6', textDecoration: 'none', fontSize: '0.85rem' }}
        >
          View public page ↗
        </Link>
      </div>

      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      {saved && (
        <div style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.4)', color: '#14B8A6', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem' }}>
          ✓ Saved. The public page reflects your changes.
        </div>
      )}

      {SCHEMAS[type].map((f) => (
        <FieldRenderer
          key={f.key} field={f} value={form[f.key]} onChange={(v) => set(f.key, v)}
        />
      ))}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #1e1e1e', paddingTop: '1rem' }}>
        <button
          type="submit" disabled={saving}
          style={{ background: '#14B8A6', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '0.625rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href="/dashboard/claims"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '0.625rem 1.25rem', fontSize: '0.9rem', textDecoration: 'none' }}
        >
          Back to claims
        </Link>
        {slug && (
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            /{type === 'rink' ? `directory/rinks/${slug}` : type === 'team' ? `directory/teams/${slug}` : `directory/leagues/${id}`}
          </span>
        )}
      </div>
    </form>
  );
}

function FieldRenderer({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const labelEl = (
    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.02em' }}>
      {field.label}{field.required && <span style={{ color: '#C8102E', marginLeft: 2 }}>*</span>}
      {field.hint && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 6 }}>· {field.hint}</span>}
    </label>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {labelEl}
      {field.type === 'textarea' ? (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
        />
      ) : field.type === 'number' ? (
        <input
          type="number" min={0} max={100000}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={inputStyle}
        />
      ) : field.type === 'colors' ? (
        <ColorsInput value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
      ) : (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function ColorsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {value.map((c, i) => (
          <span
            key={`${c}-${i}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '0.2rem 0.5rem', background: 'rgba(20,184,166,0.12)', color: '#14B8A6',
              border: '1px solid rgba(20,184,166,0.4)', borderRadius: 999, fontSize: '0.8rem',
            }}
          >
            {c}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              style={{ background: 'transparent', border: 'none', color: '#14B8A6', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1, padding: 0 }}
              aria-label={`Remove ${c}`}
            >×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder="Add color and press Enter"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const v = draft.trim();
              if (v && value.length < 6) onChange([...value, v]);
              setDraft('');
            }
          }}
          style={inputStyle}
        />
        <button
          type="button"
          disabled={!draft.trim() || value.length >= 6}
          onClick={() => {
            const v = draft.trim();
            if (v && value.length < 6) onChange([...value, v]);
            setDraft('');
          }}
          style={{ background: 'transparent', border: '1px solid #1e1e1e', color: '#fff', borderRadius: 6, padding: '0 0.85rem', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
