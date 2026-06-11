# Vercel Deploy — Tag-Triggered Setup (2026-06-11)

## Why this change

RinkStop is on the Vercel **Hobby (free)** plan. Default GitHub auto-deploy creates a deployment on every push to `main`. This project averages **146 deploys/week** (21/day) which Vercel flags as a fair-use outlier even though the 100/day hard cap isn't being hit.

Switching to **deploy-on-tag** cuts the rate to whatever cadence you actually want (e.g., 3-5/day if you push tags often, or 1/week if you batch).

## Setup steps (5 minutes, one-time)

### Step 1: Turn off auto-deploy in Vercel

1. Go to https://vercel.com/dashboard/arnellarracas-4208s/rinkstop-platform/settings/git
2. Find "Deploy on push" (under Production Branch section) and **toggle it OFF**
3. Save

### Step 2: Create a deploy hook

1. Same page, scroll to "Deploy Hooks"
2. Click "Create Hook"
3. Name: `tag-deploy`
4. Branch: `main`
5. Vercel will give back a URL that looks like:
   ```
   https://api.vercel.com/v1/integrations/deploy/prj_GVvqDaSS264FFo6q8LYAKGVe0bvM/abc123def456
   ```
6. **Copy that URL** — you'll need it for step 3

### Step 3: Add the URL as a GitHub secret

1. Go to https://github.com/Pastafarian23/rinkstop/settings/secrets/actions
2. Click "New repository secret"
3. Name: `VERCEL_DEPLOY_HOOK`
4. Value: paste the URL from step 2
5. Save

### Step 4: Move the workflow file into .github/workflows/

The current GitHub PAT doesn't have the `workflow` scope, so this file was placed in `docs/ci-templates/deploy.yml` instead of `.github/workflows/deploy.yml`. The PAT must be updated before the workflow can be moved.

**Option A: Update the PAT (recommended, one-time):**
1. Go to https://github.com/settings/tokens
2. Find the current `ghp_` token used by rinkstop, click "Configure" or regenerate
3. Add the `workflow` scope to the token
4. Update the token in `/root/.openclaw/credentials/github.json` (via `scripts/onboard-credential.sh`)
5. Re-run the deployment agent: `cd rinkstop-platform && mv docs/ci-templates/deploy.yml .github/workflows/deploy.yml && git add .github/workflows/deploy.yml && git commit -m "chore(ci): move deploy workflow into .github/workflows" && git push`

**Option B: Use the GitHub web UI (one-time, 30 seconds):**
1. Go to https://github.com/Pastafarian23/rinkstop/tree/main/docs/ci-templates
2. Click on `deploy.yml`, then click the pencil (✏️) icon to edit
3. In the "filename" field, rename it to `.github/workflows/deploy.yml` (you may need to create the directory first by editing `docs/ci-templates/deploy.yml`'s parent — the easier path is below)
4. Commit directly to main

**Easier path for option B:**
1. Go to https://github.com/Pastafarian23/rinkstop/new/main/.github/workflows
2. If the directory doesn't exist, create it
3. Click "create new file"
4. Paste the contents of `docs/ci-templates/deploy.yml` into the editor
5. Commit

### Step 5: Verify the GitHub Action is wired

After the workflow file is in `.github/workflows/`:

```bash
cd rinkstop-platform
git tag deploy-test-$(date +%s)
git push --tags
```

Then watch:
- https://github.com/Pastafarian23/rinkstop/actions — workflow should turn green
- https://vercel.com/dashboard/arnellarracas-4208s/rinkstop-platform/deployments — new deploy should appear within 30s

## Daily workflow (new pattern)

**Old:**
```bash
git commit -m "..."
git push origin main
# → Vercel auto-deploys within 3-6 minutes
```

**New:**
```bash
git commit -m "..."
git push origin main
# → no deploy, no Vercel usage

# ... keep committing for the day ...

git tag deploy-$(date +%Y%m%d-%H%M)
git push --tags
# → ONE deploy fires for the whole batch
```

## Recommended cadence

For a personal project, deploy once per day or every couple of days. For a launch cycle, deploy per feature-branch merge. For hot-fixes, deploy immediately.

## What if I forget and push a tag I don't want to deploy?

Just push another tag — Vercel keeps the last 50 deployments and you can promote/promote-back to roll back. You can also delete a tag both locally and on GitHub:

```bash
git tag -d deploy-20260611-1230
git push origin :refs/tags/deploy-20260611-1230
```

(The Vercel deploy that already fired will stay; you can't un-deploy, but the next deploy will replace it on the production branch.)

## Rollback

If something breaks after the change:

1. Go to https://vercel.com/dashboard/arnellarracas-4208s/rinkstop-platform/deployments
2. Find the last working deployment
3. Click ⋯ → "Promote to Production"
4. (Optional) Re-enable "Deploy on push" in Git settings to restore auto-deploy

## Files changed

- `docs/ci-templates/deploy.yml` (new) — GitHub Action that POSTs to the deploy hook (placed in docs/ because the current PAT lacks `workflow` scope)
- `docs/VERCEL-DEPLOY-SETUP.md` (this file) — setup guide
- (No vercel.json changes needed; the deployment control is in the Vercel dashboard, not config)
