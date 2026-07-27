'use client';

/**
 * CountryPickerForm — sets the user's primary_country + optional
 * additional_countries on profile_country_context.
 *
 * Used by /dashboard/profile to capture country context, which drives
 * federation dropdown scoping via the v_user_visible_certifications view.
 *
 * Pattern mirrors the existing ProfileEditForm / email-preferences style:
 * - client component, native fetch
 * - POST /api/profile/country with { primary_country, additional_countries }
 * - optimistic UI: disable inputs + show "Saving..." while in flight
 * - surface server errors inline; success shows a check + new saved values
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRY_OPTIONS } from '@/lib/federations';

interface Props {
  initialPrimary: string | null;
  initialAdditional: string[];
}

export default function CountryPickerForm({
  initialPrimary,
  initialAdditional,
}: Props) {
  const router = useRouter();
  const [primary, setPrimary] = useState<string>(initialPrimary ?? '');
  const [additional, setAdditional] = useState<string[]>(
    Array.isArray(initialAdditional) ? initialAdditional : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const additionalOptions = COUNTRY_OPTIONS.filter(
    (c) => c.code !== primary,
  );

  function toggleAdditional(code: string) {
    setAdditional((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!primary) {
      setError('Pick a primary country to continue.');
      return;
    }
    // Defense in depth — the CHECK constraint enforces 2-letter uppercase,
    // but reject obviously bad client-side values before hitting the API.
    if (primary.length !== 2 || primary !== primary.toUpperCase()) {
      setError('Country code must be 2 uppercase letters (e.g. US, CA, PH).');
      return;
    }
    // Don't allow primary to also be in additional — keeps the data tidy.
    const filtered = additional.filter((c) => c !== primary);

    setSaving(true);
    try {
      const res = await fetch('/api/profile/country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_country: primary,
          additional_countries: filtered,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Save failed (${res.status}).`);
        return;
      }
      setSaved(true);
      setAdditional(filtered);
      // Soft refresh so the parent server component re-fetches and any other
      // surface (e.g. /dashboard/passport/federation dropdown) reflects the
      // new country. Hard refresh would be jarring mid-form.
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
      aria-busy={saving}
    >
      <div>
        <label
          htmlFor="country-primary"
          style={{
            display: 'block',
            color: '#888',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 6,
          }}
        >
          Primary country
        </label>
        <select
          id="country-primary"
          data-testid="country-primary-select"
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
          disabled={saving}
          style={{
            width: '100%',
            maxWidth: 360,
            background: '#0a0a0a',
            color: '#fff',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
            padding: '0.55rem 0.75rem',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
          }}
        >
          <option value="">— Select your country —</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <label
            style={{
              color: '#888',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Additional countries (optional)
          </label>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
            Dual citizenship, prior residence, or any country you hold a
            federation credential in.
          </span>
        </div>
        {additionalOptions.length === 0 ? (
          <p
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.8rem',
              margin: 0,
            }}
          >
            Pick a primary country first.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              maxHeight: 180,
              overflowY: 'auto',
              padding: '0.4rem',
              background: '#0a0a0a',
              border: '1px solid #141414',
              borderRadius: 6,
            }}
          >
            {additionalOptions.map((c) => {
              const checked = additional.includes(c.code);
              return (
                <label
                  key={c.code}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.3rem 0.6rem',
                    background: checked ? 'rgba(20,184,166,0.12)' : 'transparent',
                    border: `1px solid ${checked ? 'rgba(20,184,166,0.4)' : '#1e1e1e'}`,
                    borderRadius: 999,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.78rem',
                    color: checked ? '#14B8A6' : 'rgba(255,255,255,0.7)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAdditional(c.code)}
                    disabled={saving}
                    style={{ accentColor: '#14B8A6', margin: 0 }}
                  />
                  {c.name}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          data-testid="country-picker-error"
          style={{
            color: '#FFB81C',
            fontSize: '0.8rem',
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {saved && !error && (
        <p
          role="status"
          data-testid="country-picker-saved"
          style={{
            color: '#14B8A6',
            fontSize: '0.8rem',
            margin: 0,
          }}
        >
          ✓ Saved.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="submit"
          disabled={saving || !primary}
          data-testid="country-picker-save"
          style={{
            background: '#14B8A6',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 6,
            padding: '0.55rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: saving || !primary ? 'not-allowed' : 'pointer',
            opacity: saving || !primary ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save country'}
        </button>
        <span
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.75rem',
          }}
        >
          Drives the federation dropdown on your Hockey Passport.
        </span>
      </div>
    </form>
  );
}