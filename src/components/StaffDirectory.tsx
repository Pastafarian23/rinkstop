'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import CategorySearchBar from '@/components/CategorySearchBar';

interface StaffMember {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role: string;
  was_player: boolean;
  position_abbreviation?: string;
  current_team_name?: string;
  current_team_abbreviation?: string;
  current_team_logo?: string;
  league_name?: string;
  nationality?: string;
  birth_date?: string;
  headshot_url?: string;
  logo?: string;
}

// Each role carries singular + plural labels. "Staff" is a collective
// noun (uncountable) — its plural form is also "staff", not "staffs".
// "Coach" was previously pluralized via an inline ternary; we move it
// here for consistency.
const ROLE_LABELS: Record<string, { singular: string; plural: string }> = {
  coach: { singular: 'Coach', plural: 'Coaches' },
  scout: { singular: 'Scout', plural: 'Scouts' },
  official: { singular: 'Official', plural: 'Officials' },
  executive: { singular: 'Executive', plural: 'Executives' },
  staff: { singular: 'Staff', plural: 'Staff' },
};

function roleBadgeStyle(role: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    coach: { background: 'rgba(255,184,28,0.15)', color: '#FFB81C' },
    scout: { background: 'rgba(20,184,166,0.15)', color: '#14B8A6' },
    official: { background: 'rgba(220,38,38,0.15)', color: '#DC2626' },
    executive: { background: 'rgba(168,85,247,0.15)', color: '#A855F7' },
    staff: { background: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
  };
  return map[role] || { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' };
}

export default function StaffDirectory({ role }: { role: 'coach' | 'scout' | 'official' | 'staff' }) {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/staff/${role}?limit=200`)
      .then(r => r.json())
      .then(d => {
        setMembers(d?.data || []);
        setTotalCount(d?.count || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [role]);

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.current_team_name?.toLowerCase().includes(q) ||
      m.current_team_abbreviation?.toLowerCase().includes(q) ||
      m.nationality?.toLowerCase().includes(q)
    );
  });

  const roleLabel = ROLE_LABELS[role] || { singular: role, plural: role };

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
          Hockey {roleLabel.plural}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9375rem', maxWidth: '680px' }}>
          {role === 'coach' && 'Head coaches and assistant coaches from professional leagues, community teams, and youth programs.'}
          {role === 'scout' && 'NHL team scouts responsible for player evaluation and draft preparation.'}
          {role === 'official' && 'NHL referees and linesmen working regular season and playoff games.'}
          {role === 'staff' && 'Equipment managers, trainers, and other team support staff.'}
        </p>
      </div>

      {/* Search — homepage aesthetic, scoped to this role.
          localOnly=true: the staff directory uses client-side filtering (fast,
          no API call). The bar matches the home-page style visually. */}
      <div style={{ marginBottom: '1.5rem' }}>
        <CategorySearchBar
          category={role}
          page={`/directory/${role}s`}
          maxWidth={600}
          localOnly
        />
      </div>

      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555555', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          {totalCount === 0
            ? `No ${roleLabel.plural.toLowerCase()} in directory yet`
            : `${totalCount} ${roleLabel.plural.toLowerCase()} in directory${search ? ` · ${filtered.length} matching search` : ''}`}
        </p>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.125rem' }}>
                <div className="skeleton" style={{ height: '1.125rem', width: '65%', marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ height: '0.875rem', width: '40%', marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ height: '0.75rem', width: '30%' }} />
              </div>
            ))
          : filtered.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {totalCount === 0
                    ? `No ${roleLabel.plural.toLowerCase()} have been added to the directory yet.`
                    : `No ${roleLabel.plural.toLowerCase()} matching "${search}"`}
                </p>
              </div>
            )
            : filtered.map(m => (
              <Link
                key={m.id}
                href={`/directory/players/${m.id}`}
                style={{
                  display: 'block',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1.125rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, transform 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.borderColor = 'var(--border-h)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.borderColor = 'var(--border)';
                  el.style.transform = '';
                }}
              >
                {/* Headshot or initials */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {m.headshot_url || m.logo ? (
                    <img
                      src={m.headshot_url || m.logo}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: '4px', objectFit: 'cover', flexShrink: 0, background: '#1a1a1a' }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: '4px', background: '#1a1a1a',
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 700, color: '#444',
                    }}>
                      {(m.first_name?.[0] || '') + (m.last_name?.[0] || '')}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', lineHeight: 1.3 }}>
                      {m.full_name}
                    </h3>
                    {m.nationality && (
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem' }}>{m.nationality}</p>
                    )}
                  </div>
                </div>

                {/* Role badge + was_player indicator */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    ...roleBadgeStyle(m.role),
                    padding: '0.2rem 0.5rem',
                    borderRadius: '3px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>
                    {(ROLE_LABELS[m.role] && ROLE_LABELS[m.role].singular) || m.role}
                  </span>
                  {m.was_player && (
                    <span style={{
                      background: 'rgba(20,184,166,0.10)',
                      color: '#14B8A6',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '3px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}>
                      Former player
                    </span>
                  )}
                </div>

                {/* Team */}
                {m.current_team_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {m.current_team_logo && (
                      <img
                        src={m.current_team_logo}
                        alt=""
                        style={{ width: 18, height: 18, objectFit: 'contain' }}
                      />
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>
                      {m.current_team_abbreviation ? `${m.current_team_name} (${m.current_team_abbreviation})` : m.current_team_name}
                    </span>
                  </div>
                )}
              </Link>
            ))}
      </div>
    </div>
  );
}
