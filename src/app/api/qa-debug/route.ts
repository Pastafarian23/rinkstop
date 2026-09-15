// /api/qa-debug — debug endpoint to see what Q&A pages exist
import { NextResponse } from 'next/server';
import { generateQAPages } from '@/lib/qa-content-generator';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pages = await generateQAPages();
  // Just return slugs
  return NextResponse.json({
    total: pages.length,
    sample: pages.slice(0, 20).map((p) => ({ slug: p.slug, url: p.url_path })),
    by_type: {
      country: pages.filter((p) => p.slug.startsWith('hockey-in-')).length,
      league: pages.filter((p) => p.slug.endsWith('-teams')).length,
      city: pages.filter((p) => p.slug.startsWith('hockey-rinks-in-')).length,
    },
  });
}
