'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './NestedNav.module.css';

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

const NAV: NavItem[] = [
  {
    label: 'Explore Hockey',
    children: [
      { label: 'Teams', href: '/directory/teams' },
      { label: 'Leagues', href: '/directory/leagues' },
      { label: 'Players', href: '/directory/players' },
      { label: 'Coaches', href: '/directory/coaches' },
      { label: 'Rinks', href: '/directory/rinks' },
    ],
  },
  {
    label: 'Pro Hockey',
    children: [
      { label: 'NHL', href: '/directory/nhl' },
      { label: 'KHL', href: '/directory/khl' },
      { label: 'PWHL', href: '/directory/pwhl' },
      { label: 'AHL', href: '/directory/ahl' },
      { label: 'All Pro Hockey', href: '/directory/pro-leagues' },
    ],
  },
  {
    label: 'College Hockey',
    children: [
      { label: 'NCAA', href: '/directory/college/ncaa' },
      { label: 'Big 10', href: '/directory/college/big-ten' },
      { label: 'Hockey East', href: '/directory/college/hockey-east' },
      { label: 'All College Hockey', href: '/directory/college' },
    ],
  },
  {
    label: 'Junior Hockey',
    children: [
      { label: 'OHL', href: '/directory/junior/ohl' },
      { label: 'USHL', href: '/directory/junior/ushl' },
      { label: 'QMJHL', href: '/directory/junior/qmjhl' },
      { label: 'All Junior Hockey', href: '/directory/junior' },
    ],
  },
  {
    label: 'International',
    children: [
      { label: 'Countries', href: '/directory/countries' },
      { label: 'IIHF', href: '/directory/international/iihf' },
      { label: 'World Championships', href: '/directory/international/world-championships' },
      { label: 'Olympics', href: '/directory/international/olympics' },
    ],
  },
  {
    label: 'Youth & Adult',
    children: [
      { label: 'Learn to Play', href: '/directory/youth-hockey/learn-to-play' },
      { label: 'Youth Hockey', href: '/directory/youth-hockey' },
      { label: 'Youth Tournaments', href: '/directory/youth-hockey/tournaments' },
      { label: 'Adult Leagues', href: '/directory/youth-hockey/adult-leagues' },
      { label: 'Adult Tournaments', href: '/directory/youth-hockey/adult-tournaments' },
    ],
  },
  {
    label: 'Content',
    children: [
      { label: 'News', href: '/news' },
      { label: 'Guides', href: '/guides' },
      { label: 'Rankings', href: '/rankings' },
      { label: 'Hockey Travel', href: '/hockey-travel' },
      { label: 'Gear & Brands', href: '/gear-brands' },
    ],
  },
  {
    label: 'About',
    children: [
      { label: 'About RinkStop', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Advertise', href: '/advertise' },
      { label: 'Partner With Us', href: '/partner' },
    ],
  },
];

function NavItem({ item, isSub = false, isMobile = false }: { item: NavItem; isSub?: boolean; isMobile?: boolean }) {
  const hasChildren = item.children && item.children.length > 0;
  const [open, setOpen] = useState(false);

  if (isSub || !hasChildren) {
    return (
      <Link
        href={item.href || '#'}
        className={`${isMobile ? styles.mobLink : styles.navLink} ${isSub ? styles.subItem : ''}`}
        onClick={isMobile ? () => {
          const cb = document.getElementById('mob-nav') as HTMLInputElement;
          if (cb) cb.checked = false;
        } : undefined}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className={isMobile ? styles.mobSection : styles.navItemWrapper}>
      <button
        className={isMobile ? styles.mobSectionHeader : styles.navLink}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {item.label}
        <span className={`${styles.expandIcon} ${open ? styles.open : ''}`}>+</span>
      </button>
      {open && (
        <div className={isMobile ? styles.mobSubMenu : styles.subMenu}>
          {item.children!.map(child => (
            <NavItem key={child.label} item={child} isSub isMobile={isMobile} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NestedNav() {
  return (
    <div className={styles.nav}>
      {NAV.map(item => (
        <NavItem key={item.label} item={item} />
      ))}
    </div>
  );
}

export function MobileNestedNav() {
  return (
    <nav id="mobile-nav" className={`${styles.mobNav} mob-drawer`} aria-label="Main navigation">
      {NAV.map(item => (
        <NavItem key={item.label} item={item} isMobile />
      ))}
      <div className={styles.mobCta}>
        <Link
          href="/admin/teams/new"
          className="btn btn-red"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {
            const cb = document.getElementById('mob-nav') as HTMLInputElement;
            if (cb) cb.checked = false;
          }}
        >
          + Add Your Team
        </Link>
      </div>
    </nav>
  );
}