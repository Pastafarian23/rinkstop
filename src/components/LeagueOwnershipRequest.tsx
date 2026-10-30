import Link from 'next/link';

/**
 * League ownership request CTA.
 *
 * 2026-10-30 (Arnel-flagged): replaces a dead-end claim CTA on league pages.
 *
 * WHY THIS IS NOT A CLAIM:
 *   `POST /api/claims` accepts claim_type `rink | team | player` only.
 *   `league` is NOT a first-class claim_type — submitting one returns 400
 *   "Invalid claim type". Worse, the claims FORM silently fell
 *   `entity=league` back to `rink`, so it would have submitted a RINK claim
 *   carrying a league's UUID — a silently wrong claim, which is worse than
 *   an error.
 *
 *   League management is gated on a `league_admin` account type
 *   (see src/app/api/manage/[type]/[id]/route.ts). There is no self-serve
 *   path today, and inventing one is a separate product decision.
 *
 * THE WORKING PATH:
 *   A league owner requests management through /add-listing, which lands in
 *   the same admin queue the public submission-status page now surfaces.
 *   That path is tested end-to-end (the submission → status → live flow).
 */
export default function LeagueOwnershipRequest({
  leagueId,
  leagueName,
}: {
  leagueId: string;
  leagueName: string;
}) {
  const displayName = leagueName?.length > 40 ? `${leagueName.slice(0, 40)}…` : leagueName;

  return (
    <div
      style={{
        background: 'rgba(20,184,166,0.05)',
        border: '1px solid rgba(20,184,166,0.3)',
        borderRadius: 10,
        padding: '1.1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <div
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            marginBottom: '0.25rem',
          }}
        >
          Run this league? Get it on RinkStop.
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Leagues are reviewed by our team before they go live, so you get the
          listing right rather than a half-finished page. Tell us about{' '}
          {displayName || 'your league'} and we will set it up.
        </div>
      </div>
      <Link
        href={`/add-listing?type=league&name=${encodeURIComponent(leagueName || '')}`}
        style={{
          background: '#C8102E',
          color: '#fff',
          padding: '0.55rem 1.25rem',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '0.875rem',
          whiteSpace: 'nowrap',
        }}
      >
        Request this league →
      </Link>
    </div>
  );
}
