// The atlas — three views, organised like a textbook rather than a dashboard:
//   home     : masthead copy, "认识构词" chapter (three numbered sections), today's root,
//              and the numbered index of all 16 categories
//   category : numbered list of the morphemes in one category
//   root     : root study page — origin, story, a "prefix + root → meaning" table,
//              then every word built with the root, each shown as its segments
// ws.view keeps the old names (shelf / box / wall) so other modules need no change.
// Classic script: shares the global scope with the other files in src/.

const ws={view:'shelf',cat:null,morph:null,wallLimit:40};
const wsEl=document.getElementById('workshop');
const BOX_ORDER=['neg','dir','deg','num','aux','create','move','sense','mind','lang','nature','society','noun_s','adj_s','verb_s','adv_s'];
const BOX_TYPE={neg:'p',dir:'p',deg:'p',num:'p',aux:'p',create:'r',move:'r',sense:'r',mind:'r',lang:'r',nature:'r',society:'r',noun_s:'s',adj_s:'s',verb_s:'s',adv_s:'s'};
const TYPE_ZH={p:'前缀',r:'词根',s:'后缀'};
const TYPE_EN={p:'Prefix',r:'Root',s:'Suffix'};
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad2=(n)=>String(n).padStart(2,'0');
function catZh(cat){ const l=(CAT_META[cat]||{}).label||cat; const m=l.match(/[一-鿿].*$/); return m?m[0]:l; }
function catEn(cat){ const l=(CAT_META[cat]||{}).label||cat; return l.replace(/[一-鿿].*$/,'').trim(); }
function morphsIn(cat){ return nodes.filter(n=>NODE_CAT[n.id]===cat); }
function visibleWordsOf(n){ return (n.wordList||[]).filter(w=>wordVisible(w.en)); }
function zh(s){ const m=(s||'').match(/[一-鿿…].*$/); return m?m[0]:(s||''); }
function en(s){ return (s||'').replace(/[一-鿿…].*$/,'').trim(); }
const LANG_ZH={'Latin':'拉丁语','Greek':'希腊语','Old English':'古英语','French':'法语','Old French':'古法语','Germanic':'日耳曼语','Middle English':'中古英语','Italian':'意大利语','Arabic':'阿拉伯语','Sanskrit':'梵语','Anglo-Saxon':'古英语'};
function originLang(n){ const m=(n.origin||'').match(/^([A-Za-z ]+?):/); return m?m[1].trim():''; }
function originLangZh(n){ const l=originLang(n); return LANG_ZH[l]||l; }
function originWord(n){ const m=(n.origin||'').match(/:\s*(.+)$/); return m?m[1].trim():(n.origin||''); }

function wsRender(){
  if(ws.view==='shelf') renderHome(); else if(ws.view==='box') renderCategory(ws.cat); else renderRoot(ws.morph);
  wsEl.scrollTop=0;
}
function wsGo(view,arg){
  if(view==='shelf'){ ws.view='shelf'; ws.cat=null; ws.morph=null; }
  else if(view==='box'){ ws.view='box'; ws.cat=arg; ws.morph=null; }
  else { ws.view='wall'; ws.morph=arg; ws.cat=NODE_CAT[arg]||ws.cat; ws.wallLimit=40; }
  if(pinnedNode||pinnedWordNode) unpinNode();
  wsRender();
  if(typeof syncHash==='function') syncHash();
}
function crumbs(parts){
  return '<nav class="crumbs">'+parts.map((p,i)=>'<button class="crumb'+(i===parts.length-1?' cur':'')+'" data-i="'+i+'">'+p.label+'</button>').join('<span class="crumb-sep">/</span>')+'</nav>';
}
function bindCrumbs(parts){ wsEl.querySelectorAll('.crumb').forEach(b=>{ const p=parts[+b.dataset.i]; if(p.go) b.onclick=p.go; }); }
// a word shown as its segments: in·port·ant with each piece coloured by type (subtle)
function segments(w,emphasis){
  const ids=(WORD_DATA.get(w)||[]).filter(id=>nodeMap[id]);
  if(!ids.length) return '<span class="seg seg-plain">'+esc(w)+'</span>';
  return ids.map(id=>{ const n=nodeMap[id]; return '<span class="seg seg-'+n.type+(id===emphasis?' seg-em':'')+'" title="'+esc(n.meaning)+'">'+esc(n.label.replace(/^-|-$/g,'').split('/')[0])+'</span>'; }).join('<span class="seg-dot">·</span>');
}
// today's root: deterministic per day among roots with enough words
function todaysRoot(){
  const roots=nodes.filter(n=>n.type==='r'&&visibleWordsOf(n).length>=6);
  if(!roots.length) return null;
  const day=Math.floor(Date.now()/86400000);
  return roots[day%roots.length];
}

// ---------- home ----------
function renderHome(){
  const tr=todaysRoot(); const last=typeof lastRoot==='function'?lastRoot():null;
  const byType={p:[],r:[],s:[]}; BOX_ORDER.forEach(c=>byType[BOX_TYPE[c]].push(c));
  const sample=(type)=>nodes.filter(n=>n.type===type).sort((a,b)=>b.wordCount-a.wordCount).slice(0,3).map(n=>n.label).join(' · ');
  let html=`
  <section class="hero">
    <h1>从一个词根，<br>理解一组词。</h1>
    <p class="lede">英语单词由前缀、词根和后缀拼合而成。记住 200 多个常用的部件，就能看懂成千上万个词。这本图谱带你从一个部件出发，看它如何长出一整组词，以及这些词之间的联系。</p>
    <div class="hero-actions">${tr?'<button class="btn-primary" id="hero-start">从今日词根开始 · '+esc(tr.label)+'</button>':''}${last&&(!tr||last.id!==tr.id)?'<button class="btn-ghost" id="hero-resume">继续上次 · '+esc(last.label)+'</button>':''}<button class="btn-ghost" id="hero-index">浏览目录</button></div>
  </section>
  <section class="chapter">
    <div class="chapter-head"><span class="kicker">第一章</span><h2>认识构词</h2></div>
    <div class="cols-3">
      <article class="col"><div class="num">01 · Prefix</div><h3>前缀</h3><p>放在词的开头，改变方向、数量或态度。</p><div class="ex">${esc(sample('p'))}</div></article>
      <article class="col"><div class="num">02 · Root</div><h3>词根</h3><p>词的核心意义所在，多来自拉丁语和希腊语。</p><div class="ex">${esc(sample('r'))}</div></article>
      <article class="col"><div class="num">03 · Suffix</div><h3>后缀</h3><p>放在词的末尾，决定它是名词、形容词还是动词。</p><div class="ex">${esc(sample('s'))}</div></article>
    </div>
  </section>`;
  if(tr){
    const words=visibleWordsOf(tr).slice(0,6);
    html+=`
  <section class="today">
    <div class="today-side"><div class="kicker">今日词根</div><div class="today-root serif">${esc(tr.label)}</div><div class="today-origin">${esc(originLangZh(tr))}${originWord(tr)?' · '+esc(originWord(tr)):''} · ${esc(en(tr.meaning))}</div><div class="today-zh">${esc(zh(tr.meaning))}</div><button class="link-btn" id="today-open">研究这个词根 →</button></div>
    <ul class="today-words">${words.map(w=>'<li><button class="word-link" data-w="'+esc(w.en)+'"><span class="serif">'+esc(w.en)+'</span><span class="gloss">'+esc(shortCN(w.cn))+'</span></button></li>').join('')}</ul>
  </section>`;
  }
  html+=`<section class="chapter"><div class="chapter-head"><span class="kicker">第二章</span><h2>词根目录</h2><p class="chapter-note">按意义分成 16 组。每组列出它包含的部件，点进去逐个研究。</p></div>`;
  [['p','前缀','Prefixes'],['r','词根','Roots'],['s','后缀','Suffixes']].forEach(([type,t,e],gi)=>{
    html+=`<div class="index-group"><h3 class="index-title"><span class="num">${pad2(gi+1)}</span>${t}<span class="en">${e}</span></h3><ol class="index">`;
    byType[type].forEach((cat,i)=>{
      const items=morphsIn(cat); const wc=items.reduce((a,n)=>a+visibleWordsOf(n).length,0);
      const top=items.slice().sort((a,b)=>b.wordCount-a.wordCount).slice(0,4).map(n=>n.label).join(' · ');
      html+=`<li><button class="index-row" data-cat="${cat}"><span class="idx">${pad2(gi+1)}.${i+1}</span><span class="idx-name">${esc(catZh(cat))}<span class="en">${esc(catEn(cat))}</span></span><span class="idx-ex">${esc(top)}</span><span class="idx-count">${items.length} 个部件 · ${wc} 词</span></button></li>`;
    });
    html+='</ol></div>';
  });
  html+='</section>';
  wsEl.innerHTML=html;
  wsEl.querySelectorAll('.index-row').forEach(b=>b.onclick=()=>wsGo('box',b.dataset.cat));
  const t=wsEl.querySelector('#today-open'); if(t) t.onclick=()=>wsGo('wall',tr.id);
  const hs=wsEl.querySelector('#hero-start'); if(hs) hs.onclick=()=>wsGo('wall',tr.id);
  const hr=wsEl.querySelector('#hero-resume'); if(hr) hr.onclick=()=>wsGo('wall',last.id);
  const hi=wsEl.querySelector('#hero-index'); if(hi) hi.onclick=()=>{ const el=wsEl.querySelectorAll('.chapter')[1]; if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); };
  wsEl.querySelectorAll('.word-link').forEach(b=>b.onclick=(e)=>showWordDetail(b.dataset.w, e.clientX, e.clientY));
}

// ---------- category ----------
function renderCategory(cat){
  const items=morphsIn(cat).sort((a,b)=>visibleWordsOf(b).length-visibleWordsOf(a).length);
  const type=BOX_TYPE[cat]; const gi=['p','r','s'].indexOf(type)+1; const ci=BOX_ORDER.filter(c=>BOX_TYPE[c]===type).indexOf(cat)+1;
  const parts=[{label:'目录',go:()=>wsGo('shelf')},{label:catZh(cat)}];
  const intro={p:'这些前缀放在词的开头。',r:'这些词根是词的核心，大多来自拉丁语和希腊语。',s:'这些后缀放在词的末尾，决定词性。'}[type];
  let html=crumbs(parts)+`<header class="page-head"><div class="kicker">第二章 · ${pad2(gi)}.${ci} · ${esc(catEn(cat))}</div><h1>${esc(catZh(cat))}</h1><p class="lede">${intro} 下面按能拼出的词数排列，点一个部件进入它的研究页。</p></header><ol class="mlist">`;
  items.forEach((n,i)=>{
    const vw=visibleWordsOf(n); const sample=vw.slice(0,3).map(w=>w.en).join(', ');
    html+=`<li><button class="mrow${vw.length?'':' dim'}" data-id="${n.id}"><span class="idx">${pad2(i+1)}</span><span class="mrow-main"><span class="serif mrow-label">${esc(n.label)}</span><span class="mrow-meaning">${esc(n.meaning)}</span></span><span class="mrow-origin">${esc(n.origin||'')}</span><span class="mrow-sample">${esc(sample)}</span><span class="mrow-count">${vw.length?vw.length+' 词':'本词表无词'}</span></button></li>`;
  });
  html+='</ol>';
  wsEl.innerHTML=html; bindCrumbs(parts);
  wsEl.querySelectorAll('.mrow').forEach(b=>b.onclick=()=>wsGo('wall',b.dataset.id));
}

// ---------- root study ----------
// one example word per prefix for the table "prefix + root → meaning"
function prefixTable(n){
  const rows=[], seen=new Set();
  for(const w of visibleWordsOf(n).map(x=>x.en)){
    const ids=(WORD_DATA.get(w)||[]).filter(id=>nodeMap[id]);
    const pre=ids.find(id=>nodeMap[id].type==='p'&&id!==n.id)||'';
    if(seen.has(pre)) continue; seen.add(pre);
    rows.push({w,pre,ids}); if(rows.length>=7) break;
  }
  return rows;
}
function renderRoot(id){
  const n=nodeMap[id]; if(!n){ wsGo('shelf'); return; }
  const cat=NODE_CAT[id]; const words=visibleWordsOf(n).map(w=>w.en);
  const all=nodes.filter(x=>x.type===n.type); const num=pad2(all.indexOf(n)+1).padStart(3,'0');
  const parts=[{label:'目录',go:()=>wsGo('shelf')},{label:catZh(cat),go:()=>wsGo('box',cat)},{label:n.label}];
  const img=(window.MORPH_IMAGES||{})[id]; const fav=isFavorite(id);
  const lang=originLang(n), ow=originWord(n);
  let html=crumbs(parts)+`
  <header class="root-head">
    <div class="kicker">${TYPE_ZH[n.type]} ${num}${lang?' · '+esc(originLangZh(n)):''}</div>
    <div class="root-title-row"><h1 class="serif">${esc(n.label)}</h1><button class="fav-btn${fav?' on':''}" title="收藏">${fav?'已收藏':'收藏'}</button></div>
    <p class="root-origin">${ow?'源自'+(lang?esc(originLangZh(n)):'')+'的 <i>'+esc(ow)+'</i>，':''}意思是「${esc(zh(n.meaning))}」${en(n.meaning)?'（'+esc(en(n.meaning))+'）':''}。</p>
    ${n.story?'<p class="root-story">'+esc(n.story)+'</p>':''}
    ${img&&img.file?'<figure class="root-fig"><img loading="lazy" alt="" src="assets/morphemes/'+esc(img.file)+'"><figcaption><a href="'+esc(img.url||'#')+'" target="_blank" rel="noopener">'+esc((img.author||'Wikimedia Commons')+' · '+(img.license||''))+'</a></figcaption></figure>':''}
  </header>`;
  const tbl=prefixTable(n);
  if(tbl.length>1){
    html+=`<section class="study"><div class="kicker">观察</div><h2>${n.type==='r'?'前缀如何改变同一个词根的含义':n.type==='p'?'同一个前缀接上不同词根':'同一个后缀接在不同的词根上'}</h2><p class="howto">先看左边的拆解和中间的字面义，猜一猜右边是哪个词、什么意思，再对照。</p><table class="ptable"><tbody>`;
    tbl.forEach(r=>{
      const pn=r.pre?nodeMap[r.pre]:null;
      const literal=r.ids.map(x=>zh(nodeMap[x].meaning).split('/')[0]).join(' + ');
      html+=`<tr class="prow" data-w="${esc(r.w)}"><td class="pt-form">${segments(r.w,id)}</td><td class="pt-literal">${esc(literal)}</td><td class="pt-arrow">→</td><td class="pt-word"><span class="serif">${esc(r.w)}</span> <span class="gloss">${esc(shortCN(WORD_CN[r.w]||''))}</span></td></tr>`;
    });
    html+='</tbody></table></section>';
  }
  html+=`<section class="study"><div class="kicker">词表</div><h2>用 ${esc(n.label)} 构成的词<span class="count">${words.length} 个${levelFilter.size?' · 当前词表':''}</span></h2><p class="howto">点开一个词：先根据拆解猜含义，再看词典释义和词源解释。</p>`;
  const total=(n.wordList||[]).length; const lvName=(function(){ const s=document.getElementById('level-select'); return s&&s.selectedOptions[0]?s.selectedOptions[0].textContent:''; })();
  if(!words.length) html+='<p class="empty">当前词库「'+esc(lvName)+'」里没有用它构成的词。<button class="lv-all">查看全部词库</button></p>';
  else if(levelFilter.size&&total>words.length) html+='<p class="lv-note">当前只显示「'+esc(lvName)+'」词库里的 '+words.length+' 个词，全部词库共 '+total+' 个。<button class="lv-all">查看全部</button></p>';
  html+='<ol class="wlist">'+words.slice(0,ws.wallLimit).map((w,i)=>`<li><button class="wrow" data-w="${esc(w)}"><span class="idx">${pad2(i+1)}</span><span class="wrow-word serif">${esc(w)}</span><span class="wrow-seg">${segments(w,id)}</span><span class="wrow-cn">${esc(shortCN(WORD_CN[w]||''))}</span></button></li>`).join('')+'</ol>';
  if(words.length>ws.wallLimit) html+='<button class="more-btn">继续列出 '+Math.min(40,words.length-ws.wallLimit)+' 个</button>';
  html+='</section>';
  // next step: practise this root, or move to the neighbouring root in the same category
  const sibs=morphsIn(cat).sort((a,b)=>visibleWordsOf(b).length-visibleWordsOf(a).length); const si=sibs.indexOf(n); const prev=sibs[si-1], next=sibs[si+1];
  html+='<nav class="pager"><div class="pager-practice">'+(words.length>=4?'<button class="btn-primary" id="root-quest">练习这组词</button><span class="pager-note">用 '+esc(n.label)+' 构成的词出题</span>':'')+'</div><div class="pager-nav">'
    +(prev?'<button class="pager-btn" data-id="'+esc(prev.id)+'"><span class="k">上一个</span><b>'+esc(prev.label)+'</b><span class="m">'+esc(zh(prev.meaning))+'</span></button>':'<span></span>')
    +(next?'<button class="pager-btn next" data-id="'+esc(next.id)+'"><span class="k">下一个</span><b>'+esc(next.label)+'</b><span class="m">'+esc(zh(next.meaning))+'</span></button>':'<button class="pager-btn next" data-cat="'+esc(cat)+'"><span class="k">本组已读完</span><b>回到 '+esc(catZh(cat))+'</b></button>')
    +'</div></nav>';
  wsEl.innerHTML=html; bindCrumbs(parts);
  trackExplore('morpheme',id); if(typeof rememberRoot==='function') rememberRoot(id);
  wsEl.querySelectorAll('.lv-all').forEach(b=>b.onclick=()=>{ const s=document.getElementById('level-select'); s.value=''; s.dispatchEvent(new Event('change')); });
  wsEl.querySelectorAll('.pager-btn').forEach(b=>b.onclick=()=>{ if(b.dataset.id) wsGo('wall',b.dataset.id); else wsGo('box',b.dataset.cat); });
  const rq=wsEl.querySelector('#root-quest'); if(rq) rq.onclick=()=>openQuest({morph:id,label:n.label});
  wsEl.querySelectorAll('.wrow,.prow').forEach(r=>r.onclick=(e)=>{ showWordDetail(r.dataset.w, e.clientX, e.clientY); });
  const more=wsEl.querySelector('.more-btn'); if(more) more.onclick=()=>{ ws.wallLimit+=40; const top=wsEl.scrollTop; renderRoot(id); wsEl.scrollTop=top; };
  const favBtn=wsEl.querySelector('.fav-btn'); favBtn.onclick=()=>{ toggleFavorite(id,[id],'morpheme'); const on=isFavorite(id); favBtn.classList.toggle('on',on); favBtn.textContent=on?'已收藏':'收藏'; updateStudyBadge(); if(on) toast('已收藏 '+n.label); };
}

function openMorph(id){ wsGo('wall',id); }
function wsRefresh(){ wsRender(); }
