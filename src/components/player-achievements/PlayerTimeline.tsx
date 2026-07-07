'use client';

/**
 * PlayerTimeline — Phase 1b-2.
 * Read-only display of a player's career timeline (events from 5 sources).
 */

import { TIMELINE_EVENT_ICONS, type TimelineEvent } from '@/lib/timeline-builder';

interface PlayerTimelineProps {
  events: TimelineEvent[];
  /** Optional: link to the achievement edit page when an event is an achievement */
  onAchievementClick?: (achievementId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function groupByYear(events: TimelineEvent[]): { year: string; events: TimelineEvent[] }[] {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const e of events) {
    const year = e.date.slice(0, 4) || 'Unknown';
    (groups[year] = groups[year] || []).push(e);
  }
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((year) => ({ year, events: groups[year] }));
}

export default function PlayerTimeline({ events, onAchievementClick }: PlayerTimelineProps) {
  if (events.length === 0) {
    return (
      <div
        data-testid="player-timeline-empty"
        style={{
          padding: '1rem',
          background: '#0a0a0a',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 10,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.85rem',
        }}
      >
        No timeline events yet. The timeline fills in as your child joins teams, uploads documents, and earns achievements.
      </div>
    );
  }

  const grouped = groupByYear(events);

  return (
    <div data-testid="player-timeline">
      {grouped.map(({ year, events: yearEvents }) => (
        <div key={year} style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '0.9rem',
              color: '#14B8A6',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
          >
            {year}
          </div>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              borderLeft: '2px solid rgba(20,184,166,0.3)',
              paddingLeft: '0.85rem',
            }}
          >
            {yearEvents.map((e, i) => {
              const isAchievement = e.type === 'achievement_granted';
              const achievementId = e.metadata.achievement_id as string | undefined;
              return (
                <li
                  key={`${e.type}-${e.date}-${i}`}
                  data-testid="player-timeline-event"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '0.4rem 0',
                  }}
                >
                  <span aria-hidden style={{ fontSize: '0.95rem', flexShrink: 0, marginTop: 2 }}>
                    {TIMELINE_EVENT_ICONS[e.type] || '•'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: isAchievement && achievementId && onAchievementClick ? 'pointer' : 'default',
                      }}
                      onClick={
                        isAchievement && achievementId && onAchievementClick
                          ? () => onAchievementClick(achievementId)
                          : undefined
                      }
                      title={isAchievement && onAchievementClick ? 'Click to edit' : undefined}
                    >
                      {e.title}
                    </div>
                    {e.body ? (
                      <div
                        style={{
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: '0.75rem',
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {e.body}
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '0.7rem',
                      flexShrink: 0,
                    }}
                  >
                    {formatDate(e.date)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
