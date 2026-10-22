// src/app/dashboard/manage/team/[id]/programs/[programId]/rsvps/RsvpsClient.tsx
//
// WS38 - Organization Plus team-registration-management.
//
// Client-side wrapper around the RSVP list: approve/reject/waitlist single
// rows, bulk approve selected rows, and CSV export. The server page above
// loads the data + user profiles; this component owns all mutations.

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface RsvpRow {
  id: string;
  event_id: string;
  user_id: string;
  response: string;
  note: string | null;
  responded_at: string;
  updated_at: string;
  attendance_status: string | null;
  attendance_at: string | null;
  attendance_note: string | null;
  marked_by: string | null;
  display_name?: string | null;
  username?: string | null;
}

interface RsvpsClientProps {
  teamId: string;
  programId: string;
  programTitle: string;
  rsvps: RsvpRow[];
}

const RESPONSE_COLORS: Record<string, { bg: string; fg: string }> = {
  yes: { bg: 'rgba(16,185,129,0.15)', fg: '#86EFAC' },
  no: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
  maybe: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function RsvpsClient({ teamId, programId, programTitle, rsvps }: RsvpsClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const out: Record<string, number> = { yes: 0, no: 0, maybe: 0 };
    for (const r of rsvps) out[r.response] = (out[r.response] || 0) + 1;
    return out;
  }, [rsvps]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rsvps;
    return rsvps.filter((r) => r.response === filter);
  }, [rsvps, filter]);

  async function setRsvpResponse(rsvpId: string, response: string) {
    setBusy(rsvpId);
    setError(null);
    try {
      const res = await fetch(`/api/manage/team/${teamId}/programs/${programId}/rsvps/${rsvpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }));
        setError(j.error || `Failed (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function bulkApprove() {
    if (selected.size === 0) return;
    setBusy('bulk');
    setError(null);
    try {
      const ids = Array.from(selected);
      const res = await fetch(`/api/manage/team/${teamId}/programs/${programId}/rsvps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvp_ids: ids, response: 'yes' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }));
        setError(j.error || `Failed (${res.status})`);
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }

  function exportCsv() {
    const headers = [
      'rsvp_id',
      'user_id',
      'display_name',
      'username',
      'response',
      'note',
      'responded_at',
      'attendance_status',
      'attendance_at',
    ];
    const lines = [headers.join(',')];
    for (const r of rsvps) {
      lines.push([
        csvEscape(r.id),
        csvEscape(r.user_id),
        csvEscape(r.display_name),
        csvEscape(r.username),
        csvEscape(r.response),
        csvEscape(r.note),
        csvEscape(r.responded_at),
        csvEscape(r.attendance_status),
        csvEscape(r.attendance_at),
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safe = programTitle.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 50) || 'program';
    a.download = `rsvps-${safe}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 960 }}>
      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['all', 'yes', 'no', 'maybe'] as const).map((f) => {
            const c = f === 'all'
              ? { bg: 'rgba(148,163,184,0.15)', fg: '#cbd5e1', border: 'rgba(148,163,184,0.3)' }
              : (RESPONSE_COLORS[f] && {
                  bg: RESPONSE_COLORS[f].bg,
                  fg: RESPONSE_COLORS[f].fg,
                  border: 'rgba(255,255,255,0.15)',
                }) || { bg: 'rgba(148,163,184,0.15)', fg: '#cbd5e1', border: 'rgba(148,163,184,0.3)' };
            const isActive = filter === f;
            const count = f === 'all' ? rsvps.length : (counts[f] || 0);
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  background: isActive ? c.bg : 'rgba(255,255,255,0.04)',
                  color: isActive ? c.fg : '#94A3B8',
                  border: `1px solid ${isActive ? c.border : 'var(--border)'}`,
                  padding: '0.375rem 0.75rem',
                  borderRadius: 999,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {f === 'all' ? 'All' : f} {f !== 'all' ? `(${count})` : `(${count})`}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={bulkApprove}
              disabled={busy === 'bulk'}
              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.5rem 0.875rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {busy === 'bulk' ? 'Approving…' : `Approve ${selected.size} selected`}
            </button>
          )}
          <button
            type="button"
            onClick={exportCsv}
            disabled={rsvps.length === 0}
            style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid var(--border)', padding: '0.5rem 0.875rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: rsvps.length === 0 ? 'not-allowed' : 'pointer', opacity: rsvps.length === 0 ? 0.5 : 1 }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {rsvps.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>
            No RSVPs yet. Players will appear here as soon as they respond.
          </p>
        </div>
      ) : (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ ...th, width: 40 }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th style={th}>Name</th>
                <th style={th}>Responded</th>
                <th style={th}>Status</th>
                <th style={th}>Notes</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const c = RESPONSE_COLORS[r.response] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
                const isSelected = selected.has(r.id);
                const name = r.display_name || r.username || r.user_id;
                const disabled = busy === r.id || busy === 'bulk';
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)', opacity: disabled ? 0.6 : 1 }}>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(r.id)}
                        aria-label={`Select ${name}`}
                      />
                    </td>
                    <td style={td}>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{name}</div>
                      <div style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: '0.125rem', fontFamily: 'monospace' }}>
                        {r.user_id.length > 24 ? `${r.user_id.slice(0, 24)}…` : r.user_id}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ color: '#cbd5e1' }}>{formatDate(r.responded_at)}</div>
                    </td>
                    <td style={td}>
                      <span style={{ background: c.bg, color: c.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {r.response}
                      </span>
                      {r.attendance_status && (
                        <div style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                          attendance: {r.attendance_status}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      {r.note ? (
                        <span style={{ color: '#cbd5e1', fontSize: '0.8rem', maxWidth: 240, display: 'inline-block' }}>
                          {r.note.length > 120 ? `${r.note.slice(0, 120)}…` : r.note}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setRsvpResponse(r.id, 'yes')}
                          disabled={disabled || r.response === 'yes'}
                          style={actionStyle('#16a34a', '#fff', r.response === 'yes')}
                          title="Approve"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setRsvpResponse(r.id, 'maybe')}
                          disabled={disabled || r.response === 'maybe'}
                          style={actionStyle('#FFB81C', '#0F172A', r.response === 'maybe')}
                          title="Waitlist"
                        >
                          Waitlist
                        </button>
                        <button
                          type="button"
                          onClick={() => setRsvpResponse(r.id, 'no')}
                          disabled={disabled || r.response === 'no'}
                          style={actionStyle('#C8102E', '#fff', r.response === 'no')}
                          title="Reject"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.625rem 0.875rem',
  color: '#94A3B8',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const td: React.CSSProperties = {
  padding: '0.625rem 0.875rem',
  verticalAlign: 'top',
};

function actionStyle(color: string, textColor: string, isActive: boolean): React.CSSProperties {
  // Active state: fill the button so the user can see the row is already in
  // that state. Inactive: outline only, with the action's color as the text.
  return {
    background: isActive ? color : 'transparent',
    color: isActive ? textColor : color,
    border: `1px solid ${color}`,
    padding: '0.25rem 0.5rem',
    borderRadius: 6,
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: isActive ? 'default' : 'pointer',
    opacity: isActive ? 1 : 0.9,
  };
}