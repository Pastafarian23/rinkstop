// src/app/api/rink-connections/contracts/[contractId]/sign/route.ts
//
// WS17 PR4 - Sign a rink contract.
//
//   POST /api/rink-connections/contracts/[contractId]/sign
//
// Reuses the existing player document signing infrastructure:
// - Canvas-based SignaturePad
// - consent_to_electronic: true checkbox
// - SHA-256 hash of document
// - IP + UA + timestamp audit trail
// - RA 8792 / ESIGN compliant
//
// This route is adapted from /api/team/[slug]/documents/[id]/sign/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { contractId } = await params;

  // Load the contract
  const { data: contract, error: contractErr } = await supabaseAdmin
    .from('rink_contracts')
    .select('id, connection_id, status, expires_at, document_hash, title')
    .eq('id', contractId)
    .single();

  if (contractErr || !contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  }

  if (contract.status !== 'sent') {
    return NextResponse.json({ error: 'This contract cannot be signed in its current state.' }, { status: 400 });
  }

  if (contract.expires_at && new Date(contract.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This contract has expired.' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const { signature_svg, consent_to_electronic, signatory_name, signatory_role } = body;

  if (!signature_svg || typeof signature_svg !== 'string') {
    return badRequest('signature_svg is required (canvas SVG data).');
  }
  if (!consent_to_electronic) {
    return badRequest('consent_to_electronic must be true.');
  }
  if (!signatory_name || typeof signatory_name !== 'string') {
    return badRequest('signatory_name is required.');
  }
  if (!signatory_role || typeof signatory_role !== 'string') {
    return badRequest('signatory_role is required.');
  }

  // Get IP and User-Agent from the request
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const signaturePayload = {
    svg: signature_svg,
    name: signatory_name,
    role: signatory_role,
    ip: ipAddress,
    ua: userAgent,
    timestamp: new Date().toISOString(),
  };

  // Insert signature record
  const { data: sigRecord, error: sigErr } = await supabaseAdmin
    .from('rink_contract_signatures')
    .insert({
      contract_id: contractId,
      signatory_name: signatory_name as string,
      signatory_role: signatory_role as string,
      signatory_user_id: userId,
      signature_payload: signaturePayload,
      document_hash: contract.document_hash,
      ip_address: ipAddress,
      user_agent: userAgent,
      consent_text: 'I agree to conduct this transaction by electronic means in accordance with RA 8792 (Electronic Commerce Act of 2000) and the U.S. federal ESIGN Act.',
    })
    .select('id')
    .single();

  if (sigErr) {
    console.error('[contract-sign] signature insert failed', sigErr);
    return NextResponse.json({ error: 'Failed to record signature.' }, { status: 500 });
  }

  // Update contract status
  const { error: updateErr } = await supabaseAdmin
    .from('rink_contracts')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signed_by_user_id: userId,
      signature_payload: signaturePayload,
    })
    .eq('id', contractId);

  if (updateErr) {
    console.error('[contract-sign] contract update failed', updateErr);
    return NextResponse.json({ error: 'Failed to update contract status.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    signature_id: sigRecord?.id,
    signed_at: new Date().toISOString(),
  }, { status: 200 });
}
