import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  if (!player) {
    return <h1>Not found (server)</h1>;
  }

  return (
    <div>
      <h1>{player.first_name} {player.last_name}</h1>
      <p>Slug: {player.slug}</p>
    </div>
  );
}
