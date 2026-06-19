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
const VISIBILITY_VALUES = ['private'] as const;
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

  // Build update payload — only fields present in the body are touched.
  const patch: Record<string, unknown> = {};

  const name = asStringOrNull(body.name);
  if (name !== undefined) {
    if (typeof name !== 'string' || name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
    }
    patch.name = name;
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

  const shortName = asStringOrNull(body.short_name);
  if (shortName !== undefined) {
    if (typeof shortName !== 'string' || shortName.length > 40) {
      return NextResponse.json({ error: 'invalid_short_name' }, { status: 400 });
    }
    patch.short_name = shortName;
  }

  const parentOrg = asStringOrNull(body.parent_org);
  if (parentOrg !== undefined) {
    if (typeof parentOrg !== 'string' || parentOrg.length > 120) {
      return NextResponse.json({ error: 'invalid_parent_org' }, { status: 400 });
    }
    patch.parent_org = parentOrg;
  }

  const homeCity = asStringOrNull(body.home_city);
  if (homeCity !== undefined) {
    if (typeof homeCity !== 'string' || homeCity.length > 80) {
      return NextResponse.json({ error: 'invalid_home_city' }, { status: 400 });
    }
    patch.home_city = homeCity;
  }

  const homeCountry = asStringOrNull(body.home_country);
  if (homeCountry !== undefined) {
    if (typeof homeCountry !== 'string' || homeCountry.length > 80) {
      return NextResponse.json({ error: 'invalid_home_country' }, { status: 400 });
    }
    patch.home_country = homeCountry;
  }

  const countryCode = asStringOrNull(body.country_code);
  if (countryCode !== undefined) {
    if (typeof countryCode !== 'string' || countryCode.length !== 2) {
      return NextResponse.json({ error: 'invalid_country_code' }, { status: 400 });
    }
    patch.country_code = countryCode.toUpperCase();
  }

  const currency = asStringOrNull(body.currency);
  if (currency !== undefined) {
    if (typeof currency !== 'string' || currency.length !== 3) {
      return NextResponse.json({ error: 'invalid_currency' }, { status: 400 });
    }
    patch.currency = currency.toUpperCase();
  }

  const seasonLabel = asStringOrNull(body.season_label);
  if (seasonLabel !== undefined) {
    if (typeof seasonLabel !== 'string' || seasonLabel.length > 40) {
      return NextResponse.json({ error: 'invalid_season_label' }, { status: 400 });
    }
    patch.season_label = seasonLabel;
  }

  const ageLabel = asStringOrNull(body.age_label);
  if (ageLabel !== undefined) {
    if (typeof ageLabel !== 'string' || ageLabel.length > 40) {
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
    if (typeof ageCategory !== 'string' || !AGE_CATEGORY_VALUES.includes(ageCategory as any)) {
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
    if (typeof description !== 'string' || description.length > 1000) {
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
    if (typeof contactPhone !== 'string' || contactPhone.length > 40) {
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
    if (visibility === 'public') {
      return NextResponse.json(
        {
          error: 'public_visibility_deferred',
          message:
            'Public team profiles are not yet available. Teams are URL-known and invite-gated; the workspace at /dashboard/team/[slug] requires an invite code. The public profile page will launch with the directory.',
        },
        { status: 409 }
      );
    }
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

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('team_workspaces')
    .update(patch)
    .eq('id', team.id)
    .select('id, slug, name, short_name, parent_org, home_city, home_country, country_code, currency, age_category, age_label, age_min, age_max, season_label, level, founded_on, description, contact_email, contact_phone, visibility')
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