/**
 * /dashboard/manage/rink/[id]/disputes
 *
 * WS3.5 PR2 — Operator dispute queue for one rink.
 *
 * Lists all disputed stamps against this rink (filtered via the
 * stamps_operator_dispute_read RLS policy), and exposes adjudication
 * actions that call POST /api/passport/stamp/[stampId]/adjudicate.
 *
 * Auth: caller must have an approved claim on this rink. UI verifies
 * the same way the manage page does (count claims). Service-layer
 * re-checks via claims + caller_user_id.
 *
 * Gate: STAMPS_ADMIN_ENABLED must be true (per Workstream 1 Rule 5).
 *   - If the flag is off, the page renders an "adjudication is not
 *     enabled" notice instead of the queue.
 *   - The page itself is always reachable (no route-level gate), so
 *     support can link operators here even before the flag is on.
 *
 * Display:
 *   - Header: rink name + city + an empty-state if no disputes.
 *   - One row per disputed stamp, newest first:
 *     - stamper display name + actor role
 *     - stamped_at timestamp
 *     - dispute reason (from scan_events.details.reason)
 *     - reason input (optional, 1000 char max)
 *     - Uphold (red) + Overturn (green) buttons
 *   - Empty state: "No disputed stamps. Stamps stay disputed only if
 *     the holder flags them. Inbox clear."
 *
 * Out of scope: pagination. WS3.5 PR2 target is single-digit disputes
 * per rink. Will revisit if a rink sees 100+ active disputes.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import {
  isStampsAdminEnabled,
  stampService,
} from '@/lib/passport';
import { DisputeActions } from './dispute-actions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ManageRinkDisputesPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.userId) redirect('/login');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  const { id: rinkId } = await params;

  // Owner check — approved claim required.
  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', rinkId)
    .eq('status', 'approved');

  if (!claimCount) {
    return (
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          background: 'rgba(255,184,28,0.08)',
          border: '1px solid rgba(255,184,28,0.3)',
          color: '#FFB81C',
          padding: '1rem 1.25rem',
          borderRadius: 8,
          fontSize: '0.9rem',
        }}>
          You don&rsquo;t have an approved claim for this rink. Claim it first, then come back here to review disputes.
        </div>
        <Link href={`/dashboard/claims?entity=rink&id=${rinkId}`} style={{ color: '#14B8A6' }}>
          → Go to claims
        </Link>
      </div>
    );
  }

  // Load rink for header.
  const { data: rink, error: rinkErr } = await supabaseAdmin
    .from('rinks')
    .select('name, city, country')
    .eq('id', rinkId)
    .maybeSingle();

  if (rinkErr || !rink) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{
          background: 'rgba(200,16,46,0.1)',
          border: '1px solid rgba(200,16,46,0.4)',
          color: '#FF6B7A',
          padding: '1rem 1.25rem',
          borderRadius: 8,
        }}>
          Could not load rink. It may have been removed.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>
          ← Back to claims
        </Link>
      </div>
    );
  }

  const flagOn = isStampsAdminEnabled();

  // Load disputed stamps via the service-layer method. Wrapped to
  // convert thrown errors into an empty list + console error so the
  // server component can still render with a helpful "couldn't load"
  // notice instead of crashing.
  let disputes: Awaited<ReturnType<typeof stampService.listDisputedStampsForOperator>> = [];
  if (flagOn) {
    try {
      disputes = await stampService.listDisputedStampsForOperator({
        callerUserId: userId,
        isStaff: false,
        targetType: 'rink',
        targetId: rinkId,
        limit: 100,
      });
    } catch (e) {
      console.error('[manage/rink/[id]/disputes] failed to load disputes:', e);
      disputes = [];
    }
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{ fontSize: '2rem' }}>⚖️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}>
            DISPUTE QUEUE
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.85rem',
            margin: 0,
          }}>
            {(rink.name as string)}
            {rink.city ? ` · ${rink.city as string}` : ''}
            {rink.country ? `, ${rink.country as string}` : ''}
          </p>
        </div>
        <Link
          href={`/dashboard/manage/rink/${rinkId}`}
          style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'none',
            padding: '0.4rem 0.75rem',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
          }}
        >
          ← Back to rink
        </Link>
      </div>

      {!flagOn && (
        <div style={{
          background: 'rgba(255,184,28,0.08)',
          border: '1px solid rgba(255,184,28,0.3)',
          color: '#FFB81C',
          padding: '1rem 1.25rem',
          borderRadius: 8,
          fontSize: '0.9rem',
        }}>
          Dispute adjudication is currently disabled. Once RinkStop ships it
          (set <code>STAMPS_ADMIN_ENABLED=true</code>), disputed stamps will
          appear here for review. Until then, holders can flag disputes via
          their dashboard; they&rsquo;ll surface here automatically when the
          flag flips on.
        </div>
      )}

      {flagOn && disputes.length === 0 && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '2rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
          <div style={{ fontWeight: 600, color: '#fff' }}>No disputed stamps</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Stamps stay disputed only when the recipient flags them. Your queue
            is clear.
          </div>
        </div>
      )}

      {flagOn && disputes.length > 0 && (
        <DisputeActions
          rinkId={rinkId}
          disputes={disputes.map((d) => ({
            stampId: d.stampId,
            stamperDisplayName: d.stamperDisplayName,
            stamperRole: d.stamperRole,
            stampedAt: d.stampedAt,
            disputeReason: d.disputeReason,
          }))}
        />
      )}
    </div>
  );
}
