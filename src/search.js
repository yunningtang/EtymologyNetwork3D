// Search: prefix/contains/trigram matching over morphemes and words.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  FUZZY SEARCH (Trigram-based)
// ============================================================
const trigramIndex = {};
function buildTrigrams(str){
  const s = '  '+str.toLowerCase()+'  ';
  const t = new Set();
  for(let i=0;i<s.length-2;i++) t.add(s.substring(i,i+3));
  return t;
}
function indexNode(node){
  const terms = [node.label];
  if(node.meaning) terms.push(node.meaning);
  terms.forEach(term => {
    buildTrigrams(term).forEach(tri => {
      if(!trigramIndex[tri]) trigramIndex[tri] = [];
      trigramIndex[tri].push(node);
    });
  });
}
function fuzzySearch(query, limit=20){
  if(!query||query.length<1) return [];
  const q = query.toLowerCase().trim();
  const exact=[], partial=[];

  // Search morpheme nodes
  nodes.forEach(n=>{
    const lbl=n.label.toLowerCase(), mng=(n.meaning||'').toLowerCase();
    if(lbl===q) exact.unshift({node:n,score:100,match:'exact',isWord:false});
    else if(lbl.startsWith(q)) exact.push({node:n,score:90,match:'prefix',isWord:false});
    else if(lbl.includes(q)) partial.push({node:n,score:70,match:'contains',isWord:false});
    else if(mng.includes(q)) partial.push({node:n,score:50,match:'meaning',isWord:false});
  });

  // Search word data using prefix index (fast)
  const wordResults = [];
  // Exact match
  if(WORD_DATA.has(q) && wordVisible(q)) wordResults.push({word:q, morphs:WORD_DATA.get(q), score:100, match:'exact'});
  // Prefix match via index
  const p2 = q.substring(0,2);
  const bucket = WORD_PREFIX[p2] || [];
  for(let i=0; i<bucket.length && wordResults.length<30; i++){
    const w = bucket[i];
    if(w === q) continue; // already added
    if(w.startsWith(q) && wordVisible(w)) wordResults.push({word:w, morphs:WORD_DATA.get(w), score:85, match:'prefix'});
  }
  // Contains match over the whole vocabulary (only if few prefix results and query >= 3 chars).
  // Scanning every word matters here: "ject" must find "project", not just words starting with "je".
  if(wordResults.length < 10 && q.length >= 3){
    for(const w of WORD_DATA.keys()){
      if(wordResults.length >= 20) break;
      if(!w.startsWith(q) && w.includes(q) && wordVisible(w)) wordResults.push({word:w, morphs:WORD_DATA.get(w), score:60, match:'contains'});
    }
  }
  wordResults.sort((a,b) => b.score-a.score || a.word.length-b.word.length);

  // Convert top word results to virtual "word nodes" for display
  const seenWords = new Set();
  wordResults.slice(0, 15).forEach(wr => {
    if(seenWords.has(wr.word)) return;
    seenWords.add(wr.word);
    // Find primary morpheme for color
    const primaryMorph = wr.morphs.find(m => nodeMap[m] && nodeMap[m].type==='r') || wr.morphs.find(m => nodeMap[m]);
    const color = primaryMorph && nodeMap[primaryMorph] ? nodeMap[primaryMorph].colorHex : '#FFD740';
    // Build virtual word node for search display
    // Look up Chinese meaning from global lookup, then fallback to wordList, then construct
    const validMs = wr.morphs.filter(m=>nodeMap[m]);
    let wordMeaning=WORD_CN[wr.word]||'';
    if(!wordMeaning){
      for(const mid of validMs){
        const wl=nodeMap[mid].wordList;
        if(wl){ const found=wl.find(w=>w.en.toLowerCase()===wr.word); if(found&&found.cn){ wordMeaning=found.cn; break; } }
      }
    }
    if(!wordMeaning) wordMeaning=buildMorphMeaning(validMs);
    const vNode = {
      id: 'w_'+wr.word, type:'w', label:wr.word, meaning:wordMeaning,
      morphemes: validMs.map(m=>({id:m, type:nodeMap[m].type, label:nodeMap[m].label})),
      colorHex: color, isVirtual: true
    };
    partial.push({node:vNode, score:wr.score-5, match:wr.match, isWord:true});
  });

  // Trigram fuzzy for morphemes
  if(q.length>=2 && exact.length+partial.length < limit){
    const qTri=buildTrigrams(q);
    const scores=new Map();
    qTri.forEach(tri=>{
      if(trigramIndex[tri]) trigramIndex[tri].forEach(n=>{
        if(!scores.has(n.id)) scores.set(n.id,0);
        scores.set(n.id,scores.get(n.id)+1);
      });
    });
    const qSize=qTri.size;
    const existIds=new Set([...exact,...partial].map(r=>r.node.id));
    scores.forEach((count,id)=>{
      if(existIds.has(id)) return;
      const sim=count/qSize;
      if(sim>0.25){
        const n=nodeMap[id];
        if(n) partial.push({node:n,score:Math.round(sim*40),match:'fuzzy',isWord:false});
      }
    });
  }
  const all=[...exact,...partial];
  all.sort((a,b)=>b.score-a.score);
  return all.slice(0,limit);
}
