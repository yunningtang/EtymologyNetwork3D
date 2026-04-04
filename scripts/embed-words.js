#!/usr/bin/env node
/**
 * Builds a curated word list (max N per morpheme) and writes it as
 * a compact JS constant ready to paste into index.html.
 *
 * Usage: node scripts/embed-words.js [maxPerMorpheme=200]
 *
 * Output: scripts/output/WORDS_DATA.js
 */

const fs = require('fs');
const path = require('path');

const MAX_PER_MORPH = parseInt(process.argv[2]) || 200;
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'output', 'words.json'), 'utf-8'));

// Bucket by primary morpheme (first root found, else first morpheme)
const ROOTS = new Set(['struct','duct','spect','port','ject','dict','scrib','vert','mit','cred','aud','vis','tract','rupt','cept','pos','form','gen','graph','log','path','phil','phon','photo','psych','scope','sect','sens','voc','act','anim','aqua','astro','bio','cap','cede','chron','civ','claim','clar','cord','corp','cosm','cur','dem','derm','domin','equ','fac','fer','fid','fin','flex','flu','frag','func','geo','gress','hab','junct','lect','liber','liter','loc','luc','man','mar','mater','med','mem','ment','min','mob','morph','mort','nat','nav','nom','norm','nov','oper','opt','ord','pater','ped','pel','pend','plex','pop','press','prim','priv','prob','reg','sal','sci','sign','simil','sol','spec2','spher','spir','stat','stell','tang','temp','ten','terr','test','theo','therm','tort','typ','urb','val','ven','vita','vol']);

// Group words by their primary morpheme
const buckets = {};
for (const entry of raw) {
  const word = entry[0];
  const morphs = entry.slice(1);
  // Primary = first root, else first morpheme
  const primary = morphs.find(m => ROOTS.has(m)) || morphs[0];
  if (!buckets[primary]) buckets[primary] = [];
  buckets[primary].push(entry);
}

// Take top N per morpheme (shorter words first — they tend to be more common)
const selected = [];
for (const [morph, words] of Object.entries(buckets)) {
  words.sort((a, b) => a[0].length - b[0].length);
  selected.push(...words.slice(0, MAX_PER_MORPH));
}

// Deduplicate
const seen = new Set();
const unique = [];
for (const entry of selected) {
  if (!seen.has(entry[0])) {
    seen.add(entry[0]);
    unique.push(entry);
  }
}

unique.sort((a, b) => a[0].localeCompare(b[0]));

console.log(`Selected ${unique.length} words (max ${MAX_PER_MORPH}/morpheme from ${raw.length} total)`);

// Output as compact string format: "word:m1,m2\nword:m1,m2,m3\n..."
// This is much more compact than JSON for embedding
const compact = unique.map(e => e[0] + ':' + e.slice(1).join(',')).join('\n');

const outPath = path.join(__dirname, 'output', 'WORDS_DATA.txt');
fs.writeFileSync(outPath, compact);
const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`Wrote ${outPath} (${kb} KB, ${unique.length} words)`);

// Also output morpheme stats
const morphCounts = {};
for (const e of unique) {
  for (const m of e.slice(1)) {
    morphCounts[m] = (morphCounts[m] || 0) + 1;
  }
}
console.log(`Active morphemes: ${Object.keys(morphCounts).length}`);
console.log(`\nTop 10:`);
Object.entries(morphCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([m,c])=>console.log(`  ${m}: ${c}`));
