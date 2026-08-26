/**
 * One-time admin route to set STRIPE_WEBHOOK_SECRET on Vercel.
 * Pattern: set env var via Vercel API, hit this route, delete route + env var.
 * Gate: one-time secret in URL.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('s');

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not set in env' }, { status: 500 });
  }

  const projectId = 'prj_GVvqDaSS264FFo6q8LYAKGVe0bvM';
  const vercelToken = process.env.VERCEL_TOKEN;

  if (!vercelToken) {
    return NextResponse.json({ error: 'VERCEL_TOKEN not set in env' }, { status: 500 });
  }

  const create = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: 'STRIPE_WEBHOOK_SECRET',
      value: webhookSecret,
      type: 'sensitive',
      target: ['production', 'preview'],
    }),
  });

  const createData = await create.json();

  if (createData.error?.code === 'environment_already_exists') {
    const list = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env?key=STRIPE_WEBHOOK_SECRET`,
      { headers: { 'Authorization': `Bearer ${vercelToken}` } },
    );
    const listData = await list.json();
    const existing = (listData.envs || [])[0];

    if (existing) {
      const patch = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value: webhookSecret,
            target: ['production', 'preview'],
          }),
        },
      );
      const patchData = await patch.json();
      return NextResponse.json({
        action: 'patched',
        id: existing.id,
        response: patchData,
      });
    }
  }

  return NextResponse.json({
    action: create.ok ? 'created' : 'error',
    response: createData,
  });
}
