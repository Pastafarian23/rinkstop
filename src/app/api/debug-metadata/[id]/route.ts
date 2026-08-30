import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getDirectAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const sb = getDirectAdminClient();

  const result: any = {
    id,
    isUuid,
    env: { url: envUrl?.substring(0, 50), keySet: envKey },
    sbCreated: !!sb,
  };

  if (sb) {
    const { data, error } = await sb
      .from('players')
      .select('id, first_name, last_name, slug')
      .eq(isUuid ? 'id' : 'slug', id)
      .maybeSingle();
    result.query = {
      found: !!data,
      data: data ? { id: data.id, name: `${data.first_name} ${data.last_name}`, slug: data.slug } : null,
      error: error?.message || null,
      code: error?.code || null,
    };
  }

  return NextResponse.json(result);
}
