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
    // a word: open its card near the search box
    showWordDetail(node.label, Math.max(12, window.innerWidth/2-220), 140);
  } else {
    openMorph(node.id);
  }
}
let pinnedWordNode = null; // virtual word node for tooltip tracking

searchInput.addEventListener('input',function(){
  clearTimeout(searchDebounce);
  const val=this.value.trim();
  searchClear.style.display=val?'block':'none';
  if(!val){ searchQuery=''; searchCount.style.display='none'; searchDropdown.classList.remove('visible'); return; }
  searchDebounce=setTimeout(()=>{
    searchQuery=val;
    if(pinnedNode) unpinNode();
    searchResults=fuzzySearch(val);
    renderDropdown(searchResults);
    searchCount.textContent=searchResults.length+' 个'; searchCount.style.display='block';
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
  searchCount.style.display='none'; searchDropdown.classList.remove('visible'); searchResults=[]; searchInput.focus(); };

// ============================================================
//  FILTERS (Type pills + sub-category chips)
// ============================================================
// (type / sub-category filters now live inside the workshop shelf as tabs)
function buildSubFilters(){}

// Sound effects toggle
(function(){ const b=document.getElementById('sfx-toggle'); const paint=()=>{ b.textContent=sfxOn?'开':'关'; b.classList.toggle('on',sfxOn); }; paint(); b.onclick=()=>{ setSfx(!sfxOn); paint(); if(sfxOn) Sfx.ding(); }; })();
// Default level: 初高中 (中考 + 高考) — the audience is school-age learners
levelFilter = new Set(['z','g']);

// Exam-level filter: single select ("全部" clears). Re-renders the pinned card and the 2D map.
document.getElementById('level-select').addEventListener('change',function(){
  levelFilter = this.value ? new Set(this.value.split('')) : new Set();
  document.getElementById('m-nodes').textContent=visibleWordCount();
  if(pinnedWordNode){ showWordDetail(pinnedWordNode.label, tooltip.offsetLeft, tooltip.offsetTop, true); }
  if(searchQuery){ searchResults=fuzzySearch(searchQuery); renderDropdown(searchResults); }
  wsRefresh();
});

// ============================================================
//  STUDY PANEL
// ============================================================
function renderStudyPanel(){
  const prog=loadProgress(), favs=loadFavorites();
  const stats=document.getElementById('sp-stats');
  const pct=Math.round(prog.totalMorphemes/MORPHEMES.length*100);
  const last=lastRoot();
  stats.innerHTML=(last?'<button class="sp-resume"><span>继续上次</span><b>'+last.label+' →</b></button>':'')+
    '<div class="sp-progress-bar"><div class="sp-progress-fill" style="width:'+pct+'%"></div></div>'+
    '<div class="sp-stat"><span>研究过的词根</span><b>'+prog.totalMorphemes+' / '+MORPHEMES.length+'</b></div>'+
    '<div class="sp-stat"><span>看过的单词</span><b>'+prog.totalWords+'</b></div>'+
    '<div class="sp-stat"><span>收藏</span><b>'+favs.length+'</b></div>'+
    '<div class="sp-stat"><span>练习最高分</span><b>'+(function(){ try{ return localStorage.getItem('etym_quest_best')||'0'; }catch(e){ return '0'; } })()+' / 10</b></div>';
  const rs=stats.querySelector('.sp-resume'); if(rs) rs.onclick=()=>{ openMorph(last.id); closeStudyPanel(); };
  const favsEl=document.getElementById('sp-favs');
  favsEl.innerHTML='';
  if(!favs.length){
    favsEl.innerHTML='<div class="sp-empty">暂无收藏<br><span style="font-size:13px;margin-top:6px;display:block;color:var(--muted)">在词根页或单词面板点「收藏」</span></div>';
    return;
  }
  favs.slice().reverse().forEach(f=>{
    const isMorph=f.type==='morpheme';
    const cn=isMorph?(nodeMap[f.morphemes[0]]?nodeMap[f.morphemes[0]].meaning:''):getWordCN(f.word);
    const item=document.createElement('div'); item.className='sp-fav-item';
    const typeTag=isMorph?'<span class="sp-fav-type sp-fav-morph">词根</span>':'<span class="sp-fav-type sp-fav-word-type">单词</span>';
    item.innerHTML=typeTag+
      '<div class="sp-fav-info"><span class="sp-fav-word">'+f.word+'</span>'+(cn?'<span class="sp-fav-cn">'+cn+'</span>':'')+'</div>'+
      '<button class="sp-fav-speak" title="发音"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>'+
      '<button class="sp-fav-del" title="删除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    item.querySelector('.sp-fav-speak').onclick=(e)=>{ e.stopPropagation(); speakWord(f.word); };
    item.querySelector('.sp-fav-del').onclick=(e)=>{ e.stopPropagation(); toggleFavorite(f.word); renderStudyPanel(); };
    item.onclick=()=>{
      if(isMorph && nodeMap[f.morphemes[0]]){ openMorph(f.morphemes[0]); closeStudyPanel(); }
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
//  EVENT HANDLERS (keyboard)
// ============================================================
let appState='loading'; // loading -> intro -> active
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('study-panel').classList.contains('open')){ closeStudyPanel(); return; }
    if(searchDropdown.classList.contains('visible')){ searchDropdown.classList.remove('visible'); return; }
    if(pinnedNode||pinnedWordNode||tooltip.classList.contains('visible')){ unpinNode(); return; }
    if(ws.view!=='shelf'){ wsGo(ws.view==='wall'?'box':'shelf', ws.cat); return; }
    searchInput.value=''; searchQuery=''; searchClear.style.display='none';
    searchCount.style.display='none'; searchDropdown.classList.remove('visible'); searchResults=[];
    filterCats.clear(); filterType='all';
    wsGo('shelf'); searchInput.blur();
  }
  if(e.key==='/'&&document.activeElement!==searchInput){ e.preventDefault(); searchInput.focus(); }
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
let introStart=0;
const INTRO_DUR=2800;
const introOverlay=document.getElementById('intro-overlay');
const hint=document.getElementById('hint');

function startIntro(){
  appState='intro'; introStart=performance.now();
  document.getElementById('loading').classList.add('hide');
  setTimeout(()=>{document.getElementById('loading').style.display='none';},1000);
  animateCounter(document.getElementById('m-nodes'),visibleWordCount()||MORPHEMES.length);
  animateCounter(document.getElementById('m-clusters'),MORPHEMES.length);
  setTimeout(()=>{ appState='active'; updateStudyBadge(); },400);
}

