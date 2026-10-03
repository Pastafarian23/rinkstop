'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  findFixtureMatchesAction,
  linkToFixtureAction,
  unlinkFixtureAction,
} from '@/app/actions/rinkstop-integration';

interface GameData {
  home_team_name: string;
  home_team_rinkstop_id: string | null;
  away_team_name: string;
  away_team_rinkstop_id: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  rinkstop_integration: string;
  rinkstop_fixture_id: string | null;
}

interface FixtureMatch {
  id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  status: string;
  league_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  score: { home: number | null; away: number | null };
  match_score: number;
  match_reasons: string[];
}

interface Props {
  gameId: string;
  game: GameData;
  linkedFixture: any | null;
  linkedTeamMap: Record<string, string>;
}

export function RinkstopLinkPanel({ gameId, game, linkedFixture, linkedTeamMap }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<FixtureMatch[] | null>(null);
  const [searchedBy, setSearchedBy] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const isLinked = game.rinkstop_integration === 'linked' && linkedFixture;
  const teamsLinked = !!(game.home_team_rinkstop_id && game.away_team_rinkstop_id);

  function search() {
    setError(null);
    startTransition(async () => {
      const r = await findFixtureMatchesAction(gameId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMatches(r.matches);
      setSearchedBy(r.searchedBy);
      setSearched(true);
    });
  }

  function link(fixtureId: string) {
    setError(null);
    startTransition(async () => {
      const r = await linkToFixtureAction(gameId, fixtureId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function unlink() {
    if (!confirm('Unlink this game from rinkstop.com? Results will no longer sync.')) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await unlinkFixtureAction(gameId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  // If linked, show the link panel.
  if (isLinked) {
    return (
      <LinkedPanel
        linkedFixture={linkedFixture}
        linkedTeamMap={linkedTeamMap}
        onUnlink={unlink}
        isPending={isPending}
        error={error}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Step 1: team link status */}
      <section
        style={{
          background: teamsLinked
            ? 'rgba(34,197,94,0.08)'
            : 'rgba(255,184,28,0.08)',
          border: `1px solid ${teamsLinked ? 'rgba(34,197,94,0.3)' : 'rgba(255,184,28,0.3)'}`,
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        <p
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: teamsLinked ? '#22C55E' : '#FFB81C',
            fontWeight: 700,
            margin: 0,
          }}
        >
          {teamsLinked ? '✓ Step 1: Teams linked' : '⚠ Step 1: Link teams first'}
        </p>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.8)',
            margin: '0.5rem 0 0',
            lineHeight: 1.5,
          }}
        >
          {teamsLinked
            ? `${game.home_team_name} + ${game.away_team_name} are linked to rinkstop teams.`
            : 'Both teams must be linked to rinkstop.com before we can find a matching fixture. Edit the team names in game details to link them.'}
        </p>
      </section>

      {/* Step 2: search */}
      <section
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        <p
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Step 2: Find the matching fixture
        </p>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.7)',
            margin: '0.5rem 0 0.75rem',
            lineHeight: 1.5,
          }}
        >
          We search rinkstop.com for fixtures with the same teams on or
          near {game.scheduled_at ? new Date(game.scheduled_at).toLocaleString() : 'today'}.
        </p>
        <button
          type="button"
          onClick={search}
          disabled={isPending || !teamsLinked}
          className="rs-btn-primary"
          style={{ width: '100%' }}
        >
          {isPending ? 'Searching...' : 'Search rinkstop.com'}
        </button>
        {error && (
          <div
            style={{
              background: 'rgba(200,16,46,0.15)',
              border: '1px solid rgba(200,16,46,0.45)',
              color: '#FCA5A5',
              padding: '0.625rem 0.875rem',
              borderRadius: 8,
              fontSize: '0.8125rem',
              marginTop: '0.75rem',
            }}
          >
            {error}
          </div>
        )}
      </section>

      {/* Step 3: matches */}
      {searched && matches !== null && (
        <section
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '1rem',
          }}
        >
          <p
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 700,
              margin: 0,
            }}
          >
            {matches.length === 0 ? 'No matches found' : `${matches.length} match${matches.length === 1 ? '' : 'es'} found`}
          </p>
          {searchedBy && (
            <p
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                margin: '0.25rem 0 0.75rem',
              }}
            >
              Searched by {searchedBy}
            </p>
          )}
          {matches.length === 0 ? (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.6)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              We didn't find a matching fixture in the rinkstop.com database.
              Double-check the team links + date, or the game may need to be
              created as a new fixture (Phase B2 will add that).
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {matches.map((m) => (
                <li
                  key={m.id}
                  style={{
                    background: m.match_score >= 100 ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.04)',
                    border: m.match_score >= 100 ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>
                      {m.home_team_name || m.home_team_id.slice(0, 8)} vs {m.away_team_name || m.away_team_id.slice(0, 8)}
                    </div>
                    <div
                      style={{
                        fontSize: '0.6875rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: m.match_score >= 100 ? '#22C55E' : 'rgba(255,255,255,0.5)',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      Score {m.match_score}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                    {new Date(m.scheduled_at).toLocaleString()} · {m.status}
                    {m.score.home != null && m.score.away != null && (
                      <> · rinkstop score: {m.score.home}-{m.score.away}</>
                    )}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.625rem' }}>
                    {m.match_reasons.join(' · ')}
                  </div>
                  <button
                    type="button"
                    onClick={() => link(m.id)}
                    disabled={isPending}
                    className="rs-btn-primary"
                    style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', minHeight: 36 }}
                  >
                    Link this fixture
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function LinkedPanel({
  linkedFixture,
  linkedTeamMap,
  onUnlink,
  isPending,
  error,
}: {
  linkedFixture: any;
  linkedTeamMap: Record<string, string>;
  onUnlink: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const homeName = linkedTeamMap[linkedFixture.home_team_id] || linkedFixture.home_team_id.slice(0, 8);
  const awayName = linkedTeamMap[linkedFixture.away_team_id] || linkedFixture.away_team_id.slice(0, 8);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <section
        style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 12,
          padding: '1.25rem',
        }}
      >
        <p
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#22C55E',
            fontWeight: 700,
            margin: 0,
          }}
        >
          ✓ Linked to rinkstop.com
        </p>
        <p style={{ fontSize: '1.0625rem', color: '#fff', fontWeight: 700, margin: '0.5rem 0 0' }}>
          {homeName} vs {awayName}
        </p>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', margin: '0.25rem 0 0' }}>
          {new Date(linkedFixture.scheduled_at).toLocaleString()} · status: {linkedFixture.status}
        </p>
        {linkedFixture.home_score != null && linkedFixture.away_score != null && (
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.7)',
              margin: '0.5rem 0 0',
            }}
          >
            Current rinkstop.com score: <strong>{linkedFixture.home_score}-{linkedFixture.away_score}</strong>
          </p>
        )}
        <p
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'ui-monospace, monospace',
            margin: '0.5rem 0 0',
            wordBreak: 'break-all',
          }}
        >
          Fixture ID: {linkedFixture.id}
        </p>
        {error && (
          <div
            style={{
              background: 'rgba(200,16,46,0.15)',
              border: '1px solid rgba(200,16,46,0.45)',
              color: '#FCA5A5',
              padding: '0.625rem 0.875rem',
              borderRadius: 8,
              fontSize: '0.8125rem',
              marginTop: '0.75rem',
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={onUnlink}
            disabled={isPending}
            className="rs-btn-secondary"
            style={{ flex: 1, fontSize: '0.8125rem' }}
          >
            {isPending ? 'Unlinking...' : 'Unlink'}
          </button>
        </div>
      </section>

      <section
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        <p
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Coming in next phase
        </p>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '0.5rem 0 0',
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6,
          }}
        >
          <li>• Live broadcast (rinkstop.com /directory/games/[id] shows live scores from this game)</li>
          <li>• Final results sync (when you finalize, rinkstop.com updates the fixture score)</li>
          <li>• Player stat aggregation (linked games count toward rinkstop player pages)</li>
        </ul>
      </section>
    </div>
  );
}
