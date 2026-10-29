'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  federations: Record<string, unknown>[];
  invites: Record<string, unknown>[];
  memberRequests: Record<string, unknown>[];
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid #1e1e1e',
  borderRadius: 6,
  color: '#fff',
  padding: '0.5rem 0.75rem',
  fontSize: '0.9rem',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: '0.35rem',
};

const sectionStyle: React.CSSProperties = {
  background: '#0f0f0f',
  border: '1px solid #1e1e1e',
  borderRadius: 12,
  padding: '1.5rem',
};

export default function AdminFederationsClient({ federations, invites, memberRequests }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState({
    federation_id: '',
    email: '',
    contact_name: '',
    note: '',
  });
  const [filter, setFilter] = useState('');

  const claimed = useMemo(
    () => federations.filter((f) => f.owner_user_id),
    [federations],
  );
  const unclaimed = useMemo(
    () => federations.filter((f) => !f.owner_user_id),
    [federations],
  );

  const pendingMembers = memberRequests.filter((r) => r.status === 'pending');
  const pendingNameChanges = federations.filter((f) => f.pending_name);

  async function createInvite() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/federation-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error || 'Could not create the invite.' });
        return;
      }
      setMsg({
        ok: true,
        text: `Invite created for ${data.federation_name}. Copy the link and send it to ${invite.email}.`,
        url: data.invite_url,
      });
      setInvite({ federation_id: '', email: '', contact_name: '', note: '' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/federation-invites/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error || 'Could not revoke the invite.' });
        return;
      }
      setMsg({ ok: true, text: 'Invite revoked. The link no longer works.' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function reviewMemberRequest(id: string, action: 'approve' | 'reject') {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/federation-member-requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error || 'Could not review that request.' });
        return;
      }
      setMsg({ ok: true, text: data?.message || 'Done.' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function approveNameChange(federationId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/federations/${federationId}/approve-name`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error || 'Could not approve the name change.' });
        return;
      }
      setMsg({ ok: true, text: 'Name change approved and live.' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  const visibleFederations = filter
    ? federations.filter((f) => String(f.name).toLowerCase().includes(filter.toLowerCase()))
    : federations;

  return (
    <>
      {msg && (
        <div
          role={msg.ok ? 'status' : 'alert'}
          style={{
            padding: '0.75rem 1rem',
            background: msg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(200,16,46,0.12)',
            border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.35)' : 'rgba(200,16,46,0.45)'}`,
            borderRadius: 8,
            color: msg.ok ? '#4ADE80' : '#FF6B7A',
            fontSize: '0.875rem',
            lineHeight: 1.55,
          }}
        >
          <div>{msg.text}</div>
          {msg.url && (
            <div style={{ marginTop: '0.6rem' }}>
              <code
                style={{
                  display: 'inline-block',
                  padding: '0.4rem 0.6rem',
                  background: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  color: '#fff',
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                {msg.url}
              </code>
            </div>
          )}
        </div>
      )}

      {/* ---------------- CREATE INVITE ---------------- */}
      <section style={sectionStyle}>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.35rem',
          }}
        >
          ISSUE A CLAIM INVITE
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1.25rem', lineHeight: 1.55 }}>
          The invite is a single-use, email-bound link to{' '}
          <code style={{ color: '#7DD3FC' }}>/profile/claim</code>. Only the address you enter
          here can use it. Copy the link and send it from your own email.
        </p>

        <div style={{ display: 'grid', gap: '0.9rem' }}>
          <div>
            <label style={labelStyle}>Federation</label>
            <select
              style={inputStyle}
              value={invite.federation_id}
              onChange={(e) => setInvite({ ...invite, federation_id: e.target.value })}
            >
              <option value="">Choose a federation…</option>
              {unclaimed.map((f) => (
                <option key={String(f.id)} value={String(f.id)}>
                  {String(f.name)}
                  {f.country_code ? ` (${String(f.country_code)})` : ''}
                </option>
              ))}
            </select>
            {unclaimed.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
                Every federation already has an owner.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Contact email</label>
              <input
                style={inputStyle}
                type="email"
                value={invite.email}
                onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                placeholder="name@federation.org"
              />
            </div>
            <div>
              <label style={labelStyle}>Contact name (optional)</label>
              <input
                style={inputStyle}
                value={invite.contact_name}
                onChange={(e) => setInvite({ ...invite, contact_name: e.target.value })}
                placeholder="e.g. Harjinder Singh, General Secretary"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Note (optional)</label>
            <input
              style={inputStyle}
              value={invite.note}
              onChange={(e) => setInvite({ ...invite, note: e.target.value })}
              placeholder="Context for the email — e.g. 'We spoke at the IIHF summit'"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={createInvite}
              disabled={busy || !invite.federation_id || !invite.email}
              style={{
                padding: '0.65rem 1.35rem',
                background:
                  busy || !invite.federation_id || !invite.email ? 'rgba(255,255,255,0.06)' : '#C8102E',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {busy ? 'Working…' : 'Create invite link'}
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- PENDING NAME CHANGES ---------------- */}
      {pendingNameChanges.length > 0 && (
        <section style={sectionStyle}>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.35rem',
            }}
          >
            PENDING NAME CHANGES ({pendingNameChanges.length})
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            A federation admin asked to rename their listing. Approve to publish it.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {pendingNameChanges.map((f) => (
              <div
                key={String(f.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  padding: '0.75rem 0.9rem',
                  background: 'rgba(255,184,28,0.06)',
                  border: '1px solid rgba(255,184,28,0.25)',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                }}
              >
                <span style={{ color: '#fff' }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{String(f.name)}</span>
                  {' → '}
                  <strong style={{ color: '#FFB81C' }}>{String(f.pending_name)}</strong>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => approveNameChange(String(f.id))}
                  style={{
                    padding: '0.35rem 0.9rem',
                    background: '#14B8A6',
                    color: '#0a0a0a',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- MEMBER REQUESTS ---------------- */}
      <section style={sectionStyle}>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.35rem',
          }}
        >
          MEMBER REQUESTS ({pendingMembers.length})
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1rem' }}>
          Leagues and clubs a federation admin wants attached to their listing. Nothing changes
          on the public site until you approve it.
        </p>

        {pendingMembers.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.85rem',
            }}
          >
            No member requests waiting.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {pendingMembers.map((r) => {
              const isRemoval = String(r.review_note || '').includes('Removal requested');
              return (
                <div
                  key={String(r.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    padding: '0.75rem 0.9rem',
                    background: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 8,
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff' }}>
                      <span
                        style={{
                          color: isRemoval ? '#FF6B7A' : '#FFB81C',
                          fontWeight: 700,
                          marginRight: '0.5rem',
                          fontSize: '0.75rem',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {isRemoval ? 'REMOVE' : String(r.member_type).toUpperCase()}
                      </span>
                      {String(r.target_name)}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                      {String(r.federation_name)} · {new Date(String(r.created_at)).toLocaleDateString()}
                      {r.proposed_country ? ` · ${String(r.proposed_country)}` : ''}
                      {r.proposed_level ? ` · ${String(r.proposed_level)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => reviewMemberRequest(String(r.id), 'approve')}
                      style={{
                        padding: '0.35rem 0.9rem',
                        background: '#14B8A6',
                        color: '#0a0a0a',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => reviewMemberRequest(String(r.id), 'reject')}
                      style={{
                        padding: '0.35rem 0.9rem',
                        background: 'transparent',
                        color: '#FF6B7A',
                        border: '1px solid rgba(200,16,46,0.5)',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- INVITES ---------------- */}
      <section style={sectionStyle}>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.35rem',
          }}
        >
          INVITES ({invites.length})
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1rem' }}>
          Every invite ever issued. Revoking one kills the link immediately.
        </p>

        {invites.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.85rem',
            }}
          >
            No invites issued yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {invites.map((i) => {
              const revoked = Boolean(i.revoked_at);
              const expired = new Date(String(i.expires_at)).getTime() < Date.now();
              const used = Number(i.times_used) >= Number(i.max_uses);
              const dead = revoked || expired || used;
              return (
                <div
                  key={String(i.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    padding: '0.65rem 0.85rem',
                    background: '#0a0a0a',
                    border: `1px solid ${dead ? 'rgba(255,255,255,0.07)' : 'rgba(34,197,94,0.28)'}`,
                    borderRadius: 8,
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff' }}>
                      {String(i.federation_name)}{' '}
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>→ {String(i.email)}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      {revoked
                        ? 'REVOKED'
                        : expired
                          ? 'EXPIRED'
                          : used
                            ? 'USED'
                            : `Expires ${new Date(String(i.expires_at)).toLocaleDateString()}`}
                      {i.contact_name ? ` · ${String(i.contact_name)}` : ''}
                    </div>
                  </div>
                  {!dead && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => revokeInvite(String(i.id))}
                      style={{
                        padding: '0.3rem 0.8rem',
                        background: 'transparent',
                        color: '#FF6B7A',
                        border: '1px solid rgba(200,16,46,0.5)',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- FEDERATION LIST ---------------- */}
      <section style={sectionStyle}>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.35rem',
          }}
        >
          ALL FEDERATIONS ({federations.length}) · {claimed.length} CLAIMED
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1rem' }}>
          {federations.length} federations in the directory.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <input
            style={inputStyle}
            placeholder="Filter by name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 520, overflowY: 'auto' }}>
          {visibleFederations.map((f) => (
            <div
              key={String(f.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6,
                fontSize: '0.85rem',
              }}
            >
              <span style={{ color: '#fff' }}>
                {String(f.name)}
                {f.country_code ? (
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}> · {String(f.country_code)}</span>
                ) : null}
              </span>
              <span
                style={{
                  color: f.owner_user_id ? '#4ADE80' : 'rgba(255,255,255,0.4)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {f.owner_user_id ? 'CLAIMED' : 'UNCLAIMED'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
