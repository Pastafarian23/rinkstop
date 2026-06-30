// src/app/draft/page.tsx  --  Index for the draft archive.
// Redirects to /draft/2026 (the only fully-indexed year so far).

import { redirect } from 'next/navigation';

export default function DraftIndexPage() {
  redirect('/draft/2026');
}