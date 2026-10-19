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

    const node = { id:m.id, type:m.type, label:m.morph, origin:m.origin, meaning:m.meaning,
      wordList: allWords.slice(0, 300), wordCount: allWords.length,
      color: new THREE.Color(hex), colorHex: hex, catLabel: getCatLabel(m.id),
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

// ============================================================
//  FORCE-DIRECTED LAYOUT
// ============================================================
const SPHERE_R = 80;
function initPositions() {
  nodes.forEach(n => {
    const t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1);
    const r=SPHERE_R*0.6;
    n.x=r*Math.sin(p)*Math.cos(t)+(Math.random()-0.5)*10;
    n.y=r*Math.sin(p)*Math.sin(t)+(Math.random()-0.5)*10;
    n.z=r*Math.cos(p)+(Math.random()-0.5)*10;
  });
}
function runSimulation(steps) {
  // All nodes are morphemes now — direct N² repulsion is fine for ~205 nodes
  const repStr=250, attStr=0.015, tDist=12, damp=0.80, dThr=80;
  for(let s=0;s<steps;s++){
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j]; let dx=a.x-b.x,dy=a.y-b.y,dz=a.z-b.z;
      const d2=dx*dx+dy*dy+dz*dz; if(d2>dThr*dThr||d2<0.01)continue;
      const d=Math.sqrt(d2),f=repStr/d2; dx/=d;dy/=d;dz/=d;
      a.vx+=dx*f;a.vy+=dy*f;a.vz+=dz*f; b.vx-=dx*f;b.vy-=dy*f;b.vz-=dz*f;
    }
    edges.forEach(e=>{
      const a=nodeMap[e.source],b=nodeMap[e.target]; if(!a||!b)return;
      let dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z; const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(d<0.01)return; const f=(d-tDist)*attStr; dx/=d;dy/=d;dz/=d;
      a.vx+=dx*f;a.vy+=dy*f;a.vz+=dz*f; b.vx-=dx*f;b.vy-=dy*f;b.vz-=dz*f;
    });
    nodes.forEach(n=>{
      const tR=SPHERE_R*0.6;
      const d=Math.sqrt(n.x*n.x+n.y*n.y+n.z*n.z);
      if(d>0.01){const rf=(tR-d)*0.005; n.vx+=(n.x/d)*rf;n.vy+=(n.y/d)*rf;n.vz+=(n.z/d)*rf;}
      n.vx*=damp;n.vy*=damp;n.vz*=damp; n.x+=n.vx;n.y+=n.vy;n.z+=n.vz;
    });
  }
}
