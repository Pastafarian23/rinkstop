'use client';
import Link from 'next/link';
import { NAV_SECTIONS } from '@/lib/nav-sections';

interface DesktopMenuPanelProps {
  /** Called when a link is clicked — typically closes the menu */
  onNavigate?: () => void;
}

/**
 * DesktopMenuPanel — the content of the desktop nav dropdown.
 *
 * Renders all sections in a 3-column grid (collapses to 2 cols on narrower
 * desktops). Each column is a section card with a header and a list of
 * links. Designed to fit within a typical desktop viewport (1024-1440px).
 */
export default function DesktopMenuPanel({ onNavigate }: DesktopMenuPanelProps) {
  return (
    <div className="desktop-menu-panel" role="menu" aria-label="Browse RinkStop">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="desktop-menu-section">
          <h3 className="desktop-menu-section-label">{section.label}</h3>
          <ul className="desktop-menu-section-list">
            {section.sub.map((item) => (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  className="desktop-menu-link"
                  onClick={onNavigate}
                  role="menuitem"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
