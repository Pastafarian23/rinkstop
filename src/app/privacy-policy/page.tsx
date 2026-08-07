import { redirect } from 'next/navigation';

// /privacy-policy routes to /privacy (canonical Privacy Policy URL).
// AdSense policy + footer link expect "/privacy-policy" — keep an alias.
export default function PrivacyPolicyAlias() {
  redirect('/privacy');
}
