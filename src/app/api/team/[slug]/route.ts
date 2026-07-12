import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/team';
import { trackEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Visibility is binary for V1: 'private' only.
// 'public' is deferred until the public team profile page exists — see /api/team/[slug] PATCH.
const VISIBILITY_VALUES = ['private', 'public'] as const;
const AGE_CATEGORY_VALUES = ['youth', 'adult', 'mixed'] as const;
const LEVEL_VALUES = ['learn_to_play', 'house', 'travel', 'rep'] as const;

function asStringOrNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined; // sentinel: not present in payload
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function asIntOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

function asDateOrNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(v + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) ? v : undefined;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!normalizedSlug) {
    return NextResponse.json({ error: 'missing_slug' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Load team
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (teamErr) {
    return NextResponse.json({ error: 'team_lookup_failed' }, { status: 500 });
  }
  if (!team) {
    return NextResponse.json({ error: 'team_not_found' }, { status: 404 });
  }

  // Membership + admin gate
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'not_a_member' }, { status: 403 });
  }
  if (!isAdminRole(membership.role)) {
    return NextResponse.json({ error: 'not_admin' }, { status: 403 });
  }

  // Super-admin check for name/short_name changes
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, _deprecated_account_type')
    .eq('user_id', userId)
    .maybeSingle();
  const isSuper = profile?.role === 'super_admin' || profile?._deprecated_account_type === 'super_admin';

  // Build update payload — only fields present in the body are touched.
  const patch: Record<string, unknown> = {};
  const pendingPatch: Record<string, unknown> = {};

  const name = asStringOrNull(body.name);
  if (name !== undefined) {
    if (typeof name !== 'string' || name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
    }
    if (isSuper) {
      patch.name = name;
    } else {
      // Non-super-admin: queue for approval
      pendingPatch.name = name;
    }
  }

  const shortName = asStringOrNull(body.short_name);
  if (shortName !== undefined) {
    if (shortName !== null && (typeof shortName !== 'string' || shortName.length > 40)) {
      return NextResponse.json({ error: 'invalid_short_name' }, { status: 400 });
    }
    if (isSuper) {
      patch.short_name = shortName;
    } else {
      pendingPatch.short_name = shortName;
    }
  }

  // Slug change — validate format, check uniqueness, write a redirect row
  // so old links (e.g. shared invites) keep working.
  const newSlug = asStringOrNull(body.slug);
  if (newSlug !== undefined) {
    if (typeof newSlug !== 'string') {
      return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
    }
    // Format: lowercase a-z 0-9 hyphen, 2-60 chars, can't start/end with hyphen
    if (!/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(newSlug)) {
      return NextResponse.json(
        {
          error: 'invalid_slug_format',
          message: 'Slug must be 2-60 chars, lowercase a-z/0-9/- only, no leading or trailing hyphens.',
        },
        { status: 400 },
      );
    }
    if (newSlug === team.slug) {
      // No-op — user submitted same slug
    } else {
      // Check uniqueness
      const { data: collision } = await supabaseAdmin
        .from('team_workspaces')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', team.id)
        .maybeSingle();
      if (collision) {
        return NextResponse.json(
          { error: 'slug_taken', message: 'That slug is already in use. Try another.' },
          { status: 409 },
        );
      }
      patch.slug = newSlug;
      // Mark for redirect insert (after the workspace update succeeds)
      (patch as any)._old_slug_for_redirect = team.slug;
    }
  }

  const homeCity = asStringOrNull(body.home_city);
  if (homeCity !== undefined) {
    if (homeCity !== null && (typeof homeCity !== 'string' || homeCity.length > 80)) {
      return NextResponse.json({ error: 'invalid_home_city' }, { status: 400 });
    }
    patch.home_city = homeCity;
  }

  const homeCountry = asStringOrNull(body.home_country);
  if (homeCountry !== undefined) {
    if (homeCountry !== null && (typeof homeCountry !== 'string' || homeCountry.length > 80)) {
      return NextResponse.json({ error: 'invalid_home_country' }, { status: 400 });
    }
    patch.home_country = homeCountry;
  }

  const countryCode = asStringOrNull(body.country_code);
  if (countryCode !== undefined) {
    if (countryCode !== null && (typeof countryCode !== 'string' || countryCode.length !== 2)) {
      return NextResponse.json({ error: 'invalid_country_code' }, { status: 400 });
    }
    patch.country_code = countryCode ? countryCode.toUpperCase() : null;
  }

  const currency = asStringOrNull(body.currency);
  if (currency !== undefined) {
    if (currency !== null && (typeof currency !== 'string' || currency.length !== 3)) {
      return NextResponse.json({ error: 'invalid_currency' }, { status: 400 });
    }
    patch.currency = currency ? currency.toUpperCase() : null;
  }

  const seasonLabel = asStringOrNull(body.season_label);
  if (seasonLabel !== undefined) {
    if (seasonLabel !== null && (typeof seasonLabel !== 'string' || seasonLabel.length > 40)) {
      return NextResponse.json({ error: 'invalid_season_label' }, { status: 400 });
    }
    patch.season_label = seasonLabel;
  }

  const ageLabel = asStringOrNull(body.age_label);
  if (ageLabel !== undefined) {
    if (ageLabel !== null && (typeof ageLabel !== 'string' || ageLabel.length > 40)) {
      return NextResponse.json({ error: 'invalid_age_label' }, { status: 400 });
    }
    patch.age_label = ageLabel;
  }

  const ageMin = asIntOrNull(body.age_min);
  if (ageMin !== undefined) {
    if (ageMin === null) {
      patch.age_min = null;
    } else if (ageMin < 0 || ageMin > 99) {
      return NextResponse.json({ error: 'invalid_age_min' }, { status: 400 });
    } else {
      patch.age_min = ageMin;
    }
  }

  const ageMax = asIntOrNull(body.age_max);
  if (ageMax !== undefined) {
    if (ageMax === null) {
      patch.age_max = null;
    } else if (ageMax < 0 || ageMax > 99) {
      return NextResponse.json({ error: 'invalid_age_max' }, { status: 400 });
    } else {
      patch.age_max = ageMax;
    }
  }

  // age_min must be <= age_max when both are set
  if (typeof patch.age_min === 'number' && typeof patch.age_max === 'number') {
    if (patch.age_min > patch.age_max) {
      return NextResponse.json({ error: 'age_min_greater_than_age_max' }, { status: 400 });
    }
  }

  const ageCategory = asStringOrNull(body.age_category);
  if (ageCategory !== undefined) {
    if (ageCategory !== null && (typeof ageCategory !== 'string' || !AGE_CATEGORY_VALUES.includes(ageCategory as any))) {
      return NextResponse.json({ error: 'invalid_age_category' }, { status: 400 });
    }
    patch.age_category = ageCategory;
  }

  const level = asStringOrNull(body.level);
  if (level !== undefined) {
    if (level !== null && !LEVEL_VALUES.includes(level as any)) {
      return NextResponse.json({ error: 'invalid_level' }, { status: 400 });
    }
    patch.level = level;
  }

  const foundedOn = asDateOrNull(body.founded_on);
  if (foundedOn !== undefined) {
    patch.founded_on = foundedOn; // string | null
  }

  const description = asStringOrNull(body.description);
  if (description !== undefined) {
    if (description !== null && (typeof description !== 'string' || description.length > 1000)) {
      return NextResponse.json({ error: 'invalid_description' }, { status: 400 });
    }
    patch.description = description;
  }

  const contactEmail = asStringOrNull(body.contact_email);
  if (contactEmail !== undefined) {
    if (contactEmail !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: 'invalid_contact_email' }, { status: 400 });
    }
    patch.contact_email = contactEmail;
  }

  const contactPhone = asStringOrNull(body.contact_phone);
  if (contactPhone !== undefined) {
    if (contactPhone !== null && (typeof contactPhone !== 'string' || contactPhone.length > 40)) {
      return NextResponse.json({ error: 'invalid_contact_phone' }, { status: 400 });
    }
    patch.contact_phone = contactPhone;
  }

  const visibility = asStringOrNull(body.visibility);
  if (visibility !== undefined) {
    if (typeof visibility !== 'string') {
      return NextResponse.json({ error: 'invalid_visibility' }, { status: 400 });
    }
    // 'public' is deferred — the public team profile page hasn't been built yet.
    if (visibility === 'unlisted') {
      return NextResponse.json(
        {
          error: 'unlisted_removed',
          message:
            "'unlisted' has been removed. Teams are either private (workspace + invite-only) or public (when the public profile ships).",
        },
        { status: 400 }
      );
    }
    if (!VISIBILITY_VALUES.includes(visibility as any)) {
      return NextResponse.json({ error: 'invalid_visibility' }, { status: 400 });
    }
    patch.visibility = visibility;
  }

  if (Object.keys(patch).length === 0 && Object.keys(pendingPatch).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  // If there are pending name/short_name changes from a non-super-admin, create a review row
  if (Object.keys(pendingPatch).length > 0) {
    // Reject if there's already a pending review for this team
    const { data: existingReview } = await supabaseAdmin
      .from('team_name_review')
      .select('id')
      .eq('team_id', team.id)
      .eq('status', 'pending')
      .maybeSingle();
    if (existingReview) {
      return NextResponse.json(
        { error: 'pending_already_exists', message: 'A name change is already pending review. Wait for it to be approved or rejected before submitting another.' },
        { status: 409 },
      );
    }

    // Read current team state for the review row
    const { data: currentTeam } = await supabaseAdmin
      .from('team_workspaces')
      .select('name, short_name')
      .eq('id', team.id)
      .maybeSingle();

    // Create the review row
    const { error: reviewErr } = await supabaseAdmin
      .from('team_name_review')
      .insert({
        team_id: team.id,
        requested_name: (pendingPatch.name as string) ?? currentTeam?.name ?? '',
        requested_short_name: (pendingPatch.short_name as string | null) ?? currentTeam?.short_name ?? null,
        previous_name: currentTeam?.name ?? '',
        previous_short_name: currentTeam?.short_name ?? null,
        requested_by: userId,
      });
    if (reviewErr) {
      return NextResponse.json({ error: 'review_create_failed' }, { status: 500 });
    }

    // Set the pending fields on the team (don't apply to live name yet)
    const { error: pendingErr } = await supabaseAdmin
      .from('team_workspaces')
      .update({
        pending_name: pendingPatch.name ?? null,
        pending_short_name: pendingPatch.short_name ?? null,
        pending_submitted_at: new Date().toISOString(),
        pending_submitted_by: userId,
      })
      .eq('id', team.id);
    if (pendingErr) {
      return NextResponse.json({ error: 'pending_update_failed' }, { status: 500 });
    }

    // If there were also direct fields to update, do those now
    if (Object.keys(patch).length > 0) {
      const { error: directErr } = await supabaseAdmin
        .from('team_workspaces')
        .update(patch)
        .eq('id', team.id);
      if (directErr) {
        return NextResponse.json({ error: 'update_failed', detail: directErr.message }, { status: 500 });
      }
    }

    // Fetch updated team state to return
    const { data: updatedTeam } = await supabaseAdmin
      .from('team_workspaces')
      .select('id, slug, name, short_name, pending_name, pending_short_name, visibility')
      .eq('id', team.id)
      .maybeSingle();

    return NextResponse.json({
      team: updatedTeam,
      pending_review: true,
      message: 'Name change submitted for super_admin review.',
    });
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('team_workspaces')
    .update(patch)
    .eq('id', team.id)
    .select('id, slug, name, short_name, pending_name, pending_short_name, pending_submitted_at, home_city, home_country, country_code, currency, age_category, age_label, age_min, age_max, season_label, level, founded_on, description, contact_email, contact_phone, visibility')
    .single();

  if (updateErr || !updated) {
    return NextResponse.json(
      { error: 'update_failed', detail: updateErr?.message ?? null },
      { status: 500 }
    );
  }

  // If slug changed, write a redirect row so old links keep working.
  const oldSlug = (patch as any)._old_slug_for_redirect as string | undefined;
  if (oldSlug && updated.slug !== oldSlug) {
    // Best-effort — don't fail the whole request if the redirect insert fails
    try {
      await supabaseAdmin.from('team_slug_redirects').upsert(
        { from_slug: oldSlug, to_slug: updated.slug, team_id: team.id },
        { onConflict: 'from_slug', ignoreDuplicates: false },
      );
    } catch {
      // swallow — redirect is a nice-to-have, not critical
    }
    delete (patch as any)._old_slug_for_redirect;
  }

  // Track the edit
  try {
    await trackEvent({
      name: 'team_settings_updated',
      userId,
      pathname: `/dashboard/team/${updated.slug}/settings`,
      props: {
        team_id: team.id,
        team_slug: updated.slug,
        fields_updated: Object.keys(patch),
      },
    });
  } catch {
    // analytics is best-effort
  }

  return NextResponse.json({ ok: true, team: updated });
}