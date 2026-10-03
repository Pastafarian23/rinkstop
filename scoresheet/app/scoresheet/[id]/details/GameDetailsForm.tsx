'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateGameDetailsAction } from '@/app/actions/games-detail';

interface Initial {
  venue_name: string | null;
  rink_id: string | null;
  rink_name: string | null;
  sheet_label: string | null;
  home_coach_name: string | null;
  home_coach_rinkstop_id: string | null;
  away_coach_name: string | null;
  away_coach_rinkstop_id: string | null;
  home_team_rinkstop_id: string | null;
  home_team_rinkstop_name: string | null;
  away_team_rinkstop_id: string | null;
  away_team_rinkstop_name: string | null;
}

interface Props {
  gameId: string;
  initial: Initial;
}

interface RinkOption {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  province_state: string | null;
}
interface CoachOption {
  id: string;
  display_name: string;
  username: string | null;
}
interface TeamOption {
  id: string;
  name: string;
  short_name: string | null;
  home_city: string | null;
  home_country: string | null;
  age_label: string | null;
  level: string | null;
}

export function GameDetailsForm({ gameId, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [venueName, setVenueName] = useState(initial.venue_name || '');
  const [rinkId, setRinkId] = useState<string | null>(initial.rink_id);
  const [rinkName, setRinkName] = useState<string>(initial.rink_name || '');
  const [rinkQuery, setRinkQuery] = useState('');
  const [rinkOptions, setRinkOptions] = useState<RinkOption[]>([]);
  const [showRinkDropdown, setShowRinkDropdown] = useState(false);

  const [sheetLabel, setSheetLabel] = useState(initial.sheet_label || '');

  const [homeCoachName, setHomeCoachName] = useState(initial.home_coach_name || '');
  const [homeCoachId, setHomeCoachId] = useState<string | null>(initial.home_coach_rinkstop_id);
  const [homeCoachQuery, setHomeCoachQuery] = useState('');
  const [homeCoachOptions, setHomeCoachOptions] = useState<CoachOption[]>([]);

  const [awayCoachName, setAwayCoachName] = useState(initial.away_coach_name || '');
  const [awayCoachId, setAwayCoachId] = useState<string | null>(initial.away_coach_rinkstop_id);
  const [awayCoachQuery, setAwayCoachQuery] = useState('');
  const [awayCoachOptions, setAwayCoachOptions] = useState<CoachOption[]>([]);

  const [homeTeamId, setHomeTeamId] = useState<string | null>(initial.home_team_rinkstop_id);
  const [homeTeamName, setHomeTeamName] = useState<string>(initial.home_team_rinkstop_name || '');
  const [homeTeamQuery, setHomeTeamQuery] = useState('');
  const [homeTeamOptions, setHomeTeamOptions] = useState<TeamOption[]>([]);

  const [awayTeamId, setAwayTeamId] = useState<string | null>(initial.away_team_rinkstop_id);
  const [awayTeamName, setAwayTeamName] = useState<string>(initial.away_team_rinkstop_name || '');
  const [awayTeamQuery, setAwayTeamQuery] = useState('');
  const [awayTeamOptions, setAwayTeamOptions] = useState<TeamOption[]>([]);

  // Debounced rink search.
  const rinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (rinkTimerRef.current) clearTimeout(rinkTimerRef.current);
    if (rinkQuery.trim().length < 2) {
      setRinkOptions([]);
      return;
    }
    rinkTimerRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/scoresheet/rinks?q=${encodeURIComponent(rinkQuery.trim())}`);
        const json = await resp.json();
        setRinkOptions(json.results || []);
      } catch {
        // ignore
      }
    }, 200);
  }, [rinkQuery]);

  // Debounced coach search.
  useEffect(() => {
    if (homeCoachQuery.trim().length < 2) {
      setHomeCoachOptions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/scoresheet/coaches?q=${encodeURIComponent(homeCoachQuery.trim())}`);
        const json = await resp.json();
        setHomeCoachOptions(json.results || []);
      } catch {
        // ignore
      }
    }, 200);
    return () => clearTimeout(id);
  }, [homeCoachQuery]);

  useEffect(() => {
    if (awayCoachQuery.trim().length < 2) {
      setAwayCoachOptions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/scoresheet/coaches?q=${encodeURIComponent(awayCoachQuery.trim())}`);
        const json = await resp.json();
        setAwayCoachOptions(json.results || []);
      } catch {
        // ignore
      }
    }, 200);
    return () => clearTimeout(id);
  }, [awayCoachQuery]);

  useEffect(() => {
    if (homeTeamQuery.trim().length < 2) {
      setHomeTeamOptions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/scoresheet/teams?q=${encodeURIComponent(homeTeamQuery.trim())}`);
        const json = await resp.json();
        setHomeTeamOptions(json.results || []);
      } catch {
        // ignore
      }
    }, 200);
    return () => clearTimeout(id);
  }, [homeTeamQuery]);

  useEffect(() => {
    if (awayTeamQuery.trim().length < 2) {
      setAwayTeamOptions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/scoresheet/teams?q=${encodeURIComponent(awayTeamQuery.trim())}`);
        const json = await resp.json();
        setAwayTeamOptions(json.results || []);
      } catch {
        // ignore
      }
    }, 200);
    return () => clearTimeout(id);
  }, [awayTeamQuery]);

  function pickRink(r: RinkOption) {
    setRinkId(r.id);
    setRinkName(r.name);
    if (!venueName) setVenueName(r.name);
    setRinkQuery('');
    setRinkOptions([]);
    setShowRinkDropdown(false);
  }

  function pickHomeCoach(c: CoachOption) {
    setHomeCoachName(c.display_name);
    setHomeCoachId(c.id);
    setHomeCoachQuery('');
    setHomeCoachOptions([]);
  }
  function pickAwayCoach(c: CoachOption) {
    setAwayCoachName(c.display_name);
    setAwayCoachId(c.id);
    setAwayCoachQuery('');
    setAwayCoachOptions([]);
  }

  function clearHomeCoach() {
    setHomeCoachName('');
    setHomeCoachId(null);
    setHomeCoachQuery('');
    setHomeCoachOptions([]);
  }
  function clearAwayCoach() {
    setAwayCoachName('');
    setAwayCoachId(null);
    setAwayCoachQuery('');
    setAwayCoachOptions([]);
  }
  function clearRink() {
    setRinkId(null);
    setRinkName('');
    setRinkQuery('');
    setRinkOptions([]);
  }
  function pickHomeTeam(t: TeamOption) {
    setHomeTeamId(t.id);
    setHomeTeamName(t.name);
    setHomeTeamQuery('');
    setHomeTeamOptions([]);
  }
  function pickAwayTeam(t: TeamOption) {
    setAwayTeamId(t.id);
    setAwayTeamName(t.name);
    setAwayTeamQuery('');
    setAwayTeamOptions([]);
  }
  function clearHomeTeam() {
    setHomeTeamId(null);
    setHomeTeamName('');
    setHomeTeamQuery('');
    setHomeTeamOptions([]);
  }
  function clearAwayTeam() {
    setAwayTeamId(null);
    setAwayTeamName('');
    setAwayTeamQuery('');
    setAwayTeamOptions([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateGameDetailsAction(gameId, {
        venue_name: venueName.trim() || null,
        rink_id: rinkId,
        sheet_label: sheetLabel.trim() || null,
        home_coach_name: homeCoachName.trim() || null,
        home_coach_rinkstop_id: homeCoachId,
        away_coach_name: awayCoachName.trim() || null,
        away_coach_rinkstop_id: awayCoachId,
        home_team_rinkstop_id: homeTeamId,
        away_team_rinkstop_id: awayTeamId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/scoresheet/${gameId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Team links (B1 prerequisite) */}
      <TeamAutocomplete
        label="Home team (rinkstop link)"
        side="home"
        value={homeTeamName}
        linkedId={homeTeamId}
        query={homeTeamQuery}
        setQuery={setHomeTeamQuery}
        options={homeTeamOptions}
        onPick={pickHomeTeam}
        onClear={clearHomeTeam}
      />
      <TeamAutocomplete
        label="Away team (rinkstop link)"
        side="away"
        value={awayTeamName}
        linkedId={awayTeamId}
        query={awayTeamQuery}
        setQuery={setAwayTeamQuery}
        options={awayTeamOptions}
        onPick={pickAwayTeam}
        onClear={clearAwayTeam}
      />
      {/* Rink */}
      <div style={{ position: 'relative' }}>
        <label className="rs-label">Rink</label>
        {rinkId && rinkName ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255,184,28,0.08)',
              border: '1px solid rgba(255,184,28,0.3)',
              borderRadius: 8,
            }}
          >
            <span style={{ flex: 1, color: '#fff', fontWeight: 600 }}>{rinkName}</span>
            <button
              type="button"
              onClick={clearRink}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '1.125rem',
                cursor: 'pointer',
                padding: '0 0.25rem',
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              className="rs-input"
              value={rinkQuery}
              onChange={(e) => {
                setRinkQuery(e.target.value);
                setShowRinkDropdown(true);
              }}
              onFocus={() => setShowRinkDropdown(true)}
              placeholder="Search rinks (e.g. Scotiabank Arena)"
              autoComplete="off"
            />
            {showRinkDropdown && rinkOptions.length > 0 && (
              <ul
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'rgba(15,23,42,0.98)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  margin: '0.25rem 0 0',
                  padding: '0.25rem 0',
                  listStyle: 'none',
                  zIndex: 20,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {rinkOptions.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pickRink(r)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        padding: '0.625rem 0.875rem',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {(r.city || r.country) && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                          {[r.city, r.province_state, r.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
          Linked to rinkstop.com so the same rink appears across all games.
        </p>
      </div>

      {/* Sheet */}
      <div>
        <label className="rs-label">Sheet / Rink within venue</label>
        <input
          type="text"
          className="rs-input"
          value={sheetLabel}
          onChange={(e) => setSheetLabel(e.target.value)}
          placeholder='e.g. "North rink", "Rink A", "Sheet 2"'
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
          For venues with multiple sheets of ice, specify which one this game is on.
        </p>
      </div>

      {/* Venue (free text, defaults from rink) */}
      <div>
        <label className="rs-label">Venue display name</label>
        <input
          type="text"
          className="rs-input"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
          placeholder='e.g. "Scotiabank Arena — North rink"'
        />
      </div>

      {/* Home coach */}
      <CoachAutocomplete
        label="Home team coach"
        side="home"
        value={homeCoachName}
        linkedId={homeCoachId}
        query={homeCoachQuery}
        setQuery={setHomeCoachQuery}
        options={homeCoachOptions}
        onPick={pickHomeCoach}
        onClear={clearHomeCoach}
      />

      {/* Away coach */}
      <CoachAutocomplete
        label="Away team coach"
        side="away"
        value={awayCoachName}
        linkedId={awayCoachId}
        query={awayCoachQuery}
        setQuery={setAwayCoachQuery}
        options={awayCoachOptions}
        onPick={pickAwayCoach}
        onClear={clearAwayCoach}
      />

      {error && (
        <div
          style={{
            background: 'rgba(200,16,46,0.15)',
            border: '1px solid rgba(200,16,46,0.45)',
            color: '#FCA5A5',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => router.push(`/scoresheet/${gameId}`)}
          className="rs-btn-secondary"
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="rs-btn-primary" style={{ flex: 1 }}>
          {isPending ? 'Saving...' : 'Save details →'}
        </button>
      </div>
    </form>
  );
}

function TeamAutocomplete({
  label,
  side,
  value,
  linkedId,
  query,
  setQuery,
  options,
  onPick,
  onClear,
}: {
  label: string;
  side: 'home' | 'away';
  value: string;
  linkedId: string | null;
  query: string;
  setQuery: (v: string) => void;
  options: TeamOption[];
  onPick: (t: TeamOption) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <label className="rs-label">{label}</label>
      {linkedId && value ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(255,184,28,0.08)',
            border: '1px solid rgba(255,184,28,0.3)',
            borderRadius: 8,
          }}
        >
          <span style={{ flex: 1, color: '#fff', fontWeight: 600 }}>{value}</span>
          <span
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#FFB81C',
              fontWeight: 700,
            }}
          >
            ✓ RinkStop
          </span>
          <button
            type="button"
            onClick={onClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '1.125rem',
              cursor: 'pointer',
              padding: '0 0.25rem',
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            className="rs-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rinkstop teams (name or city)"
            autoComplete="off"
          />
          {query.trim().length >= 2 && options.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(15,23,42,0.98)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                margin: '0.25rem 0 0',
                padding: '0.25rem 0',
                listStyle: 'none',
                zIndex: 20,
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {options.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onPick(t)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      padding: '0.625rem 0.875rem',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                      {[t.short_name, t.home_city, t.home_country, t.age_label, t.level].filter(Boolean).join(' · ')}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
        Linking teams to rinkstop.com enables Submit-to-RinkStop + stat aggregation.
      </p>
    </div>
  );
}

function CoachAutocomplete({
  label,
  side,
  value,
  linkedId,
  query,
  setQuery,
  options,
  onPick,
  onClear,
}: {
  label: string;
  side: 'home' | 'away';
  value: string;
  linkedId: string | null;
  query: string;
  setQuery: (v: string) => void;
  options: CoachOption[];
  onPick: (c: CoachOption) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <label className="rs-label">{label}</label>
      {linkedId && value ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(255,184,28,0.08)',
            border: '1px solid rgba(255,184,28,0.3)',
            borderRadius: 8,
          }}
        >
          <span style={{ flex: 1, color: '#fff', fontWeight: 600 }}>{value}</span>
          <span
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#FFB81C',
              fontWeight: 700,
            }}
          >
            ✓ RinkStop
          </span>
          <button
            type="button"
            onClick={onClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '1.125rem',
              cursor: 'pointer',
              padding: '0 0.25rem',
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            className="rs-input"
            value={value}
            onChange={(e) => {
              setQuery(e.target.value);
              // If user is typing, they may be un-linking.
            }}
            placeholder="Search RinkStop profiles or type a name"
            autoComplete="off"
          />
          {query.trim().length >= 2 && options.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(15,23,42,0.98)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                margin: '0.25rem 0 0',
                padding: '0.25rem 0',
                listStyle: 'none',
                zIndex: 20,
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {options.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onPick(c)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      padding: '0.625rem 0.875rem',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.display_name}</div>
                    {c.username && (
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        @{c.username}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
        Linked profiles get cross-game stat aggregation on rinkstop.com.
      </p>
    </div>
  );
}
