// Hash routes, so the browser back button, refresh and shared links work:
//   #/                 home
//   #/cat/<cat>        a category page
//   #/root/<id>        a root study page
//   …/w/<word>         the word panel open on top of any of the above
// wsGo / showWordDetail / unpinNode call syncHash after they change state; hashchange
// (back/forward, typed URL) calls applyHash. Classic script, loaded after workshop.js.

let _routeApplying=false, _routeLast='';

function routeHash(){
  let h = ws.view==='shelf' ? '#/' : ws.view==='box' ? '#/cat/'+encodeURIComponent(ws.cat) : '#/root/'+encodeURIComponent(ws.morph);
  if(pinnedWordNode) h+=(h.endsWith('/')?'':'/')+'w/'+encodeURIComponent(pinnedWordNode.label.toLowerCase());
  return h;
}
function routeTitle(){
  let t='词根图谱';
  if(pinnedWordNode) t=pinnedWordNode.label+' · '+t;
  else if(ws.view==='wall'&&nodeMap[ws.morph]) t=nodeMap[ws.morph].label+' · '+t;
  else if(ws.view==='box') t=catZh(ws.cat)+' · '+t;
  document.title=t;
}
// Write the current state to the URL (one history entry per page or word).
function syncHash(replace){
  if(_routeApplying) return;
  const h=routeHash(); routeTitle();
  if(location.hash===h) return;
  _routeLast=h;
  if(replace) history.replaceState(null,'',h); else location.hash=h;
}
// Read the URL and bring the page to that state without writing history.
function applyHash(hash){
  const parts=(hash===undefined?location.hash:hash).replace(/^#\/?/,'').split('/').filter(Boolean).map(s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } });
  let view='shelf', arg=null, word=null;
  for(let i=0;i<parts.length;i++){
    if(parts[i]==='cat'&&parts[i+1]){ view='box'; arg=parts[++i]; }
    else if(parts[i]==='root'&&parts[i+1]){ view='wall'; arg=parts[++i]; }
    else if(parts[i]==='w'&&parts[i+1]){ word=parts[++i]; }
  }
  if(view==='box'&&!CAT_META[arg]) view='shelf';
  if(view==='wall'&&!nodeMap[arg]) view='shelf';
  _routeApplying=true;
  try{
    wsGo(view,arg);
    if(word) showWordDetail(word, window.innerWidth-300, 120, true);
  } finally { _routeApplying=false; }
  routeTitle();
}
window.addEventListener('hashchange',()=>{
  if(location.hash===_routeLast){ _routeLast=''; return; }   // our own write
  applyHash();
});
