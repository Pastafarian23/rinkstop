import type { Metadata } from 'next';

// /blog/[slug] redirects to /news/[slug] — metadata exists for completeness
// in case the redirect ever fails to fire. The actual post title/description
// is rendered on the /news/[slug] destination. Indexing disabled to avoid
// duplicate content between /blog/[slug] and /news/[slug].
export const metadata: Metadata = {
  title: 'Hockey Blog',
  description:
    'Hockey news, analysis, and how-to guides from the RinkStop editorial team.',
  robots: {
    index: false,
    follow: true,
  },
};
