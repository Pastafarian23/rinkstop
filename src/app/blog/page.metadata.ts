import type { Metadata } from 'next';

// /blog redirects to /news — metadata exists for completeness in case
// the redirect ever fails to fire. Title will render as "Hockey Blog | RinkStop"
// via the root layout's title template.
export const metadata: Metadata = {
  title: 'Hockey Blog',
  description:
    'Hockey news, analysis, and how-to guides from the RinkStop editorial team.',
  alternates: {
    canonical: 'https://rinkstop.com/blog',
  },
  robots: {
    index: false,
    follow: true,
  },
};
