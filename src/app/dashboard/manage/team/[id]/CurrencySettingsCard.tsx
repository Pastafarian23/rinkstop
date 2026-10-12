'use client';

// CurrencySettingsCard
//
// Lets a team admin set the default currency for new programs/registrations.
// Per the 2026-10-12 currency directive:
//   - Home page, /pricing, /dataset-license, ad packages: always USD.
//   - Stripe checkout: user picks.
//   - Local transactions (team programs): default to the team's saved
//     currency, with USD as the explicit fallback in the dropdown.
//
// The saved value lives in team_workspaces.currency. When creating a new
// program, the form falls back to the country's local currency (via
// countryToCurrency in @/lib/currency), then to USD, in that order.

import { useState, useMemo } from 'react';
import { buildCurrencyOptions, countryToCurrency } from '@/lib/currency';

interface CurrencySettingsCardProps {
  teamId: string;
  teamCountry: string | null;
  initialCurrency: string | null;
  inferredLocalCurrency: string | null;
}

export default function CurrencySettingsCard({
  teamId,
  teamCountry,
  initialCurrency,
  inferredLocalCurrency,
}: CurrencySettingsCardProps) {
  const [currency, setCurrency] = useState<string>(initialCurrency || inferredLocalCurrency || 'USD');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [savedCurrency, setSavedCurrency] = useState<string | null>(initialCurrency);

  const options = useMemo(() => buildCurrencyOptions(inferredLocalCurrency), [inferredLocalCurrency]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/manage/team/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; currency?: string | null; error?: string };
      if (!res.ok || !j.ok) {
        setMessage({ kind: 'err', text: j.error || `Save failed (${res.status})` });
        setSaving(false);
        return;
      }
      setSavedCurrency(j.currency ?? null);
      setMessage({ kind: 'ok', text: 'Default currency saved.' });
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/manage/team/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: null }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; currency?: string | null; error?: string };
      if (!res.ok || !j.ok) {
        setMessage({ kind: 'err', text: j.error || `Clear failed (${res.status})` });
        setSaving(false);
        return;
      }
      // Reset the dropdown to the inferred local currency (or USD).
      const fallback = inferredLocalCurrency || 'USD';
      setCurrency(fallback);
      setSavedCurrency(null);
      setMessage({ kind: 'ok', text: `Cleared. New programs will default to ${fallback} (your team's local currency).` });
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: 'rgba(13,17,23,0.6)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '1.1rem' }}>💱</span>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          TEAM SETTINGS — CURRENCY
        </h2>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0.25rem 0 1rem' }}>
        Default currency for new programs, tryouts, and registration fees. Local transactions between teams,
        admins, players, and parents use this currency. USD remains available in every program form as a
        fallback. RinkStop home page and pricing always display in USD.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              flex: '1 1 320px',
              maxWidth: 360,
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>
              Default currency
            </span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '0.5rem 0.75rem',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            >
              {options.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: '#38BDF8',
                color: '#0F172A',
                border: 'none',
                borderRadius: 8,
                padding: '0.5rem 1rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {savedCurrency && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#cbd5e1',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.875rem',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                Reset to local ({inferredLocalCurrency || 'USD'})
              </button>
            )}
          </div>
        </div>

        {message && (
          <div
            style={{
              background: message.kind === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(200,16,46,0.1)',
              border: `1px solid ${message.kind === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(200,16,46,0.4)'}`,
              color: message.kind === 'ok' ? '#86EFAC' : '#FF6B7A',
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              fontSize: '0.8rem',
            }}
          >
            {message.text}
          </div>
        )}

        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
          {teamCountry ? (
            <>Team country: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{teamCountry}</strong>. {inferredLocalCurrency ? `Local currency: ${inferredLocalCurrency}.` : 'No local currency mapping — defaults to USD.'}</>
          ) : (
            <>No country set for this team. Default is USD unless you pick one above.</>
          )}
        </div>
      </form>
    </div>
  );
}
