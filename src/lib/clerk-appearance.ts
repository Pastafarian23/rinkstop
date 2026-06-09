/**
 * Shared Clerk appearance configuration — brand-aligned (RinkStop navy/red/gold
 * on dark) so all UserButtons, modals, and popovers look consistent.
 *
 * Brand palette:
 *   - Navy bg:    #041E42
 *   - Red accent: #C8102E
 *   - Gold:       #FFB81C
 *   - Surface:    #0f0f0f
 *   - Border:     #1e1e1e
 *   - Text:       #e2e8f0
 *   - Muted:      #888
 *
 * Usage:
 *   <UserButton appearance={userButtonAppearance} userProfileUrl="/dashboard/profile" />
 */
export const brandColors = {
  navy: '#041E42',
  red: '#C8102E',
  gold: '#FFB81C',
  surface: '#0f0f0f',
  surfaceAlt: '#141414',
  border: '#1e1e1e',
  borderHover: '#2a2a2a',
  text: '#e2e8f0',
  textMuted: '#8a8a8a',
  textOnGold: '#0a0a0a',
} as const;

export const userButtonAppearance = {
  variables: {
    colorPrimary: brandColors.red,
    colorBackground: brandColors.surface,
    colorInputBackground: brandColors.surfaceAlt,
    colorText: brandColors.text,
    colorTextSecondary: brandColors.textMuted,
    colorNeutral: brandColors.text,
    colorDanger: brandColors.red,
    borderRadius: '8px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
  },
  elements: {
    // Avatar bubble in the navbar
    avatarBox: { width: 36, height: 36, border: `2px solid ${brandColors.red}` },

    // The popover card itself
    userButtonPopoverCard: {
      background: brandColors.surface,
      border: `1px solid ${brandColors.border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    },
    userButtonPopoverMain: { background: brandColors.surface },
    userButtonPopoverTrigger: { color: brandColors.text },

    // The top user-info section
    userPreview: { background: brandColors.surface },
    userPreviewMainIdentifier: { color: brandColors.text, fontWeight: 600 },
    userPreviewSecondaryIdentifier: { color: brandColors.textMuted, fontSize: 12 },
    userPreviewAvatarBox: { border: `2px solid ${brandColors.red}` },

    // The action list (Manage account, Sign out, etc.)
    userButtonPopoverActions: { background: brandColors.surface },
    userButtonPopoverActionButton: {
      color: brandColors.text,
      background: brandColors.surface,
    },
    userButtonPopoverActionButtonText: {
      color: brandColors.text,
      fontWeight: 500,
    },
    userButtonPopoverActionButtonIcon: { color: brandColors.textMuted },
    userButtonPopoverActionButton__manageAccount: { color: brandColors.text },
    userButtonPopoverActionButton__signOut: { color: brandColors.red },
    userButtonPopoverActionButton__signOutText: { color: brandColors.red },

    // Hide Clerk branding footer
    userButtonPopoverFooter: { display: 'none' },

    // Active states
    userButtonPopoverActionButtonHover: { background: brandColors.surfaceAlt },
    userButtonPopoverActionButtonFocus: { background: brandColors.surfaceAlt },
  },
} as const;

export const signInAppearance = {
  variables: {
    colorPrimary: brandColors.red,
    colorBackground: brandColors.surface,
    colorInputBackground: brandColors.surfaceAlt,
    colorInputText: brandColors.text,
    colorText: brandColors.text,
    colorTextSecondary: brandColors.textMuted,
    colorNeutral: brandColors.text,
    borderRadius: '8px',
    fontFamily: 'system-ui, sans-serif',
  },
  elements: {
    card: { background: brandColors.surface, border: `1px solid ${brandColors.border}` },
    formButtonPrimary: {
      background: brandColors.red,
      '&:hover': { background: '#a00d24' },
    },
    footerActionLink: { color: brandColors.gold },
  },
} as const;
