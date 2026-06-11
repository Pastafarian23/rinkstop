import { writeFileSync } from 'node:fs';
const res = await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=List_of_members_of_the_International_Ice_Hockey_Federation&format=json&prop=text');
const data = await res.json();
const html = data.parse.text['*'];
writeFileSync('/tmp/iihf-table.html', html);
console.log('HTML length:', html.length);
