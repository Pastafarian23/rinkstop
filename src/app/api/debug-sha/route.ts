import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown',
    ga: process.env.NEXT_PUBLIC_GA_ID ?? 'none',
    timestamp: new Date().toISOString(),
  });
}
