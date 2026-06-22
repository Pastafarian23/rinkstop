import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PlanBuilder from '@/components/plans/PlanBuilder';

export const metadata = { title: 'New Practice Plan' };

export default async function NewPlanPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard/plans"
        className="mb-4 inline-block text-sm text-[#041E42] hover:underline"
      >
        ← Back to plans
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Create a practice plan</h1>
        <p className="mt-1 text-slate-600">
          Build a structured plan with warmup, main drills, and cooldown. Save it to your library to share with assistant coaches and run again later.
        </p>
      </header>

      <PlanBuilder />
    </div>
  );
}
