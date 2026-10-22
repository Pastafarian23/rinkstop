// src/app/dashboard/manage/team/[id]/programs/ProgramForm.tsx
//
// WS38 - Organization Plus team-registration-management.
//
// Shared client form for create + edit of a team_events row.
// Mirrors the rink-programming new/edit form layout but uses the actual
// team_events columns.

'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { buildCurrencyOptions, countryToCurrency } from '@/lib/currency';

const EVENT_KINDS = ['practice', 'game', 'tryout', 'tournament', 'camp', 'meeting', 'other'] as const;
const STATUSES = ['scheduled', 'cancelled', 'completed'] as const;

interface FormData {
  event_kind: string;
  title: string;
  description: string;
  starts_at: string; // datetime-local string
  ends_at: string;
  arrival_minutes: string;
  cost_per_player: string;
  currency: string;
  rsvp_required: boolean;
  rsvp_deadline: string;
  max_attendees: string;
  opposing_team: string;
  location_note: string;
  status: string;
  rink_id: string;
  is_off_ice: boolean;
  timezone: string;
}

interface ProgramFormProps {
  isEdit: boolean;
  initial: Partial<FormData>;
  rinkOptions: Array<{ id: string; name: string }>;
  defaultCurrency: string;
  teamCountry: string | null;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  // YYYY-MM-DDTHH:MM (datetime-local format)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export default function ProgramForm({ isEdit, initial, rinkOptions, defaultCurrency, teamCountry }: ProgramFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id as string;

  // Build the currency dropdown options. The team's local currency (derived
  // from teamCountry) is always shown first; USD is always available as the
  // explicit fallback per the 2026-10-12 currency directive.
  const currencyOptions = useMemo(() => {
    const localCurrency = countryToCurrency(teamCountry);
    return buildCurrencyOptions(localCurrency);
  }, [teamCountry]);

  const [form, setForm] = useState<FormData>({
    event_kind: initial.event_kind || 'practice',
    title: initial.title || '',
    description: initial.description || '',
    starts_at: toLocalInput(initial.starts_at as unknown as string),
    ends_at: toLocalInput(initial.ends_at as unknown as string),
    arrival_minutes: initial.arrival_minutes || '30',
    cost_per_player: initial.cost_per_player === undefined || initial.cost_per_player === null
      ? ''
      : String(initial.cost_per_player),
    currency: initial.currency || defaultCurrency || 'USD',
    rsvp_required: initial.rsvp_required ?? true,
    rsvp_deadline: toLocalInput(initial.rsvp_deadline as unknown as string),
    max_attendees: initial.max_attendees === undefined || initial.max_attendees === null
      ? ''
      : String(initial.max_attendees),
    opposing_team: initial.opposing_team || '',
    location_note: initial.location_note || '',
    status: initial.status || 'scheduled',
    rink_id: initial.rink_id || '',
    is_off_ice: initial.is_off_ice ?? false,
    timezone: initial.timezone || '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!form.title.trim()) {
      setError('Title is required.');
      setSubmitting(false);
      return;
    }
    if (!form.starts_at) {
      setError('Start time is required.');
      setSubmitting(false);
      return;
    }
    if (!form.ends_at) {
      setError('End time is required.');
      setSubmitting(false);
      return;
    }
    const startMs = Date.parse(form.starts_at);
    const endMs = Date.parse(form.ends_at);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setError('Invalid date format.');
      setSubmitting(false);
      return;
    }
    if (endMs <= startMs) {
      setError('End time must be after start time.');
      setSubmitting(false);
      return;
    }

    const body: Record<string, unknown> = {
      event_kind: form.event_kind,
      title: form.title.trim(),
      description: form.description || null,
      starts_at: fromLocalInput(form.starts_at),
      ends_at: fromLocalInput(form.ends_at),
      arrival_minutes: parseInt(form.arrival_minutes || '30', 10),
      cost_per_player: form.cost_per_player === '' ? null : Number(form.cost_per_player),
      currency: (form.currency || 'USD').toUpperCase().slice(0, 3),
      rsvp_required: form.rsvp_required,
      rsvp_deadline: form.rsvp_deadline ? fromLocalInput(form.rsvp_deadline) : null,
      max_attendees: form.max_attendees === '' ? null : parseInt(form.max_attendees, 10),
      opposing_team: form.opposing_team || null,
      location_note: form.location_note || null,
      status: form.status,
      rink_id: form.rink_id || null,
      is_off_ice: form.is_off_ice,
    };
    if (form.timezone) body.timezone = form.timezone;

    const programId = (initial as { id?: string }).id;
    const url = programId
      ? `/api/manage/team/${id}/programs/${programId}`
      : `/api/manage/team/${id}/programs`;
    const method = programId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({} as { error?: string }));
      setError(j.error || `Failed (${res.status})`);
      setSubmitting(false);
      return;
    }
    const j = (await res.json().catch((): null => null)) as { id?: string } | null;
    router.push(`/dashboard/manage/team/${id}/programs`);
    router.refresh();
    // j is intentionally unused; we just need the redirect to fire.
    void j;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <Link href={`/dashboard/manage/team/${id}/programs`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
        ← Back to Programs
      </Link>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>
        {isEdit ? 'Edit Program' : 'Create Program'}
      </h1>
      <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
        {isEdit
          ? 'Update details for this program. RSVPs are preserved unless you cancel the program.'
          : 'Create a practice, tryout, tournament game, or other team event. RSVPs start as soon as you save.'}
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <Field label="Title" required>
          <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Tuesday practice — full ice" style={inputStyle} required />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Event kind">
            <select value={form.event_kind} onChange={(e) => update('event_kind', e.target.value)} style={inputStyle}>
              {EVENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => update('status', e.target.value)} style={inputStyle}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Starts at" required>
            <input type="datetime-local" value={form.starts_at} onChange={(e) => update('starts_at', e.target.value)} style={inputStyle} required />
          </Field>
          <Field label="Ends at" required>
            <input type="datetime-local" value={form.ends_at} onChange={(e) => update('ends_at', e.target.value)} style={inputStyle} required />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem' }}>
          <Field label="Rink (optional)">
            <select value={form.rink_id} onChange={(e) => update('rink_id', e.target.value)} style={inputStyle}>
              <option value="">— No specific rink —</option>
              {rinkOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Arrival (min)">
            <input type="number" min="0" max="600" value={form.arrival_minutes} onChange={(e) => update('arrival_minutes', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Currency">
            <select value={form.currency} onChange={(e) => update('currency', e.target.value)} style={inputStyle}>
              {currencyOptions.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.2rem' }}>
              Default is your team's local currency. Pick USD to invoice in dollars.
            </span>
          </Field>
          <Field label="Capacity">
            <input type="number" min="1" value={form.max_attendees} onChange={(e) => update('max_attendees', e.target.value)} placeholder="unlimited" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <Field label="Cost per player (leave blank for free)">
            <input type="number" min="0" step="0.01" value={form.cost_per_player} onChange={(e) => update('cost_per_player', e.target.value)} placeholder="0.00" style={inputStyle} />
          </Field>
          <Field label="Off-ice activity">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: '#cbd5e1', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={form.is_off_ice} onChange={(e) => update('is_off_ice', e.target.checked)} />
              <span>Off-ice (no rink slot)</span>
            </label>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Opposing team (optional)">
            <input type="text" value={form.opposing_team} onChange={(e) => update('opposing_team', e.target.value)} placeholder="e.g. Lisbon Wolves" style={inputStyle} />
          </Field>
          <Field label="Location note (optional)">
            <input type="text" value={form.location_note} onChange={(e) => update('location_note', e.target.value)} placeholder="e.g. Rink B, blue jersey" style={inputStyle} />
          </Field>
        </div>

        <Field label="Description (optional)">
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What players should know about this program" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <Field label="Collect RSVPs">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: '#cbd5e1', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={form.rsvp_required} onChange={(e) => update('rsvp_required', e.target.checked)} />
              <span>Collect yes/no RSVPs from members</span>
            </label>
          </Field>
          <Field label="RSVP deadline (optional)">
            <input type="datetime-local" value={form.rsvp_deadline} onChange={(e) => update('rsvp_deadline', e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Timezone (optional)">
          <input type="text" value={form.timezone} onChange={(e) => update('timezone', e.target.value)} placeholder="e.g. America/Chicago" style={inputStyle} />
        </Field>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" disabled={submitting} style={{ background: '#38BDF8', color: '#0F172A', border: 'none', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create program'}
          </button>
          <Link href={`/dashboard/manage/team/${id}/programs`} style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#FCA5A5' }}> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '0.5rem 0.75rem',
  color: '#fff',
  fontSize: '0.875rem',
  outline: 'none',
};