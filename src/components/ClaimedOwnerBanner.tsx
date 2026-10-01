/**
 * Above-the-fold banner for CLAIMED listings (Phase 5 of WS30 conversion overhaul).
 *
 * Renders for signed-in users who are the approved owner of this listing.
 * Shows "Manage your profile" link to the appropriate dashboard and a
 * secondary "Unlock more features" CTA pointing at the relevant pricing tier
 * for the entity type.
 *
 * Tier suggestion logic (per Arnel 2026-10-01 spec):
 *   rink    → Business Listing → Business Plus
 *   team    → Club Starter → Club Pro → Club Elite
 *   league  → League plan
 *   player  → Verified Identity → Identity Plus
 *
 * We surface only the ENTRY paid tier as a soft suggestion. Owners who want
 * more already know — they'll click through to /pricing themselves.
 *
 * Why a banner and not a redesign:
 * The goal of Phase 5 is to make the existing owner experience feel complete
 * without forcing a redesign. Owners return to their listing to verify edits
 * stuck, share the URL, or pull stats. We give them those affordances; we
 * don't churn them into a checkout modal.
 */
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import OwnerBannerButtons from './OwnerBannerButtons';

const UPGRADE_HINT: Record<'rink' | 'team' | 'league' | 'player', { label: string; href: string }> = {
  rink: { label: 'Unlock Business Plus for lead capture & analytics', href: '/pricing?for=rink&plan=business_plus' },
  team: { label: 'Unlock Club Pro for roster + analytics', href: '/pricing?for=team&plan=club_pro' },
  league: { label: 'Unlock Federation for org-wide tools', href: '/pricing?for=league&plan=federation' },
  player: { label: 'Unlock Identity Plus for Family Hub + analytics', href: '/pricing?for=player&plan=identity_plus' },
};

const DASHBOARD_HREF: Record<'rink' | 'team' | 'league' | 'player', string> = {
  rink: '/dashboard/manage/rink/',
  team: '/dashboard/manage/team/',
  league: '/dashboard/manage/league/',
  player: '/dashboard/manage/player/',
};

export default async function ClaimedOwnerBanner({
  entityType,
  entityId,
}: {
  entityType: 'rink' | 'team' | 'league' | 'player';
  entityId: string;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  // Only render for the approved owner. Same claim table RinkClaimNudge reads.
  const { data: claim } = await supabaseAdmin
    .from('claims')
    .select('id')
    .eq('claim_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle();
  if (!claim) return null;

  const upgrade = UPGRADE_HINT[entityType];
  const dashboard = `${DASHBOARD_HREF[entityType]}${encodeURIComponent(entityId)}`;

  return (
    <div
      data-claim-banner="owner"
      style={{
        marginTop: 4,
        marginBottom: 16,
        padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(74,222,128,0.10) 0%, rgba(74,222,128,0.02) 100%)',
        border: '1px solid rgba(74,222,128,0.28)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>✅</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
          You own this listing.
        </div>
        <div style={{ color: '#94a3b8', fontSize: 12.5, lineHeight: 1.45, marginTop: 2 }}>
          {upgrade.label}
        </div>
      </div>
      <OwnerBannerButtons
        entityType={entityType}
        entityId={entityId}
        dashboardHref={dashboard}
        upgradeHref={upgrade.href}
        upgradeLabel={upgrade.label}
      />
    </div>
  );
}
