#!/usr/bin/env node
/**
 * Downloads the open data this project's vocabulary is built from into
 * scripts/output/ (git-ignored). Skips files that are already present.
 *
 *   ecdict.csv    ECDICT by skywind3000 (MIT) — 770k English-Chinese entries with
 *                 phonetics, exam tags (zk/gk/cet4/cet6/ky/toefl/ielts/gre) and frequency.
 *   wordroot.txt  ECDICT's word-root dictionary — 611 roots/affixes with curated examples.
 */
const fs = require('fs'), path = require('path'), https = require('https');
const OUT = path.join(__dirname, '..', 'output');
const SOURCES = {
  'ecdict.csv':   'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
  'wordroot.txt': 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/wordroot.txt',
};
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const go = (u, n) => https.get(u, { headers: { 'User-Agent': 'EtymologyNetwork3D' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && n < 5) return go(res.headers.location, n + 1);
      if (res.statusCode !== 200) return reject(new Error(`${u}: HTTP ${res.statusCode}`));
      const tmp = dest + '.part', ws = fs.createWriteStream(tmp);
      res.pipe(ws); ws.on('finish', () => { fs.renameSync(tmp, dest); resolve(); }); ws.on('error', reject);
    }).on('error', reject);
    go(url, 0);
  });
}
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, url] of Object.entries(SOURCES)) {
    const dest = path.join(OUT, name);
    if (fs.existsSync(dest)) { console.log(`✓ ${name} already present`); continue; }
    process.stdout.write(`↓ ${name} ... `);
    await download(url, dest);
    console.log(`${(fs.statSync(dest).size / 1024 / 1024).toFixed(1)} MB`);
  }
}
module.exports = { OUT, SOURCES };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
