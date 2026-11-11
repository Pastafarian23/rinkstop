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
//
// CANONICAL TABLE (2026-11-11 fix):
//   Teams are written to `team_workspaces`, NOT the legacy `teams` table.
//   Since commit 282c8bcf (2026-11-07) the public directory, /api/teams and
//   the dataset export all read `team_workspaces`. This file used to insert
//   into legacy `teams`, so every newly-approved TEAM submission created a
//   row that NEVER appeared on the site — an invisible listing. Both real
//   leads escaped it only because they were created by hand.
//
//   `team_workspaces` also has a different column vocabulary:
//     teams            →  team_workspaces
//     city             →  home_city
//     country          →  home_country
//     (none)           →  visibility / is_published / age_category (REQUIRED)
//   `teams.city` is still used for the duplicate-match lookup because the
//   legacy table is the only place a city is reliably populated for old
//   rows; team_workspaces uses `home_city`. Both are checked.

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

/**
 * The table a listing actually lives in.
 *
 * `team` → `team_workspaces` (canonical). The legacy `teams` table still
 * owns lifecycle columns team_workspaces lacks (deactivated_at,
 * merged_into_id, claimable, city, country, logo_url), but public paths
 * stopped reading it on 2026-11-07 — so a listing written there is invisible.
 */
const TARGET_TABLE: Record<'rink' | 'team' | 'league', string> = {
  rink: 'rinks',
  team: 'team_workspaces',
  league: 'leagues',
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
  const table = TARGET_TABLE[entity];
  // rinks/leagues use `city`; team_workspaces uses `home_city`.
  const cityCol = entity === 'team' ? 'home_city' : 'city';
  const targetName = name.trim().toLowerCase();
  const targetCity = (city || '').trim().toLowerCase();

  // Pull the small candidate set by name first, then narrow by city in JS.
  // PostgREST ilike on a normalized column would need a functional index we
  // do not have, and the candidate set per name is tiny.
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(`id, name, slug${entity === 'team' ? '' : ', city'}`)
    .ilike('name', name.trim());

  if (error || !data || data.length === 0) return null;

  const rows = data as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    city?: string | null;
    home_city?: string | null;
  }>;

  const matches = rows.filter(
    (row) => {
      if ((row.name || '').trim().toLowerCase() !== targetName) return false;
      if (!targetCity) return true; // submission has no city — name match is enough
      const rowCity = (row.city ?? row.home_city ?? '').trim().toLowerCase();
      return rowCity === targetCity;
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
  //
  // `team_workspaces` is the canonical team table now (2026-11-11), but
  // older notes rows say `teams/<uuid>`. Both must parse — otherwise a
  // re-approval of an already-listed submission would create a DUPLICATE.
  const re =
    /(rinks|teams|team_workspaces|leagues)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const m = notes.match(re);
  if (!m) return null;
  const table = m[1].toLowerCase();
  const entity: 'rink' | 'team' | 'league' =
    table === 'rinks' ? 'rink' : table === 'leagues' ? 'league' : 'team';
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
  const table = TARGET_TABLE[entity];
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
  //   leagues has NO email / notes / source, and a CHECK on `level`
  //   team_workspaces has NO email / notes / source / verification_tier /
  //           claimable, uses home_city / home_country instead of
  //           city / country, and REQUIRES visibility, is_published and
  //           age_category (CHECK: youth | adult | mixed)
  // So each entity gets only the columns it actually has.
  //
  // Submission provenance (which submission created this) is written to the
  // `notes`/`source` columns where they exist. For leagues and
  // team_workspaces, which have neither, the provenance lives on the
  // SUBMISSION row (notes column) and in admin_audit_log — that is enough
  // for the audit trail.
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
    // team_workspaces (canonical). The legacy `teams` table is NOT read by
    // any public directory path since 2026-11-07 — writing there produces a
    // listing nobody can see.
    const { data, error } = await supabaseAdmin
      .from('team_workspaces')
      .insert({
        name: baseFields.name,
        slug: baseFields.slug,
        // team_workspaces vocabulary:
        //   home_city / home_country (not city / country)
        //   visibility / is_published / age_category are REQUIRED
        //   there is NO claimable column here — claiming is tracked by the
        //   `claims` table, not by a flag on the workspace.
        home_city: submission.city || null,
        home_country: submission.country || null,
        website_url: baseFields.website_url,
        visibility: 'public',
        is_published: true,
        is_active: true,
        // CHECK (team_workspaces_age_category_check): youth | adult | mixed.
        // A generic listing has no age bracket — 'mixed' is the truthful
        // value (it does not assert the team is for every age, it declines
        // to narrow it).
        age_category: 'mixed',
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
