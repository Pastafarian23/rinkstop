import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import PlanCard from '@/components/plans/PlanCard';
import Dropdown from '@/components/ui/Dropdown';

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
          <h1 className="text-3xl font-bold text-white">Practice Plans</h1>
          <p className="mt-1 text-white/65">
            {plans.length} practice plan templates. Save the ones you like, mark them as run after practice, or build your own.
          </p>
        </div>
        <Link
          href="/dashboard/plans/new"
          className="rounded-md bg-[#FFB81C] px-4 py-2 text-sm font-medium text-[#0D1117] hover:bg-[#FFB81C]/90"
        >
          + Create plan
        </Link>
      </header>

      {queryError && (
        <div className="mb-6 rounded-md border border-[#FFB81C]/40 bg-[#FFB81C]/10 p-3 text-sm text-[#FFB81C]">
          <strong>Heads up:</strong> could not load plans ({queryError}). Try refreshing.
        </div>
      )}

      {savedIds.size > 0 && !sp.focus && !sp.age && !sp.duration && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Your saved plans</h2>
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
          <div className="mt-6 border-t border-white/10 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-white">All plans</h2>
          </div>
        </section>
      )}

      {/* Filter bar */}
      <form
        method="GET"
        className="mb-6 rounded-lg border border-white/10 bg-[#111823] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/55">
            Filter plans
          </h2>
          {(sp.focus || sp.age || sp.duration) && (
            <span className="text-xs text-[#FFB81C]">
              {[
                sp.focus && `focus: ${focusFilters.find((f) => f.value === sp.focus)?.label}`,
                sp.age && `age: ${ageFilters.find((a) => a.value === sp.age)?.label}`,
                sp.duration && `≤ ${sp.duration} min`,
              ].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/55">
              Focus
            </label>
            <Dropdown
              name="focus"
              value={sp.focus || ''}
              options={focusFilters.map((f) => ({ value: f.value, label: f.label }))}
              ariaLabel="Focus filter"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/55">
              Age
            </label>
            <Dropdown
              name="age"
              value={sp.age || ''}
              options={ageFilters.map((a) => ({ value: a.value, label: a.label }))}
              ariaLabel="Age filter"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/55">
              Duration
            </label>
            <Dropdown
              name="duration"
              value={sp.duration || ''}
              options={durationFilters.map((d) => ({ value: d.value, label: d.label }))}
              ariaLabel="Duration filter"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2 border-t border-white/10 pt-4">
          <button
            type="submit"
            className="rounded-md bg-[#FFB81C] px-4 py-2 text-sm font-bold text-[#0D1117] hover:bg-[#FFB81C]/90"
          >
            Apply filters
          </button>
          <Link
            href="/dashboard/plans"
            className="rounded-md border border-white/15 bg-[#0D1117] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/5"
          >
            Clear all
          </Link>
          <span className="ml-auto self-center text-xs text-white/45">
            Showing {filtered.length} of {plans.length}
          </span>
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-[#111823] p-8 text-center text-white/65">
          <p className="text-lg">No plans match your filters.</p>
          <Link href="/dashboard/plans" className="mt-2 inline-block text-sm text-[#FFB81C] underline">
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
