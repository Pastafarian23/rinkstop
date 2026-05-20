import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hash } from 'bcryptjs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, full_name, role = 'editor' } = body;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  const passwordHash = await hash(password, 10);
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .insert({ email, password_hash: passwordHash, full_name, role })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
