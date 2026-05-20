import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role key (server-side only!)
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Verify a request has valid admin credentials
export async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);

  // In production, validate JWT properly. For now, check for a known admin secret.
  if (token === process.env.ADMIN_SECRET) {
    return { id: 'admin', email: 'arnel@rinkstop.com', role: 'super_admin' };
  }

  if (supabaseAdmin) {
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('id', token)
      .single();
    if (!error) return admin;
  }
  return null;
}