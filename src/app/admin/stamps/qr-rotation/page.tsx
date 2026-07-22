/**
 * /admin/stamps/qr-rotation
 *
 * WS3 PR4 — Admin UI for QR rotation.
 *
 * Admin-only. Lets Arnel (or a future admin) rotate a rink/venue/event QR
 * identifier when it's been compromised (lost sign, leaked online, etc.)
 * or needs replacement for any operational reason.
 *
 * Flow:
 *   1. Admin enters targetType (rink/venue/event) + targetId + reason
 *   2. Form posts to /api/internal/passport/stamps/rotate-qr
 *   3. Service rotates the QR, writes audit row
 *   4. UI shows old + new identifiers so the admin can update printed signs
 *
 * Per WS3 plan: existing stamps stay valid (don't punish holders for venue
 * compromise). Old QR scans resolve to the deactivated page automatically.
 *
 * This is a thin v1 admin UX until the broader WS3.5 admin queue lands.
 */

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { QrRotationForm } from './qr-rotation-form';

export const dynamic = 'force-dynamic';

export default async function AdminQrRotationPage() {
  // requireAdmin() redirects on failure (no session, no role).
  await requireAdmin();

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        padding: '24px 16px 64px',
        fontFamily: '-apple-system, system-ui, sans-serif',
        color: '#0f172a',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <nav
          style={{
            fontSize: 12,
            color: '#64748b',
            marginBottom: 16,
          }}
        >
          <a href="/admin" style={{ color: '#64748b', textDecoration: 'none' }}>
            Admin
          </a>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ color: '#0f172a' }}>QR Rotation</span>
        </nav>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#041E42',
            margin: '0 0 8px',
          }}
        >
          QR rotation
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#475569',
            lineHeight: 1.5,
            margin: '0 0 24px',
          }}
        >
          Rotate the QR identifier on a rink, venue, or event. The old QR
          will resolve to a "no longer active" page. Existing stamps stay
          valid — holders don't lose their attendance history.
        </p>

        <QrRotationForm />

        <section
          style={{
            marginTop: 32,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#64748b',
              fontWeight: 600,
              margin: '0 0 12px',
            }}
          >
            How to find target IDs
          </h2>
          <ul
            style={{
              fontSize: 14,
              color: '#334155',
              lineHeight: 1.6,
              paddingLeft: 20,
              margin: 0,
            }}
          >
            <li>
              <strong>Rink</strong>: <code>SELECT id FROM rinks WHERE slug = '...'</code>
            </li>
            <li>
              <strong>Venue</strong>: <code>SELECT id FROM venues WHERE name = '...'</code>
            </li>
            <li>
              <strong>Event</strong>: <code>SELECT id FROM venue_events WHERE name = '...'</code>
            </li>
          </ul>
          <p
            style={{
              fontSize: 13,
              color: '#64748b',
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            Or use the Supabase dashboard table editor. The IDs are UUIDs.
          </p>
        </section>
      </div>
    </main>
  );
}
