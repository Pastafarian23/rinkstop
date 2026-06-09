/**
 * Shared Clerk appearance configuration — brand-aligned (RinkStop navy/red/gold
 * on dark) so all UserButtons, modals, sign-in/sign-up cards, and verification
 * code inputs are readable.
 *
 * Brand palette:
 *   - Navy bg:    #041E42
 *   - Red accent: #C8102E
 *   - Gold:       #FFB81C
 *   - Surface:    #0f0f0f
 *   - Surface 2:  #141414
 *   - Border:     #1e1e1e
 *   - Text:       #e2e8f0
 *   - Muted:      #8a8a8a
 *   - Danger:     #ff5555
 */
export const brandColors = {
  navy: '#041E42',
  red: '#C8102E',
  redDark: '#a00d24',
  gold: '#FFB81C',
  surface: '#0f0f0f',
  surfaceAlt: '#141414',
  surfaceInput: '#0a0a0a',
  border: '#1e1e1e',
  borderHover: '#2a2a2a',
  text: '#e2e8f0',
  textOnDark: '#e2e8f0',
  textMuted: '#8a8a8a',
  textOnGold: '#0a0a0a',
  danger: '#ff5555',
  success: '#4ade80',
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
    avatarBox: { width: 36, height: 36, border: `2px solid ${brandColors.red}` },
    userButtonPopoverCard: {
      background: brandColors.surface,
      border: `1px solid ${brandColors.border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    },
    userButtonPopoverMain: { background: brandColors.surface },
    userButtonPopoverTrigger: { color: brandColors.text },
    userPreview: { background: brandColors.surface },
    userPreviewMainIdentifier: { color: brandColors.text, fontWeight: 600 },
    userPreviewSecondaryIdentifier: { color: brandColors.textMuted, fontSize: 12 },
    userPreviewAvatarBox: { border: `2px solid ${brandColors.red}` },
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
    userButtonPopoverFooter: { display: 'none' },
    userButtonPopoverActionButtonHover: { background: brandColors.surfaceAlt },
    userButtonPopoverActionButtonFocus: { background: brandColors.surfaceAlt },
  },
} as const;

/**
 * Comprehensive dark theme for SignIn / SignUp / Verification code / OTP cards.
 *
 * The card, every input, every label, every hint, every link, and every button
 * is explicitly themed. `colorInputText` and `colorInputPlaceholder` go in
 * `variables` so they cascade to all input elements; explicit `elements`
 * overrides handle the OTP code field which has its own custom structure.
 */
/**
 * Custom Clerk localization — overrides the default copy to remove the
 * redundant "Sign in to RinkStop" / "Welcome back, please sign in to continue"
 * stacking. The page title is rendered above the card in the page chrome, so
 * the Clerk internal header just needs a friendly call-to-action subtitle.
 */
export const clerkSignInLocalization = {
  signIn: {
    start: {
      title: 'Welcome back',
      subtitle: 'Sign in to save players, track favorites, and unlock your dashboard.',
      actionText: 'Continue',
    },
    emailCode: {
      title: 'Check your email',
      subtitle: 'We sent a 6-digit code to {{identifier}}. Enter it below to continue.',
    },
    emailLink: {
      title: 'Check your email',
      subtitle: 'We sent a sign-in link to {{identifier}}. Click the link to continue.',
    },
    phoneCode: {
      title: 'Check your phone',
      subtitle: 'We sent a code to {{identifier}}. Enter it below to continue.',
    },
    sso: {
      title: 'Continue with {{provider}}',
      subtitle: 'You will be redirected to {{provider}} to sign in.',
    },
    verifyEmailAddress: {
      title: 'Verify your email',
      subtitle: 'Enter the 6-digit code we sent to {{identifier}}.',
    },
    resetPassword: {
      title: 'Reset your password',
      subtitle: 'Enter your new password below.',
    },
  },
  socialButtonsBlockButton: 'Continue with {{provider|titleize}}',
  dividerText: 'or',
  formFieldLabel__emailAddress: 'Email address',
  formFieldLabel__password: 'Password',
  formFieldLabel__firstName: 'First name',
  formFieldLabel__lastName: 'Last name',
  formFieldLabel__username: 'Username',
  formFieldLabel__phoneNumber: 'Phone number',
  formFieldLabel__code: 'Verification code',
  formFieldLabel__newPassword: 'New password',
  formFieldLabel__confirmPassword: 'Confirm password',
  formFieldHintText__password: 'At least 8 characters.',
} as const;

export const clerkSignUpLocalization = {
  ...clerkSignInLocalization,
  signUp: {
    start: {
      title: 'Create your account',
      subtitle: 'Join RinkStop to save players, follow teams, and unlock your dashboard.',
      actionText: 'Create account',
    },
    verifications: {
      emailCode: {
        title: 'Verify your email',
        subtitle: 'Enter the 6-digit code we sent to {{identifier}}.',
      },
    },
  },
} as const;

export const signInAppearance = {
  variables: {
    // Primary
    colorPrimary: brandColors.red,
    colorDanger: brandColors.danger,
    colorSuccess: brandColors.success,
    colorWarning: brandColors.gold,

    // Surfaces
    colorBackground: brandColors.surface,
    colorInputBackground: brandColors.surfaceInput,
    colorInputBorder: brandColors.border,
    colorInputBorderHover: brandColors.borderHover,
    colorInputBorderFocus: brandColors.red,

    // Text
    colorText: brandColors.text,
    colorTextSecondary: brandColors.textMuted,
    colorInputText: brandColors.text,
    colorInputPlaceholder: brandColors.textMuted,

    // Neutral (used for default text on light surfaces — we override most)
    colorNeutral: brandColors.text,
    colorNeutralForeground: brandColors.text,

    // Font + shape
    borderRadius: '8px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',

    // Misc
    shadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  elements: {
    // Card
    card: {
      background: brandColors.surface,
      border: `1px solid ${brandColors.border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      color: brandColors.text,
    },
    cardBox: { background: brandColors.surface },
    rootBox: { background: 'transparent' },

    // Header text
    headerTitle: { color: brandColors.text, fontWeight: 700, fontSize: '20px' },
    headerSubtitle: { color: brandColors.textMuted, fontSize: '14px' },
    headerBackIcon: { color: brandColors.text },

    // Form labels + hints
    formFieldLabel: { color: brandColors.text, fontWeight: 500, fontSize: '13px' },
    formFieldHint: { color: brandColors.textMuted, fontSize: '12px' },
    formFieldErrorText: { color: brandColors.danger, fontSize: '12px' },
    formFieldWarningText: { color: brandColors.gold, fontSize: '12px' },
    formFieldSuccessText: { color: brandColors.success, fontSize: '12px' },
    formFieldInputGroup: { background: brandColors.surfaceInput },

    // Inputs (email, password, etc.)
    formFieldInput: {
      background: brandColors.surfaceInput,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      caretColor: brandColors.text,
    },
    formInput: {
      background: brandColors.surfaceInput,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      caretColor: brandColors.text,
    },
    input: {
      background: brandColors.surfaceInput,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      caretColor: brandColors.text,
    },
    identifierFirstInput: {
      background: brandColors.surfaceInput,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      caretColor: brandColors.text,
    },

    // OTP / verification code boxes (one input per digit)
    otpCodeFieldInput: {
      background: brandColors.surfaceInput,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      caretColor: brandColors.text,
      fontSize: '20px',
      fontWeight: 600,
      textAlign: 'center',
    },
    otpCodeFieldInputsContainer: { gap: '8px' },
    verificationCodeInput: {
      background: brandColors.surfaceInput,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      caretColor: brandColors.text,
    },

    // Buttons
    formButtonPrimary: {
      background: brandColors.red,
      color: '#ffffff',
      fontWeight: 600,
      '&:hover': { background: brandColors.redDark },
      '&:focus': { background: brandColors.redDark, boxShadow: `0 0 0 3px ${brandColors.red}40` },
    },
    formButtonSecondary: {
      background: brandColors.surfaceAlt,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      '&:hover': { background: brandColors.border },
    },
    formButtonReset: { color: brandColors.textMuted },

    // Social buttons (Google, etc.)
    socialButtonsBlockButton: {
      background: brandColors.surfaceAlt,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      '&:hover': { background: brandColors.border, borderColor: brandColors.borderHover },
    },
    socialButtonsBlockButtonText: { color: brandColors.text, fontWeight: 500 },
    socialButtonsBlockButtonArrow: { color: brandColors.textMuted },

    // Links
    footerActionLink: { color: brandColors.gold, fontWeight: 600, '&:hover': { color: '#ffd466' } },
    footerActionText: { color: brandColors.textMuted },
    formResendCodeLink: { color: brandColors.gold, '&:hover': { color: '#ffd466' } },
    formFieldAction: { color: brandColors.gold, '&:hover': { color: '#ffd466' } },
    identityPreviewEditButton: { color: brandColors.gold, '&:hover': { color: '#ffd466' } },

    // Identity preview (the chip showing "arnellarracas@gmail.com" after email entry)
    identityPreview: {
      background: brandColors.surfaceInput,
      border: `1px solid ${brandColors.border}`,
    },
    identityPreviewText: { color: brandColors.text },
    identityPreviewEditButtonIcon: { color: brandColors.gold },

    // Divider between social and email (the "or" line)
    dividerLine: { background: brandColors.border },
    dividerText: { color: brandColors.textMuted, background: brandColors.surface },

    // Alerts (error/success banners)
    alert: {
      background: brandColors.surfaceInput,
      border: `1px solid ${brandColors.border}`,
      color: brandColors.text,
    },
    alertText: { color: brandColors.text },
    alertIcon: { color: brandColors.gold },

    // Footer
    footer: { background: brandColors.surface, borderTop: `1px solid ${brandColors.border}` },
    footerPagesLink: { color: brandColors.gold },

    // Loading
    spinner: { color: brandColors.red },

    // Hide Clerk branding in dev (won't show in prod, but defensive)
    logoBox: { display: 'none' },
  },
} as const;
