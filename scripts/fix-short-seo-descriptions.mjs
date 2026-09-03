const { createClient } = require('/root/.openclaw/workspace/rinkstop-platform/node_modules/@supabase/supabase-js');
const creds = JSON.parse(require('fs').readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'));
const sb = createClient(creds.url, creds.serviceRoleKey);

(async () => {
  const { data, error } = await sb.from('posts')
    .select('id, slug, title, subtitle, seo_description, category, tags')
    .eq('status', 'published');
  if (error) { console.error(error); return; }
  
  const gameReports = data.filter(p => {
    if (!p.subtitle) return false;
    if (p.subtitle.length >= 100) return false;
    if (!p.subtitle.includes('Final')) return false;
    if (!p.subtitle.match(/\d{4}-\d{2}-\d{2}/)) return false;
    return true;
  });
  console.log('Game reports to fix: ' + gameReports.length);
  
  // Build a generic but useful description from what's available
  // Use: title + score + league context from tags + "Game recap" CTA
  const updated = [];
  for (const post of gameReports) {
    // Extract date from subtitle
    const dateMatch = post.subtitle.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : null;
    const dateObj = date ? new Date(date) : null;
    const formattedDate = dateObj ? dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    
    // League context from tags
    const tags = post.tags || [];
    const leagueMap = {
      'nhl': 'NHL',
      'ahl': 'AHL',
      'khl': 'KHL',
      'shl': 'SHL',
      'liiga': 'Liiga',
      'del': 'DEL',
      'chl': 'CHL',
      'ohl': 'OHL',
      'whl': 'WHL',
      'qmjhl': 'QMJHL',
      'ncaa': 'NCAA',
      'ushl': 'USHL',
      'nahl': 'NAHL',
      'pwhl': 'PWHL',
    };
    const league = tags.map(t => leagueMap[t.toLowerCase()]).find(Boolean) || 'hockey';
    
    // Stage context (playoffs, final, etc)
    const stageMap = {
      'playoff final': 'playoff final',
      'playoffs': 'playoffs',
      'final': 'final',
      'championship final': 'championship final',
      'semi-finals': 'semifinals',
      'semifinals': 'semifinals',
      'overtime': 'overtime',
    };
    const stage = tags.map(t => stageMap[t.toLowerCase()]).filter(Boolean)[0] || '';
    
    // Parse teams and score from title
    // Patterns:
    // "Adler Mannheim top Eisbären Berlin 4-1"
    // "Ak Bars Kazan 2, Metallurg Magnitogorsk 5"  (subtitle)
    // Build a more informative desc
    let newDesc = '';
    if (stage) {
      newDesc = `${post.title} (${stage}) on ${formattedDate}. `;
    } else {
      newDesc = `${post.title} on ${formattedDate}. `;
    }
    if (league !== 'hockey') {
      newDesc += `${league} `;
    }
    newDesc += 'game recap, scoring summary, and series context on RinkStop.';
    
    // Trim to 160 chars
    if (newDesc.length > 160) {
      newDesc = newDesc.slice(0, 157) + '...';
    }
    
    updated.push({ id: post.id, slug: post.slug, newDesc });
  }
  
  // Show samples
  for (let i = 0; i < Math.min(5, updated.length); i++) {
    console.log('  ' + updated[i].slug);
    console.log('    NEW: "' + updated[i].newDesc + '"');
  }
  
  if (process.argv.includes('--apply')) {
    console.log('\nApplying...');
    let count = 0;
    for (const u of updated) {
      const { error } = await sb.from('posts')
        .update({ seo_description: u.newDesc, subtitle: u.newDesc })
        .eq('id', u.id);
      if (!error) count++;
    }
    console.log('Updated ' + count + ' of ' + updated.length);
  } else {
    console.log('\nDRY RUN - pass --apply to update');
  }
})();
