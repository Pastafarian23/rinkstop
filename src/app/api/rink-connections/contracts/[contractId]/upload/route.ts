// src/app/api/rink-connections/contracts/[contractId]/upload/route.ts
//
// WS17 PR4 Phase 2C — Contract PDF Upload
//
// POST /api/rink-connections/contracts/[contractId]/upload
//
// Uploads a contract PDF to Supabase Storage `rink-contracts` bucket.
// Path structure: {rinkId}/{contractId}/{timestamp}-{filename}
//
// Security:
// - Requires authentication
// - User must be a rink owner for the contract's rink
// - Contract must be in 'sent' status
// - Max file size: 10MB (enforced by bucket + route check)
// - SHA-256 hash computed and stored for audit trail

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function parseFormData(request: NextRequest): Promise<{ file: Buffer; filename: string; contentType: string } | null> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return null;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      file: buffer,
      filename: file.name,
      contentType: file.type,
    };
  } catch {
    return null;
  }
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

  // Parse multipart form data
  const fileData = await parseFormData(request);
  if (!fileData) {
    return NextResponse.json({ error: 'No file provided. Use multipart/form-data with "file" field.' }, { status: 400 });
  }

  // Validate file size
  if (fileData.file.length > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` }, { status: 400 });
  }

  // Validate file type (PDF or image)
  const isPdf = fileData.contentType === 'application/pdf';
  const isImage = fileData.contentType.startsWith('image/');
  if (!isPdf && !isImage) {
    return NextResponse.json({ error: 'Invalid file type. Only PDF and images are allowed.' }, { status: 400 });
  }

  // Load contract
  const { data: contract, error: contractErr } = await supabaseAdmin
    .from('rink_contracts')
    .select('id, connection_id, status, rink_id, title')
    .eq('id', contractId)
    .single();

  if (contractErr || !contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  }

  if (contract.status !== 'sent') {
    return NextResponse.json({ error: 'Contracts can only be uploaded when status is "sent".', current_status: contract.status }, { status: 400 });
  }

  // Verify user is a rink owner for this contract's rink
  const { data: ownerCheck, error: ownerErr } = await supabaseAdmin
    .from('rink_owners')
    .select('id')
    .eq('rink_id', contract.rink_id)
    .eq('user_id', userId)
    .single();

  if (ownerErr || !ownerCheck) {
    return NextResponse.json({ error: 'Only rink owners can upload contracts.' }, { status: 403 });
  }

  // Compute SHA-256 hash of file
  const hash = createHash('sha256').update(fileData.file).digest('hex');

  // Generate storage path: {rinkId}/{contractId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const sanitizedFilename = fileData.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${contract.rink_id}/${contractId}/${timestamp}-${sanitizedFilename}`;

  // Upload to Supabase Storage
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('rink-contracts')
    .upload(storagePath, fileData.file, {
      contentType: fileData.contentType,
      upsert: false,
    });

  if (uploadErr) {
    console.error('[contract-upload] storage upload failed', uploadErr);
    return NextResponse.json({ error: 'Failed to upload file to storage.' }, { status: 500 });
  }

  // Update contract with storage path and metadata
  const { error: updateErr } = await supabaseAdmin
    .from('rink_contracts')
    .update({
      document_storage_path: storagePath,
      document_hash: hash,
      file_size_bytes: fileData.file.length,
      file_mime_type: fileData.contentType,
      uploaded_at: new Date().toISOString(),
      uploaded_by_user_id: userId,
    })
    .eq('id', contractId);

  if (updateErr) {
    console.error('[contract-upload] contract update failed', updateErr);
    // Attempt to clean up uploaded file
    await supabaseAdmin.storage.from('rink-contracts').remove([storagePath]);
    return NextResponse.json({ error: 'Failed to update contract metadata.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    contract_id: contractId,
    storage_path: storagePath,
    file_size_bytes: fileData.file.length,
    file_mime_type: fileData.contentType,
    document_hash: hash,
    uploaded_at: new Date().toISOString(),
  }, { status: 200 });
}
