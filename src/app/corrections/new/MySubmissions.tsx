interface Submission {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  proposed_value: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_note: string | null;
}

interface Props {
  submissions: Submission[];
  entityLabels: Record<string, string>;
}

function statusBadge(status: string) {
  const styles: Record<string, React.CSSProperties> = {
    pending: { background: 'rgba(255,184,28,0.12)', color: '#FFB81C', border: '1px solid rgba(255,184,28,0.4)' },
    approved: { background: 'rgba(20,184,166,0.12)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)' },
    rejected: { background: 'rgba(200,16,46,0.12)', color: '#FF6B7A', border: '1px solid rgba(200,16,46,0.4)' },
    review_required: { background: 'rgba(168,85,247,0.12)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.4)' },
  };
  return (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '0.18rem 0.5rem',
        borderRadius: 999,
        ...(styles[status] || styles.pending),
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export default function MySubmissions({ submissions, entityLabels }: Props) {
  if (submissions.length === 0) {
    return (
      <section
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
        }}
      >
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.05rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.5rem',
          }}
        >
          YOUR SUBMISSIONS
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
          Nothing here yet. Submitted corrections will appear in this list.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
      }}
    >
      <h2
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.05rem',
          color: '#fff',
          letterSpacing: '0.05em',
          margin: '0 0 0.85rem',
        }}
      >
        YOUR SUBMISSIONS ({submissions.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {submissions.map((s) => {
          const label = entityLabels[`${s.entity_type}:${s.entity_id}`] || s.entity_id;
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '0.7rem 0.85rem',
                background: '#0a0a0a',
                border: '1px solid #141414',
                borderRadius: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
                  {s.entity_type}: <span style={{ color: 'rgba(255,255,255,0.65)' }}>{label}</span> · {s.field_name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 2 }}>
                  proposed: <span style={{ color: '#14B8A6' }}>{s.proposed_value}</span> · submitted {new Date(s.submitted_at).toLocaleDateString()}
                </div>
                {s.reviewer_note ? (
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginTop: 4, fontStyle: 'italic' }}>
                    Reviewer: {s.reviewer_note}
                  </div>
                ) : null}
              </div>
              <div>{statusBadge(s.status)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}