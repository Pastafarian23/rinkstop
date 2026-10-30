import { sendEmail } from '@/lib/email';
import { resolveLiveUrl } from '@/lib/submission-status';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';

export interface SubmissionDecisionInput {
  submission: {
    email?: string | null;
    name?: string | null;
    listing_type?: string | null;
    public_token?: string | null;
    listing_id?: string | null;
  };
  status: 'approved' | 'rejected';
  listingUrl: string | null;
  listingId: string | null;
}

/**
 * Email a listing submitter when we approve or reject their submission.
 *
 * WHY (2026-10-30): nothing was emailed on approval before this. Slough
 * Satans submitted on 2026-10-02 and heard nothing for 27 days; they only
 * learned their listing was live because we chased them. The silence is a
 * large part of what made the relationship feel broken, and it is trivially
 * fixable — a decision always produces an email.
 *
 * Never throws. A failed email must not fail the admin action.
 */
export async function notifySubmitterOfDecision(input: SubmissionDecisionInput): Promise<void> {
  const { submission, status, listingUrl, listingId } = input;
  const to = submission.email;
  const name = submission.name || 'your listing';
  const listingType = submission.listing_type || 'listing';

  if (!to) return;

  const token = submission.public_token;
  const statusUrl = token ? `${SITE_URL}/listing-status/${token}` : SITE_URL;

  try {
    if (status === 'approved') {
      // Prefer the live URL we already resolved during approval; fall back to
      // looking the listing up by id so the email always has a real link.
      let liveUrl = listingUrl;
      let claimUrl: string | null = null;
      if (!liveUrl && listingId) {
        const resolved = await resolveLiveUrl(listingId, listingType);
        liveUrl = resolved.live_url;
        claimUrl = resolved.claim_url;
      } else if (liveUrl && listingId) {
        claimUrl = (await resolveLiveUrl(listingId, listingType)).claim_url;
      }

      await sendEmail({
        to,
        subject: `Your ${listingType} listing is live on RinkStop`,
        template: 'listing-submission-approved',
        data: {
          listingType,
          name,
          liveUrl,
          claimUrl,
          statusUrl,
        },
        tag: 'listing-approved',
      });
    } else {
      await sendEmail({
        to,
        subject: `About your ${listingType} submission to RinkStop`,
        template: 'listing-submission-rejected',
        data: {
          listingType,
          name,
          statusUrl,
        },
        tag: 'listing-rejected',
      });
    }
  } catch (err) {
    // Never let an email failure break the admin action.
    console.error('[listing-submission-notify] decision email failed:', err);
  }
}
