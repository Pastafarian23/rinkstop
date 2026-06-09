import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import RinkEditForm from './RinkEditForm';

export const dynamic = 'force-dynamic';

async function getRink(id: string) {
  const { data: rink } = await supabaseAdmin
    .from('rinks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!rink) return null;

  const { count: claimsCount } = await supabaseAdmin
    .from('rink_claims')
    .select('*', { count: 'exact', head: true })
    .eq('rink_id', id)
    .eq('status', 'approved');

  const { data: reviews } = await supabaseAdmin
    .from('rink_reviews')
    .select('id, rating, review_text, reviewer_name, status, created_at')
    .eq('rink_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  return { rink, claimsCount: claimsCount || 0, reviews: reviews || [] };
}

export default async function RinkEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRink(id);
  if (!data) notFound();

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/rinks" className="text-slate-400 hover:text-white text-sm">← Back to Rinks</a>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">{data.rink.name}</h1>
      <p className="text-slate-400 mb-8 text-sm font-mono">{data.rink.id}</p>

      <RinkEditForm rink={data.rink} />

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Claims</h3>
          <div className="text-3xl font-bold text-white">{data.claimsCount}</div>
          <p className="text-xs text-slate-500 mt-1">approved claims on this rink</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Recent Reviews</h3>
          {data.reviews.length === 0 ? (
            <p className="text-slate-500 text-sm">No reviews yet</p>
          ) : (
            <ul className="text-xs space-y-1.5 max-h-40 overflow-y-auto">
              {data.reviews.slice(0, 5).map((rv: any) => (
                <li key={rv.id} className="text-slate-400">
                  <span className="text-amber-400">{'★'.repeat(rv.rating)}</span>
                  {' '}
                  {rv.reviewer_name}
                  <span className={`ml-2 ${rv.status === 'approved' ? 'text-teal-400' : 'text-amber-400'}`}>
                    ({rv.status})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
