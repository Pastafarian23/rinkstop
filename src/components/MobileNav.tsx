'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Show, UserButton } from '@clerk/nextjs';
import { userButtonAppearance } from '@/lib/clerk-appearance';
import { NAV_SECTIONS } from '@/lib/nav-sections';

export default function MobileNav() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="mob-drawer" aria-label="Mobile navigation">
      {NAV_SECTIONS.map(sec => (
        <div key={sec.label}>
          <button
            className="mob-link mob-expand"
            onClick={() => setOpen(open === sec.label ? null : sec.label)}
            aria-expanded={open === sec.label}
          >
            <span>{sec.label}</span>
            <span className="mob-chevron" aria-hidden="true">›</span>
          </button>
          {open === sec.label && sec.sub.map(item => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="mob-link mob-sub"
              onClick={() => {
                const cb = document.getElementById('mob-nav') as HTMLInputElement;
                if (cb) cb.checked = false;
                setOpen(null);
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
      <Link
        href="/pricing"
        className="mob-link"
        onClick={() => {
          const cb = document.getElementById('mob-nav') as HTMLInputElement;
          if (cb) cb.checked = false;
          setOpen(null);
        }}
      >
        Pricing
      </Link>
      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Show
          when="signed-out"
          fallback={
            <>
              <Link href="/dashboard" onClick={() => { const cb = document.getElementById('mob-nav') as HTMLInputElement; if (cb) cb.checked = false; setOpen(null); }} style={{ display: 'block', textAlign: 'center', padding: '0.625rem', background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)', borderRadius: '6px', color: '#000', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>My Dashboard</Link>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
                <UserButton
                  appearance={userButtonAppearance}
                  userProfileUrl="/dashboard/profile"
                />
              </div>
            </>
          }
        >
          <Link href="/login" onClick={() => { const cb = document.getElementById('mob-nav') as HTMLInputElement; if (cb) cb.checked = false; }} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', padding: '0.5rem 0', textAlign: 'center' }}>Sign In</Link>
          <Link href="/sign-up" onClick={() => { const cb = document.getElementById('mob-nav') as HTMLInputElement; if (cb) cb.checked = false; setOpen(null); }} style={{ display: 'block', textAlign: 'center', padding: '0.625rem', background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)', borderRadius: '6px', color: '#000', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>Sign Up Free</Link>
        </Show>
      </div>
    </nav>
  );
}