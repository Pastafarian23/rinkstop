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
  created_by_user_id: string | null;
  is_template: boolean;
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
  skills: { label: 'Skills', emoji: '🎯', color: 'bg-white/5 text-white ring-1 ring-white/15' },
  game_situations: { label: 'Game situations', emoji: '🏒', color: 'bg-white/5 text-white ring-1 ring-white/15' },
  off_ice: { label: 'Off-ice', emoji: '💪', color: 'bg-white/5 text-white ring-1 ring-white/15' },
  goalie: { label: 'Goalie', emoji: '🥅', color: 'bg-white/5 text-white ring-1 ring-white/15' },
  conditioning: { label: 'Conditioning', emoji: '⚡', color: 'bg-white/5 text-white ring-1 ring-white/15' },
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
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const { slug } = await params;

  const { data: plan, error } = await supabaseAdmin
    .from('practice_plans')
    .select('id, slug, title, summary, focus, age_min, age_max, duration_min, skill_level, structure, coach_notes, equipment, created_by_user_id, is_template')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !plan) {
    notFound();
  }

  const p = plan as PlanRow;
  const isMine = p.created_by_user_id === userId;
  const focusMeta = FOCUS_LABELS[p.focus] || { label: p.focus, emoji: '📋', color: 'bg-white/5 text-white ring-1 ring-white/15' };
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
        className="mb-4 inline-block text-sm text-[#FFB81C] hover:underline"
      >
        ← Back to plans
      </Link>

      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${focusMeta.color}`}>
            <span>{focusMeta.emoji}</span>
            <span>{focusMeta.label}</span>
          </span>
          <span className="rounded bg-white/5 px-2 py-1 text-xs text-white/70">⏱ {p.duration_min} min</span>
          <span className="rounded bg-white/5 px-2 py-1 text-xs text-white/70">{ageLabel}</span>
          <span className="rounded bg-white/5 px-2 py-1 text-xs text-white/70">{SKILL_LABELS[p.skill_level] || p.skill_level}</span>
        </div>

        <h1 className="text-3xl font-bold text-white">{p.title}</h1>
        <p className="mt-2 text-lg text-white/65">{p.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SaveButton planId={p.id} initialSaved={isSaved} />
          <MarkAsRunButton planId={p.id} planTitle={p.title} />
          {isMine && (
            <>
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400">
                Your plan
              </span>
              <Link
                href={`/dashboard/plans/${p.slug}/edit`}
                className="rounded-md border border-white/15 bg-[#111823] px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
              >
                Edit
              </Link>
            </>
          )}
        </div>

        {runCount !== null && runCount > 0 && (
          <p className="mt-3 text-sm text-white/65">
            You have run this plan <strong>{runCount}</strong> time{runCount === 1 ? '' : 's'}.
          </p>
        )}
      </header>

      {p.equipment && p.equipment.length > 0 && (
        <section className="mb-6 rounded-lg border border-white/10 bg-[#111823] p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/80">Equipment needed</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {p.equipment.map((eq, i) => (
              <li key={i} className="rounded bg-[#0D1117] px-2 py-1 text-white/80">{eq}</li>
            ))}
          </ul>
        </section>
      )}

      <PlanSegment title="Warmup" emoji="🔥" segments={p.structure.warmup} />
      <PlanSegment title="Main drills" emoji="⛸️" segments={p.structure.main} />
      <PlanSegment title="Cooldown" emoji="🧘" segments={p.structure.cooldown} />

      {(p.structure.coach_notes || p.coach_notes) && (
        <section className="mt-6 rounded-lg border-l-4 border-[#FFB81C] bg-[#FFB81C]/10 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#FFB81C]">Coach notes</h2>
          <p className="text-sm text-white/85">
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
        <h2 className="text-xl font-semibold text-white">
          <span className="mr-2">{emoji}</span>
          {title}
        </h2>
        <span className="text-sm text-white/50">{totalMin} min</span>
      </div>
      <ol className="space-y-3">
        {segments.map((seg, i) => (
          <li key={i} className="rounded-lg border border-white/10 bg-[#111823] p-4">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h3 className="font-medium text-white">{seg.name}</h3>
              <span className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-xs text-white/70">
                {seg.duration_min} min
              </span>
            </div>
            {seg.drills && (
              <p className="mt-1 text-sm text-white/80">
                <span className="font-medium text-white">Drill:</span> {seg.drills}
              </p>
            )}
            {seg.notes && (
              <p className="mt-1 text-sm italic text-white/65">
                {seg.notes}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
