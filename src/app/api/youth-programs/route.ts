import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const programType = searchParams.get('program_type');
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  let query = supabase.from('youth_programs').select('*');

  if (country) query = query.eq('country', country);
  if (programType) query = query.eq('program_type', programType);
  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query.order('country').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { data, error } = await supabase.from('youth_programs').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
