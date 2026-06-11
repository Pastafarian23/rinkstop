import { readFileSync, writeFileSync } from 'node:fs';
import * as cheerio from 'cheerio';

const html = readFileSync('/tmp/iihf-table.html', 'utf-8');
const $ = cheerio.load(html);

const tables = $('table.wikitable');
console.log('Found', tables.length, 'wikitable tables');

const members = [];

tables.each((idx, table) => {
  // Find a header before the table
  let prev = $(table).prev();
  let sectionTitle = `Table ${idx+1}`;
  while (prev.length) {
    if (['H2','H3','H4'].includes(prev.prop('tagName'))) {
      sectionTitle = prev.text().trim();
      break;
    }
    prev = prev.prev();
  }
  console.log(`\n=== Table ${idx+1}: ${sectionTitle} ===`);
  
  const rows = $(table).find('tbody tr');
  console.log('Rows:', rows.length);
  
  rows.each((ri, row) => {
    const cells = $(row).find('th, td');
    if (cells.length < 4) return;
    
    const firstCell = $(cells[0]);
    const countryLink = firstCell.find('a').first();
    const countryName = countryLink.attr('title') || countryLink.text().trim();
    if (!countryName) return;
    
    members.push({
      country: countryName,
      dateJoined: $(cells[1]).text().trim(),
      org: $(cells[2]).text().trim(),
      president: $(cells[3]).text().trim(),
      teams: $(cells[4]).text().trim(),
      mensRank: $(cells[5]).text().trim(),
      womensRank: $(cells[6]).text().trim(),
      section: sectionTitle,
    });
  });
});

console.log('\nTotal members parsed:', members.length);
writeFileSync('/tmp/iihf-members.json', JSON.stringify(members, null, 2));

const bySection = {};
members.forEach(m => { bySection[m.section] = (bySection[m.section]||0) + 1; });
console.log('\nBy section:');
Object.entries(bySection).forEach(([s,n]) => console.log(`  ${s}: ${n}`));

console.log('\n=== All countries ===');
members.forEach(m => console.log(`  [${m.section}] ${m.country} | joined: ${m.dateJoined} | men: ${m.mensRank} | women: ${m.womensRank} | teams: ${m.teams}`));
