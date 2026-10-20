// "今天探索" quest: a 10-question mini-game built from the words visible under the current
// level filter. Three question types rotate: guess the meaning, build the word from its
// morphemes, find the word that shares a root. Feedback is immediate (toast + confetti),
// the best score is kept in localStorage. Classic script: shares the global scope.

// ---------- small feedback helpers (also used by the cards) ----------
const toastEl=document.getElementById('toast'); let _toastT=null;
function toast(msg,ms){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(_toastT); _toastT=setTimeout(()=>toastEl.classList.remove('show'),ms||1600); }
const confettiCanvas=document.getElementById('confetti'); const cfx=confettiCanvas.getContext('2d'); let cfParts=[], cfRaf=0;
function confetti(x,y,n){
  const W=confettiCanvas.width=window.innerWidth, H=confettiCanvas.height=window.innerHeight;
  const cols=['#FFC83D','#FF7A59','#4FC3F7','#5EE0A0','#B388FF','#FF8ACB'];
  for(let i=0;i<(n||60);i++){ const a=Math.random()*Math.PI*2, s=4+Math.random()*7; cfParts.push({x:x??W/2,y:y??H/3,vx:Math.cos(a)*s,vy:Math.sin(a)*s-4,g:0.25,life:60+Math.random()*30,c:cols[i%cols.length],r:Math.random()*Math.PI,w:6+Math.random()*6}); }
  if(!cfRaf) cfRaf=requestAnimationFrame(cfStep);
}
function cfStep(){
  cfx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
  cfParts=cfParts.filter(p=>p.life>0);
  for(const p of cfParts){ p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.vx*=0.98; p.life--; p.r+=0.15;
    cfx.save(); cfx.translate(p.x,p.y); cfx.rotate(p.r); cfx.globalAlpha=Math.min(1,p.life/20); cfx.fillStyle=p.c; cfx.fillRect(-p.w/2,-p.w/3,p.w,p.w*0.66); cfx.restore(); }
  cfRaf=cfParts.length?requestAnimationFrame(cfStep):0;
  if(!cfRaf) cfx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
}

// ---------- question building ----------
const QUEST_N=10;
function qPool(scope){
  // words visible under the level filter, with a gloss and at least one morpheme; most frequent first.
  // scope {morph} limits the pool to the words built with that morpheme (练习这组词).
  const pool=[];
  const src=scope&&scope.morph ? (MORPH_WORDS[scope.morph]||[]).map(w=>[w,WORD_DATA.get(w)||[]]) : WORD_DATA;
  for(const [w,ids] of src){ if(!wordVisible(w)) continue; if(!WORD_CN[w]) continue; const v=ids.filter(id=>nodeMap[id]); if(v.length) pool.push({w,ids:v}); if(pool.length>=1500) break; }
  return pool;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pick(a,n){ return shuffle(a.slice()).slice(0,n); }
function buildQuestions(scope){
  const pool=qPool(scope); if(pool.length<(scope?4:12)) return [];
  const all=scope?qPool():pool;              // distractors always come from the whole word list
  const multi=pool.filter(p=>p.ids.length>=2);
  const qs=[]; const used=new Set();
  const take=(arr)=>{ for(const p of shuffle(arr.slice())){ if(!used.has(p.w)){ used.add(p.w); return p; } } return null; };
  const n=scope?Math.min(QUEST_N,pool.length):QUEST_N;
  for(let i=0;i<n;i++){
    const type=i%3; // 0 meaning, 1 build, 2 root
    if(type===0){
      const p=take(pool); if(!p) break;
      const wrong=pick(all.filter(x=>x.w!==p.w&&shortCN(WORD_CN[x.w])!==shortCN(WORD_CN[p.w])),3).map(x=>shortCN(WORD_CN[x.w]));
      qs.push({type:'meaning',word:p.w,ids:p.ids,answer:shortCN(WORD_CN[p.w]),options:shuffle([shortCN(WORD_CN[p.w]),...wrong])});
    } else if(type===1){
      const p=take(multi.length?multi:pool); if(!p) break;
      const extra=pick(MORPHEMES.filter(m=>!p.ids.includes(m.id)&&m.type===nodeMap[p.ids[p.ids.length-1]].type),1).map(m=>m.id);
      qs.push({type:'build',word:p.w,ids:p.ids,chips:shuffle([...p.ids,...extra])});
    } else {
      const p=take(pool.filter(x=>x.ids.some(id=>nodeMap[id].type==='r'))); if(!p) break;
      const root=p.ids.find(id=>nodeMap[id].type==='r');
      const others=pick(all.filter(x=>!x.ids.includes(root)&&!(WORD_DATA.get(x.w)||[]).includes(root)),3).map(x=>x.w);
      qs.push({type:'root',root,word:p.w,ids:p.ids,answer:p.w,options:shuffle([p.w,...others])});
    }
  }
  return qs;
}

// ---------- panel ----------
let quest=null; // {qs, i, score, picked:[]}
const qp=document.createElement('div'); qp.id='quest-panel'; qp.setAttribute('role','dialog'); qp.setAttribute('aria-label','今天探索'); qp.style.display='none'; document.body.appendChild(qp);
const qShade=document.createElement('div'); qShade.id='quest-shade'; qShade.style.display='none'; document.body.appendChild(qShade);
const ESCQ=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function morphChip(id,extra){ const n=nodeMap[id]; return '<span class="q-chip q-chip-'+n.type+'" data-id="'+ESCQ(id)+'" title="'+ESCQ(n.meaning)+'">'+(extra||'')+ESCQ(n.label)+'</span>'; }
function openQuest(scope){
  scope=(scope&&scope.morph)?scope:null;     // called from a click handler with an event otherwise
  const qs=buildQuestions(scope);
  if(qs.length<(scope?4:QUEST_N)){ toast(scope?'这个词根的词太少，先练整个词库吧':'这个词库的单词太少，换一个词库再来吧'); return; }
  startQuest(qs,scope);
}
function startQuest(qs,scope,label){
  quest={qs,i:0,score:0,picked:[],lock:false,n:qs.length,scope,label:label||null,wrong:[],retry:false};
  qShade.style.display='block'; qp.style.display='block'; if(pinnedNode) unpinNode();
  renderQ();
}
function closeQuest(){ qp.style.display='none'; qShade.style.display='none'; quest=null; }
qShade.onclick=closeQuest;
function renderQ(){
  const q=quest.qs[quest.i], i=quest.i;
  const head='<div class="q-head"><span class="q-step">第 '+(i+1)+' / '+quest.n+' 题</span>'+(quest.label?'<span class="q-scope">'+ESCQ(quest.label)+'</span>':quest.scope?'<span class="q-scope">'+ESCQ(quest.scope.label)+'</span>':'')+(quest.retry?'<span class="q-scope">重试</span>':'')+'<span class="q-score">得分 '+quest.score+'</span><button class="q-close" aria-label="关闭">✕</button></div>'+
    '<div class="q-bar"><div class="q-fill" style="width:'+(i/quest.n*100)+'%"></div></div>';
  let body='';
  if(q.type==='meaning'){
    body='<div class="q-title">这个词是什么意思？</div><div class="q-word">'+ESCQ(q.word)+'</div>'+
      '<div class="q-hint">提示：'+q.ids.map(id=>morphChip(id)).join('<span class="q-plus">+</span>')+'</div>'+
      '<div class="q-hint2">'+q.ids.map(id=>ESCQ(nodeMap[id].label)+' = '+ESCQ((nodeMap[id].meaning||'').split(' ').slice(-1)[0])).join('　')+'</div>'+
      '<div class="q-opts">'+q.options.map((o,k)=>'<button class="q-opt" data-k="'+k+'"><span class="q-key">'+(k+1)+'</span>'+ESCQ(o)+'</button>').join('')+'</div>';
  } else if(q.type==='build'){
    body='<div class="q-title">把积木拖到框里，按顺序拼出这个词</div><div class="q-cn">'+ESCQ(shortCN(WORD_CN[q.word]))+'</div>'+
      '<div class="q-slots">'+q.ids.map(()=>'<span class="q-slot"></span>').join('')+'</div>'+
      '<div class="q-tray-hint">可用的部件（拖上去或点一下；放错了点它拿回来）</div><div class="q-chips"></div><div class="q-sub">其中一个部件用不上</div>';
  } else {
    body='<div class="q-title">哪个单词里藏着这个词根？</div><div class="q-rootrow">'+morphChip(q.root)+'<span class="q-rootmeaning">'+ESCQ(nodeMap[q.root].meaning)+'</span></div>'+
      '<div class="q-opts">'+q.options.map((o,k)=>'<button class="q-opt" data-k="'+k+'"><span class="q-key">'+(k+1)+'</span>'+ESCQ(o)+'</button>').join('')+'</div>';
  }
  qp.innerHTML=head+'<div class="q-body">'+body+'</div><div class="q-foot"></div>';
  qp.querySelector('.q-close').onclick=closeQuest;
  quest.lock=false; quest.picked=[];
  qp.querySelectorAll('.q-opt').forEach(b=>b.onclick=()=>answerChoice(+b.dataset.k));
  if(q.type==='build'){
    const tray=qp.querySelector('.q-chips');
    q.chips.forEach(id=>{ const b=brickEl(id); tray.appendChild(b); makeDraggable(b,{onTap:pickChip,onDrop:pickChip}); });
  }
}
function finishQ(ok,explain){
  quest.lock=true; const retry=quest.retry;
  if(ok){ if(!retry) quest.score++; const r=qp.getBoundingClientRect(); confetti(r.left+r.width/2,r.top+r.height/3,70); Sfx.ding(); } else Sfx.buzz();
  qp.querySelector('.q-score').textContent='得分 '+quest.score;
  const q=quest.qs[quest.i];
  if(!ok&&!retry) quest.wrong.push(q);
  const foot=qp.querySelector('.q-foot');
  const note=(window.WORD_NOTES||{})[q.word];
  foot.innerHTML='<div class="q-result '+(ok?'ok':'no')+'">'+(ok?(retry?'这次对了（重试不计分）。':'太棒了！'):'差一点，正确答案是：')+' '+explain+'</div>'+
    '<div class="q-explain">'+(note?ESCQ(note):ESCQ(q.word)+' = '+q.ids.map(id=>ESCQ(nodeMap[id].label)).join(' + ')+' ≈ '+ESCQ(buildMorphMeaning(q.ids)))+'</div>'+
    '<div class="q-footbtns">'+(ok?'':'<button class="q-retry">再试一次</button>')+'<button class="q-next">'+(quest.i+1<quest.n?'下一题':'看结果')+'</button></div>';
  trackExplore('word',q.word);
  foot.querySelector('.q-next').onclick=()=>{ quest.i++; quest.retry=false; if(quest.i<quest.n) renderQ(); else renderEnd(); };
  const rb=foot.querySelector('.q-retry'); if(rb) rb.onclick=()=>{ quest.retry=true; if(q.type==='meaning'||q.type==='root'){ shuffle(q.options); } renderQ(); };
}
function answerChoice(k){
  if(!quest||quest.lock) return;
  const q=quest.qs[quest.i], chosen=q.options[k], ok=chosen===q.answer;
  qp.querySelectorAll('.q-opt').forEach((b,j)=>{ b.disabled=true; if(q.options[j]===q.answer) b.classList.add('right'); else if(j===k) b.classList.add('wrong'); });
  finishQ(ok, ok?'':'<b>'+ESCQ(q.answer)+'</b>');
}
function pickChip(c){
  if(!quest||quest.lock||c.classList.contains('used')) return;
  const q=quest.qs[quest.i]; c.classList.add('used'); quest.picked.push(c.dataset.id);
  const slots=qp.querySelectorAll('.q-slot'); const s=slots[quest.picked.length-1];
  const placed=brickEl(c.dataset.id,{meaning:false}); placed.classList.add('in'); s.innerHTML=''; s.appendChild(placed); s.classList.add('filled');
  Sfx.click();
  // tap a placed brick to take it back (only before the word is complete)
  placed.onclick=()=>{ if(quest.lock) return; const k=quest.picked.indexOf(c.dataset.id); if(k<0) return; quest.picked.splice(k,1); c.classList.remove('used');
    const all=[...qp.querySelectorAll('.q-slot')]; all.forEach((sl,j)=>{ sl.innerHTML=''; sl.classList.remove('filled'); const id=quest.picked[j]; if(id){ const pb=brickEl(id,{meaning:false}); pb.classList.add('in'); pb.onclick=placed.onclick; sl.appendChild(pb); sl.classList.add('filled'); } }); Sfx.pop(); };
  if(quest.picked.length===q.ids.length){
    const ok=quest.picked.every((id,j)=>id===q.ids[j]);
    finishQ(ok, ok?'<b>'+ESCQ(q.word)+'</b>':'<b>'+q.ids.map(id=>ESCQ(nodeMap[id].label)).join(' + ')+'</b>');
  }
}
function renderEnd(){
  const s=quest.score, N=quest.n; const stars=s>=N*0.9?3:s>=N*0.6?2:s>=N*0.3?1:0;
  let best=0; try{ best=+(localStorage.getItem('etym_quest_best')||0); if(!quest.scope&&s>best){ best=s; localStorage.setItem('etym_quest_best',String(s)); } }catch(e){}
  const wrong=quest.wrong.slice();
  if(typeof addHistory==='function') addHistory({type:'quest',score:s,n:N,scope:quest.scope?quest.scope.morph:null,label:quest.label||(quest.scope?quest.scope.label:null),wrong:wrong.map(q=>q.word)});
  qp.innerHTML='<div class="q-end"><div class="q-stars">'+s+'<span class="dim"> / '+N+'</span></div>'+
    '<div class="q-endtitle">'+(stars===3?'全对，太厉害了':stars===2?'做得很好':stars===1?'不错的开始':'再来一次')+'</div>'+
    '<div class="q-endscore">答对 '+s+' / '+N+' 题'+(quest.scope||quest.label?'':' · 最高纪录 '+best)+'</div>'+
    (wrong.length?'<div class="q-wronglist">错的词：'+wrong.map(q=>'<b>'+ESCQ(q.word)+'</b>').join('　')+'</div>':'')+
    '<div class="q-endbtns">'+(wrong.length?'<button class="q-next" id="q-redo">重做错题 · '+wrong.length+' 题</button>':'')+'<button class="'+(wrong.length?'q-opt':'q-next')+'" id="q-again">再练一组</button><button class="q-opt" id="q-done">回到工坊</button></div></div>';
  if(stars===3) confetti(undefined,undefined,160);
  Sfx.tada();
  const scope=quest.scope;
  qp.querySelector('#q-again').onclick=()=>openQuest(scope); qp.querySelector('#q-done').onclick=closeQuest;
  const redo=qp.querySelector('#q-redo'); if(redo) redo.onclick=()=>{ wrong.forEach(q=>{ if(q.options) shuffle(q.options); if(q.chips) shuffle(q.chips); }); startQuest(shuffle(wrong.slice()),scope,'错题'); };
  if(typeof updateStudyBadge==='function') updateStudyBadge();
}
document.getElementById('quest-btn').onclick=openQuest;
window.addEventListener('keydown',e=>{
  if(!quest) return;
  if(e.key==='Escape'){ closeQuest(); e.stopImmediatePropagation(); return; }
  if(/^[1-4]$/.test(e.key)){ const b=qp.querySelectorAll('.q-opt')[+e.key-1]; if(b&&!b.disabled) b.click(); }
  if(e.key==='Enter'){ const n=qp.querySelector('.q-next'); if(n) n.click(); }
},{capture:true});
