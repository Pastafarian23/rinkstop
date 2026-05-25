import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const country = searchParams.get('country');
  const search = searchParams.get('search');
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  let query = supabase.from('rinks').select('*');

  if (id) {
    query = query.eq('id', id).limit(1);
  } else if (slug) {
    query = query.eq('slug', slug).limit(1);
  } else {
    if (country) query = query.eq('country', country);
    if (activeOnly) query = query.eq('is_active', true);
    if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
  }

  const { data, error } = await query.order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(id || slug ? (data?.[0] ?? null) : data);
}