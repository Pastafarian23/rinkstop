import Link from 'next/link';
import EventKindBadge from './EventKindBadge';

interface EventListItemProps {
  teamSlug: string;
  event: {
    id: string;
    event_kind: string;
    title: string;
    starts_at: string;
    ends_at: string;
    location_note?: string | null;
    opposing_team?: string | null;
    is_off_ice?: boolean;
    status: string;
  };
  rsvpCount?: number;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function EventListItem({ teamSlug, event, rsvpCount }: EventListItemProps) {
  const isCancelled = event.status === 'cancelled';
  const isCompleted = event.status === 'completed';

  return (
    <Link
      href={`/dashboard/team/${teamSlug}/events/${event.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '1rem 1.25rem',
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 10,
        textDecoration: 'none',
        color: '#fff',
        opacity: isCancelled ? 0.55 : 1,
        transition: 'border-color 0.15s, transform 0.15s',
      }}
    >
      <div style={{ minWidth: 96, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {fmtDate(event.starts_at).split(',')[0]}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#FFB81C', lineHeight: 1.1 }}>
          {new Date(event.starts_at).getDate()}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          {fmtTime(event.starts_at)}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <EventKindBadge kind={event.event_kind} />
          {event.is_off_ice && (
            <span style={{
              fontSize: 10, padding: '0.1rem 0.45rem', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(255,255,255,0.1)', textTransform: 'uppercase',
              fontWeight: 700, letterSpacing: '0.05em',
            }}>Off-ice</span>
          )}
          {isCancelled && (
            <span style={{
              fontSize: 10, padding: '0.1rem 0.45rem', borderRadius: 999,
              background: 'rgba(200,16,46,0.15)', color: '#C8102E',
              border: '1px solid rgba(200,16,46,0.4)', textTransform: 'uppercase',
              fontWeight: 700, letterSpacing: '0.05em',
            }}>Cancelled</span>
          )}
          {isCompleted && (
            <span style={{
              fontSize: 10, padding: '0.1rem 0.45rem', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase',
              fontWeight: 700, letterSpacing: '0.05em',
            }}>Done</span>
          )}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 600, color: '#fff',
          textDecoration: isCancelled ? 'line-through' : 'none',
          marginBottom: 2,
        }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {event.opposing_team && <span>vs {event.opposing_team}</span>}
          {event.location_note && <span>📍 {event.location_note}</span>}
          {typeof rsvpCount === 'number' && (
            <span style={{ color: rsvpCount > 0 ? '#FFB81C' : 'rgba(255,255,255,0.45)' }}>
              👥 {rsvpCount} yes
            </span>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, color: 'rgba(255,255,255,0.3)', fontSize: 18 }} aria-hidden="true">
        →
      </div>
    </Link>
  );
}