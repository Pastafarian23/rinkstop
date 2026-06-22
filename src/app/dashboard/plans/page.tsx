import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import PlanCard from '@/components/plans/PlanCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Practice Plans' };

interface PlanRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  focus: string;
  age_min: number;
  age_max: number;
  duration_min: number;
  skill_level: string;
  equipment: string[] | null;
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; age?: string; duration?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const sp = await searchParams;

  // Fetch all published plans
  let plans: PlanRow[] = [];
  let queryError: string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from('practice_plans')
      .select('id, slug, title, summary, focus, age_min, age_max, duration_min, skill_level, equipment')
      .eq('is_published', true)
      .order('age_min', { ascending: true });
    if (error) {
      queryError = error.message;
    } else {
      plans = (data || []) as PlanRow[];
    }
  } catch (e) {
    queryError = e instanceof Error ? e.message : 'Unknown error';
  }

  // Fetch user's saved plans
  let savedIds = new Set<string>();
  try {
    const { data } = await supabaseAdmin
      .from('user_saved_plans')
      .select('plan_id')
      .eq('user_id', userId);
    if (data) savedIds = new Set(data.map((r) => r.plan_id));
  } catch {
    // Non-blocking
  }

  // Fetch user's own created plans (to mark them as "Your plan")
  let createdIds = new Set<string>();
  try {
    const { data } = await supabaseAdmin
      .from('practice_plans')
      .select('id')
      .eq('created_by_user_id', userId);
    if (data) createdIds = new Set(data.map((r) => r.id));
  } catch {
    // Non-blocking
  }

  // Apply filters (server-side for now; client-side would be nicer)
  const filtered = plans.filter((p) => {
    if (sp.focus && p.focus !== sp.focus) return false;
    if (sp.age) {
      const ageBand = sp.age; // e.g. "U8-U10" or "U12"
      const m = ageBand.match(/U?(\d+)(?:-U?(\d+))?/);
      if (m) {
        const lo = parseInt(m[1], 10);
        const hi = m[2] ? parseInt(m[2], 10) : lo;
        if (p.age_min > hi || p.age_max < lo) return false;
      }
    }
    if (sp.duration) {
      const max = parseInt(sp.duration, 10);
      if (p.duration_min > max) return false;
    }
    return true;
  });

  const focusFilters = [
    { value: '', label: 'All' },
    { value: 'skills', label: 'Skills' },
    { value: 'game_situations', label: 'Game situations' },
    { value: 'off_ice', label: 'Off-ice' },
    { value: 'goalie', label: 'Goalie' },
    { value: 'conditioning', label: 'Conditioning' },
  ];
  const ageFilters = [
    { value: '', label: 'All ages' },
    { value: 'U8-U10', label: 'U8–U10' },
    { value: 'U12', label: 'U12' },
    { value: 'U14', label: 'U14' },
    { value: 'U16-U18', label: 'U16–U18' },
  ];
  const durationFilters = [
    { value: '', label: 'Any length' },
    { value: '15', label: '15 min or less' },
    { value: '30', label: '30 min or less' },
    { value: '45', label: '45 min or less' },
    { value: '60', label: '60 min or less' },
    { value: '90', label: '90 min or less' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Practice Plans</h1>
          <p className="mt-1 text-slate-600">
            {plans.length} practice plan templates. Save the ones you like, mark them as run after practice, or build your own.
          </p>
        </div>
        <Link
          href="/dashboard/plans/new"
          className="rounded-md bg-[#041E42] px-4 py-2 text-sm font-medium text-white hover:bg-[#041E42]/90"
        >
          + Create plan
        </Link>
      </header>

      {queryError && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Heads up:</strong> could not load plans ({queryError}). Try refreshing.
        </div>
      )}

      {savedIds.size > 0 && !sp.focus && !sp.age && !sp.duration && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Your saved plans</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {plans
              .filter((p) => savedIds.has(p.id))
              .map((plan) => (
                <PlanCard
                  key={plan.id}
                  id={plan.id}
                  slug={plan.slug}
                  title={plan.title}
                  summary={plan.summary}
                  focus={plan.focus}
                  ageMin={plan.age_min}
                  ageMax={plan.age_max}
                  durationMin={plan.duration_min}
                  skillLevel={plan.skill_level}
                  equipment={plan.equipment || []}
                  initialSaved={true}
                  isMine={createdIds.has(plan.id)}
                />
              ))}
          </div>
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">All plans</h2>
          </div>
        </section>
      )}

      {/* Filter bar */}
      <form
        method="GET"
        className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3"
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Focus</span>
          <select
            name="focus"
            defaultValue={sp.focus || ''}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {focusFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Age</span>
          <select
            name="age"
            defaultValue={sp.age || ''}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {ageFilters.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Duration</span>
          <select
            name="duration"
            defaultValue={sp.duration || ''}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {durationFilters.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>
        <div className="md:col-span-3 flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-[#041E42] px-4 py-2 text-sm font-medium text-white hover:bg-[#041E42]/90"
          >
            Apply filters
          </button>
          <Link
            href="/dashboard/plans"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear
          </Link>
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
          <p className="text-lg">No plans match your filters.</p>
          <Link href="/dashboard/plans" className="mt-2 inline-block text-sm text-[#041E42] underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              id={plan.id}
              slug={plan.slug}
              title={plan.title}
              summary={plan.summary}
              focus={plan.focus}
              ageMin={plan.age_min}
              ageMax={plan.age_max}
              durationMin={plan.duration_min}
              skillLevel={plan.skill_level}
              equipment={plan.equipment || []}
              initialSaved={savedIds.has(plan.id)}
              isMine={createdIds.has(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
