import { permanentRedirect } from 'next/navigation';

/**
 * Legacy /directory/teams/[slug] route — redirects to the canonical
 * /teams/[slug] URL (Day 6).
 *
 * The /teams/[slug] route is the public team profile page for
 * user-created teams. Both URLs hit the same underlying data; the
 * shorter URL is the canonical home so we 308-redirect here to
 * consolidate link equity and avoid duplicate content.
 *
 * 308 (vs 301) preserves the request method and is the Next.js
 * recommendation for permanent server-side redirects.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LegacyDirectoryTeamPage({ params }: Props) {
  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  permanentRedirect(`/teams/${normalizedSlug}`);
}