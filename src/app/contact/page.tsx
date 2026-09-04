import type { Metadata } from 'next';
import ContactForm from './ContactForm';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Get in touch with the RinkStop team. Questions, contributions, partnerships — we'd love to hear from you.",
  alternates: { canonical: 'https://rinkstop.com/contact' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Contact',
    description:
      'Get in touch with the RinkStop team. Questions, contributions, partnerships — we would love to hear from you.',
    url: 'https://rinkstop.com/contact',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Contact',
    description: 'Get in touch with the RinkStop team.',
  },
};

export default function ContactPage() {
  return <ContactForm />;
}
