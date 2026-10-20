// Favorites and study progress (localStorage).
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  FAVORITES & PROGRESS (in-memory cache, persisted to localStorage)
// ============================================================
// Read-through cache: parse localStorage once at startup; subsequent reads
// hit memory only. isFavorite is O(1) via favSet. Writes are write-through.
const STORAGE_KEY_FAV='etym_favorites', STORAGE_KEY_PROG='etym_explored';
let _favCache=null, _favSet=null, _progCache=null;
function _initFavCache(){
  try{ _favCache=JSON.parse(localStorage.getItem(STORAGE_KEY_FAV)||'[]'); }catch(e){ _favCache=[]; }
  _favSet=new Set(_favCache.map(f=>f.word));
}
function _initProgCache(){
  try{ _progCache=JSON.parse(localStorage.getItem(STORAGE_KEY_PROG)||'{"morphemes":{},"words":{},"totalMorphemes":0,"totalWords":0}'); }
  catch(e){ _progCache={morphemes:{},words:{},totalMorphemes:0,totalWords:0}; }
}
_initFavCache(); _initProgCache();

function loadFavorites(){ return _favCache; }
function saveFavorites(favs){
  _favCache=favs; _favSet=new Set(favs.map(f=>f.word));
  localStorage.setItem(STORAGE_KEY_FAV, JSON.stringify(favs));
}
function isFavorite(word){ return _favSet.has(word.toLowerCase()); }
function toggleFavorite(word, morphemes, type){
  const favs=_favCache, w=word.toLowerCase();
  const idx=favs.findIndex(f=>f.word===w);
  if(idx>=0){ favs.splice(idx,1); _favSet.delete(w); }
  else { favs.push({word:w,morphemes:morphemes||[],type:type||'word',addedAt:Date.now()}); _favSet.add(w); }
  localStorage.setItem(STORAGE_KEY_FAV, JSON.stringify(favs));
  updateStudyBadge();
  return idx<0;
}
function loadProgress(){ return _progCache; }
function saveProgress(prog){ _progCache=prog; localStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(prog)); }
function trackExplore(type, id){
  const prog=_progCache;
  const bucket=type==='morpheme'?prog.morphemes:prog.words;
  if(!bucket[id]){
    bucket[id]=Date.now();
    prog['total'+(type==='morpheme'?'Morphemes':'Words')]=Object.keys(bucket).length;
    try{ localStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(prog)); }catch(e){}
    if(type==='morpheme' && typeof toast==='function' && appState==='active') toast('🧱 打开了一块新积木！已集齐 '+prog.totalMorphemes+' / '+MORPHEMES.length);
  }
  return prog;
}
function updateStudyBadge(){
  const badge=document.getElementById('study-badge');
  if(_favCache.length>0){ badge.style.display='flex'; badge.textContent=_favCache.length; }
  else { badge.style.display='none'; }
}
