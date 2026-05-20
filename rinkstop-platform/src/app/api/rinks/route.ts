import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  if (id) {
    const { data, error } = await supabase.from('rinks').select('*').eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  }
  if (slug) {
    const { data, error } = await supabase.from('rinks').select('*').eq('slug', slug).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  }

  const country = searchParams.get('country');
  const activeOnly = searchParams.get('active') === 'true';
  const search = searchParams.get('search');

  let query = supabase.from('rinks').select('*');
  if (country) query = query.eq('country', country);
  if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);

  const { data, error } = await query.order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { data, error } = await supabase.from('rinks').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabase.from('rinks').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabase.from('rinks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}