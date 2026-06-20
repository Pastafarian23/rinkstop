/**
 * Dev-only: apply a SQL migration via Supabase Management API.
 * Single-session tool. Will be removed after.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_ADMIN_MIGRATION !== '1') {
    return NextResponse.json({ error: 'Not enabled' }, { status: 404 });
  }
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token || token !== process.env.ADMIN_MIGRATION_TOKEN) {
    return NextResponse.json({ error: 'Bad token' }, { status: 401 });
  }
  const sql = await request.text();
  if (!sql || sql.length < 10) {
    return NextResponse.json({ error: 'Empty SQL' }, { status: 400 });
  }
  const pat = process.env.SUPABASE_PAT;
  if (!pat) {
    return NextResponse.json({ error: 'SUPABASE_PAT not set' }, { status: 500 });
  }
  const resp = await fetch(
    'https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await resp.text();
  return NextResponse.json({
    supabaseStatus: resp.status,
    supabaseBody: text.slice(0, 5000),
    sqlLength: sql.length,
  });
}