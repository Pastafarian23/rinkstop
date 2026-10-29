/**
 * scripts/_probe-revenue-metrics.mjs
 *
 * Exercises the EXACT production logic in src/lib/revenue-metrics.ts against
 * the live Supabase project, without needing a Clerk admin session.
 *
 * It transpiles the TS module on the fly (esbuild is already a dependency),
 * injects the live Supabase credentials, and prints the resulting JSON.
 * This is the verification that the /admin/revenue dashboard will show
 * correct numbers.
 *
 * Run: node scripts/_probe-revenue-metrics.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const creds = JSON.parse(
  fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'),
);

process.env.SUPABASE_URL = creds.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = creds.serviceRoleKey;
process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

// Stub @/lib/supabase so we don't have to compile the whole Next app:
// we only need supabaseAdmin.from() to behave like the real service client.
const supabaseStub = `
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
export const supabase = supabaseAdmin;
export const supabaseRead = supabaseAdmin;
`;

// The stub lives OUTSIDE src/ so it can never be picked up by tsc, the
// Next build, or git as a stray source file.
const stubPath = path.join(repoRoot, 'scripts', '.tmp-probe-supabase-stub.ts');
fs.writeFileSync(stubPath, supabaseStub);

try {
  // esbuild is a transitive dep (vite/vitest) — not hoisted to node_modules/esbuild.
  const esbuildPath = fs
    .readdirSync(path.join(repoRoot, 'node_modules', '.pnpm'))
    .filter((d) => d.startsWith('esbuild@'))
    .map(
      (d) =>
        path.join(
          repoRoot,
          'node_modules',
          '.pnpm',
          d,
          'node_modules',
          'esbuild',
          'lib',
          'main.js',
        ),
    )
    .find((p) => fs.existsSync(p));
  if (!esbuildPath) throw new Error('esbuild not found in node_modules/.pnpm');
  const esbuild = await import(pathToFileURL(esbuildPath).href);
  const result = await esbuild.build({
    entryPoints: [path.join(repoRoot, 'src', 'lib', 'revenue-metrics.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    target: 'node20',
    external: ['@supabase/supabase-js'],
    alias: {
      '@/lib/supabase': stubPath,
    },
    logLevel: 'error',
  });

  const outFile = path.join(repoRoot, '.probe-revenue-metrics.mjs');
  fs.writeFileSync(outFile, result.outputFiles[0].text);

  const mod = await import(pathToFileURL(outFile).href + `?t=${Date.now()}`);
  const metrics = await mod.getRevenueMetrics();
  console.log(JSON.stringify(metrics, null, 2));
  fs.unlinkSync(outFile);
} finally {
  fs.rmSync(stubPath, { force: true });
}
