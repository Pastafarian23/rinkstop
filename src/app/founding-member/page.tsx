import type { Metadata } from 'next';
import FoundingMemberContent from './FoundingMemberContent';

export const metadata: Metadata = {
  title: 'Founding Member Program',
  description:
    'Be a RinkStop Founding Member — get verified, claim your listing, and unlock premium features.',
  alternates: { canonical: 'https://rinkstop.com/founding-member' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Founding Member Program',
    description:
      'Be a RinkStop Founding Member — get verified, claim your listing, and unlock premium features.',
    url: 'https://rinkstop.com/founding-member',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Founding Member Program',
    description:
      'Be a RinkStop Founding Member — get verified, claim your listing, and unlock premium features.',
  },
};

export default function FoundingMemberPage() {
  return <FoundingMemberContent />;
}
