import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/profile-posts/[id] — owner only, soft delete
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify ownership before soft-deleting
  const { data: post } = await supabase
    .from('profile_posts')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (post.user_id !== clerkUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('profile_posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
