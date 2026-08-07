/**
 * Activity type badge — small visual chip for activity_type enum values.
 * Used in EventCard, ProgrammingRow, and any list/grid where the activity
 * type is shown.
 *
 * Maps our internal enum to:
 *   - Display label (human-readable)
 *   - Emoji (consistent across surfaces)
 *   - Color (subtle, fits dark theme)
 */

export type ActivityType =
  | 'public_skate'
  | 'stick_and_puck'
  | 'learn_to_skate'
  | 'open_hockey'
  | 'pickup'
  | 'drop_in'
  | 'youth_league'
  | 'adult_league'
  | 'shinny'
  | 'rat_hockey'
  | 'broomball'
  | 'figure_skating'
  | 'tournament'
  | 'camp'
  | 'tryout'
  | 'showcase'
  | 'other';

const ACTIVITY_META: Record<ActivityType, { label: string; emoji: string; color: string }> = {
  public_skate: { label: 'Public Skate', emoji: '⛸️', color: '#7dd3fc' },
  stick_and_puck: { label: 'Stick & Puck', emoji: '🏒', color: '#86efac' },
  learn_to_skate: { label: 'Learn to Skate', emoji: '⛸️', color: '#7dd3fc' },
  open_hockey: { label: 'Open Hockey', emoji: '🏒', color: '#86efac' },
  pickup: { label: 'Pickup Hockey', emoji: '🏒', color: '#86efac' },
  drop_in: { label: 'Drop-in Hockey', emoji: '🏒', color: '#86efac' },
  youth_league: { label: 'Youth Hockey', emoji: '🏒', color: '#fcd34d' },
  adult_league: { label: 'Adult Hockey', emoji: '🏒', color: '#fcd34d' },
  shinny: { label: 'Shinny', emoji: '🏒', color: '#86efac' },
  rat_hockey: { label: 'Rat Hockey', emoji: '🏒', color: '#86efac' },
  broomball: { label: 'Broomball', emoji: '🥌', color: '#fcd34d' },
  figure_skating: { label: 'Figure Skating', emoji: '⛸️', color: '#c4b5fd' },
  tournament: { label: 'Tournament', emoji: '🏆', color: '#fcd34d' },
  camp: { label: 'Camp', emoji: '🏕️', color: '#fcd34d' },
  tryout: { label: 'Tryout', emoji: '🎯', color: '#fcd34d' },
  showcase: { label: 'Showcase', emoji: '🎭', color: '#fcd34d' },
  other: { label: 'Other', emoji: '🏒', color: '#94a3b8' },
};

export function activityMeta(activityType: string): { label: string; emoji: string; color: string } {
  return ACTIVITY_META[activityType as ActivityType] || ACTIVITY_META.other;
}

export default function ActivityBadge({ activityType }: { activityType: string }) {
  const meta = activityMeta(activityType);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: `${meta.color}22`,
        border: `1px solid ${meta.color}55`,
        color: meta.color,
        fontSize: '12px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: '999px',
      }}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
