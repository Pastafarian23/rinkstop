// src/app/draft/pwhl/page.tsx
//
// PWHL draft hub. Redirects to the most recent year (2026) — same pattern
// as the NHL draft hub will eventually follow.

import { redirect } from 'next/navigation';

export default function PWHLDraftHub() {
  redirect('/draft/pwhl/2026');
}
