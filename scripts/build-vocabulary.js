#!/usr/bin/env node
/**
 * Etymology Network — Comprehensive Vocabulary Builder
 *
 * Generates 38,000+ English words mapped to morphemes using:
 * 1. Pattern matching against 200+ known morphemes (prefix/root/suffix)
 * 2. Free public word lists (no API key needed)
 * 3. Outputs a compact JSON blob for inline embedding
 *
 * Usage: node scripts/build-vocabulary.js
 * Output: scripts/output/words.json (import into index.html)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ============================================================
//  MORPHEME PATTERNS (regex-ready)
// ============================================================
const PREFIXES = [
  {id:'pre',p:/^pre/},{id:'post',p:/^post/},{id:'re',p:/^re(?=[a-z]{3})/},
  {id:'un',p:/^un(?=[a-z]{3})/},{id:'dis',p:/^dis/},{id:'in1',p:/^(?:im|in|il|ir)(?=[a-z]{3})/},
  {id:'en',p:/^(?:en|em)(?=[a-z]{3})/},{id:'non',p:/^non/},{id:'anti',p:/^anti/},
  {id:'over',p:/^over(?=[a-z]{3})/},{id:'under',p:/^under(?=[a-z]{3})/},
  {id:'out',p:/^out(?=[a-z]{3})/},{id:'mis',p:/^mis(?=[a-z]{3})/},
  {id:'de',p:/^de(?=[a-z]{3})/},{id:'trans',p:/^trans/},{id:'inter',p:/^inter/},
  {id:'intra',p:/^intra/},{id:'extra',p:/^extra/},{id:'super',p:/^super/},
  {id:'sub',p:/^sub/},{id:'com',p:/^(?:com|con|col|cor)(?=[a-z]{3})/},
  {id:'co',p:/^co(?=[aeiou]|[a-z]{2}rdi)/},{id:'pro',p:/^pro(?=[a-z]{3})/},
  {id:'fore',p:/^fore(?=[a-z]{2})/},{id:'auto',p:/^auto/},{id:'bi',p:/^bi(?=[a-z]{3})/},
  {id:'tri',p:/^tri/},{id:'multi',p:/^multi/},{id:'poly',p:/^poly/},
  {id:'mono',p:/^mono/},{id:'uni',p:/^uni(?=[a-z]{3})/},{id:'semi',p:/^semi/},
  {id:'micro',p:/^micro/},{id:'macro',p:/^macro/},{id:'mega',p:/^mega/},
  {id:'mini',p:/^mini(?=[a-z]{3})/},{id:'neo',p:/^neo/},{id:'proto',p:/^proto/},
  {id:'counter',p:/^counter/},{id:'sur',p:/^sur(?=[a-z]{3})/},{id:'ab',p:/^ab(?=[a-z]{3})/},
  {id:'ad',p:/^ad(?=[a-z]{3})/},{id:'circum',p:/^circum/},{id:'dia',p:/^dia(?=[a-z]{2})/},
  {id:'ex',p:/^ex(?=[a-z]{3})/},{id:'hyper',p:/^hyper/},{id:'hypo',p:/^hypo/},
  {id:'meta',p:/^meta/},{id:'para',p:/^para(?=[a-z]{2})/},{id:'peri',p:/^peri/},
  {id:'retro',p:/^retro/},{id:'ultra',p:/^ultra/},{id:'infra',p:/^infra/},
];

const ROOTS = [
  {id:'struct',p:/struct/},{id:'duct',p:/(?:duct|duc(?=[eit]))/},
  {id:'spect',p:/spect|spec(?=[it])/},{id:'port',p:/port(?!ion|al$)/},
  {id:'ject',p:/ject/},{id:'dict',p:/dict/},{id:'scrib',p:/scri(?:b|pt)/},
  {id:'vert',p:/vert|vers/},{id:'mit',p:/(?:mit|miss(?!$))/},
  {id:'cred',p:/cred/},{id:'aud',p:/audi/},{id:'vis',p:/vis(?:i|u|$)|vid/},
  {id:'tract',p:/tract/},{id:'rupt',p:/rupt/},{id:'cept',p:/ce(?:pt|iv)/},
  {id:'pos',p:/pos(?:e|it|$)|pon(?:e|d)/},{id:'form',p:/form/},
  {id:'gen',p:/gen(?:[ei]|$)/},{id:'graph',p:/graph|gram/},
  {id:'log',p:/log(?:y|i|$)/},{id:'path',p:/path/},{id:'phil',p:/phil/},
  {id:'phon',p:/phon/},{id:'photo',p:/photo/},{id:'psych',p:/psych/},
  {id:'scope',p:/scope/},{id:'sect',p:/sect/},{id:'sens',p:/sens|sent(?!ence)/},
  {id:'voc',p:/voc|vok/},{id:'act',p:/act(?:[iu]|$)/},{id:'anim',p:/anim/},
  {id:'aqua',p:/aqua/},{id:'astro',p:/astr(?:o|on)/},{id:'bio',p:/bio/},
  {id:'cap',p:/cap(?:[ait]|$)|cip(?!h)/},{id:'cede',p:/ced|cess/},
  {id:'chron',p:/chron/},{id:'civ',p:/civ/},{id:'claim',p:/claim|clam/},
  {id:'clar',p:/clar/},{id:'cord',p:/cord|card(?:i)/},{id:'corp',p:/corp/},
  {id:'cosm',p:/cosm/},{id:'cur',p:/cur(?:r|s|$)/},{id:'dem',p:/dem(?:o|$)/},
  {id:'derm',p:/derm/},{id:'domin',p:/domin/},{id:'equ',p:/equ/},
  {id:'fac',p:/fac(?:[it]|$)|fect|fic(?:[ie])/},{id:'fer',p:/fer(?:[ert]|$)/},
  {id:'fid',p:/fid(?:[ei]|$)/},{id:'fin',p:/fin(?:[ie]|$|al|ish)/},
  {id:'flex',p:/flex|flect/},{id:'flu',p:/flu(?:[eix]|ct|ent|id)/},
  {id:'frag',p:/frag|fract/},{id:'func',p:/func/},{id:'geo',p:/geo/},
  {id:'gress',p:/gress|grad(?:[eu])/},{id:'hab',p:/hab(?:it)|hib(?:it)/},
  {id:'junct',p:/junct|join/},{id:'lect',p:/lect|leg(?:[ei])/},
  {id:'liber',p:/liber/},{id:'liter',p:/liter/},{id:'loc',p:/loc(?:[ao])/},
  {id:'luc',p:/lu(?:c|min)/},{id:'man',p:/man(?:[iu]|age)/},{id:'mar',p:/mar(?:in|it)/},
  {id:'mater',p:/mater|matr/},{id:'med',p:/med(?:[ii])/},
  {id:'mem',p:/mem(?:o|$)/},{id:'ment',p:/ment(?:al|or|$)/},
  {id:'min',p:/min(?:i|or|ut|im)/},{id:'mob',p:/mob|mot|mov/},
  {id:'morph',p:/morph/},{id:'mort',p:/mort/},{id:'nat',p:/nat(?:[iu]|$)/},
  {id:'nav',p:/nav/},{id:'nom',p:/nom(?:[i]|$)|nym/},{id:'norm',p:/norm/},
  {id:'nov',p:/nov(?:[ei]|$)/},{id:'oper',p:/oper/},{id:'opt',p:/opt(?:[ii]|$)/},
  {id:'ord',p:/ord(?:[ie]|$)/},{id:'pater',p:/pater|patr/},
  {id:'ped',p:/ped(?:[ei]|$)|pod/},{id:'pel',p:/pel(?:$|l)|puls/},
  {id:'pend',p:/pend|pens/},{id:'plex',p:/plex|plic|ply|pli/},
  {id:'pop',p:/pop(?:u)/},{id:'press',p:/press/},{id:'prim',p:/prim/},
  {id:'priv',p:/priv/},{id:'prob',p:/prob|prov/},{id:'reg',p:/reg|rect/},
  {id:'sal',p:/(?:sult|sal(?:[it]))/},{id:'sci',p:/sci(?:[e])/},
  {id:'sign',p:/sign/},{id:'simil',p:/simil|simul/},{id:'sol',p:/sol(?:[auvio]|$)/},
  {id:'spec2',p:/spec(?:i|$)/},{id:'spher',p:/spher/},{id:'spir',p:/spir(?:[ie]|$)/},
  {id:'stat',p:/stat|sist|stab/},{id:'stell',p:/stell/},{id:'tang',p:/tang|tact/},
  {id:'temp',p:/temp(?:[oe])/},{id:'ten',p:/ten(?:[aiu]|$)|tain/},
  {id:'terr',p:/terr/},{id:'test',p:/test(?:[i]|$)/},{id:'theo',p:/theo|thei/},
  {id:'therm',p:/therm/},{id:'tort',p:/tort|torq/},{id:'typ',p:/typ/},
  {id:'urb',p:/urb/},{id:'val',p:/val(?:[iu]|$|id)/},{id:'ven',p:/ven(?:[it]|$)/},
  {id:'vita',p:/vit(?:a|al)|viv/},{id:'vol',p:/vol(?:[uv]|$)/},
];

const SUFFIXES = [
  {id:'tion',p:/(?:tion|sion)$/},{id:'ment2',p:/ment$/},{id:'ness',p:/ness$/},
  {id:'ity',p:/(?:ity|ty)$/},{id:'er',p:/(?:[^t]er|or)$/},{id:'ist',p:/ist$/},
  {id:'ism',p:/ism$/},{id:'able',p:/(?:able|ible)$/},{id:'ful',p:/ful$/},
  {id:'less',p:/less$/},{id:'ous',p:/(?:ous|ious)$/},{id:'ive',p:/ive$/},
  {id:'al',p:/(?:[^u]al|ial)$/},{id:'ic',p:/ic$/},{id:'ly',p:/ly$/},
  {id:'ize',p:/ize$/},{id:'ify',p:/ify$/},{id:'ate',p:/ate$/},
  {id:'en2',p:/en$/},{id:'ward',p:/ward$/},{id:'dom',p:/dom$/},
  {id:'ship',p:/ship$/},{id:'hood',p:/hood$/},{id:'age',p:/age$/},
  {id:'ance',p:/(?:ance|ence)$/},{id:'ant',p:/(?:ant|ent)$/},
  {id:'ary',p:/(?:ary|ory)$/},{id:'ure',p:/ure$/},{id:'ing2',p:/ing$/},
  {id:'ed2',p:/ed$/},{id:'ular',p:/ular$/},{id:'esque',p:/esque$/},
  {id:'ling',p:/ling$/},
];

// ============================================================
//  FETCH WORD LIST
// ============================================================
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ============================================================
//  MORPHEME DETECTION
// ============================================================
function detectMorphemes(word) {
  const w = word.toLowerCase();
  if (w.length < 4) return [];

  const found = [];

  // Check prefixes (from longest to shortest to avoid greedy matches)
  for (const pf of PREFIXES) {
    if (pf.p.test(w)) {
      found.push(pf.id);
      break; // Only one prefix typically
    }
  }

  // Check roots
  for (const rt of ROOTS) {
    if (rt.p.test(w)) {
      found.push(rt.id);
    }
  }

  // Check suffixes
  for (const sf of SUFFIXES) {
    if (sf.p.test(w)) {
      found.push(sf.id);
      break; // Only one suffix typically
    }
  }

  // Deduplicate
  return [...new Set(found)];
}

// ============================================================
//  MAIN
// ============================================================
async function main() {
  console.log('===========================================');
  console.log('  Etymology Network — Vocabulary Builder');
  console.log('===========================================\n');

  // Step 1: Fetch comprehensive English word lists
  console.log('Step 1: Fetching English word lists...');

  let allWords = new Set();

  // Source 1: dwyl/english-words (most comprehensive, ~370k words)
  try {
    console.log('  Fetching dwyl/english-words list...');
    const text = await fetchText('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt');
    const words = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length >= 4 && w.length <= 25 && /^[a-z]+$/.test(w));
    words.forEach(w => allWords.add(w));
    console.log(`  Got ${words.length} words from dwyl/english-words`);
  } catch(e) {
    console.log('  Failed to fetch dwyl list:', e.message);
  }

  // Source 2: SCOWL / aspell (fallback if first fails)
  if (allWords.size < 10000) {
    try {
      console.log('  Fetching alternative word list...');
      const text = await fetchText('https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt');
      const words = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length >= 4 && w.length <= 25 && /^[a-z]+$/.test(w));
      words.forEach(w => allWords.add(w));
      console.log(`  Got ${words.length} words from enable1`);
    } catch(e) {
      console.log('  Failed:', e.message);
    }
  }

  console.log(`  Total unique words: ${allWords.size}`);

  // Step 2: Detect morphemes for each word
  console.log('\nStep 2: Detecting morphemes in words...');
  const wordMorphMap = new Map(); // word -> [morpheme_ids]
  let matched = 0, unmatched = 0;

  for (const w of allWords) {
    const morphs = detectMorphemes(w);
    if (morphs.length >= 1) {
      wordMorphMap.set(w, morphs);
      matched++;
    } else {
      unmatched++;
    }
  }

  console.log(`  Matched: ${matched} words (have at least 1 morpheme)`);
  console.log(`  Unmatched: ${unmatched} words (no morpheme detected)`);

  // Step 3: Filter — keep only words that have at least one root morpheme
  // (prefix-only or suffix-only matches are often false positives)
  const rootIds = new Set(ROOTS.map(r => r.id));
  const qualityWords = new Map();
  for (const [w, morphs] of wordMorphMap) {
    const hasRoot = morphs.some(m => rootIds.has(m));
    const hasPrefixAndSuffix = morphs.some(m => PREFIXES.find(p=>p.id===m)) && morphs.some(m => SUFFIXES.find(s=>s.id===m));
    if (hasRoot || hasPrefixAndSuffix || morphs.length >= 2) {
      qualityWords.set(w, morphs);
    }
  }

  console.log(`  Quality filtered: ${qualityWords.size} words`);

  // Step 4: Build output — compact format
  console.log('\nStep 3: Building output...');

  // Count words per morpheme
  const morphCounts = {};
  for (const [w, morphs] of qualityWords) {
    for (const m of morphs) {
      morphCounts[m] = (morphCounts[m] || 0) + 1;
    }
  }

  // Compact format: array of [word, ...morpheme_ids]
  const output = [];
  for (const [w, morphs] of qualityWords) {
    output.push([w, ...morphs]);
  }

  // Sort by word
  output.sort((a, b) => a[0].localeCompare(b[0]));

  // Write full JSON
  const outPath = path.join(OUT_DIR, 'words.json');
  fs.writeFileSync(outPath, JSON.stringify(output));
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`  Wrote ${outPath} (${sizeMB} MB, ${output.length} words)`);

  // Write morpheme stats
  const statsPath = path.join(OUT_DIR, 'stats.json');
  fs.writeFileSync(statsPath, JSON.stringify({ total: output.length, morphCounts }, null, 2));
  console.log(`  Wrote ${statsPath}`);

  // Write a compact JS-embeddable version (shorter variable names, array format)
  // Format: "word:m1,m2,m3\n" — very compact
  const compactLines = output.map(e => e[0] + ':' + e.slice(1).join(','));
  const compactPath = path.join(OUT_DIR, 'words_compact.txt');
  fs.writeFileSync(compactPath, compactLines.join('\n'));
  const compactMB = (fs.statSync(compactPath).size / 1024 / 1024).toFixed(2);
  console.log(`  Wrote ${compactPath} (${compactMB} MB)`);

  console.log('\n===========================================');
  console.log('  Summary');
  console.log('===========================================');
  console.log(`  Words in database: ${output.length}`);
  console.log(`  Active morphemes: ${Object.keys(morphCounts).length}`);
  console.log(`  Top morphemes by word count:`);
  const sorted = Object.entries(morphCounts).sort((a,b) => b[1]-a[1]).slice(0, 15);
  sorted.forEach(([m, c]) => console.log(`    ${m}: ${c} words`));
  console.log('===========================================\n');
  console.log('Next step: Run `node scripts/embed-words.js` to generate the final index.html');
}

main().catch(console.error);
