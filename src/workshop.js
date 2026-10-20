// 积木工坊 — the main view. Three levels, all concrete:
//   shelf  : 16 boxes (semantic categories) on a shelf
//   box    : the bricks (morphemes) inside one box
//   wall   : one brick and the "wall" of words built with it — every word is a row of bricks
// Classic script: shares the global scope with the other files in src/.

const ws={view:'shelf',cat:null,morph:null,wallLimit:30};
const wsEl=document.getElementById('workshop');
const BOX_ORDER=['neg','dir','deg','num','aux','create','move','sense','mind','lang','nature','society','noun_s','adj_s','verb_s','adv_s'];
const BOX_TYPE={neg:'p',dir:'p',deg:'p',num:'p',aux:'p',create:'r',move:'r',sense:'r',mind:'r',lang:'r',nature:'r',society:'r',noun_s:'s',adj_s:'s',verb_s:'s',adv_s:'s'};
const TYPE_ZH={p:'前缀',r:'词根',s:'后缀'};
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function catZh(cat){ const l=(CAT_META[cat]||{}).label||cat; const m=l.match(/[一-鿿].*$/); return m?m[0]:l; }
function catEn(cat){ const l=(CAT_META[cat]||{}).label||cat; return l.replace(/[一-鿿].*$/,'').trim(); }
function bricksIn(cat){ return nodes.filter(n=>NODE_CAT[n.id]===cat); }
function visibleWordsOf(n){ return (n.wordList||[]).filter(w=>wordVisible(w.en)); }

function wsRender(){
  if(ws.view==='shelf') renderShelf(); else if(ws.view==='box') renderBox(ws.cat); else renderWall(ws.morph);
  wsEl.scrollTop=0;
}
function wsGo(view,arg){
  if(view==='shelf'){ ws.view='shelf'; ws.cat=null; ws.morph=null; }
  else if(view==='box'){ ws.view='box'; ws.cat=arg; ws.morph=null; }
  else { ws.view='wall'; ws.morph=arg; ws.cat=NODE_CAT[arg]||ws.cat; ws.wallLimit=30; }
  if(pinnedNode||pinnedWordNode) unpinNode();
  wsRender(); Sfx.pop();
}
function crumbs(parts){
  return '<div class="ws-crumbs">'+parts.map((p,i)=>'<button class="ws-crumb'+(i===parts.length-1?' cur':'')+'" data-i="'+i+'">'+p.label+'</button>').join('<span class="ws-sep">›</span>')+'</div>';
}
function bindCrumbs(parts){ wsEl.querySelectorAll('.ws-crumb').forEach(b=>{ const p=parts[+b.dataset.i]; if(p.go) b.onclick=p.go; }); }

// ---------- shelf ----------
function renderShelf(){
  const cats=BOX_ORDER.filter(cat=>{
    if(filterCats.size && !filterCats.has(cat)) return false;
    if(filterType!=='all' && BOX_TYPE[cat]!==filterType) return false;
    return true;
  });
  let html='<div class="ws-head"><h2>积木工坊</h2><p>每个英语单词都是用积木拼出来的。打开一个盒子，看看里面的积木能拼出什么词。</p></div>';
  const groups=[['p','前缀 · 放在左边，改变方向或意思'],['r','词根 · 放在中间，决定核心含义'],['s','后缀 · 放在右边，决定词性']];
  groups.forEach(([type,title])=>{
    const list=cats.filter(c=>BOX_TYPE[c]===type); if(!list.length) return;
    html+='<div class="ws-group"><div class="ws-group-title"><span class="ws-dot ws-dot-'+type+'"></span>'+title+'</div><div class="ws-shelf">';
    list.forEach(cat=>{
      const items=bricksIn(cat); const wc=items.reduce((a,n)=>a+visibleWordsOf(n).length,0);
      const sample=items.slice().sort((a,b)=>b.wordCount-a.wordCount).slice(0,3);
      html+='<button class="ws-box ws-box-'+type+'" data-cat="'+cat+'" style="--cc:'+(CAT_META[cat]||{}).hex+'">'+
        '<div class="ws-box-lid"><span class="ws-box-icon">'+boxSprite(cat,44)+'</span><span class="ws-box-name">'+esc(catZh(cat))+'</span><span class="ws-box-en">'+esc(catEn(cat))+'</span></div>'+
        '<div class="ws-box-peek">'+sample.map(n=>'<span class="brick mini brick-'+n.type+'" style="--bc:'+BRICK_COLOR[n.type]+';--bd:'+BRICK_DARK[n.type]+'"><span class="brick-label">'+esc(n.label)+'</span></span>').join('')+'</div>'+
        '<div class="ws-box-meta">'+items.length+' 块积木 · '+wc+' 个词</div></button>';
    });
    html+='</div></div>';
  });
  if(!cats.length) html+='<div class="ws-empty">这个筛选下没有盒子，换一个试试</div>';
  wsEl.innerHTML=html;
  wsEl.querySelectorAll('.ws-box').forEach(b=>b.onclick=()=>wsGo('box',b.dataset.cat));
}

// ---------- box ----------
function renderBox(cat){
  const items=bricksIn(cat).sort((a,b)=>visibleWordsOf(b).length-visibleWordsOf(a).length);
  const type=BOX_TYPE[cat];
  const parts=[{label:'工坊',go:()=>wsGo('shelf')},{label:catZh(cat)}];
  let html=crumbs(parts)+'<div class="ws-head"><h2>'+boxSprite(cat,40)+' '+esc(catZh(cat))+'<small>'+esc(catEn(cat))+' · '+TYPE_ZH[type]+'</small></h2><p>'+(type==='p'?'这些积木放在单词左边。':type==='r'?'这些积木是单词的核心，放在中间。':'这些积木放在单词右边，决定它是名词、形容词还是动词。')+' 点一块积木，看它能拼出哪些词。</p></div><div class="ws-bricks">';
  items.forEach(n=>{
    const wc=visibleWordsOf(n).length; const zh=(n.meaning||'').match(/[一-鿿].*$/);
    html+='<button class="ws-brick-tile'+(wc?'':' dim')+'" data-id="'+n.id+'"><span class="ws-tile-icon">'+morphSprite(n.id,56)+'</span>'+
      '<span class="brick brick-'+n.type+'" style="--bc:'+BRICK_COLOR[n.type]+';--bd:'+BRICK_DARK[n.type]+'"><span class="brick-studs"><i></i><i></i><i></i></span><span class="brick-label">'+esc(n.label)+'</span></span>'+
      '<span class="ws-tile-meaning">'+esc(zh?zh[0]:n.meaning)+'</span><span class="ws-tile-count">'+(wc?wc+' 个词':'这个等级没有词')+'</span>'+
      (isFavorite(n.id)?'<span class="ws-tile-fav">❤️</span>':'')+(_progCache&&_progCache.morphemes[n.id]?'<span class="ws-tile-done">✓</span>':'')+'</button>';
  });
  html+='</div>';
  wsEl.innerHTML=html; bindCrumbs(parts);
  wsEl.querySelectorAll('.ws-brick-tile').forEach(b=>b.onclick=()=>wsGo('wall',b.dataset.id));
}

// ---------- wall ----------
function wallRow(w){
  const ids=(WORD_DATA.get(w)||[]).filter(id=>nodeMap[id]);
  return '<button class="ws-row" data-w="'+esc(w)+'"><span class="ws-row-bricks">'+ids.map(id=>{ const n=nodeMap[id]; return '<span class="brick mini brick-'+n.type+(id===ws.morph?' me':'')+'" style="--bc:'+BRICK_COLOR[n.type]+';--bd:'+BRICK_DARK[n.type]+'"><span class="brick-label">'+esc(n.label)+'</span></span>'; }).join('')+'</span>'+
    '<span class="ws-row-word">'+esc(w)+'</span><span class="ws-row-cn">'+esc(shortCN(WORD_CN[w]||''))+'</span>'+(_progCache&&_progCache.words[w]?'<span class="ws-row-done">✓</span>':'')+'</button>';
}
function renderWall(id){
  const n=nodeMap[id]; if(!n){ wsGo('shelf'); return; }
  const cat=NODE_CAT[id]; const words=visibleWordsOf(n).map(w=>w.en);
  const parts=[{label:'工坊',go:()=>wsGo('shelf')},{label:catZh(cat),go:()=>wsGo('box',cat)},{label:n.label}];
  const img=(window.MORPH_IMAGES||{})[id];
  const fav=isFavorite(id);
  let html=crumbs(parts)+'<div class="ws-wall-head">'+
    '<div class="ws-wall-brick"><span class="ws-wall-icon">'+morphSprite(id,96)+'</span>'+
      '<span class="brick brick-'+n.type+' in big" style="--bc:'+BRICK_COLOR[n.type]+';--bd:'+BRICK_DARK[n.type]+'"><span class="brick-studs"><i></i><i></i><i></i><i></i></span><span class="brick-label">'+esc(n.label)+'</span></span></div>'+
    '<div class="ws-wall-info"><div class="ws-wall-title"><span class="ws-wall-type ws-type-'+n.type+'">'+TYPE_ZH[n.type]+'</span><h2>'+esc(n.label)+'</h2>'+
      '<button class="ws-fav'+(fav?' on':'')+'" title="收藏">'+(fav?'❤️':'🤍')+'</button></div>'+
      '<div class="ws-wall-meaning">'+esc(n.meaning||'')+'</div>'+
      (n.origin?'<div class="ws-wall-origin">来自 '+esc(n.origin)+'</div>':'')+
      (n.story?'<div class="ws-wall-story"><b>故事</b>'+esc(n.story)+'</div>':'')+
      (img&&img.file?'<div class="ws-wall-img"><img loading="lazy" alt="" src="assets/morphemes/'+esc(img.file)+'"><a class="ws-credit" href="'+esc(img.url||'#')+'" target="_blank" rel="noopener">'+esc((img.author||'Wikimedia Commons')+' · '+(img.license||''))+'</a></div>':'')+
    '</div></div>';
  html+='<div class="ws-wall-title2">🧱 用这块积木拼出来的词 <span>'+words.length+' 个'+(levelFilter.size?' · 当前等级':'')+'</span></div>';
  if(!words.length) html+='<div class="ws-empty">这个等级下没有用它拼的词，换个等级看看</div>';
  html+='<div class="ws-wall">'+words.slice(0,ws.wallLimit).map(wallRow).join('')+'</div>';
  if(words.length>ws.wallLimit) html+='<button class="ws-more">再砌 '+Math.min(30,words.length-ws.wallLimit)+' 行 ▾</button>';
  wsEl.innerHTML=html; bindCrumbs(parts);
  trackExplore('morpheme',id);
  wsEl.querySelectorAll('.ws-row').forEach(r=>r.onclick=(e)=>{ const rect=r.getBoundingClientRect(); showWordDetail(r.dataset.w, Math.min(rect.right+8, window.innerWidth-440), rect.top); Sfx.click(); });
  const more=wsEl.querySelector('.ws-more'); if(more) more.onclick=()=>{ ws.wallLimit+=30; const top=wsEl.scrollTop; renderWall(id); wsEl.scrollTop=top; };
  const favBtn=wsEl.querySelector('.ws-fav'); favBtn.onclick=()=>{ toggleFavorite(id,[id],'morpheme'); const on=isFavorite(id); favBtn.classList.toggle('on',on); favBtn.textContent=on?'❤️':'🤍'; updateStudyBadge(); if(on){ toast('❤️ 收藏了 '+n.label); Sfx.ding(); } };
  // the wall rows "build" one after another
  wsEl.querySelectorAll('.ws-row').forEach((r,i)=>{ r.style.animationDelay=Math.min(i*40,600)+'ms'; });
}

// entry points used elsewhere
function openMorph(id){ wsGo('wall',id); }
function wsRefresh(){ wsRender(); }
