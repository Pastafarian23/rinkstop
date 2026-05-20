import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const search = searchParams.get('search');
  const country = searchParams.get('country');
  const level = searchParams.get('level');

  if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  if (id) {
    const { data, error } = await supabaseAdmin
      .from('coaches').select('*, teams(name, logo_url)').eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  }

  let query = supabaseAdmin.from('coaches').select('*, teams(name, logo_url)', { count: 'exact' });

  if (country) query = query.eq('country', country);
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);

  const { data, error, count } = await query.order('last_name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], count: count || 0 });
}