// src/app/api/owner/rinks/[id]/programming/import/route.ts
//
// WS32 - Bulk CSV import for rink programming.
//
//   POST /api/owner/rinks/[id]/programming/import
//     body: { rows: Array<Record<string, unknown>> }
//     resp: { inserted: number, failed: Array<{ row: number, error: string }> }
//
// The client form does its own validation (CSV parse + per-row checks) before
// posting, but we re-validate server-side because:
//   1. Defense in depth — client-only checks can be bypassed.
//   2. Enum membership + cross-field invariants (end > start, age_min <= age_max)
//      are easier to express here against the existing validateCreateBody logic.
//   3. We want the dataset to support partial success: a malformed row shouldn't
//      block well-formed rows from being inserted.
//
// Validated rows are bulk-inserted in a single transaction so the operator
// gets atomicity per submit (all-or-nothing for the valid subset; invalid
// rows are reported back with row numbers).
//
// Auth: requireRinkOwner (Clerk session + approved rink claim). Same gate
// the rest of the owner routes use.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stricter rate limit on this path — bulk writes are heavier per hit than a
// single insert. 10/min per IP is plenty for an operator batch-uploading
// their weekly schedule; brute-force attempts get throttled at the source.
const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

const SKILL_LEVELS = new Set(['all','beginner','intermediate','advanced','elite']);
const GENDERS = new Set(['all','boys','girls','men','women','coed']);
const STATUSES = new Set(['draft','published','archived']);

// Activity types must match the rink_activity_type enum in Supabase. Listing
// them explicitly here (instead of querying pg_enum at request time) keeps
// the API offline-tolerant — the source of truth lives in the migration
// 2026-08-04_rink_programming_and_events.sql. If you add a new value to the
// enum, mirror it here.
const ACTIVITY_TYPES = new Set([
  'public_skate','stick_and_puck','learn_to_skate','open_hockey','pickup','drop_in',
  'youth_league','adult_league','shinny','rat_hockey','broomball','figure_skating',
  'tournament','camp','tryout','showcase','other',
]);

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

interface ValidationFailure {
  row: number;
  error: string;
}

interface ValidatedRow {
  rink_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity_type: string;
  skill_level: string;
  gender: string;
  age_min: number | null;
  age_max: number | null;
  price_cents: number | null;
  currency: string;
  capacity: number | null;
  description: string | null;
  gear_rules: string | null;
  status: string;
}

// Validate one row from the CSV payload. Mirrors validateCreateBody in the
// existing /api/owner/rinks/[id]/programming route but tolerates empty
// optional fields (CSV may not include every column). Returns a fully-typed
// ValidatedRow on success, or a string error on failure.
function validateRow(raw: unknown, rowNumber: number): { ok: ValidatedRow } | { err: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { err: `row ${rowNumber}: must be a JSON object.` };
  }
  const r = raw as Record<string, unknown>;

  // day_of_week: 0-6 integer. Accept numeric strings from CSV parsing.
  if (r.day_of_week === undefined || r.day_of_week === null || r.day_of_week === '') {
    return { err: `row ${rowNumber}: day_of_week is required (0=Sun..6=Sat or day name).` };
  }
  const dowNum = typeof r.day_of_week === 'number' ? r.day_of_week : Number(r.day_of_week);
  if (!Number.isInteger(dowNum) || dowNum < 0 || dowNum > 6) {
    return { err: `row ${rowNumber}: day_of_week must be 0-6, got ${JSON.stringify(r.day_of_week)}.` };
  }

  // start_time / end_time — HH:MM (HH:MM:SS also accepted).
  if (!r.start_time || typeof r.start_time !== 'string' || !TIME_RE.test(r.start_time)) {
    return { err: `row ${rowNumber}: start_time must be HH:MM, got ${JSON.stringify(r.start_time)}.` };
  }
  if (!r.end_time || typeof r.end_time !== 'string' || !TIME_RE.test(r.end_time)) {
    return { err: `row ${rowNumber}: end_time must be HH:MM, got ${JSON.stringify(r.end_time)}.` };
  }
  // Normalize HH:MM:SS → HH:MM for storage (TIME column accepts both; HH:MM is canonical).
  const normStart = r.start_time.slice(0, 5);
  const normEnd = r.end_time.slice(0, 5);
  if (normStart >= normEnd) {
    return { err: `row ${rowNumber}: end_time (${normEnd}) must be after start_time (${normStart}).` };
  }

  // activity_type — must be one of the enum values.
  if (!r.activity_type || typeof r.activity_type !== 'string') {
    return { err: `row ${rowNumber}: activity_type is required.` };
  }
  const activityType = r.activity_type.trim();
  if (!ACTIVITY_TYPES.has(activityType)) {
    return { err: `row ${rowNumber}: activity_type "${activityType}" not recognized.` };
  }

  // skill_level — default 'all'.
  const skillLevel = (r.skill_level ?? 'all').toString();
  if (!SKILL_LEVELS.has(skillLevel)) {
    return { err: `row ${rowNumber}: skill_level "${skillLevel}" not recognized.` };
  }

  // gender — default 'all'.
  const gender = (r.gender ?? 'all').toString();
  if (!GENDERS.has(gender)) {
    return { err: `row ${rowNumber}: gender "${gender}" not recognized.` };
  }

  // age_min / age_max — optional smallints.
  function parseIntOrNull(v: unknown): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 99) return Number.NaN;
    return n;
  }
  const ageMin = parseIntOrNull(r.age_min);
  if (Number.isNaN(ageMin)) return { err: `row ${rowNumber}: age_min must be 0-99 or empty.` };
  const ageMax = parseIntOrNull(r.age_max);
  if (Number.isNaN(ageMax)) return { err: `row ${rowNumber}: age_max must be 0-99 or empty.` };
  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    return { err: `row ${rowNumber}: age_min (${ageMin}) must be <= age_max (${ageMax}).` };
  }

  // price_cents — optional non-negative integer (or "5.00" style which we
  // convert to cents). Accepts either a number (already cents) or a string
  // that looks like a dollar amount so CSVs from Excel aren't confusing.
  let priceCents: number | null = null;
  if (r.price_cents !== undefined && r.price_cents !== null && r.price_cents !== '') {
    if (typeof r.price_cents === 'number') {
      // Heuristic: if the value has a decimal component under 100, treat it
      // as dollars (CSVs almost always export "12.50" not "1250"). If it's
      // an integer >= 100 with no decimal, treat it as cents already.
      if (!Number.isInteger(r.price_cents) && Math.abs(r.price_cents) < 10000) {
        priceCents = Math.round(r.price_cents * 100);
      } else {
        priceCents = r.price_cents;
      }
    } else {
      const parsed = Number(String(r.price_cents).replace(/[$,\s]/g, ''));
      if (!Number.isFinite(parsed) || parsed < 0) {
        return { err: `row ${rowNumber}: price_cents must be a number (got ${JSON.stringify(r.price_cents)}).` };
      }
      // If it has a decimal, it's dollars; otherwise it's cents.
      const s = String(r.price_cents).trim();
      if (s.includes('.') || s.includes(',')) {
        priceCents = Math.round(parsed * 100);
      } else {
        priceCents = Math.round(parsed);
      }
    }
    if (priceCents < 0) {
      return { err: `row ${rowNumber}: price_cents must be non-negative.` };
    }
  }

  // currency — default 'USD', must be a 3-letter code.
  const currency = ((r.currency ?? 'USD').toString() || 'USD').toUpperCase().slice(0, 3);

  // capacity — optional positive integer.
  let capacity: number | null = null;
  if (r.capacity !== undefined && r.capacity !== null && r.capacity !== '') {
    const capNum = typeof r.capacity === 'number' ? r.capacity : Number(r.capacity);
    if (!Number.isInteger(capNum) || capNum <= 0) {
      return { err: `row ${rowNumber}: capacity must be a positive integer (got ${JSON.stringify(r.capacity)}).` };
    }
    capacity = capNum;
  }

  // description, gear_rules — optional strings.
  const description = r.description != null && r.description !== '' ? String(r.description) : null;
  const gearRules = r.gear_rules != null && r.gear_rules !== '' ? String(r.gear_rules) : null;

  // status — default 'draft'. Operators usually want to review before
  // publishing, and bulk-uploading directly to published is a footgun.
  const status = (r.status ?? 'draft').toString();
  if (!STATUSES.has(status)) {
    return { err: `row ${rowNumber}: status "${status}" not recognized.` };
  }

  return {
    ok: {
      rink_id: '', // filled in by caller
      day_of_week: dowNum,
      start_time: normStart,
      end_time: normEnd,
      activity_type: activityType,
      skill_level: skillLevel,
      gender,
      age_min: ageMin,
      age_max: ageMax,
      price_cents: priceCents,
      currency,
      capacity,
      description,
      gear_rules: gearRules,
      status,
    },
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`owner-programming-import:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;
  const rinkId = owner.owner.rinkId;

  let body: { rows?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON.' }, { status: 400 });
  }

  const rawRows = Array.isArray(body.rows) ? body.rows : null;
  if (!rawRows) {
    return NextResponse.json({ error: 'Body must include a "rows" array.' }, { status: 400 });
  }

  // Cap payload size so a malicious client can't dump 100k rows in one call.
  // 10k is way over the realistic weekly-schedule size (~50-200 rows even
  // for big multi-rink operators).
  if (rawRows.length > 10000) {
    return NextResponse.json(
      { error: `Too many rows in a single import (${rawRows.length}). Max 10,000.` },
      { status: 400 },
    );
  }
  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'No rows provided.' }, { status: 400 });
  }

  // Validate each row. Failures are collected; valid rows are kept for the
  // bulk insert below.
  const validRows: ValidatedRow[] = [];
  const failed: ValidationFailure[] = [];
  rawRows.forEach((raw, idx) => {
    const result = validateRow(raw, idx + 1); // 1-indexed for humans
    if ('err' in result) {
      failed.push({ row: idx + 1, error: result.err });
    } else {
      validRows.push({ ...result.ok, rink_id: rinkId });
    }
  });

  if (validRows.length === 0) {
    // Nothing valid — don't even touch the DB; report errors.
    return NextResponse.json(
      {
        inserted: 0,
        attempted: rawRows.length,
        failed,
      },
      { status: 200 },
    );
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('rink_programming')
    .insert(validRows)
    .select('id');

  if (insertError) {
    console.error('[owner-programming-import] bulk insert failed', insertError);
    return NextResponse.json(
      { error: 'Database insert failed. No rows were created.', detail: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    inserted: inserted?.length ?? validRows.length,
    attempted: rawRows.length,
    failed,
  });
}