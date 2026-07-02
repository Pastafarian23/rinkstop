'use client';

import { useEffect, useState, useCallback } from 'react';

type ProfileType = 'player' | 'team' | 'league';

interface ManagedRow {
  id: string;
  profile_type: ProfileType;
  profile_id: string;
  relationship: string;
  /** Hydrated display data from /api/profiles/managed. */
  profile: {
    first_name?: string;
    last_name?: string;
    name?: string;
    slug?: string;
    headshot_url?: string;
    logo_url?: string;
  } | null;
}

interface SearchHit {
  id: string;
  name: string;
  meta?: string | null;
  headshot_url?: string | null;
  logo_url?: string | null;
}

interface Props {
  initialManaged: ManagedRow[];
  /** Tier hint from the server, so the UI can hide team/league adders for non-Pro users. */
  tier: string;
}

const TYPE_LABEL: Record<ProfileType, string> = {
  player: 'Player record',
  team: 'Team I run',
  league: 'League I admin',
};

const TYPE_ICON: Record<ProfileType, string> = {
  player: '🏒',
  team: '🛡️',
  league: '🏆',
};

const TYPE_ORDER: ProfileType[] = ['player', 'team', 'league'];

function nameFor(m: ManagedRow): string {
  const p = m.profile;
  if (!p) return 'Unnamed';
  if (m.profile_type === 'player') return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unnamed';
  return p.name || 'Unnamed';
}

function imgFor(m: ManagedRow): string | null {
  if (!m.profile) return null;
  return m.profile_type === 'player' ? m.profile.headshot_url ?? null : m.profile.logo_url ?? null;
}

/**
 * Client component: lets a signed-in user view and manage their
 * `managed_profiles` rows. Three lists (player / team / league), each
 * with an inline search picker that calls /api/search/[type].
 *
 * Constraints inherited from /api/profiles/managed:
 *  - Adding a player requires Roster+ tier AND the player must be under 18.
 *  - Adding a team/league requires Pro+ tier.
 *  - relationship must be parent/guardian/spouse/self (only self is shown
 *    as the default; users editing a child/parent can switch via a dropdown).
 */
export default function LinkedRecordsManager({ initialManaged, tier }: Props) {
  const [managed, setManaged] = useState<ManagedRow[]>(initialManaged);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openType, setOpenType] = useState<ProfileType | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tierOk = (t: ProfileType): boolean => {
    if (t === 'player') return ['roster', 'roster_plus', 'pro', 'premium'].includes(tier);
    // team/league need Pro+ (personal track top tier) or any business tier
    return ['pro', 'premium', 'business_starter', 'business_pro', 'business_premium', 'enterprise'].includes(tier);
  };

  const search = useCallback(async (type: ProfileType, q: string) => {
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/search/${type}?q=${encodeURIComponent(q)}&limit=10`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Search failed (${res.status})`);
        setHits([]);
        return;
      }
      const d = await res.json();
      setHits(Array.isArray(d.results) ? d.results : []);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
      setHits([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce search-as-you-type.
  useEffect(() => {
    if (!openType) return;
    const t = setTimeout(() => search(openType, query), 250);
    return () => clearTimeout(t);
  }, [query, openType, search]);

  async function addLink(type: ProfileType, hit: SearchHit, relationship: string) {
    setBusyId(hit.id);
    setError(null);
    try {
      const res = await fetch('/api/profiles/managed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileType: type,
          profileId: hit.id,
          relationship,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Add failed (${res.status})`);
        return;
      }
      // Re-fetch the full managed list to get the hydrated shape.
      const list = await fetch('/api/profiles/managed');
      const listData = await list.json();
      if (list.ok && Array.isArray(listData.managedProfiles)) {
        setManaged(listData.managedProfiles);
      }
      // Close the picker after a successful add.
      setOpenType(null);
      setQuery('');
      setHits([]);
    } catch (e: any) {
      setError(e?.message || 'Add failed');
    } finally {
      setBusyId(null);
    }
  }

  async function removeLink(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/managed/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Remove failed (${res.status})`);
        return;
      }
      setManaged((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      setError(e?.message || 'Remove failed');
    } finally {
      setBusyId(null);
    }
  }

  // Group managed rows by profile_type, in the canonical display order.
  const groups: Record<ProfileType, ManagedRow[]> = { player: [], team: [], league: [] };
  for (const m of managed) groups[m.profile_type].push(m);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(220,30,30,0.12)',
            border: '1px solid rgba(220,30,30,0.4)',
            borderRadius: 8,
            color: '#FCA5A5',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {TYPE_ORDER.map((type) => {
        const rows = groups[type];
        const canAdd = tierOk(type);
        return (
          <section
            key={type}
            style={{
              background: '#0f0f0f',
              border: '1px solid #1e1e1e',
              borderRadius: 12,
              padding: '1.25rem',
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: '0.75rem',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '1.05rem',
                  color: '#fff',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                {TYPE_ICON[type]} {TYPE_LABEL[type].toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setOpenType(openType === type ? null : type);
                  setQuery('');
                  setHits([]);
                  setError(null);
                }}
                disabled={!canAdd}
                title={canAdd ? `Add ${type}` : `Your current tier can't add ${type} profiles. See Pricing.`}
                style={{
                  padding: '0.4rem 0.85rem',
                  background: openType === type ? 'rgba(20,184,166,0.2)' : (canAdd ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.05)'),
                  border: `1px solid ${canAdd ? 'rgba(20,184,166,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 6,
                  color: canAdd ? '#14B8A6' : 'rgba(255,255,255,0.4)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: canAdd ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.04em',
                }}
              >
                {openType === type ? 'Cancel' : `+ Add ${type}`}
              </button>
            </header>

            {rows.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', margin: 0 }}>
                None yet. {canAdd ? 'Click "Add" to link a record.' : 'Your tier doesn\'t allow managing this kind of record.'}
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rows.map((m) => (
                  <li
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                    }}
                  >
                    {imgFor(m) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgFor(m)!} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {TYPE_ICON[type]}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {nameFor(m)}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', margin: 0, textTransform: 'capitalize' }}>
                        {m.relationship.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(m.id)}
                      disabled={busyId === m.id}
                      style={{
                        padding: '0.3rem 0.65rem',
                        background: 'transparent',
                        border: '1px solid rgba(220,30,30,0.3)',
                        borderRadius: 6,
                        color: '#FCA5A5',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: busyId === m.id ? 'wait' : 'pointer',
                      }}
                    >
                      {busyId === m.id ? '…' : 'Remove'}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Inline picker */}
            {openType === type && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                }}
              >
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${type}s by name…`}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                  }}
                />
                {searching && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Searching…</p>
                )}
                {!searching && hits.length === 0 && query.length > 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>No matches.</p>
                )}
                {!searching && hits.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {hits.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => addLink(type, h, type === 'player' ? 'self' : type === 'team' ? 'head_coach' : 'league_admin')}
                          disabled={busyId === h.id}
                          style={{
                            all: 'unset',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 6,
                            cursor: busyId === h.id ? 'wait' : 'pointer',
                          }}
                        >
                          {h.headshot_url || h.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={(h.headshot_url || h.logo_url)!} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                              {TYPE_ICON[type]}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</p>
                            {h.meta && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: 0 }}>{h.meta}</p>}
                          </div>
                          <span style={{ color: '#14B8A6', fontSize: '0.75rem', fontWeight: 700 }}>+ Add</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {type === 'player' && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                    Note: youth players (under 18) require a Verified Identity or higher.
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}