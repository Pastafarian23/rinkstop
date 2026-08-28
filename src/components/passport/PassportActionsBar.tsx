'use client';

/**
 * PassportActionsBar — client-side wrapper around a server-rendered
 * passport section that adds "+ Add" entry points for the owner.
 *
 * Pattern: the parent (PassportSections) passes the data fetched server-
 * side (seasons, teams, team history). This wrapper renders the existing
 * server content + the "+ Add" button + the modal that opens on click.
 *
 * Why a wrapper instead of refactoring the sections:
 *   - Server components stay server components (less client JS shipped).
 *   - The existing read-only sections keep their layout, queries, and
 *     verification logic untouched.
 *   - Owner-action state (open/close modal) lives in the client wrapper,
 *     not in the server section.
 *
 * On save: dispatches 'rinkstop:passport-updated'. PassportSections.tsx
 * will listen (TODO) and re-fetch counts.
 */

import { useState, useEffect, useRef } from 'react';
import StatsFormModal from './StatsFormModal';
import CareerHistoryFormModal from './CareerHistoryFormModal';

interface Season {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

interface TeamHistory {
  id: string;
  team_name_snapshot: string;
  season_id: string;
  level: string | null;
  position: string | null;
  jersey_number: number | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  league_id: string | null;
  leagues: { name: string } | { name: string }[] | null;
}

interface CareerActionsProps {
  isOwner: boolean;
  playerId: string;
  playerName: string;
  positionCategory: string | null;
  seasons: Season[];
  teamHistory: TeamHistory[];
}

interface StatsActionsProps {
  isOwner: boolean;
  playerId: string;
  playerName: string;
  positionCategory: string | null;
  seasons: Season[];
  teamHistory: TeamHistory[];
}

/**
 * Renders a "+ Add career affiliation" button + modal.
 * Use inline next to the existing "+ Add affiliation" link in
 * HockeyCareerSection.
 */
export function CareerHistoryActions({
  isOwner,
  playerName,
  seasons,
  teamHistory,
}: Omit<CareerActionsProps, 'positionCategory'>) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Lazy-load teams only when the modal opens (saves an unnecessary
  // round-trip on page load for non-owners).
  const openedOnceRef = useRef(false);
  useEffect(() => {
    if (!open || openedOnceRef.current) return;
    openedOnceRef.current = true;
    setTeamsLoading(true);
    fetch('/api/teams?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // /api/teams returns { teams: [...] } or { data: [...] } depending
        // on the shape. Handle both shapes defensively.
        const list = Array.isArray(d) ? d : (d?.teams ?? d?.data ?? []);
        // Map to the shape CareerHistoryFormModal expects.
        const mapped = list.map((t: any) => ({
          id: t.id,
          name: t.name ?? '',
          slug: t.slug ?? '',
          league_id: t.league_id ?? null,
          leagues: t.leagues ?? t.league ?? null,
        }));
        setTeams(mapped);
      })
      .catch(() => {
        /* silent — user can still type a team name */
      })
      .finally(() => setTeamsLoading(false));
  }, [open]);

  if (!isOwner) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(20, 184, 166, 0.12)',
          border: '1px solid rgba(20, 184, 166, 0.4)',
          borderRadius: 6,
          color: '#14B8A6',
          padding: '0.375rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        + Add affiliation
      </button>
      <CareerHistoryFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          // Refresh the section by triggering a passport update.
          window.dispatchEvent(new CustomEvent('rinkstop:passport-updated'));
        }}
        playerName={playerName}
        seasons={seasons}
        teams={teams}
      />
      {teamsLoading && open && (
        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          Loading teams…
        </span>
      )}
    </>
  );
}

/**
 * Renders a "+ Add season stats" button + modal.
 * Replaces the inline "+ Add your first season stats" / "+ Add season"
 * link in HockeyStatsSection.
 */
export function StatsActions({
  isOwner,
  playerName,
  positionCategory,
  seasons,
  teamHistory,
}: StatsActionsProps) {
  const [open, setOpen] = useState(false);

  if (!isOwner) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(20, 184, 166, 0.12)',
          border: '1px solid rgba(20, 184, 166, 0.4)',
          borderRadius: 6,
          color: '#14B8A6',
          padding: '0.375rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        + Add season stats
      </button>
      <StatsFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          window.dispatchEvent(new CustomEvent('rinkstop:passport-updated'));
        }}
        playerName={playerName}
        positionCategory={positionCategory}
        seasons={seasons}
        teamHistory={teamHistory}
      />
    </>
  );
}
