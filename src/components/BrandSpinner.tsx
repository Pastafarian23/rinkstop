export default function BrandSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: 'rgba(255,255,255,0.65)',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.16)',
          borderTopColor: '#C8102E',
          borderRightColor: '#FFB81C',
          animation: 'rinkstop-spin 0.8s linear infinite',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
      <style>{`
        @keyframes rinkstop-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
