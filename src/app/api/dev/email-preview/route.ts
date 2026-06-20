/**
 * Dev-only route: send 3 preview emails (welcome, team-post, connection-request)
 * to a specified recipient, gated by an env var token.
 *
 * GET /api/dev/email-preview?to=email@example.com&token=XYZ
 *
 * Used by Arnel to see the actual emails landing in his inbox.
 * Token is stored in Vercel env as EMAIL_PREVIEW_TOKEN.
 *
 * NOT exposed in production: 404 unless ENABLE_EMAIL_PREVIEW=1 is also set.
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (process.env.ENABLE_EMAIL_PREVIEW !== '1') {
    return NextResponse.json({ error: 'Not enabled' }, { status: 404 });
  }

  const url = new URL(request.url);
  const to = url.searchParams.get('to');
  const token = url.searchParams.get('token');

  if (!to || !token || token !== process.env.EMAIL_PREVIEW_TOKEN) {
    return NextResponse.json({ error: 'Missing to or invalid token' }, { status: 401 });
  }

  const results = [];

  // 1. Welcome template
  const r1 = await sendEmail({
    to,
    subject: '[preview] Welcome to RinkStop',
    template: 'welcome',
    data: { displayName: 'Arnel', username: 'pastafarian' },
    tag: 'preview-welcome',
  });
  results.push({ template: 'welcome', ok: r1.ok, messageId: r1.messageId, error: r1.error });

  // 2. Team post template (realistic scenario)
  const r2 = await sendEmail({
    to,
    subject: '[preview] New team post — Chicago Blackhawks',
    template: 'team-post',
    data: {
      teamName: 'Chicago Blackhawks',
      teamSlug: 'chicago-blackhawks',
      postKind: 'result',
      title: 'Win vs Toronto 4–2',
      body: 'Goals by Kane, Toews, Kane, Saad. Three stars: Crawford, Kane, Keith.',
      authorName: 'Coach Q',
    },
    tag: 'preview-team-post',
  });
  results.push({ template: 'team-post', ok: r2.ok, messageId: r2.messageId, error: r2.error });

  // 3. Connection request template
  const r3 = await sendEmail({
    to,
    subject: '[preview] Someone wants to connect',
    template: 'connection-request',
    data: {
      requesterName: 'Test User',
      requesterUsername: 'testuser',
      connectionId: '00000000-0000-0000-0000-000000000000',
    },
    tag: 'preview-connection',
  });
  results.push({ template: 'connection-request', ok: r3.ok, messageId: r3.messageId, error: r3.error });

  const allOk = results.every(r => r.ok);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 500 });
}