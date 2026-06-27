'use client';

import { AttendanceRow } from './AttendanceRow';

interface AttendancePlayer {
  userId: string;
  displayName: string | null;
  username: string | null;
  attendanceStatus: string | null;
  rsvpResponse: string;
}

interface AttendanceSectionProps {
  teamSlug: string;
  eventId: string;
  players: AttendancePlayer[];
  canMarkAttendance: boolean;
}

export function AttendanceSection({
  teamSlug,
  eventId,
  players,
  canMarkAttendance,
}: AttendanceSectionProps) {
  if (players.length === 0) {
    return (
      <div style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)' }}>
        No RSVP responses yet. Attendance will show when players respond.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {canMarkAttendance && (
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: 'rgba(34,197,94,0.15)',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            onClick={() => markAllPresent(teamSlug, eventId, players)}
          >
            Mark all present
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {players.map((player) => (
          <AttendanceRow
            key={player.userId}
            teamSlug={teamSlug}
            eventId={eventId}
            playerId={player.userId}
            displayName={player.displayName}
            username={player.username}
            rsvpResponse={player.rsvpResponse}
            currentStatus={player.attendanceStatus}
            canMark={canMarkAttendance}
          />
        ))}
      </div>
    </div>
  );
}

async function markAllPresent(teamSlug: string, eventId: string, players: AttendancePlayer[]) {
  for (const player of players) {
    try {
      await fetch(
        `/api/team/${teamSlug}/events/${eventId}/attendance`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.userId, attendanceStatus: 'present' }),
        }
      );
    } catch (error) {
      console.error('Bulk attendance update failed:', error);
    }
  }
}