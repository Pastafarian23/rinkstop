import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// A-i: parent's inbox for team documents distributed to them.
// No tier gate: receiving a waiver/handout for your kid is independent of
// whether the parent is paid. Anyone with Clerk auth can load this page.
export default async function FamilyDocumentsPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  // 1. Fetch this parent's recipient rows.
  const { data: recipients } = await supabaseAdmin
    .from('team_document_recipients')
    .select('id, document_id, delivered_at, opened_at, completed_at, archived_at')
    .eq('recipient_user_id', userId)
    .is('archived_at', null)
    .order('delivered_at', { ascending: false });

  const recipientList = recipients || [];
  if (recipientList.length === 0) {
    return (
      <div style={{ maxWidth: 720, padding: '2rem 1.5rem' }}>
        <Link href="/dashboard/family" style={{ fontSize: '0.85rem', color: '#041E42' }}>
          ← Back to Family Hub
        </Link>
        <h1 style={{ margin: '0.5rem 0 0.25rem', color: '#041E42', fontSize: '1.875rem', fontWeight: 800 }}>
          Team Documents
        </h1>
        <p style={{ margin: '0 0 1.5rem', color: '#6b7280' }}>
          Documents your team admin sends to you show up here.
        </p>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No team documents yet.
        </div>
      </div>
    );
  }

  // 2. Hydrate document + team metadata.
  const docIds = Array.from(new Set(recipientList.map((r) => r.document_id as string)));
  const { data: docs } = await supabaseAdmin
    .from('team_documents')
    .select('id, team_id, title, description, file_name, file_size_bytes, mime_type, required, due_date, created_at, file_url')
    .in('id', docIds);
  const docById = new Map((docs || []).map((d) => [d.id as string, d]));

  const teamIds = Array.from(new Set((docs || []).map((d) => d.team_id as string)));
  const { data: teams } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name')
    .in('id', teamIds);
  const teamById = new Map((teams || []).map((t) => [t.id as string, t]));

  // 3. Mark unread rows as opened (idempotent: WHERE opened_at IS NULL).
  const unreadIds = recipientList.filter((r) => !r.opened_at).map((r) => r.id as string);
  if (unreadIds.length > 0) {
    await supabaseAdmin
      .from('team_document_recipients')
      .update({ opened_at: new Date().toISOString() })
      .in('id', unreadIds)
      .is('opened_at', null);
  }

  // 4. Render.
  const items = recipientList
    .map((r) => {
      const doc = docById.get(r.document_id as string);
      const team = doc ? teamById.get(doc.team_id as string) : null;
      return { r, doc, team };
    })
    .filter((it) => it.doc && it.team);

  // A-v: pre-issue signed URLs for the Print buttons so users can open the
  // source file in a new tab and use browser print. 60s expiry is plenty
  // for a user to click. Skip silently on failure (button just won't show).
  const printUrlByDoc = new Map<string, string>();
  await Promise.all(
    items.map(async ({ doc }) => {
      if (!doc!.file_url) return;
      try {
        const { data: signed } = await supabaseAdmin.storage
          .from('team-documents')
          .createSignedUrl(doc!.file_url as string, 60);
        if (signed?.signedUrl) printUrlByDoc.set(doc!.id as string, signed.signedUrl);
      } catch {
        // Skip — Print button just won't render for this row.
      }
    })
  );

  return (
    <div style={{ maxWidth: 880, padding: '2rem 1.5rem' }}>
      <Link href="/dashboard/family" style={{ fontSize: '0.85rem', color: '#041E42' }}>
        ← Back to Family Hub
      </Link>
      <h1 style={{ margin: '0.5rem 0 0.25rem', color: '#041E42', fontSize: '1.875rem', fontWeight: 800 }}>
        Team Documents
      </h1>
      <p style={{ margin: '0 0 1.5rem', color: '#6b7280' }}>
        Handouts, waivers, and forms your coach sent to you.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map(({ r, doc, team }) => {
          const isNew = !r.opened_at;
          const dueDate = doc!.due_date ? new Date(doc!.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : null;
          return (
            <div
              key={r.id}
              style={{
                background: '#fff',
                border: isNew ? '1px solid #041E42' : '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>
                  {team!.name}
                  {isNew && <span style={{ marginLeft: '0.5rem', background: '#041E42', color: '#fff', padding: '0.0625rem 0.375rem', borderRadius: 3, fontSize: '0.65rem', fontWeight: 700 }}>NEW</span>}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#041E42', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc!.title}
                  {doc!.required && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', background: '#C8102E', color: '#fff', padding: '0.0625rem 0.375rem', borderRadius: 3, fontWeight: 700 }}>REQUIRED</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.125rem' }}>
                  Delivered {new Date(r.delivered_at as string).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  {dueDate && ` · due ${dueDate}`}
                </div>
              </div>
              <a
                href={`/dashboard/team/${team!.slug}/documents`}
                style={{ background: '#041E42', color: '#fff', padding: '0.375rem 0.875rem', borderRadius: 4, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
              >
                Open
              </a>
              {printUrlByDoc.has(doc!.id as string) && (
                <a
                  href={printUrlByDoc.get(doc!.id as string)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: '#fff', border: '1px solid #041E42', color: '#041E42', padding: '0.375rem 0.875rem', borderRadius: 4, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                  title="Open document to print (use Ctrl/Cmd+P)"
                >
                  🖨 Print
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
