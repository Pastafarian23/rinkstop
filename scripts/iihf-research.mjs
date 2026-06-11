// Pull IIHF member nations from the official list. Use Wikipedia (more accessible than iihf.com).
import { writeFileSync } from 'node:fs';

const wikipediaUrl = 'https://en.wikipedia.org/wiki/IIHF_World_Ranking';

// Fetch the IIHF member nations list
const res = await fetch(wikipediaUrl);
const html = await res.text();
writeFileSync('/tmp/iihf-rankings.html', html);
console.log('Downloaded', html.length, 'bytes');
console.log('First 500 chars:', html.slice(0, 500));
