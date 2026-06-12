import type { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Pricing — RinkStop',
  description:
    'RinkStop pricing — Free, Supporter, Verified, and Pro plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
  alternates: { canonical: 'https://rinkstop.com/pricing' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Supporter, Verified, and Pro plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
    url: 'https://rinkstop.com/pricing',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Supporter, Verified, and Pro plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
  },
};

export default function FoundingMemberPage() {
  return <PricingContent />;
}
