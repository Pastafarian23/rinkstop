/**
 * Explicit column allowlists for public directory API reads.
 *
 * Anon/public reads must name their columns (PostgREST column grants; see the
 * contact-details hardening note in /api/teams). Keeping the lists here lets
 * tests assert that no private field (user ids, contact details, owner or
 * billing data) can be selected by a public route.
 */

export const LEAGUE_PUBLIC_COLUMNS = [
  'id', 'name', 'slug', 'country', 'level', 'description', 'logo_url',
  'website_url', 'federation_id', 'is_active', 'claimable', 'created_at', 'updated_at',
].join(', ');

export const TEAM_PUBLIC_COLUMNS = [
  'id', 'name', 'slug', 'short_name', 'home_rink_id', 'home_city', 'home_country',
  'country_code', 'age_category', 'age_label', 'age_min', 'age_max', 'level',
  'season_label', 'description', 'visibility', 'is_active', 'created_at', 'updated_at',
  'avatar_url', 'banner_url', 'federation_id', 'organization_id', 'league_id',
  'website_url', 'division', 'home_state', 'timezone', 'is_published',
  'leagues(name)',
].join(', ');

export const RINK_PUBLIC_COLUMNS =
  'id, name, slug, city, province_state, country, address, latitude, longitude, ' +
  'capacity, ice_size, surface_type, website_url, logo_url, is_active, created_at, ' +
  'updated_at, source, status, cover_photo_url, place_id, opening_hours_json, ' +
  'google_website, google_maps_url, static_map_url, league, timezone, ' +
  'cover_photo_verified_at, cover_photo_source, seo_h1, seo_title, qr_identifier, ' +
  'verification_tier, meta_description, claimable';
// qr_identifier is intentionally public (QR generation, display and scanning).
// Deliberately excluded: qr_revoked_at (server-side QR validity only) and
// notes / notes_generated (kept out of the public API per owner instruction).

/** Substrings that must never appear in a public column allowlist. */
export const FORBIDDEN_PUBLIC_FIELD_PARTS = [
  'user_id', 'claimed_by_user', 'email', 'phone', 'password', 'secret',
  'stripe', 'service_role', 'token', 'owner_', 'billing', 'qr_revoked', 'notes',
];

export function selectedColumnNames(list: string): string[] {
  return list
    .replace(/\([^)]*\)/g, '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}
