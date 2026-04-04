#!/usr/bin/env node
/**
 * Builds the final index.html by injecting word data into the template.
 *
 * Usage: node scripts/build-html.js
 *
 * Reads: public/index.html (template with %%WORDS_DATA%% placeholder)
 * Reads: scripts/output/WORDS_DATA.txt (30k+ words)
 * Writes: public/index.html (with data embedded)
 * Writes: index.html (root copy for GitHub Pages)
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'public', 'index.html');
const WORDS_PATH = path.join(__dirname, 'output', 'WORDS_DATA.txt');
const ROOT_HTML = path.join(__dirname, '..', 'index.html');

// Read files
let html = fs.readFileSync(HTML_PATH, 'utf-8');
const wordsData = fs.readFileSync(WORDS_PATH, 'utf-8').trim();

// Escape for JS string literal (backtick template literal would need escaping of ` and ${)
// Use double-quoted string with \n line joins
const escaped = wordsData
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\n/g, '\\n');

// Replace placeholder
if (!html.includes('%%WORDS_DATA%%')) {
  console.error('ERROR: Could not find %%WORDS_DATA%% placeholder in public/index.html');
  console.error('The word data may already be embedded, or the placeholder was removed.');
  process.exit(1);
}

// Replace only the assignment placeholder (first occurrence)
html = html.replace('"%%WORDS_DATA%%"', '"' + escaped + '"');

// Verify: should still have the check condition but not the assignment
const remaining = (html.match(/%%WORDS_DATA%%/g) || []).length;
if (remaining !== 1) {
  console.error(`ERROR: Expected 1 remaining occurrence (the runtime check), found ${remaining}`);
  process.exit(1);
}

// Write back
fs.writeFileSync(HTML_PATH, html);
const pubSize = (fs.statSync(HTML_PATH).size / 1024).toFixed(0);
console.log(`✓ public/index.html updated (${pubSize} KB)`);

// Copy to root for GitHub Pages
fs.writeFileSync(ROOT_HTML, html);
const rootSize = (fs.statSync(ROOT_HTML).size / 1024).toFixed(0);
console.log(`✓ index.html (root copy) updated (${rootSize} KB)`);

// Stats
const wordCount = wordsData.split('\n').length;
console.log(`✓ Embedded ${wordCount} words`);
console.log(`\nDone! Open index.html in a browser to preview.`);
