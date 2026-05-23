import { NextResponse } from 'next/server';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  const testUrls = [
    'https://hockey.highantly.net/teams?limit=1',
    'https://nhl.highantly.net/teams?leagueName=NHL&limit=1',
    'https://hockey.highlights-api.p.rapidapi.com/teams?limit=1',
  ];

  for (const url of testUrls) {
    try {
      const start = Date.now();
      const response = await fetch(url, {
        headers: { 'X-API-Key': process.env.HIGHLIGHTLY_API_KEY || '' },
        signal: AbortSignal.timeout(10000),
      });
      const duration = Date.now() - start;
      const text = await response.text().catch(() => 'no body');
      results.tests[url] = {
        ok: response.ok,
        status: response.status,
        duration,
        preview: text.slice(0, 200)
      };
    } catch (error: any) {
      results.tests[url] = {
        error: error.message,
        code: error.cause?.code || 'unknown'
      };
    }
  }

  return NextResponse.json(results);
}