# RinkStop — Cross-Chat Context Reference
> **Purpose:** So any agent in any conversation can find RinkStop's Supabase/Deploy context instantly.

## Supabase (confirmed from Project X chat)
- **Project URL:** `https://yszheonqyyskkjoxoexk.supabase.co`
- **REST URL:** `https://yszheonqyyskkjoxoexk.supabase.co/rest/v1/`
- **Anon key:** ❓ PENDING — Arnel to provide from Supabase Dashboard → Settings → API
- **Service role key:** ❓ PENDING — Supabase Dashboard → Settings → API → service_role

## Vercel
- **Token provided by Arnel:** `vcp_6IDcZ6oI4Xs0gr9ra5V3ea2wAMYrS6zKQDFKonEspAD2TXbPUH2KikoU`
- **Target:** rinkstop-platform → deploy to Vercel

## Database
- **Migration file:** `rinkstop-platform/supabase/migration.sql` (10+ tables)
- **Blog migration:** `rinkstop-platform/supabase/migration_blog_posts.sql`
- **Seed data:** `rinkstop-platform/supabase/seed_blog_posts.sql`
- **Status:** Migration NOT YET RUN — waiting for Arnel to run in Supabase dashboard or for direct PG connection

## Files Created
| File | Purpose |
|------|---------|
| `rinkstop-platform/.env.local` | Environment variables for local dev |
| `rinkstop-platform/DEPLOY-VERCEL.md` | Step-by-step Vercel deploy guide |
| `memory/kevlar-rinkstop-context.md` | This file — cross-chat reference |

## Key Links
- **RinkStop repo:** https://github.com/Pastafarian23/rinkstop (to be created)
- **Current code:** lives in `rinkstop-platform/` inside openclaw-workspace repo
- **Vercel dashboard:** https://vercel.com/dashboard

## How to Recognize This in Any Chat
Search memory for "RinkStop" or "rinkstop-platform" or "Supabase URL" or "kevlar"