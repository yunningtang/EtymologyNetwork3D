// Highlight state: which nodes/edges are bright given search, filters, hover and pin.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

function computeHighlightSet(){
  if(searchQuery){
    const q=searchQuery.toLowerCase(), set=new Set();
    // Match morpheme nodes directly
    nodes.forEach(n=>{
      const lbl=n.label.toLowerCase(), mng=(n.meaning||'').toLowerCase();
      if(lbl.includes(q)||mng.includes(q)||lbl===q){
        set.add(n.id); if(adjacency[n.id]) adjacency[n.id].forEach(id=>set.add(id));
      }
    });
    // If query matches a word, highlight its morphemes
    const wordMorphs = WORD_DATA.get(q);
    if(wordMorphs){
      wordMorphs.forEach(mid => { if(nodeMap[mid]) { set.add(mid); if(adjacency[mid]) adjacency[mid].forEach(id=>set.add(id)); } });
    }
    // Also add fuzzy matches from searchResults
    if(searchResults.length){
      searchResults.forEach(r=>{
        if(r.isWord && r.node.morphemes){
          r.node.morphemes.forEach(m => { if(nodeMap[m.id]) set.add(m.id); });
        } else if(nodeMap[r.node.id]){
          set.add(r.node.id);
          if(adjacency[r.node.id]) adjacency[r.node.id].forEach(id=>set.add(id));
        }
      });
    }
    return set.size>0?set:null;
  }
  // Sub-category filter — only highlight morphemes in that category (no adjacency expansion)
  if(filterCats.size>0){
    const set=new Set();
    nodes.forEach(n=>{
      const cat=NODE_CAT[n.id];
      if(cat&&filterCats.has(cat)) set.add(n.id);
    });
    return set.size>0?set:null;
  }
  if(filterType!=='all'){
    const set=new Set();
    nodes.forEach(n=>{if(n.type===filterType) set.add(n.id);});
    return set;
  }
  const active=pinnedNode||hoveredNode;
  if(active){
    const set=new Set(); set.add(active.id);
    if(adjacency[active.id]) adjacency[active.id].forEach(id=>set.add(id));
    return set;
  }
  return null;
}

function applyHighlight(){
  highlightSet=computeHighlightSet();
  const dim=0.04;
  nodes.forEach((n,i)=>{
    const c=n.color, bright=!highlightSet||highlightSet.has(n.id), a=bright?1:dim;
    nodeColors[i*3]=c.r*a; nodeColors[i*3+1]=c.g*a; nodeColors[i*3+2]=c.b*a;
    glowColors[i*3]=c.r*a; glowColors[i*3+1]=c.g*a; glowColors[i*3+2]=c.b*a;
    const bs=6.5, bg=16;
    const hov=(pinnedNode&&n.id===pinnedNode.id)||(hoveredNode&&n.id===hoveredNode.id);
    nodeSizes[i]=bright?(hov?bs*2.2:bs):bs*0.3;
    glowSizes[i]=bright?(hov?bg*1.8:bg):bg*0.15;
  });
  edges.forEach((e,i)=>{
    const a=nodeMap[e.source],b=nodeMap[e.target];
    const bright=!highlightSet||(highlightSet.has(e.source)&&highlightSet.has(e.target));
    const al=bright?1:dim,i6=i*6;
    edgeColors[i6]=a.color.r*al;edgeColors[i6+1]=a.color.g*al;edgeColors[i6+2]=a.color.b*al;
    edgeColors[i6+3]=b.color.r*al;edgeColors[i6+4]=b.color.g*al;edgeColors[i6+5]=b.color.b*al;
  });
  nodeGeom.attributes.color.needsUpdate=true; nodeGeom.attributes.size.needsUpdate=true;
  glowGeom.attributes.color.needsUpdate=true; glowGeom.attributes.size.needsUpdate=true;
  edgeGeom.attributes.color.needsUpdate=true;
  edgeMesh.material.opacity=highlightSet?0.8:0.4;
}
