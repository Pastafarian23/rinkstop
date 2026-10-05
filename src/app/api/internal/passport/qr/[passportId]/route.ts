/**
 * GET /api/internal/passport/qr/[passportId]
 *
 * Returns the QR-code SVG for a Passport. Self-contained — no @/lib/passport
 * imports — so the route module can't fail to load.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

const FALLBACK_SVG = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="14" fill="#041E42">QR temporarily unavailable</text></svg>';

function svg200(svg: string, qrId?: string): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  };
  if (qrId) headers['X-Qr-Identifier'] = qrId;
  return new NextResponse(svg, { status: 200, headers });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function handle(
  _req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  const fallback = svg200(FALLBACK_SVG);
  try {
    const { passportId } = await ctx.params;
    if (!passportId || typeof passportId !== 'string') return fallback;

    const supabase = getSupabaseAdmin();
    if (!supabase) return fallback;

    const { data: row, error } = await supabase
      .from('passports')
      .select('qr_identifier, status')
      .eq('passport_id', passportId)
      .maybeSingle();

    if (error || !row || !row.qr_identifier) return fallback;

    const svg = await QRCode.toString(row.qr_identifier, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#041E42', light: '#FFFFFF' },
      width: 256,
    });
    return svg200(svg, row.qr_identifier);
  } catch {
    return fallback;
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  return handle(req, ctx);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ passportId: string }> }
): Promise<NextResponse> {
  return handle(req, ctx);
}