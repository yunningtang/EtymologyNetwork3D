/**
 * Etymology Network — Word Data Scraper & Database Seeder
 *
 * This script:
 * 1. Reads existing morpheme data from the inline HTML
 * 2. Scrapes additional word data from Free Dictionary API (free, no key needed)
 * 3. Stores everything in SQLite with proper IDs
 * 4. Can be re-run to incrementally add new words
 *
 * Usage: node scripts/scrape-words.js
 */

const Database = require('better-sqlite3');
const https = require('https');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'etymology.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
//  SCHEMA
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS morphemes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('p','r','s')),
    morph TEXT NOT NULL,
    origin TEXT,
    meaning TEXT,
    meaning_cn TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT UNIQUE NOT NULL,
    meaning_cn TEXT,
    ipa TEXT,
    audio_url TEXT,
    definition TEXT,
    example_sentence TEXT,
    frequency_rank INTEGER,
    cet4 INTEGER DEFAULT 0,
    cet6 INTEGER DEFAULT 0,
    ielts INTEGER DEFAULT 0,
    toefl INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS word_morphemes (
    word_id INTEGER NOT NULL,
    morpheme_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (word_id, morpheme_id),
    FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
    FOREIGN KEY (morpheme_id) REFERENCES morphemes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
  CREATE INDEX IF NOT EXISTS idx_wm_word ON word_morphemes(word_id);
  CREATE INDEX IF NOT EXISTS idx_wm_morph ON word_morphemes(morpheme_id);
`);

// ============================================================
//  EXISTING DATA (extracted from index.html)
// ============================================================
const NODE_CAT = {
  un:'neg',dis:'neg',in1:'neg',non:'neg',anti:'neg',counter:'neg',mis:'neg',
  pre:'dir',post:'dir',re:'dir',trans:'dir',inter:'dir',intra:'dir',extra:'dir',
  circum:'dir',dia:'dir',ex:'dir',ad:'dir',ab:'dir',retro:'dir',peri:'dir',para:'dir',de:'dir',
  super:'deg',sub:'deg',over:'deg',under:'deg',hyper:'deg',hypo:'deg',
  ultra:'deg',mega:'deg',macro:'deg',micro:'deg',mini:'deg',
  bi:'num',tri:'num',multi:'num',mono:'num',uni:'num',semi:'num',poly:'num',
  en:'aux',co:'aux',pro:'aux',fore:'aux',auto:'aux',neo:'aux',proto:'aux',
  meta:'aux',infra:'aux',vice:'aux',out:'aux',sur:'aux',
  struct:'create',form:'create',gen:'create',fac:'create',pos:'create',plex:'create',
  func:'create',junct:'create',man:'create',oper:'create',
  act:'move',mob:'move',ject:'move',tract:'move',pel:'move',gress:'move',cur:'move',
  ven:'move',rupt:'move',mit:'move',duct:'move',fer:'move',cede:'move',flu:'move',
  port:'move',vert:'move',flex:'move',tort:'move',sal:'move',frag:'move',
  aud:'sense',vis:'sense',sens:'sense',tang:'sense',spect:'sense',scope:'sense',
  cord:'sense',derm:'sense',morph:'sense',anim:'sense',ped:'sense',spec2:'sense',
  psych:'mind',ment:'mind',mem:'mind',sci:'mind',cred:'mind',log:'mind',path:'mind',
  opt:'mind',prob:'mind',phil:'mind',cept:'mind',fin:'mind',norm:'mind',equ:'mind',
  ord:'mind',simil:'mind',ten:'mind',vol:'mind',min:'mind',nov:'mind',med:'mind',fid:'mind',theo:'mind',
  dict:'lang',scrib:'lang',graph:'lang',phon:'lang',voc:'lang',nom:'lang',
  claim:'lang',sign:'lang',lect:'lang',liter:'lang',clar:'lang',typ:'lang',
  bio:'nature',geo:'nature',aqua:'nature',astro:'nature',nat:'nature',terr:'nature',
  sol:'nature',therm:'nature',spher:'nature',stell:'nature',mar:'nature',cosm:'nature',
  photo:'nature',vita:'nature',chron:'nature',temp:'nature',mort:'nature',spir:'nature',loc:'nature',luc:'nature',
  civ:'society',dem:'society',pop:'society',urb:'society',reg:'society',domin:'society',
  liber:'society',priv:'society',val:'society',corp:'society',pend:'society',press:'society',
  prim:'society',test:'society',hab:'society',stat:'society',pater:'society',mater:'society',cap:'society',
  tion:'noun_s',ment2:'noun_s',ness:'noun_s',ity:'noun_s',er:'noun_s',ist:'noun_s',
  ism:'noun_s',dom:'noun_s',ship:'noun_s',hood:'noun_s',age:'noun_s',ance:'noun_s',
  ure:'noun_s',ling:'noun_s',
  able:'adj_s',ful:'adj_s',less:'adj_s',ous:'adj_s',ive:'adj_s',al:'adj_s',
  ic:'adj_s',ular:'adj_s',esque:'adj_s',ed2:'adj_s',ing2:'adj_s',ant:'adj_s',ary:'adj_s',
  ize:'verb_s',ify:'verb_s',ate:'verb_s',en2:'verb_s',
  ly:'adv_s',ward:'adv_s',
};

// ============================================================
//  HELPERS
// ============================================================
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'EtymologyNetwork/1.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Invalid JSON from ' + url)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
//  STEP 1: Parse existing morphemes from HTML
// ============================================================
function seedMorphemesFromHTML() {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // Extract MORPHEMES array
  const match = html.match(/const MORPHEMES = \[([\s\S]*?)\];/);
  if (!match) { console.log('Could not find MORPHEMES array in HTML'); return []; }

  // Parse each morpheme entry
  const entries = [];
  const re = /\{id:'([^']+)',type:'([^']+)',morph:'([^']+)',origin:'([^']*)',meaning:'([^']*)',words:\[([^\]]*)\]\}/g;
  let m;
  while ((m = re.exec(match[1])) !== null) {
    const [, id, type, morph, origin, meaning, wordsStr] = m;
    const words = [];
    const wre = /'([^']+)'/g;
    let w;
    while ((w = wre.exec(wordsStr)) !== null) {
      const sp = w[1].lastIndexOf(' ');
      words.push({ en: w[1].substring(0, sp), cn: w[1].substring(sp + 1) });
    }

    const [meaningEn, meaningCn] = meaning.includes(' ') ?
      [meaning.split(' ').slice(0, -1).join(' '), meaning.split(' ').pop()] :
      [meaning, ''];

    entries.push({ id, type, morph, origin, meaningEn, meaningCn: meaning, words, category: NODE_CAT[id] || '' });
  }

  console.log(`Parsed ${entries.length} morphemes from HTML`);

  // Insert morphemes
  const insertMorpheme = db.prepare(
    'INSERT OR REPLACE INTO morphemes (id, type, morph, origin, meaning, meaning_cn, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertWord = db.prepare(
    'INSERT OR IGNORE INTO words (word, meaning_cn) VALUES (?, ?)'
  );
  const getWordId = db.prepare('SELECT id FROM words WHERE word = ?');
  const insertWM = db.prepare(
    'INSERT OR IGNORE INTO word_morphemes (word_id, morpheme_id, position) VALUES (?, ?, ?)'
  );

  const seedAll = db.transaction(() => {
    entries.forEach(e => {
      insertMorpheme.run(e.id, e.type, e.morph, e.origin, e.meaningEn, e.meaningCn, e.category);
      e.words.forEach((w, idx) => {
        insertWord.run(w.en.toLowerCase(), w.cn);
        const row = getWordId.get(w.en.toLowerCase());
        if (row) insertWM.run(row.id, e.id, idx);
      });
    });
  });

  seedAll();

  const morphCount = db.prepare('SELECT COUNT(*) as c FROM morphemes').get().c;
  const wordCount = db.prepare('SELECT COUNT(*) as c FROM words').get().c;
  const linkCount = db.prepare('SELECT COUNT(*) as c FROM word_morphemes').get().c;
  console.log(`Database: ${morphCount} morphemes, ${wordCount} words, ${linkCount} links`);

  return entries;
}

// ============================================================
//  STEP 2: Scrape IPA and definitions from Free Dictionary API
// ============================================================
async function scrapeWordDetails() {
  const words = db.prepare('SELECT id, word FROM words WHERE ipa IS NULL').all();
  console.log(`\nFetching details for ${words.length} words from Free Dictionary API...`);

  const updateWord = db.prepare(
    'UPDATE words SET ipa = ?, definition = ?, example_sentence = ?, audio_url = ? WHERE id = ?'
  );

  let success = 0, failed = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    try {
      const data = await fetchJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w.word)}`);

      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];

        // IPA
        let ipa = '';
        if (entry.phonetic) ipa = entry.phonetic;
        else if (entry.phonetics) {
          const phon = entry.phonetics.find(p => p.text);
          if (phon) ipa = phon.text;
        }

        // Audio URL
        let audioUrl = '';
        if (entry.phonetics) {
          const aud = entry.phonetics.find(p => p.audio && p.audio.length > 5);
          if (aud) audioUrl = aud.audio;
        }

        // Definition + example
        let definition = '', example = '';
        if (entry.meanings && entry.meanings.length > 0) {
          const m = entry.meanings[0];
          if (m.definitions && m.definitions.length > 0) {
            definition = m.definitions[0].definition || '';
            example = m.definitions[0].example || '';
          }
        }

        updateWord.run(ipa, definition, example, audioUrl, w.id);
        success++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }

    // Progress
    if ((i + 1) % 20 === 0 || i === words.length - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${words.length} (${success} ok, ${failed} failed)`);
    }

    // Rate limit: ~450ms between requests to be polite
    await sleep(450);
  }

  console.log(`\n  Done: ${success} enriched, ${failed} failed`);
}

// ============================================================
//  STEP 3: Tag exam-level words (CET-4, CET-6, IELTS, TOEFL)
// ============================================================
function tagExamLevels() {
  // Common CET-4 level words (simplified heuristic: high-frequency, basic roots)
  const cet4Roots = ['struct','form','act','port','ject','dict','vis','sens','gen','log','nat','val','fin','cur'];
  const cet6Roots = ['spect','vert','mit','cred','tract','rupt','cept','pos','graph','path','psych','scope','sect','plex'];

  const updateCET4 = db.prepare('UPDATE words SET cet4 = 1 WHERE id IN (SELECT wm.word_id FROM word_morphemes wm WHERE wm.morpheme_id = ?)');
  const updateCET6 = db.prepare('UPDATE words SET cet6 = 1 WHERE id IN (SELECT wm.word_id FROM word_morphemes wm WHERE wm.morpheme_id = ?)');

  db.transaction(() => {
    cet4Roots.forEach(r => updateCET4.run(r));
    cet6Roots.forEach(r => updateCET6.run(r));
  })();

  const c4 = db.prepare('SELECT COUNT(*) as c FROM words WHERE cet4 = 1').get().c;
  const c6 = db.prepare('SELECT COUNT(*) as c FROM words WHERE cet6 = 1').get().c;
  console.log(`\nExam tags: ${c4} CET-4 words, ${c6} CET-6 words`);
}

// ============================================================
//  MAIN
// ============================================================
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Etymology Network — Data Pipeline');
  console.log('═══════════════════════════════════════\n');

  // Step 1: Seed from HTML
  console.log('Step 1: Seeding morphemes & words from HTML...');
  seedMorphemesFromHTML();

  // Step 2: Scrape word details
  console.log('\nStep 2: Scraping word details from Free Dictionary API...');
  console.log('  (This will take ~10 minutes for ~1300 words, rate-limited to be polite)');
  console.log('  Press Ctrl+C to skip — existing data will be preserved.\n');
  await scrapeWordDetails();

  // Step 3: Tag exam levels
  console.log('\nStep 3: Tagging exam-level words...');
  tagExamLevels();

  // Summary
  const stats = {
    morphemes: db.prepare('SELECT COUNT(*) as c FROM morphemes').get().c,
    words: db.prepare('SELECT COUNT(*) as c FROM words').get().c,
    withIPA: db.prepare('SELECT COUNT(*) as c FROM words WHERE ipa IS NOT NULL AND ipa != ""').get().c,
    withDef: db.prepare('SELECT COUNT(*) as c FROM words WHERE definition IS NOT NULL AND definition != ""').get().c,
    withAudio: db.prepare('SELECT COUNT(*) as c FROM words WHERE audio_url IS NOT NULL AND audio_url != ""').get().c,
    links: db.prepare('SELECT COUNT(*) as c FROM word_morphemes').get().c,
  };

  console.log('\n═══════════════════════════════════════');
  console.log('  Final Database Summary');
  console.log('═══════════════════════════════════════');
  console.log(`  Morphemes:      ${stats.morphemes}`);
  console.log(`  Words:          ${stats.words}`);
  console.log(`  With IPA:       ${stats.withIPA}`);
  console.log(`  With definition:${stats.withDef}`);
  console.log(`  With audio URL: ${stats.withAudio}`);
  console.log(`  Word↔Morpheme:  ${stats.links}`);
  console.log(`  Database:       data/etymology.db`);
  console.log('═══════════════════════════════════════\n');
}

main().catch(console.error);
