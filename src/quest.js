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
function qPool(){
  // words visible under the level filter, with a gloss and at least one morpheme; most frequent first
  const pool=[]; for(const [w,ids] of WORD_DATA){ if(!wordVisible(w)) continue; if(!WORD_CN[w]) continue; const v=ids.filter(id=>nodeMap[id]); if(v.length) pool.push({w,ids:v}); if(pool.length>=1500) break; }
  return pool;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pick(a,n){ return shuffle(a.slice()).slice(0,n); }
function buildQuestions(){
  const pool=qPool(); if(pool.length<12) return [];
  const multi=pool.filter(p=>p.ids.length>=2);
  const qs=[]; const used=new Set();
  const take=(arr)=>{ for(const p of shuffle(arr.slice())){ if(!used.has(p.w)){ used.add(p.w); return p; } } return null; };
  for(let i=0;i<QUEST_N;i++){
    const type=i%3; // 0 meaning, 1 build, 2 root
    if(type===0){
      const p=take(pool); if(!p) break;
      const wrong=pick(pool.filter(x=>x.w!==p.w&&shortCN(WORD_CN[x.w])!==shortCN(WORD_CN[p.w])),3).map(x=>shortCN(WORD_CN[x.w]));
      qs.push({type:'meaning',word:p.w,ids:p.ids,answer:shortCN(WORD_CN[p.w]),options:shuffle([shortCN(WORD_CN[p.w]),...wrong])});
    } else if(type===1){
      const p=take(multi.length?multi:pool); if(!p) break;
      const extra=pick(MORPHEMES.filter(m=>!p.ids.includes(m.id)&&m.type===nodeMap[p.ids[p.ids.length-1]].type),1).map(m=>m.id);
      qs.push({type:'build',word:p.w,ids:p.ids,chips:shuffle([...p.ids,...extra])});
    } else {
      const p=take(pool.filter(x=>x.ids.some(id=>nodeMap[id].type==='r'))); if(!p) break;
      const root=p.ids.find(id=>nodeMap[id].type==='r');
      const others=pick(pool.filter(x=>!x.ids.includes(root)&&!(WORD_DATA.get(x.w)||[]).includes(root)),3).map(x=>x.w);
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
function morphChip(id,extra){ const n=nodeMap[id]; return '<span class="q-chip" data-id="'+ESCQ(id)+'" style="color:'+n.colorHex+';border-color:'+n.colorHex+'66" title="'+ESCQ(n.meaning)+'">'+(extra||'')+ESCQ(n.label)+'</span>'; }
function openQuest(){
  const qs=buildQuestions();
  if(qs.length<QUEST_N){ toast('这个等级的单词太少，换个等级再来吧'); return; }
  quest={qs,i:0,score:0,picked:[],lock:false};
  qShade.style.display='block'; qp.style.display='block'; if(pinnedNode) unpinNode();
  renderQ();
}
function closeQuest(){ qp.style.display='none'; qShade.style.display='none'; quest=null; }
qShade.onclick=closeQuest;
function renderQ(){
  const q=quest.qs[quest.i], i=quest.i;
  const head='<div class="q-head"><span class="q-step">第 '+(i+1)+' / '+QUEST_N+' 题</span><span class="q-score">⭐ '+quest.score+'</span><button class="q-close" aria-label="关闭">✕</button></div>'+
    '<div class="q-bar"><div class="q-fill" style="width:'+(i/QUEST_N*100)+'%"></div></div>';
  let body='';
  if(q.type==='meaning'){
    body='<div class="q-title">这个词是什么意思？</div><div class="q-word">'+ESCQ(q.word)+'</div>'+
      '<div class="q-hint">提示：'+q.ids.map(id=>morphChip(id)).join('<span class="q-plus">+</span>')+'</div>'+
      '<div class="q-hint2">'+q.ids.map(id=>ESCQ(nodeMap[id].label)+' = '+ESCQ((nodeMap[id].meaning||'').split(' ').slice(-1)[0])).join('　')+'</div>'+
      '<div class="q-opts">'+q.options.map((o,k)=>'<button class="q-opt" data-k="'+k+'"><span class="q-key">'+(k+1)+'</span>'+ESCQ(o)+'</button>').join('')+'</div>';
  } else if(q.type==='build'){
    body='<div class="q-title">把词素按顺序拼出这个词</div><div class="q-cn">'+ESCQ(shortCN(WORD_CN[q.word]))+'</div>'+
      '<div class="q-slots">'+q.ids.map(()=>'<span class="q-slot"></span>').join('')+'</div>'+
      '<div class="q-chips">'+q.chips.map(id=>morphChip(id)).join('')+'</div><div class="q-sub">多了一个用不上的词素，小心别选错</div>';
  } else {
    body='<div class="q-title">哪个单词里藏着这个词根？</div><div class="q-rootrow">'+morphChip(q.root,morphIcon(q.root)+' ')+'<span class="q-rootmeaning">'+ESCQ(nodeMap[q.root].meaning)+'</span></div>'+
      '<div class="q-opts">'+q.options.map((o,k)=>'<button class="q-opt" data-k="'+k+'"><span class="q-key">'+(k+1)+'</span>'+ESCQ(o)+'</button>').join('')+'</div>';
  }
  qp.innerHTML=head+'<div class="q-body">'+body+'</div><div class="q-foot"></div>';
  qp.querySelector('.q-close').onclick=closeQuest;
  quest.lock=false; quest.picked=[];
  qp.querySelectorAll('.q-opt').forEach(b=>b.onclick=()=>answerChoice(+b.dataset.k));
  if(q.type==='build') qp.querySelectorAll('.q-chips .q-chip').forEach(c=>c.onclick=()=>pickChip(c));
}
function finishQ(ok,explain){
  quest.lock=true; if(ok){ quest.score++; const r=qp.getBoundingClientRect(); confetti(r.left+r.width/2,r.top+r.height/3,70); }
  qp.querySelector('.q-score').textContent='⭐ '+quest.score;
  const q=quest.qs[quest.i];
  const foot=qp.querySelector('.q-foot');
  foot.innerHTML='<div class="q-result '+(ok?'ok':'no')+'">'+(ok?'太棒了！':'差一点，正确答案是：')+' '+explain+'</div>'+
    '<div class="q-explain">'+ESCQ(q.word)+' = '+q.ids.map(id=>ESCQ(nodeMap[id].label)).join(' + ')+' ≈ '+ESCQ(buildMorphMeaning(q.ids))+'</div>'+
    '<button class="q-next">'+(quest.i+1<QUEST_N?'下一题 →':'看结果 🏁')+'</button>';
  trackExplore('word',q.word);
  foot.querySelector('.q-next').onclick=()=>{ quest.i++; if(quest.i<QUEST_N) renderQ(); else renderEnd(); };
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
  const slots=qp.querySelectorAll('.q-slot'); const s=slots[quest.picked.length-1]; s.innerHTML=morphChip(c.dataset.id); s.classList.add('filled');
  if(quest.picked.length===q.ids.length){
    const ok=quest.picked.every((id,j)=>id===q.ids[j]);
    finishQ(ok, ok?'<b>'+ESCQ(q.word)+'</b>':'<b>'+q.ids.map(id=>ESCQ(nodeMap[id].label)).join(' + ')+'</b>');
  }
}
function renderEnd(){
  const s=quest.score; const stars=s>=9?3:s>=6?2:s>=3?1:0;
  let best=0; try{ best=+(localStorage.getItem('etym_quest_best')||0); if(s>best){ best=s; localStorage.setItem('etym_quest_best',String(s)); } }catch(e){}
  qp.innerHTML='<div class="q-end"><div class="q-stars">'+'⭐'.repeat(stars)+'<span class="dim">'+'⭐'.repeat(3-stars)+'</span></div>'+
    '<div class="q-endtitle">'+(stars===3?'探险大师！':stars===2?'干得漂亮！':stars===1?'不错的开始！':'再试一次，你可以的！')+'</div>'+
    '<div class="q-endscore">答对 '+s+' / '+QUEST_N+' 题 · 最高纪录 '+best+'</div>'+
    '<div class="q-endbtns"><button class="q-next" id="q-again">再来一关 🚀</button><button class="q-opt" id="q-done">回到星图</button></div></div>';
  if(stars===3) confetti(undefined,undefined,160);
  qp.querySelector('#q-again').onclick=openQuest; qp.querySelector('#q-done').onclick=closeQuest;
  if(typeof updateStudyBadge==='function') updateStudyBadge();
}
document.getElementById('quest-btn').onclick=openQuest;
window.addEventListener('keydown',e=>{
  if(!quest) return;
  if(e.key==='Escape'){ closeQuest(); e.stopImmediatePropagation(); return; }
  if(/^[1-4]$/.test(e.key)){ const b=qp.querySelectorAll('.q-opt')[+e.key-1]; if(b&&!b.disabled) b.click(); }
  if(e.key==='Enter'){ const n=qp.querySelector('.q-next'); if(n) n.click(); }
},{capture:true});
