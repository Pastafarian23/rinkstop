'use client';

import { AttendanceCheck } from './AttendanceCheck';
import { AttendanceNotes } from './AttendanceNotes';

interface AttendanceRowProps {
  teamSlug: string;
  eventId: string;
  playerId: string;
  displayName: string | null;
  username: string | null;
  rsvpResponse: string;
  currentStatus: string | null;
  currentNote?: string | null;
  canMark: boolean;
}

export function AttendanceRow({
  teamSlug,
  eventId,
  playerId,
  displayName,
  username,
  rsvpResponse,
  currentStatus,
  currentNote,
  canMark,
}: AttendanceRowProps) {
  const rsvpColors = {
    yes: '#FFB81C',
    no: '#C8102E',
    maybe: '#3b82f6',
  } as const;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '0.5rem 0.75rem',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #041E42 0%, #14B8A6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
          aria-hidden
        >
          {(displayName || username || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
            {displayName || username || playerId}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            RSVP:{' '}
            <span style={{ color: rsvpColors[rsvpResponse as keyof typeof rsvpColors] || '#fff' }}>
              {rsvpResponse === 'yes' ? 'Yes' : rsvpResponse === 'no' ? 'No' : 'Maybe'}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <AttendanceCheck
          playerId={playerId}
          initialStatus={currentStatus as any}
          onChange={(pid, newStatus) => handleAttendanceChange(teamSlug, eventId, pid, newStatus)}
          disabled={!canMark}
        />
        {canMark && (
          <AttendanceNotes
            playerId={playerId}
            eventId={eventId}
            teamSlug={teamSlug}
            initialNote={currentNote}
            disabled={!canMark}
          />
        )}
      </div>
    </div>
  );
}

async function handleAttendanceChange(teamSlug: string, eventId: string, playerId: string, status: string | null) {
  try {
    const response = await fetch(
      `/api/team/${teamSlug}/events/${eventId}/attendance`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, attendanceStatus: status }),
      }
    );
    if (!response.ok) {
      console.error('Attendance update failed:', response.status);
    }
  } catch (error) {
    console.error('Attendance update error:', error);
  }
}