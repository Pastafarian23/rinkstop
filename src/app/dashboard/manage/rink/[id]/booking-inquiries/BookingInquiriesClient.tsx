'use client';

import { useEffect, useState } from 'react';

interface ListingLite {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  slot_type: string | null;
  age_group: string | null;
  skill_level: string | null;
}

interface Inquiry {
  id: string;
  created_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  team_or_org: string | null;
  requested_start: string;
  requested_end: string;
  requested_price_cents: number | null;
  notes: string | null;
  status: string;
  source: string | null;
  source_url: string | null;
  listing: ListingLite | ListingLite[] | null;
}

interface Props {
  rinkId: string;
  initialInquiries: Inquiry[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
  emailed_rink: { label: 'New', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
  viewed_by_rink: { label: 'Viewed', color: '#FFB81C', bg: 'rgba(255,184,28,0.1)' },
  accepted: { label: 'Accepted', color: '#14B8A6', bg: 'rgba(20,184,166,0.1)' },
  declined: { label: 'Declined', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  spam: { label: 'Spam', color: '#94A3B8', bg: 'rgba(148,163,184,0.05)' },
  duplicate: { label: 'Duplicate', color: '#94A3B8', bg: 'rgba(148,163,184,0.05)' },
};

function formatPrice(cents: number | null): string {
  if (cents === null) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getListing(inq: Inquiry): ListingLite | null {
  if (!inq.listing) return null;
  if (Array.isArray(inq.listing)) return inq.listing[0] ?? null;
  return inq.listing;
}

export default function BookingInquiriesClient({ rinkId, initialInquiries }: Props) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateStatus(id: string, newStatus: 'accepted' | 'declined' | 'spam' | 'viewed_by_rink') {
    setBusyId(id);
    try {
      const r = await fetch(`/api/owner/rinks/${rinkId}/booking-inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) {
        const txt = await r.text();
        alert(`Update failed: ${txt}`);
        return;
      }
      setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, status: newStatus } : inq)));
    } catch (err) {
      alert(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  }

  // Mark new inquiries as viewed when this page mounts (fire-and-forget)
  useEffect((): void => {
    const newOnes = inquiries.filter((i) => i.status === 'new' || i.status === 'emailed_rink');
    if (newOnes.length === 0) return;
    void Promise.all(
      newOnes.map((inq) =>
        fetch(`/api/owner/rinks/${rinkId}/booking-inquiries/${inq.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'viewed_by_rink' }),
        }).catch((): null => null)
      )
    ).then((): void => {
      setInquiries((prev) =>
        prev.map((inq) =>
          newOnes.find((n) => n.id === inq.id) ? { ...inq, status: 'viewed_by_rink' } : inq
        )
      );
    });
  }, [rinkId]);

  if (inquiries.length === 0) {
    return (
      <div
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: '1px dashed rgba(0,0,0,0.15)',
          borderRadius: 12,
          padding: '3rem 2rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '1rem', margin: 0 }}>
          No booking inquiries yet.
        </p>
        <p style={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Once visitors request to book your ice slots, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  const newCount = inquiries.filter((i) => i.status === 'new' || i.status === 'emailed_rink').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {newCount > 0 && (
        <div
          style={{
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.3)',
            color: '#0284C7',
            padding: '0.625rem 0.875rem',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {newCount} new {newCount === 1 ? 'inquiry' : 'inquiries'}
        </div>
      )}

      {inquiries.map((inq) => {
        const status = STATUS_LABELS[inq.status] || STATUS_LABELS.new;
        const busy = busyId === inq.id;
        return (
          <div
            key={inq.id}
            data-inquiry-id={inq.id}
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 8,
              padding: '1.25rem',
              opacity: busy ? 0.6 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
                  {inq.contact_name}
                  {inq.team_or_org ? <span style={{ color: 'rgba(0,0,0,0.5)', fontWeight: 400, fontSize: '0.9rem' }}> · {inq.team_or_org}</span> : null}
                </div>
                <a
                  href={`mailto:${inq.contact_email}`}
                  style={{ color: '#0284C7', fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  {inq.contact_email}
                </a>
                {inq.contact_phone ? <span style={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8125rem', marginLeft: '0.5rem' }}>· {inq.contact_phone}</span> : null}
              </div>
              <span
                style={{
                  background: status.bg,
                  color: status.color,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.625rem',
                  borderRadius: 4,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {status.label}
              </span>
            </div>

            <div style={{ fontSize: '0.875rem', color: 'rgba(0,0,0,0.7)', marginBottom: '0.25rem' }}>
              <strong style={{ color: '#0F172A' }}>Wants:</strong> {getListing(inq)?.title || 'Listing'}
              {getListing(inq)?.slot_type ? ` (${getListing(inq)?.slot_type?.replace(/_/g, ' ')})` : ''}
              {getListing(inq)?.age_group ? ` · ${getListing(inq)?.age_group}` : ''}
              {getListing(inq)?.skill_level && getListing(inq)?.skill_level !== 'all' ? ` · ${getListing(inq)?.skill_level}` : ''}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(0,0,0,0.7)', marginBottom: '0.25rem' }}>
              <strong style={{ color: '#0F172A' }}>Slot:</strong> {formatDate(getListing(inq)?.start_time || inq.requested_start)}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(0,0,0,0.7)', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#0F172A' }}>Listed price:</strong> {formatPrice(inq.requested_price_cents)}
            </div>

            {inq.notes ? (
              <div
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  borderLeft: '3px solid #94A3B8',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0 6px 6px 0',
                  fontSize: '0.875rem',
                  color: 'rgba(0,0,0,0.85)',
                  marginBottom: '0.75rem',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {inq.notes}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(inq.status === 'new' || inq.status === 'emailed_rink' || inq.status === 'viewed_by_rink') && (
                <>
                  <button
                    onClick={() => updateStatus(inq.id, 'accepted')}
                    disabled={busy}
                    style={{
                      padding: '0.5rem 0.875rem',
                      background: '#14B8A6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: busy ? 'wait' : 'pointer',
                    }}
                  >
                    Accept
                  </button>
                  <a
                    href={`mailto:${inq.contact_email}?subject=Re: ${encodeURIComponent(getListing(inq)?.title || 'your booking inquiry')}`}
                    style={{
                      padding: '0.5rem 0.875rem',
                      background: '#0284C7',
                      color: '#fff',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    Reply by email
                  </a>
                  <button
                    onClick={() => updateStatus(inq.id, 'declined')}
                    disabled={busy}
                    style={{
                      padding: '0.5rem 0.875rem',
                      background: 'rgba(0,0,0,0.05)',
                      color: 'rgba(0,0,0,0.7)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: busy ? 'wait' : 'pointer',
                    }}
                  >
                    Decline
                  </button>
                </>
              )}
              <button
                onClick={() => updateStatus(inq.id, 'spam')}
                disabled={busy}
                style={{
                  padding: '0.5rem 0.875rem',
                  background: 'transparent',
                  color: 'rgba(0,0,0,0.4)',
                  border: 'none',
                  fontSize: '0.8125rem',
                  cursor: busy ? 'wait' : 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Mark spam
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
