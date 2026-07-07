'use client';

/**
 * PlayerTimelineSection — Phase 1b-2.
 * Composes PlayerAchievementList + PlayerAchievementAdd + PlayerTimeline
 * for a single child. Owns the post-action refresh.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAchievementList, { type PlayerAchievement } from './PlayerAchievementList';
import PlayerAchievementAdd from './PlayerAchievementAdd';
import PlayerTimeline from './PlayerTimeline';
import type { TimelineEvent } from '@/lib/timeline-builder';

interface PlayerTimelineSectionProps {
  playerId: string;
  achievements: PlayerAchievement[];
  timelineEvents: TimelineEvent[];
}

export default function PlayerTimelineSection({
  playerId,
  achievements,
  timelineEvents,
}: PlayerTimelineSectionProps) {
  const router = useRouter();
  const [scrollToAch, setScrollToAch] = useState<string | null>(null);

  const handleChange = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleAchievementClick = useCallback((id: string) => {
    setScrollToAch(id);
    // Scroll the achievement row into view after refresh
    setTimeout(() => {
      const el = document.querySelector(`[data-achievement-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  return (
    <div data-testid="player-timeline-section">
      <PlayerAchievementList
        playerId={playerId}
        achievements={achievements}
        onChange={handleChange}
      />
      <PlayerAchievementAdd playerId={playerId} onAdded={handleChange} />

      <div style={{ marginTop: '1rem' }}>
        <div
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
          }}
        >
          CAREER TIMELINE
        </div>
        <PlayerTimeline events={timelineEvents} onAchievementClick={handleAchievementClick} />
      </div>
    </div>
  );
}
