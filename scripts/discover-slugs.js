// Get the list of NCAA teams with their collegehockeyinc.com slugs
const fs = require('fs');

(async () => {
  // Try the men's teams page directly
  const r = await fetch('https://collegehockeyinc.com/mens-teams-and-conferences/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await r.text();
  fs.writeFileSync('/tmp/chi-teams-page.html', html);
  console.log('HTML length:', html.length);
  // Look for any team URLs
  const matches = html.match(/href=["'][^"']*\/teams\/[^"']*["']/g) || [];
  const unique = [...new Set(matches)].sort();
  console.log('\nUnique team URLs found:');
  for (const u of unique.slice(0, 100)) console.log(' ', u);
})();
