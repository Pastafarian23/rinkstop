import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import SaveButton from '@/components/plans/SaveButton';
import MarkAsRunButton from '@/components/plans/MarkAsRunButton';

export const dynamic = 'force-dynamic';

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
  structure: PlanStructure;
  coach_notes: string | null;
  equipment: string[] | null;
}

interface PlanStructure {
  warmup?: PlanSegment[];
  main?: PlanSegment[];
  cooldown?: PlanSegment[];
  coach_notes?: string;
}

interface PlanSegment {
  name: string;
  duration_min: number;
  drills?: string;
  notes?: string;
}

const FOCUS_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  skills: { label: 'Skills', emoji: '🎯', color: 'bg-blue-100 text-blue-900' },
  game_situations: { label: 'Game situations', emoji: '🏒', color: 'bg-purple-100 text-purple-900' },
  off_ice: { label: 'Off-ice', emoji: '💪', color: 'bg-amber-100 text-amber-900' },
  goalie: { label: 'Goalie', emoji: '🥅', color: 'bg-red-100 text-red-900' },
  conditioning: { label: 'Conditioning', emoji: '⚡', color: 'bg-green-100 text-green-900' },
};

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all: 'All levels',
};

export default async function PlanDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const { data: plan, error } = await supabaseAdmin
    .from('practice_plans')
    .select('id, slug, title, summary, focus, age_min, age_max, duration_min, skill_level, structure, coach_notes, equipment')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single();

  if (error || !plan) {
    notFound();
  }

  const p = plan as PlanRow;
  const focusMeta = FOCUS_LABELS[p.focus] || { label: p.focus, emoji: '📋', color: 'bg-slate-100 text-slate-900' };
  const ageLabel = p.age_min === p.age_max ? `U${p.age_min}` : `U${p.age_min}–U${p.age_max}`;

  // Check if saved
  const { data: savedRows } = await supabaseAdmin
    .from('user_saved_plans')
    .select('plan_id')
    .eq('user_id', userId)
    .eq('plan_id', p.id);
  const isSaved = (savedRows?.length ?? 0) > 0;

  // Count prior runs
  const { count: runCount } = await supabaseAdmin
    .from('plan_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('plan_id', p.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard/plans"
        className="mb-4 inline-block text-sm text-[#041E42] hover:underline"
      >
        ← Back to plans
      </Link>

      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${focusMeta.color}`}>
            <span>{focusMeta.emoji}</span>
            <span>{focusMeta.label}</span>
          </span>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">⏱ {p.duration_min} min</span>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{ageLabel}</span>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{SKILL_LABELS[p.skill_level] || p.skill_level}</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900">{p.title}</h1>
        <p className="mt-2 text-lg text-slate-600">{p.summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <SaveButton planId={p.id} initialSaved={isSaved} />
          <MarkAsRunButton planId={p.id} planTitle={p.title} />
        </div>

        {runCount !== null && runCount > 0 && (
          <p className="mt-3 text-sm text-slate-600">
            You have run this plan <strong>{runCount}</strong> time{runCount === 1 ? '' : 's'}.
          </p>
        )}
      </header>

      {p.equipment && p.equipment.length > 0 && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">Equipment needed</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {p.equipment.map((eq, i) => (
              <li key={i} className="rounded bg-white px-2 py-1 text-slate-700">{eq}</li>
            ))}
          </ul>
        </section>
      )}

      <PlanSegment title="Warmup" emoji="🔥" segments={p.structure.warmup} />
      <PlanSegment title="Main drills" emoji="⛸️" segments={p.structure.main} />
      <PlanSegment title="Cooldown" emoji="🧘" segments={p.structure.cooldown} />

      {(p.structure.coach_notes || p.coach_notes) && (
        <section className="mt-6 rounded-lg border-l-4 border-[#FFB81C] bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-900">Coach notes</h2>
          <p className="text-sm text-amber-900">
            {p.structure.coach_notes || p.coach_notes}
          </p>
        </section>
      )}
    </div>
  );
}

function PlanSegment({
  title,
  emoji,
  segments,
}: {
  title: string;
  emoji: string;
  segments?: PlanSegment[];
}) {
  if (!segments || segments.length === 0) return null;
  const totalMin = segments.reduce((sum, s) => sum + s.duration_min, 0);
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          <span className="mr-2">{emoji}</span>
          {title}
        </h2>
        <span className="text-sm text-slate-500">{totalMin} min</span>
      </div>
      <ol className="space-y-3">
        {segments.map((seg, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h3 className="font-medium text-slate-900">{seg.name}</h3>
              <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {seg.duration_min} min
              </span>
            </div>
            {seg.drills && (
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Drill:</span> {seg.drills}
              </p>
            )}
            {seg.notes && (
              <p className="mt-1 text-sm italic text-slate-600">
                {seg.notes}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
