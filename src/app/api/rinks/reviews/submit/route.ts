import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

// Rate limit: 2 submissions per minute per IP (strict to prevent review spam)
const RATE_LIMIT = { maxRequests: 2, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = checkRateLimit(ip, RATE_LIMIT);
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

    const insertData: Record<string, unknown> = {
      rink_id,
      rating,
      status: 'approved', // auto-approve for now
    };

    if (review_text) insertData.review_text = review_text;
    if (reviewer_name) insertData.reviewer_name = reviewer_name;
    if (reviewer_email) insertData.reviewer_email = reviewer_email;

    const { data, error } = await supabase
      .from('rink_reviews')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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