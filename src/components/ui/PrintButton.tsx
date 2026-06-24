'use client';

export default function PrintButton({ label = '🖨️ Print' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: '0.5rem 0.9rem',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 6,
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
    </button>
  );
}