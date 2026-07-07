'use client';

/**
 * PlayerMediaSection — Phase 1b-3.
 * Composes PlayerMediaGallery + PlayerMediaUpload for a single child.
 * Owns the post-action refresh.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlayerMediaGallery, { type PlayerMedia } from './PlayerMediaGallery';
import PlayerMediaUpload from './PlayerMediaUpload';

interface PlayerMediaSectionProps {
  playerId: string;
  media: PlayerMedia[];
}

export default function PlayerMediaSection({ playerId, media }: PlayerMediaSectionProps) {
  const router = useRouter();
  const handleChange = useCallback(() => {
    router.refresh();
  }, [router]);
  return (
    <div data-testid="player-media-section">
      <PlayerMediaGallery playerId={playerId} media={media} onChange={handleChange} />
      <PlayerMediaUpload playerId={playerId} onAdded={handleChange} />
    </div>
  );
}
