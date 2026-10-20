// Tooltip / detail card for morphemes and words, hover detection, pin and history.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  HOVER DETECTION
// ============================================================
const mouse={x:0,y:0};
// (hover detection removed with the 3D view)

// ============================================================
//  TOOLTIP
// ============================================================
const tooltip=document.getElementById('tooltip');
const ttBadge=document.getElementById('tt-badge'),ttLabel=document.getElementById('tt-label');
const ttOrigin=document.getElementById('tt-origin'),ttMeaning=document.getElementById('tt-meaning');
const ttWords=document.getElementById('tt-words'),ttCount=document.getElementById('tt-count');
const TYPE_LABELS={p:'前缀',r:'词根',s:'后缀',w:'单词'};
// Guess-first mode (generation effect): a word card shows the morpheme breakdown first and
// hides the dictionary meaning behind a "揭晓" control until the learner has made a guess.
let guessMode=(function(){ try{ return localStorage.getItem('etym_guess')!=='0'; }catch(e){ return true; } })();
const ttGuess=document.getElementById('tt-guess');
function setGuessMode(on){ guessMode=on; try{ localStorage.setItem('etym_guess',on?'1':'0'); }catch(e){} ttGuess.classList.toggle('on',on); ttGuess.textContent=on?'猜词模式 开':'猜词模式 关'; }
setGuessMode(guessMode);
ttGuess.onclick=(e)=>{ e.stopPropagation(); setGuessMode(!guessMode); if(pinnedWordNode){ pinnedWordNode._revealed=false; showWordDetail(pinnedWordNode.label, tooltip.offsetLeft, tooltip.offsetTop, true); } };
const ttStory=document.getElementById('tt-story'), ttImage=document.getElementById('tt-image'), ttCompare=document.getElementById('tt-compare');
const ESC=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  tooltip.classList.add('pinned','visible');
  if(typeof syncHash==='function') syncHash();
}

function showTooltip(node,x,y){
  clearTimeout(tooltipHideTimer);
  const catText=node.catLabel?' · '+node.catLabel:'';
  ttBadge.textContent=TYPE_LABELS[node.type]+(catText||'');
  ttBadge.className='badge '+(node.type==='p'?'prefix':node.type==='r'?'root':node.type==='s'?'suffix':'word');
  ttLabel.textContent=node.label; ttOrigin.textContent=node.origin||'';
  // icon badge (kid theme shows it large; glass theme keeps it subtle)
  ttOrigin.style.display=node.origin?'block':'none';

  // Primary meaning area: only show curated/verified translations.
  // For words without one, show a muted placeholder; the etymology row
  // below carries the morpheme breakdown labeled honestly.
  const isWordView = node.type==='w' || node.isVirtual;
  let displayMeaning = node.meaning || '';
  if(!displayMeaning && isWordView){
    displayMeaning = WORD_CN[node.label.toLowerCase()] || '';
  }
  ttGuess.style.display = isWordView ? 'inline-block' : 'none';
  ttMeaning.style.cssText=''; ttMeaning.innerHTML='';
  if(isWordView) renderMeaning(node, displayMeaning);
  else ttMeaning.textContent='';
  ttWords.innerHTML=''; ttCount.textContent='';
  const ttIpa=document.getElementById('tt-ipa');
  const ttEtymology=document.getElementById('tt-etymology');
  const ttRelated=document.getElementById('tt-related');
  ttIpa.style.display='none'; ttIpa.innerHTML='';
  ttEtymology.style.display='none'; ttEtymology.innerHTML='';
  ttRelated.style.display='none'; ttRelated.innerHTML='';
  ttStory.style.display='none'; ttStory.innerHTML=''; ttImage.style.display='none'; ttImage.innerHTML=''; ttCompare.style.display='none'; ttCompare.innerHTML='';

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
      ttEtymology.style.display='block';
      const me=node.label.toLowerCase();
      // Bricks: fly in and snap; click to explode (meanings + 查看 + 换一块前缀 → new word)
      const row=document.createElement('div');
      renderBricks(row, node.morphemes.map(m=>m.id), {
        word: me,
        onOpen: (id)=>{ ttPushHistory({type:'word', label:node.label, x:tooltip.offsetLeft+40, y:tooltip.offsetTop+40}); pinNode(nodeMap[id]); },
        onSwap: (w)=>{ ttPushHistory({type:'word', label:node.label, x:tooltip.offsetLeft+40, y:tooltip.offsetTop+40}); showWordDetail(w, tooltip.offsetLeft, tooltip.offsetTop, true); tooltip.classList.add('pinned'); },
      });
      ttEtymology.appendChild(row);
      // literal reading: one short gloss per part, e.g. 进入 + 看
      const lit=node.morphemes.map(m=>nodeMap[m.id]).filter(Boolean).map(n=>{ const z=(n.meaning||'').match(/[一-鿿…].*$/); return (z?z[0]:n.meaning||'').split('/')[0].replace(/[（(].*$/,''); }).filter(Boolean).join(' + ');
      if(lit){ const line=document.createElement('div'); line.className='tt-literal'; line.innerHTML='<span class="k">字面义</span><span>'+ESC(lit)+'</span>'; ttEtymology.appendChild(line); }
    }
    // Same-root comparison: other words built on this word's main root, one per prefix,
    // so the learner sees how the prefix changes the meaning (import / export / transport …)
    if(node.morphemes&&node.morphemes.length>0){
      const ids=node.morphemes.map(m=>m.id);
      const rootId=ids.find(id=>nodeMap[id]&&nodeMap[id].type==='r')||ids.find(id=>nodeMap[id]&&nodeMap[id].type==='p')||ids[0];
      const me=node.label.toLowerCase();
      if(rootId&&nodeMap[rootId]){
        const rows=[], seenPre=new Set();
        for(const w of (MORPH_WORDS[rootId]||[])){
          if(!wordVisible(w)) continue;
          const wm=WORD_DATA.get(w)||[]; const pre=wm.find(id=>nodeMap[id]&&nodeMap[id].type==='p'&&id!==rootId)||'';
          const key=pre+'|'+(wm.length>2?w.slice(-3):'');
          if(w!==me && seenPre.has(pre)) continue;   // one example per prefix, most frequent first
          seenPre.add(pre); rows.push({w,pre});
          if(rows.length>=8) break;
        }
        if(!rows.some(r=>r.w===me) && (WORD_DATA.has(me))){ const wm=WORD_DATA.get(me); rows.unshift({w:me,pre:wm.find(id=>nodeMap[id]&&nodeMap[id].type==='p'&&id!==rootId)||''}); }
        if(rows.length>1){
          ttCompare.style.display='block';
          const title=document.createElement('div'); title.className='tt-compare-title'; title.innerHTML='同根对比 · 换个前缀 <b>'+ESC(nodeMap[rootId].label)+'</b>'; ttCompare.appendChild(title);
          rows.forEach(r=>{
            const row=document.createElement('div'); row.className='cmp-row'+(r.w===me?' cur':'');
            const pn=r.pre?nodeMap[r.pre]:null;
            const pre=document.createElement('span'); pre.className='cmp-pre'+(pn?'':' none');
            if(pn){ pre.textContent=pn.label; pre.title=pn.meaning; } else pre.textContent='—';
            const wd=document.createElement('span'); wd.className='cmp-word'; wd.innerHTML='<b>'+ESC(r.w)+'</b><span>'+ESC(shortCN(WORD_CN[r.w]||''))+'</span>';
            row.appendChild(pre); row.appendChild(wd);
            if(r.w!==me) row.onclick=(e)=>{ e.stopPropagation(); ttPushHistory({type:'word', label:node.label, x:e.clientX, y:e.clientY}); showWordDetail(r.w, e.clientX, e.clientY); };
            ttCompare.appendChild(row);
          });
        }
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
          if(!wordVisible(w)) return;
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
            const cn = item.cn ? shortCN(item.cn) : (()=>{ const c=getWordCN(item.w); return c ? '~'+c : ''; })();
            t.innerHTML='<b>'+item.w+'</b><span>'+cn.replace(/[&<>]/g,'')+'</span>';
            if(!item.hasCn) t.style.opacity='0.65';
            t.onclick=(e)=>{ e.stopPropagation(); ttPushHistory({type:'word', label:node.label, x:e.clientX, y:e.clientY}); showWordDetail(item.w, e.clientX, e.clientY); };
            list.appendChild(t);
          });
          if(related.length>limit){
            const more=document.createElement('span'); more.className='word-tag more';
            more.textContent='展开全部 '+related.length+' 个';
            more.onclick=(e)=>{ e.stopPropagation(); renderRelated(related.length); };
            list.appendChild(more);
          }
        };
        renderRelated(15);
        ttRelated.appendChild(list);
      }
    }
    // (morpheme navigation now lives on the bricks: 查看)
  } else {
    // Morpheme node: picture (Wikimedia Commons, with credit) and one-line origin story
    const img=(window.MORPH_IMAGES||{})[node.id];
    if(img&&img.file){
      ttImage.style.display='block';
      ttImage.innerHTML='<img loading="lazy" alt="" src="assets/morphemes/'+ESC(img.file)+'"><div class="tt-credit" title="'+ESC((img.author||'')+' · '+(img.license||''))+'"><a href="'+ESC(img.url||'#')+'" target="_blank" rel="noopener">'+ESC((img.author||'Wikimedia Commons')+' · '+(img.license||''))+'</a></div>';
    }
    if(node.story){ ttStory.style.display='block'; ttStory.innerHTML='<b>词源</b>'+ESC(node.story); }
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
      const visible = levelFilter.size ? node.wordList.filter(w=>wordVisible(w.en)) : node.wordList;
      const renderWords=(limit)=>{
        ttWords.innerHTML=''; ttCount.textContent='';
        if(!visible.length){ ttCount.textContent='当前等级下没有该词素的单词'; return; }
        visible.slice(0,limit).forEach(w=>{
          const t=document.createElement('span'); t.className='word-tag';
          const cn=w.cn||WORD_CN[w.en.toLowerCase()]||'';
          t.innerHTML='<b>'+w.en+'</b><span>'+(cn?shortCN(cn):'').replace(/[&<>]/g,'')+'</span>';
          t.onclick=(e)=>{
            e.stopPropagation();
            ttPushHistory({type:'morpheme', id:node.id, x:e.clientX, y:e.clientY});
            showWordDetail(w.en, e.clientX, e.clientY);
          };
          ttWords.appendChild(t);
        });
        if(visible.length>limit){
          const more=document.createElement('span'); more.className='word-tag more';
          more.textContent='展开全部 '+visible.length+' 个单词';
          more.onclick=(e)=>{ e.stopPropagation(); renderWords(visible.length); };
          ttWords.appendChild(more);
          ttCount.textContent='共 '+visible.length+' 个单词，已显示 '+limit+' 个';
        } else if(levelFilter.size && node.wordList.length>visible.length){
          ttCount.textContent='当前等级 '+visible.length+' 个（全部 '+node.wordList.length+' 个）';
        }
      };
      renderWords(showMax);
    }
  }
  // numbered section labels only for word cards and only where the section has content
  const isW=node.type==='w'||node.isVirtual;
  const show=(id,on)=>{ const el=document.getElementById(id); if(el) el.style.display=(isW&&on)?'block':'none'; };
  show('tt-sec-build', ttEtymology.style.display!=='none'); show('tt-sec-meaning', true); show('tt-sec-compare', ttCompare.style.display!=='none'); show('tt-sec-related', ttRelated.style.display!=='none');
  positionTooltip(x,y);
  tooltip.classList.add('visible');
}

// ---------- the 含义 section of a word card ----------
// Guess mode: four meanings to choose from (two from the same root when possible, so the
// learner has to read the prefix), then the dictionary senses by part of speech, the English
// definition, word forms, and a 词源解释 that walks from the literal reading to the real meaning.
let _allWords=null;
function guessOptions(word){
  const answer=shortCN(WORD_CN[word]||''); if(!answer) return null;
  const seen=new Set([answer]), out=[];
  const ids=(WORD_DATA.get(word)||[]).filter(id=>nodeMap[id]);
  const rootId=ids.find(id=>nodeMap[id].type==='r');
  const tryAdd=(w)=>{ if(w===word||!WORD_CN[w]||!wordVisible(w)) return; const c=shortCN(WORD_CN[w]); if(!c||seen.has(c)||c.length>18) return; seen.add(c); out.push(c); };
  if(rootId){ for(const w of (MORPH_WORDS[rootId]||[])){ if(out.length>=2) break; tryAdd(w); } }
  _allWords=_allWords||[...WORD_DATA.keys()];
  let guard=0; while(out.length<3&&guard++<400){ tryAdd(_allWords[Math.floor(Math.random()*Math.min(_allWords.length,3000))]); }
  if(out.length<3) return null;
  const opts=[answer,...out]; for(let i=opts.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [opts[i],opts[j]]=[opts[j],opts[i]]; }
  return {answer,opts};
}
function sensesHTML(cn){
  return (cn||'').split(' / ').map(seg=>{ const m=seg.match(/^((?:[a-z]+\.\s*)+(?:&\s*[a-z]+\.\s*)?)(.*)$/i); return '<div class="sense">'+(m?'<i>'+ESC(m[1].trim())+'</i><span>'+ESC(m[2].trim())+'</span>':'<span>'+ESC(seg)+'</span>')+'</div>'; }).join('');
}
function literalOf(node){
  return (node.morphemes||[]).map(m=>nodeMap[m.id]).filter(Boolean).map(n=>{ const z=(n.meaning||'').match(/[一-鿿…].*$/); return (z?z[0]:n.meaning||'').split('/')[0].replace(/[（(].*$/,''); }).filter(Boolean);
}
function renderMeaning(node, displayMeaning){
  const word=node.label.toLowerCase();
  const wrap=ttMeaning; wrap.innerHTML='';
  const finish=(guessed)=>{
    wrap.innerHTML='';
    if(guessed){ const v=document.createElement('div'); v.className='tt-verdict '+(guessed.ok?'ok':'bad'); v.textContent=guessed.ok?(guessed.tries>1?'第 '+guessed.tries+' 次猜对了。':'一次猜对。'):'正确的是「'+guessed.answer+'」。'; wrap.appendChild(v); }
    if(guessMode&&displayMeaning){ const again=document.createElement('button'); again.className='tt-again'; again.textContent='重新猜一次'; again.onclick=(e)=>{ e.stopPropagation(); node._revealed=false; renderMeaning(node, displayMeaning); }; wrap.appendChild(again); }
    if(displayMeaning){ const s=document.createElement('div'); s.className='senses'; s.innerHTML=sensesHTML(displayMeaning); wrap.appendChild(s); }
    else { const s=document.createElement('div'); s.className='senses empty'; s.textContent='暂无中文释义'; wrap.appendChild(s); }
    if(WORD_EN[word]){ const e=document.createElement('div'); e.className='tt-en'; e.textContent=WORD_EN[word]; wrap.appendChild(e); }
    if(WORD_FORMS[word]){ const names={p:'过去式',i:'现在分词',s:'复数',r:'比较级'}; const f=document.createElement('div'); f.className='tt-forms'; f.innerHTML=WORD_FORMS[word].split('/').sort((a,b)=>'pisr'.indexOf(a[0])-'pisr'.indexOf(b[0])).map(x=>{ const [k,v]=x.split(':'); return names[k]?'<span><i>'+names[k]+'</i>'+ESC(v)+'</span>':''; }).join(''); wrap.appendChild(f); }
    const note=(window.WORD_NOTES||{})[word]; const lit=literalOf(node);
    if(note||lit.length){
      const w=document.createElement('div'); w.className='tt-why';
      const parts=(node.morphemes||[]).map(m=>nodeMap[m.id]).filter(Boolean);
      const text=note||(parts.length>1?'字面义「'+lit.join(' + ')+'」'+(displayMeaning?'，引申为「'+shortCN(displayMeaning)+'」。':'。')
        :'由 '+parts[0].label.replace(/^-|-$/g,'')+'（'+lit[0]+'）构成'+(displayMeaning?'，引申为「'+shortCN(displayMeaning)+'」。':'。'));
      w.innerHTML='<span class="k">词源解释</span><p>'+ESC(text)+'</p>';
      wrap.appendChild(w);
    }
  };
  const q=(displayMeaning&&guessMode&&!node._revealed)?guessOptions(word):null;
  if(!q){ finish(null); return; }
  const box=document.createElement('div'); box.className='tt-quiz';
  box.innerHTML='<div class="q">根据上面的拆解，<b>'+ESC(node.label)+'</b> 是什么意思？</div>';
  let tries=0, note=null;
  q.opts.forEach((o,i)=>{ const b=document.createElement('button'); b.className='tt-opt'; b.innerHTML='<span class="n">'+(i+1)+'</span>'+ESC(o); b.onclick=(e)=>{
    e.stopPropagation(); if(b.disabled) return; tries++; const ok=o===q.answer;
    if(tries===1){ if(typeof recordGuess==='function') recordGuess(word,ok); if(typeof addHistory==='function') addHistory({type:'guess',word,ok}); }
    if(ok){ node._revealed=true; if(typeof confetti==='function') confetti(e.clientX,e.clientY,36); if(typeof Sfx!=='undefined') Sfx.ding(); finish({ok:true,answer:q.answer,tries}); return; }
    // wrong: mark it, let the learner try again (the first attempt is what gets recorded)
    b.disabled=true; b.classList.add('wrong'); if(typeof Sfx!=='undefined') Sfx.buzz();
    if(!note){ note=document.createElement('div'); note.className='tt-quiz-note'; box.insertBefore(note, box.querySelector('.tt-skip')); }
    note.textContent=tries>=3?'再想想，或者直接看释义。':'不对，再试一次。';
  }; box.appendChild(b); });
  const skip=document.createElement('button'); skip.className='tt-skip'; skip.textContent='直接看释义'; skip.onclick=(e)=>{ e.stopPropagation(); node._revealed=true; finish(tries?{ok:false,answer:q.answer,tries}:null); }; box.appendChild(skip);
  const tip=document.createElement('div'); tip.className='tt-quiz-tip'; tip.textContent='猜过再看记得更牢。不想猜可在右上角关闭猜词模式。'; box.appendChild(tip);
  wrap.appendChild(box);
}

function positionTooltip(x,y){
  const tw=Math.min(440,window.innerWidth-16), th=tooltip.offsetHeight||220;
  let tx=x+18, ty=y-10;
  if(tx+tw>window.innerWidth) tx=x-tw-18;
  if(tx<10) tx=10;
  if(ty+th>window.innerHeight) ty=window.innerHeight-th-10;
  if(ty<10) ty=10;
  tooltip.style.left=tx+'px'; tooltip.style.top=ty+'px';
}

function hideTooltip(){ tooltip.classList.remove('visible'); tooltip.classList.remove('pinned'); }
function scheduleHide(){ tooltipHideTimer=setTimeout(()=>{ if(!pinnedNode){hideTooltip();} },200); }

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
    openMorph(prev.id);
  } else if(prev.type==='word'){
    showWordDetail(prev.label, prev.x, prev.y, true);
  }
};

// A morpheme opens as a wall in the workshop (no floating card needed)
function pinNode(node){ document.getElementById('hint').classList.remove('visible'); openMorph(node.id); }

function unpinNode(){
  pinnedNode=null; pinnedWordNode=null; ttDragged=false; tooltip.classList.remove('pinned'); hideTooltip(); ttClearHistory();
  if(typeof syncHash==='function') syncHash();
}
// Mobile: the panel is a bottom sheet; dragging it down (from the top of its content) closes it.
(function(){
  let y0=null;
  tooltip.addEventListener('touchstart',e=>{ y0=(window.innerWidth<=720&&tooltip.scrollTop<=0)?e.touches[0].clientY:null; },{passive:true});
  tooltip.addEventListener('touchmove',e=>{ if(y0===null) return; const dy=e.touches[0].clientY-y0; if(dy>0&&tooltip.scrollTop<=0){ tooltip.style.transition='none'; tooltip.style.transform='translateY('+dy+'px)'; } },{passive:true});
  const end=e=>{ if(y0===null) return; const dy=(e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientY:y0)-y0; tooltip.style.transition=''; tooltip.style.transform=''; y0=null; if(dy>90) unpinNode(); };
  tooltip.addEventListener('touchend',end); tooltip.addEventListener('touchcancel',end);
})();

document.getElementById('tt-close').onclick=()=>unpinNode();
