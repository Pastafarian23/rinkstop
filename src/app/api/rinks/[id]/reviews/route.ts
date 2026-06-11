import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: reviews, error } = await supabase
    .from('rink_reviews')
    .select('*')
    .eq('rink_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total_reviews = reviews?.length ?? 0;
  const average_rating =
    total_reviews > 0
      ? Number(
          (
            reviews!.reduce((sum, r) => sum + r.rating, 0) / total_reviews
          ).toFixed(1)
        )
      : 0;

  const r = NextResponse.json({
    data: reviews,
    average_rating,
    total_reviews,
  });
  r.headers.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=1800');
  return r;
}
