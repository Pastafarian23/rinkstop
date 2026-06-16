/**
 * DEBUG-ONLY: deep-trace the dashboard page render by importing it and calling it.
 * Returns the error and stack if anything in the page (including JSX render or
 * component imports) throws.
 *
 * DELETE THIS FILE once the dashboard is fixed.
 */
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const log: any[] = [];
  let userId: string | null = null;

  try {
    const a = await auth();
    userId = a.userId;
    log.push({ step: 'auth', ok: !!userId, userId });
  } catch (e: any) {
    return NextResponse.json({ step: 'auth threw', err: e?.message, stack: e?.stack }, { status: 500 });
  }

  if (!userId) {
    return NextResponse.json({ msg: 'not signed in' }, { status: 401 });
  }

  // Try to import the page module (this is where Side Effects can throw)
  try {
    log.push({ step: 'importing page module' });
    const mod = await import('@/app/dashboard/page');
    log.push({ step: 'imported page module', ok: true, exports: Object.keys(mod) });
    const Page = (mod as any).default;
    if (typeof Page !== 'function') {
      log.push({ step: 'page export is not a function', got: typeof Page });
      return NextResponse.json({ log }, { status: 500 });
    }
    // Try to actually call the page
    try {
      const result = await Page();
      log.push({ step: 'Page() returned', type: typeof result, hasChildren: !!(result?.props?.children) });
    } catch (e: any) {
      log.push({ step: 'Page() threw', err: e?.message, stack: e?.stack });
      return NextResponse.json({ log }, { status: 500 });
    }
  } catch (e: any) {
    log.push({ step: 'page import threw', err: e?.message, stack: e?.stack });
    return NextResponse.json({ log }, { status: 500 });
  }

  // Try to import the layout module
  try {
    log.push({ step: 'importing layout module' });
    const mod = await import('@/app/dashboard/layout');
    log.push({ step: 'imported layout module', ok: true, exports: Object.keys(mod) });
    const Layout = (mod as any).default;
    if (typeof Layout !== 'function') {
      log.push({ step: 'layout export is not a function', got: typeof Layout });
      return NextResponse.json({ log }, { status: 500 });
    }
    try {
      const result = await Layout({ children: null });
      log.push({ step: 'Layout() returned', type: typeof result, hasChildren: !!(result?.props?.children) });
    } catch (e: any) {
      log.push({ step: 'Layout() threw', err: e?.message, stack: e?.stack });
      return NextResponse.json({ log }, { status: 500 });
    }
  } catch (e: any) {
    log.push({ step: 'layout import threw', err: e?.message, stack: e?.stack });
    return NextResponse.json({ log }, { status: 500 });
  }

  return NextResponse.json({ log, userId, msg: 'all steps completed' });
}
