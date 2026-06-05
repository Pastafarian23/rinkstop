// src/app/blog/page.tsx — Redirects /blog → /news
// /blog was the original blog URL; we consolidated to /news.
// Any old /blog links will land on the new canonical news hub.
import { redirect } from 'next/navigation';

export default function BlogIndexPage() {
  redirect('/news');
}
