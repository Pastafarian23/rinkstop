import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

// Rate limit: 2 submissions per minute per IP (strict to prevent review spam)
const RATE_LIMIT = { maxRequests: 2, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(ip, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many review submissions. Please wait before submitting another review.' }),
      { status: 429 }
    );
    applyRateLimitHeaders(response, result);
    response.headers.set('Content-Type', 'application/json');
    return response;
  }

  try {
    const body = await request.json();
    const { rink_id, rating, review_text, reviewer_name, reviewer_email } = body;

    // Validate required fields
    if (!rink_id) {
      return NextResponse.json({ error: 'rink_id is required' }, { status: 400 });
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (review_text && review_text.length > 1000) {
      return NextResponse.json(
        { error: 'review_text must be 1000 characters or fewer' },
        { status: 400 }
      );
    }

    // If the user is signed in, capture their Clerk userId and authoritative email.
    // This lets /dashboard/reviews show their reviews even if they used a different
    // email on the public review form, and prevents impersonation of other users.
    const { userId } = await auth();
    let authoritativeEmail = reviewer_email;
    let authoritativeName = reviewer_name;
    if (userId) {
      const user = await currentUser();
      const clerkEmail = user?.emailAddresses?.[0]?.emailAddress || reviewer_email;
      const clerkName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || reviewer_name;
      authoritativeEmail = clerkEmail;
      authoritativeName = clerkName;
    }

    const insertData: Record<string, unknown> = {
      rink_id,
      rating,
      status: 'approved', // auto-approve for now
    };

    if (review_text) insertData.review_text = review_text;
    if (authoritativeName) insertData.reviewer_name = authoritativeName;
    if (authoritativeEmail) insertData.reviewer_email = authoritativeEmail;
    if (userId) insertData.user_id = userId;

    const { data, error } = await supabaseAdmin
      .from('rink_reviews')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('reviews/submit: insert failed', error);
      return NextResponse.json({ error: 'Failed to save review.' }, { status: 500 });
    }

    const response = NextResponse.json({ data }, { status: 201 });
    return applyRateLimitHeaders(response, result);
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}