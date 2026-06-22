import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import PlanEditor from '@/components/plans/PlanEditor';

export const dynamic = 'force-dynamic';

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/login');
  const { slug } = await params;

  const { data: plan, error } = await supabaseAdmin
    .from('practice_plans')
    .select('id, slug, title, summary, focus, age_min, age_max, duration_min, skill_level, structure, coach_notes, equipment, is_template, created_by_user_id')
    .eq('slug', slug)
    .single();

  if (error || !plan) {
    notFound();
  }

  // Only the creator can edit
  if (plan.created_by_user_id !== userId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Not your plan</h1>
        <p className="mt-2 text-slate-600">
          You can only edit plans you created. To use this plan as a starting point, you can clone it (coming soon) or build a new plan from scratch.
        </p>
        <Link
          href={`/dashboard/plans/${plan.slug}`}
          className="mt-4 inline-block rounded-md bg-[#041E42] px-4 py-2 text-sm font-medium text-white hover:bg-[#041E42]/90"
        >
          ← Back to plan
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/dashboard/plans/${plan.slug}`}
        className="mb-4 inline-block text-sm text-[#041E42] hover:underline"
      >
        ← Back to plan
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Edit practice plan</h1>
        <p className="mt-1 text-slate-600">
          Update fields and segments. Changes are saved immediately.
        </p>
      </header>

      <PlanEditor
        planId={plan.id}
        initial={{
          title: plan.title,
          summary: plan.summary,
          focus: plan.focus,
          age_min: plan.age_min,
          age_max: plan.age_max,
          duration_min: plan.duration_min,
          skill_level: plan.skill_level,
          structure: plan.structure,
          coach_notes: plan.coach_notes,
          equipment: plan.equipment || [],
          is_template: plan.is_template,
        }}
      />
    </div>
  );
}
