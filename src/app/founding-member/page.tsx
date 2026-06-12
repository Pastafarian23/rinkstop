import { permanentRedirect } from 'next/navigation';

// Deprecated 2026-06-12 — the 8 founding-member entity tiers have been
// consolidated into the new 3-tier subscription (Free / Supporter / Verified / Pro).
// All traffic to this path now 308-redirects to the new /pricing page so we
// preserve SEO and don't break inbound links from social or email campaigns.

export const dynamic = 'force-static';

export default function FoundingMemberPage() {
  permanentRedirect('/pricing');
}
