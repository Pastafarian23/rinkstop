'use client';
import { useState } from 'react';
import SignUpModal from './SignUpModal';

export default function SignUpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          background: '#C8102E',
          color: '#fff',
          textDecoration: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Sign Up Free
      </button>
      {open && <SignUpModal onClose={() => setOpen(false)} />}
    </>
  );
}