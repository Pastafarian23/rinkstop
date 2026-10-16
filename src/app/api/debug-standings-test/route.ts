import { NextResponse } from 'next/server';
export async function GET() {
  const { supabaseAdmin } = await import('@/lib/supabase');
  const sb = await supabaseAdmin;
  const ids = [
    'cf05f5b0-6605-465f-86f3-a6f1710afc20',
    'e4977c12-28b3-4756-a788-cf86b40fc237',
    '4b75202e-b11b-4574-8ae6-7447f962cb55',
  ];
  const { data, error } = await sb.from('teams').select('id,name').in('id', ids);
  return NextResponse.json({ count: data?.length, error, note: 'using supabaseAdmin' });
}
