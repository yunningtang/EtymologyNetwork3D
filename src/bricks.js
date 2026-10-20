// Bricks: morphemes rendered as toy building blocks that snap together into a word.
// Prefix = left block (coral), root = big middle block (mint), suffix = right block (grape).
// Used by the word card (renderBricks) and by the quest's "拼词素" question (brickEl + drag).
// Also hosts the tiny synthesized sound effects. Classic script: shares the global scope.

const BRICK_COLOR={p:'#FF7A59',r:'#5EE0A0',s:'#B388FF'};
const BRICK_DARK={p:'#C94F32',r:'#2FA66E',s:'#7E57C2'};

// ---------- sound effects (WebAudio, no files) ----------
let sfxOn=(function(){ try{ return localStorage.getItem('etym_sfx')!=='0'; }catch(e){ return true; } })();
function setSfx(on){ sfxOn=on; try{ localStorage.setItem('etym_sfx',on?'1':'0'); }catch(e){} }
let _ac=null;
function _ctx(){ if(!sfxOn) return null; try{ _ac=_ac||new (window.AudioContext||window.webkitAudioContext)(); if(_ac.state==='suspended') _ac.resume(); return _ac; }catch(e){ return null; } }
function _tone(f,t0,dur,type,gain,slide){ const ac=_ctx(); if(!ac) return; const o=ac.createOscillator(), g=ac.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,ac.currentTime+t0); if(slide) o.frequency.exponentialRampToValueAtTime(slide,ac.currentTime+t0+dur); g.gain.setValueAtTime(0.0001,ac.currentTime+t0); g.gain.exponentialRampToValueAtTime(gain||0.12,ac.currentTime+t0+0.01); g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+t0+dur); o.connect(g).connect(ac.destination); o.start(ac.currentTime+t0); o.stop(ac.currentTime+t0+dur+0.02); }
const Sfx={
  click(){ _tone(1800,0,0.05,'square',0.05,900); },          // brick snap
  pop(){ _tone(600,0,0.08,'sine',0.08,1200); },               // pick up
  ding(){ _tone(880,0,0.12,'sine',0.1); _tone(1320,0.1,0.18,'sine',0.1); },  // correct
  tada(){ [523,659,784,1047].forEach((f,i)=>_tone(f,i*0.09,0.16,'triangle',0.1)); }, // finished
  buzz(){ _tone(160,0,0.22,'sawtooth',0.06,120); },           // wrong
};

// ---------- a single brick ----------
function brickEl(id,opts){
  opts=opts||{};
  const n=nodeMap[id]; const type=n?n.type:'r';
  const b=document.createElement('div'); b.className='brick brick-'+type; b.dataset.id=id;
  b.style.setProperty('--bc',BRICK_COLOR[type]); b.style.setProperty('--bd',BRICK_DARK[type]);
  const studs=Math.max(2,Math.min(4,Math.round((n?n.label.length:4)/2)));
  b.innerHTML='<div class="brick-studs">'+'<i></i>'.repeat(studs)+'</div><div class="brick-label">'+(n?n.label:id).replace(/[&<>]/g,'')+'</div>';
  if(opts.meaning!==false && n){
    const m=document.createElement('div'); m.className='brick-meaning';
    const zh=(n.meaning||'').match(/[一-鿿].*$/); m.textContent=(zh?zh[0]:n.meaning);
    b.appendChild(m);
  }
  return b;
}

// ---------- the word card assembly ----------
// renderBricks(container, ids, {word, onOpen(id), onSwap(newWord)})
// Bricks fly in one by one and snap; clicking the row "explodes" it to show each block's
// meaning, a 查看 link to the morpheme planet, and a 换一块 menu on the prefix slot that
// lists other real words made with the same root.
function renderBricks(container, ids, opts){
  opts=opts||{}; container.innerHTML=''; container.classList.add('brick-row'); container.classList.remove('exploded');
  const valid=ids.filter(id=>nodeMap[id]); if(!valid.length) return;
  const rootId=valid.find(id=>nodeMap[id].type==='r');
  const hasPrefix=valid.some(id=>nodeMap[id].type==='p');
  // ghost slot to add a prefix when the word has none but its root family has prefixed words
  if(!hasPrefix && rootId && swapOptions(opts.word,rootId).length){ const g=document.createElement('div'); g.className='brick brick-ghost'; g.innerHTML='<div class="brick-label">+</div><div class="brick-meaning">加一块前缀</div>'; g.onclick=(e)=>{ e.stopPropagation(); openSwap(g,opts.word,rootId,opts.onSwap); }; container.appendChild(g); }
  valid.forEach((id,i)=>{
    const b=brickEl(id);
    const tools=document.createElement('div'); tools.className='brick-tools';
    const open=document.createElement('button'); open.className='brick-tool'; open.textContent='查看'; open.onclick=(e)=>{ e.stopPropagation(); opts.onOpen&&opts.onOpen(id); };
    tools.appendChild(open);
    if(nodeMap[id].type==='p' && rootId && swapOptions(opts.word,rootId).length){ const sw=document.createElement('button'); sw.className='brick-tool swap'; sw.textContent='换一块'; sw.onclick=(e)=>{ e.stopPropagation(); openSwap(b,opts.word,rootId,opts.onSwap); }; tools.appendChild(sw); }
    b.appendChild(tools);
    container.appendChild(b);
    setTimeout(()=>{ b.classList.add('in'); Sfx.click(); },120+i*140);
  });
  const hint=document.createElement('div'); hint.className='brick-hint'; hint.textContent='点一下拆开看看'; container.appendChild(hint);
  container.onclick=(e)=>{ if(e.target.closest('.brick-pop')) return; e.stopPropagation(); container.classList.toggle('exploded'); hint.textContent=container.classList.contains('exploded')?'再点一下拼回去':'点一下拆开看看'; Sfx.pop(); };
}
// other real words on the same root, one per prefix (most frequent first); "" = bare root word
function swapOptions(word,rootId){
  const out=[], seen=new Set([(WORD_DATA.get(word)||[]).find(id=>nodeMap[id]&&nodeMap[id].type==='p')||'']);
  for(const w of (MORPH_WORDS[rootId]||[])){
    if(w===word||!wordVisible(w)) continue;
    const pre=(WORD_DATA.get(w)||[]).find(id=>nodeMap[id]&&nodeMap[id].type==='p')||'';
    if(seen.has(pre)) continue; seen.add(pre); out.push({w,pre});
    if(out.length>=6) break;
  }
  return out;
}
function openSwap(anchor,word,rootId,onSwap){
  document.querySelectorAll('.brick-pop').forEach(p=>p.remove());
  const pop=document.createElement('div'); pop.className='brick-pop';
  pop.innerHTML='<div class="brick-pop-title">换一块前缀，变成新词</div>';
  swapOptions(word,rootId).forEach(o=>{
    const row=document.createElement('button'); row.className='brick-pop-row';
    const pn=o.pre?nodeMap[o.pre]:null;
    row.innerHTML='<span class="brick mini brick-'+(pn?'p':'none')+'" style="--bc:'+(pn?BRICK_COLOR.p:'#ccc')+';--bd:'+(pn?BRICK_DARK.p:'#999')+'"><span class="brick-label">'+(pn?pn.label:'—')+'</span></span><b>'+o.w+'</b><span>'+(typeof shortCN==='function'?shortCN(WORD_CN[o.w]||''):'')+'</span>';
    row.onclick=(e)=>{ e.stopPropagation(); pop.remove(); Sfx.ding(); onSwap&&onSwap(o.w); };
    pop.appendChild(row);
  });
  const row=anchor.closest('.brick-row')||anchor.parentElement; row.appendChild(pop);
  pop.style.left=Math.max(0,anchor.offsetLeft-4)+'px'; pop.style.top=(anchor.offsetTop+anchor.offsetHeight+4)+'px';
  setTimeout(()=>document.addEventListener('click',function h(){ pop.remove(); document.removeEventListener('click',h); },{once:true}),0);
}

// ---------- drag support for the quest ----------
// makeDraggable(brick, {onDrop(brick, overSlots:boolean), onTap(brick)})
function makeDraggable(b,opts){
  let ghost=null, sx=0, sy=0, moved=false;
  b.addEventListener('pointerdown',e=>{
    if(b.classList.contains('used')) return;
    e.preventDefault(); b.setPointerCapture(e.pointerId); sx=e.clientX; sy=e.clientY; moved=false;
    ghost=b.cloneNode(true); ghost.classList.add('brick-ghost-drag'); ghost.style.left=(b.getBoundingClientRect().left)+'px'; ghost.style.top=(b.getBoundingClientRect().top)+'px'; document.body.appendChild(ghost);
    b.classList.add('lifted'); Sfx.pop();
  });
  b.addEventListener('pointermove',e=>{
    if(!ghost) return; const dx=e.clientX-sx, dy=e.clientY-sy; if(Math.abs(dx)+Math.abs(dy)>6) moved=true;
    ghost.style.transform='translate('+dx+'px,'+dy+'px) rotate('+(dx*0.03)+'deg)';
    const slots=document.querySelector('.q-slots'); if(slots){ const r=slots.getBoundingClientRect(); slots.classList.toggle('hot', e.clientX>r.left-20&&e.clientX<r.right+20&&e.clientY>r.top-30&&e.clientY<r.bottom+30); }
  });
  const end=e=>{
    if(!ghost) return; ghost.remove(); ghost=null; b.classList.remove('lifted');
    const slots=document.querySelector('.q-slots'); let over=false;
    if(slots){ const r=slots.getBoundingClientRect(); over=e.clientX>r.left-20&&e.clientX<r.right+20&&e.clientY>r.top-30&&e.clientY<r.bottom+30; slots.classList.remove('hot'); }
    if(!moved) opts.onTap&&opts.onTap(b); else if(over) opts.onDrop&&opts.onDrop(b); else Sfx.click();
  };
  b.addEventListener('pointerup',end); b.addEventListener('pointercancel',end);
}
