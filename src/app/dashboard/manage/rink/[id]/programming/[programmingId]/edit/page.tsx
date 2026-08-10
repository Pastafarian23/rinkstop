// src/app/dashboard/manage/rink/[id]/programming/[programmingId]/edit/page.tsx
//
// WS17 PR3a - Owner programming edit form.
//
// Client component. Fetches the existing row on mount, populates the form,
// submits to PATCH /api/owner/rinks/[id]/programming/[programmingId].
// Includes a soft-delete button (sets status='archived').

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
const SKILL_LEVELS = ['all','beginner','intermediate','advanced','elite'] as const;
const GENDERS = ['all','boys','girls','men','women','coed'] as const;
const STATUSES = ['draft','published','archived'] as const;

const ACTIVITY_TYPES = [
  'public_skate','stick_and_puck','learn_to_skate','open_hockey','pickup','drop_in',
  'youth_league','adult_league','shinny','rat_hockey','broomball','figure_skating','tournament','camp','tryout','showcase','other',
] as const;

interface FormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity_type: string;
  skill_level: string;
  gender: string;
  age_min: string;
  age_max: string;
  price_cents: string;
  currency: string;
  capacity: string;
  description: string;
  gear_rules: string;
  status: string;
}

export default function EditProgrammingPage() {
  const router = useRouter();
  const params = useParams<{ id: string; programmingId: string }>();
  const { id, programmingId } = params;
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/owner/rinks/${id}/programming/${programmingId}`);
      if (!res.ok) {
        if (!cancelled) {
          setError(`Failed to load (${res.status})`);
          setLoading(false);
        }
        return;
      }
      const r = await res.json();
      if (cancelled) return;
      setForm({
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        activity_type: r.activity_type,
        skill_level: r.skill_level,
        gender: r.gender,
        age_min: r.age_min === null ? '' : String(r.age_min),
        age_max: r.age_max === null ? '' : String(r.age_max),
        price_cents: r.price_cents === null ? '' : (r.price_cents / 100).toFixed(2),
        currency: r.currency,
        capacity: r.capacity === null ? '' : String(r.capacity),
        description: r.description ?? '',
        gear_rules: r.gear_rules ?? '',
        status: r.status,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, programmingId]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => prev ? ({ ...prev, [key]: value }) : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      activity_type: form.activity_type,
      skill_level: form.skill_level,
      gender: form.gender,
      age_min: form.age_min === '' ? null : Number(form.age_min),
      age_max: form.age_max === '' ? null : Number(form.age_max),
      price_cents: form.price_cents === '' ? null : Math.round(Number(form.price_cents) * 100),
      currency: form.currency,
      capacity: form.capacity === '' ? null : Number(form.capacity),
      description: form.description || null,
      gear_rules: form.gear_rules || null,
      status: form.status,
    };

    const res = await fetch(`/api/owner/rinks/${id}/programming/${programmingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || `Failed (${res.status})`);
      setSubmitting(false);
      return;
    }

    router.push(`/dashboard/manage/rink/${id}/programming`);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('Archive this programming slot? It will be hidden from visitors but can be restored.')) return;
    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/owner/rinks/${id}/programming/${programmingId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || `Failed (${res.status})`);
      setDeleting(false);
      return;
    }

    router.push(`/dashboard/manage/rink/${id}/programming`);
    router.refresh();
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 720, color: '#94A3B8', fontSize: '0.9rem' }}>Loading…</div>
    );
  }

  if (!form) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 6 }}>
          {error || 'Programming not found.'}
        </div>
        <Link href={`/dashboard/manage/rink/${id}/programming`} style={{ display: 'inline-block', marginTop: '1rem', color: '#94A3B8', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to Programming
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <Link href={`/dashboard/manage/rink/${id}/programming`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
        ← Back to Programming
      </Link>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>Edit programming</h1>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <Field label="Day of week" required>
            <select value={form.day_of_week} onChange={e => update('day_of_week', Number(e.target.value))} style={inputStyle}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="Start time" required>
            <input type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)} style={inputStyle} required />
          </Field>
          <Field label="End time" required>
            <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} style={inputStyle} required />
          </Field>
        </div>

        <Field label="Activity type" required>
          <select value={form.activity_type} onChange={e => update('activity_type', e.target.value)} style={inputStyle}>
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Skill level">
            <select value={form.skill_level} onChange={e => update('skill_level', e.target.value)} style={inputStyle}>
              {SKILL_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={e => update('gender', e.target.value)} style={inputStyle}>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Age min (optional)">
            <input type="number" min="0" max="99" value={form.age_min} onChange={e => update('age_min', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Age max (optional)">
            <input type="number" min="0" max="99" value={form.age_max} onChange={e => update('age_max', e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem' }}>
          <Field label="Price (leave blank for free)">
            <input type="number" min="0" step="0.01" value={form.price_cents} onChange={e => update('price_cents', e.target.value)} placeholder="0.00" style={inputStyle} />
          </Field>
          <Field label="Currency">
            <input type="text" maxLength={3} value={form.currency} onChange={e => update('currency', e.target.value.toUpperCase())} style={inputStyle} />
          </Field>
          <Field label="Capacity">
            <input type="number" min="1" value={form.capacity} onChange={e => update('capacity', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => update('status', e.target.value)} style={inputStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description (optional)">
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <Field label="Gear rules (optional)">
          <textarea value={form.gear_rules} onChange={e => update('gear_rules', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button type="submit" disabled={submitting} style={{ background: '#38BDF8', color: '#0F172A', border: 'none', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Saving…' : form.status === 'published' ? 'Save & publish' : 'Save draft'}
          </button>
          <Link href={`/dashboard/manage/rink/${id}/programming`} style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
            Cancel
          </Link>
          <div style={{ flex: 1 }} />
          {form.status !== 'archived' && (
            <button type="button" onClick={handleDelete} disabled={deleting} style={{ background: 'rgba(200,16,46,0.15)', color: '#FCA5A5', border: '1px solid rgba(200,16,46,0.4)', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', cursor: deleting ? 'wait' : 'pointer' }}>
              {deleting ? 'Archiving…' : 'Archive'}
            </button>
          )}
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
