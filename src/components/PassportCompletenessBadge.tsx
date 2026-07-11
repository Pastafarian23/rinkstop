'use client';

type CompletenessBadgeProps = {
  completed: number;
  total: number;
  passportHref?: string;
  size?: 'sm' | 'md';
};

export function PassportCompletenessBadge({ completed, total, passportHref, size = 'md' }: CompletenessBadgeProps) {
  const percent = Math.round((completed / total) * 100);
  const isComplete = completed === total;
  const height = size === 'sm' ? 4 : 6;
  const fontSize = size === 'sm' ? '0.6875rem' : '0.75rem';

  let label = `${completed} of ${total} sections`;
  if (isComplete) {
    label = `Passport complete`;
  } else if (completed === 0) {
    label = `No passport sections yet`;
  }

  const inner = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div style={{ height, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: isComplete ? '#009650' : '#FFB81C',
            borderRadius: 3,
            transition: 'width 0.2s',
          }}
        />
      </div>
    </>
  );

  if (!passportHref || isComplete) {
    return (
      <div style={{ padding: '0.75rem 1rem', background: isComplete ? 'rgba(0,150,80,0.1)' : 'rgba(255,184,28,0.07)', border: `1px solid ${isComplete ? 'rgba(0,150,80,0.2)' : 'rgba(255,184,28,0.18)'}`, borderRadius: 10 }}>
        {inner}
      </div>
    );
  }

  return (
    <a
      href={passportHref}
      style={{ display: 'block', padding: '0.75rem 1rem', background: 'rgba(255,184,28,0.07)', border: '1px solid rgba(255,184,28,0.18)', borderRadius: 10, textDecoration: 'none', color: '#fff' }}
    >
      {inner}
    </a>
  );
}
