'use client';

/**
 * Live scorekeeper view.
 *
 * The main workhorse of the scoresheet app. Two big-tap team columns
 * (Home / Away), a large clock at top, a play-by-play event log, and
 * modals for entering detailed events (goal w/ assists, penalty, etc.).
 *
 * Mobile-first. Designed for one-handed use at a noisy rink.
 * High contrast, big tap targets (52-80px min-height).
 *
 * State machine:
 *   scheduled   →  startGame()  →  in_progress
 *   in_progress  →  pauseClock/resumeClock, advancePeriod, recordEvent
 *   in_progress  →  finalizeGame()  →  final
 *
 * The clock ticks locally every second (driven by clock_seconds + a
 * "started ticking at" timestamp). We don't write to the server every
 * tick — only when the user pauses / resumes / advances.
 *
 * Offline behavior: actions go through the online-actions wrapper,
 * which queues in IndexedDB when offline and flushes on reconnect.
 * The OfflineIndicator shows online/offline + queue depth.
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  startGame as startGameOnline,
  setClock as setClockOnline,
  setPeriod as setPeriodOnline,
  recordEvent as recordEventOnline,
  undoLastEvent as undoLastEventOnline,
  finalizeGame as finalizeGameOnline,
} from '@/lib/online-actions';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import type { GameMode, RosterPlayer, TeamRoster, EventType } from '@/types/scoresheet';

interface GameData {
  id: string;
  mode: GameMode;
  status: 'draft' | 'scheduled' | 'in_progress' | 'final';
  home_team_name: string;
  home_team_color: string | null;
  home_roster: TeamRoster | null;
  away_team_name: string;
  away_team_color: string | null;
  away_roster: TeamRoster | null;
  current_period: number;
  clock_seconds: number;
  clock_running: boolean;
  home_score: number;
  away_score: number;
  period_length_seconds: number;
  periods_total: number;
  overtime_length_seconds: number;
  shootout_enabled: boolean;
}

interface EventData {
  id: string;
  period: number;
  clock_seconds: number;
  sequence_number: number;
  team_side: 'home' | 'away';
  event_type: string;
  scorer_jersey: number | null;
  primary_assist_jersey: number | null;
  secondary_assist_jersey: number | null;
  goalie_jersey: number | null;
  strength: string | null;
  penalty_jersey: number | null;
  penalty_type: string | null;
  penalty_minutes: number | null;
  shooter_jersey: number | null;
  recorded_at: string;
}

interface Props {
  game: GameData;
  events: EventData[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  goal: 'Goal',
  assist_primary: 'Assist (1°)',
  assist_secondary: 'Assist (2°)',
  penalty: 'Penalty',
  penalty_killed: 'Penalty killed',
  save: 'Save',
  shot_on_goal: 'SOG',
  shot_missed: 'Missed shot',
  period_start: 'Period start',
  period_end: 'Period end',
  overtime_start: 'OT start',
  overtime_end: 'OT end',
  shootout_goal: 'SO Goal',
  shootout_miss: 'SO Miss',
  shootout_end: 'SO end',
  game_end: 'Game end',
  goalie_change: 'Goalie change',
};

const PENALTY_TYPES = [
  'tripping', 'hooking', 'slashing', 'high-sticking', 'roughing',
  'interference', 'holding', 'cross-checking', 'boarding', 'charging',
  'elbowing', 'kneeing', 'checking-from-behind', 'delay-of-game',
  'too-many-men', 'unsportsmanlike-conduct', 'misconduct',
  'game-misconduct', 'match-penalty',
];

const STRENGTHS = ['even', 'pp', 'sh'] as const;
const PENALTY_MINUTES = [2, 4, 5, 10] as const;

export function ScorekeeperView({ game, events }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Local clock state: ticks every second when running.
  const [tickSeconds, setTickSeconds] = useState(0);
  useEffect(() => {
    if (!game.clock_running) {
      setTickSeconds(0);
      return;
    }
    setTickSeconds(0); // reset on resume
    const id = setInterval(() => setTickSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [game.clock_running, game.current_period, game.clock_seconds]);

  const displayClock = game.clock_seconds + tickSeconds;
  const clockAtZero = displayClock <= 0;

  const homeLookup = useMemo(() => rosterLookup(game.home_roster), [game.home_roster]);
  const awayLookup = useMemo(() => rosterLookup(game.away_roster), [game.away_roster]);

  // Modal state: which side + event type is being recorded.
  const [eventModal, setEventModal] = useState<{
    team: 'home' | 'away';
    type: EventType;
  } | null>(null);

  // ─── Lifecycle actions ──────────────────────────────────────────────

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const r = await startGameOnline(game.id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function handleToggleClock() {
    setError(null);
    startTransition(async () => {
      const r = await setClockOnline(game.id, !game.clock_running);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function handleAdvancePeriod() {
    setError(null);
    const next = game.current_period + 1;
    startTransition(async () => {
      const r = await setPeriodOnline(game.id, next);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function handleUndo() {
    setError(null);
    startTransition(async () => {
      const r = await undoLastEventOnline(game.id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function handleFinalize() {
    if (!confirm('Finalize this game? You can still view the event log but cannot edit scores.')) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await finalizeGameOnline(game.id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  // ─── Event recording ───────────────────────────────────────────────

  function openEventModal(team: 'home' | 'away', type: EventType) {
    // If we're in live mode and the period is running, the server will
    // record the event at the current clock time. If the clock is paused,
    // the event is recorded at the current displayed time.
    setEventModal({ team, type });
  }

  function submitEvent(input: Parameters<typeof recordEventOnline>[1]) {
    if (!eventModal) return;
    setError(null);
    startTransition(async () => {
      const r = await recordEventOnline(game.id, input);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEventModal(null);
      router.refresh();
    });
  }

  // ─── Render ────────────────────────────────────────────────────────

  if (game.status === 'scheduled') {
    return (
      <>
        <OfflineIndicator gameId={game.id} />
        <PreStartView
          game={game}
          onStart={handleStart}
          isPending={isPending}
          error={error}
        />
      </>
    );
  }

  if (game.status === 'final') {
    return (
      <>
        <OfflineIndicator gameId={game.id} />
        <FinalView
          game={game}
          events={events}
          homeLookup={homeLookup}
          awayLookup={awayLookup}
        />
      </>
    );
  }

  return (
    <>
      <OfflineIndicator gameId={game.id} />
      <main
        style={{
          padding: '0.75rem 0.75rem 6rem',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        {/* Clock + period controls */}
        <section
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,184,28,0.25)',
            borderRadius: 14,
            padding: '1rem 1rem 0.75rem',
            marginBottom: '0.75rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#FFB81C',
              fontWeight: 700,
              margin: 0,
            }}
          >
            {periodLabel(game.current_period, game.periods_total)}
          </p>
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: '3.5rem',
              fontWeight: 800,
              color: '#fff',
              margin: '0.25rem 0',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {formatClock(displayClock)}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleToggleClock}
              disabled={isPending}
              className="rs-btn-primary"
              style={{
                minWidth: 120,
                background: game.clock_running ? '#C8102E' : '#FFB81C',
                borderColor: game.clock_running ? '#8B0A1F' : '#B45309',
              }}
            >
              {game.clock_running ? '⏸ Pause' : '▶ Start'}
            </button>
            <button
              type="button"
              onClick={handleAdvancePeriod}
              disabled={isPending}
              className="rs-btn-secondary"
            >
              End period →
            </button>
          </div>
        </section>

        {/* Score banner */}
        <section
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '0.875rem 1rem',
            marginBottom: '0.75rem',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <ScoreSide
            teamName={game.home_team_name}
            teamColor={game.home_team_color || '#FFB81C'}
            score={game.home_score}
            align="right"
          />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem' }}>vs</span>
          <ScoreSide
            teamName={game.away_team_name}
            teamColor={game.away_team_color || '#C8102E'}
            score={game.away_score}
            align="left"
          />
        </section>

        {/* Big-tap event buttons (live mode) */}
        {game.mode === 'live' && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <button
              type="button"
              className="rs-event-btn"
              onClick={() => openEventModal('home', 'goal')}
              style={{
                background: game.home_team_color || '#FFB81C',
                color: '#041E42',
                borderColor: '#B45309',
                minHeight: 88,
              }}
            >
              ⚫ {shortName(game.home_team_name)} Goal
            </button>
            <button
              type="button"
              className="rs-event-btn"
              onClick={() => openEventModal('away', 'goal')}
              style={{
                background: game.away_team_color || '#C8102E',
                color: '#fff',
                borderColor: '#8B0A1F',
                minHeight: 88,
              }}
            >
              ⚫ {shortName(game.away_team_name)} Goal
            </button>
            <button
              type="button"
              onClick={() => openEventModal('home', 'penalty')}
              style={{
                minHeight: 64,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              ⛳ {shortName(game.home_team_name)} Penalty
            </button>
            <button
              type="button"
              onClick={() => openEventModal('away', 'penalty')}
              style={{
                minHeight: 64,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              ⛳ {shortName(game.away_team_name)} Penalty
            </button>
            <button
              type="button"
              onClick={() => openEventModal('home', 'save')}
              style={{
                minHeight: 56,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              Save ({shortName(game.home_team_name)} goalie)
            </button>
            <button
              type="button"
              onClick={() => openEventModal('away', 'save')}
              style={{
                minHeight: 56,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              Save ({shortName(game.away_team_name)} goalie)
            </button>
          </section>
        )}

        {/* Watch mode: just home/away taps */}
        {game.mode === 'watch' && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <button
              type="button"
              className="rs-event-btn"
              onClick={() => openEventModal('home', 'goal')}
              style={{
                background: game.home_team_color || '#FFB81C',
                color: '#041E42',
                borderColor: '#B45309',
                minHeight: 120,
                fontSize: '1.5rem',
              }}
            >
              {shortName(game.home_team_name)}
              <br />
              GOAL
            </button>
            <button
              type="button"
              className="rs-event-btn"
              onClick={() => openEventModal('away', 'goal')}
              style={{
                background: game.away_team_color || '#C8102E',
                color: '#fff',
                borderColor: '#8B0A1F',
                minHeight: 120,
                fontSize: '1.5rem',
              }}
            >
              {shortName(game.away_team_name)}
              <br />
              GOAL
            </button>
          </section>
        )}

        {/* Action bar */}
        <section
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={handleUndo}
            disabled={isPending || events.length === 0}
            className="rs-btn-secondary"
            style={{ flex: 1 }}
          >
            ↶ Undo last
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={isPending}
            className="rs-btn-danger"
            style={{ flex: 1 }}
          >
            Finalize
          </button>
        </section>

        {error && (
          <div
            style={{
              background: 'rgba(200,16,46,0.15)',
              border: '1px solid rgba(200,16,46,0.45)',
              color: '#FCA5A5',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              fontSize: '0.875rem',
              marginBottom: '0.75rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Event log */}
        <section>
          <h2
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 700,
              margin: '1rem 0 0.5rem',
            }}
          >
            Play-by-play ({events.length})
          </h2>
          {events.length === 0 ? (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                padding: '2rem 1rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 10,
                margin: 0,
              }}
            >
              No events yet. Tap a button above to record the first one.
            </p>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem',
              }}
            >
              {events
                .slice()
                .reverse()
                .map((e) => (
                  <li
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.625rem 0.875rem',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                      fontSize: '0.875rem',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '0.6875rem',
                        color: 'rgba(255,255,255,0.5)',
                        minWidth: 56,
                      }}
                    >
                      P{e.period} {formatClock(e.clock_seconds)}
                    </span>
                    <span
                      style={{
                        color:
                          e.team_side === 'home'
                            ? game.home_team_color || '#FFB81C'
                            : game.away_team_color || '#C8102E',
                        fontWeight: 700,
                        minWidth: 28,
                        textAlign: 'center',
                      }}
                    >
                      {e.team_side === 'home' ? shortName(game.home_team_name) : shortName(game.away_team_name)}
                    </span>
                    <span style={{ flex: 1, color: '#fff' }}>
                      {describeEvent(e, e.team_side === 'home' ? homeLookup : awayLookup)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </main>

      {eventModal && (
        <EventModal
          team={eventModal.team}
          eventType={eventModal.type}
          teamName={eventModal.team === 'home' ? game.home_team_name : game.away_team_name}
          teamColor={eventModal.team === 'home' ? game.home_team_color : game.away_team_color}
          roster={eventModal.team === 'home' ? game.home_roster : game.away_roster}
          opposingGoalieJersey={
            (eventModal.team === 'home' ? game.away_roster : game.home_roster)?.find((p) => p.is_goalie)?.jersey_number ?? null
          }
          onSubmit={submitEvent}
          onClose={() => setEventModal(null)}
          isPending={isPending}
        />
      )}
    </>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────

function ScoreSide({
  teamName,
  teamColor,
  score,
  align,
}: {
  teamName: string;
  teamColor: string;
  score: number;
  align: 'left' | 'right';
}) {
  return (
    <div style={{ textAlign: align }}>
      <p style={{ color: teamColor, fontWeight: 700, fontSize: '0.9375rem', margin: 0, lineHeight: 1.2 }}>
        {teamName}
      </p>
      <p style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 800, margin: '0.125rem 0 0', lineHeight: 1 }}>
        {score}
      </p>
    </div>
  );
}

function PreStartView({
  game,
  onStart,
  isPending,
  error,
}: {
  game: GameData;
  onStart: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <main
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '2rem 1rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '0.6875rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#FFB81C',
          fontWeight: 700,
          margin: 0,
        }}
      >
        Ready to start
      </p>
      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#fff',
          margin: '0.75rem 0',
          lineHeight: 1.1,
        }}
      >
        <span style={{ color: game.home_team_color || '#FFB81C' }}>{game.home_team_name}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}> vs </span>
        <span style={{ color: game.away_team_color || '#C8102E' }}>{game.away_team_name}</span>
      </h1>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.6)',
          margin: '0 0 1.5rem',
        }}
      >
        {game.mode === 'live'
          ? `Period length: ${Math.round(game.period_length_seconds / 60)} min · ${game.periods_total} periods`
          : 'Watch mode — just tap a goal as it happens.'}
      </p>
      {error && (
        <div
          style={{
            background: 'rgba(200,16,46,0.15)',
            border: '1px solid rgba(200,16,46,0.45)',
            color: '#FCA5A5',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={isPending}
        className="rs-btn-primary"
        style={{ minWidth: 200, fontSize: '1.0625rem' }}
      >
        {isPending ? 'Starting...' : '▶ Start game'}
      </button>
    </main>
  );
}

function FinalView({
  game,
  events,
  homeLookup,
  awayLookup,
}: {
  game: GameData;
  events: EventData[];
  homeLookup: Record<number, RosterPlayer>;
  awayLookup: Record<number, RosterPlayer>;
}) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '1rem',
      }}
    >
      <section
        style={{
          background: 'linear-gradient(180deg, rgba(255,184,28,0.08) 0%, rgba(15,23,42,0.5) 100%)',
          border: '1px solid rgba(255,184,28,0.25)',
          borderRadius: 14,
          padding: '1.5rem 1.25rem',
          marginBottom: '1rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
            margin: '0 0 0.75rem',
          }}
        >
          Final
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: game.home_team_color || '#FFB81C', fontWeight: 700, fontSize: '1.125rem', margin: 0, lineHeight: 1.2 }}>
              {game.home_team_name}
            </p>
            <p style={{ color: '#fff', fontSize: '3rem', fontWeight: 800, margin: '0.25rem 0 0', lineHeight: 1 }}>
              {game.home_score}
            </p>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.5rem' }}>vs</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: game.away_team_color || '#C8102E', fontWeight: 700, fontSize: '1.125rem', margin: 0, lineHeight: 1.2 }}>
              {game.away_team_name}
            </p>
            <p style={{ color: '#fff', fontSize: '3rem', fontWeight: 800, margin: '0.25rem 0 0', lineHeight: 1 }}>
              {game.away_score}
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <a
          href={`/api/scoresheet/${game.id}/pdf`}
          download
          className="rs-btn-primary"
          style={{ flex: 1, textDecoration: 'none' }}
        >
          📄 Download PDF
        </a>
        <a
          href="/scoresheet"
          className="rs-btn-secondary"
          style={{ flex: 1, textDecoration: 'none' }}
        >
          ← Dashboard
        </a>
      </div>

      <p
        style={{
          fontSize: '0.6875rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 700,
          margin: '0 0 0.5rem',
        }}
      >
        Play-by-play ({events.length})
      </p>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
        }}
      >
        {events.map((e) => (
          <li
            key={e.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.625rem 0.875rem',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              fontSize: '0.875rem',
            }}
          >
            <span
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.6875rem',
                color: 'rgba(255,255,255,0.5)',
                minWidth: 56,
              }}
            >
              P{e.period} {formatClock(e.clock_seconds)}
            </span>
            <span style={{ flex: 1, color: '#fff' }}>
              {describeEvent(e, e.team_side === 'home' ? homeLookup : awayLookup)}
            </span>
          </li>
        ))}
      </ul>
      <p
        style={{
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
          margin: '2rem 0',
        }}
      >
        RinkStop integration ships in Phase B.
      </p>
    </main>
  );
}

function EventModal({
  team,
  eventType,
  teamName,
  teamColor,
  roster,
  opposingGoalieJersey,
  onSubmit,
  onClose,
  isPending,
}: {
  team: 'home' | 'away';
  eventType: EventType;
  teamName: string;
  teamColor: string | null;
  roster: TeamRoster | null;
  opposingGoalieJersey: number | null;
  onSubmit: (input: Parameters<typeof recordEventOnline>[1]) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [scorerJersey, setScorerJersey] = useState<string>('');
  const [assist1Jersey, setAssist1Jersey] = useState<string>('');
  const [assist2Jersey, setAssist2Jersey] = useState<string>('');
  const [goalieJersey, setGoalieJersey] = useState<string>(
    opposingGoalieJersey != null ? String(opposingGoalieJersey) : ''
  );
  const [strength, setStrength] = useState<string>('even');
  const [penaltyJersey, setPenaltyJersey] = useState<string>('');
  const [penaltyType, setPenaltyType] = useState<string>('tripping');
  const [penaltyMinutes, setPenaltyMinutes] = useState<string>('2');

  const rosterList = roster || [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const base = {
      team_side: team,
      event_type: eventType,
    };
    if (eventType === 'goal' || eventType === 'shootout_goal') {
      onSubmit({
        ...base,
        scorer_jersey: parseInt(scorerJersey, 10) || null,
        primary_assist_jersey: parseInt(assist1Jersey, 10) || null,
        secondary_assist_jersey: parseInt(assist2Jersey, 10) || null,
        goalie_jersey: parseInt(goalieJersey, 10) || null,
        strength,
      });
    } else if (eventType === 'penalty') {
      onSubmit({
        ...base,
        penalty_jersey: parseInt(penaltyJersey, 10) || null,
        penalty_type: penaltyType,
        penalty_minutes: parseInt(penaltyMinutes, 10) || 2,
      });
    } else if (eventType === 'save') {
      onSubmit({
        ...base,
        goalie_jersey: parseInt(goalieJersey, 10) || null,
      });
    } else {
      onSubmit(base);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(15,23,42,0.98)',
          border: `1px solid ${teamColor || '#FFB81C'}`,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: '1.25rem 1rem 1.5rem',
          width: '100%',
          maxWidth: 600,
          maxHeight: '85dvh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: teamColor || '#FFB81C',
              margin: 0,
            }}
          >
            {teamName} · {EVENT_TYPE_LABELS[eventType] || eventType}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 0.5rem',
            }}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(eventType === 'goal' || eventType === 'shootout_goal') && (
            <>
              <JerseySelect
                label="Scorer"
                value={scorerJersey}
                onChange={setScorerJersey}
                roster={rosterList}
                required
              />
              <JerseySelect
                label="Primary assist"
                value={assist1Jersey}
                onChange={setAssist1Jersey}
                roster={rosterList}
                required={false}
              />
              <JerseySelect
                label="Secondary assist"
                value={assist2Jersey}
                onChange={setAssist2Jersey}
                roster={rosterList}
                required={false}
              />
              {opposingGoalieJersey != null && (
                <div>
                  <label className="rs-label">Opposing goalie (auto: #{opposingGoalieJersey})</label>
                  <JerseySelect
                    label=""
                    value={goalieJersey}
                    onChange={setGoalieJersey}
                    roster={[]}
                    required={false}
                    inline
                  />
                </div>
              )}
              <div>
                <label className="rs-label">Strength</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {STRENGTHS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStrength(s)}
                      style={{
                        flex: 1,
                        padding: '0.625rem',
                        background: strength === s ? '#FFB81C' : 'rgba(255,255,255,0.06)',
                        color: strength === s ? '#041E42' : '#fff',
                        border: '1px solid ' + (strength === s ? '#B45309' : 'rgba(255,255,255,0.12)'),
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      {s === 'even' ? 'Even' : s === 'pp' ? 'PP' : 'SH'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {eventType === 'penalty' && (
            <>
              <JerseySelect
                label="Player"
                value={penaltyJersey}
                onChange={setPenaltyJersey}
                roster={rosterList}
                required
              />
              <div>
                <label className="rs-label">Infraction</label>
                <select
                  className="rs-input"
                  value={penaltyType}
                  onChange={(e) => setPenaltyType(e.target.value)}
                >
                  {PENALTY_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {p.replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="rs-label">Minutes</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {PENALTY_MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPenaltyMinutes(String(m))}
                      style={{
                        flex: 1,
                        padding: '0.625rem',
                        background: parseInt(penaltyMinutes, 10) === m ? '#FFB81C' : 'rgba(255,255,255,0.06)',
                        color: parseInt(penaltyMinutes, 10) === m ? '#041E42' : '#fff',
                        border: '1px solid ' + (parseInt(penaltyMinutes, 10) === m ? '#B45309' : 'rgba(255,255,255,0.12)'),
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {eventType === 'save' && (
            <JerseySelect
              label="Goalie"
              value={goalieJersey}
              onChange={setGoalieJersey}
              roster={rosterList.filter((p) => p.is_goalie)}
              required
            />
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="rs-btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rs-btn-primary"
              style={{ flex: 2 }}
            >
              {isPending ? 'Saving...' : `Record ${EVENT_TYPE_LABELS[eventType] || eventType}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JerseySelect({
  label,
  value,
  onChange,
  roster,
  required,
  inline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  roster: RosterPlayer[];
  required?: boolean;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <input
        type="number"
        min="0"
        max="99"
        className="rs-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#"
        required={required}
        style={{ marginTop: '0.25rem' }}
      />
    );
  }
  return (
    <div>
      {label && <label className="rs-label">{label}</label>}
      <select
        className="rs-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">—</option>
        {roster.map((p) => (
          <option key={p.jersey_number} value={String(p.jersey_number)}>
            #{p.jersey_number} {p.name} ({p.position})
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function rosterLookup(roster: TeamRoster | null): Record<number, RosterPlayer> {
  const map: Record<number, RosterPlayer> = {};
  for (const p of roster || []) map[p.jersey_number] = p;
  return map;
}

function formatClock(s: number): string {
  const sign = s < 0 ? '-' : '';
  const abs = Math.abs(s);
  const min = Math.floor(abs / 60);
  const sec = abs % 60;
  return `${sign}${min}:${sec.toString().padStart(2, '0')}`;
}

function shortName(name: string): string {
  return name.length > 12 ? name.slice(0, 11) + '…' : name;
}

function periodLabel(period: number, periodsTotal: number): string {
  if (period <= periodsTotal) return `Period ${period} of ${periodsTotal}`;
  if (period === periodsTotal + 1) return 'Overtime';
  if (period === periodsTotal + 2) return 'Shootout';
  return `Period ${period}`;
}

function describeEvent(e: EventData, lookup: Record<number, RosterPlayer>): string {
  const jersey = (n: number | null) => (n != null ? lookup[n]?.name || `#${n}` : '—');
  switch (e.event_type) {
    case 'goal':
    case 'shootout_goal': {
      const scorer = jersey(e.scorer_jersey);
      const a1 = e.primary_assist_jersey ? `(${jersey(e.primary_assist_jersey)})` : '';
      const a2 = e.secondary_assist_jersey ? `(${jersey(e.secondary_assist_jersey)})` : '';
      const assists = [a1, a2].filter(Boolean).join(', ');
      const strength = e.strength && e.strength !== 'even' ? ` · ${e.strength.toUpperCase()}` : '';
      return `Goal — ${scorer}${assists ? ` ${assists}` : ''}${strength}`;
    }
    case 'penalty':
      return `Penalty — ${jersey(e.penalty_jersey)} · ${e.penalty_type?.replace(/-/g, ' ')} ${e.penalty_minutes}min`;
    case 'save':
      return `Save — ${jersey(e.goalie_jersey)}`;
    case 'shot_on_goal':
      return `SOG — ${jersey(e.shooter_jersey)}`;
    case 'shot_missed':
      return `Missed shot — ${jersey(e.shooter_jersey)}`;
    case 'period_start':
      return `Period ${e.period} starts`;
    case 'period_end':
      return `Period ${e.period} ends`;
    case 'overtime_start':
      return `Overtime starts`;
    case 'overtime_end':
      return `Overtime ends`;
    case 'shootout_miss':
      return `Shootout miss — ${jersey(e.scorer_jersey)}`;
    case 'shootout_end':
      return `Shootout ends`;
    case 'game_end':
      return `Game ends`;
    case 'goalie_change':
      return `Goalie change — ${jersey(e.goalie_jersey)} in`;
    default:
      return EVENT_TYPE_LABELS[e.event_type] || e.event_type;
  }
}
