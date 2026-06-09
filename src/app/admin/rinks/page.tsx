import { supabaseAdmin } from '@/lib/supabase';
import RinksTable from './RinksTable';

export const dynamic = 'force-dynamic';

interface Rink {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  slug: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

async function getRinksData(search?: string, state?: string) {
  let query = supabaseAdmin
    .from('rinks')
    .select('id, name, city, state, country, slug, latitude, longitude, created_at, updated_at', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
  }
  if (state) {
    query = query.eq('state', state);
  }
  query = query.order('name', { ascending: true }).range(0, 999);

  const { data, count } = await query;

  const { data: stateRows } = await supabaseAdmin
    .from('rinks')
    .select('state')
    .not('state', 'is', null)
    .neq('state', '');
  const stateSet = new Set<string>((stateRows || []).map((r: any) => r.state).filter(Boolean));
  const states = Array.from(stateSet).sort();

  return {
    rinks: (data || []) as unknown as Rink[],
    total: count || 0,
    states,
  };
}

export default async function RinksPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search?.trim() || '';
  const state = sp.state || '';

  const { rinks, total, states } = await getRinksData(search, state);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Rinks</h1>
      <p className="text-slate-400 mb-8">
        Manage rink metadata, location, and details.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Rinks</div>
          <div className="text-2xl font-bold text-white">{total.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Geocoded</div>
          <div className="text-2xl font-bold text-teal-400">
            {rinks.filter((r) => r.latitude !== null && r.longitude !== null).length.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">States</div>
          <div className="text-2xl font-bold text-white">{states.length}</div>
        </div>
      </div>

      <RinksTable
        initialRinks={rinks}
        states={states}
        initialSearch={search}
        initialState={state}
      />
    </div>
  );
}
