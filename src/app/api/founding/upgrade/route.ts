import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED 2026-06-12 — replaced by /api/tier/upgrade
//
// The 8 founding-member entity types (fan, player, coach, scout, business, team,
// league, rink) have been consolidated into a single subscription model:
// Free / Hockey Passport / Hockey Passport Plus / Club plans (Federation by contact). See /pricing.
//
// Any old links, social posts, or cached redirects that still hit this endpoint
// will get a clear 410 Gone. The pricing page is the new entry point.

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'deprecated',
      message:
        'The founding-member entity program has been replaced by the new 3-tier subscription. Visit /pricing to see current plans.',
      new_endpoint: '/api/tier/upgrade',
    },
    {
      status: 410,
      headers: {
        'Deprecation': 'true',
        'Link': '</pricing>; rel="successor"',
      },
    }
  );
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'deprecated',
      message: 'The founding-member entity program has been replaced. Visit /pricing.',
    },
    { status: 410 }
  );
}
