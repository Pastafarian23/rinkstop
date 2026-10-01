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
  { href: '/editorial-policy', label: 'Editorial Policy' },
  { href: '/data-methodology', label: 'Data Methodology' },
];

// 2026-10-01 (Arnel directive): surfaced the conversion paths that were
// previously buried or hidden. GSC shows ZERO organic clicks to /pricing,
// /claim-your-listing, /passport, /ice-marketplace, /dataset-license
// across the entire 90d window. The directory gets traffic; the funnel
// is invisible. This block groups every "I want to list / monetize" path
// in a single section so visitors on any entry page can find it.
const GET_LISTED_LINKS: NavItem[] = [
  { href: '/claim-your-listing',    label: 'Claim a listing'        },
  { href: '/add-listing',           label: 'Add a new listing'      },
  { href: '/partner-with-us',       label: 'Partner with RinkStop'  },
  { href: '/launch',                label: 'List your ice'          },
  { href: '/ice-marketplace',       label: 'Ice Marketplace'        },
  { href: '/pricing',               label: 'Pricing & tiers'        },
  { href: '/dataset-license',       label: 'Hockey dataset license' },
  { href: '/advertise',             label: 'Advertise with us'      },
];

// 2026-10-01 (Arnel directive): merged Pro Hockey / International /
// College / Junior / Youth & Adult / Explore into one "Browse Hockey"
// section. Five of those sections are only one or two items deep and the
// dropdown was 100+ links. Top nav now surfaces Directory / Scores /
// News / Learn / Pricing so visitors don't have to dig. The menu panel
// still has every deep link for power users.
const BROWSE_HOCKEY: NavItem[] = [
  { href: '/directory',               label: 'All Directory'          },
  { href: '/directory/teams',         label: 'Teams'                  },
  { href: '/directory/players',       label: 'Players'                },
  { href: '/directory/coaches',       label: 'Coaches'                },
  { href: '/directory/scouts',        label: 'Scouts'                 },
  { href: '/directory/leagues',       label: 'Leagues'                },
  { href: '/directory/rinks',         label: 'Rinks'                  },
  { href: '/directory/games',         label: 'Games & Scores'         },
  { href: '/directory/federations',   label: 'Federations'            },
  { href: '/directory/countries',     label: 'Countries'              },
  { href: '/directory/standings',     label: 'Standings'              },
  { href: '/directory/nhl',           label: 'NHL'                    },
  { href: '/directory/ahl',           label: 'AHL'                    },
  { href: '/directory/pwhl',          label: 'PWHL'                   },
  { href: '/directory/khl',           label: 'KHL'                    },
  { href: '/directory/echl',          label: 'ECHL'                   },
  { href: '/directory/ushl',          label: 'USHL'                   },
  { href: '/directory/liiga',         label: 'Liiga'                  },
  { href: '/directory/shl',           label: 'SHL'                    },
  { href: '/directory/del',           label: 'DEL'                    },
  { href: '/directory/international', label: 'International & Olympics'},
  { href: '/directory/college',       label: 'NCAA Hockey'             },
  { href: '/directory/junior',        label: 'Junior (CHL)'            },
  { href: '/directory/youth-hockey',  label: 'Youth & Adult'           },
  { href: '/directory/pro-leagues',   label: 'All Pro Leagues'         },
  { href: '/partners',                label: 'Partners'                },
];

export const NAV_SECTIONS: NavSection[] = [
  { label: 'Browse Hockey', sub: BROWSE_HOCKEY },
  { label: 'News & Scores', sub: CONTENT_LINKS },
  { label: 'Learn',         sub: LEARN_LINKS   },
  { label: 'Free Tools',    sub: FREE_TOOLS    },
  { label: 'Get Listed',    sub: GET_LISTED_LINKS },
  { label: 'About',         sub: ABOUT_LINKS   },
];
