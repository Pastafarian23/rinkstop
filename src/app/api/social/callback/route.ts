// /api/social/callback
//
// Telegram callback query handler for the social-draft bot. When Arnel
// taps ✅ / ❌ / ✏ on a draft message, Telegram POSTs a callback_query
// to this endpoint with the inline_keyboard callback_data.
//
// We resolve the callback_data ("social:approve:<post-id>" etc.) to the
// matching social_drafts row, update its status, and acknowledge.
//
// Auth: Telegram sends a secret in X-Telegram-Bot-Api-Secret-Token
// header that we set via setWebhook. We verify this against
// TELEGRAM_CALLBACK_SECRET to reject spoofed callbacks.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TELEGRAM_API = (token: string, method: string) =>
  `https://api.telegram.org/bot${token}/${method}`;

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  const expected = process.env.TELEGRAM_CALLBACK_SECRET;

  // Reject spoofed requests unless secret matches.
  // (If no secret configured yet, we only accept requests that include one.)
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  const cq = body?.callback_query;
  if (!cq) {
    return NextResponse.json({ ok: true }); // Other update types (ignored)
  }

  const data: string = cq.data || '';
  const match = data.match(/^social:(approve|reject|edit):([0-9a-f-]+)$/);
  if (!match) {
    return NextResponse.json({ ok: true, ignored: 'unknown callback_data' });
  }
  const action = match[1];
  const postId = match[2];

  // Find draft for this post.
  const { data: draft, error: findErr } = await supabaseAdmin
    .from('social_drafts')
    .select('id, status, message_id, article_id')
    .eq('article_id', postId)
    .single();

  if (findErr || !draft) {
    await answerCallback(token, cq.id, 'Draft not found');
    return NextResponse.json({ ok: false, error: 'not found' });
  }

  // Only update if still pending (one-way state machine).
  if (draft.status !== 'pending_review') {
    await answerCallback(token, cq.id, `Already ${draft.status}`);
    return NextResponse.json({ ok: true, noop: 'already resolved' });
  }

  const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending_review';

  const { error: updateErr } = await supabaseAdmin
    .from('social_drafts')
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', draft.id);

  if (updateErr) {
    await answerCallback(token, cq.id, 'Update failed');
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  // Edit the original Telegram message so Arnel sees the result inline.
  if (draft.message_id) {
    const label = action === 'approve' ? '✅ Approved' : action === 'reject' ? '❌ Rejected' : '✏ Edit requested';
    await editTelegramMessage(token, {
      chat_id: cq.message?.chat?.id,
      message_id: draft.message_id,
      text: `${cq.message?.text ?? ''}\n\n— ${label} —`,
    });
  }

  await answerCallback(token, cq.id, labelFor(action));
  return NextResponse.json({ ok: true, newStatus });
}

function labelFor(action: string): string {
  if (action === 'approve') return 'Approved. Copy/paste when ready.';
  if (action === 'reject') return 'Rejected. No further action.';
  if (action === 'edit') return 'Edit request received. Agent will rewrite.';
  return 'OK';
}

async function answerCallback(token: string, callbackQueryId: string, text: string) {
  await fetch(TELEGRAM_API(token, 'answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  }).catch(() => {});
}

async function editTelegramMessage(token: string, args: { chat_id: any; message_id: number; text: string }) {
  await fetch(TELEGRAM_API(token, 'editMessageText'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: args.chat_id,
      message_id: args.message_id,
      text: args.text,
    }),
  }).catch(() => {});
}
