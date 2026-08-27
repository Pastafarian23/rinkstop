import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const entry = {
      ts: new Date().toISOString(),
      ua: request.headers.get('user-agent') ?? null,
      payload,
    };
    console.log('[profile-page-error]', JSON.stringify(entry));
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
