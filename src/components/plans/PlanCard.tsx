'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PlanCardProps {
  id: string;
  slug: string;
  title: string;
  summary: string;
  focus: string;
  ageMin: number;
  ageMax: number;
  durationMin: number;
  skillLevel: string;
  equipment: string[];
  initialSaved: boolean;
  isMine?: boolean;
}

const FOCUS_LABELS: Record<string, { label: string; emoji: string; color: string; accent: string }> = {
  skills: { label: 'Skills', emoji: '🎯', color: 'bg-white/5 text-white ring-1 ring-white/15', accent: 'border-l-[#C8102E]' },
  game_situations: { label: 'Game situations', emoji: '🏒', color: 'bg-white/5 text-white ring-1 ring-white/15', accent: 'border-l-[#C8102E]' },
  off_ice: { label: 'Off-ice', emoji: '💪', color: 'bg-white/5 text-white ring-1 ring-white/15', accent: 'border-l-[#FFB81C]' },
  goalie: { label: 'Goalie', emoji: '🥅', color: 'bg-white/5 text-white ring-1 ring-white/15', accent: 'border-l-[#14B8A6]' },
  conditioning: { label: 'Conditioning', emoji: '⚡', color: 'bg-white/5 text-white ring-1 ring-white/15', accent: 'border-l-[#FFB81C]' },
};

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all: 'All levels',
};

export default function PlanCard(props: PlanCardProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(props.initialSaved);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const focusMeta = FOCUS_LABELS[props.focus] || { label: props.focus, emoji: '📋', color: 'bg-white/5 text-white ring-1 ring-white/15', accent: 'border-l-white/30' };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const next = !saved;
    setSaved(next); // optimistic

    try {
      const res = await fetch('/api/plans/save', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: props.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setSaved(!next); // revert
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const ageLabel = props.ageMin === props.ageMax
    ? `U${props.ageMin}`
    : `U${props.ageMin}–U${props.ageMax}`;

  return (
    <div className={`flex flex-col rounded-lg border border-white/15 border-l-4 ${focusMeta.accent} bg-[#161F2E] p-4 shadow-md min-h-[180px] transition hover:shadow-lg`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${focusMeta.color}`}>
            <span>{focusMeta.emoji}</span>
            <span>{focusMeta.label}</span>
          </span>
          {props.isMine && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
              Your plan
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleSave}
          disabled={isPending}
          aria-label={saved ? 'Unsave plan' : 'Save plan'}
          className="text-2xl leading-none transition hover:scale-110 disabled:opacity-50"
          title={saved ? 'Saved — click to unsave' : 'Save this plan'}
        >
          {saved ? '❤️' : '🤍'}
        </button>
      </div>

      <h3 className="mb-1 text-lg font-semibold text-white">{props.title}</h3>
      <p className="mb-3 line-clamp-2 text-sm text-white/65">{props.summary}</p>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-white/5 px-2 py-1 text-white/70">⏱ {props.durationMin} min</span>
        <span className="rounded bg-white/5 px-2 py-1 text-white/70">{ageLabel}</span>
        <span className="rounded bg-white/5 px-2 py-1 text-white/70">{SKILL_LABELS[props.skillLevel] || props.skillLevel}</span>
      </div>

      {error && (
        <p className="mb-2 text-xs text-[#C8102E]" role="alert">{error}</p>
      )}

      <Link
        href={`/dashboard/plans/${props.slug}`}
        className="mt-auto block rounded-md bg-[#FFB81C] px-3 py-2 text-center text-sm font-medium text-[#0D1117] hover:bg-[#FFB81C]/90"
      >
        View plan
      </Link>
    </div>
  );
}
