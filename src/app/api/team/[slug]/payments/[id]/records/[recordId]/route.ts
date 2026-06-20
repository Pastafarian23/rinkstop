import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, paymentPendingEmail } from '@/lib/email';
import { getEmailPreferences } from '@/lib/email-preferences';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; recordId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: paymentId, recordId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  const body = await request.json();

  // Find team + payment + record
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, amount_per_player, team_id')
    .eq('id', paymentId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  const { data: record } = await supabaseAdmin
    .from('payment_records')
    .select('*')
    .eq('id', recordId)
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  // Check authorization: admin can update anyone's; player can update own only
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const isAdmin = ADMIN_ROLES.includes(myMembership.role);
  const isSelfUpdate = record.player_id === userId;

  if (!isAdmin && !isSelfUpdate) {
    return NextResponse.json({ error: 'Cannot update other player records' }, { status: 403 });
  }

  // Players can only set pending_verification + add reference/receipt, not mark paid
  const allowedStatuses = isAdmin
    ? ['unpaid', 'pending_verification', 'paid', 'partial', 'waived', 'refunded']
    : ['pending_verification'];

  const status = body.status || record.status;
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: `Status "${status}" not allowed for your role` }, { status: 403 });
  }

  // Build update
  const update: Record<string, unknown> = {
    status,
    notes: body.notes ?? record.notes,
  };
  if (body.reference_number !== undefined) update.reference_number = body.reference_number;
  if (body.paid_via !== undefined) update.paid_via = body.paid_via;
  if (body.receipt_url !== undefined) update.receipt_url = body.receipt_url;

  // Set amount_paid + paid_at based on status (admin only)
  if (isAdmin) {
    if (status === 'paid') {
      update.amount_paid = record.amount_due;
      update.paid_at = record.paid_at || new Date().toISOString();
      update.marked_by = userId;
    } else if (status === 'unpaid' || status === 'waived' || status === 'refunded') {
      update.amount_paid = 0;
      update.paid_at = null;
    } else if (status === 'partial') {
      // Keep amount_paid as-is (would need separate field to set)
      update.marked_by = userId;
    } else if (status === 'pending_verification') {
      update.marked_by = userId;
    }
  } else {
    // Player self-mark → set marked_by so coach knows who flagged it
    update.marked_by = userId;
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('payment_records')
    .update(update)
    .eq('id', recordId)
    .select('*')
    .single();
  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message || 'Update failed' }, { status: 500 });
  }

  // Notify admins via email when player marks themselves pending_verification
  if (status === 'pending_verification' && isSelfUpdate) {
    try {
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('title, amount_per_player, currency, team_id')
        .eq('id', paymentId)
        .single();

      if (payment) {
        const { data: admins } = await supabaseAdmin
          .from('team_members')
          .select('user_id')
          .eq('team_id', payment.team_id)
          .in('role', ['head_coach', 'assistant_coach', 'manager', 'treasurer'])
          .is('left_at', null)
          .neq('user_id', userId);

        if (admins && admins.length > 0) {
          const adminIds = admins.map(a => a.user_id);
          const prefsMap = await getEmailPreferences(adminIds);

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', userId)
            .maybeSingle();

          const { data: teamRow } = await supabaseAdmin
            .from('team_workspaces')
            .select('name, slug')
            .eq('id', payment.team_id)
            .maybeSingle();

          for (const adminId of adminIds) {
            const prefs = prefsMap.get(adminId) || {};
            if (prefs.email_payment_notifications === false) continue;

            const { data: adminProfile } = await supabaseAdmin
              .from('profiles')
              .select('email, display_name')
              .eq('user_id', adminId)
              .maybeSingle();

            if (!adminProfile?.email) continue;

            const link = `https://rinkstop.com/dashboard/team/${teamRow?.slug || ''}/payments/${paymentId}`;
            const tpl = paymentPendingEmail({
              teamName: teamRow?.name || 'your team',
              paymentTitle: payment.title,
              playerName: profile?.display_name || profile?.username || 'A player',
              amount: String(payment.amount_per_player),
              currency: payment.currency,
              referenceNumber: body.reference_number || null,
              approveLink: link,
            });

            // Best-effort, fire-and-forget
            void sendEmail({
              to: adminProfile.email,
              subject: tpl.subject,
              html: tpl.html,
              fromName: 'RinkStop',
            }).catch(err => console.error('[email] payment-pending send failed:', err));
          }
        }
      }
    } catch (err) {
      console.error('[email] payment-pending notification error:', err);
      // Non-fatal — record update succeeded
    }
  }

  return NextResponse.json({ ok: true, record: updated });
}