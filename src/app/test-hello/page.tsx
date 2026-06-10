import { notFound } from 'next/navigation';

// /test-hello was a dev artifact that was accidentally left in production.
// Returning 404 so AdSense reviewers and search engines don't see a
// "Hello World" page on the live site.
export default function TestPage() {
  notFound();
}
