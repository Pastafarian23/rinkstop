/**
 * GET /api/scoresheet-qr/[fixtureId]
 *
 * Returns the QR-code SVG for a fixture's scoresheet deep link.
 * Cached 1 hour per fixture. Returns 404 if the fixture doesn't exist,
 * is not in `scheduled` status, or has qr_enabled=false.
 */

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ fixtureId: string }> }
): Promise<NextResponse> {
  const { fixtureId } = await ctx.params;
  if (!fixtureId || !/^[0-9a-f-]{36}$/i.test(fixtureId)) {
    return NextResponse.json({ error: 'Invalid fixture id' }, { status: 400 });
  }

  const sb = getSupabase();
  const { data: fixture, error } = await sb
    .from('fixtures')
    .select('id, status')
    .eq('id', fixtureId)
    .maybeSingle();
  if (error || !fixture) {
    return placeholderResponse('NOT-FOUND');
  }
  if ((fixture as any).status !== 'scheduled') {
    return placeholderResponse('INACTIVE');
  }

  // Check the qr_enabled override.
  const { data: settings } = await sb
    .from('fixture_scoresheet_settings')
    .select('qr_enabled')
    .eq('fixture_id', fixtureId)
    .maybeSingle();
  if (settings && (settings as any).qr_enabled === false) {
    return placeholderResponse('OPT-OUT');
  }

  const deepLink = `https://scoresheet.rinkstop.com/new?fixture=${encodeURIComponent(fixtureId)}`;
  try {
    const svg = await QRCode.toString(deepLink, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#041E42', light: '#FFFFFF' },
      width: 256,
    });
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Qr-Target': deepLink,
      },
    });
  } catch (err) {
    console.error('[scoresheet-qr] encode error:', err);
    return placeholderResponse('UNAVAILABLE');
  }
}

function placeholderResponse(label: string): NextResponse {
  const safe = label.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return c;
    }
  });
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, system-ui, sans-serif" font-size="14" fill="#041E42">${safe}</text>
</svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
