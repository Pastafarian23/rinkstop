'use client';

// RosterEditor
//
// Lets a team admin manage the roster from the dashboard.
//
// TWO KINDS OF ROSTER ROW, because a club's roster is both things:
//
//   MEMBERS  — people with a RinkStop account who are on the roster
//              (`team_members`). They carry a team ROLE (head_coach,
//              player, parent_rep, …), jersey number, position, shoots,
//              birth date, and — for minors — a guardian link.
//
//   PLAYERS  — player records (`players`) linked to the team for a stint
//              (`hockey_player_team_history`). They carry jersey number,
//              position, role and a verification source.
//
// A row added here is `coach_verified` by definition: the team entered it,
// so it is not a self-reported claim. That is what makes the public
// roster's "COACH VERIFIED" marker mean something.
//
// Access is role-scoped per team and tier-gated (see src/lib/team-authority.ts):
// the caller needs an approved claim on the team or an admin role on it,
// AND an organization tier that includes roster management.

import { useState } from 'react';

export interface RosterMember {
  id: string;
  user_id: string;
  role: string;
  jersey_number: number | null;
  position: string | null;
  shoots: string | null;
  birth_date: string | null;
  joined_at: string | null;
  left_at: string | null;
  is_minor: boolean;
  parent_user_id: string | null;
  notes: string | null;
  profiles: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

export interface RosterPlayer {
  id: string;
  player_id: string;
  jersey_number: number | null;
  position: string | null;
  role: string | null;
  verification_source: string | null;
  season_id: string | null;
  start_date: string | null;
  end_date: string | null;
  players: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    slug: string | null;
    headshot_url: string | null;
    nationality: string | null;
  } | null;
}

export interface RosterAuthority {
  canView: boolean;
  canManage: boolean;
  reason: string | null;
  role: string | null;
  orgTier: string | null;
}

interface Props {
  teamId: string;
  members: RosterMember[];
  players: RosterPlayer[];
  authority: RosterAuthority | null;
  blockMessage: string;
}

const TEAM_ROLES = [
  { value: 'head_coach', label: 'Head Coach' },
  { value: 'assistant_coach', label: 'Assistant Coach' },
  { value: 'goalie_coach', label: 'Goalie Coach' },
  { value: 'skills_coach', label: 'Skills Coach' },
  { value: 'manager', label: 'Manager' },
  { value: 'team_staff', label: 'Team Staff' },
  { value: 'president', label: 'President' },
  { value: 'vice_president', label: 'Vice President' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'board_member', label: 'Board Member' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'player', label: 'Player' },
  { value: 'goalie', label: 'Goalie' },
  { value: 'alternate_player', label: 'Alternate Player' },
  { value: 'parent_rep', label: 'Parent Rep' },
];

const inputStyle: React.CSSProperties = {
  padding: '0.4375rem 0.625rem',
  background: '#0a0a0a',
  border: '1px solid #1e1e1e',
  borderRadius: 4,
  color: '#fff',
  fontSize: '0.8125rem',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.4375rem 0.875rem',
  background: '#C8102E',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  padding: '0.25rem 0.625rem',
  background: 'transparent',
  border: '1px solid #2a2a2a',
  borderRadius: 4,
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.75rem',
  cursor: 'pointer',
};

function nameOfMember(m: RosterMember) {
  return m.profiles?.display_name || m.profiles?.username || m.user_id.slice(0, 12);
}

function nameOfPlayer(p: RosterPlayer) {
  const pl = p.players;
  if (!pl) return 'Unknown player';
  return [pl.first_name, pl.last_name].filter(Boolean).join(' ') || 'Unnamed player';
}

export default function RosterEditor({ teamId, members, players, authority, blockMessage }: Props) {
  const [rows, setRows] = useState(members);
  const [playerRows, setPlayerRows] = useState(players);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Add-member form
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState('player');
  const [newJersey, setNewJersey] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newIsMinor, setNewIsMinor] = useState(false);
  const [newParentId, setNewParentId] = useState('');

  // Add-player form
  const [newPlayerId, setNewPlayerId] = useState('');
  const [playerJersey, setPlayerJersey] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');

  const canManage = !!authority?.canManage;

  async function call(
    method: 'POST' | 'PATCH' | 'DELETE',
    body: Record<string, unknown>,
  ): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/manage/team/${teamId}/roster`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: 'err', text: data.error || `Request failed (${res.status})` });
        return false;
      }
      return true;
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Network error' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call('POST', {
      kind: 'member',
      user_id: newUserId.trim(),
      role: newRole,
      jersey_number: newJersey.trim() || null,
      position: newPosition.trim() || null,
      is_minor: newIsMinor,
      parent_user_id: newIsMinor ? newParentId.trim() || null : null,
    });
    if (!ok) return;
    setMessage({ kind: 'ok', text: 'Member added.' });
    setNewUserId('');
    setNewJersey('');
    setNewPosition('');
    setNewIsMinor(false);
    setNewParentId('');
    // Re-read the roster so the server stays the source of truth.
    await refresh();
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call('POST', {
      kind: 'player',
      player_id: newPlayerId.trim(),
      jersey_number: playerJersey.trim() || null,
      position: playerPosition.trim() || null,
    });
    if (!ok) return;
    setMessage({ kind: 'ok', text: 'Player added and marked coach verified.' });
    setNewPlayerId('');
    setPlayerJersey('');
    setPlayerPosition('');
    await refresh();
  }

  async function refresh() {
    try {
      const res = await fetch(`/api/manage/team/${teamId}/roster`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.members)) setRows(data.members);
      if (Array.isArray(data.players)) setPlayerRows(data.players);
    } catch {
      /* keep the current view */
    }
  }

  async function updateMember(row: RosterMember, patch: Record<string, unknown>) {
    const ok = await call('PATCH', { kind: 'member', row_id: row.id, ...patch });
    if (!ok) return;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, ...(patch as Partial<RosterMember>) } : r)),
    );
  }

  async function updatePlayer(row: RosterPlayer, patch: Record<string, unknown>) {
    const ok = await call('PATCH', { kind: 'player', row_id: row.id, ...patch });
    if (!ok) return;
    setPlayerRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, ...(patch as Partial<RosterPlayer>) } : r)),
    );
  }

  async function removeMember(row: RosterMember) {
    const ok = await call('DELETE', { kind: 'member', row_id: row.id });
    if (!ok) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setMessage({ kind: 'ok', text: 'Member removed.' });
  }

  async function removePlayer(row: RosterPlayer) {
    const ok = await call('DELETE', { kind: 'player', row_id: row.id });
    if (!ok) return;
    setPlayerRows((prev) => prev.filter((r) => r.id !== row.id));
    setMessage({ kind: 'ok', text: 'Player removed.' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {message && (
        <div
          style={{
            padding: '0.625rem 0.875rem',
            borderRadius: 6,
            fontSize: '0.8125rem',
            background: message.kind === 'ok' ? 'rgba(20,184,166,0.1)' : 'rgba(200,16,46,0.1)',
            border: `1px solid ${message.kind === 'ok' ? 'rgba(20,184,166,0.35)' : 'rgba(200,16,46,0.35)'}`,
            color: message.kind === 'ok' ? '#14B8A6' : '#FF6B7A',
          }}
        >
          {message.text}
        </div>
      )}

      {!canManage && (
        <div
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 8,
            background: 'rgba(255,184,28,0.08)',
            border: '1px solid rgba(255,184,28,0.3)',
            color: '#FFB81C',
            fontSize: '0.8125rem',
          }}
        >
          {blockMessage}
        </div>
      )}

      {/* MEMBERS */}
      <section>
        <h3
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.125rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.5rem',
          }}
        >
          MEMBERS WITH ACCOUNTS ({rows.length})
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>
          Coaches, staff, parents and players who have a RinkStop account. Their team role decides
          what they can do.
        </p>

        {rows.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>No members yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {rows.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.625rem',
                  background: '#0f0f0f',
                  border: '1px solid #1e1e1e',
                  borderRadius: 6,
                }}
              >
                <span style={{ flex: '1 1 140px', minWidth: 0, color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {nameOfMember(m)}
                  {m.is_minor && (
                    <span style={{ marginLeft: '0.375rem', color: '#FFB81C', fontSize: '0.625rem', fontWeight: 700 }}>
                      MINOR
                    </span>
                  )}
                </span>

                {canManage ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => updateMember(m, { role: e.target.value })}
                      style={{ ...inputStyle, flex: '0 1 160px' }}
                      aria-label="Role"
                    >
                      {TEAM_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={m.jersey_number ?? ''}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === m.id
                              ? { ...r, jersey_number: e.target.value === '' ? null : Number(e.target.value) }
                              : r,
                          ),
                        )
                      }
                      onBlur={(e) =>
                        updateMember(m, {
                          jersey_number: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder="#"
                      inputMode="numeric"
                      style={{ ...inputStyle, width: '4rem', flex: '0 0 4rem' }}
                      aria-label="Jersey number"
                    />
                    <input
                      value={m.position ?? ''}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === m.id ? { ...r, position: e.target.value || null } : r,
                          ),
                        )
                      }
                      onBlur={(e) => updateMember(m, { position: e.target.value || null })}
                      placeholder="Position"
                      style={{ ...inputStyle, flex: '0 1 110px' }}
                      aria-label="Position"
                    />
                    <button type="button" onClick={() => removeMember(m)} style={btnGhost}>
                      Remove
                    </button>
                  </>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                    {TEAM_ROLES.find((r) => r.value === m.role)?.label || m.role}
                    {m.jersey_number != null ? ` · #${m.jersey_number}` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <form
            onSubmit={addMember}
            style={{
              marginTop: '0.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              gap: '0.5rem',
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 200px' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                User ID
              </span>
              <input
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="profiles.user_id"
                required
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Role
              </span>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={inputStyle}>
                {TEAM_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '4.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                #
              </span>
              <input value={newJersey} onChange={(e) => setNewJersey(e.target.value)} inputMode="numeric" style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '0 1 120px' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Position
              </span>
              <input value={newPosition} onChange={(e) => setNewPosition(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '4.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Born
              </span>
              <input type="date" style={inputStyle} />
            </label>
            <button type="submit" disabled={busy} style={btnPrimary}>
              Add member
            </button>
          </form>
        )}
      </section>

      {/* PLAYERS */}
      <section>
        <h3
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.125rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.5rem',
          }}
        >
          PLAYERS ({playerRows.length})
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>
          Player records linked to this team. Anything you add here is marked{' '}
          <strong style={{ color: '#FFB81C' }}>COACH VERIFIED</strong> on the public roster.
        </p>

        {playerRows.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>No players yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {playerRows.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.625rem',
                  background: '#0f0f0f',
                  border: '1px solid #1e1e1e',
                  borderRadius: 6,
                }}
              >
                <span style={{ flex: '1 1 140px', minWidth: 0, color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {nameOfPlayer(p)}
                </span>
                {p.verification_source === 'coach_verified' && (
                  <span style={{ color: '#FFB81C', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                    COACH VERIFIED
                  </span>
                )}
                {canManage ? (
                  <>
                    <input
                      value={p.jersey_number ?? ''}
                      onChange={(e) =>
                        setPlayerRows((prev) =>
                          prev.map((r) =>
                            r.id === p.id
                              ? { ...r, jersey_number: e.target.value === '' ? null : Number(e.target.value) }
                              : r,
                          ),
                        )
                      }
                      onBlur={(e) =>
                        updatePlayer(p, {
                          jersey_number: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder="#"
                      inputMode="numeric"
                      style={{ ...inputStyle, width: '4rem', flex: '0 0 4rem' }}
                      aria-label="Jersey number"
                    />
                    <input
                      value={p.position ?? ''}
                      onChange={(e) =>
                        setPlayerRows((prev) =>
                          prev.map((r) =>
                            r.id === p.id ? { ...r, position: e.target.value || null } : r,
                          ),
                        )
                      }
                      onBlur={(e) => updatePlayer(p, { position: e.target.value || null })}
                      placeholder="Position"
                      style={{ ...inputStyle, flex: '0 1 110px' }}
                      aria-label="Position"
                    />
                    <button type="button" onClick={() => removePlayer(p)} style={btnGhost}>
                      Remove
                    </button>
                  </>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                    {p.position || '—'}
                    {p.jersey_number != null ? ` · #${p.jersey_number}` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <form
            onSubmit={addPlayer}
            style={{
              marginTop: '0.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              gap: '0.5rem',
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 240px' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Player ID
              </span>
              <input
                value={newPlayerId}
                onChange={(e) => setNewPlayerId(e.target.value)}
                placeholder="players.id"
                required
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '4.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                #
              </span>
              <input value={playerJersey} onChange={(e) => setPlayerJersey(e.target.value)} inputMode="numeric" style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '0 1 120px' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Position
              </span>
              <input value={playerPosition} onChange={(e) => setPlayerPosition(e.target.value)} style={inputStyle} />
            </label>
            <button type="submit" disabled={busy} style={btnPrimary}>
              Add player
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
