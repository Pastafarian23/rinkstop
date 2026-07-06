'use client';

/**
 * PlayerDocumentSection — Phase 1b-1 (Player Documents)
 *
 * Thin client wrapper that composes PlayerDocumentList + PlayerDocumentUpload
 * for a single child, and owns the post-action refresh.
 *
 * Why a wrapper (instead of calling router.refresh() from inside
 * PlayerDocumentUpload / PlayerDocumentList):
 *   - The two components stay reusable on surfaces that don't have a
 *     Next.js router context (e.g. Phase 2 org-side views).
 *   - Refresh behavior is a layout decision, not a component-internal one.
 *   - The page wiring stays a one-liner per child.
 *
 * Flow:
 *   1. Server fetches the seed documents for this child and passes them in.
 *   2. List displays them. User can View / Archive (per-row, no upload).
 *   3. Upload collects files + metadata, POSTs, then triggers
 *      `router.refresh()` so the parent server component re-renders and
 *      the list refreshes with the new rows.
 *   4. Archive triggers an optimistic local update; on success the parent
 *      is told (onChange) and we refresh too.
 *
 * The two refresh paths could be merged, but keeping them separate makes
 * the failure modes legible: archive failures stay local (the optimistic
 * update rolls back), while upload failures surface in the upload form's
 * error banner.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlayerDocumentList, { type PlayerDocument } from './PlayerDocumentList';
import PlayerDocumentUpload from './PlayerDocumentUpload';

interface PlayerDocumentSectionProps {
  playerId: string;
  documents: PlayerDocument[];
  /** True when the parent's prior consent was revoked. Drives the
   *  re-assert checkbox in the upload form. */
  consentRevoked?: boolean;
}

export default function PlayerDocumentSection({
  playerId,
  documents,
  consentRevoked = false,
}: PlayerDocumentSectionProps) {
  const router = useRouter();

  const handleChange = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleUpload = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div data-testid="player-document-section">
      <PlayerDocumentList
        playerId={playerId}
        documents={documents}
        onChange={handleChange}
      />
      <div style={{ marginTop: '0.85rem' }}>
        <PlayerDocumentUpload
          playerId={playerId}
          consentRevoked={consentRevoked}
          onUpload={handleUpload}
        />
      </div>
    </div>
  );
}