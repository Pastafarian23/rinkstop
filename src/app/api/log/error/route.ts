import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * POST /api/log/error
 *
 * Captures client-side errors so the team can actually see what's
 * throwing in real browsers (not just headless chromium). Used by:
 *   - src/app/global-error.tsx (root layout boundary)
 *   - src/app/error.tsx (route-level boundary)
 *
 * 2026-08-12: added in response to user report of "Something went
 * wrong" appearing on many pages in real browsers but NOT reproducing
 * in headless chromium. The previous error boundaries only console.error'd
 * the error — which is invisible to the server. This endpoint writes
 * errors to a file the team can tail.
 *
 * Storage: appends to /tmp/rinkstop-error-log.jsonl. Vercel's serverless
 * runtime has a writable /tmp. The team can read the file via
 * `vercel exec` or `vercel logs`.
 *
 * Why a file (not a DB table or external service): the user is
 * reproducing the bug intermittently. We need to capture the error
 * the moment it happens without external dependencies. A file is the
 * simplest, most reliable way.
 */

const LOG_PATHS = [
  '/tmp/rinkstop-error-log.jsonl',
  path.join(process.cwd(), '.error-log.jsonl'),
];

async function appendError(event: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
  // Try each path in order, use the first writable one
  for (const p of LOG_PATHS) {
    try {
      // Ensure parent dir exists for absolute paths
      if (p.startsWith('/')) {
        await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
      }
      await fs.appendFile(p, line, 'utf8');
      return p;
    } catch {
      // try next
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    // Bad JSON — log the raw text
    body = { raw: '<unparseable>' };
  }

  // Don't log our own logging failures (would cause infinite recursion)
  if (typeof body.url === 'string' && body.url.includes('/api/log/error')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const written = await appendError(body);

  // Always also log to server console for visibility
  console.error('[client-error]', JSON.stringify({
    url: body.url,
    message: body.message,
    digest: body.digest,
    ts: body.ts,
    log_path: written,
  }));

  return NextResponse.json({ ok: true, log_path: written });
}
