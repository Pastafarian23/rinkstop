// Gate for the staging-only Organization Plus sample preview (B-4 review, 2026-11-27).
// Fail closed: the preview is served ONLY on Vercel preview deployments. Production, development
// and an unset VERCEL_ENV all return false, so the page calls notFound().
export function isPreviewServable(vercelEnv: string | undefined): boolean {
  return vercelEnv === 'preview';
}
