'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatRole, roleColor } from '@/lib/team';

interface AdminRow {
  id: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  role: string;
  joinedAt: string;
  isMinor: boolean;
}

interface Props {
  teamSlug: string;
  admins: AdminRow[];
}

type SortKey = 'role' | 'recent' | 'name';

function fmtJoined(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffD = Math.round(diffMs / 86_400_000);
  if (diffD < 1) return 'today';
  if (diffD < 30) return `${diffD}d ago`;
  if (diffD < 365) return `${Math.round(diffD / 30)}mo ago`;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const ROLE_PRIORITY: Record<string, number> = {
  head_coach: 1,
  manager: 2,
  president: 3,
  vice_president: 4,
  secretary: 5,
  treasurer: 6,
  assistant_coach: 7,
  goalie_coach: 8,
  skills_coach: 9,
  team_staff: 10,
  board_member: 11,
  safety_officer: 12,
};

export function AdminRosterSummary({ teamSlug, admins }: Props) {
  const [sort, setSort] = useState<SortKey>('role');

  // Role distribution
  const roleDist = admins.reduce<Record<string, number>>((acc, a) => {
    acc[a.role] = (acc[a.role] || 0) + 1;
    return acc;
  }, {});

  const sorted = [...admins].sort((a, b) => {
    if (sort === 'name') {
      return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
    }
    if (sort === 'recent') {
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    }
    // role
    const ap = ROLE_PRIORITY[a.role] ?? 99;
    const bp = ROLE_PRIORITY[b.role] ?? 99;
    if (ap !== bp) return ap - bp;
    return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
  });

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.25rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          Admin roster
        </h2>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          {admins.length} admin{admins.length === 1 ? '' : 's'} on this team
        </p>
      </div>

      {/* Role distribution — quick visual coverage check */}
      {admins.length > 0 && (
        <div>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Role coverage
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {Object.entries(roleDist)
              .sort((a, b) => (ROLE_PRIORITY[a[0]] ?? 99) - (ROLE_PRIORITY[b[0]] ?? 99))
              .map(([role, count]) => {
                const c = roleColor(role);
                return (
                  <span
                    key={role}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: c.bg,
                      color: c.text,
                      border: `1px solid ${c.border}`,
                      borderRadius: 4,
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {formatRole(role)} <span style={{ opacity: 0.7 }}>×{count}</span>
                  </span>
                );
              })}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Members
          </span>
          <span style={{ flex: 1 }} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 5,
              color: '#fff',
              fontSize: '0.7rem',
              padding: '0.2rem 0.4rem',
              fontFamily: 'inherit',
            }}
          >
            <option value="role">By role</option>
            <option value="recent">Most recent</option>
            <option value="name">A → Z</option>
          </select>
        </div>

        {admins.length === 0 ? (
          <div
            style={{
              background: 'rgba(255,184,28,0.04)',
              border: '1px dashed rgba(255,184,28,0.3)',
              borderRadius: 8,
              padding: '0.85rem 1rem',
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            <strong style={{ color: '#FFB81C', display: 'block', marginBottom: '0.2rem' }}>No admins on this team yet.</strong>
            Invite coaches, managers, or board members from the main team hub.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sorted.map((a) => {
              const c = roleColor(a.role);
              const name = a.displayName || a.username || 'Unnamed';
              return (
                <li
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    padding: '0.55rem 0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      background: c.bg,
                      color: c.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      flexShrink: 0,
                    }}
                  >
                    {name[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                      {formatRole(a.role)} · joined {fmtJoined(a.joinedAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Link
        href={`/dashboard/team/${teamSlug}#invites`}
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '0.55rem',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          color: 'rgba(255,255,255,0.7)',
          textDecoration: 'none',
          fontSize: '0.78rem',
          fontWeight: 600,
        }}
      >
        + Invite another admin
      </Link>
    </section>
  );
}
