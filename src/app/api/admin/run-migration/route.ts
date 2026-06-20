import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ENABLED = process.env.ENABLE_ADMIN_MIGRATION === '1';
const TOKEN = process.env.ADMIN_MIGRATION_TOKEN || '';
const PAT = process.env.SUPABASE_PAT || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'yszheonqyyskkjoxoexk';

export async function POST(request: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: 'Disabled' }, { status: 404 });
  }
  const authHeader = request.headers.get('authorization') || '';
  if (!TOKEN || authHeader !== `Bearer ${TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!PAT) {
    return NextResponse.json({ error: 'PAT not set' }, { status: 500 });
  }

  const body = await request.json();
  const { sql } = body;
  if (!sql) {
    return NextResponse.json({ error: 'sql required' }, { status: 400 });
  }

  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return NextResponse.json({ error: `Supabase ${resp.status}: ${text}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: text ? JSON.parse(text) : null });
}