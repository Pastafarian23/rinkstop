// Use MediaWiki API to get the full list of IIHF members as structured wikitext
const res = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_members_of_the_International_Ice_Hockey_Federation&format=json&prop=wikitext');
const data = await res.json();
import { writeFileSync } from 'node:fs';
writeFileSync('/tmp/iihf-wikitext.json', JSON.stringify(data, null, 2));
const wikitext = data.parse.wikitext['*'];
console.log('Wikitext length:', wikitext.length);
// Save the raw wikitext
writeFileSync('/tmp/iihf-wikitext.txt', wikitext);
