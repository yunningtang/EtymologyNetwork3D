// UI: search dropdown, type and category filters, study panel, pointer/keyboard/touch handlers, intro.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  SEARCH (Fuzzy + Dropdown)
// ============================================================
const searchInput=document.getElementById('search');
const searchClear=document.getElementById('search-clear');
const searchCount=document.getElementById('search-count');
const searchDropdown=document.getElementById('search-dropdown');

function renderDropdown(results){
  searchDropdown.innerHTML=''; sdActiveIdx=-1;
  if(!results.length){ searchDropdown.classList.remove('visible'); return; }
  const morphemes=results.filter(r=>!r.isWord);
  const words=results.filter(r=>r.isWord);
  if(morphemes.length){
    const sec=document.createElement('div'); sec.className='sd-section'; sec.textContent='Morphemes 词根'; searchDropdown.appendChild(sec);
    morphemes.forEach(r=>searchDropdown.appendChild(makeDropdownItem(r)));
  }
  if(words.length){
    const sec=document.createElement('div'); sec.className='sd-section'; sec.textContent='Words 单词 ('+WORD_DATA.size+' total)'; searchDropdown.appendChild(sec);
    words.slice(0,12).forEach(r=>searchDropdown.appendChild(makeDropdownItem(r)));
  }
  searchDropdown.classList.add('visible');
}

function makeDropdownItem(r){
  const n=r.node, div=document.createElement('div'); div.className='sd-item'; div.dataset.nid=n.id;
  const q=searchQuery.toLowerCase(), lbl=n.label;
  // Highlight match in label
  const idx=lbl.toLowerCase().indexOf(q);
  let hlLabel=lbl;
  if(idx>=0) hlLabel=lbl.slice(0,idx)+'<em>'+lbl.slice(idx,idx+q.length)+'</em>'+lbl.slice(idx+q.length);
  const typeStr = TYPE_LABELS[n.type]||'';
  const meaningStr = n.isVirtual ? (shortCN(n.meaning) || n.morphemes.map(m=>m.label).join(' + ')) : (n.meaning||'');
  div.innerHTML=`<span class="sd-dot" style="background:${n.colorHex}"></span><span class="sd-label">${hlLabel}</span><span class="sd-type">${typeStr}</span><span class="sd-meaning">${meaningStr}</span>`;
  div.addEventListener('click',()=>{ selectSearchResult(n); });
  div.addEventListener('mouseenter',()=>{
    document.querySelectorAll('.sd-item.active').forEach(el=>el.classList.remove('active'));
    div.classList.add('active');
  });
  return div;
}

function selectSearchResult(node){
  searchDropdown.classList.remove('visible');
  searchInput.value=node.label; searchQuery=node.label;
  searchClear.style.display='block';
  if(node.isVirtual){
    // Virtual word node — highlight its morphemes and show word tooltip
    const morphIds = node.morphemes ? node.morphemes.map(m=>m.id) : [];
    const primaryId = morphIds.find(id => nodeMap[id] && nodeMap[id].type==='r') || morphIds[0];
    if(primaryId && nodeMap[primaryId]){
      // Show word info on the primary morpheme's position
      pinnedNode = nodeMap[primaryId];
      pinnedWordNode = node; // store virtual word for tooltip
      projVec.set(pinnedNode.x,pinnedNode.y,pinnedNode.z); projVec.project(camera);
      const sx=(projVec.x+1)/2*window.innerWidth, sy=(-projVec.y+1)/2*window.innerHeight;
      showTooltip(node,sx,sy); tooltip.classList.add('pinned','visible');
      // Camera focus
      const len=Math.sqrt(pinnedNode.x**2+pinnedNode.y**2+pinnedNode.z**2);
      if(len>0.01){ camT.theta=Math.atan2(pinnedNode.x,pinnedNode.z); camT.phi=Math.acos(Math.max(-1,Math.min(1,pinnedNode.y/len))); }
      camT.dist=120; autoRotate=false; lastInteraction=Date.now();
      // Highlight morphemes of this word
      highlightSet = new Set(morphIds.filter(id=>nodeMap[id]));
      morphIds.forEach(id=>{ if(adjacency[id]) adjacency[id].forEach(aid=>highlightSet.add(aid)); });
      applyHighlight();
    }
  } else {
    pinNode(node); applyHighlight();
  }
}
let pinnedWordNode = null; // virtual word node for tooltip tracking

searchInput.addEventListener('input',function(){
  clearTimeout(searchDebounce);
  const val=this.value.trim();
  searchClear.style.display=val?'block':'none';
  if(!val){ searchQuery=''; searchCount.style.display='none'; searchDropdown.classList.remove('visible'); applyHighlight(); return; }
  searchDebounce=setTimeout(()=>{
    searchQuery=val;
    if(pinnedNode) unpinNode();
    searchResults=fuzzySearch(val);
    renderDropdown(searchResults);
    // Count for highlight set
    const hs=computeHighlightSet();
    const c=hs?[...hs].filter(id=>nodeMap[id]).length:0;
    searchCount.textContent=c+' found'; searchCount.style.display='block';
    centerOnResults();
    applyHighlight();
  },80);
});

searchInput.addEventListener('focus',()=>{
  if(searchResults.length&&searchQuery) renderDropdown(searchResults);
});
searchInput.addEventListener('keydown',e=>{
  const items=searchDropdown.querySelectorAll('.sd-item');
  if(!items.length||!searchDropdown.classList.contains('visible')) return;
  if(e.key==='ArrowDown'){ e.preventDefault(); sdActiveIdx=Math.min(sdActiveIdx+1,items.length-1); items.forEach((el,i)=>el.classList.toggle('active',i===sdActiveIdx)); items[sdActiveIdx].scrollIntoView({block:'nearest'}); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); sdActiveIdx=Math.max(sdActiveIdx-1,0); items.forEach((el,i)=>el.classList.toggle('active',i===sdActiveIdx)); items[sdActiveIdx].scrollIntoView({block:'nearest'}); }
  else if(e.key==='Enter'&&sdActiveIdx>=0){ e.preventDefault(); const nid=items[sdActiveIdx].dataset.nid; const sr=searchResults.find(r=>r.node.id===nid); if(sr) selectSearchResult(sr.node); else if(nodeMap[nid]) selectSearchResult(nodeMap[nid]); }
});

// Close dropdown on outside click
document.addEventListener('click',e=>{ if(!e.target.closest('#search-wrap')) searchDropdown.classList.remove('visible'); });

searchClear.onclick=()=>{ searchInput.value=''; searchQuery=''; searchClear.style.display='none';
  searchCount.style.display='none'; searchDropdown.classList.remove('visible'); searchResults=[]; applyHighlight(); searchInput.focus(); };

function centerOnResults(){
  if(!searchQuery) return;
  const q=searchQuery.toLowerCase();
  let cx=0,cy=0,cz=0,c=0;
  // Check if query matches a word — center on its morphemes
  const wordMorphs = WORD_DATA.get(q);
  if(wordMorphs){
    wordMorphs.forEach(mid => {
      const n = nodeMap[mid];
      if(n){ cx+=n.x;cy+=n.y;cz+=n.z;c++; }
    });
  }
  // Also check morpheme label/meaning matches
  nodes.forEach(n=>{
    if(n.label.toLowerCase().includes(q)||(n.meaning&&n.meaning.toLowerCase().includes(q))){
      cx+=n.x;cy+=n.y;cz+=n.z;c++;
    }
  });
  if(c===0) return;
  cx/=c;cy/=c;cz/=c;
  const len=Math.sqrt(cx*cx+cy*cy+cz*cz);
  if(len<0.01) return;
  camT.theta=Math.atan2(cx,cz);
  camT.phi=Math.acos(Math.max(-1,Math.min(1,cy/len)));
}

// ============================================================
//  FILTERS (Type pills + sub-category chips)
// ============================================================
const SUB_FILTER_MAP={
  p:['neg','dir','deg','num','aux'],
  r:['create','move','sense','mind','lang','nature','society'],
  s:['noun_s','adj_s','verb_s','adv_s']
};
const subFiltersEl=document.getElementById('sub-filters');

function buildSubFilters(type){
  subFiltersEl.innerHTML='';
  if(!type||type==='all'){ subFiltersEl.classList.remove('visible'); return; }
  const cats=SUB_FILTER_MAP[type]||[];
  cats.forEach(cat=>{
    const m=CAT_META[cat]; if(!m) return;
    const chip=document.createElement('button'); chip.className='sub-chip'; chip.dataset.cat=cat;
    chip.innerHTML='<span class="sc-dot" style="background:'+m.hex+'"></span>'+m.label;
    chip.onclick=()=>{
      const wasActive=filterCats.has(cat);
      filterCats.clear(); filterType='all';
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.type==='all'));
      subFiltersEl.querySelectorAll('.sub-chip').forEach(c=>c.classList.remove('active'));
      if(!wasActive){ filterCats.add(cat); chip.classList.add('active'); }
      if(pinnedNode) unpinNode(); applyHighlight();
    };
    if(filterCats.has(cat)) chip.classList.add('active');
    subFiltersEl.appendChild(chip);
  });
  subFiltersEl.classList.add('visible');
}

document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',function(){
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    this.classList.add('active'); filterType=this.dataset.type;
    filterCats.clear();
    buildSubFilters(filterType);
    if(pinnedNode) unpinNode(); applyHighlight();
  });
});

// ============================================================
//  STUDY PANEL
// ============================================================
function renderStudyPanel(){
  const prog=loadProgress(), favs=loadFavorites();
  const stats=document.getElementById('sp-stats');
  const pct=Math.round(prog.totalMorphemes/MORPHEMES.length*100);
  stats.innerHTML=
    '<div class="sp-progress-bar"><div class="sp-progress-fill" style="width:'+pct+'%"></div></div>'+
    '<div class="sp-stat"><span>词素</span><b>'+prog.totalMorphemes+' / '+MORPHEMES.length+'</b></div>'+
    '<div class="sp-stat"><span>单词</span><b>'+prog.totalWords+'</b></div>'+
    '<div class="sp-stat"><span>收藏</span><b>'+favs.length+'</b></div>';
  const favsEl=document.getElementById('sp-favs');
  favsEl.innerHTML='';
  if(!favs.length){
    favsEl.innerHTML='<div class="sp-empty">暂无收藏<br><span style="font-size:10px;margin-top:6px;display:block;color:var(--muted)">点击词素或单词详情中的 ♥ 收藏</span></div>';
    return;
  }
  favs.slice().reverse().forEach(f=>{
    const isMorph=f.type==='morpheme';
    const cn=isMorph?(nodeMap[f.morphemes[0]]?nodeMap[f.morphemes[0]].meaning:''):getWordCN(f.word);
    const item=document.createElement('div'); item.className='sp-fav-item';
    const typeTag=isMorph?'<span class="sp-fav-type sp-fav-morph">词素</span>':'<span class="sp-fav-type sp-fav-word-type">单词</span>';
    item.innerHTML=typeTag+
      '<div class="sp-fav-info"><span class="sp-fav-word">'+f.word+'</span>'+(cn?'<span class="sp-fav-cn">'+cn+'</span>':'')+'</div>'+
      '<button class="sp-fav-speak" title="发音"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>'+
      '<button class="sp-fav-del" title="删除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    item.querySelector('.sp-fav-speak').onclick=(e)=>{ e.stopPropagation(); speakWord(f.word); };
    item.querySelector('.sp-fav-del').onclick=(e)=>{ e.stopPropagation(); toggleFavorite(f.word); renderStudyPanel(); };
    item.onclick=()=>{
      if(isMorph && nodeMap[f.morphemes[0]]){ pinNode(nodeMap[f.morphemes[0]]); closeStudyPanel(); }
      else { searchInput.value=f.word; searchInput.dispatchEvent(new Event('input')); closeStudyPanel(); }
    };
    favsEl.appendChild(item);
  });
}

function openStudyPanel(){ document.getElementById('study-panel').classList.add('open'); renderStudyPanel(); }
function closeStudyPanel(){ document.getElementById('study-panel').classList.remove('open'); }

document.getElementById('study-toggle').onclick=()=>{
  const panel=document.getElementById('study-panel');
  if(panel.classList.contains('open')) closeStudyPanel(); else openStudyPanel();
};
document.getElementById('sp-close').onclick=closeStudyPanel;

// ============================================================
//  EVENT HANDLERS
// ============================================================
let isDragging=false, prevMouse={x:0,y:0};

function markInteraction(){ lastInteraction=Date.now(); autoRotate=false; }

// Hover work is gated to one rAF: mousemove (100+ Hz) just records coords;
// the actual O(N) projection + GPU buffer rewrite runs at most once per frame.
let _hoverPending=false;
function scheduleHoverCheck(){
  if(_hoverPending) return;
  _hoverPending=true;
  requestAnimationFrame(()=>{
    _hoverPending=false;
    if(currentView!=='3d') return;
    if(isDragging||pinnedNode) return;
    const found=findHoveredNode();
    if(found!==hoveredNode){
      clearTimeout(tooltipHideTimer);
      if(found){
        hoveredNode=found; applyHighlight(); showTooltip(found,mouse.x,mouse.y);
        document.body.style.cursor='pointer';
      } else {
        scheduleHide(); document.body.style.cursor='default';
      }
    } else if(hoveredNode){ positionTooltip(mouse.x,mouse.y); }
  });
}

window.addEventListener('mousemove',e=>{
  mouse.x=e.clientX; mouse.y=e.clientY;
  if(currentView!=='3d') return;
  if(isDragging){
    camT.theta+=(e.clientX-prevMouse.x)*0.005;
    camT.phi-=(e.clientY-prevMouse.y)*0.005;
    camT.phi=Math.max(0.1,Math.min(Math.PI-0.1,camT.phi));
    prevMouse.x=e.clientX; prevMouse.y=e.clientY; markInteraction(); return;
  }
  if(pinnedNode){
    // Update pinned tooltip position
    projVec.set(pinnedNode.x,pinnedNode.y,pinnedNode.z); projVec.project(camera);
    const sx=(projVec.x+1)/2*window.innerWidth, sy=(-projVec.y+1)/2*window.innerHeight;
    positionTooltip(sx,sy); return;
  }
  scheduleHoverCheck();
});

window.addEventListener('mousedown',e=>{
  if(currentView!=='3d') return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='BUTTON'||e.target.closest('#tooltip')||e.target.closest('#study-panel')||e.target.closest('#search-dropdown')) return;
  isDragging=true; prevMouse.x=e.clientX; prevMouse.y=e.clientY;
});

window.addEventListener('mouseup',e=>{
  if(!isDragging) return;
  isDragging=false;
});

// Click handler (separate from drag)
let mouseDownPos={x:0,y:0};
window.addEventListener('mousedown',e=>{mouseDownPos.x=e.clientX;mouseDownPos.y=e.clientY;},{capture:true});
window.addEventListener('click',e=>{
  if(currentView!=='3d') return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='BUTTON'||e.target.closest('#tooltip')||e.target.closest('#study-panel')||e.target.closest('#search-dropdown')) return;
  const dx=e.clientX-mouseDownPos.x,dy=e.clientY-mouseDownPos.y;
  if(Math.sqrt(dx*dx+dy*dy)>5) return;
  mouse.x=e.clientX; mouse.y=e.clientY;
  const found=findHoveredNode();
  if(found){ pinNode(found); }
  else if(pinnedNode){ unpinNode(); }
});

window.addEventListener('wheel',e=>{
  // Let tooltip, study panel, and search dropdown scroll naturally
  const t=e.target;
  if(currentView!=='3d') return;
  if(t.closest('#tooltip')||t.closest('#study-panel')||t.closest('#search-dropdown')) return;
  camT.dist+=e.deltaY*0.15;
  camT.dist=Math.max(50,Math.min(400,camT.dist));
  markInteraction(); e.preventDefault();
},{passive:false});

// Touch support
let touchStart={x:0,y:0,time:0,isDrag:false};
let touchStartDist=0;

window.addEventListener('touchstart',e=>{
  if(e.touches.length===1){
    touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY,time:Date.now(),isDrag:false};
    prevMouse.x=e.touches[0].clientX; prevMouse.y=e.touches[0].clientY;
  } else if(e.touches.length===2){
    const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    touchStartDist=Math.sqrt(dx*dx+dy*dy);
  }
  markInteraction();
},{passive:true});

window.addEventListener('touchmove',e=>{
  e.preventDefault();
  if(e.touches.length===1){
    touchStart.isDrag=true;
    const dx=e.touches[0].clientX-prevMouse.x, dy=e.touches[0].clientY-prevMouse.y;
    camT.theta+=dx*0.005; camT.phi-=dy*0.005;
    camT.phi=Math.max(0.1,Math.min(Math.PI-0.1,camT.phi));
    prevMouse.x=e.touches[0].clientX; prevMouse.y=e.touches[0].clientY;
  } else if(e.touches.length===2){
    const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    const d=Math.sqrt(dx*dx+dy*dy);
    camT.dist*=touchStartDist/d; camT.dist=Math.max(50,Math.min(400,camT.dist));
    touchStartDist=d;
  }
},{passive:false});

window.addEventListener('touchend',e=>{
  const dt=Date.now()-touchStart.time;
  if(!touchStart.isDrag&&dt<300&&e.changedTouches.length===1){
    // TAP! Treat as click
    mouse.x=touchStart.x; mouse.y=touchStart.y;
    const found=findHoveredNode();
    if(found){ pinNode(found); }
    else if(pinnedNode){ unpinNode(); }
  }
});

// Keyboard
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('study-panel').classList.contains('open')){ closeStudyPanel(); return; }
    if(searchDropdown.classList.contains('visible')){ searchDropdown.classList.remove('visible'); return; }
    searchInput.value=''; searchQuery=''; searchClear.style.display='none';
    searchCount.style.display='none'; searchDropdown.classList.remove('visible'); searchResults=[];
    filterCats.clear(); filterType='all'; buildSubFilters('all');
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.type==='all'));
    if(pinnedNode)unpinNode(); applyHighlight(); searchInput.blur();
  }
  if(e.key==='/'&&document.activeElement!==searchInput){ e.preventDefault(); searchInput.focus(); }
});

// Resize
window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight); resizeLabels();
});

// ============================================================
//  STATS ANIMATION
// ============================================================
function animateCounter(el,target){
  const dur=1800, start=performance.now();
  (function step(now){
    const t=Math.min((now-start)/dur,1), eased=1-Math.pow(1-t,3);
    el.textContent=Math.floor(eased*target);
    if(t<1) requestAnimationFrame(step);
  })(performance.now());
}

// ============================================================
//  INTRO SEQUENCE
// ============================================================
let appState='loading'; // loading -> intro -> active
let introStart=0;
const INTRO_DUR=2800;
const introOverlay=document.getElementById('intro-overlay');
const hint=document.getElementById('hint');
const instructions=document.getElementById('instructions');

function startIntro(){
  appState='intro'; introStart=performance.now();
  cam.dist=500; camT.dist=200;
  document.getElementById('loading').classList.add('hide');
  setTimeout(()=>{document.getElementById('loading').style.display='none';},1000);
  // Start stats animation
  animateCounter(document.getElementById('m-nodes'),WORD_DATA.size||MORPHEMES.length);
  animateCounter(document.getElementById('m-edges'),edges.length);
  animateCounter(document.getElementById('m-clusters'),MORPHEMES.length);
}

function updateIntro(){
  if(appState!=='intro') return;
  const elapsed=performance.now()-introStart;
  const p=Math.min(elapsed/INTRO_DUR,1);
  // Tagline fade: in 0-0.3, visible 0.3-0.7, out 0.7-1.0
  let op=0;
  if(p<0.25) op=p/0.25;
  else if(p<0.65) op=1;
  else op=Math.max(0,(1-p)/0.35);
  introOverlay.style.opacity=op;
  if(p>=1){
    appState='active'; introOverlay.style.display='none';
    setTimeout(()=>{hint.classList.add('visible');},300);
    setTimeout(()=>{instructions.classList.add('visible');updateStudyBadge();},800);
    setTimeout(()=>{hint.classList.remove('visible');},8000);
  }
}
