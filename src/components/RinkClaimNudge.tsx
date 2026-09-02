import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Above-the-fold claim nudge for rink detail pages.
 *
 * Why this exists: GSC data (verified 2026-09-02) shows 65,983 impressions
 * and 610 clicks per 28 days, mostly to individual rink pages. The existing
 * claim CTA is at the bottom of the 1,300-line page (intentional, per
 * Arnel's 2026-07-08 request) and a duplicate lives in a hidden tab. Neither
 * is visible to the casual visitor who lands from "hili ice rink" and bounces.
 *
 * This component renders a compact, above-the-fold nudge for ANONYMOUS users
 * on UNCLAIMED rinks only. Signed-in users see the existing claim flow at
 * the bottom; claimed rinks show the existing ClaimedBy badge.
 *
 * Copy pitch: ice rinks are the highest-traffic entity in the directory
 * (top rink = 23 clicks/28d, median = 2/28d, per GSC). The CTA frames
 * claiming as "free" and points to /claim-your-listing where the tier
 * pitch (Business Listing $99/yr) is made.
 *
 * Scope: rink only for now. If it works, copy to /teams and /leagues.
 */
export default async function RinkClaimNudge({
  rinkId,
  rinkName,
}: {
  rinkId: string;
  rinkName: string;
}) {
  const { userId } = await auth();
  if (userId) return null; // signed-in users get the full CTA at the bottom

  // Skip if already claimed
  const { data: existingClaim } = await supabaseAdmin
    .from('claims')
    .select('id')
    .eq('claim_type', 'rink')
    .eq('entity_id', rinkId)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle();

  if (existingClaim) return null;

  // Skip for unclaimable rinks (Pro profiles — see WS25 2026-08-23)
  const { data: rinkRow } = await supabaseAdmin
    .from('rinks')
    .select('claimable')
    .eq('id', rinkId)
    .maybeSingle();
  if (rinkRow && (rinkRow as any).claimable === false) return null;

  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 16,
        padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.02) 100%)',
        border: '1px solid rgba(56,189,248,0.25)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>🏒</span>
      <span style={{ color: '#e2e8f0', fontSize: 14, flex: 1, minWidth: 0 }}>
        Own or run <strong style={{ color: '#fff' }}>{rinkName}</strong>?{' '}
        <span style={{ color: '#94a3b8' }}>Claim it free to manage the listing, or upgrade to a Business Listing ($99/yr) to capture leads and analytics.</span>
      </span>
      <Link
        href={`/claim-your-listing?focus=rink&id=${encodeURIComponent(rinkId)}&name=${encodeURIComponent(rinkName)}`}
        style={{
          background: '#38bdf8',
          color: '#0f172a',
          fontWeight: 600,
          fontSize: 13,
          padding: '6px 12px',
          borderRadius: 6,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Claim free →
      </Link>
    </div>
  );
}
