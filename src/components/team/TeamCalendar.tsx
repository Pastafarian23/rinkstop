'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { teamColor, teamShortLabel } from '@/lib/team-color';

export interface CalendarEvent {
  id: string;
  team_id: string;
  team_name: string;
  team_short_name?: string | null;
  team_slug: string;
  event_kind: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location_note?: string | null;
  opposing_team?: string | null;
  is_off_ice?: boolean;
  status: string;
}

export interface CalendarTeam {
  id: string;
  name: string;
  short_name?: string | null;
  slug: string;
}

interface TeamCalendarProps {
  events: CalendarEvent[];
  teams: CalendarTeam[];
  /** Initial view (from URL searchParams). Defaults to month. */
  initialView?: 'month' | 'week' | 'day' | 'agenda';
  /** Initial date ISO (YYYY-MM-DD). Defaults to today. */
  initialDate?: string;
  /** Initial kind filter. */
  initialKind?: string;
  /** Initial team filter ('all' or team id). */
  initialTeam?: string;
  /** Readonly mode - hides action buttons and navigation. */
  readonly?: boolean;
}

const KIND_EMOJI: Record<string, string> = {
  practice: '🏒',
  game: '🏆',
  tournament: '🥇',
  tryout: '🔍',
  meeting: '📋',
  team_event: '🧢',
};

const KIND_LABEL: Record<string, string> = {
  practice: 'Practice',
  game: 'Game',
  tournament: 'Tournament',
  tryout: 'Tryout',
  meeting: 'Meeting',
  team_event: 'Team event',
};

const ALL_KINDS = Object.keys(KIND_LABEL);

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}
function endOfWeek(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - d.getDay()));
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtMonthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function fmtWeekLabel(d: Date): string {
  const end = endOfWeek(d);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
function pad(n: number): string { return String(n).padStart(2, '0'); }
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TeamCalendar({
  events,
  teams,
  initialView = 'month',
  initialDate,
  initialKind = '',
  initialTeam = 'all',
  readonly = false,
}: TeamCalendarProps) {
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>(initialView);
  const [cursor, setCursor] = useState<Date>(() => {
    if (initialDate) {
      const [y, m, d] = initialDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [kindFilter, setKindFilter] = useState<string>(initialKind);
  const [teamFilter, setTeamFilter] = useState<string>(initialTeam);

  // Build team lookup
  const teamById = useMemo(() => {
    const m = new Map<string, CalendarTeam>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  // Apply filters
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (kindFilter && e.event_kind !== kindFilter) return false;
      if (teamFilter !== 'all' && e.team_id !== teamFilter) return false;
      return true;
    });
  }, [events, kindFilter, teamFilter]);

  function gotoPrev() {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    else if (view === 'week') setCursor(addDays(cursor, -7));
    else if (view === 'day') setCursor(addDays(cursor, -1));
    else setCursor(addDays(cursor, -30));
  }
  function gotoNext() {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    else if (view === 'week') setCursor(addDays(cursor, 7));
    else if (view === 'day') setCursor(addDays(cursor, 1));
    else setCursor(addDays(cursor, 30));
  }
  function gotoToday() {
    setCursor(new Date());
  }

  function headerLabel(): string {
    if (view === 'month') return fmtMonthLabel(cursor);
    if (view === 'week') return fmtWeekLabel(startOfWeek(cursor));
    if (view === 'day') return fmtDateLabel(cursor);
    return `${fmtMonthLabel(cursor)} (agenda)`;
  }

  return (
    <div className="cal-root" style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem' }}>
      {/* Print header — CSS @media print uses content + attr() to render */}
      <div data-print-header data-print-date={new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} style={{ display: 'none' }} aria-hidden="true" />
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <NavButton onClick={gotoPrev} label="← Previous" />
          <NavButton onClick={gotoToday} label="Today" primary />
          <NavButton onClick={gotoNext} label="Next →" />
        </div>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em', margin: 0, textAlign: 'center', flex: 1, minWidth: 200 }}>
          {headerLabel()}
        </h2>
        <div style={{ display: 'flex', gap: 4, background: '#0D1117', padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
          {(['month', 'week', 'day', 'agenda'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                padding: '0.4rem 0.85rem',
                background: view === v ? '#FFB81C' : 'transparent',
                color: view === v ? '#0D1117' : 'rgba(255,255,255,0.7)',
                border: 'none',
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '1rem', padding: '0.75rem 1rem', background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={filterLabelStyle}>Team</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <FilterChip active={teamFilter === 'all'} onClick={() => setTeamFilter('all')} label="All teams" />
            {teams.map((t) => {
              const c = teamColor(t.id);
              return (
                <FilterChip
                  key={t.id}
                  active={teamFilter === t.id}
                  onClick={() => setTeamFilter(t.id)}
                  label={teamShortLabel(t)}
                  dotColor={c.color}
                />
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={filterLabelStyle}>Kind</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <FilterChip active={kindFilter === ''} onClick={() => setKindFilter('')} label="All" />
            {ALL_KINDS.map((k) => (
              <FilterChip
                key={k}
                active={kindFilter === k}
                onClick={() => setKindFilter(k)}
                label={KIND_LABEL[k]}
                emoji={KIND_EMOJI[k]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Calendar grid — month view gets data-calendar-month so print can hide it */}
      {view === 'month' && (
        <MonthView cursor={cursor} events={filtered} teamById={teamById} teamFilter={teamFilter} />
      )}
      {view === 'week' && (
        <WeekView cursor={cursor} events={filtered} teamById={teamById} />
      )}
      {view === 'day' && (
        <DayView cursor={cursor} events={filtered} teamById={teamById} />
      )}
      {view === 'agenda' && (
        <div data-calendar-agenda>
          <AgendaView cursor={cursor} events={filtered} teamById={teamById} />
        </div>
      )}

      {/* Mobile fallback agenda — always rendered, hidden on desktop via CSS,
          shown via @media (max-width: 768px) as a guaranteed-usable list view.
          Same data + filters as the user-selected view. */}
      <div data-calendar-agenda-fallback style={{ display: 'none' }}>
        <AgendaView cursor={cursor} events={filtered} teamById={teamById} />
      </div>

      {/* Legend */}
      {teams.length > 1 && (
        <div style={{ marginTop: 16, padding: '0.75rem 1rem', background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          <div style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Team legend</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {teams.map((t) => {
              const c = teamColor(t.id);
              return (
                <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} aria-hidden="true" />
                  <span style={{ color: '#fff' }}>{t.name}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== View components ===================== */

function MonthView({
  cursor,
  events,
  teamById,
  teamFilter,
}: {
  cursor: Date;
  events: CalendarEvent[];
  teamById: Map<string, CalendarTeam>;
  teamFilter: string;
}) {
  // Build 6-week grid (42 cells) starting from startOfWeek(startOfMonth(cursor))
  const start = startOfWeek(startOfMonth(cursor));
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));

  const today = new Date();

  return (
    <div data-calendar-month style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <div key={d} style={{ padding: '0.5rem 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {d}
        </div>
      ))}
      {cells.map((cell) => {
        const isCurrentMonth = cell.getMonth() === cursor.getMonth();
        const isToday = isSameDay(cell, today);
        const dayEvents = events.filter((e) => isSameDay(new Date(e.starts_at), cell));
        return (
          <div
            key={cell.toISOString()}
            style={{
              minHeight: 96,
              padding: 6,
              background: isCurrentMonth ? '#0D1117' : 'rgba(13,17,23,0.4)',
              border: `1px solid ${isToday ? '#FFB81C' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 6,
              opacity: isCurrentMonth ? 1 : 0.55,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#FFB81C' : 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              {cell.getDate()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {dayEvents.slice(0, 3).map((e) => {
                const c = teamColor(e.team_id);
                const team = teamById.get(e.team_id);
                const title = `${team?.name ?? 'Team'} — ${KIND_LABEL[e.event_kind] || e.event_kind}: ${e.title}`;
                return (
                  <div
                    key={e.id}
                    title={title}
                    style={{
                      display: 'block',
                      padding: '2px 6px',
                      background: c.bg,
                      borderLeft: `3px solid ${c.color}`,
                      borderRadius: 3,
                      fontSize: 10,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {teamShortLabel(team || { slug: e.team_slug, name: e.team_name })} {KIND_EMOJI[e.event_kind] || ''}
                  </div>
                );
              })}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', paddingLeft: 4 }}>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ cursor, events, teamById, readonly = false }: { cursor: Date; events: CalendarEvent[]; teamById: Map<string, CalendarTeam>; readonly?: boolean }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <div className="cal-week" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
      {days.map((d) => {
        const isToday = isSameDay(d, today);
        const dayEvents = events.filter((e) => isSameDay(new Date(e.starts_at), d)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        return (
          <div key={d.toISOString()} style={{ minHeight: 320, padding: 8, background: '#0D1117', border: `1px solid ${isToday ? '#FFB81C' : 'rgba(255,255,255,0.06)'}`, borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#FFB81C' : 'rgba(255,255,255,0.7)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })} {d.getDate()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayEvents.map((e) => <EventBlock key={e.id} event={e} team={teamById.get(e.team_id)} compact readonly={readonly} />)}
              {dayEvents.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No events</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ cursor, events, teamById }: { cursor: Date; events: CalendarEvent[]; teamById: Map<string, CalendarTeam> }) {
  const today = new Date();
  const isToday = isSameDay(cursor, today);
  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.starts_at), cursor))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return (
    <div style={{ padding: '1rem', background: '#0D1117', border: `1px solid ${isToday ? '#FFB81C' : 'rgba(255,255,255,0.06)'}`, borderRadius: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#FFB81C' : 'rgba(255,255,255,0.7)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dayEvents.map((e) => <EventBlock key={e.id} event={e} team={teamById.get(e.team_id)} />)}
        {dayEvents.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No events scheduled for this day.</div>}
      </div>
    </div>
  );
}

function AgendaView({ cursor, events, teamById }: { cursor: Date; events: CalendarEvent[]; teamById: Map<string, CalendarTeam> }) {
  // Show events from cursor through cursor+60 days, sorted ascending
  const end = addDays(cursor, 60);
  const upcoming = events
    .filter((e) => {
      const start = new Date(e.starts_at);
      return start >= cursor && start <= end;
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Group by date
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of upcoming) {
    const key = isoDate(new Date(e.starts_at));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  if (upcoming.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: '#0D1117', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)' }}>
        No events in the next 60 days.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from(groups.entries()).map(([dateKey, dayEvents]) => {
        const d = new Date(dateKey + 'T00:00:00');
        return (
          <div key={dateKey}>
            <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', margin: '0 0 8px', textTransform: 'uppercase' }}>
              {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayEvents.map((e) => <EventBlock key={e.id} event={e} team={teamById.get(e.team_id)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventBlock({ event, team, compact = false, readonly = false }: { event: CalendarEvent; team?: CalendarTeam | undefined; compact?: boolean; readonly?: boolean }) {
  const c = teamColor(event.team_id);
  const teamLabel = team ? teamShortLabel(team) : (event.team_short_name || event.team_name);
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  // In readonly mode, render as div instead of Link
  if (readonly) {
    return (
      <div
        style={{
          display: 'block',
          padding: compact ? '0.4rem 0.6rem' : '0.7rem 0.9rem',
          background: c.bg,
          borderLeft: `3px solid ${c.color}`,
          borderRadius: 4,
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: c.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
          <span>{KIND_EMOJI[event.event_kind] || '📅'}</span>
          <span>{teamLabel}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.65)' }}>{KIND_LABEL[event.event_kind] || event.event_kind}</span>
        </div>
        <div style={{ fontSize: compact ? 12 : 13, fontWeight: 600, marginBottom: 2, color: '#fff' }}>
          {event.title}
        </div>
        {!compact && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
            {fmt(start)} → {fmt(end)}
            {event.location_note ? ` · 📍 ${event.location_note}` : ''}
            {event.opposing_team ? ` · vs ${event.opposing_team}` : ''}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <Link
      href={`/dashboard/team/${event.team_slug}/events/${event.id}`}
      style={{
        display: 'block',
        padding: compact ? '0.4rem 0.6rem' : '0.7rem 0.9rem',
        background: c.bg,
        borderLeft: `3px solid ${c.color}`,
        borderRadius: 4,
        textDecoration: 'none',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: c.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
        <span>{KIND_EMOJI[event.event_kind] || '📅'}</span>
        <span>{teamLabel}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.65)' }}>{KIND_LABEL[event.event_kind] || event.event_kind}</span>
      </div>
      <div style={{ fontSize: compact ? 12 : 13, fontWeight: 600, marginBottom: 2, color: '#fff' }}>
        {event.title}
      </div>
      {!compact && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          {fmt(start)} → {fmt(end)}
          {event.location_note ? ` · 📍 ${event.location_note}` : ''}
          {event.opposing_team ? ` · vs ${event.opposing_team}` : ''}
        </div>
      )}
    </Link>
  );
}

/* ===================== Small UI bits ===================== */

function NavButton({ onClick, label, primary = false }: { onClick: () => void; label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.45rem 0.85rem',
        background: primary ? '#FFB81C' : 'transparent',
        color: primary ? '#0D1117' : 'rgba(255,255,255,0.85)',
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function FilterChip({ active, onClick, label, emoji, dotColor }: { active: boolean; onClick: () => void; label: string; emoji?: string; dotColor?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0.3rem 0.7rem',
        background: active ? 'rgba(255,184,28,0.18)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid #FFB81C' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: active ? '#FFB81C' : 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
      }}
    >
      {dotColor && (
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} aria-hidden="true" />
      )}
      {emoji && <span aria-hidden="true">{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}

const filterLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};