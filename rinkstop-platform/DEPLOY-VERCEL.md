# RinkStop → Vercel Deploy Guide

## Prerequisites
- You have a Vercel account (✅ you said you opened one)
- You have a Supabase project with the database running
- You have the repo pushed to GitHub (see below if not)

## Step-by-step

### 1. Push the code to GitHub
```bash
cd rinkstop-platform
git remote -v                                          # check remote
# If no remote set up:
git remote add origin https://github.com/Pastafarian23/rinkstop.git
git add .
git commit -m "RinkStop full build — teal/crimson brand, 37+ files"
git push -u origin main
```

### 2. Import project on Vercel
1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Find and select the rinkstop repo
5. Click **Import**

### 3. Configure environment variables
Vercel will ask you to set env vars during import. Add these:

| Variable | Value | Where to find it |
|----------|-------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → General → URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Supabase Dashboard → Settings → API → service_role |
| `API_SECRET` | Any long random string (min 32 chars) | Create one: `openssl rand -hex 32` |
| `DATABASE_URL` | Your Supabase connection string | Supabase Dashboard → Settings → Database → Connection string |

### 4. Build settings (Vercel usually auto-detects)
- **Framework:** Next.js
- **Build command:** `npm run build`
- **Output directory:** `.next` (default)
- **Install command:** `npm install`

### 5. Deploy
Click **Deploy**. Vercel will:
1. Install dependencies
2. Run `npm run build`
3. Deploy to a preview URL like `rinkstop-xxxxx.vercel.app`

### 6. Custom domain (optional)
If you want rinkstop.com:
1. In Vercel Dashboard → your project → **Domains** → **Add**
2. Enter `rinkstop.com`
3. Follow the DNS instructions (usually add A records or CNAME)

## Troubleshooting

**Build fails?** Check the build logs in Vercel dashboard — usually missing env vars.

**Blank page?** Make sure Supabase URL and keys are correct. The site needs the database to load.

**"Route not found" errors?** Vercel should auto-detect Next.js App Router. If not, check `vercel.json` (we don't have one — shouldn't need it).

## Cost
- Vercel Hobby plan: **FREE** for personal projects
- Supabase Free tier: **FREE** (500MB database, 1GB storage)
- Total: **$0 to deploy**

## What this gives you
- Live URL in ~5 minutes
- Auto-deploys on every git push
- HTTPS included
- Global CDN

---
*Next steps after deploy: upload hockey PNG designs to Printful, add blog content pipeline, connect domain.*