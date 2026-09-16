// Add verification_status column to posts table.
// Status hierarchy (INTERNAL ONLY):
//   human_verified > verified > unverified > failed
// The column is for internal review tracking. It is NEVER exposed
// publicly in API responses.

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});

const PAT = process.env.SUPABASE_MANAGEMENT_PAT;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectId = SUPABASE_URL.match(/\/\/([^.]+)\.supabase\.co/)?.[1];

(async () => {
  const sql = `
    ALTER TABLE public.posts
      ADD COLUMN IF NOT EXISTS verification_status text DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS verification_notes text,
      ADD COLUMN IF NOT EXISTS verified_at timestamptz,
      ADD COLUMN IF NOT EXISTS verified_by text;

    ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_verification_status_check;
    ALTER TABLE public.posts ADD CONSTRAINT posts_verification_status_check
      CHECK (verification_status IS NULL OR verification_status IN ('human_verified', 'verified', 'unverified', 'failed'));

    CREATE INDEX IF NOT EXISTS idx_posts_verification_status ON public.posts(verification_status);
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  console.log('HTTP status:', res.status);
  const text = await res.text();
  console.log('Response:', text.slice(0, 600));
  if (res.ok) console.log('✓ Schema migration applied');
  if (res.status >= 400) process.exit(1);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
