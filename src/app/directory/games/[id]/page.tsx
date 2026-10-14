import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export default async function Page(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data } = await sb().from('fixtures').select('id, status, scheduled_at, home_score, away_score').eq('id', id).maybeSingle();
  if (!data) return <div>Not found</div>;
  return <div>{data.id} {data.status} {data.home_score}-{data.away_score}</div>;
}
