import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha1', secret).update(rawBody, 'utf8').digest('hex');
  return safeEqual(signature, expected);
}

export async function POST(request: Request) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }

  const signature = request.headers.get('x-vercel-signature');
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  let payload: {
    type?: string;
    createdAt?: number;
    payload?: { target?: string | null; project?: { id?: string } };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  // Vercel webhook envelope puts deployment metadata inside the top-level
  // `payload` field, with `target` and `project` as siblings of
  // `deployment` — NOT nested one level deeper.
  const deployment = payload.payload as
    | { target?: string | null; project?: { id?: string } }
    | undefined;

  if (payload.type !== 'deployment.ready' || deployment?.target !== 'production') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const eventCreatedAt = Number(payload.createdAt || 0);
  if (!eventCreatedAt || Math.abs(Date.now() - eventCreatedAt) > MAX_AGE_MS + MAX_CLOCK_SKEW_MS) {
    return NextResponse.json({ error: 'stale event' }, { status: 400 });
  }

  const projectId = deployment?.project?.id;
  if (process.env.VERCEL_PROJECT_ID && projectId && projectId !== process.env.VERCEL_PROJECT_ID) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'project mismatch' });
  }
  const indexNowSecret = process.env.ADMIN_SECRET;
  if (!indexNowSecret) {
    return NextResponse.json({ error: 'indexnow not configured' }, { status: 503 });
  }

  const internalBase = process.env.INDEXNOW_INTERNAL_URL || new URL(request.url).origin;
  const response = await fetch(new URL('/api/indexnow', internalBase), {
    method: 'POST',
    headers: { 'x-deploy-secret': indexNowSecret },
  });
  const result = await response.json().catch(() => ({}));
  return NextResponse.json({
    ok: response.ok,
    type: payload.type,
    projectId: projectId || null,
    indexNow: result,
  }, { status: response.ok ? 200 : 502 });
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.VERCEL_WEBHOOK_SECRET && process.env.ADMIN_SECRET),
    path: '/api/vercel/indexnow',
  });
}
