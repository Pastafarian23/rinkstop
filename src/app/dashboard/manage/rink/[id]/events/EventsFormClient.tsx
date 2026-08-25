// src/app/dashboard/manage/rink/[id]/events/EventsFormClient.tsx
//
// WS17 PR3b - Shared client component for event create + edit forms.
//
// Props:
//   mode: 'create' | 'edit'
//   rinkId: string
//   eventId: string (required when mode='edit')
//   initialData: partial event row for edit mode

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const EVENT_TYPES = [
  { value: 'tournament', label: 'Tournament' },
  { value: 'camp', label: 'Camp' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'tryout', label: 'Tryout' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'lesson_series', label: 'Lesson series' },
  { value: 'training', label: 'Training' },
  { value: 'skills_session', label: 'Skills session' },
] as const;

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const VISIBILITIES = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
] as const;

const REG_METHODS = [
  { value: '', label: 'None' },
  { value: 'external', label: 'External link' },
  { value: 'rinkstop', label: 'RinkStop registration' },
  { value: 'eventconnect', label: 'EventConnect' },
  { value: 'sportninja', label: 'SportNinja' },
] as const;

interface EventFormData {
  title: string;
  subtitle: string;
  event_type: string;
  starts_at_date: string;
  starts_at_time: string;
  ends_at_date: string;
  ends_at_time: string;
  timezone: string;
  registration_opens_at_date: string;
  registration_closes_at_date: string;
  venue_name: string;
  address: string;
  price_cents: string;
  currency: string;
  early_bird_price_cents: string;
  early_bird_until_date: string;
  capacity: string;
  spots_remaining: string;
  waitlist_enabled: boolean;
  registration_url: string;
  registration_method: string;
  status: string;
  visibility: string;
  description: string;
  tags: string;
}

interface DivisionFormData {
  name: string;
  birth_year_min: string;
  birth_year_max: string;
  skill_level: string;
  gender: string;
  capacity: string;
  spots_remaining: string;
  status: string;
}

interface Props {
  mode: 'create' | 'edit';
  rinkId: string;
  eventId?: string;
  initialData?: Partial<EventFormData>;
  existingDivisions?: Array<{
    id: string;
    name: string;
    birth_year_min: number | null;
    birth_year_max: number | null;
    skill_level: string;
    gender: string;
    capacity: number | null;
    spots_remaining: number | null;
    status: string;
  }>;
}

const initial: EventFormData = {
  title: '',
  subtitle: '',
  event_type: 'tournament',
  starts_at_date: '',
  starts_at_time: '',
  ends_at_date: '',
  ends_at_time: '',
  timezone: 'America/New_York',
  registration_opens_at_date: '',
  registration_closes_at_date: '',
  venue_name: '',
  address: '',
  price_cents: '',
  currency: 'USD',
  early_bird_price_cents: '',
  early_bird_until_date: '',
  capacity: '',
  spots_remaining: '',
  waitlist_enabled: false,
  registration_url: '',
  registration_method: '',
  status: 'draft',
  visibility: 'public',
  description: '',
  tags: '',
};

function toLocalDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseInitial(initialData?: Partial<EventFormData>, existingDivisions?: Props['existingDivisions']): EventFormData {
  if (!initialData) return initial;
  const d = initialData;
  return {
    title: d.title ?? '',
    subtitle: d.subtitle ?? '',
    event_type: d.event_type ?? 'tournament',
    starts_at_date: toLocalDate(d.starts_at_date ?? null),
    starts_at_time: toLocalTime(d.starts_at_date ?? null),
    ends_at_date: toLocalDate(d.ends_at_date ?? null),
    ends_at_time: toLocalTime(d.ends_at_date ?? null),
    timezone: d.timezone ?? 'America/New_York',
    registration_opens_at_date: toLocalDate((d as Record<string, unknown>).registration_opens_at as string ?? null),
    registration_closes_at_date: toLocalDate((d as Record<string, unknown>).registration_closes_at as string ?? null),
    venue_name: d.venue_name ?? '',
    address: d.address ?? '',
    price_cents: d.price_cents ?? '',
    currency: d.currency ?? 'USD',
    early_bird_price_cents: d.early_bird_price_cents ?? '',
    early_bird_until_date: toLocalDate((d as Record<string, unknown>).early_bird_until as string ?? null),
    capacity: d.capacity ?? '',
    spots_remaining: d.spots_remaining ?? '',
    waitlist_enabled: d.waitlist_enabled ?? false,
    registration_url: d.registration_url ?? '',
    registration_method: d.registration_method ?? '',
    status: d.status ?? 'draft',
    visibility: d.visibility ?? 'public',
    description: d.description ?? '',
    tags: Array.isArray((d as Record<string, unknown>).tags) ? ((d as Record<string, unknown>).tags as string[]).join(', ') : '',
  };
}

export default function EventsFormClient({ mode, rinkId, eventId, initialData, existingDivisions }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<EventFormData>(() => {
    if (mode === 'edit' && initialData) return parseInitial(initialData);
    return initial;
  });
  const [divisions, setDivisions] = useState<DivisionFormData[]>(
    existingDivisions?.map(d => ({
      name: d.name,
      birth_year_min: d.birth_year_min?.toString() ?? '',
      birth_year_max: d.birth_year_max?.toString() ?? '',
      skill_level: d.skill_level ?? 'all',
      gender: d.gender ?? 'coed',
      capacity: d.capacity?.toString() ?? '',
      spots_remaining: d.spots_remaining?.toString() ?? '',
      status: d.status ?? 'open',
    })) ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>((initialData as Record<string, unknown>)?.banner_image_url as string ?? null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  function update<K extends keyof EventFormData>(key: K, value: EventFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateDivision(idx: number, key: keyof DivisionFormData, value: string) {
    setDivisions(prev => prev.map((d, i) => i === idx ? { ...d, [key]: value } : d));
  }

  function addDivision() {
    setDivisions(prev => [...prev, {
      name: '',
      birth_year_min: '',
      birth_year_max: '',
      skill_level: 'all',
      gender: 'coed',
      capacity: '',
      spots_remaining: '',
      status: 'open',
    }]);
  }

  function removeDivision(idx: number) {
    setDivisions(prev => prev.filter((_, i) => i !== idx));
  }

  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    setUploadingBanner(true);
    setBannerError(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/owner/rinks/${rinkId}/events/${eventId}/banner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataUrl, filename: file.name, contentType: file.type }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setBannerError(j.error || 'Upload failed.');
        return;
      }
      const j = await res.json();
      setBannerUrl(j.url);
    } catch {
      setBannerError('Upload failed. Please try again.');
    } finally {
      setUploadingBanner(false);
    }
  }, [eventId, rinkId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const startsAt = form.starts_at_date && form.starts_at_time
      ? new Date(`${form.starts_at_date}T${form.starts_at_time}:00`).toISOString()
      : null;
    const endsAt = form.ends_at_date && form.ends_at_time
      ? new Date(`${form.ends_at_date}T${form.ends_at_time}:00`).toISOString()
      : null;

    if (!startsAt || !endsAt) {
      setError('Start and end date/time are required.');
      setSubmitting(false);
      return;
    }

    const body: Record<string, unknown> = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      event_type: form.event_type,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: form.timezone,
      registration_opens_at: form.registration_opens_at_date
        ? new Date(`${form.registration_opens_at_date}T00:00:00`).toISOString()
        : null,
      registration_closes_at: form.registration_closes_at_date
        ? new Date(`${form.registration_closes_at_date}T23:59:59`).toISOString()
        : null,
      venue_name: form.venue_name.trim() || null,
      address: form.address.trim() || null,
      price_cents: form.price_cents === '' ? null : Math.round(Number(form.price_cents) * 100),
      currency: form.currency,
      early_bird_price_cents: form.early_bird_price_cents === '' ? null : Math.round(Number(form.early_bird_price_cents) * 100),
      early_bird_until: form.early_bird_until_date
        ? new Date(`${form.early_bird_until_date}T23:59:59`).toISOString()
        : null,
      capacity: form.capacity === '' ? null : Number(form.capacity),
      spots_remaining: form.spots_remaining === '' ? null : Number(form.spots_remaining),
      waitlist_enabled: form.waitlist_enabled,
      registration_url: form.registration_url.trim() || null,
      registration_method: form.registration_method || null,
      status: form.status,
      visibility: form.visibility,
      description: form.description || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      banner_image_url: bannerUrl,
    };

    const url = mode === 'create'
      ? `/api/owner/rinks/${rinkId}/events`
      : `/api/owner/rinks/${rinkId}/events/${eventId}`;

    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || `Failed (${res.status})`);
      setSubmitting(false);
      return;
    }

    const j = await res.json();

    // Sync divisions
    const savedEventId = mode === 'create' ? j.event.id : eventId!;
    for (const div of divisions) {
      if (!div.name.trim()) continue;
      await fetch(`/api/owner/rinks/${rinkId}/events/${savedEventId}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: div.name.trim(),
          birth_year_min: div.birth_year_min ? Number(div.birth_year_min) : null,
          birth_year_max: div.birth_year_max ? Number(div.birth_year_max) : null,
          skill_level: div.skill_level,
          gender: div.gender,
          capacity: div.capacity ? Number(div.capacity) : null,
          spots_remaining: div.spots_remaining ? Number(div.spots_remaining) : null,
          status: div.status,
        }),
      });
    }

    router.push(`/dashboard/manage/rink/${rinkId}/events`);
    router.refresh();
  }

  const backHref = `/dashboard/manage/rink/${rinkId}/events`;

  return (
    <div style={{ maxWidth: 860 }}>
      <Link href={backHref} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
        ← Back to Events
      </Link>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>
        {mode === 'create' ? 'New event' : 'Edit event'}
      </h1>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && (
          <div style={errorBoxStyle}>{error}</div>
        )}

        {/* Banner upload */}
        {mode === 'edit' && (
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Banner image</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {bannerUrl && (
                <img src={bannerUrl} alt="Event banner" style={{ width: 200, height: 112, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} />
              )}
              <div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  style={{ fontSize: '0.85rem', color: '#cbd5e1' }}
                />
                {uploadingBanner && <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.25rem' }}>Uploading…</p>}
                {bannerError && <p style={{ color: '#FCA5A5', fontSize: '0.8rem', marginTop: '0.25rem' }}>{bannerError}</p>}
                {bannerUrl && (
                  <button
                    type="button"
                    onClick={() => setBannerUrl(null)}
                    style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Basic info */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Event details</h2>

          <div style={fieldGrid2}>
            <Field label="Event title" required>
              <input value={form.title} onChange={e => update('title', e.target.value)} style={inputStyle} placeholder="e.g. Spring Hockey Tournament 2026" required />
            </Field>
            <Field label="Event type" required>
              <select value={form.event_type} onChange={e => update('event_type', e.target.value)} style={inputStyle}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Subtitle">
            <input value={form.subtitle} onChange={e => update('subtitle', e.target.value)} style={inputStyle} placeholder="e.g. AAA Spring Showcase" maxLength={1000} />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Full event details, schedule, who should register, etc." />
          </Field>
        </section>

        {/* Date & time */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Date & time</h2>
          <div style={fieldGrid2}>
            <Field label="Start date" required>
              <input type="date" value={form.starts_at_date} onChange={e => update('starts_at_date', e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="Start time" required>
              <input type="time" value={form.starts_at_time} onChange={e => update('starts_at_time', e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="End date" required>
              <input type="date" value={form.ends_at_date} onChange={e => update('ends_at_date', e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="End time" required>
              <input type="time" value={form.ends_at_time} onChange={e => update('ends_at_time', e.target.value)} style={inputStyle} required />
            </Field>
          </div>
          <Field label="Timezone">
            <input value={form.timezone} onChange={e => update('timezone', e.target.value)} style={inputStyle} placeholder="America/New_York" />
          </Field>
        </section>

        {/* Location */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Location</h2>
          <div style={fieldGrid2}>
            <Field label="Venue name">
              <input value={form.venue_name} onChange={e => update('venue_name', e.target.value)} style={inputStyle} placeholder="e.g. Rink A" />
            </Field>
            <Field label="Timezone">
              <input value={form.timezone} onChange={e => update('timezone', e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <Field label="Address">
            <input value={form.address} onChange={e => update('address', e.target.value)} style={inputStyle} placeholder="Street address, city, state" />
          </Field>
        </section>

        {/* Pricing */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Pricing & capacity</h2>
          <div style={fieldGrid4}>
            <Field label="Price (leave blank for free)">
              <input type="number" min="0" step="0.01" value={form.price_cents} onChange={e => update('price_cents', e.target.value)} placeholder="0.00" style={inputStyle} />
            </Field>
            <Field label="Currency">
              <input value={form.currency} onChange={e => update('currency', e.target.value.toUpperCase())} maxLength={3} style={inputStyle} />
            </Field>
            <Field label="Early bird price">
              <input type="number" min="0" step="0.01" value={form.early_bird_price_cents} onChange={e => update('early_bird_price_cents', e.target.value)} placeholder="0.00" style={inputStyle} />
            </Field>
            <Field label="Early bird until">
              <input type="date" value={form.early_bird_until_date} onChange={e => update('early_bird_until_date', e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div style={fieldGrid3}>
            <Field label="Capacity">
              <input type="number" min="1" value={form.capacity} onChange={e => update('capacity', e.target.value)} placeholder="e.g. 200" style={inputStyle} />
            </Field>
            <Field label="Spots remaining">
              <input type="number" min="0" value={form.spots_remaining} onChange={e => update('spots_remaining', e.target.value)} placeholder="e.g. 45" style={inputStyle} />
            </Field>
            <Field label="Waitlist">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', fontSize: '0.875rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.waitlist_enabled} onChange={e => update('waitlist_enabled', e.target.checked)} />
                Enable waitlist
              </label>
            </Field>
          </div>
        </section>

        {/* Registration */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Registration</h2>
          <div style={fieldGrid3}>
            <Field label="Registration opens">
              <input type="date" value={form.registration_opens_at_date} onChange={e => update('registration_opens_at_date', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Registration closes">
              <input type="date" value={form.registration_closes_at_date} onChange={e => update('registration_closes_at_date', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Registration method">
              <select value={form.registration_method} onChange={e => update('registration_method', e.target.value)} style={inputStyle}>
                {REG_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
          </div>
          {form.registration_method === 'external' && (
            <Field label="Registration URL">
              <input type="url" value={form.registration_url} onChange={e => update('registration_url', e.target.value)} style={inputStyle} placeholder="https://..." />
            </Field>
          )}
        </section>

        {/* Status & visibility */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Status & visibility</h2>
          <div style={fieldGrid2}>
            <Field label="Status">
              <select value={form.status} onChange={e => update('status', e.target.value)} style={inputStyle}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Visibility">
              <select value={form.visibility} onChange={e => update('visibility', e.target.value)} style={inputStyle}>
                {VISIBILITIES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tags (comma-separated)">
            <input value={form.tags} onChange={e => update('tags', e.target.value)} style={inputStyle} placeholder="e.g. spring, tournament, youth" />
          </Field>
        </section>

        {/* Divisions */}
        {mode === 'edit' && (
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Divisions</h2>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1rem' }}>
              Optional sub-groups within this event (e.g. U14 Boys, U16 Girls).
            </p>
            {divisions.map((div, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Division {idx + 1}</span>
                  <button type="button" onClick={() => removeDivision(idx)} style={{ background: 'none', border: 'none', color: '#FCA5A5', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
                <div style={fieldGrid2}>
                  <Field label="Division name" required>
                    <input value={div.name} onChange={e => updateDivision(idx, 'name', e.target.value)} style={inputStyle} placeholder="e.g. U14 Boys" required />
                  </Field>
                  <Field label="Gender">
                    <select value={div.gender} onChange={e => updateDivision(idx, 'gender', e.target.value)} style={inputStyle}>
                      {[['coed','Coed'],['boys','Boys'],['girls','Girls'],['men','Men'],['women','Women'],['open','Open']].map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div style={fieldGrid4}>
                  <Field label="Birth year min">
                    <input type="number" min="1990" max="2030" value={div.birth_year_min} onChange={e => updateDivision(idx, 'birth_year_min', e.target.value)} style={inputStyle} placeholder="e.g. 2012" />
                  </Field>
                  <Field label="Birth year max">
                    <input type="number" min="1990" max="2030" value={div.birth_year_max} onChange={e => updateDivision(idx, 'birth_year_max', e.target.value)} style={inputStyle} placeholder="e.g. 2013" />
                  </Field>
                  <Field label="Skill level">
                    <select value={div.skill_level} onChange={e => updateDivision(idx, 'skill_level', e.target.value)} style={inputStyle}>
                      {[['all','All levels'],['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced'],['elite','Elite'],['aaa','AAA'],['aa','AA'],['a','A'],['b','B'],['c','C']].map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select value={div.status} onChange={e => updateDivision(idx, 'status', e.target.value)} style={inputStyle}>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="waitlist">Waitlist</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </Field>
                </div>
                <div style={fieldGrid2}>
                  <Field label="Capacity">
                    <input type="number" min="1" value={div.capacity} onChange={e => updateDivision(idx, 'capacity', e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Spots remaining">
                    <input type="number" min="0" value={div.spots_remaining} onChange={e => updateDivision(idx, 'spots_remaining', e.target.value)} style={inputStyle} />
                  </Field>
                </div>
              </div>
            ))}
            <button type="button" onClick={addDivision} style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8, padding: '0.625rem 1rem', color: '#94A3B8', fontSize: '0.875rem', cursor: 'pointer' }}>
              + Add division
            </button>
          </section>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', paddingBottom: '2rem' }}>
          <button type="submit" disabled={submitting} style={submitButtonStyle}>
            {submitting ? 'Saving…' : mode === 'create' ? (form.status === 'published' ? 'Publish event' : 'Create draft') : 'Save changes'}
          </button>
          <Link href={backHref} style={cancelLinkStyle}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}

// ---- styles ----

const sectionStyle: React.CSSProperties = {
  background: 'rgba(13,17,23,0.6)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.875rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#fff',
  margin: 0,
  letterSpacing: '0.01em',
};

const fieldGrid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' };
const fieldGrid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' };
const fieldGrid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' };

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  padding: '0.5rem 0.75rem',
  color: '#fff',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const errorBoxStyle: React.CSSProperties = {
  background: 'rgba(200,16,46,0.1)',
  border: '1px solid rgba(200,16,46,0.4)',
  color: '#FF6B7A',
  padding: '0.75rem 1rem',
  borderRadius: 6,
  fontSize: '0.875rem',
};

const submitButtonStyle: React.CSSProperties = {
  background: '#38BDF8',
  color: '#0F172A',
  border: 'none',
  borderRadius: 8,
  padding: '0.7rem 1.5rem',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const cancelLinkStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  color: '#cbd5e1',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '0.7rem 1.25rem',
  fontWeight: 600,
  fontSize: '0.9rem',
  textDecoration: 'none',
  display: 'inline-block',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#FCA5A5' }}> *</span>}
      </span>
      {children}
    </label>
  );
}
