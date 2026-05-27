'use client';
import Link from 'next/link';
import { useState } from 'react';

const SECTIONS = [
  {
    label: 'Explore Hockey',
    sub: [
      { href: '/directory/teams',    label: 'Teams'   },
      { href: '/directory/players',  label: 'Players' },
      { href: '/directory/leagues',  label: 'Leagues' },
      { href: '/directory/rinks',    label: 'Rinks'   },
      { href: '/directory/games', label: 'Games'   },
    ],
  },
  {
    label: 'Pro Hockey',
    sub: [
      { href: '/directory/nhl',           label: 'NHL'     },
      { href: '/directory/pwhl',           label: 'PWHL'    },
      { href: '/directory/khl',           label: 'KHL'     },
      { href: '/directory/ahl',           label: 'AHL'     },
      { href: '/directory/pro-leagues',    label: 'All Professional Leagues' },
    ],
  },
  {
    label: 'International Hockey',
    sub: [
      { href: '/directory/countries',          label: 'Countries' },
      { href: '/directory/international/iihf',  label: 'IIHF'    },
      { href: '/directory/international',       label: 'World Championships' },
      { href: '/directory/international',       label: 'Olympics' },
    ],
  },
  {
    label: 'College Hockey',
    sub: [
      { href: '/directory/college',           label: 'College Hub'   },
      { href: '/directory/college/ncaa',      label: 'NCAA'         },
      { href: '/directory/college/nchc',      label: 'NCHC'         },
      { href: '/directory/college/big-ten',   label: 'Big Ten'      },
      { href: '/directory/college/hockey-east', label: 'Hockey East' },
    ],
  },
  {
    label: 'Junior Hockey',
    sub: [
      { href: '/directory/junior/ohl',   label: 'OHL'   },
      { href: '/directory/junior/whl',   label: 'WHL'   },
      { href: '/directory/junior/qmjhl', label: 'QMJHL' },
      { href: '/directory/junior/ushl',  label: 'USHL'  },
      { href: '/directory/junior',       label: 'All Junior Leagues' },
    ],
  },
  {
    label: 'Youth & Adult Hockey',
    sub: [
      { href: '/directory/youth-hockey/learn-to-play', label: 'Learn to Play'      },
      { href: '/directory/youth-hockey', label: 'Youth Hockey'       },
      { href: '/directory/youth-hockey/tournaments', label: 'Youth Tournaments'  },
      { href: '/directory/youth-hockey/adult-leagues', label: 'Adult Leagues'     },
      { href: '/directory/youth-hockey/adult-tournaments', label: 'Adult Tournaments' },
    ],
  },
  {
    label: 'Content',
    sub: [
      { href: '/news', label: 'News'         },
      { href: '/guides', label: 'Guides'        },
      { href: '/rankings', label: 'Rankings'      },
      { href: '/hockey-travel', label: 'Hockey Travel' },
      { href: '/gear-reviews', label: 'Gear'  },
    ],
  },
  {
    label: 'About',
    sub: [
      { href: '/about',       label: 'About Us'        },
      { href: '/contact',     label: 'Contact Us'       },
      { href: '/advertise',    label: 'Advertise'        },
      { href: '/partner',    label: 'Partner With Us'  },
      { href: '/add-listing', label: 'Add Listing' },
      { href: '/founding-member', label: 'Founding Member' },
    ],
  },
];

export default function MobileNav() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="mob-drawer" aria-label="Mobile navigation">
      {SECTIONS.map(sec => (
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
      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link href="/login" onClick={() => { const cb = document.getElementById('mob-nav') as HTMLInputElement; if (cb) cb.checked = false; }} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', padding: '0.5rem 0', textAlign: 'center' }}>Sign In</Link>
        <Link href="/login" onClick={() => { const cb = document.getElementById('mob-nav') as HTMLInputElement; if (cb) cb.checked = false; }} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', padding: '0.5rem 0', textAlign: 'center' }}>Sign In</Link>
        <Link href="/sign-up" onClick={() => { const cb = document.getElementById('mob-nav') as HTMLInputElement; if (cb) cb.checked = false; setOpen(null); }} style={{ display: 'block', textAlign: 'center', padding: '0.625rem', background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)', borderRadius: '6px', color: '#000', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>Sign Up Free</Link>
      </div>
    </nav>
  );
}