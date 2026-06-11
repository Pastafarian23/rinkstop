# Secrets Management — RinkStop

**This file is the runbook for "what to do when a key leaks" and "how to rotate."**

The repo is public on GitHub. Hardcoded secrets will leak. This document explains
how to make a leak recoverable instead of catastrophic.

## Architecture

- **Source of truth:** Vercel env vars (encrypted at rest, scoped per-environment)
- **Local dev:** `.env.local` (gitignored, on each developer's machine)
- **Scripts (cron, backfills):** `scripts/load-secrets.{mjs,cjs,py}` — reads from `.env.local` or `.env`
- **No hardcoded keys anywhere** in tracked code (enforced by pre-commit hook)

## What's in Vercel (and needs to be in `.env.local`)

See `.env.example` for the full list with descriptions. Critical keys:

| Key | Used by | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server (RLS-enforced) | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (bypasses RLS) | Supabase dashboard |
| `STRIPE_SECRET_KEY` | Stripe API (server) | Stripe dashboard |
| `CLERK_SECRET_KEY` | Clerk auth (server) | Clerk dashboard |
| `CLERK_PUBLISHABLE_KEY` | Clerk auth (client) | Clerk dashboard |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signature | Clerk dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature | Stripe dashboard |
| `HIGHLIGHTLY_API_KEY` | NHL data sync | Highlightly dashboard |
| `MATON_API_KEY` | Email (Zoho via Maton) | Maton dashboard |
| `CLOUDCONVERT_API_KEY` | Image conversion | CloudConvert dashboard |
| `GOOGLE_MAPS_API_KEY` | Rink map tiles | Google Cloud Console |
| `API_SECRET` | Blog publish endpoint | `openssl rand -hex 32` |
| `ADMIN_SECRET` | Admin endpoint access | `openssl rand -hex 32` |
| `RINKMAP_IMPORT_TOKEN` | Rink map data import | Custom token |
| `IMAGE_PROXY_SECRET` | Image proxy HMAC | Custom token |
| `VERCEL_TOKEN` | Vercel API access (cron) | Vercel dashboard |

## How to rotate a key (5 minutes)

When a key leaks — whether in code, logs, screenshots, or accidentally
committed — do this. The key is to rotate FAST, then fix the source.

### 1. Generate the new value in the issuing system

- **Supabase service role:** Supabase dashboard → Settings → API → Generate new service role key. Old key stops working immediately.
- **Maton:** Maton dashboard → Settings → API → Rotate.
- **Vercel:** Vercel dashboard → Settings → Tokens → Revoke. Generate new token.
- **Stripe:** Stripe dashboard → Developers → API keys → Roll. Two keys exist, swap the active one.
- **Clerk:** Clerk dashboard → API Keys → Rotate. For webhooks, also rotate the signing secret.

### 2. Update Vercel

Vercel dashboard → Project → Settings → Environment Variables → find the key → update → save.
**Important:** toggle "Production" only unless you also need it in Preview/Development.

### 3. Update local `.env.local` (if you run scripts locally)

```bash
# Edit .env.local
vim .env.local
```

### 4. Trigger a redeploy

Vercel picks up env changes on next deploy. Either:

```bash
git commit --allow-empty -m "chore: trigger redeploy after secret rotation"
git push
```

Or click "Deploy" in the Vercel dashboard.

### 5. Verify

```bash
# Site should still work
curl -I https://rinkstop.com/api/brands
# Should be 200, not 500
```

### 6. Purge the leak from git history

If the secret was committed (even in a now-removed file), the old value is in
git history forever. BFG Repo-Cleaner rewrites history:

```bash
# Install BFG (one-time)
brew install bfg  # macOS
# or: download from https://rtyley.github.io/bfg-repo-cleaner/

# Back up first!
cp -r .git .git.backup

# Replace the leaked value across all branches and tags
bfg --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

`passwords.txt` contains the old value on one line.

### 7. Notify (if the leak was significant)

If a production secret was exposed publicly for any length of time:
- Audit Supabase logs for unexpected access
- Check Vercel deployment logs for unauthorized deploys
- Consider notifying users if PII was involved

## Local development setup

```bash
# 1. Get .env.local from Arnel (or copy from Vercel)
vercel env pull .env.local  # this pulls all current Vercel env vars to .env.local

# 2. Make sure .env.local is gitignored (it is by default)
cat .gitignore | grep -E "^\.env"  # should show .env, .env.local, etc.

# 3. Run a script
node scripts/sync-nhl-live.js
# Loads .env.local automatically via load-secrets.cjs
```

## What NEVER goes in code

- `sb_secret_*` — Supabase service role keys
- `sk_live_*` — Stripe live secret keys
- `vck_*` — Vercel tokens
- `ghp_*` — GitHub personal access tokens
- `Maton v2.*` — Maton API keys
- Any other key/value that could grant access to a system

**The pre-commit hook blocks any of these from being committed.** If a
commit is blocked, the leak is in a file you added or modified. Read the
error message, fix the file, and commit again.

If you genuinely need to bypass (e.g., you're committing a test fixture
that LOOKS like a key), use:

```bash
git commit --no-verify
```

But think twice. The hook exists because hardcoded keys have caused real
problems in this project.

## Audit checklist (run monthly)

- [ ] Search GitHub for any leaked keys: https://github.com/Pastafarian23/rinkstop/search?q=sb_secret&type=code
- [ ] Check Supabase logs for unusual activity
- [ ] Check Vercel deployment history for unauthorized deploys
- [ ] Check Stripe for any unknown charges
- [ ] Verify `.env.example` matches current Vercel env vars

## Future: Doppler upgrade

When the project grows to 3+ services or 3+ developers, consider upgrading
to a central secret manager (Doppler, Infisical, or 1Password CLI). The
upgrade path:

1. Import all current Vercel env vars into the manager
2. Connect Vercel integration (one OAuth click)
3. Replace `scripts/load-secrets.*` with `doppler run -- node script.js`
4. Update the pre-commit hook to scan for the new pattern

The cost is $0–$15/mo for a small project. The win is "rotate once,
propagate everywhere" and a real audit log.
