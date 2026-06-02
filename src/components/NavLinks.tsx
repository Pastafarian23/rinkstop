'use client';
import Link from 'next/link';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  label: string;
  sub: NavItem[];
}

const EXPLORE: NavItem[] = [
  { href: '/directory/teams',    label: 'Teams'   },
  { href: '/directory/players',  label: 'Players' },
  { href: '/directory/leagues',  label: 'Leagues' },
  { href: '/directory/rinks',    label: 'Rinks'   },
  { href: '/directory/games', label: 'Games'   },
];

const PRO_HOCKEY: NavItem[] = [
  { href: '/directory/nhl',           label: 'NHL'                   },
  { href: '/directory/pwhl',          label: 'PWHL'                  },
  { href: '/directory/khl',           label: 'KHL'                   },
  { href: '/directory/ahl',           label: 'AHL'                   },
  { href: '/directory/pro-leagues',    label: 'All Professional Leagues' },
];

const INTERNATIONAL: NavItem[] = [
  { href: '/directory/countries',           label: 'Countries'            },
  { href: '/directory/international/iihf',   label: 'IIHF'               },
  { href: '/directory/international/world-championships', label: 'World Championships' },
  { href: '/directory/international/olympics',             label: 'Olympics'           },
];

const COLLEGE: NavItem[] = [
  { href: '/directory/college',           label: 'College Hub'      },
  { href: '/directory/college/ncaa',    label: 'NCAA'             },
  { href: '/directory/college/nchc',    label: 'NCHC'             },
  { href: '/directory/college/big-ten',  label: 'Big Ten'          },
  { href: '/directory/college/hockey-east', label: 'Hockey East'   },
];

const JUNIOR: NavItem[] = [
  { href: '/directory/junior/ohl',   label: 'OHL'    },
  { href: '/directory/junior/whl',   label: 'WHL'    },
  { href: '/directory/junior/qmjhl', label: 'QMJHL'  },
  { href: '/directory/junior/ushl',  label: 'USHL'   },
  { href: '/directory/junior',       label: 'All Junior Leagues' },
];

const YOUTH_AMATEUR: NavItem[] = [
  { href: '/directory/youth-hockey/learn-to-play', label: 'Learn to Play'     },
  { href: '/directory/youth-hockey', label: 'Youth Hockey'      },
  { href: '/directory/youth-hockey/tournaments', label: 'Youth Tournaments'  },
  { href: '/directory/youth-hockey/adult-leagues', label: 'Adult Leagues'     },
  { href: '/directory/youth-hockey/adult-tournaments', label: 'Adult Tournaments'  },
];

const CONTENT_LINKS: NavItem[] = [
  { href: '/news', label: 'News'         },
  { href: '/guides', label: 'Guides'        },
  { href: '/rankings', label: 'Rankings'      },
  { href: '/hockey-travel', label: 'Hockey Travel' },
  { href: '/gear-reviews', label: 'Gear' },
];

const ABOUT_LINKS: NavItem[] = [
  { href: '/faq',         label: 'FAQ'           },
  { href: '/about',       label: 'About Us'        },
  { href: '/contact',     label: 'Contact Us'       },
  { href: '/advertise',   label: 'Advertise'       },
  { href: '/partner',     label: 'Partner With Us' },
  { href: '/add-listing', label: 'Add Listing'     },
  { href: '/founding-member', label: 'Founding Member' },
];

const NAV: NavSection[] = [
  { label: 'Explore Hockey',  sub: EXPLORE       },
  { label: 'Pro Hockey',      sub: PRO_HOCKEY    },
  { label: 'International',   sub: INTERNATIONAL },
  { label: 'College Hockey',  sub: COLLEGE       },
  { label: 'Junior Hockey',   sub: JUNIOR        },
  { label: 'Youth & Adult', sub: YOUTH_AMATEUR },
  { label: 'Content',        sub: CONTENT_LINKS },
  { label: 'About',          sub: ABOUT_LINKS   },
];

export default function NavLinks() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <nav className="nav-links" aria-label="Main navigation">
      {NAV.map((n, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={n.label}
            className="nav-item-wrapper"
            onMouseLeave={() => setOpenIndex(null)}
          >
            <span
              className={`nav-link nav-section-label${isOpen ? ' active' : ''}`}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpenIndex(isOpen ? null : i);
                }
              }}
            >
              {n.label}
            </span>
            {isOpen && (
              <div className="nav-dropdown">
                {n.sub.map(item => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="nav-dropdown-item"
                    onClick={() => setOpenIndex(null)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
