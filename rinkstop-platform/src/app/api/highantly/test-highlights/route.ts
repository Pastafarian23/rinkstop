import { NextResponse } from 'next/server';

const API_KEY = process.env.HIGHLANTLY_API_KEY || process.env.HIGHLIGHTLY_API_KEY || '879d8462-6431-41fd-aa73-151223ff1562';

export async function GET() {
  const results = [];
  
  const endpoints = [
    '/highlights?date=2026-05-18&limit=5',
    '/highlights?date=2026-05-18',
    '/highlights',
  ];
  
  for (const ep of endpoints) {
    try {
      const url = `https://hockey.highantly.net${ep}`;
      console.log(`Testing: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
        },
      });
      
      const status = response.status;
      const body = await response.text();
      
      results.push({ endpoint: ep, status, bodyPreview: body.slice(0, 200) });
    } catch (e: any) {
      results.push({ endpoint: ep, error: e.message });
    }
  }
  
  return NextResponse.json({ API_KEY_PREFIX: API_KEY.slice(0, 10), results });
}
