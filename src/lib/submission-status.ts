import { supabaseAdmin } from '@/lib/supabase';

/**
 * Resolve the public "your listing is live" URL for an approved submission.
 *
 * WHY THIS IS SEPARATE FROM `listing-submission-to-listing.ts`:
 *   That module CREATES listings and knows the slug it just generated. This
 *   module READS an existing submission and has to find the live listing by
 *   id, which may live in `team_workspaces`, `rinks`, `leagues`, or
 *   `rink_events` (tournaments). It must not create anything.
 *
 * SECURITY: the submitter's email and our internal notes must NEVER appear
 * in the response. This module returns only the display name, the listing
 * type, and the public URL.
 */

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface SubmissionStatusView {
  name: string;
  listing_type: string;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at: string | null;
  live_url: string | null;
  /** The claim URL, so an approved submitter can take control of their listing. */
  claim_url: string | null;
  /** Human-readable age of the submission, e.g. "3 days". */
  age_label: string;
  /** True once the submission is older than our stated SLA. */
  overdue: boolean;
}
/** Our stated review SLA. Keep in sync with the copy on the status page. */
export const REVIEW_SLA_DAYS = 3;

const AGE_LABEL = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function ageLabel(fromIso: string, now = new Date()): string {
  const ms = now.getTime() - new Date(fromIso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return AGE_LABEL.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return AGE_LABEL.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return AGE_LABEL.format(-days, 'day');
  const months = Math.round(days / 30);
  return AGE_LABEL.format(-months, 'month');
}

/**
 * Map a submission to its live listing URL, by looking the `listing_id` up
 * in whichever directory table holds it.
 *
 * Returns null when the listing is not published or the id no longer
 * resolves — the status page then says "approved, details on the way",
 * which is honest.
 */
export async function resolveLiveUrl(
  listingId: string | null,
  listingType: string
): Promise<{ live_url: string | null; claim_url: string | null }> {
  if (!listingId) return { live_url: null, claim_url: null };

  const type = (listingType || '').toLowerCase();

  if (type === 'team') {
    const { data } = await supabaseAdmin
      .from('team_workspaces')
      .select('slug, name, visibility, is_active')
      .eq('id', listingId)
      .maybeSingle();
    if (!data || !data.slug) return { live_url: null, claim_url: null };
    const live = `/directory/teams/${data.slug}`;
    return {
      live_url: live,
      // 2026-10-30: this used to point at `/claim-your-listing?focus=team&id=…`.
      // That was WRONG — the claim page never read `focus` or `id`, so the
      // "Claim and edit it" button dumped the submitter back on a blank
      // search page with no reference to their listing. It also passed the
      // SLUG as the display name, so the pre-filled form showed "slough-satans"
      // instead of "Slough Satans".
      //
      // The real claim flow is /dashboard/claims?intent=claim&entity=…&id=…&name=…
      // (see RinkResultCard in claim-your-listing/page.tsx, which builds the
      // same shape). Point there so the claim form opens PRE-FILLED for this
      // exact listing. The name is the real display name from the DB.
      claim_url: `/dashboard/claims?intent=claim&entity=team&id=${listingId}&name=${encodeURIComponent(data.name || data.slug)}`,
    };
  }

  if (type === 'rink') {
    const { data } = await supabaseAdmin
      .from('rinks')
      .select('slug, name, is_active')
      .eq('id', listingId)
      .maybeSingle();
    if (!data || !data.slug) return { live_url: null, claim_url: null };
    const live = `/directory/rinks/${data.slug}`;
    return {
      live_url: live,
      claim_url: `/dashboard/claims?intent=claim&entity=rink&id=${listingId}&name=${encodeURIComponent(data.name || data.slug)}`,
    };
  }

  if (type === 'league') {
    const { data } = await supabaseAdmin
      .from('leagues')
      .select('slug, name, is_active')
      .eq('id', listingId)
      .maybeSingle();
    if (!data || !data.slug) return { live_url: null, claim_url: null };
    // NOTE: `league` is NOT a claim_type the public claims API accepts
    // (it accepts rink | team | player). So there is no self-serve league
    // claim form — sending a submitter to one would be a dead end. Return
    // null and the status page shows only the live listing link; league
    // claims are handled by RinkStop on request.
    return { live_url: `/directory/leagues/${data.slug}`, claim_url: null };
  }

  if (type === 'tournament' || type === 'event') {
    const { data } = await supabaseAdmin
      .from('rink_events')
      .select('slug, status')
      .eq('id', listingId)
      .maybeSingle();
    if (!data || !data.slug) return { live_url: null, claim_url: null };
    return { live_url: `/events/${data.slug}`, claim_url: null };
  }

  return { live_url: null, claim_url: null };
}

/**
 * Build the public status view for a submission.
 *
 * IMPORTANT: this selects ONLY the columns a submitter is entitled to see.
 * It must never select `email`, `notes`, `outcome_notes`, `reviewed_by`, or
 * `contacted_by`.
 */
export async function getSubmissionStatusByToken(
  token: string
): Promise<SubmissionStatusView | null> {
  if (!token || token.length < 20) return null;

  const { data, error } = await supabaseAdmin
    .from('listing_submissions')
    .select('name, listing_type, status, created_at, reviewed_at, listing_id, public_token_expires_at')
    .eq('public_token', token)
    .maybeSingle();

  if (error) {
    console.error('[submission-status] lookup failed:', error);
    return null;
  }
  if (!data) return null;

  // Expired token — treat as not found. Do not leak that a submission exists.
  if (data.public_token_expires_at && new Date(data.public_token_expires_at).getTime() < Date.now()) {
    return null;
  }

  const status = (data.status || 'pending') as SubmissionStatus;
  let live_url: string | null = null;
  let claim_url: string | null = null;

  if (status === 'approved') {
    const resolved = await resolveLiveUrl(data.listing_id, data.listing_type);
    live_url = resolved.live_url;
    claim_url = resolved.claim_url;
  }

  const ageMs = Date.now() - new Date(data.created_at).getTime();
  const ageDays = ageMs / 86_400_000;

  return {
    name: data.name,
    listing_type: data.listing_type,
    status,
    submitted_at: data.created_at,
    reviewed_at: data.reviewed_at,
    live_url,
    claim_url,
    age_label: ageLabel(data.created_at),
    overdue: status === 'pending' && ageDays > REVIEW_SLA_DAYS,
  };
}
