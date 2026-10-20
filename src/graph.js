// Graph model: morpheme nodes, co-occurrence edges, word→morpheme helpers, force-directed layout.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  GRAPH BUILDER
// ============================================================
const nodes = [], edges = [], nodeMap = {}, adjacency = {};

function buildGraph() {
  // Build morpheme nodes only (LOD: words are data, not 3D nodes)
  MORPHEMES.forEach(m => {
    const hex = getCatColor(m.id);
    // Word list from data/words.js — already in frequency order, every entry has a verified 中文释义
    const allWords = (MORPH_WORDS[m.id]||[]).map(w => ({en:w, cn:WORD_CN[w]||''}));

    const node = { id:m.id, type:m.type, label:m.morph, origin:m.origin, meaning:m.meaning, story:m.story||'', caution:m.caution||'',
      wordList: allWords.slice(0, 300), wordCount: allWords.length,
      colorHex: hex, catLabel: getCatLabel(m.id),
      x:0,y:0,z:0,vx:0,vy:0,vz:0 };
    nodes.push(node); nodeMap[m.id]=node; adjacency[m.id]=new Set();
  });
  // Planet size: morphemes with more words are bigger (sqrt scale, 9–20 px at reference distance)
  const maxWc = Math.max(1, ...nodes.map(n => n.wordCount));
  nodes.forEach(n => { n.baseSize = 9 + 11 * Math.sqrt(n.wordCount / maxWc); });

  // Build edges: connect morphemes that co-occur in words (all words)
  const cooccur = {};
  for(const [word, morphs] of WORD_DATA){
    const valid = morphs.filter(m => nodeMap[m]);
    for(let i=0; i<valid.length; i++){
      for(let j=i+1; j<valid.length; j++){
        const ni=nodeMap[valid[i]], nj=nodeMap[valid[j]];
        if(ni.type==='s' && nj.type==='s') continue;
        const key = valid[i] < valid[j] ? valid[i]+'|'+valid[j] : valid[j]+'|'+valid[i];
        cooccur[key] = (cooccur[key]||0) + 1;
      }
    }
  }
  // Top co-occurrences only, capped at 240 edges (denser than that reads as noise)
  Object.entries(cooccur)
    .filter(([,c]) => c >= 5)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 240)
    .forEach(([key, count]) => {
      const [a, b] = key.split('|');
      edges.push({source:a, target:b, weight:count});
      adjacency[a].add(b); adjacency[b].add(a);
    });
  console.log(`Graph: ${nodes.length} morphemes, ${edges.length} edges, ${WORD_DATA.size} words`);
}

// Reverse index: word → [morphemeIds] from ALL sources (wordList + WORD_DATA)
const WORD_MORPH_REVERSE = Object.create(null);
function buildWordReverse(){
  // From every morpheme's wordList
  nodes.forEach(n=>{
    if(!n.wordList) return;
    n.wordList.forEach(w=>{
      const k=w.en.toLowerCase();
      if(!WORD_MORPH_REVERSE[k]) WORD_MORPH_REVERSE[k]=new Set();
      WORD_MORPH_REVERSE[k].add(n.id);
    });
  });
  // Also include WORD_DATA entries
  WORD_DATA.forEach((morphs,word)=>{
    if(!WORD_MORPH_REVERSE[word]) WORD_MORPH_REVERSE[word]=new Set();
    morphs.forEach(m=>{ if(nodeMap[m]) WORD_MORPH_REVERSE[word].add(m); });
  });
}

// Build a meaning from morpheme parts — always returns something if morphemes exist
function buildMorphMeaning(morphIds){
  const cnParts=[], enParts=[];
  morphIds.forEach(mid=>{
    const n=nodeMap[mid]; if(!n) return;
    const m=n.meaning||'';
    const cnMatch=m.match(/[\u4e00-\u9fff\u2026].+/);
    if(cnMatch) cnParts.push(cnMatch[0]);
    // Also collect English meaning as fallback
    const enMatch=m.match(/^[a-zA-Z\s,/()-]+/);
    if(enMatch) enParts.push(enMatch[0].trim());
  });
  if(cnParts.length>0) return cnParts.join('+');
  if(enParts.length>0) return enParts.join('+');
  return '';
}

// Get Chinese meaning for any word (2-layer: human first, then morpheme composition)
function getWordCN(w){
  w=w.toLowerCase();
  // Layer 1: direct WORD_CN lookup (~1300 human-verified words)
  let cn=WORD_CN[w]||'';
  if(cn) return cn;
  // Layer 2: search all morpheme wordLists for this word's cn (also human-verified)
  const morphIds=getWordMorphIds(w);
  for(const mid of morphIds){
    const wl=nodeMap[mid]&&nodeMap[mid].wordList;
    if(wl){ const f=wl.find(ww=>ww.en.toLowerCase()===w); if(f&&f.cn&&/[\u4e00-\u9fff]/.test(f.cn)){ return f.cn; } }
  }
  // Layer 3: construct from morpheme parts (marked as approximate)
  const cnParts=[];
  morphIds.forEach(mid=>{
    const n=nodeMap[mid]; if(!n) return;
    const m=n.meaning||'';
    const cnMatch=m.match(/[\u4e00-\u9fff\u2026].+/);
    if(cnMatch) cnParts.push(cnMatch[0]);
  });
  if(cnParts.length>0) return cnParts.join('·');
  return '';
}

// Get morpheme IDs for any word
function getWordMorphIds(w){
  w=w.toLowerCase();
  let ids=WORD_DATA.get(w)||[];
  let valid=ids.filter(m=>nodeMap[m]);
  if(valid.length===0 && WORD_MORPH_REVERSE[w]) valid=[...WORD_MORPH_REVERSE[w]];
  return valid;
}

// Build etymology string like "pre-(before) + dict(say)"
function buildEtymologyStr(w){
  const morphIds=getWordMorphIds(w.toLowerCase());
  if(morphIds.length===0) return '';
  return morphIds.map(mid=>{
    const n=nodeMap[mid]; if(!n) return '';
    const meaning=n.meaning||'';
    return n.label+'('+meaning+')';
  }).filter(Boolean).join(' + ');
}

// (3D force layout removed — the workshop view is a plain document)
