// src/app/draft/page.tsx  --  Index for the draft archive.
//
// Redirects to /draft/nhl/2026 (the only fully-indexed year so far).
// Other leagues will eventually get their own landing pages here
// (e.g. /draft/ohl, /draft/whl) once data lands.

import { redirect } from 'next/navigation';

export default function DraftIndexPage() {
  redirect('/draft/nhl/2026');
}