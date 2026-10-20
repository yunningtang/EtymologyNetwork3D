#!/usr/bin/env node
/**
 * Builds data/words.js — the vocabulary the app loads.
 *
 * Pipeline
 *   1. Target words: ECDICT entries tagged 中考/高考/CET4/CET6/考研/TOEFL/IELTS
 *      (single lowercase words), with Chinese gloss, IPA, levels, frequency.
 *   2. Verified morphemes: examples from ECDICT's curated wordroot.txt, mapped to
 *      this project's morpheme ids via rootmap.js.
 *   3. Derived morphemes: transparent affix peeling where the remaining stem is
 *      itself a dictionary word (happiness = happy + -ness; unpredictable =
 *      un- + predict + -able, inheriting predict's verified morphemes).
 *   4. Regex candidates (patterns.js) that are neither verified nor derived go
 *      to manual review; review/*.tsv holds the reviewed results (word → ids)
 *      and overrides everything else for that word.
 *   5. Words with at least one morpheme are written, most frequent first.
 *
 * Usage: node scripts/vocab/fetch.js && node scripts/vocab/build.js [--report]
 * Output line format (tab-separated): word  morphemeIds(,)  中文释义  IPA  levels
 *   levels: z=中考 g=高考 4=CET4 6=CET6 k=考研 t=TOEFL i=IELTS
 */
const fs = require('fs'), path = require('path');
const { OUT } = require('./fetch.js');
const rootmap = require('./rootmap.js');
const { PREFIXES, ROOTS, SUFFIXES } = require('./patterns.js');
const REVIEW_DIR = path.join(__dirname, 'review');
const DATA_OUT = path.join(__dirname, '..', '..', 'data', 'words.js');
const HTML = path.join(__dirname, '..', '..', 'src', 'morphemes.js');
const REPORT = process.argv.includes('--report');

// ---------- morpheme inventory (from index.html) ----------
const html = fs.readFileSync(HTML, 'utf8');
const MORPHEMES = eval('[' + html.match(/const MORPHEMES = \[([\s\S]*?)\n\];/)[1] + ']');
const TYPE = Object.fromEntries(MORPHEMES.map(m => [m.id, m.type]));
const IDS = new Set(Object.keys(TYPE));

// ---------- CSV ----------
function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---------- 1. targets ----------
const LEVEL_CODE = { zk: 'z', gk: 'g', cet4: '4', cet6: '6', ky: 'k', toefl: 't', ielts: 'i' };
function cleanGloss(t) {
  const lines = t.replace(/\\n/g, '\n').split('\n').map(s => s.trim())
    .filter(s => s && !/^\[(网络|医|法|计|化|电|机|经|建|地|天|体|物|数|生|军|植|食|纺|冶|林|海|矿|统|心|石|气|金|油|鱼|剧|逻|律|交|动|微|药|口|农|印|电影|渔|船|空|摄|中药|中医|劳|经济|计算机|木|纸|技|道|光)\]/.test(s))
    .map(s => s.replace(/\s+/g, ' '));
  return lines.slice(0, 4).join(' / ').replace(/[`\\$\t]/g, '').slice(0, 140);
}
// English definition: first two lines, short
function cleanDef(t) {
  const lines = String(t || '').replace(/\\n/g, '\n').split('\n').map(s => s.trim()).filter(Boolean).map(s => s.replace(/\s+/g, ' '));
  const s = (lines[0] || '').replace(/[`\\$\t]/g, ''); return s.length > 80 ? s.slice(0, 80).replace(/\s+\S*$/, '') + '…' : s;
}
// Word forms from ECDICT "exchange": p past, d past participle, i -ing, 3 third person, s plural, r comparative, t superlative
function cleanForms(t) {
  const keep = { p: '过去式', i: '现在分词', s: '复数', r: '比较级' };   // d ≈ p and 3 ≈ s almost always
  const out = [];
  for (const part of String(t || '').split('/')) { const [k, v] = part.split(':'); if (keep[k] && v && !/[`\\$\t]/.test(v)) out.push(k + ':' + v); }
  return out.join('/');
}
function normIPA(p) {
  if (!p) return '';
  let s = p.trim().replace(/[\[\]\/]/g, '');
  s = s.replace(/ә/g, 'ə').replace(/є/g, 'ɛ').replace(/ε/g, 'ɛ').replace(/g/g, 'ɡ').replace(/:/g, 'ː')
       .replace(/'/g, 'ˈ').replace(/(^|[^a-zəɪʊɒæʌɛɔɑːˈ])\./g, '$1ˌ').replace(/^\./, 'ˌ').replace(/\./g, '')
       .replace(/,/g, 'ˌ').replace(/\s+/g, '');
  // ECDICT uses a simplified Jones notation: i/u without length = ɪ/ʊ, ɒː = ɔː, aː = ɑː.
  s = s.replace(/ɒː/g, 'ɔː').replace(/aː/g, 'ɑː').replace(/i(?!ː)/g, 'ɪ').replace(/u(?!ː)/g, 'ʊ');
  // Drop entries with characters outside the IPA set we expect (a few ECDICT rows are garbled).
  if (!s || /[^a-zəɪʊɒæʌɛɔɑɜɚɝːˈˌŋʃʒθðɡ()-]/.test(s)) return '';
  return '/' + s + '/';
}
const roots = JSON.parse(fs.readFileSync(path.join(OUT, 'wordroot.txt'), 'utf8'));
const rootExamples = new Set();
for (const v of Object.values(roots)) for (const w of v.example || []) rootExamples.add(w.toLowerCase().replace(/[^a-z]/g, ''));

console.log('Reading ECDICT…');
const rows = parseCSV(fs.readFileSync(path.join(OUT, 'ecdict.csv'), 'utf8'));
const head = rows[0]; const col = Object.fromEntries(head.map((h, i) => [h, i]));
const targets = new Map(), known = new Set(), extra = new Map(); // extra: dictionary rows for wordroot examples outside the exam lists
for (let i = 1; i < rows.length; i++) {
  const r = rows[i], w = r[col.word]; if (!w) continue;
  if (!/^[a-z]{3,20}$/.test(w)) continue;
  const frq = +r[col.frq] || 0, bnc = +r[col.bnc] || 0, tag = r[col.tag] || '';
  if (frq || bnc || tag) known.add(w);
  const lv = tag.split(/\s+/).map(t => LEVEL_CODE[t]).filter(Boolean).join('');
  const ranks = [frq, bnc].filter(Boolean);
  if (!lv) {
    if (rootExamples.has(w) && r[col.translation]) extra.set(w, { cn: cleanGloss(r[col.translation]), ipa: normIPA(r[col.phonetic]), lv: '', en: cleanDef(r[col.definition]), forms: cleanForms(r[col.exchange]), rank: ranks.length ? Math.min(...ranks) : 1e9 });
    continue;
  }
  targets.set(w, { cn: cleanGloss(r[col.translation] || ''), ipa: normIPA(r[col.phonetic]), lv, en: cleanDef(r[col.definition]), forms: cleanForms(r[col.exchange]), rank: ranks.length ? Math.min(...ranks) : 1e9 });
}
console.log(`  ${targets.size} target words, ${known.size} known words`);

// ---------- 2. verified from wordroot ----------
const verified = new Map(), verifiedExtra = new Map();
const add = (map, w, id) => { if (!map.has(w)) map.set(w, new Set()); map.get(w).add(id); };
for (const [id, list] of Object.entries(rootmap)) {
  if (!IDS.has(id)) throw new Error(`rootmap: unknown morpheme id ${id}`);
  for (const e of list) {
    const k = typeof e === 'string' ? e : e.k, f = typeof e === 'string' ? null : e.f;
    if (!roots[k]) throw new Error(`rootmap: ${id} → wordroot key not found: ${k}`);
    for (let w of roots[k].example || []) {
      w = w.toLowerCase().replace(/[^a-z]/g, '');
      if (f && !f.test(w)) continue;
      if (targets.has(w)) add(verified, w, id);
      else if (extra.has(w)) add(verifiedExtra, w, id);
    }
  }
}
console.log(`  ${verified.size} words verified by wordroot.txt`);

// ---------- 3. derived by affix peeling ----------
const PRE_FORMS = [['under','under'],['over','over'],['inter','inter'],['counter','counter'],['super','super'],['trans','trans'],['anti','anti'],['semi','semi'],['multi','multi'],['micro','micro'],['auto','auto'],['fore','fore'],['post','post'],['mis','mis'],['dis','dis'],['non','non'],['pre','pre'],['sub','sub'],['out','out'],['un','un'],['re','re'],['co','co'],['de','de'],['ex','ex'],['in','in?'],['im','in?'],['il','in?'],['ir','in?'],['en','en'],['em','en']];
const SUF_FORMS = [['ization','ize+tion'],['ability','able+ity'],['ibility','able+ity'],['fulness','ful+ness'],['lessness','less+ness'],['ically','ic+al+ly'],['ousness','ous+ness'],['iveness','ive+ness'],['ation','tion'],['ition','tion'],['ment','ment2'],['ness','ness'],['ship','ship'],['hood','hood'],['ward','ward'],['wards','ward'],['able','able'],['ible','able'],['less','less'],['ling','ling'],['ance','ance'],['ence','ance'],['ancy','ance'],['ency','ance'],['tion','tion'],['sion','tion'],['ious','ous'],['eous','ous'],['ical','ic+al'],['ular','ular'],['esque','esque'],['ful','ful'],['ity','ity'],['ism','ism'],['ist','ist'],['ive','ive'],['ous','ous'],['ize','ize'],['ise','ize'],['ify','ify'],['ate','ate'],['dom','dom'],['age','age'],['ant','ant'],['ent','ant'],['ary','ary'],['ory','ary'],['ure','ure'],['ial','al'],['ual','al'],['ion','tion'],['ing','ing2'],['ed','ed2'],['ly','ly'],['er','er'],['or','er'],['al','al'],['ic','ic'],['en','en2'],['ty','ity']];
const isWord = s => (s.length >= 4 && targets.has(s)) || (s.length >= 5 && known.has(s));
const stemVariants = s => { const v = [s, s + 'e']; if (/([^aeiou])\1$/.test(s)) v.push(s.slice(0, -1)); if (s.endsWith('i')) v.push(s.slice(0, -1) + 'y'); return v; };
function peel(word) {
  const affixes = []; let w = word, changed = true, guard = 0;
  while (changed && guard++ < 6) {
    changed = false;
    for (const [sf, ids] of SUF_FORMS) if (w.endsWith(sf) && w.length - sf.length >= 3) {
      const hit = stemVariants(w.slice(0, -sf.length)).find(isWord);
      if (hit) { affixes.push(...ids.split('+')); w = hit; changed = true; break; }
    }
    for (const [pf, id] of PRE_FORMS) if (w.startsWith(pf) && w.length - pf.length >= 3 && isWord(w.slice(pf.length))) {
      affixes.push(id); w = w.slice(pf.length); changed = true; break;
    }
  }
  return affixes.length ? { stem: w, affixes } : null;
}
const derived = new Map(), ambiguousIn = new Set();
for (const w of targets.keys()) {
  const p = peel(w); if (!p) continue;
  for (const a of p.affixes) { if (a === 'in?') ambiguousIn.add(w); else add(derived, w, a); }
  if (targets.has(p.stem)) for (const id of verified.get(p.stem) || []) add(derived, w, id);
}
console.log(`  ${derived.size} words with derived morphemes`);

// ---------- 4. review ----------
const reviewed = new Map(); let reviewFiles = 0;
if (fs.existsSync(REVIEW_DIR)) for (const f of fs.readdirSync(REVIEW_DIR).filter(f => f.endsWith('.tsv')).sort()) {
  reviewFiles++;
  for (const line of fs.readFileSync(path.join(REVIEW_DIR, f), 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [w, ids = ''] = line.split('\t');
    const list = ids.split(',').map(s => s.trim()).filter(Boolean);
    const bad = list.filter(id => !IDS.has(id));
    if (bad.length) { console.warn(`  review ${f}: ${w}: unknown ids ${bad.join(',')} (dropped)`); }
    reviewed.set(w.trim(), list.filter(id => IDS.has(id)));
  }
}
console.log(`  ${reviewed.size} words covered by ${reviewFiles} review file(s)`);

function regexCands(w) {
  const c = new Set();
  for (const p of PREFIXES) if (p.p.test(w)) c.add(p.id);
  for (const r of ROOTS) if (r.p.test(w)) c.add(r.id);
  for (const s of SUFFIXES) if (s.p.test(w)) c.add(s.id);
  return c;
}
const REVIEW_SUFFIXES = new Set(['tion','ity','ance','ant','ous','ive','able','ary','ure','age','ate','ify','ize','ism','ist','al','ic']);
const needsReview = [];
const ORDER = { p: 0, r: 1, s: 2 };
const sortIds = ids => [...ids].sort((a, b) => ORDER[TYPE[a]] - ORDER[TYPE[b]]);

// ---------- 5. assemble ----------
const out = [];
for (const [w, t] of targets) {
  let ids;
  if (reviewed.has(w)) ids = reviewed.get(w);
  else {
    const v = verified.get(w) || new Set(), d = derived.get(w) || new Set();
    const open = [...regexCands(w)].filter(c => !v.has(c) && !d.has(c));
    if (ambiguousIn.has(w)) open.push('in1', 'in2');
    const q = open.filter(c => TYPE[c] !== 's' || REVIEW_SUFFIXES.has(c));
    if (q.length) needsReview.push({ w, v: [...v], d: [...d], q: [...new Set(q)] });
    ids = [...new Set([...v, ...d])];
  }
  if (ids.length) out.push({ w, ids: sortIds(ids), ...t });
}
// Morphemes with very few exam words get a handful of curated wordroot examples from the
// wider dictionary (marked with no level), so every morpheme has something to show.
const MIN_WORDS = 6, FILL_TO = 8;
const count = {}; for (const o of out) for (const id of o.ids) count[id] = (count[id] || 0) + 1;
const inOut = new Set(out.map(o => o.w));
for (const id of IDS) {
  if ((count[id] || 0) >= MIN_WORDS) continue;
  const cands = [...verifiedExtra].filter(([w, ids]) => ids.has(id) && !inOut.has(w))
    .sort((a, b) => extra.get(a[0]).rank - extra.get(b[0]).rank).slice(0, FILL_TO - (count[id] || 0));
  for (const [w, ids] of cands) { out.push({ w, ids: sortIds(ids), ...extra.get(w) }); inOut.add(w); for (const x of ids) count[x] = (count[x] || 0) + 1; }
}
out.sort((a, b) => a.rank - b.rank || a.w.localeCompare(b.w));

// ---------- write ----------
const lines = out.map(o => [o.w, o.ids.join(','), o.cn, o.ipa, o.lv, o.en || '', o.forms || ''].join('\t'));
const body = lines.join('\n');
if (/[`\\$]/.test(body)) throw new Error('data contains characters unsafe for a template literal');
fs.writeFileSync(DATA_OUT,
  '// Generated by scripts/vocab/build.js — do not edit by hand.\n' +
  '// Sources: ECDICT (MIT, skywind3000) + wordroot.txt + reviewed mappings in scripts/vocab/review/.\n' +
  `// Format per line: word <TAB> morphemeIds <TAB> 中文 <TAB> IPA <TAB> levels (z g 4 6 k t i) <TAB> English definition <TAB> forms (p:past/i:-ing/s:plural/r:comparative). ${out.length} words.\n` +
  'window.WORDS_RAW=`\n' + body + '\n`;\n');
console.log(`✓ wrote ${path.relative(process.cwd(), DATA_OUT)}: ${out.length} words, ${(fs.statSync(DATA_OUT).size / 1024).toFixed(0)} KB`);

// ---------- report ----------
const per = {}; for (const o of out) for (const id of o.ids) per[id] = (per[id] || 0) + 1;
const empty = [...IDS].filter(id => !per[id]);
console.log(`  morphemes with no words: ${empty.length ? empty.join(', ') : 'none'}`);
console.log(`  words still awaiting review (excluded unless verified/derived): ${needsReview.length}`);
if (REPORT) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'needs-review.json'), JSON.stringify(needsReview, null, 0));
  fs.writeFileSync(path.join(OUT, 'per-morpheme.json'), JSON.stringify(Object.fromEntries(Object.entries(per).sort((a, b) => a[1] - b[1])), null, 1));
  console.log(`  wrote ${path.join(OUT, 'needs-review.json')} and per-morpheme.json`);
}
