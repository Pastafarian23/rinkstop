'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface MyTeam {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  avatar_url: string | null;
  level: string | null;
  age_label: string | null;
  home_city: string | null;
  home_country: string | null;
  role: string | null;
  href: string;
}

const ROLE_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  head_coach: { bg: 'rgba(255,184,28,0.15)', fg: '#FFB81C', label: 'Head Coach' },
  assistant_coach: { bg: 'rgba(20,184,166,0.15)', fg: '#14B8A6', label: 'Asst Coach' },
  goalie_coach: { bg: 'rgba(20,184,166,0.15)', fg: '#14B8A6', label: 'Goalie Coach' },
  skills_coach: { bg: 'rgba(20,184,166,0.15)', fg: '#14B8A6', label: 'Skills Coach' },
  manager: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.85)', label: 'Manager' },
  team_staff: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.85)', label: 'Staff' },
  player: { bg: 'rgba(96,165,250,0.15)', fg: '#60A5FA', label: 'Player' },
  goalie: { bg: 'rgba(96,165,250,0.15)', fg: '#60A5FA', label: 'Goalie' },
  alternate_player: { bg: 'rgba(96,165,250,0.10)', fg: 'rgba(96,165,250,0.7)', label: 'Alt Player' },
  parent_rep: { bg: 'rgba(244,114,182,0.15)', fg: '#F472B6', label: 'Parent Rep' },
  treasurer: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.7)', label: 'Treasurer' },
};

export default function TeamSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  // Determine the "current" team from the URL
  // /dashboard/team/[slug]/... → that team is current
  const currentTeamSlugMatch = pathname?.match(/^\/dashboard\/team\/([^/]+)/);
  const currentTeamSlug = currentTeamSlugMatch ? currentTeamSlugMatch[1] : null;
  const currentTeam = teams.find((t) => t.slug === currentTeamSlug) || null;

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function load() {
    try {
      const r = await fetch('/api/my-teams');
      if (!r.ok) {
        setTeams([]);
        return;
      }
      const d = await r.json();
      setTeams(d.teams || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  // Don't render if user has no teams (avoid clutter)
  if (loading) {
    return (
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        aria-hidden="true"
      />
    );
  }

  if (teams.length === 0) {
    return null;
  }

  // If user is on exactly one team, show that team as a static badge (no dropdown)
  if (teams.length === 1 && !currentTeamSlug) {
    // User has a team but isn't on its page — still show a single link
    return (
      <Link
        href={teams[0].href}
        title={`Open ${teams[0].name}`}
        aria-label={`Open ${teams[0].name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 999,
          color: '#fff',
          fontSize: '0.8rem',
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          maxWidth: 220,
        }}
      >
        <span style={{ fontSize: '1rem' }}>🏒</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {teams[0].short_name || teams[0].name}
        </span>
      </Link>
    );
  }

  // 1+ teams — show a dropdown
  const triggerLabel = currentTeam
    ? currentTeam.short_name || currentTeam.name
    : teams.length === 1
    ? teams[0].short_name || teams[0].name
    : `Switch team (${teams.length})`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={currentTeam ? `Current team: ${currentTeam.name}. Click to switch.` : `Switch team (${teams.length})`}
        title="Switch team"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          background: currentTeam ? 'rgba(255,184,28,0.12)' : 'rgba(255,255,255,0.08)',
          border: currentTeam ? '1px solid rgba(255,184,28,0.5)' : '1px solid rgba(255,255,255,0.15)',
          borderRadius: 999,
          color: '#fff',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          maxWidth: 220,
          overflow: 'hidden',
        }}
      >
        <span style={{ fontSize: '1rem' }} aria-hidden="true">🏒</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {triggerLabel}
        </span>
        <span aria-hidden="true" style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft: -2 }}>
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch team"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            minWidth: 280,
            maxWidth: 360,
            maxHeight: 420,
            overflowY: 'auto',
            background: '#0F1A2E',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Your teams
          </div>

          {teams.map((t) => {
            const role = t.role ? ROLE_COLOR[t.role] : null;
            const isCurrent = currentTeamSlug === t.slug;
            return (
              <Link
                key={t.id}
                href={t.href}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  router.push(t.href);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: isCurrent ? 'rgba(255,184,28,0.08)' : 'transparent',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #041E42 0%, #0a2d5a 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.95rem',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  🏒
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: '#fff',
                      fontWeight: isCurrent ? 700 : 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.name}
                    {isCurrent && (
                      <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#FFB81C', fontWeight: 700 }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.45)',
                      marginTop: 1,
                      display: 'flex',
                      gap: '0.4rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {t.age_label && <span>{t.age_label}</span>}
                    {!t.age_label && t.level && <span>{t.level}</span>}
                    {(t.home_city || t.home_country) && (
                      <span>
                        {[t.home_city, t.home_country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                {role && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 4,
                      background: role.bg,
                      color: role.fg,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {role.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
