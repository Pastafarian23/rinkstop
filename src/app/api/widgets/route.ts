// /api/widgets — landing page for the widget program
//
// Returns an HTML page (still works in iframes as a regular page
// since it's at /api/widgets not a conflicting route)
import { NextResponse } from 'next/server';
import { baseUrl } from '@/lib/sitemap-shared';

export const revalidate = 3600;

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Embeddable Hockey Widgets — Free for Partner Sites | RinkStop</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #041E42; color: #fff; padding: 32px; max-width: 800px; margin: 0 auto; }
h1 { font-size: 32px; margin-bottom: 16px; }
.widget { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 24px; margin: 24px 0; }
.widget h2 { color: #FFB81C; margin-bottom: 8px; }
.widget pre { background: #000; color: #4ade80; padding: 12px; border-radius: 4px; overflow: auto; font-size: 12px; margin: 12px 0; }
.widget a { color: #FFB81C; }
ul { padding-left: 20px; }
li { padding: 4px 0; color: rgba(255,255,255,0.8); }
</style>
</head>
<body>
<h1>Embeddable Hockey Widgets</h1>
<p>Live, always-fresh hockey data for partner sites. Free for hockey blogs, league sites, and news outlets. Every embed includes a backlink to RinkStop.</p>

<div class="widget">
<h2>Team Stats Widget</h2>
<p>Live team record + last 5 games for any of our 3,243+ teams.</p>
<pre>&lt;iframe src="${baseUrl}/api/widgets/team-stats/toronto-maple-leafs"
        width="420" height="340" frameborder="0"
        style="border-radius:8px"&gt;&lt;/iframe&gt;</pre>
<p>✓ Auto-updates every 5 minutes · ✓ Team colors and logo included · ✓ Responsive · ✓ Free for any non-competing site</p>
<p><a href="${baseUrl}/api/widgets/team-stats/toronto-maple-leafs" target="_blank">View live demo →</a></p>
</div>

<p>For hockey sites with 5,000+ monthly visitors, apply to the RinkStop Partner Program: <a href="mailto:partners@rinkstop.com?subject=Partner%20Program%20Application">partners@rinkstop.com</a></p>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
