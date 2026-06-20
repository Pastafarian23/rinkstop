'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Doc {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  required: boolean;
  due_date: string | null;
  payment_id: string | null;
  payment: { id: string; title: string } | null;
  created_at: string;
  signatures: { document_id: string; player_id: string; signed_by_name: string; signed_by_role: string; acknowledged_at: string }[];
  my_signature: { document_id: string; player_id: string; signed_by_name: string; signed_by_role: string; acknowledged_at: string } | null;
}

interface Props {
  teamId: string;
  teamSlug: string;
  teamName: string;
  userId: string;
  isAdmin: boolean;
  documents: Doc[];
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsClient({ teamId, teamSlug, teamName, userId, isAdmin, documents }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadRequired, setUploadRequired] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // E-sig state
  const [signingDoc, setSigningDoc] = useState<Doc | null>(null);
  const [signedName, setSignedName] = useState('');
  const [signingRole, setSigningRole] = useState<'player' | 'parent' | 'guardian'>('player');
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Pick a file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Max 10MB');
      return;
    }
    if (!uploadTitle) {
      setUploadError('Title required');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Upload to Supabase Storage
      const path = `${teamId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('team-documents')
        .upload(path, file, { contentType: file.type });

      if (uploadErr) {
        setUploadError(`Upload failed: ${uploadErr.message}`);
        setUploading(false);
        return;
      }

      // Create document record
      const resp = await fetch(`/api/team/${teamSlug}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          title: uploadTitle,
          description: uploadDesc || null,
          file_url: path,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          required: uploadRequired,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json();
        setUploadError(body.error || 'Failed to save');
        setUploading(false);
        return;
      }

      // Reset
      setUploadTitle('');
      setUploadDesc('');
      setUploadRequired(true);
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploading(false);
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unknown error');
      setUploading(false);
    }
  }

  async function handleSign() {
    if (!signingDoc) return;
    if (!signedName.trim()) {
      setSignError('Type your name');
      return;
    }
    setSignSubmitting(true);
    setSignError(null);
    try {
      const resp = await fetch(`/api/team/${teamSlug}/documents/${signingDoc.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signed_by_name: signedName,
          signed_by_role: signingRole,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        setSignError(body.error || 'Failed');
        setSignSubmitting(false);
        return;
      }
      setSigningDoc(null);
      setSignedName('');
      setSignSubmitting(false);
      router.refresh();
    } catch (err) {
      setSignError(err instanceof Error ? err.message : 'Unknown');
      setSignSubmitting(false);
    }
  }

  async function downloadDoc(doc: Doc) {
    const { data, error } = await supabase.storage
      .from('team-documents')
      .createSignedUrl(doc.id, 60);
    // Use the actual stored path
    const { data: urlData } = await supabase.storage
      .from('team-documents')
      .createSignedUrl(doc.file_name || doc.id, 60);
    // Actually need to know the path. Let me re-fetch with the file_url from API
    const resp = await fetch(`/api/team/${teamSlug}/documents/${doc.id}/download-url`);
    if (resp.ok) {
      const { url } = await resp.json();
      window.open(url, '_blank');
    }
  }

  return (
    <div style={{ maxWidth: 980, padding: '2rem 1.5rem' }}>
      <Link href={`/dashboard/team/${teamSlug}`} style={{ fontSize: '0.85rem', color: '#041E42' }}>
        ← Back to {teamName}
      </Link>
      <h1 style={{ margin: '0.5rem 0 0.25rem', color: '#041E42', fontSize: '1.875rem', fontWeight: 800 }}>
        Documents
      </h1>
      <p style={{ margin: '0 0 1.5rem', color: '#6b7280' }}>
        Waivers, forms, and other documents. Sign with your typed name — legally binding under RA 8792.
      </p>

      {isAdmin && (
        <div style={{ marginBottom: '1.5rem' }}>
          {!showUploadForm ? (
            <button
              onClick={() => setShowUploadForm(true)}
              style={{ background: '#C8102E', color: '#fff', border: 'none', padding: '0.625rem 1.25rem', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              + Upload document
            </button>
          ) : (
            <form onSubmit={handleUpload} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Title *</label>
                <input type="text" required value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Description</label>
                <textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>File (PDF, JPG, PNG · max 10MB) *</label>
                <input ref={fileInputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" required style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={uploadRequired} onChange={(e) => setUploadRequired(e.target.checked)} />
                  Required for all players
                </label>
              </div>
              {uploadError && (
                <div style={{ background: 'rgba(200,16,46,0.10)', color: '#C8102E', padding: '0.5rem', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                  {uploadError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowUploadForm(false)} style={{ padding: '0.5rem 1rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={uploading} style={{ padding: '0.5rem 1.25rem', background: uploading ? '#9ca3af' : '#C8102E', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {documents.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No documents yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {documents.map((doc) => {
            const mySigned = !!doc.my_signature;
            const dueDate = doc.due_date ? new Date(doc.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : null;
            return (
              <div key={doc.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#041E42' }}>
                      {doc.title} {doc.required && <span style={{ fontSize: '0.7rem', background: '#C8102E', color: '#fff', padding: '0.125rem 0.5rem', borderRadius: 3, marginLeft: '0.5rem', fontWeight: 700, verticalAlign: 'middle' }}>REQUIRED</span>}
                    </h3>
                    {doc.description && <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>{doc.description}</p>}
                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                      {doc.file_name && `📎 ${doc.file_name} · ${fmtSize(doc.file_size_bytes)}`}
                      {doc.payment && ` · for ${doc.payment.title}`}
                      {dueDate && ` · due ${dueDate}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => downloadDoc(doc)} style={{ background: '#fff', border: '1px solid #041E42', color: '#041E42', padding: '0.375rem 0.75rem', borderRadius: 4, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}>
                      View
                    </button>
                    {!mySigned && (
                      <button onClick={() => setSigningDoc(doc)} style={{ background: '#041E42', color: '#fff', border: 'none', padding: '0.375rem 0.75rem', borderRadius: 4, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}>
                        Sign
                      </button>
                    )}
                  </div>
                </div>
                {mySigned && (
                  <div style={{ marginTop: '0.5rem', background: '#dcfce7', color: '#166534', padding: '0.5rem 0.75rem', borderRadius: 4, fontSize: '0.85rem' }}>
                    ✓ You signed as <strong>{doc.my_signature!.signed_by_name}</strong> ({doc.my_signature!.signed_by_role}) on {new Date(doc.my_signature!.acknowledged_at).toLocaleDateString()}
                  </div>
                )}
                {isAdmin && doc.signatures.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                    {doc.signatures.length} signature(s): {doc.signatures.slice(0, 5).map(s => s.signed_by_name).join(', ')}{doc.signatures.length > 5 && `, +${doc.signatures.length - 5} more`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sign modal */}
      {signingDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 480, width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#041E42', fontSize: '1.125rem', fontWeight: 800 }}>Sign: {signingDoc.title}</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              By signing below, you acknowledge that you have read and agree to this document. Your typed name, role, timestamp, and IP address are recorded for audit purposes.
            </p>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Signing as</label>
              <select value={signingRole} onChange={(e) => setSigningRole(e.target.value as any)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }}>
                <option value="player">Player (myself)</option>
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Type your full name *</label>
              <input type="text" required value={signedName} onChange={(e) => setSignedName(e.target.value)} placeholder="e.g., Maria Santos" style={{ width: '100%', padding: '0.625rem', border: '2px solid #041E42', borderRadius: 4, fontSize: '1.25rem', fontFamily: 'cursive' }} />
            </div>
            {signError && (
              <div style={{ background: 'rgba(200,16,46,0.10)', color: '#C8102E', padding: '0.5rem', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.875rem' }}>{signError}</div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setSigningDoc(null); setSignedName(''); setSignError(null); }} style={{ padding: '0.5rem 1rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSign} disabled={signSubmitting} style={{ padding: '0.5rem 1.25rem', background: signSubmitting ? '#9ca3af' : '#041E42', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, cursor: signSubmitting ? 'not-allowed' : 'pointer' }}>
                {signSubmitting ? 'Signing…' : 'Sign & acknowledge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}