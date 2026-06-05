// src/app/blog/[slug]/page.tsx — Redirects /blog/{slug} → /news/{slug}
// /blog was the original blog URL; we consolidated to /news as canonical.
// This page exists only to forward old inbound links to the new URL.
// Real implementation lives at /news/[slug]/page.tsx.
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogSlugRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/news/${slug}`);
}
