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
      {/* Sticky plan context bar — shows plan title + actions on scroll */}
      <div
        className="sticky top-0 z-40 -mx-4 mb-6 border-b border-white/10 bg-[#0D1117]/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#0D1117]/70"
        style={{ WebkitBackdropFilter: 'blur(8px)' }}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white sm:text-base">
              {p.title}
            </p>
            <p className="hidden truncate text-xs text-white/55 sm:block">
              {p.summary}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SaveButton planId={p.id} initialSaved={isSaved} />
            <MarkAsRunButton planId={p.id} planTitle={p.title} />
          </div>
        </div>
      </div>

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
        <section className="mb-6 rounded-lg border border-white/10 bg-[#0f0f0f] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/55">
            <span aria-hidden="true">🏒</span>
            <span>Equipment needed</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/65">
              {p.equipment.length}
            </span>
          </h2>
          <ul className="flex flex-wrap gap-2">
            {p.equipment.map((eq, i) => (
              <li
                key={i}
                className="rounded-md border border-white/15 bg-[#0D1117] px-3 py-1.5 text-sm font-medium text-white"
              >
                {eq}
              </li>
            ))}
          </ul>
        </section>
      )}

      <PlanSection title="Warmup" emoji="🔥" accent="#C8102E" segments={p.structure.warmup} />
      <PlanSection title="Main drills" emoji="⛸️" accent="#FFB81C" segments={p.structure.main} />
      <PlanSection title="Cooldown" emoji="🧘" accent="#14b8a6" segments={p.structure.cooldown} />

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

function PlanSection({
  title,
  emoji,
  accent,
  segments,
}: {
  title: string;
  emoji: string;
  accent: string;
  segments?: PlanSegment[];
}) {
  if (!segments || segments.length === 0) return null;
  const totalMin = segments.reduce((sum, s) => sum + s.duration_min, 0);
  return (
    <section className="mb-10">
      {/* Section header — just the section name + total minutes, no inline drills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
          marginBottom: 20,
          borderBottom: `2px solid ${accent}`,
          gap: 12,
        }}
      >
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '1.5rem', flexShrink: 0 }}>{emoji}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title.toUpperCase()}
          </span>
        </h2>
        <span
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            color: accent,
            background: `${accent}20`,
            padding: '0.3rem 0.8rem',
            borderRadius: 999,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {totalMin} MIN · {segments.length} DRILL{segments.length === 1 ? '' : 'S'}
        </span>
      </div>

      {/* Each drill is its own card */}
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {segments.map((seg, i) => (
          <DrillCard key={i} segment={seg} index={i} accent={accent} />
        ))}
      </ol>
    </section>
  );
}

function DrillCard({
  segment,
  index,
  accent,
}: {
  segment: PlanSegment;
  index: number;
  accent: string;
}) {
  return (
    <li
      style={{
        background: '#111823',
        border: '1px solid rgba(255,255,255,0.12)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        padding: '14px 14px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Card header: numbered badge + segment name + duration */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 36,
            height: 28,
            padding: '0 10px',
            background: `${accent}25`,
            border: `1px solid ${accent}80`,
            color: accent,
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          #{index + 1}
        </span>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          {segment.name}
        </h3>
        <span
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
            background: 'rgba(255,255,255,0.08)',
            padding: '0.3rem 0.7rem',
            borderRadius: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span aria-hidden="true">⏱</span> {segment.duration_min} min
        </span>
      </div>

      {/* DRILL block — flat, prominent inside the card */}
      {segment.drills && (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: accent,
              textTransform: 'uppercase',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span aria-hidden="true">⛳</span>
            <span>Drill</span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: '#fff',
              lineHeight: 1.55,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {segment.drills}
          </p>
        </div>
      )}

      {/* COACH NOTE block — flat, distinct, only if present */}
      {segment.notes && (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(255,184,28,0.06)',
            border: '1px dashed rgba(255,184,28,0.30)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: 'rgba(255,184,28,0.95)',
              textTransform: 'uppercase',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span aria-hidden="true">📝</span>
            <span>Coach note</span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.55,
              margin: 0,
              fontStyle: 'italic',
              whiteSpace: 'pre-wrap',
            }}
          >
            {segment.notes}
          </p>
        </div>
      )}
    </li>
  );
}
