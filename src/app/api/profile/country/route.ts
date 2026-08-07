/**
 * POST /api/profile/country
 *
 * Upserts the caller's profile_country_context row. Used by the country
 * picker on /dashboard/profile so the federation dropdown on
 * /dashboard/passport/federation can filter by country.
 *
 * Body:
 *   {
 *     primary_country: string,      // ISO 3166-1 alpha-2 (e.g. "US")
 *     additional_countries?: string[]  // optional; defaults to []
 *   }
 *
 * Auth: Clerk session required. RLS enforces user_id = auth.uid()::text,
 * but we also set user_id explicitly to avoid any cross-user leak risk.
 *
 * Source: 'dashboard' (vs 'signup' / 'admin' / 'import').
 *
 * Idempotent — same payload is a no-op write (updated_at bumps either way).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 2-letter ISO 3166-1 alpha-2 codes. We don't enumerate all 250 —
// 84 IIHF members is the realistic universe for hockey. Anything outside
// this is rejected so a typo doesn't silently land.
const ALLOWED_PRIMARY = new Set([
  'AD', 'AE', 'AM', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BE', 'BG', 'BH', 'BO',
  'BR', 'BS', 'BY', 'CA', 'CH', 'CL', 'CN', 'CO', 'CR', 'CU', 'CZ', 'DE',
  'DK', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ES', 'FI', 'FO', 'FR', 'GB', 'GE',
  'GL', 'GR', 'GT', 'HK', 'HR', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ', 'IR',
  'IS', 'IT', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KR', 'KW', 'KZ', 'LB',
  'LI', 'LK', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MK', 'MM',
  'MN', 'MO', 'MT', 'MX', 'MY', 'NG', 'NL', 'NO', 'NP', 'NZ', 'OM', 'PA',
  'PE', 'PH', 'PK', 'PL', 'PR', 'PT', 'PY', 'QA', 'RO', 'RS', 'RU', 'SA',
  'SE', 'SG', 'SI', 'SK', 'TH', 'TN', 'TR', 'TW', 'UA', 'US', 'UY', 'UZ',
  'VE', 'VN', 'YE', 'ZA',
]);

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to save country.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const primaryRaw = body.primary_country;
  const additionalRaw = body.additional_countries;

  if (typeof primaryRaw !== 'string' || primaryRaw.length === 0) {
    return NextResponse.json(
      { error: 'primary_country is required.' },
      { status: 400 },
    );
  }

  const primary = primaryRaw.toUpperCase();

  if (!ALLOWED_PRIMARY.has(primary)) {
    return NextResponse.json(
      {
        error: `Unsupported country code "${primary}". Pick one of the listed options.`,
      },
      { status: 400 },
    );
  }

  // additional_countries is optional. If absent, default to []. Validate each
  // entry; drop anything not on the allowlist (defense in depth) and the
  // primary itself (avoids duplicate work; the view doesn't dedupe).
  let additional: string[] = [];
  if (Array.isArray(additionalRaw)) {
    additional = additionalRaw
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.toUpperCase())
      .filter((v) => v.length === 2 && ALLOWED_PRIMARY.has(v) && v !== primary);

    // Dedup (preserves first-seen order).
    const seen = new Set<string>();
    additional = additional.filter((c) => {
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });

    // Cap at 16 — sane upper bound for residency + dual-citizenship cases.
    if (additional.length > 16) {
      additional = additional.slice(0, 16);
    }
  }

  // upsert on user_id (primary key). Captured_at is preserved on update
  // because we don't include it in the payload — only source + updated_at
  // bump via the trigger.
  const { data, error } = await supabaseAdmin
    .from('profile_country_context')
    .upsert(
      {
        user_id: userId,
        primary_country: primary,
        additional_countries: additional,
        source: 'dashboard',
      },
      { onConflict: 'user_id' },
    )
    .select('user_id, primary_country, additional_countries, captured_at, updated_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `Save failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, row: data });
}