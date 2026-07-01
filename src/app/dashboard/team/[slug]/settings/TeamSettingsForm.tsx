'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRY_OPTIONS, COUNTRY_CURRENCY } from '@/lib/federations';

interface InitialValues {
  slug: string;
  name: string;
  short_name: string;
  parent_org: string;
  home_city: string;
  home_country: string;
  country_code: string;
  currency: string;
  age_category: 'youth' | 'adult' | 'mixed' | string;
  age_label: string;
  age_min: number | null;
  age_max: number | null;
  level: string;
  season_label: string;
  founded_on: string | null;
  description: string;
  contact_email: string;
  contact_phone: string;
  visibility: 'private' | 'unlisted' | 'public' | string;
}

interface Props {
  slug: string;
  initial: InitialValues;
}

type FormState = InitialValues;

const AGE_CATEGORIES = [
  { value: 'youth', label: 'Youth' },
  { value: 'adult', label: 'Adult' },
  { value: 'mixed', label: 'Mixed' },
];

const LEVELS = [
  { value: '', label: '— Not set —' },
  { value: 'learn_to_play', label: 'Learn to Play' },
  { value: 'house', label: 'House League' },
  { value: 'travel', label: 'Travel' },
  { value: 'rep', label: 'Rep / Selects' },
];

// V1: binary visibility. 'public' is deferred until the public team profile page ships.
const VISIBILITY = [
  {
    value: 'private',
    label: 'Private — workspace is invite-only (recommended)',
    help: 'Your team is URL-known, but the roster, invites, and member data are gated behind an invite code. Parents and players need an invite to access.',
  },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  color: '#fff',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.85)',
  marginBottom: '0.3rem',
  letterSpacing: '0.02em',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'rgba(255,255,255,0.45)',
  marginTop: '0.25rem',
};

export default function TeamSettingsForm({ slug, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function updateStr<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      update(key, e.target.value as FormState[K]);
    };
  }

  function updateNumOrNull(key: 'age_min' | 'age_max') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '') return update(key, null);
      const n = Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return;
      update(key, n);
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    // Strip empty strings to null for cleaner storage; the API accepts both.
    const payload: Record<string, unknown> = {
      // Only send slug if it differs from the URL we're on (avoids a pointless write).
      ...(form.slug && form.slug !== slug ? { slug: form.slug } : {}),
      name: form.name,
      short_name: form.short_name === '' ? null : form.short_name,
      parent_org: form.parent_org === '' ? null : form.parent_org,
      home_city: form.home_city === '' ? null : form.home_city,
      home_country: form.home_country === '' ? null : form.home_country,
      country_code: form.country_code === '' ? null : form.country_code.toUpperCase(),
      currency: form.currency === '' ? null : form.currency.toUpperCase(),
      age_category: form.age_category,
      age_label: form.age_label === '' ? null : form.age_label,
      age_min: form.age_min,
      age_max: form.age_max,
      level: form.level === '' ? null : form.level,
      season_label: form.season_label === '' ? null : form.season_label,
      founded_on: form.founded_on === null || form.founded_on === '' ? null : form.founded_on,
      description: form.description === '' ? null : form.description,
      contact_email: form.contact_email === '' ? null : form.contact_email,
      contact_phone: form.contact_phone === '' ? null : form.contact_phone,
      visibility: form.visibility,
    };

    try {
      const res = await fetch(`/api/team/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Save failed (${res.status})`);
        return;
      }

      setSaved(true);

      // If the slug changed, navigate to the new URL so bookmarks, page state,
      // and any server fetches use the canonical slug.
      const updatedSlug = data?.team?.slug;
      if (updatedSlug && updatedSlug !== slug) {
        // Use replace so back button doesn't bring user to the old slug URL.
        router.replace(`/dashboard/team/${encodeURIComponent(updatedSlug)}/settings`);
        return;
      }

      // Refresh server components (header re-renders with new values).
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <Section title="Identity">
        <Field label="Team name *" hint="The official name shown on listings and invites (2–80 chars)">
          <input
            type="text"
            value={form.name}
            onChange={updateStr('name')}
            required
            minLength={2}
            maxLength={80}
            style={inputStyle}
          />
        </Field>
        <Field
          label="URL slug"
          hint={`Your team lives at rinkstop.com/dashboard/team/${form.slug || 'your-slug'}. Lowercase a–z, 0–9, hyphens. 2–60 chars. Warning: changing the slug breaks shared links; the old URL will redirect to the new one.`}
        >
          <input
            type="text"
            value={form.slug}
            onChange={e => {
              // Normalize: lowercase, replace spaces/underscores with hyphens, strip invalid chars
              const normalized = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-')
                .slice(0, 60);
              update('slug', normalized);
            }}
            minLength={2}
            maxLength={60}
            pattern="^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$"
            style={{
              ...inputStyle,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              letterSpacing: '0.02em',
            }}
          />
        </Field>
        <Field label="Short name" hint="Optional. Short form (e.g. 'Datus'). Used in lists and chips.">
          <input
            type="text"
            value={form.short_name}
            onChange={updateStr('short_name')}
            maxLength={40}
            style={inputStyle}
          />
        </Field>
        <Field label="Parent organization" hint="Optional. League or governing body (e.g. 'IIHF', 'USA Hockey', 'FIHL — Hockey Philippines').">
          <input
            type="text"
            value={form.parent_org}
            onChange={updateStr('parent_org')}
            maxLength={120}
            style={inputStyle}
          />
        </Field>
        <Field label="Description" hint="Optional. Up to 1,000 chars. Shown on your team page.">
          <textarea
            value={form.description}
            onChange={updateStr('description')}
            maxLength={1000}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
          />
        </Field>
      </Section>

      <Section title="Age & level">
        <Row>
          <Field label="Age category *">
            <select
              value={form.age_category}
              onChange={updateStr('age_category')}
              required
              style={inputStyle}
            >
              {AGE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Age label" hint="Free text (e.g. 'U12', 'Bantam Major').">
            <input
              type="text"
              value={form.age_label}
              onChange={updateStr('age_label')}
              maxLength={40}
              style={inputStyle}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Min age" hint="0–99">
            <input
              type="number"
              value={form.age_min === null ? '' : form.age_min}
              onChange={updateNumOrNull('age_min')}
              min={0}
              max={99}
              style={inputStyle}
            />
          </Field>
          <Field label="Max age" hint="0–99">
            <input
              type="number"
              value={form.age_max === null ? '' : form.age_max}
              onChange={updateNumOrNull('age_max')}
              min={0}
              max={99}
              style={inputStyle}
            />
          </Field>
        </Row>
        <Field label="Level" hint="Optional. Defines the competitive tier.">
          <select
            value={form.level}
            onChange={updateStr('level')}
            style={inputStyle}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Location">
        <Row>
          <Field label="Home city">
            <input
              type="text"
              value={form.home_city}
              onChange={updateStr('home_city')}
              maxLength={80}
              style={inputStyle}
            />
          </Field>
          <Field label="Home country">
            <input
              type="text"
              value={form.home_country}
              onChange={updateStr('home_country')}
              maxLength={80}
              style={inputStyle}
            />
          </Field>
        </Row>
        <Row>
          <Field
            label="Country *"
            hint={
              form.country_code
                ? `Federation: ${COUNTRY_OPTIONS.find((c) => c.code === form.country_code)?.name ?? form.country_code}`
                : 'Select to auto-fill currency and unlock required-doc suggestions.'
            }
          >
            <select
              value={form.country_code}
              onChange={(e) => {
                const code = e.target.value.toUpperCase();
                update('country_code', code);
                // Auto-fill currency from the country→currency map
                if (code && !form.currency) {
                  const suggested = COUNTRY_CURRENCY[code];
                  if (suggested) update('currency', suggested);
                }
                setSaved(false);
              }}
              style={inputStyle}
            >
              <option value="">— Select country —</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency (ISO 4217)" hint="Auto-filled from country; override if needed.">
            <input
              type="text"
              value={form.currency}
              onChange={updateStr('currency')}
              maxLength={3}
              minLength={3}
              style={{ ...inputStyle, textTransform: 'uppercase' }}
            />
          </Field>
        </Row>
      </Section>

      <Section title="Season & history">
        <Row>
          <Field label="Season label" hint="e.g. '2026–2027'">
            <input
              type="text"
              value={form.season_label}
              onChange={updateStr('season_label')}
              maxLength={40}
              style={inputStyle}
            />
          </Field>
          <Field label="Founded on">
            <input
              type="date"
              value={form.founded_on ?? ''}
              onChange={(e) => update('founded_on', e.target.value || null)}
              style={inputStyle}
            />
          </Field>
        </Row>
      </Section>

      <Section title="Contact">
        <Field label="Contact email" hint="Shown to members. Leave blank to hide.">
          <input
            type="email"
            value={form.contact_email}
            onChange={updateStr('contact_email')}
            maxLength={120}
            style={inputStyle}
          />
        </Field>
        <Field label="Contact phone">
          <input
            type="tel"
            value={form.contact_phone}
            onChange={updateStr('contact_phone')}
            maxLength={40}
            style={inputStyle}
          />
        </Field>
      </Section>

      <Section title="Visibility">
        <div
          style={{
            padding: '0.85rem 1rem',
            background: 'rgba(20,184,166,0.08)',
            border: '1px solid rgba(20,184,166,0.25)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: form.visibility === 'public' ? '#14B8A6' : '#FFB81C', marginBottom: '0.25rem' }}>
                {form.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>
                {form.visibility === 'public'
                  ? 'Listed in the RinkStop directory. Anyone can find and follow your team.'
                  : 'Hidden from the directory. Only people with the direct link can find the team.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => update('visibility', form.visibility === 'public' ? 'private' : 'public')}
              style={{
                flexShrink: 0,
                padding: '0.35rem 0.85rem',
                borderRadius: 6,
                border: `1px solid ${form.visibility === 'public' ? 'rgba(20,184,166,0.4)' : 'rgba(255,184,28,0.4)'}`,
                background: form.visibility === 'public' ? 'rgba(20,184,166,0.1)' : 'rgba(255,184,28,0.1)',
                color: form.visibility === 'public' ? '#14B8A6' : '#FFB81C',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {form.visibility === 'public' ? 'Make Private' : 'Make Public'}
            </button>
          </div>
          <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
            The team hub at <code style={{ color: '#14B8A6' }}>/dashboard/team/{slug}</code> always requires an invite code, regardless of this setting.
          </p>
        </div>
      </Section>

      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(200,16,46,0.10)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FF6B7A',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.875rem',
          }}
        >
          Could not save: <code style={{ color: '#FF6B7A' }}>{error}</code>
        </div>
      )}

      {saved && !error && (
        <div
          role="status"
          style={{
            background: 'rgba(20,184,166,0.10)',
            border: '1px solid rgba(20,184,166,0.4)',
            color: '#14B8A6',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.875rem',
          }}
        >
          Saved. Header reflects new values on next render.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '0.7rem 1.5rem',
            background: saving ? 'rgba(20,184,166,0.4)' : '#14B8A6',
            color: '#041E42',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <a
          href={`/dashboard/team/${encodeURIComponent(slug)}`}
          style={{
            padding: '0.7rem 1.25rem',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset
      style={{
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '1rem 1.25rem 1.25rem',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      <legend
        style={{
          padding: '0 0.5rem',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: '#FFB81C',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={hintStyle}>{hint}</div>}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.85rem',
      }}
    >
      {children}
    </div>
  );
}