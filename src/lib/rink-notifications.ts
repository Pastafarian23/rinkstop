// src/lib/rink-notifications.ts
//
// WS17 PR4 Phase 2E — Rink notification emitters.
//
// Sends in-app notifications (team_notifications) and triggers email
// for rink-specific events: booking requests, contract lifecycle, and
// thread messages.
//
// Notification kinds added to team_notifications:
//   booking_request_created | booking_approved | booking_rejected
//   contract_sent | contract_signed
//   message_received | league_invite
//
// Pattern: idempotent insert keyed on (user_id, source_key, kind).
// If a row already exists the insert is skipped. callerInsertId is
// used as the source_key so retried calls don't duplicate.

import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { getProfileByUserId } from '@/lib/profiles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RinkNotificationKind =
  | 'booking_request_created'
  | 'booking_approved'
  | 'booking_rejected'
  | 'contract_sent'
  | 'contract_signed'
  | 'message_received'
  | 'league_invite';

interface NotificationRow {
  user_id: string;
  team_id?: string;          // null for rink-scoped (no team FK)
  actor_user_id?: string;
  kind: RinkNotificationKind;
  entity_id: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  source_key: string;        // idempotency key
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserEmail(userId: string): Promise<string | null> {
  const profile = await getProfileByUserId(userId);
  return profile?.email ?? null;
}

async function insertNotification(row: NotificationRow): Promise<void> {
  const { error } = await supabaseAdmin
    .from('team_notifications')
    .insert({
      user_id: row.user_id,
      team_id: row.team_id ?? null,
      actor_user_id: row.actor_user_id ?? null,
      kind: row.kind,
      entity_id: row.entity_id,
      title: row.title,
      body: row.body,
      payload: row.payload ?? null,
    });
  if (error && error.code !== '23505') {
    // 23505 = unique constraint violation = already notified = skip silently
    console.error(`[rink-notif] insert failed for ${row.user_id}/${row.kind}`, error);
  }
}

// ─── Email helpers ─────────────────────────────────────────────────────────────

async function sendRinkEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string,
): Promise<void> {
  try {
    await sendEmail({
      to,
      subject,
      html: htmlBody,
      text: textBody,
    });
  } catch (err) {
    // Email failures must not block the notification insert.
    console.error('[rink-notif] email send failed', err);
  }
}

// ─── Emitters ─────────────────────────────────────────────────────────────────

/**
 * notifyBookingRequestCreated
 *
 * Sent to: rink owner(s)
 * Triggered when: a customer submits a booking request for ice.
 *
 * @param rinkId           — used as entity_id
 * @param rinkOwnerUserIds — array of rink owner user IDs to notify
 * @param requesterName    — display name of the requester
 * @param requestedAt       — ISO timestamp of the request
 * @param rinkName         — rink display name
 * @param callerInsertId   — idempotency key (e.g. booking request UUID)
 */
export async function notifyBookingRequestCreated({
  rinkId,
  rinkOwnerUserIds,
  requesterName,
  requestedAt,
  rinkName,
  callerInsertId,
}: {
  rinkId: string;
  rinkOwnerUserIds: string[];
  requesterName: string;
  requestedAt: string;
  rinkName: string;
  callerInsertId: string;
}): Promise<void> {
  const title = `New booking request from ${requesterName}`;
  const body = `${requesterName} requested ice at ${rinkName}. Review and approve or decline.`;

  // In-app notifications
  await Promise.all(
    rinkOwnerUserIds.map((userId) =>
      insertNotification({
        user_id: userId,
        kind: 'booking_request_created',
        entity_id: rinkId,
        title,
        body,
        payload: { requested_at: requestedAt, requester_name: requesterName, rink_name: rinkName },
        source_key: `${callerInsertId}:booking_request_created:${userId}`,
      }),
    ),
  );

  // Email to rink owners
  await Promise.all(
    rinkOwnerUserIds.map(async (userId) => {
      const email = await getUserEmail(userId);
      if (!email) return;
      await sendRinkEmail(
        email,
        title,
        `<p>${body}</p><p><a href="https://rinkstop.com/dashboard/bookings">View booking requests</a></p>`,
        body,
      );
    }),
  );
}

/**
 * notifyBookingApproved
 *
 * Sent to: the customer who made the booking request
 * Triggered when: rink owner approves a booking request
 *
 * @param requesterUserId  — the customer who submitted the request
 * @param entityId          — booking request UUID
 * @param rinkName          — rink display name
 * @param approvedAt        — ISO timestamp
 * @param callerInsertId    — idempotency key
 */
export async function notifyBookingApproved({
  requesterUserId,
  entityId,
  rinkName,
  approvedAt,
  callerInsertId,
}: {
  requesterUserId: string;
  entityId: string;
  rinkName: string;
  approvedAt: string;
  callerInsertId: string;
}): Promise<void> {
  const title = `Booking confirmed at ${rinkName}`;
  const body = `Your ice booking at ${rinkName} has been confirmed.`;

  await insertNotification({
    user_id: requesterUserId,
    kind: 'booking_approved',
    entity_id: entityId,
    title,
    body,
    payload: { rink_name: rinkName, approved_at: approvedAt },
    source_key: `${callerInsertId}:booking_approved:${requesterUserId}`,
  });

  const email = await getUserEmail(requesterUserId);
  if (email) {
    await sendRinkEmail(
      email,
      title,
      `<p>${body}</p><p><a href="https://rinkstop.com/dashboard/bookings">View your bookings</a></p>`,
      body,
    );
  }
}

/**
 * notifyBookingRejected
 *
 * Sent to: the customer who made the booking request
 * Triggered when: rink owner declines a booking request
 *
 * @param requesterUserId  — the customer who submitted the request
 * @param entityId          — booking request UUID
 * @param rinkName          — rink display name
 * @param reason            — optional decline reason
 * @param callerInsertId    — idempotency key
 */
export async function notifyBookingRejected({
  requesterUserId,
  entityId,
  rinkName,
  reason,
  callerInsertId,
}: {
  requesterUserId: string;
  entityId: string;
  rinkName: string;
  reason?: string;
  callerInsertId: string;
}): Promise<void> {
  const title = `Booking declined at ${rinkName}`;
  const body = reason ? `Your booking at ${rinkName} was declined: ${reason}` : `Your booking at ${rinkName} was declined.`;

  await insertNotification({
    user_id: requesterUserId,
    kind: 'booking_rejected',
    entity_id: entityId,
    title,
    body,
    payload: { rink_name: rinkName, reason: reason ?? null },
    source_key: `${callerInsertId}:booking_rejected:${requesterUserId}`,
  });

  const email = await getUserEmail(requesterUserId);
  if (email) {
    await sendRinkEmail(
      email,
      title,
      `<p>${body}</p><p><a href="https://rinkstop.com/dashboard/bookings">View your bookings</a></p>`,
      body,
    );
  }
}

/**
 * notifyContractSent
 *
 * Sent to: the counterparty (org contact email / linked user)
 * Triggered when: rink owner sends a contract for signing
 *
 * @param recipientUserId  — user to notify (if logged in)
 * @param recipientEmail    — fallback email if no user account
 * @param contractId        — rink_contracts UUID
 * @param contractTitle     — display name of the contract
 * @param senderName        — rink or org that sent it
 * @param callerInsertId    — idempotency key
 */
export async function notifyContractSent({
  recipientUserId,
  recipientEmail,
  contractId,
  contractTitle,
  senderName,
  callerInsertId,
}: {
  recipientUserId?: string;
  recipientEmail?: string;
  contractId: string;
  contractTitle: string;
  senderName: string;
  callerInsertId: string;
}): Promise<void> {
  const title = `Contract ready: ${contractTitle}`;
  const body = `${senderName} sent you a contract to review and sign.`;

  if (recipientUserId) {
    await insertNotification({
      user_id: recipientUserId,
      kind: 'contract_sent',
      entity_id: contractId,
      title,
      body,
      payload: { contract_title: contractTitle, sender_name: senderName },
      source_key: `${callerInsertId}:contract_sent:${recipientUserId}`,
    });

    const email = await getUserEmail(recipientUserId);
    if (email) {
      await sendRinkEmail(
        email,
        title,
        `<p>${body}</p><p><a href="https://rinkstop.com/dashboard/rink-contracts/${contractId}/sign">Review and sign</a></p>`,
        body,
      );
    }
  } else if (recipientEmail) {
    // No linked user — send to direct email
    await sendRinkEmail(
      recipientEmail,
      title,
      `<p>${body}</p><p><a href="https://rinkstop.com">Sign in to review</a></p>`,
      body,
    );
  }
}

/**
 * notifyContractSigned
 *
 * Sent to: both parties (rink owner + counterparty)
 * Triggered when: contract is signed by the second party
 *
 * @param rinkOwnerUserId   — rink admin
 * @param counterpartyUserId — other signer
 * @param counterpartyEmail  — fallback if counterparty has no account
 * @param contractId         — rink_contracts UUID
 * @param contractTitle      — display name
 * @param signedByName      — name of the person who just signed
 * @param callerInsertId    — idempotency key
 */
export async function notifyContractSigned({
  rinkOwnerUserId,
  counterpartyUserId,
  counterpartyEmail,
  contractId,
  contractTitle,
  signedByName,
  callerInsertId,
}: {
  rinkOwnerUserId?: string;
  counterpartyUserId?: string;
  counterpartyEmail?: string;
  contractId: string;
  contractTitle: string;
  signedByName: string;
  callerInsertId: string;
}): Promise<void> {
  const title = `Contract signed: ${contractTitle}`;
  const body = `${signedByName} has signed "${contractTitle}". The contract is now complete.`;

  // Notify rink owner
  if (rinkOwnerUserId) {
    await insertNotification({
      user_id: rinkOwnerUserId,
      kind: 'contract_signed',
      entity_id: contractId,
      title,
      body,
      payload: { contract_title: contractTitle, signed_by: signedByName },
      source_key: `${callerInsertId}:contract_signed:owner:${rinkOwnerUserId}`,
    });
    const email = await getUserEmail(rinkOwnerUserId);
    if (email) {
      await sendRinkEmail(email, title, `<p>${body}</p>`, body);
    }
  }

  // Notify counterparty
  if (counterpartyUserId) {
    await insertNotification({
      user_id: counterpartyUserId,
      kind: 'contract_signed',
      entity_id: contractId,
      title,
      body,
      payload: { contract_title: contractTitle, signed_by: signedByName },
      source_key: `${callerInsertId}:contract_signed:counterparty:${counterpartyUserId}`,
    });
    const email = await getUserEmail(counterpartyUserId);
    if (email) {
      await sendRinkEmail(email, title, `<p>${body}</p>`, body);
    }
  } else if (counterpartyEmail) {
    await sendRinkEmail(counterpartyEmail, title, `<p>${body}</p>`, body);
  }
}

/**
 * notifyMessageReceived
 *
 * Sent to: the other participant in a thread (not the sender)
 * Triggered when: a new message is posted to a rink thread
 *
 * @param recipientUserId  — the person receiving the notification
 * @param threadId         — rink_threads UUID
 * @param senderName       — display name of the sender
 * @param preview          — first ~80 chars of message body
 * @param callerInsertId   — idempotency key
 */
export async function notifyMessageReceived({
  recipientUserId,
  threadId,
  senderName,
  preview,
  callerInsertId,
}: {
  recipientUserId: string;
  threadId: string;
  senderName: string;
  preview: string;
  callerInsertId: string;
}): Promise<void> {
  const title = `New message from ${senderName}`;
  const body = preview.length > 80 ? preview.slice(0, 80) + '…' : preview;

  await insertNotification({
    user_id: recipientUserId,
    kind: 'message_received',
    entity_id: threadId,
    title,
    body,
    payload: { sender_name: senderName },
    source_key: `${callerInsertId}:message_received:${recipientUserId}`,
  });

  const email = await getUserEmail(recipientUserId);
  if (email) {
    await sendRinkEmail(
      email,
      title,
      `<p>${body}</p><p><a href="https://rinkstop.com/dashboard/rink-connections">View message</a></p>`,
      body,
    );
  }
}
