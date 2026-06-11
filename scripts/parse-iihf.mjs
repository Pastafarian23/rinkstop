import { readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';

const wikitext = readFileSync('/tmp/iihf-wikitext.txt', 'utf-8');

// Find the full members table - look for "IIHF Full Members" or "Members" section
// Each row has: | [[Name]] || Date joined || Org || President || Teams || Men's rank || Women's rank ||
// Parse the wikitable rows

// First, find rows with country data
const rowRe = /\|\s*\[\[([^\]|]+?)(?:\|[^\]]+)?\]\][^\n]*\n/g;
let matches = [];
let m;
while ((m = rowRe.exec(wikitext)) !== null) {
  matches.push(m[1].replace(/_/g, ' '));
}
// Filter out non-country entries (org names, "International Ice Hockey Federation", etc.)
const blacklist = new Set(['IIHF','International Ice Hockey Federation','Ice Hockey Australia','Royal Belgian Ice Hockey Federation','Austrian Ice Hockey Association','Hockey Canada','Swiss Ice Hockey Federation','Czech Ice Hockey Association','French Ice Hockey Federation','German Ice Hockey Federation','Finnish Ice Hockey Association','Latvian Ice Hockey Federation','Swedish Ice Hockey Association','Slovak Ice Hockey Association','Norwegian Ice Hockey Federation','Danish Ice Hockey Union','Polish Ice Hockey Federation','Slovenian Ice Hockey Federation','Italian Ice Sports Federation','Japanese Ice Hockey Federation','Kazakhstan Ice Hockey Federation','Belarusian Ice Hockey Association','Chinese Ice Hockey Association','Chinese Taipei Ice Hockey Federation','Hungarian Ice Hockey Federation','Korean Ice Hockey Association','Estonian Ice Hockey Association','Lithuanian Ice Hockey Federation','Ice Hockey UK','USA Hockey','Royal Netherlands Ice Hockey Federation','Hockey Lietuva','Ukrainian Ice Hockey Federation','Spanish Ice Sports Federation','Romanian Ice Hockey Federation','Bulgarian Ice Hockey Federation','Serbian Ice Hockey Association','Croatian Ice Hockey Federation','Mongolian Ice Hockey Federation','Ice Sports Federation of India','Mexican Ice Hockey Federation','Brazilian Ice Sports Federation','Argentine Association of Ice and In-Line Hockey','Hong Kong Ice Hockey Association','Turkish Ice Hockey Federation','Israeli Ice Hockey Federation','Ice Hockey Association of India','Singapore Ice Hockey Association','Philippine Hockey Association','Malaysian Ice Hockey Federation','Indonesian Ice Hockey Association','Thailand Ice Hockey Association','Qatar Ice Hockey Federation','UAE Ice Hockey Association','Saudi Arabian Ice Hockey Federation','Bahrain Hockey Committee','Kuwait Ice Hockey Association','Lebanese Ice Hockey Federation','Irish Ice Hockey Association','Icelandic Ice Hockey Association','Luxembourg Ice Hockey Federation','Icelandic Hockey','Georgian Ice Hockey Federation','Andorran Federation of Ice Sports','Algerian Ice Sports Federation','Hockey Federation of Armenia','Ice Hockey Federation of Armenia','Ice Hockey Federation of the Republic of Azerbaijan','Ice Hockey Federation of Bosnia and Herzegovina','Chilean Ice and Inline Hockey Federation','Colombian Ice Hockey Federation','Kenya Federation of Ice Sports','Ice Hockey Iceland','Iran','Islamic Republic of Iran Skating Federation','Ice Hockey Association of Thailand','Ice Hockey Association of India','Tunisian Ice Sports Federation','Moroccan Ice Hockey Association','Tanzania Ice Hockey Union','Uganda Ice Hockey Association','Puerto Rico Ice Hockey Federation','Costa Rican Ice Hockey Federation','Ice Hockey Federation of Montenegro','Ice Hockey Federation of Moldova','Ice Hockey Association of Andorra','Hockey Association of Cyprus','Pakistan Ice Hockey Federation','Bangladesh Ice Hockey Federation','Sri Lanka Ice Hockey Association','Mongolia Ice Hockey Federation','Mongolian Ice Hockey Federation','Tajikistan Ice Hockey Federation','Turkmenistan Ice Hockey Federation','Kyrgyzstan','Ice Hockey Federation of the Kyrgyz Republic','Uzbekistan Ice Hockey Federation','New Zealand Ice Hockey Federation','Ice Hockey New Zealand']);

const countries = [...new Set(matches.filter(c => !blacklist.has(c) && !c.startsWith('Ice Hockey') && !c.startsWith('Hockey ') && !c.startsWith('Federation') && !c.startsWith('Association') && !c.startsWith('Federación') && !c.startsWith('Fédération') && c.length < 50))];
console.log('Unique candidates:', countries.length);
writeFileSync('/tmp/iihf-candidates.json', JSON.stringify(countries.sort(), null, 2));
countries.forEach(c => console.log('  -', c));
