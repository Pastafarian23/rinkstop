import { RoleChip } from './RoleChip';

export interface RosterMember {
  id: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  role: string;
  jerseyNumber: number | null;
  position: string | null;
  joinedAt: string;
  isMinor: boolean;
}

export function RosterTable({ members }: { members: RosterMember[] }) {
  if (members.length === 0) {
    return (
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          No members yet. Generate an invite code from the Invites tab to add players and staff.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #1e1e1e' }}>
            <th style={thStyle}>Member</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Pos</th>
            <th style={thStyle}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #041E42 0%, #14B8A6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    {(m.displayName || m.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>
                      {m.displayName || m.username || m.userId}
                    </div>
                    {m.username && (
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                        @{m.username}
                      </div>
                    )}
                    {m.isMinor && (
                      <div
                        style={{
                          color: '#F472B6',
                          fontSize: '0.7rem',
                          marginTop: 2,
                        }}
                      >
                        👶 Minor (parental consent on file)
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td style={tdStyle}>
                <RoleChip role={m.role} />
              </td>
              <td style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                {m.jerseyNumber ?? '—'}
              </td>
              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.6)' }}>{m.position ?? '—'}</td>
              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                {new Date(m.joinedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.5)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'middle',
};
