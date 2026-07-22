'use client';

/**
 * /admin/stamps/qr-rotation — client form component.
 *
 * Posts to /api/internal/passport/stamps/rotate-qr (admin-gated server route).
 * Shows before/after QR identifiers on success so the admin can update
 * printed signs.
 */

import { useState } from 'react';

type TargetType = 'rink' | 'venue' | 'event';

interface RotateResult {
  targetType: string;
  oldQr: string;
  newQr: string;
}

export function QrRotationForm() {
  const [targetType, setTargetType] = useState<TargetType>('rink');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RotateResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/internal/passport/stamps/rotate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? `Request failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as RotateResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #16a34a',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <p
          style={{
            fontSize: 13,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#15803d',
            fontWeight: 700,
            margin: 0,
          }}
        >
          ✓ Rotated
        </p>
        <p style={{ fontSize: 15, color: '#0f172a', margin: '8px 0 16px' }}>
          New QR identifier issued for this {result.targetType}. Update any
          printed signs or posters with the new value.
        </p>

        <dl style={{ margin: 0 }}>
          <Row label="Old QR" value={result.oldQr} mono />
          <Row label="New QR" value={result.newQr} mono highlight />
        </dl>

        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setTargetId('');
              setReason('');
            }}
            style={styles.secondaryButton}
          >
            Rotate another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <Field label="Target type" htmlFor="targetType">
        <select
          id="targetType"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value as TargetType)}
          style={styles.input}
        >
          <option value="rink">Rink</option>
          <option value="venue">Venue</option>
          <option value="event">Event</option>
        </select>
      </Field>

      <Field label="Target ID" htmlFor="targetId" hint="UUID of the rink/venue/event">
        <input
          id="targetId"
          type="text"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          required
          placeholder="e.g. 8f3a2b1c-..."
          style={{ ...styles.input, fontFamily: 'ui-monospace, monospace' }}
        />
      </Field>

      <Field
        label="Reason"
        htmlFor="reason"
        hint="Stored in the audit log (public.qr_revocations)"
      >
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={3}
          maxLength={500}
          rows={3}
          placeholder="e.g. Lost sign at the venue; QR was leaked on social"
          style={{ ...styles.input, resize: 'vertical' }}
        />
      </Field>

      {error && (
        <p
          role="alert"
          style={{
            color: '#b91c1c',
            fontSize: 14,
            margin: '0 0 16px',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          ...styles.primaryButton,
          ...(submitting ? styles.disabled : {}),
        }}
      >
        {submitting ? 'Rotating…' : 'Rotate QR'}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p
          style={{
            fontSize: 12,
            color: '#64748b',
            margin: '4px 0 0',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '10px 0',
        borderTop: '1px solid #f1f5f9',
      }}
    >
      <dt
        style={{
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#64748b',
          fontWeight: 600,
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontSize: mono ? 13 : 15,
          color: highlight ? '#b45309' : '#0f172a',
          fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
          fontWeight: highlight ? 600 : 400,
          margin: 0,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </dd>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 14,
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box',
  },
  primaryButton: {
    background: '#041E42',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    background: '#fff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'wait',
  },
};
