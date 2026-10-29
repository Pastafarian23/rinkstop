// src/lib/listing-submission-to-listing.ts
//
// Turns an approved `/add-listing` submission into a real directory listing.
//
// WHY THIS EXISTS (2026-10-29, Arnel's revenue audit):
//   The approve endpoint (`/api/admin/intake/listing-submission/[id]`) only
//   flipped `status` — its own comment said *"it does NOT create the actual
//   rink/team/league record"*. Every approved submission therefore needed a
//   SECOND manual step in /admin/rinks/new (or /teams/new, /leagues/new).
//   That two-step gap is why both real leads (Slough Satans, submitted
//   2026-10-02; GLXY Cup, 2026-10-21) sat unapproved and unanswered for
//   weeks. The friction is the bug.
//
// WHAT IT DOES:
//   - Creates the actual rink/team/league row from the submission payload.
//   - Looks for an EXISTING listing with the same name (+ city when present)
//     and returns it as a MATCH instead of creating a duplicate. We have 304
//     legitimate same-name teams in the directory (same club name in
//     different leagues), so a naive duplicate-by-name guard would be
//     actively harmful. Matching on name AND city is the safe rule.
//   - Never auto-claims and never auto-verifies. The created listing is
//     `claimable: true` and `verification_tier: 'unverified'` — the submitter
//     asked to be LISTED, not to hand us control of their listing. This is
//     the "not too pushy" rule encoded in code.
//
// IDEMPOTENCY:
//   `listing_submissions.notes` carries the created listing id. If a note
//   already references a rink/team/league id, that listing is returned
//   as-is instead of creating a second one. Approving twice is safe.

import { supabaseAdmin } from '@/lib/supabase';
import { slugify, uniqueSlug } from '@/lib/slug';

export type ListingType = 'rink' | 'team' | 'league' | 'player' | 'tournament' | 'other';

export interface SubmissionRow {
  id: string;
  listing_type: string;
  name: string;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  email: string;
  /** Carries the created listing id once a listing exists (idempotency). */
  notes?: string | null;
  created_at?: string | null;
}

export interface CreateListingResult {
  ok: boolean;
  /** 'created' = new row inserted. 'matched' = an existing listing already covers this. */
  outcome: 'created' | 'matched';
  entity: 'rink' | 'team' | 'league' | null;
  listingId: string | null;
  listingSlug: string | null;
  listingUrl: string | null;
  /** Set when the submission type has no directory table (player/tournament/other). */
  skipReason?: string;
  error?: string;
}

/** Directory tables we know how to create. */
const CREATEABLE: Record<string, 'rink' | 'team' | 'league'> = {
  rink: 'rink',
  team: 'team',
  league: 'league',
};

/** Where a created listing lives, for building the admin-facing link. */
const URL_PREFIX: Record<'rink' | 'team' | 'league', string> = {
  rink: '/directory/rinks/',
  team: '/directory/teams/',
  league: '/directory/leagues/',
};

/**
 * Find an existing listing that already covers this submission.
 *
 * Match rule: same normalized name AND same normalized city (when the
 * submission has a city). Deliberately NOT name-only — see the docblock.
 */
async function findExistingMatch(
  entity: 'rink' | 'team' | 'league',
  name: string,
  city: string | null,
): Promise<{ id: string; slug: string } | null> {
  const table = entity === 'rink' ? 'rinks' : entity === 'team' ? 'teams' : 'leagues';
  const targetName = name.trim().toLowerCase();
  const targetCity = (city || '').trim().toLowerCase();

  // Pull the small candidate set by name first, then narrow by city in JS.
  // PostgREST ilike on a normalized column would need a functional index we
  // do not have, and the candidate set per name is tiny.
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('id, name, slug, city')
    .ilike('name', name.trim());

  if (error || !data || data.length === 0) return null;

  const matches = (data as Array<{ id: string; name: string; slug: string; city: string | null }>).filter(
    (row) => {
      if ((row.name || '').trim().toLowerCase() !== targetName) return false;
      if (!targetCity) return true; // submission has no city — name match is enough
      return (row.city || '').trim().toLowerCase() === targetCity;
    },
  );

  if (matches.length === 0) return null;
  // Prefer an active listing if there are several.
  const chosen = matches[0];
  return { id: chosen.id, slug: chosen.slug };
}

/**
 * Read the listing id already recorded in a submission's notes, if any.
 * Used to make approval idempotent.
 */
export function parseLinkedListingId(notes: string | null): {
  entity: 'rink' | 'team' | 'league';
  id: string;
} | null {
  if (!notes) return null;
  // Matches: "Listing created from this submission: rinks/<uuid>" and
  //          "Venue already listed: ... (rinks/<uuid>".
  const re = /(rinks|teams|leagues)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const m = notes.match(re);
  if (!m) return null;
  const entity = m[1].toLowerCase() as 'rink' | 'team' | 'league';
  return { entity, id: m[2] };
}

export async function createListingFromSubmission(
  submission: SubmissionRow,
): Promise<CreateListingResult> {
  const type = (submission.listing_type || '').toLowerCase();
  const entity = CREATEABLE[type];

  if (!entity) {
    return {
      ok: true,
      outcome: 'matched',
      entity: null,
      listingId: null,
      listingSlug: null,
      listingUrl: null,
      skipReason: `No directory table for listing_type="${submission.listing_type}". ${
        entity === null && type === 'tournament'
          ? 'Tournaments/events have no table yet — create it manually or add one.'
          : 'Create it manually.'
      }`,
    };
  }

  // 1. Idempotency — did we already create a listing for this submission?
  //    The notes column carries the listing id once a listing exists.
  const existingLink = parseLinkedListingId((submission as any).notes ?? null);
  if (existingLink) {
    return {
      ok: true,
      outcome: 'matched',
      entity: existingLink.entity,
      listingId: existingLink.id,
      listingSlug: null,
      listingUrl: null,
      skipReason: 'A listing is already recorded for this submission.',
    };
  }

  // 2. Does an existing listing already cover it?
  const existing = await findExistingMatch(entity, submission.name, submission.city);
  if (existing) {
    return {
      ok: true,
      outcome: 'matched',
      entity,
      listingId: existing.id,
      listingSlug: existing.slug,
      listingUrl: `${URL_PREFIX[entity]}${existing.slug}`,
      skipReason:
        'An existing listing already matches this name and city. Merge the submission details into it rather than creating a second one.',
    };
  }

  // 3. Create it.
  const table = entity === 'rink' ? 'rinks' : entity === 'team' ? 'teams' : 'leagues';
  const baseSlug = slugify(
    [submission.name, submission.city].filter(Boolean).join(' '),
  );

  const slug = await uniqueSlug(baseSlug, async (candidate) => {
    const { count } = await supabaseAdmin
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('slug', candidate);
    return (count ?? 0) > 0;
  });

  // ── Per-entity field maps ────────────────────────────────────────────────
  // The three tables have DIFFERENT schemas. Writing a shared field bag
  // breaks on the first missing column:
  //   rinks   has email, notes, source, verification_tier, status
  //   teams   has NO email / notes / source / verification_tier, and has a
  //           CHECK (teams_deactivation_consistent) that requires
  //           is_active=true => deactivated_at IS NULL AND merged_into_id IS NULL
  //   leagues has NO email / notes / source, and a CHECK on `level`
  // So each entity gets only the columns it actually has.
  //
  // Submission provenance (which submission created this) is written to the
  // `notes`/`source` columns where they exist. For teams/leagues, which
  // have neither, the provenance lives on the SUBMISSION row (notes column)
  // and in admin_audit_log — that is enough for the audit trail.
  const sourceNote = `add-listing submission ${submission.id}${submission.created_at ? ` (${submission.created_at})` : ''}`;

  const baseFields = {
    name: submission.name.trim(),
    slug,
    website_url: submission.website || null,
    is_active: true,
    claimable: true,
  };

  let insertedId: string | null = null;
  let insertError: string | null = null;

  if (entity === 'rink') {
    const { data, error } = await supabaseAdmin
      .from('rinks')
      .insert({
        ...baseFields,
        city: submission.city || null,
        country: submission.country || null,
        email: submission.email,
        notes: submission.description || null,
        source: sourceNote,
        // NOT pushy: the submitter asked to be listed, not to be verified.
        verification_tier: 'unverified',
        status: 'open',
      })
      .select('id, slug')
      .single();
    if (error) insertError = error.message;
    else insertedId = (data as { id: string }).id;
  } else if (entity === 'team') {
    // teams: no email/notes/source/verification_tier columns. deactivated_at
    // and merged_into_id must stay NULL for is_active=true (CHECK constraint).
    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert({
        name: baseFields.name,
        slug: baseFields.slug,
        city: submission.city || null,
        country: submission.country || null,
        website_url: baseFields.website_url,
        is_active: true,
        claimable: true,
        deactivated_at: null,
        merged_into_id: null,
      })
      .select('id, slug')
      .single();
    if (error) insertError = error.message;
    else insertedId = (data as { id: string }).id;
  } else {
    // leagues: no email/notes/source columns; `level` is CHECK-constrained
    // so it is left NULL (unknown) rather than guessed.
    const { data, error } = await supabaseAdmin
      .from('leagues')
      .insert({
        name: baseFields.name,
        slug: baseFields.slug,
        description: submission.description || null,
        country: submission.country || null,
        website_url: baseFields.website_url,
        is_active: true,
        claimable: true,
        merged_into_id: null,
      })
      .select('id, slug')
      .single();
    if (error) insertError = error.message;
    else insertedId = (data as { id: string }).id;
  }

  if (insertError || !insertedId) {
    return {
      ok: false,
      outcome: 'created',
      entity,
      listingId: null,
      listingSlug: null,
      listingUrl: null,
      error: insertError || 'insert returned no id',
    };
  }

  return {
    ok: true,
    outcome: 'created',
    entity,
    listingId: insertedId,
    listingSlug: slug,
    listingUrl: `${URL_PREFIX[entity]}${slug}`,
  };
}
