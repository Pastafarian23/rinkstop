'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export type EventKind = 'practice' | 'game' | 'tournament' | 'tryout' | 'meeting' | 'team_event';

export interface EventFormInitial {
  id?: string;
  event_kind?: EventKind | string;
  title?: string;
  description?: string | null;
  starts_at?: string;
  ends_at?: string;
  arrival_minutes?: number;
  rink_id?: string | null;
  opposing_team?: string | null;
  location_note?: string | null;
  is_off_ice?: boolean;
  practice_plan_id?: string | null;
  rsvp_required?: boolean;
  rsvp_deadline?: string | null;
  max_attendees?: number | null;
  cost_per_player?: number | null;
  currency?: string;
  status?: 'scheduled' | 'cancelled' | 'completed';
}

interface EventFormProps {
  teamSlug: string;
  initial?: EventFormInitial;
  rinks: Array<{ id: string; name: string }>;
  practicePlans: Array<{ id: string; title: string; slug: string }>;
  defaultCurrency: string;
  isEdit?: boolean;
}

const KIND_OPTIONS: Array<{ value: EventKind; label: string }> = [
  { value: 'practice', label: 'Practice' },
  { value: 'game', label: 'Game' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'tryout', label: 'Tryout' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'team_event', label: 'Team event' },
];

function isoToLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Convert to local datetime-local format (YYYY-MM-DDTHH:MM)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

export default function EventForm({
  teamSlug,
  initial,
  rinks,
  practicePlans,
  defaultCurrency,
  isEdit = false,
}: EventFormProps) {
  const router = useRouter();
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [eventKind, setEventKind] = useState(initial?.event_kind || 'practice');
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [startsAt, setStartsAt] = useState(isoToLocalInput(initial?.starts_at));
  const [endsAt, setEndsAt] = useState(isoToLocalInput(initial?.ends_at));
  const [arrivalMinutes, setArrivalMinutes] = useState(initial?.arrival_minutes ?? 30);
  const [rinkId, setRinkId] = useState(initial?.rink_id || '');
  const [opposingTeam, setOpposingTeam] = useState(initial?.opposing_team || '');
  const [locationNote, setLocationNote] = useState(initial?.location_note || '');
  const [isOffIce, setIsOffIce] = useState(initial?.is_off_ice || false);
  const [practicePlanId, setPracticePlanId] = useState(initial?.practice_plan_id || '');
  const [rsvpRequired, setRsvpRequired] = useState(initial?.rsvp_required !== false);
  const [rsvpDeadline, setRsvpDeadline] = useState(isoToLocalInput(initial?.rsvp_deadline));
  const [maxAttendees, setMaxAttendees] = useState<number | ''>(initial?.max_attendees ?? '');
  const [costPerPlayer, setCostPerPlayer] = useState<number | ''>(initial?.cost_per_player ?? '');
  const [currency, setCurrency] = useState(initial?.currency || defaultCurrency);
  const [status, setStatus] = useState<'scheduled' | 'cancelled' | 'completed'>(initial?.status || 'scheduled');

  // Practice plans are only relevant when event_kind = practice
  const showPracticePlans = useMemo(() => eventKind === 'practice', [eventKind]);
  const showOpposingTeam = useMemo(() => eventKind === 'game' || eventKind === 'tournament', [eventKind]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: Record<string, unknown> = {
      event_kind: eventKind,
      title: title.trim(),
      description: description.trim() || null,
      starts_at: localInputToIso(startsAt),
      ends_at: localInputToIso(endsAt),
      arrival_minutes: arrivalMinutes,
      opposing_team: opposingTeam.trim() || null,
      location_note: locationNote.trim() || null,
      is_off_ice: isOffIce,
      practice_plan_id: practicePlanId || null,
      rsvp_required: rsvpRequired,
      max_attendees: maxAttendees === '' ? null : Number(maxAttendees),
      cost_per_player: costPerPlayer === '' ? null : Number(costPerPlayer),
      currency,
      status,
    };

    if (rsvpDeadline) body.rsvp_deadline = localInputToIso(rsvpDeadline);
    else body.rsvp_deadline = null;
    if (rinkId) body.rink_id = rinkId;

    try {
      const url = isEdit
        ? `/api/team/${teamSlug}/events/${initial?.id}`
        : `/api/team/${teamSlug}/events`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }

      const j = await res.json();
      startTransition(() => {
        router.push(`/dashboard/team/${teamSlug}/events/${j.id || initial?.id}`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  };

  const inputStyle = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    background: '#0D1117',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 14,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(200,16,46,0.1)',
          border: '1px solid rgba(200,16,46,0.4)',
          borderRadius: 8,
          color: '#C8102E',
          fontSize: 13,
        }} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Event kind</label>
          <select value={eventKind} onChange={(e) => setEventKind(e.target.value)} style={inputStyle}>
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as 'scheduled' | 'cancelled' | 'completed')} style={inputStyle}>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Tuesday night practice"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Description (optional)</label>
        <textarea
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What the team should know"
          style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Starts at</label>
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Ends at</label>
          <input
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Arrival (min before)</label>
          <input
            type="number"
            min={0}
            max={240}
            value={arrivalMinutes}
            onChange={(e) => setArrivalMinutes(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Max attendees</label>
          <input
            type="number"
            min={1}
            max={500}
            value={maxAttendees}
            onChange={(e) => setMaxAttendees(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="no limit"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>RSVP required?</label>
          <select
            value={rsvpRequired ? 'yes' : 'no'}
            onChange={(e) => setRsvpRequired(e.target.value === 'yes')}
            style={inputStyle}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      {rsvpRequired && (
        <div>
          <label style={labelStyle}>RSVP deadline (optional)</label>
          <input
            type="datetime-local"
            value={rsvpDeadline}
            onChange={(e) => setRsvpDeadline(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Rink</label>
          <select value={rinkId} onChange={(e) => setRinkId(e.target.value)} style={inputStyle}>
            <option value="">— None —</option>
            {rinks.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Location note (optional)</label>
          <input
            type="text"
            maxLength={500}
            value={locationNote}
            onChange={(e) => setLocationNote(e.target.value)}
            placeholder="e.g. North entrance, door 4"
            style={inputStyle}
          />
        </div>
      </div>

      {showOpposingTeam && (
        <div>
          <label style={labelStyle}>Opposing team</label>
          <input
            type="text"
            maxLength={200}
            value={opposingTeam}
            onChange={(e) => setOpposingTeam(e.target.value)}
            placeholder="e.g. Cebu Eagles Bantam"
            style={inputStyle}
          />
        </div>
      )}

      {showPracticePlans && (
        <div>
          <label style={labelStyle}>Practice plan (optional)</label>
          <select value={practicePlanId} onChange={(e) => setPracticePlanId(e.target.value)} style={inputStyle}>
            <option value="">— None —</option>
            {practicePlans.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {eventKind === 'practice' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
          <input
            type="checkbox"
            checked={isOffIce}
            onChange={(e) => setIsOffIce(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Off-ice (training, conditioning, classroom — not on the ice)
        </label>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Cost per player (optional)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={costPerPlayer}
            onChange={(e) => setCostPerPlayer(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <input
            type="text"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.65rem 1.25rem',
            background: '#FFB81C',
            color: '#0D1117',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            cursor: submitting ? 'wait' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          style={{
            padding: '0.65rem 1rem',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}