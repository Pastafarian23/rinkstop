const XLSX = require('xlsx');

const wb = XLSX.readFile('/root/.openclaw/media/inbound/Europe_Ice_Rinks_United_Kingdom_RinkStop---7ae57ecc-d5ba-478c-b321-09ae86c49de0.xlsx');
const ws = wb.Sheets['Rinks'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
const rows = data.slice(2).filter(r => typeof r[0] === 'number');

function makeSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

const rinks = rows.map(r => {
  const cityRegion = (r[3] || '');
  const cityPart = cityRegion.split(',')[0].trim();
  return {
    name: String(r[1] || '').trim(),
    slug: makeSlug(String(r[1] || '').trim()),
    city: cityPart || null,
    province_state: null,
    country: 'UK',
    address: String(r[2] || '').trim() || null,
    phone: r[4] && r[4] !== 'N/A' ? String(r[4] || '').trim() : null,
    website_url: (r[5] && r[5] !== 'N/A') ? 'https://' + String(r[5]).replace(/^https?:\/\//, '').trim() : null,
    is_active: true,
    notes: String(r[6] || '').trim() || null,
    source: String(r[7] || '').trim() || null,
  };
});

// Show sample
console.log('Total rinks to import:', rinks.length);
console.log('\nSample first 3:');
rink.slice(0, 3).forEach((r, i) => console.log(i + 1, JSON.stringify(r, null, 2)));
console.log('\nSample last 2:');
rink.slice(-2).forEach((r, i) => console.log(rinks.length - 1 + i, JSON.stringify(r, null, 2)));

// Save as JSON for use in the insert script
const fs = require('fs');
fs.writeFileSync('/root/.openclaw/workspace/rinkstop-platform/data/uk-rinks-import.json', JSON.stringify(rinks, null, 2));
console.log('\nSaved to data/uk-rinks-import.json');