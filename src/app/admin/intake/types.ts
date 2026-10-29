/**
 * Shared types for the admin intake queue.
 *
 * 2026-10-29: `ListingSubmission` was declared identically in BOTH
 * `src/app/admin/intake/page.tsx` (the server loader) and
 * `src/app/admin/intake/IntakeDashboard.tsx` (the client table). When the
 * lead-response columns were added to one of them, TypeScript failed with
 * "Two different types with this name exist, but they are unrelated" —
 * exactly the drift a shared type prevents.
 */

export interface ListingSubmission {
  id: string;
  listing_type: string;
  name: string;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  /**
   * Lead-response tracking (2026-10-29).
   *
   * Without these, "we never replied" was invisible — which is how two real
   * leads (Slough Satans 2026-10-02, GLXY Cup 2026-10-21) sat for 27 and 8
   * days with nothing in the system recording it. `contacted_at` is set on
   * the FIRST reply only, so `first_response_hours` measures time-to-first-
   * reply rather than time-to-last-touch.
   */
  contacted_at: string | null;
  contacted_by: string | null;
  reply_channel: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  first_response_hours: number | null;
  created_at: string;
  updated_at: string;
}

/** Reply channels the admin UI offers when logging a reply. */
export const REPLY_CHANNELS = [
  'email',
  'telegram',
  'phone',
  'whatsapp',
  'other',
] as const;

/** Outcome stages a lead can be in. */
export const LEAD_OUTCOMES = [
  'listed',
  'claimed',
  'paid',
  'declined',
  'no_response',
] as const;

export type ReplyChannel = (typeof REPLY_CHANNELS)[number];
export type LeadOutcome = (typeof LEAD_OUTCOMES)[number];
