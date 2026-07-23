'use client';

// Shared client component for credentials (coach + referee). Persona drives
// apiBase + label. Renders existing registrations + add-new row.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Status = 'draft' | 'pending' | 'approved' | 'rejected';

interface RegistrationRow {
  id: string;
  registration_number: string;
  submission_status: Status;
  rejection_reason: string | null;
  verified_at: string | null;
  expires_at: string | null;
  federation: { slug: string; name: string } | null;
}

interface FederationOption {
  slug: string;
  name: string;
  country_code: string | null;
}

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

export default function CredentialsFormClient({
  persona,
  subjectName,
  registrations,
  federations,
  apiBase,
}: {
  persona: 'coach' | 'referee';
  subjectName: string;
  registrations: Record<string, RegistrationRow>;
  federations: FederationOption[];
  apiBase: string; // e.g. /api/coach/credentials
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Add-new form state
  const [newSlug, setNewSlug] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newExpires, setNewExpires] = useState('');

  const availableToAdd = federations.filter((f) => !registrations[f.slug]);

  async function handleSaveNew() {
    setError(null);
    if (!newSlug || !newNumber.trim()) {
      setError('Pick a federation and enter a number.');
      return;
    }
    setActionPending('new');
    try {
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          federation_slug: newSlug,
          registration_number: newNumber.trim(),
          expires_at: newExpires || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setActionPending(null);
        return;
      }
      setAdding(false);
      setNewSlug('');
      setNewNumber('');
      setNewExpires('');
      router.refresh();
      setActionPending(null);
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setActionPending(null);
    }
  }

  async function handleEdit(reg: RegistrationRow, newNum: string, newExpires: string) {
    setError(null);
    setActionPending(reg.id);
    try {
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          federation_slug: reg.federation!.slug,
          registration_number: newNum.trim(),
          expires_at: newExpires || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setActionPending(null);
        return;
      }
      router.refresh();
      setActionPending(null);
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setActionPending(null);
    }
  }

  async function handleAction(registrationId: string, kind: 'submit' | 'withdraw') {
    setError(null);
    setActionPending(registrationId);
    try {
      const res = await fetch(`${apiBase}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: registrationId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Failed to ${kind}.`);
        setActionPending(null);
        return;
      }
      router.refresh();
      setActionPending(null);
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setActionPending(null);
    }
  }

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

  const personaTitle = persona === 'coach' ? 'COACH CREDENTIALS' : 'REFEREE CREDENTIALS';
  const homeHref = persona === 'coach' ? '/dashboard/coach' : '/dashboard/referee';

  return (
    <main style={{ minHeight: '100vh', background: '#041E42', color: '#fff' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href={homeHref} style={{ color: 'rgba(255,255,255,0.5)' }}>{personaTitle.split(' ')[0]}</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Credentials</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          {personaTitle}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Add {subjectName}&apos;s federation-issued credentials. Each can be edited freely until submitted
          for verification. Once submitted, the number is locked until admin reviews or you withdraw.
        </p>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {Object.values(registrations).map((reg) => (
            <RegRow
              key={reg.id}
              reg={reg}
              busy={actionPending === reg.id}
              onEdit={(num, exp) => handleEdit(reg, num, exp)}
              onSubmit={() => handleAction(reg.id, 'submit')}
              onWithdraw={() => handleAction(reg.id, 'withdraw')}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
          ))}
        </div>

        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              background: 'transparent',
              color: '#FFB81C',
              padding: '0.6rem 1rem',
              border: '1px dashed rgba(255,184,28,0.4)',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            + Add {availableToAdd.length === federations.length ? 'a' : 'another'} credential
          </button>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>Add new credential</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Federation</label>
                <select value={newSlug} onChange={(e) => setNewSlug(e.target.value)} style={inputStyle}>
                  <option value="">— Pick one —</option>
                  {availableToAdd.map((f) => (
                    <option key={f.slug} value={f.slug}>{f.name} ({f.country_code ?? '—'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Registration number</label>
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="e.g. CPR-12345"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Expires (optional)</label>
                <input
                  type="date"
                  value={newExpires}
                  onChange={(e) => setNewExpires(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSaveNew}
                  disabled={actionPending === 'new'}
                  style={{
                    background: '#C8102E',
                    color: '#fff',
                    padding: '0.55rem 1rem',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: actionPending === 'new' ? 'wait' : 'pointer',
                  }}
                >
                  {actionPending === 'new' ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setNewSlug(''); setNewNumber(''); setNewExpires(''); }}
                  style={{
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.7)',
                    padding: '0.55rem 1rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function RegRow({
  reg,
  busy,
  onEdit,
  onSubmit,
  onWithdraw,
  inputStyle,
  labelStyle,
}: {
  reg: RegistrationRow;
  busy: boolean;
  onEdit: (num: string, expires: string) => void;
  onSubmit: () => void;
  onWithdraw: () => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [num, setNum] = useState(reg.registration_number);
  const [exp, setExp] = useState(reg.expires_at ?? '');

  const locked = reg.submission_status === 'pending' || reg.submission_status === 'approved';

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '0.85rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{reg.federation?.name}</label>
        <StatusBadge status={reg.submission_status} />
      </div>

      {!editing ? (
        <>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{reg.registration_number}</div>
          {reg.expires_at && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Expires {new Date(reg.expires_at).toLocaleDateString()}
            </div>
          )}
          {reg.submission_status === 'rejected' && reg.rejection_reason && (
            <div style={{ marginTop: 6, padding: '0.5rem 0.75rem', background: 'rgba(200,16,46,0.12)', borderLeft: '3px solid #FF6B7A', color: '#FF6B7A', fontSize: '0.8125rem' }}>
              <strong>Reason:</strong> {reg.rejection_reason}
            </div>
          )}
          {reg.submission_status === 'approved' && reg.verified_at && (
            <div style={{ fontSize: '0.7rem', color: '#009650', marginTop: 4 }}>
              Verified {new Date(reg.verified_at).toLocaleDateString()}.
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="text"
            value={num}
            onChange={(e) => setNum(e.target.value)}
            style={inputStyle}
          />
          <input
            type="date"
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => { onEdit(num, exp); setEditing(false); }}
              disabled={busy}
              style={{
                background: '#C8102E', color: '#fff', padding: '0.4rem 0.85rem', border: 'none',
                borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', cursor: busy ? 'wait' : 'pointer',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setNum(reg.registration_number); setExp(reg.expires_at ?? ''); setEditing(false); }}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.7)', padding: '0.4rem 0.85rem',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontSize: '0.75rem',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 8, flexWrap: 'wrap' }}>
          {reg.submission_status === 'draft' && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={busy}
                style={{
                  background: 'transparent', color: 'rgba(255,255,255,0.7)', padding: '0.4rem 0.85rem',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontWeight: 600, fontSize: '0.75rem',
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={busy}
                style={{
                  background: '#FFB81C', color: '#041E42', padding: '0.4rem 0.85rem', border: 'none',
                  borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', cursor: busy ? 'wait' : 'pointer',
                }}
              >
                {busy ? '…' : 'Submit for verification'}
              </button>
            </>
          )}
          {(reg.submission_status === 'pending' || reg.submission_status === 'rejected') && (
            <button
              type="button"
              onClick={onWithdraw}
              disabled={busy}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.7)', padding: '0.4rem 0.85rem',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontWeight: 600, fontSize: '0.75rem',
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {busy ? '…' : 'Withdraw (edit & resubmit)'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
