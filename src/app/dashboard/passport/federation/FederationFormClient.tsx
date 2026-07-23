'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const POSITIONS = [
  { value: '',         label: '— Not set —' },
  { value: 'forward',  label: 'Forward' },
  { value: 'defense',  label: 'Defense' },
  { value: 'goalie',   label: 'Goalie' },
];

type Status = 'draft' | 'pending' | 'approved' | 'rejected';

interface RegistrationRow {
  id: string;
  registration_number: string;
  submission_status: Status;
  rejection_reason: string | null;
  verified_at: string | null;
  federation: { slug: string; name: string } | null;
}

interface FederationField {
  field: 'usa_hockey_number' | 'hockey_canada_number';
  slug: 'us' | 'ca';
  label: string;
  hint: string;
  placeholder: string;
}

const FEDERATION_FIELDS: FederationField[] = [
  {
    field: 'usa_hockey_number',
    slug: 'us',
    label: 'USA Hockey registration number',
    hint: 'Find this at usahockey.com → MyHockey → Profile',
    placeholder: 'e.g. 123456789',
  },
  {
    field: 'hockey_canada_number',
    slug: 'ca',
    label: 'Hockey Canada registration number',
    hint: 'Find this at hockeycanada.ca → Member Profile',
    placeholder: 'e.g. HC-12345',
  },
];

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, { bg: string; color: string; label: string }> = {
    draft:    { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', label: 'Draft' },
    pending:  { bg: 'rgba(255,184,28,0.18)',  color: '#FFB81C',                label: 'Pending review' },
    approved: { bg: 'rgba(0,150,80,0.18)',    color: '#009650',                label: 'Verified' },
    rejected: { bg: 'rgba(200,16,46,0.18)',    color: '#FF6B7A',                label: 'Rejected' },
  };
  const s = styles[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.55rem',
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {s.label}
    </span>
  );
}

export default function FederationFormClient({
  playerId,
  playerName,
  initialPositionCategory,
  registrations,
}: {
  playerId: string;
  playerName: string;
  initialPositionCategory: string;
  registrations: Record<string, RegistrationRow>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const [position, setPosition] = useState(initialPositionCategory);

  // Federation number form state per field, keyed by field name
  const [numbers, setNumbers] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of FEDERATION_FIELDS) {
      out[f.field] = registrations[f.slug]?.registration_number ?? '';
    }
    return out;
  });

  const handleNumberChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumbers((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        usa_hockey_number: numbers['usa_hockey_number'],
        hockey_canada_number: numbers['hockey_canada_number'],
        primary_position_category: position,
      };
      const res = await fetch('/api/passport/federation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setSubmitting(false);
        return;
      }
      setSaved(true);
      router.refresh();
      setSubmitting(false);
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setSubmitting(false);
    }
  };

  const handleSubmit = async (registrationId: string) => {
    setError(null);
    setActionPending(registrationId);
    try {
      const res = await fetch('/api/passport/federation/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: registrationId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit.');
        setActionPending(null);
        return;
      }
      router.refresh();
      setActionPending(null);
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setActionPending(null);
    }
  };

  const handleWithdraw = async (registrationId: string) => {
    setError(null);
    setActionPending(registrationId);
    try {
      const res = await fetch('/api/passport/federation/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: registrationId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to withdraw.');
        setActionPending(null);
        return;
      }
      router.refresh();
      setActionPending(null);
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setActionPending(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: '0.875rem',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 4,
  };

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/passport" style={{ color: 'rgba(255,255,255,0.5)' }}>Passport</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Federation</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          FEDERATION REGISTRATION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Add {playerName}&apos;s federation registration numbers. Numbers can be edited freely until
          you submit them for verification. Once submitted, the number is locked until admin reviews
          or you withdraw the submission.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {FEDERATION_FIELDS.map((f) => {
            const reg = registrations[f.slug];
            const status: Status | null = reg?.submission_status ?? null;
            const locked = status === 'pending' || status === 'approved';
            return (
              <div key={f.field}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>{f.label}</label>
                  {status && <StatusBadge status={status} />}
                </div>
                <input
                  type="text"
                  value={numbers[f.field]}
                  onChange={handleNumberChange(f.field)}
                  placeholder={f.placeholder}
                  disabled={locked}
                  style={{
                    ...inputStyle,
                    opacity: locked ? 0.6 : 1,
                    cursor: locked ? 'not-allowed' : 'text',
                  }}
                />
                <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  {f.hint}
                </p>
                {status === 'rejected' && reg?.rejection_reason && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(200,16,46,0.12)',
                      borderLeft: '3px solid #FF6B7A',
                      color: '#FF6B7A',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <strong>Reason:</strong> {reg.rejection_reason}
                  </div>
                )}
                {status === 'approved' && reg?.verified_at && (
                  <p style={{ fontSize: '0.6875rem', color: '#009650', marginTop: 4 }}>
                    Verified {new Date(reg.verified_at).toLocaleDateString()}.
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 6 }}>
                  {status === 'draft' && reg && (
                    <button
                      type="button"
                      onClick={() => handleSubmit(reg.id)}
                      disabled={actionPending === reg.id}
                      style={{
                        background: '#FFB81C',
                        color: '#041E42',
                        padding: '0.4rem 0.85rem',
                        border: 'none',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: actionPending === reg.id ? 'wait' : 'pointer',
                      }}
                    >
                      {actionPending === reg.id ? 'Submitting…' : 'Submit for verification'}
                    </button>
                  )}
                  {(status === 'pending' || status === 'rejected') && reg && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(reg.id)}
                      disabled={actionPending === reg.id}
                      style={{
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.7)',
                        padding: '0.4rem 0.85rem',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: actionPending === reg.id ? 'wait' : 'pointer',
                      }}
                    >
                      {actionPending === reg.id ? 'Withdrawing…' : 'Withdraw (edit & resubmit)'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div>
            <label style={labelStyle}>Primary position</label>
            <select
              value={position}
              onChange={(e) => { setPosition(e.target.value); setSaved(false); }}
              style={inputStyle}
            >
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Sets which stats columns appear by default (skater vs goalie).
            </p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          {saved && !error && (
            <div style={{ padding: '0.75rem', background: 'rgba(0,150,80,0.18)', color: '#009650', borderRadius: 6, fontSize: '0.875rem' }}>
              Saved.
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#C8102E',
                color: '#fff',
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <Link
              href="/dashboard/passport"
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Back to passport
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
