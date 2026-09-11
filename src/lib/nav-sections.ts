/**
 * Shared navigation section data.
 *
 * Used by:
 *   - DesktopMenuPanel — multi-column grid in the desktop dropdown
 *   - MobileNav — accordion sections in the mobile drawer
 *
 * Keep these in sync if you add or rename a section. The label here is the
 * section header in both UIs.
 */

export interface NavItem {
  href: string;
  label: string;
}

export interface NavSection {
  label: string;
  sub: NavItem[];
}

const EXPLORE: NavItem[] = [
  { href: '/directory/teams',    label: 'Teams'      },
  { href: '/directory/players',  label: 'Players'    },
  { href: '/directory/coaches',  label: 'Coaches'    },
  { href: '/directory/scouts',   label: 'Scouts'     },
  { href: '/directory/leagues',  label: 'Leagues'    },
  { href: '/directory/rinks',    label: 'Rinks'      },
  { href: '/partners',         label: 'Partners' },
  { href: '/directory/games',    label: 'Games'      },
];

const PRO_HOCKEY: NavItem[] = [
  { href: '/directory/nhl',          label: 'NHL'                     },
  { href: '/directory/pwhl',         label: 'PWHL'                    },
  { href: '/directory/khl',          label: 'KHL'                     },
  { href: '/directory/ahl',          label: 'AHL'                     },
  { href: '/directory/pro-leagues',  label: 'All Professional Leagues' },
];

const INTERNATIONAL: NavItem[] = [
  { href: '/directory/countries',                    label: 'Countries'           },
  { href: '/directory/international/iihf',           label: 'IIHF'                },
  { href: '/directory/international/world-championships', label: 'World Championships' },
  { href: '/directory/international/olympics',       label: 'Olympics'            },
];

const COLLEGE: NavItem[] = [
  { href: '/directory/college',           label: 'College Hub' },
  { href: '/directory/college/ncaa',      label: 'NCAA'        },
  { href: '/directory/college/nchc',      label: 'NCHC'        },
  { href: '/directory/college/big-ten',   label: 'Big Ten'     },
  { href: '/directory/college/hockey-east', label: 'Hockey East' },
];

const JUNIOR: NavItem[] = [
  { href: '/directory/junior/ohl',   label: 'OHL'   },
  { href: '/directory/junior/whl',   label: 'WHL'   },
  { href: '/directory/junior/qmjhl', label: 'QMJHL' },
  { href: '/directory/junior/ushl',  label: 'USHL'  },
  { href: '/directory/junior',       label: 'All Junior Leagues' },
];

const YOUTH_AMATEUR: NavItem[] = [
  { href: '/directory/youth-hockey/learn-to-play',     label: 'Learn to Play'     },
  { href: '/directory/youth-hockey',                   label: 'Youth Hockey'      },
  { href: '/directory/youth-hockey/tournaments',       label: 'Youth Tournaments' },
  { href: '/directory/youth-hockey/adult-leagues',     label: 'Adult Leagues'     },
  { href: '/directory/youth-hockey/adult-tournaments', label: 'Adult Tournaments' },
];

const CONTENT_LINKS: NavItem[] = [
  { href: '/blog',           label: 'All Articles'  },
  { href: '/news',           label: 'News'          },
  { href: '/rankings',       label: 'Rankings'      },
  { href: '/hockey-travel',  label: 'Hockey Travel' },
  { href: '/gear-brands',   label: 'Gear'          },
];

const LEARN_LINKS: NavItem[] = [
  { href: '/learn',                          label: 'All Learn Pages'           },
  { href: '/learn/first-day-on-ice',         label: 'Your First Day'            },
  { href: '/learn/age-to-start-hockey',      label: 'When to Start'             },
  { href: '/learn/choosing-a-program',       label: 'Choosing a Program'        },
  { href: '/learn/hockey-development-pathway', label: 'Development Pathway'      },
  { href: '/learn/cost-by-age',              label: 'Hockey Cost by Age'        },
  { href: '/learn/parent-survival-guide',    label: 'Parent Survival Guide'    },
  { href: '/learn/playing-with-kids',        label: 'Playing Hockey With Kids'  },
  { href: '/learn/how-to-watch-hockey',      label: 'How to Watch Hockey'       },
  { href: '/learn/equipment-on-a-budget',    label: 'Equipment on a Budget'     },
  { href: '/learn/how-to-skate',             label: 'How to Skate'              },
  { href: '/learn/stopping',                 label: 'How to Stop'               },
  { href: '/learn/shooting',                 label: 'How to Shoot'              },
  { href: '/learn/hockey-rules',             label: 'Hockey Rules'              },
  { href: '/learn/hockey-terminology',        label: 'Hockey Glossary'           },
  { href: '/guides',                         label: 'All Guides'                },
];

const FREE_TOOLS: NavItem[] = [
  { href: '/tools',                                                label: 'All Free Tools'              },
  { href: '/tools/hockey-cost-calculator',                         label: 'Hockey Cost Calculator'    },
  { href: '/tools/junior-eligibility-checker',                      label: 'Junior Eligibility Checker' },
  { href: '/tools/hockey-skate-size-calculator',                   label: 'Skate Size Calculator'      },
  { href: '/tools/hockey-glove-size-calculator',                   label: 'Glove Size Calculator'      },
  { href: '/tools/hockey-stick-size-calculator',                   label: 'Stick Size Calculator'      },
  { href: '/tools/hockey-goalie-gear-sizer',                       label: 'Goalie Gear Sizer'           },
];

const ABOUT_LINKS: NavItem[] = [
  { href: '/faq',            label: 'FAQ'             },
  { href: '/about',          label: 'About Us'        },
  { href: '/contact',        label: 'Contact Us'      },
  { href: '/advertise',      label: 'Advertise'       },
  { href: '/partner-with-us', label: 'Partner With Us' },
  { href: '/add-listing',    label: 'Add Listing'     },
  { href: '/dashboard/listings', label: 'List Your Business' },
];

export const NAV_SECTIONS: NavSection[] = [
  { label: 'Explore Hockey', sub: EXPLORE       },
  { label: 'Pro Hockey',     sub: PRO_HOCKEY    },
  { label: 'International',  sub: INTERNATIONAL },
  { label: 'College Hockey', sub: COLLEGE       },
  { label: 'Junior Hockey',  sub: JUNIOR        },
  { label: 'Youth & Adult',  sub: YOUTH_AMATEUR },
  { label: 'Content',        sub: CONTENT_LINKS },
  { label: 'Free Tools',     sub: FREE_TOOLS    },
  { label: 'Learn',          sub: LEARN_LINKS   },
  { label: 'About',          sub: ABOUT_LINKS   },
];
