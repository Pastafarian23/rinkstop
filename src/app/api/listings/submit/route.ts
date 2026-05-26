import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingType, name, city, country, website, description, email } = body;

    if (!listingType || !name || !email) {
      return NextResponse.json({ error: 'Listing type, name, and email are required.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('listing_submissions')
      .insert({
        listing_type: listingType,
        name,
        city: city || null,
        country: country || null,
        website: website || null,
        description: description || null,
        email,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to submit listing. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err) {
    console.error('Submit listing error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}