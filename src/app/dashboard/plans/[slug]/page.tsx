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

      <PlanSegment title="Warmup" emoji="🔥" accent="#C8102E" segments={p.structure.warmup} />
      <PlanSegment title="Main drills" emoji="⛸️" accent="#FFB81C" segments={p.structure.main} />
      <PlanSegment title="Cooldown" emoji="🧘" accent="#14b8a6" segments={p.structure.cooldown} />

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
    <section className="mb-8">
      {/* Section header with colored accent bar on the left */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 12, marginBottom: 16,
        borderBottom: `2px solid ${accent}`,
      }}>
        <h2 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em',
          margin: 0, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>{emoji}</span>
          <span>{title.toUpperCase()}</span>
        </h2>
        <span style={{
          fontSize: 12, fontWeight: 700, color: accent,
          background: `${accent}20`,
          padding: '0.25rem 0.7rem',
          borderRadius: 999,
          letterSpacing: '0.04em',
        }}>
          {totalMin} MIN TOTAL
        </span>
      </div>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {segments.map((seg, i) => (
          <li
            key={i}
            style={{
              position: 'relative',
              padding: '1.25rem 1.25rem 1.25rem 4rem',
              background: '#0f0f0f',
              border: '1px solid #1e1e1e',
              borderLeft: `3px solid ${accent}`,
              borderRadius: 8,
            }}
          >
            {/* Numbered circle on the left */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${accent}25`,
                border: `1px solid ${accent}80`,
                color: accent,
                borderRadius: '50%',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {i + 1}
            </span>

            {/* Header row: segment name + duration pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, flex: 1, minWidth: 0 }}>
                {seg.name}
              </h3>
              <span style={{
                flexShrink: 0,
                fontSize: 12, fontWeight: 700,
                color: 'rgba(255,255,255,0.85)',
                background: 'rgba(255,255,255,0.08)',
                padding: '0.3rem 0.7rem',
                borderRadius: 6,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span aria-hidden="true">⏱</span> {seg.duration_min} min
              </span>
            </div>

            {/* Drill block — clearly labeled */}
            {seg.drills && (
              <div style={{
                marginTop: 10, padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                  color: accent, textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  DRILL
                </div>
                <p style={{
                  fontSize: 14, color: '#fff', lineHeight: 1.5, margin: 0,
                  whiteSpace: 'pre-wrap',
                }}>
                  {seg.drills}
                </p>
              </div>
            )}

            {/* Notes block — visually distinct from drills */}
            {seg.notes && (
              <div style={{
                marginTop: 8, padding: '0.65rem 0.9rem',
                background: 'rgba(255,184,28,0.04)',
                border: '1px dashed rgba(255,184,28,0.25)',
                borderRadius: 6,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                  color: 'rgba(255,184,28,0.85)', textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  COACH NOTE
                </div>
                <p style={{
                  fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
                  margin: 0, fontStyle: 'italic',
                  whiteSpace: 'pre-wrap',
                }}>
                  {seg.notes}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
