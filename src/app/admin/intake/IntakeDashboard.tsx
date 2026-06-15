'use client';

import { useState, useMemo, useEffect } from 'react';

interface Lead {
  id: string;
  email: string;
  entity_type: string | null;
  entity_id: string | null;
  intent: string | null;
  source_path: string | null;
  source_url: string | null;
  listing_id: string | null;
  listing_type: string | null;
  listing_name: string | null;
  claimant_user_id: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  message: string | null;
  read_at: string | null;
  email_verified: boolean;
  clerk_user_id: string | null;
  created_at: string;
}

interface EmailCapture {
  id: string;
  email: string;
  entity_type: string | null;
  entity_id: string | null;
  intent: string | null;
  source_path: string | null;
  source_url: string | null;
  email_verified: boolean;
  clerk_user_id: string | null;
  created_at: string;
}

interface ListingSubmission {
  id: string;
  listing_type: string;
  name: string;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Counts {
  leads: number;
  emailCaptures: number;
  listingSubmissions: number;
  unreadLeads: number;
}

interface Props {
  initialLeads: Lead[];
  initialEmailCaptures: EmailCapture[];
  initialListingSubmissions: ListingSubmission[];
  initialCounts: Counts;
}

type Tab = 'leads' | 'email_captures' | 'listing_submissions' | 'listing_inquiries';

export default function IntakeDashboard({
  initialLeads,
  initialEmailCaptures,
  initialListingSubmissions,
  initialCounts,
}: Props) {
  const [tab, setTab] = useState<Tab>('leads');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState(initialCounts);
  const [busy, setBusy] = useState(false);

  // Listing submissions are an opt-in queue. Show pending first by default.
  // The other 3 sources have no status column.

  const filteredLeads = useMemo(() => {
    let rows = initialLeads;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.email.toLowerCase().includes(q) ||
          (l.listing_name || '').toLowerCase().includes(q) ||
          (l.message || '').toLowerCase().includes(q) ||
          (l.intent || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'unread') rows = rows.filter((l) => !l.read_at);
    if (statusFilter === 'read') rows = rows.filter((l) => !!l.read_at);
    return rows;
  }, [initialLeads, search, statusFilter]);

  const filteredEmailCaptures = useMemo(() => {
    let rows = initialEmailCaptures;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          (c.entity_type || '').toLowerCase().includes(q) ||
          (c.intent || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [initialEmailCaptures, search]);

  const filteredListingSubmissions = useMemo(() => {
    let rows = initialListingSubmissions;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q) ||
          (s.country || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') rows = rows.filter((s) => s.status === statusFilter);
    return rows;
  }, [initialListingSubmissions, search, statusFilter]);

  // Listing inquiries = leads with non-null listing_id. This is just a view
  // into the same leads table, filtered.
  const listingInquiries = useMemo(
    () => initialLeads.filter((l) => l.listing_id !== null),
    [initialLeads]
  );

  const filteredListingInquiries = useMemo(() => {
    let rows = listingInquiries;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.email.toLowerCase().includes(q) ||
          (l.listing_name || '').toLowerCase().includes(q) ||
          (l.message || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'unread') rows = rows.filter((l) => !l.read_at);
    if (statusFilter === 'read') rows = rows.filter((l) => !!l.read_at);
    return rows;
  }, [listingInquiries, search, statusFilter]);

  function clearSelection() {
    setSelected(new Set());
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll(rows: { id: string }[]) {
    const next = new Set(selected);
    const allSelected = rows.every((r) => next.has(r.id));
    if (allSelected) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    setSelected(next);
  }

  async function bulkAction(action: 'mark_read' | 'delete') {
    if (selected.size === 0) return;
    if (!confirm(`${action === 'delete' ? 'Delete' : 'Mark read'}: ${selected.size} rows?`)) return;
    setBusy(true);
    try {
      const source = tab === 'email_captures' ? 'email_captures' : tab;
      const r = await fetch('/api/admin/intake/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, action, ids: Array.from(selected) }),
      });
      if (!r.ok) {
        const j = await r.json();
        alert(`Failed: ${j.error || r.statusText}`);
        return;
      }
      // Reload to reflect changes
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function approveSubmission(id: string) {
    if (!confirm('Approve this directory submission?')) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/intake/listing-submission/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!r.ok) {
        alert('Approve failed');
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function rejectSubmission(id: string) {
    const notes = prompt('Reason for rejection (optional, shown in audit log):', '');
    if (notes === null) return; // cancelled
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/intake/listing-submission/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes }),
      });
      if (!r.ok) {
        alert('Reject failed');
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  function exportCSV() {
    const source = tab === 'email_captures' ? 'email_captures' : tab;
    const params = new URLSearchParams({ source });
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    window.location.href = `/api/admin/intake/export?${params.toString()}`;
  }

  const tabs: { id: Tab; label: string; count: number; icon: string }[] = [
    { id: 'leads', label: 'Leads', count: counts.leads, icon: '🎯' },
    { id: 'email_captures', label: 'Email Captures', count: counts.emailCaptures, icon: '✉️' },
    { id: 'listing_submissions', label: 'Directory Submissions', count: counts.listingSubmissions, icon: '📝' },
    { id: 'listing_inquiries', label: 'Listing Inquiries', count: listingInquiries.length, icon: '📨' },
  ];

  const showStatusFilter = tab === 'leads' || tab === 'listing_inquiries' || tab === 'listing_submissions';
  const statusOptions: { value: string; label: string }[] =
    tab === 'listing_submissions'
      ? [
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ]
      : [
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
          { value: 'read', label: 'Read' },
        ];

  return (
    <div>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setStatusFilter('all');
              clearSelection();
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #2DD4BF' : '2px solid transparent',
              color: tab === t.id ? 'white' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: tab === t.id ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>{t.icon}</span>
            {t.label}
            <span
              style={{
                background: tab === t.id ? 'rgba(45,212,191,0.2)' : 'rgba(255,255,255,0.1)',
                color: tab === t.id ? '#2DD4BF' : 'rgba(255,255,255,0.5)',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search email, name, intent, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '240px',
            padding: '0.5rem 0.75rem',
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            color: 'white',
            fontSize: '0.875rem',
          }}
        />
        {showStatusFilter && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.875rem',
            }}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={exportCSV}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(45,212,191,0.15)',
            border: '1px solid rgba(45,212,191,0.4)',
            borderRadius: '6px',
            color: '#2DD4BF',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            background: 'rgba(45,212,191,0.1)',
            border: '1px solid rgba(45,212,191,0.3)',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          <span style={{ color: '#2DD4BF', fontSize: '0.875rem' }}>
            {selected.size} selected
          </span>
          {tab !== 'listing_submissions' && (
            <button
              type="button"
              onClick={() => bulkAction('mark_read')}
              disabled={busy}
              style={bulkBtnStyle}
            >
              ✓ Mark read
            </button>
          )}
          <button
            type="button"
            onClick={() => bulkAction('delete')}
            disabled={busy}
            style={{ ...bulkBtnStyle, background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.4)', color: '#F87171' }}
          >
            🗑️ Delete
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={busy}
            style={{ ...bulkBtnStyle, background: 'transparent', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Tables */}
      {tab === 'leads' && (
        <LeadsTable
          rows={filteredLeads}
          selected={selected}
          toggleRow={toggleRow}
          toggleAll={toggleAll}
        />
      )}
      {tab === 'email_captures' && (
        <EmailCapturesTable
          rows={filteredEmailCaptures}
          selected={selected}
          toggleRow={toggleRow}
          toggleAll={toggleAll}
        />
      )}
      {tab === 'listing_submissions' && (
        <ListingSubmissionsTable
          rows={filteredListingSubmissions}
          onApprove={approveSubmission}
          onReject={rejectSubmission}
          busy={busy}
        />
      )}
      {tab === 'listing_inquiries' && (
        <LeadsTable
          rows={filteredListingInquiries}
          selected={selected}
          toggleRow={toggleRow}
          toggleAll={toggleAll}
          isInquiry
        />
      )}
    </div>
  );
}

const bulkBtnStyle: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  background: 'rgba(45,212,191,0.15)',
  border: '1px solid rgba(45,212,191,0.4)',
  borderRadius: '6px',
  color: '#2DD4BF',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 600,
};

function LeadsTable({
  rows,
  selected,
  toggleRow,
  toggleAll,
  isInquiry = false,
}: {
  rows: Lead[];
  selected: Set<string>;
  toggleRow: (id: string) => void;
  toggleAll: (rows: { id: string }[]) => void;
  isInquiry?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState message={`No ${isInquiry ? 'listing inquiries' : 'leads'} match your filters.`} />;
  }
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  return (
    <div style={{ overflowX: 'auto', background: 'rgba(15,23,42,0.6)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <th style={thStyle}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => toggleAll(rows)}
              />
            </th>
            <th style={thStyle}>Email</th>
            {isInquiry ? <th style={thStyle}>Listing</th> : <th style={thStyle}>Target</th>}
            <th style={thStyle}>Intent</th>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={tdStyle}>
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggleRow(l.id)}
                />
              </td>
              <td style={tdStyle}>
                <a
                  href={`mailto:${l.email}`}
                  style={{ color: '#2DD4BF', textDecoration: 'none' }}
                >
                  {l.email}
                </a>
                {!l.email_verified && (
                  <span style={{ marginLeft: '0.5rem', color: 'rgba(255,200,0,0.7)', fontSize: '0.7rem' }}>
                    ⚠ unverified
                  </span>
                )}
                {l.clerk_user_id && (
                  <span style={{ marginLeft: '0.5rem', color: 'rgba(45,212,191,0.7)', fontSize: '0.7rem' }}>
                    ✓ has account
                  </span>
                )}
              </td>
              {isInquiry ? (
                <td style={tdStyle}>
                  {l.listing_name || '—'}
                  {l.listing_type && (
                    <span style={{ marginLeft: '0.4rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                      ({l.listing_type})
                    </span>
                  )}
                </td>
              ) : (
                <td style={tdStyle}>
                  {l.entity_type || '—'}
                  {l.entity_id && (
                    <span style={{ marginLeft: '0.4rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                      ({l.entity_id.slice(0, 8)})
                    </span>
                  )}
                </td>
              )}
              <td style={tdStyle}>
                {l.intent ? <span style={badgeStyle}>{l.intent}</span> : '—'}
              </td>
              <td style={tdStyle}>
                {l.source_path ? (
                  <code style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{l.source_path}</code>
                ) : (
                  '—'
                )}
              </td>
              <td style={tdStyle}>
                {l.read_at ? (
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>read</span>
                ) : (
                  <span style={{ color: '#F87171', fontWeight: 600 }}>● unread</span>
                )}
              </td>
              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                {new Date(l.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmailCapturesTable({
  rows,
  selected,
  toggleRow,
  toggleAll,
}: {
  rows: EmailCapture[];
  selected: Set<string>;
  toggleRow: (id: string) => void;
  toggleAll: (rows: { id: string }[]) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No email captures match your filters." />;
  }
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  return (
    <div style={{ overflowX: 'auto', background: 'rgba(15,23,42,0.6)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <th style={thStyle}>
              <input type="checkbox" checked={allSelected} onChange={() => toggleAll(rows)} />
            </th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Entity</th>
            <th style={thStyle}>Intent</th>
            <th style={thStyle}>Source Path</th>
            <th style={thStyle}>Verified</th>
            <th style={thStyle}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={tdStyle}>
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleRow(c.id)} />
              </td>
              <td style={tdStyle}>
                <a href={`mailto:${c.email}`} style={{ color: '#2DD4BF', textDecoration: 'none' }}>
                  {c.email}
                </a>
                {c.clerk_user_id && (
                  <span style={{ marginLeft: '0.5rem', color: 'rgba(45,212,191,0.7)', fontSize: '0.7rem' }}>
                    ✓ has account
                  </span>
                )}
              </td>
              <td style={tdStyle}>
                {c.entity_type || '—'}
                {c.entity_id && (
                  <span style={{ marginLeft: '0.4rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                    ({c.entity_id.slice(0, 8)})
                  </span>
                )}
              </td>
              <td style={tdStyle}>
                {c.intent ? <span style={badgeStyle}>{c.intent}</span> : '—'}
              </td>
              <td style={tdStyle}>
                {c.source_path ? (
                  <code style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{c.source_path}</code>
                ) : (
                  '—'
                )}
              </td>
              <td style={tdStyle}>
                {c.email_verified ? (
                  <span style={{ color: 'rgba(45,212,191,0.8)' }}>✓</span>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>
                )}
              </td>
              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                {new Date(c.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingSubmissionsTable({
  rows,
  onApprove,
  onReject,
  busy,
}: {
  rows: ListingSubmission[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busy: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No directory submissions match your filters." />;
  }
  return (
    <div style={{ overflowX: 'auto', background: 'rgba(15,23,42,0.6)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>City / Country</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={tdStyle}>
                <strong>{s.name}</strong>
                {s.description && (
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', maxWidth: '300px' }}>
                    {s.description.slice(0, 100)}
                    {s.description.length > 100 && '…'}
                  </div>
                )}
                {s.website && (
                  <div style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>
                    <a href={s.website} target="_blank" rel="noreferrer" style={{ color: '#2DD4BF' }}>
                      {s.website}
                    </a>
                  </div>
                )}
              </td>
              <td style={tdStyle}>
                <span style={badgeStyle}>{s.listing_type}</span>
              </td>
              <td style={tdStyle}>
                {s.city || '—'}
                {s.country && (
                  <span style={{ marginLeft: '0.4rem', color: 'rgba(255,255,255,0.5)' }}>
                    {s.country}
                  </span>
                )}
              </td>
              <td style={tdStyle}>
                <a href={`mailto:${s.email}`} style={{ color: '#2DD4BF', textDecoration: 'none' }}>
                  {s.email}
                </a>
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    ...badgeStyle,
                    background:
                      s.status === 'pending'
                        ? 'rgba(251,191,36,0.15)'
                        : s.status === 'approved'
                        ? 'rgba(45,212,191,0.15)'
                        : 'rgba(248,113,113,0.15)',
                    color:
                      s.status === 'pending'
                        ? '#FBBF24'
                        : s.status === 'approved'
                        ? '#2DD4BF'
                        : '#F87171',
                  }}
                >
                  {s.status}
                </span>
                {s.notes && (
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', maxWidth: '200px' }}>
                    {s.notes}
                  </div>
                )}
              </td>
              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                {new Date(s.created_at).toLocaleDateString()}
              </td>
              <td style={tdStyle}>
                {s.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => onApprove(s.id)}
                      disabled={busy}
                      style={actionBtnStyle('#2DD4BF')}
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(s.id)}
                      disabled={busy}
                      style={actionBtnStyle('#F87171')}
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
                {s.status !== 'pending' && s.reviewed_at && (
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                    {new Date(s.reviewed_at).toLocaleDateString()}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '3rem 1rem',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        background: 'rgba(15,23,42,0.6)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {message}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.6rem 0.75rem',
  color: 'rgba(255,255,255,0.7)',
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  color: 'white',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.15rem 0.5rem',
  background: 'rgba(255,255,255,0.08)',
  borderRadius: '4px',
  fontSize: '0.7rem',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.8)',
};

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    padding: '0.3rem 0.6rem',
    background: `${color}22`,
    border: `1px solid ${color}66`,
    borderRadius: '4px',
    color,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  };
}
