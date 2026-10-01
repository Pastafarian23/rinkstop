/**
 * Above-the-fold claim nudge for ANY listing type (rink/team/league/player).
 *
 * Why this exists (WS30 conversion overhaul, Arnel 2026-10-01):
 * GSC data shows 65K+ impressions/month to individual rink pages, plus
 * significant traffic to team/league/player pages from "name + team" searches.
 * The full claim CTA (ClaimThisListing.tsx) lives at the BOTTOM of these pages
 * by design — visitors bounce before reaching it. This component is a compact
 * discovery nudge placed directly under the H1 so it appears in the first
 * viewport. Anonymous users only; signed-in users get the full CTA below.
 *
 * Renders for: unclaimed AND claimable entities. Skip for:
 * - Signed-in users (they get the full claim form at the bottom)
 * - Already-claimed listings (ClaimedBy component handles those)
 * - Unclaimable entities (NHL/AHL/KHL/PWHL players — WS25 fix, claimable=false)
 *
 * Visual language: same compact gradient as the original RinkClaimNudge
 * (verified conversion-positive in 2026-09-02 GSC analysis), generalized
 * across types. The secondary "See what you can unlock" link goes to
 * /pricing?for=<entity_type> so the visitor can see the upgrade ladder
 * AFTER they've understood the free claim.
 *
 * Why two CTAs and not one:
 * - Primary "Claim free" matches Phase 4 spec ("Do not force a $99/year
 *   purchase before the visitor understands the free claim")
 * - Secondary "See what you can unlock" is the Phase 5 bridge — once they
 *   understand the claim is free, they can discover the upgrade without us
 *   putting it in their face
 */
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import ClaimNudgeButtons from './ClaimNudgeButtons';

const CLAIMABLE_NAV: Record<'rink' | 'team' | 'league' | 'player', string> = {
  rink: '/claim-your-listing?focus=rink',
  team: '/claim-your-listing?focus=team',
  league: '/claim-your-listing?focus=league',
  player: '/claim-your-listing?focus=player',
};

export default async function ClaimListingNudge({
  entityType,
  entityId,
  entityName,
}: {
  entityType: 'rink' | 'team' | 'league' | 'player';
  entityId: string;
  entityName: string;
}) {
  const { userId } = await auth();
  if (userId) return null;

  // Look up claimable flag + claim status in one round-trip.
  // For rinks/leagues the table is `rinks`/`leagues`; for teams/players
  // we check the team's `claimable` column + an approved claims row.
  const tableForClaimable =
    entityType === 'rink' ? 'rinks'
    : entityType === 'league' ? 'leagues'
    : entityType === 'team' ? 'teams'
    : 'players';

  const [claimableRow, claimRow] = await Promise.all([
    supabaseAdmin
      .from(tableForClaimable)
      .select('claimable')
      .eq('id', entityId)
      .maybeSingle(),
    supabaseAdmin
      .from('claims')
      .select('id')
      .eq('claim_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle(),
  ]);

  if (claimRow.data) return null;
  const claimableFlag = (claimableRow.data as { claimable?: boolean } | null)?.claimable;
  if (claimableFlag === false) return null;

  const displayName = entityName?.length > 40 ? entityName.slice(0, 40) + '…' : entityName;
  const focusHref = `${CLAIMABLE_NAV[entityType]}&id=${encodeURIComponent(entityId)}&name=${encodeURIComponent(entityName)}`;
  const pricingHref = `/pricing?for=${entityType}`;

  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 16,
        padding: '12px 14px',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0.02) 100%)',
        border: '1px solid rgba(56,189,248,0.28)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>🏒</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
          Own or manage {displayName}?
        </div>
        <div style={{ color: '#94a3b8', fontSize: 12.5, lineHeight: 1.45, marginTop: 2 }}>
          Claim it <strong style={{ color: '#fff' }}>free</strong> to manage the listing — or see what you can unlock with a verified owner profile.
        </div>
      </div>
      <ClaimNudgeButtons
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        focusHref={focusHref}
        pricingHref={pricingHref}
      />
    </div>
  );
}
