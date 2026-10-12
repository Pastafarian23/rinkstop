// src/app/dashboard/manage/rink/[id]/programming/quick/QuickAddForm.tsx
//
// WS32 - Quick-add client form.
//
// 5 fields: day_of_week, start_time, end_time, activity_type, price_cents.
// Everything else gets safe values server-side (skill_level='all', gender='all',
// age_min/max=null, currency='USD', capacity=null, description/gear_rules=null,
// status='draft').
//
// Two submit buttons:
//   - "Save and add another" — posts, clears form fields, keeps day_of_week
//     so the operator can rapidly duplicate the same time slot across days.
//   - "Save and done" — posts, then navigates to the programming list.
//
// Why "Save and add another" remembers day_of_week: the common case is
// "Mon/Wed/Fri 7-8pm public skate". Keeping the day sticky lets the operator
// just change the day in one click for each save. We deliberately don't try
// to be cleverer (e.g. suggesting next-empty-day) — operator knows their
// schedule better than heuristics do.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;

const ACTIVITY_TYPES = [
  'public_skate','stick_and_puck','learn_to_skate','open_hockey','pickup','drop_in',
  'youth_league','adult_league','shinny','rat_hockey','broomball','figure_skating','tournament','camp','tryout','showcase','other',
] as const;

interface FormState {
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity_type: string;
  price_cents: string;
}

const initialForm: FormState = {
  day_of_week: 6, // Saturday default — most common entry point for weekend rec slots
  start_time: '',
  end_time: '',
  activity_type: 'public_skate',
  price_cents: '',
};

export default function QuickAddForm({ rinkId, rinkName }: { rinkId: string; rinkName: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAdds, setRecentAdds] = useState<string[]>([]); // "Mon 7:00–8:00 PM public_skate"

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function save(mode: 'add-another' | 'done') {
    setError(null);
    if (!form.start_time || !form.end_time) {
      setError('Start and end time are required.');
      return;
    }
    if (form.start_time >= form.end_time) {
      setError('End time must be after start time.');
      return;
    }
    setSubmitting(true);
    try {
      // The full /api/owner/rinks/[id]/programming route already accepts partial
      // bodies and fills in defaults. We pass exactly the 5 fields operators
      // see in this form plus status='draft' (the operator can publish later
      // from the list).
      const res = await fetch(`/api/owner/rinks/${rinkId}/programming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
          activity_type: form.activity_type,
          price_cents: form.price_cents === '' ? null : Math.round(Number(form.price_cents) * 100),
          status: 'draft',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Failed (${res.status}).`);
        setSubmitting(false);
        return;
      }
      // Track for the success toast.
      setRecentAdds((prev) => [
        `${DAYS[form.day_of_week]} ${formatTime12(form.start_time)}–${formatTime12(form.end_time)} ${form.activity_type.replace(/_/g, ' ')}`,
        ...prev,
      ].slice(0, 5));
      if (mode === 'done') {
        router.push(`/dashboard/manage/rink/${rinkId}/programming`);
        router.refresh();
        return;
      }
      // "add another": reset just the time/activity/price so the operator can
      // pick a new day. Sticky day keeps the "Mon, Wed, Fri" workflow fast.
      setForm(prev => ({ ...prev, start_time: '', end_time: '', price_cents: '' }));
      setSubmitting(false);
      // Make sure the parent programming list reflects the new draft if the
      // operator eventually navigates back to it.
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'Network error.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {recentAdds.length > 0 && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', color: '#86EFAC', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Saved (draft)</div>
          <ul style={{ paddingLeft: '1.25rem', color: '#BBF7D0' }}>
            {recentAdds.map((label, i) => (<li key={i}>{label}</li>))}
          </ul>
        </div>
      )}

      <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <Field label="Day" required>
            <select value={form.day_of_week} onChange={e => update('day_of_week', Number(e.target.value))} style={inputStyle}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="Start time" required>
            <input type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="End time" required>
            <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Activity type" required>
          <select value={form.activity_type} onChange={e => update('activity_type', e.target.value)} style={inputStyle}>
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>

        <Field label="Price (leave blank for free)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price_cents}
            onChange={e => update('price_cents', e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </Field>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => save('add-another')}
            disabled={submitting}
            style={{ background: '#38BDF8', color: '#0F172A', border: 'none', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', cursor: submitting ? 'wait' : 'pointer' }}
          >
            {submitting ? 'Saving…' : 'Save and add another →'}
          </button>
          <button
            type="button"
            onClick={() => save('done')}
            disabled={submitting}
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', cursor: submitting ? 'wait' : 'pointer' }}
          >
            {submitting ? 'Saving…' : 'Save and done'}
          </button>
          <Link
            href={`/dashboard/manage/rink/${rinkId}/programming`}
            style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
          >
            Cancel
          </Link>
        </div>
      </div>

      <div style={{ background: 'rgba(13,17,23,0.4)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#94A3B8' }}>
        All quick-add slots are saved as <strong style={{ color: '#FCD34D' }}>drafts</strong>. Publish them from the programming list once you&rsquo;ve added your full week.
      </div>
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

function formatTime12(hhmm: string): string {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}