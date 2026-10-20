// Pixel-art previews: 16×16 sprites stored as text grids, rendered to crisp inline SVG.
// Palette letters: . transparent  k ink  w white  e grey  r red  o orange  y yellow  g green
//                  d dark green  b blue  l light blue  c cyan  p purple  n pink  t brown  s beige
// SPRITES holds one sprite per morpheme id (data/sprites.js); BOX_SPRITES one per category.
// Classic script: shares the global scope with the other files in src/.

const PX_PALETTE={k:'#2B2D5C',w:'#FFFFFF',e:'#C9CDDC',r:'#FF5A5F',o:'#FF9F43',y:'#FFD23F',g:'#5EE0A0',d:'#1D9E63',b:'#4C7BFF',l:'#8FD3FF',c:'#2EC4C4',p:'#B388FF',n:'#FF8ACB',t:'#9C6B3C',s:'#F6D8B8'};
const _pxCache=new Map();
function pixelSvg(rows,size){
  if(!rows) return '';
  const key=rows.join('|')+'@'+size;
  if(_pxCache.has(key)) return _pxCache.get(key);
  const h=rows.length, w=rows[0].length; let rects='';
  for(let y=0;y<h;y++){
    const row=rows[y]; let x=0;
    while(x<w){ const ch=row[x]; if(ch==='.'||!PX_PALETTE[ch]){ x++; continue; } let x2=x+1; while(x2<w&&row[x2]===ch) x2++;
      rects+='<rect x="'+x+'" y="'+y+'" width="'+(x2-x)+'" height="1" fill="'+PX_PALETTE[ch]+'"/>'; x=x2; }
  }
  const svg='<svg class="px" viewBox="0 0 '+w+' '+h+'" width="'+size+'" height="'+size+'" shape-rendering="crispEdges" aria-hidden="true">'+rects+'</svg>';
  _pxCache.set(key,svg); return svg;
}
// category (box) sprites — hand drawn
const BOX_SPRITES={
neg:[ // red circle with a slash
'.....kkkkkk.....','...kkrrrrrrkk...','..krrrrrrrrrrk..','.krrrrrrrrrrrrk.','.krrkrrrrrrwwrk.','krrrrkrrrrwwrrrk','krrrrrkrrwwrrrrk','krrrrrrkwwrrrrrk','krrrrrrwwkrrrrrk','krrrrrwwrrkrrrrk','krrrrwwrrrrkrrrk','.krrwwrrrrrrkrk.','.krrrrrrrrrrrrk.','..krrrrrrrrrrk..','...kkrrrrrrkk...','.....kkkkkk.....'],
dir:[ // compass
'.....kkkkkk.....','...kkwwwwwwkk...','..kwwwwkkwwwwk..','.kwwwwwkkwwwwwk.','.kwwwwwkkwwwwwk.','kwwwwwkrrkwwwwwk','kwwwwkrrrrkwwwwk','kwkkkkrrrrkkkkwk','kwkkkkbbbbkkkkwk','kwwwwkbbbbkwwwwk','kwwwwwkbbkwwwwwk','.kwwwwwkkwwwwwk.','.kwwwwwkkwwwwwk.','..kwwwwkkwwwwk..','...kkwwwwwwkk...','.....kkkkkk.....'],
deg:[ // ruler
'................','................','kkkkkkkkkkkkkkkk','kyyyyyyyyyyyyyyk','kykyyykyyykyyyyk','kykyyykyyykyyykk','kykykykykykykykk','kyyyyyyyyyyyyyyk','kyyyyyyyyyyyyyyk','kkkkkkkkkkkkkkkk','................','..kk..kk..kk..kk','..kk..kk..kk..kk','................','................','................'],
num:[ // dice
'..kkkkkkkkkkkk..','.kwwwwwwwwwwwwk.','kwwkkwwwwwwkkwwk','kwwkkwwwwwwkkwwk','kwwwwwwwwwwwwwwk','kwwwwwwwwwwwwwwk','kwwwwwwkkwwwwwwk','kwwwwwwkkwwwwwwk','kwwwwwwkkwwwwwwk','kwwwwwwkkwwwwwwk','kwwwwwwwwwwwwwwk','kwwwwwwwwwwwwwwk','kwwkkwwwwwwkkwwk','kwwkkwwwwwwkkwwk','.kwwwwwwwwwwwwk.','..kkkkkkkkkkkk..'],
aux:[ // puzzle piece
'.....kkkkk......','....kggggggk....','.kkkkgggggggkkk.','kggggggggggggggk','kggggggggggggggk','kgggggggggggggkk','kgggggggggggggk.','.kgggggggggggggk','..kggggggggggggk','kkkggggggggggggk','kggggggggggggggk','kgggggggggggkkkk','.kggggggggggk...','..kkkkggggkk....','......kggk......','.......kk.......'],
create:[ // hammer and wrench
'..kkk.......kkk.','.kyyyk.....kyyyk','kyyyyyk...kyyyyk','kyyyyyk..kyyyyyk','.kyyyk..kyyyykk.','..kkk..kyyyyk...','..ktk.kyyyyk....','..ktkkyyyyk.....','..ktkyyyyk......','..ktkyyyk.......','..ktkyyk........','..ktkyk.........','..ktkk..........','..ktk...........','..ktk...........','..kkk...........'],
move:[ // running figure
'.......kkk......','......ksssk.....','......ksssk.....','.......kkk......','....kkkbbbkkk...','...kbbkbbbkbbk..','..kbbk.bbb.kbbk.','..kk..kbbbk..kk.','......kbbbk.....','.....kbbbbbk....','....kbbkkbbk....','...kbbk..kbbk...','..kbbk....kbbk..','..kkk......kkk..','................','................'],
sense:[ // eye
'................','................','.....kkkkkk.....','...kkwwwwwwkk...','..kwwwwwwwwwwk..','.kwwwwkkkkwwwwk.','kwwwwklllllkwwwk','kwwwklllkklllkwk','kwwwkllkkkkllkwk','kwwwwklllllkwwwk','.kwwwwkkkkwwwwk.','..kwwwwwwwwwwk..','...kkwwwwwwkk...','.....kkkkkk.....','................','................'],
mind:[ // brain
'................','....kkkk.kkkk...','...knnnnknnnnk..','..knnnnnknnnnnk.','.knnnnnnknnnnnnk','.knnknnnknnnknnk','.knnnnnnknnnnnnk','.knnnnknknknnnnk','.knnnnnnknnnnnnk','.knnknnnknnnknnk','..knnnnnknnnnnk.','..knnnnnknnnnnk.','...knnnnknnnnk..','....kkkkkkkkk...','................','................'],
lang:[ // speech bubble
'..kkkkkkkkkkkk..','.kccccccccccccck','kcccccccccccccck','kcccccccccccccck','kccckkcckkcckkck','kcccccccccccccck','kcccccccccccccck','kccckkkkkkkkkcck','kcccccccccccccck','kcccccccccccccck','.kcccccccccccck.','..kkkcccccckkk..','....kccck.......','....kcck........','....kck.........','....kk..........'],
nature:[ // leaf
'..............kk','............kkdk','..........kkdddk','........kkddgddk','......kkddgggddk','.....kddgggkgddk','....kddggggkgddk','...kddgggggkgddk','..kddggggggkgdk.','.kddgggggggkdk..','.kddgggggkkkk...','.kdddggggkdk....','..kddddddkk.....','...kkddddk......','.....kkkk.......','................'],
society:[ // house
'.......kk.......','......kyyk......','.....kyyyyk.....','....kyyyyyyk....','...kyyyyyyyyk...','..kyyyyyyyyyyk..','.kyyyyyyyyyyyyk.','kkkkkkkkkkkkkkkk','.koooooooooooook','.kooolloookkoook','.kooolloookkoook','.kooolloookkoook','.koooooooookoook','.koooooooookoook','.koooooooooooook','.kkkkkkkkkkkkkk.'],
noun_s:[ // labelled box
'................','..kkkkkkkkkkkk..','.kttttttttttttk.','ktttttttttttttt.','kttttttttttttttk','kttkkkkkkkkkkttk','kttkwwwwwwwwkttk','kttkwkkkkkkwkttk','kttkwwwwwwwwkttk','kttkwkkkkkkwkttk','kttkwwwwwwwwkttk','kttkkkkkkkkkkttk','kttttttttttttttk','kttttttttttttttk','.kkkkkkkkkkkkkk.','................'],
adj_s:[ // paint palette
'.....kkkkkk.....','...kkssssssskk..','..kssssssssssk..','.ksskrrkssskbbsk','.kssrrrrsssbbbsk','kssskrrkssskbbsk','kssssssssssssssk','kskyykssssskggsk','kkyyyykssssgggsk','kskyykssssskggsk','kssssssssssssssk','.kssssssssssssk.','.kssssssssskkk..','..ksssssssk.....','...kkssskk......','.....kkk........'],
verb_s:[ // lightning
'........kkkk....','.......kyyyk....','......kyyyk.....','.....kyyyk......','....kyyyk.......','...kyyyyyyyk....','..kyyyyyyyyk....','..kkkkkyyyk.....','......kyyk......','.....kyyk.......','....kyyk........','...kyyk.........','..kyyk..........','.kyk............','.kk.............','................'],
adv_s:[ // wind lines
'................','................','..kkkkkkkkk.....','.klllllllllk....','.kkkkkkkkkklk...','..........kk....','....kkkkkkkkkkk.','...klllllllllllk','...kkkkkkkkkkkk.','................','.kkkkkkkkkkkk...','kllllllllllllk..','kkkkkkkkkkkklk..','............kk..','................','................'],
};
function boxSprite(cat,size){ return pixelSvg(BOX_SPRITES[cat],size||40); }
function morphSprite(id,size){ const rows=(window.SPRITES||{})[id]||BOX_SPRITES[(typeof NODE_CAT!=='undefined'&&NODE_CAT[id])||'']; return pixelSvg(rows,size||40); }
