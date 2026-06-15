// GET /api/admin/intake/export?source=leads|email_captures|listing_submissions|listing_inquiries
// CSV export of an intake source with optional filters.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Source = 'leads' | 'email_captures' | 'listing_submissions' | 'listing_inquiries';

const VALID_SOURCES: Source[] = ['leads', 'email_captures', 'listing_submissions', 'listing_inquiries'];

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') as Source | null;
  const search = searchParams.get('search')?.trim() || '';
  const status = searchParams.get('status') || 'all';

  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: `source must be one of ${VALID_SOURCES.join(', ')}` }, { status: 400 });
  }

  let query = supabaseAdmin.from(source).select('*').order('created_at', { ascending: false }).limit(5000);
  if (source === 'listing_inquiries') {
    // Not a real table — re-target to leads with listing_id NOT NULL
    query = supabaseAdmin.from('leads').select('*').not('listing_id', 'is', null).order('created_at', { ascending: false }).limit(5000);
  }

  if (status === 'unread' && (source === 'leads' || source === 'listing_inquiries')) {
    query = query.is('read_at', null);
  } else if (status === 'read' && (source === 'leads' || source === 'listing_inquiries')) {
    query = query.not('read_at', 'is', null);
  } else if (status !== 'all' && source === 'listing_submissions') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Apply search in JS (PostgREST ilike across multiple columns is messy)
  let rows = data || [];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r: any) => {
      const haystack = [
        r.email,
        r.name,
        r.city,
        r.country,
        r.listing_name,
        r.message,
        r.intent,
        r.entity_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (rows.length === 0) {
    return new Response('(no rows)', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="intake-${source}-${Date.now()}.csv"`,
      },
    });
  }

  // Build CSV from the union of all keys in the rows (so we capture every field)
  const keySet = new Set<string>();
  for (const row of rows) for (const k of Object.keys(row)) keySet.add(k);
  const keys = Array.from(keySet).sort();

  const header = keys.map(csvEscape).join(',');
  const body = rows.map((row: any) => keys.map((k) => csvEscape(row[k])).join(',')).join('\n');
  const csv = `${header}\n${body}\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="intake-${source}-${Date.now()}.csv"`,
    },
  });
}
