// Tooltip / detail card for morphemes and words, hover detection, pin and history.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  HOVER DETECTION
// ============================================================
const mouse={x:0,y:0};
function findHoveredNode(){
  let closest=null, cd=Infinity;
  nodes.forEach(n=>{
    projVec.set(n.x,n.y,n.z); projVec.project(camera);
    if(projVec.z>1) return;
    const sx=(projVec.x+1)/2*window.innerWidth, sy=(-projVec.y+1)/2*window.innerHeight;
    const dx=sx-mouse.x, dy=sy-mouse.y, dist=Math.sqrt(dx*dx+dy*dy);
    const thr=28;
    if(dist<thr&&dist<cd){cd=dist;closest=n;}
  });
  return closest;
}

// ============================================================
//  TOOLTIP
// ============================================================
const tooltip=document.getElementById('tooltip');
const ttBadge=document.getElementById('tt-badge'),ttLabel=document.getElementById('tt-label');
const ttOrigin=document.getElementById('tt-origin'),ttMeaning=document.getElementById('tt-meaning');
const ttWords=document.getElementById('tt-words'),ttCount=document.getElementById('tt-count');
const TYPE_LABELS={p:'Prefix',r:'Root',s:'Suffix',w:'Word'};
let tooltipHideTimer=null;

function speakWord(word){
  if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(word);
  u.lang='en-US'; u.rate=0.85;
  speechSynthesis.speak(u);
}

// Helper: show word detail directly (builds virtual word node on-the-fly).
// Distinguishes verified Chinese (WORD_CN / hand-curated wordList) from
// constructed Chinese (morpheme meanings concatenated). Showing the latter
// as the primary translation was misleading — e.g. "filament" was rendering
// as "心智+结果/手段(名词)" because no curated translation exists.
function showWordDetail(word, x, y, _fromBack){
  const w = word.toLowerCase();
  let morphIds = WORD_DATA.get(w) || [];
  let validMorphs = morphIds.filter(m=>nodeMap[m]);
  if(validMorphs.length===0 && WORD_MORPH_REVERSE[w]){
    validMorphs = [...WORD_MORPH_REVERSE[w]];
  }
  const primaryId = validMorphs.find(id=>nodeMap[id]&&nodeMap[id].type==='r') || validMorphs[0];
  const color = primaryId && nodeMap[primaryId] ? nodeMap[primaryId].colorHex : '#FFD740';

  // Verified: WORD_CN direct, then any wordList human entry. Never constructed.
  let verifiedCn = WORD_CN[w] || '';
  if(!verifiedCn){
    for(const mid of validMorphs){
      const wl = nodeMap[mid] && nodeMap[mid].wordList;
      if(wl){ const f = wl.find(ww=>ww.en.toLowerCase()===w); if(f && f.cn && /[一-鿿]/.test(f.cn)){ verifiedCn = f.cn; break; } }
    }
  }
  const constructedCn = buildMorphMeaning(validMorphs);

  const vNode = {
    id:'w_'+w, type:'w', label:word,
    meaning: verifiedCn,                    // empty if no curated translation
    constructedMeaning: constructedCn,      // morpheme parts joined; always available if morphemes resolve
    morphemes: validMorphs.filter(m=>nodeMap[m]).map(m=>({id:m, type:nodeMap[m].type, label:nodeMap[m].label})),
    colorHex: color, isVirtual: true
  };
  if(primaryId && nodeMap[primaryId]){
    pinnedNode = nodeMap[primaryId];
    pinnedWordNode = vNode;
  }
  showTooltip(vNode, x, y);
  tooltip.classList.add('pinned');
}

function showTooltip(node,x,y){
  clearTimeout(tooltipHideTimer);
  const catText=node.catLabel?' · '+node.catLabel:'';
  ttBadge.textContent=TYPE_LABELS[node.type]+(catText||'');
  ttBadge.className='badge '+(node.type==='p'?'prefix':node.type==='r'?'root':node.type==='s'?'suffix':'word');
  ttBadge.style.background=(node.colorHex||'#999')+'26'; ttBadge.style.color=node.colorHex||'#999';
  ttLabel.textContent=node.label; ttOrigin.textContent=node.origin||'';
  ttOrigin.style.display=node.origin?'block':'none';

  // Primary meaning area: only show curated/verified translations.
  // For words without one, show a muted placeholder; the etymology row
  // below carries the morpheme breakdown labeled honestly.
  const isWordView = node.type==='w' || node.isVirtual;
  let displayMeaning = node.meaning || '';
  if(!displayMeaning && isWordView){
    displayMeaning = WORD_CN[node.label.toLowerCase()] || '';
  }
  if(displayMeaning){
    ttMeaning.textContent = displayMeaning;
    ttMeaning.style.color = '';
    ttMeaning.style.fontStyle = '';
    ttMeaning.style.opacity = '';
  } else if(isWordView){
    ttMeaning.textContent = '暂无中文释义';
    ttMeaning.style.color = 'var(--muted)';
    ttMeaning.style.fontStyle = 'italic';
    ttMeaning.style.opacity = '0.7';
  } else {
    ttMeaning.textContent = '';
  }
  ttWords.innerHTML=''; ttCount.textContent='';
  const ttIpa=document.getElementById('tt-ipa');
  const ttEtymology=document.getElementById('tt-etymology');
  const ttRelated=document.getElementById('tt-related');
  ttIpa.style.display='none'; ttIpa.innerHTML='';
  ttEtymology.style.display='none'; ttEtymology.innerHTML='';
  ttRelated.style.display='none'; ttRelated.innerHTML='';

  // Favorite button — works for both words and morphemes
  const ttFav=document.getElementById('tt-fav');
  const favKey = (node.type==='w'||node.isVirtual) ? node.label : node.label;
  ttFav.style.display='inline-block';
  ttFav.classList.toggle('active', isFavorite(favKey));
  ttFav.onclick=(e)=>{
    e.stopPropagation();
    const morphIds=node.morphemes?node.morphemes.map(m=>m.id||m.label):(node.type!=='w'?[node.id]:[]);
    const added=toggleFavorite(favKey, morphIds, node.type==='w'||node.isVirtual?'word':'morpheme');
    ttFav.classList.toggle('active', added);
  };
  if(node.type==='w'||node.isVirtual) trackExplore('word', node.label.toLowerCase());
  else trackExplore('morpheme', node.id);

  if(node.type==='w' || node.isVirtual){
    // Virtual word node from search
    const cleanWord=node.label.toLowerCase().replace(/[^a-z]/g,'');
    const ipa=getIPA(cleanWord);
    // IPA + Speak
    ttIpa.style.display='flex';
    const ipaText=ipa||'';
    const lvText=levelLabel(cleanWord);
    ttIpa.innerHTML=(ipaText?'<span title="'+(ipaText.startsWith('≈')?'规则估算音标，非词典音标':'词典音标')+'">'+ipaText+'</span>':'')+(lvText?'<span class="tt-lv">'+lvText+'</span>':'')+
      '<button class="tt-speak" title="Pronounce"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>';
    ttIpa.querySelector('.tt-speak').onclick=(e)=>{ e.stopPropagation(); speakWord(node.label); };
    if(!ipaText) ttIpa.querySelector('span')?.remove();
    // Etymology breakdown — morpheme chips followed by "≈ morpheme math".
    // The dictionary meaning is shown above; this row deliberately shows the
    // literal composition so learners can compare the two.
    if(node.morphemes&&node.morphemes.length>0){
      ttEtymology.style.display='flex';
      node.morphemes.forEach((m,i)=>{
        if(i>0){ const plus=document.createElement('span'); plus.className='tt-morph-plus'; plus.textContent='+'; ttEtymology.appendChild(plus); }
        const mn=nodeMap[m.id]; const mhex=mn?mn.colorHex:'#999';
        const part=document.createElement('span'); part.className='tt-morph-part';
        part.style.background=mhex+'1A'; part.style.color=mhex; part.style.borderColor=mhex+'40';
        part.textContent=m.label;
        part.title=mn?mn.meaning:'';
        part.style.cursor='pointer';
        part.onclick=(e)=>{ e.stopPropagation(); if(nodeMap[m.id]){ ttPushHistory({type:'word', label:node.label, x:e.clientX, y:e.clientY}); pinNode(nodeMap[m.id]); } };
        ttEtymology.appendChild(part);
      });
      const constructed = node.constructedMeaning || buildMorphMeaning(node.morphemes.map(m=>m.id||m));
      if(constructed){
        const arrow=document.createElement('span'); arrow.className='tt-morph-arrow'; arrow.textContent='≈';
        arrow.title='词素拼接·非权威释义';
        const result=document.createElement('span');
        result.style.cssText='font-size:11px;color:var(--muted);font-style:italic';
        result.textContent=constructed;
        result.title='词素拼接·非权威释义';
        ttEtymology.appendChild(arrow); ttEtymology.appendChild(result);
      }
    }
    // Related words (from same morphemes) — lightweight tags
    if(node.morphemes&&node.morphemes.length>0){
      const seen=new Set(); seen.add(node.label.toLowerCase());
      // Build {word, cn, hasCn} so we can sort verified-translation entries first
      const related=[];
      // Roots first (most informative), then prefixes, then suffixes; within each, frequency order
      const ORDER={r:0,p:1,s:2};
      [...node.morphemes].sort((a,b)=>ORDER[a.type]-ORDER[b.type]).forEach(m=>{
        const mWords = MORPH_WORDS[m.id] || [];
        mWords.forEach(w => {
          if(seen.has(w)) return;
          seen.add(w);
          // Layer 1+2 only here: WORD_CN direct or wordList match (verified translations).
          // Skip layer-3 morpheme composition to keep "hasCn" meaningful for sorting.
          let cn = WORD_CN[w] || '';
          if(!cn){
            const ids = WORD_DATA.get(w) || [];
            for(const mid of ids){
              const wl = nodeMap[mid] && nodeMap[mid].wordList;
              if(wl){
                const f = wl.find(ww=>ww.en.toLowerCase()===w);
                if(f && f.cn && /[一-鿿]/.test(f.cn)){ cn = f.cn; break; }
              }
            }
          }
          related.push({w, cn, hasCn: !!cn});
        });
      });
      // Verified-translation words first; otherwise keep root→prefix→suffix / frequency order
      related.sort((a,b)=>(a.hasCn===b.hasCn)?0:(a.hasCn?-1:1));
      if(related.length>0){
        ttRelated.style.display='block';
        ttRelated.innerHTML='<div class="tt-related-title">相关词汇</div>';
        const list=document.createElement('div'); list.className='words-list';
        const renderRelated=(limit)=>{
          list.innerHTML='';
          related.slice(0,limit).forEach(item=>{
            const t=document.createElement('span'); t.className='word-tag';
            // Layer-3 fallback (morpheme composition) only at render time, marked with ~
            const display = item.cn ? item.w+' '+shortCN(item.cn)
              : (()=>{ const c=getWordCN(item.w); return c ? item.w+' ~'+c : item.w; })();
            t.textContent=display;
            if(!item.hasCn) t.style.opacity='0.65';
            t.onclick=(e)=>{ e.stopPropagation(); ttPushHistory({type:'word', label:node.label, x:e.clientX, y:e.clientY}); showWordDetail(item.w, e.clientX, e.clientY); };
            list.appendChild(t);
          });
          if(related.length>limit){
            const more=document.createElement('span'); more.className='word-tag';
            more.style.cssText='color:var(--cyan);border-color:rgba(0,229,255,0.2);cursor:pointer';
            more.textContent='展开全部 '+related.length+' 个';
            more.onclick=(e)=>{ e.stopPropagation(); renderRelated(related.length); };
            list.appendChild(more);
          }
        };
        renderRelated(15);
        ttRelated.appendChild(list);
      }
    }
    // Morpheme tags
    if(node.morphemes){
      node.morphemes.forEach(m=>{
        const mn=nodeMap[m.id]; const mhex=mn?mn.colorHex:'#999';
        const t=document.createElement('span'); t.className='morpheme-tag';
        t.style.background=mhex+'1A'; t.style.color=mhex; t.style.borderColor=mhex+'40';
        t.textContent=m.label;
        t.onclick=(e)=>{ e.stopPropagation(); if(nodeMap[m.id]){ ttPushHistory({type:'word', label:node.label, x:e.clientX, y:e.clientY}); pinNode(nodeMap[m.id]); } };
        ttWords.appendChild(t);
      });
    }
  } else {
    // Morpheme node: show expanded word list + pronounce first word
    if(node.wordList && node.wordList.length>0){
      const firstWord=node.wordList[0].en;
      ttIpa.style.display='flex';
      ttIpa.innerHTML='<span style="font-size:11px;color:var(--muted)">'+firstWord+'</span>'+
        '<button class="tt-speak" title="Pronounce 发音"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>';
      ttIpa.querySelector('.tt-speak').onclick=(e)=>{ e.stopPropagation(); speakWord(firstWord); };
    }
    let showMax=pinnedNode?20:10;
    if(node.wordList){
      const renderWords=(limit)=>{
        ttWords.innerHTML=''; ttCount.textContent='';
        node.wordList.slice(0,limit).forEach(w=>{
          const t=document.createElement('span'); t.className='word-tag';
          const cn=w.cn||WORD_CN[w.en.toLowerCase()]||'';
          t.textContent=cn ? w.en+' '+shortCN(cn) : w.en;
          t.onclick=(e)=>{
            e.stopPropagation();
            ttPushHistory({type:'morpheme', id:node.id, x:e.clientX, y:e.clientY});
            showWordDetail(w.en, e.clientX, e.clientY);
          };
          ttWords.appendChild(t);
        });
        if(node.wordList.length>limit){
          const more=document.createElement('span'); more.className='word-tag';
          more.style.cssText='color:var(--cyan);border-color:rgba(0,229,255,0.2);cursor:pointer';
          more.textContent='展开全部 '+node.wordList.length+' 个单词';
          more.onclick=(e)=>{ e.stopPropagation(); renderWords(node.wordList.length); };
          ttWords.appendChild(more);
          ttCount.textContent='共 '+node.wordList.length+' 个单词，已显示 '+limit+' 个';
        }
      };
      renderWords(showMax);
    }
  }
  positionTooltip(x,y);
  tooltip.classList.add('visible');
}

function positionTooltip(x,y){
  const tw=380, th=tooltip.offsetHeight||220;
  let tx=x+18, ty=y-10;
  if(tx+tw>window.innerWidth) tx=x-tw-18;
  if(tx<10) tx=10;
  if(ty+th>window.innerHeight) ty=window.innerHeight-th-10;
  if(ty<10) ty=10;
  tooltip.style.left=tx+'px'; tooltip.style.top=ty+'px';
}

function hideTooltip(){ tooltip.classList.remove('visible'); tooltip.classList.remove('pinned'); }
function scheduleHide(){ tooltipHideTimer=setTimeout(()=>{ if(!pinnedNode){hoveredNode=null;hideTooltip();applyHighlight();} },200); }

// Tooltip dragging
(function(){
  let dragging=false, dx=0, dy=0;
  const header=document.querySelector('.tt-header');
  header.addEventListener('mousedown',e=>{
    if(e.target.closest('button')) return;
    if(!tooltip.classList.contains('pinned')) return;
    dragging=true; ttDragged=true;
    dx=e.clientX-tooltip.offsetLeft; dy=e.clientY-tooltip.offsetTop;
    e.preventDefault();
  });
  window.addEventListener('mousemove',e=>{
    if(!dragging) return;
    tooltip.style.left=(e.clientX-dx)+'px'; tooltip.style.top=(e.clientY-dy)+'px';
  });
  window.addEventListener('mouseup',()=>{ dragging=false; });
})();

// ============================================================
//  PIN / CLICK SYSTEM
// ============================================================
// Tooltip navigation history
const ttHistory=[];
function ttPushHistory(entry){ ttHistory.push(entry); document.getElementById('tt-back').style.display='flex'; }
function ttClearHistory(){ ttHistory.length=0; document.getElementById('tt-back').style.display='none'; }
document.getElementById('tt-back').onclick=(e)=>{
  e.stopPropagation();
  if(ttHistory.length===0) return;
  const prev=ttHistory.pop();
  if(ttHistory.length===0) document.getElementById('tt-back').style.display='none';
  if(prev.type==='morpheme' && nodeMap[prev.id]){
    pinnedNode=nodeMap[prev.id]; hoveredNode=nodeMap[prev.id]; applyHighlight();
    showTooltip(nodeMap[prev.id], prev.x, prev.y); tooltip.classList.add('pinned');
  } else if(prev.type==='word'){
    showWordDetail(prev.label, prev.x, prev.y, true);
  }
};

function pinNode(node){
  pinnedNode=node; hoveredNode=node; autoRotate=false; lastInteraction=Date.now();
  // Fly camera to face node
  const len=Math.sqrt(node.x*node.x+node.y*node.y+node.z*node.z);
  if(len>0.01){
    camT.theta=Math.atan2(node.x,node.z);
    camT.phi=Math.acos(Math.max(-1,Math.min(1,node.y/len)));
    camT.dist=Math.min(cam.dist,160);
  }
  applyHighlight();
  // Show tooltip at projected node position
  projVec.set(node.x,node.y,node.z); projVec.project(camera);
  const sx=(projVec.x+1)/2*window.innerWidth, sy=(-projVec.y+1)/2*window.innerHeight;
  showTooltip(node,sx,sy); tooltip.classList.add('pinned');
  document.getElementById('hint').classList.remove('visible');
}

function unpinNode(){
  pinnedNode=null; pinnedWordNode=null; ttDragged=false; tooltip.classList.remove('pinned'); hideTooltip(); applyHighlight(); ttClearHistory();
}

document.getElementById('tt-close').onclick=()=>unpinNode();
