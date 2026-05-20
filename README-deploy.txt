## RinkStop Deployment Made Simple (Using Your Supabase URL)

You already have Supabase set up! The URL you shared (**https://yszheonqyyskkjoxoexk.supabase.co/rest/v1/**) means you're ready to go.

### What You Need to Do (3 Steps):

1. **Get your Supabase API key:**
   - Go to your Supabase dashboard (the same place where you see that URL)
   - Click "Settings" → "API" → "API Key" 
   - Copy the key that looks like: `eyJhbGciOi...` (starts with "eyJ")
   - Paste it in your `.env.example` file where it says `API_SECRET=your-api-secret-here`

2. **Deploy to Vercel (1 minute):**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub (it's already connected to your rinkstop-platform repo)
   - Click "New Project" → select the rinkstop-platform repository
   - Vercel will automatically deploy it for you
   - Once live, your site will be at: https://rinkstop.vercel.app

3. **Test it works:**
   - Visit your new site
   - Run this command in your terminal (I'll help you with it):
     ```bash
     node scripts/approve-post.js rinkstop "approved/rinkstop/Blog Posts/2026-05-10-coaching-hockey-in-cebu-5-lessons-that-changed-how-i-lead.md" --blog --publish
     ```
   - If it works, you'll see: "✅ Published to Supabase" and "✅ Saved to Dropbox"

### What Happens Next:
- When you approve a blog post, it will:
  1. Save to Dropbox as a .docx file
  2. Publish to your Supabase database
  3. Make it live on your website automatically

**No more placeholder 404 pages. No more "it's not live yet" messages.**  
Just approve posts, and they'll go live automatically.

What's your Supabase API key? I'll help you set it up in 2 minutes.