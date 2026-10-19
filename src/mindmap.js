// 2D mind-map view (Canvas 2D).
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  2D MINDMAP VIEW
// ============================================================
// ============================================================
let currentView = '3d';
const mindmapContainer = document.getElementById('mindmap-container');
const mindmapCanvas = document.getElementById('mindmap-canvas');
const mmCtx = mindmapCanvas.getContext('2d');
let mmNodes = [], mmEdges = [], mmExpanded = new Set();
let mmPan = {x:0,y:0}, mmZoom = 1, mmDragging = false, mmDragStart = {x:0,y:0}, mmPanStart = {x:0,y:0};
let mmHovered = null, mmAnimFrame = null;

function resizeMindmap(){
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  mindmapCanvas.width = window.innerWidth * dpr;
  mindmapCanvas.height = window.innerHeight * dpr;
  mindmapCanvas.style.width = window.innerWidth + 'px';
  mindmapCanvas.style.height = window.innerHeight + 'px';
  mmCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// View toggle
document.querySelectorAll('.view-btn').forEach(btn=>{
  btn.onclick = () => {
    const view = btn.dataset.view;
    if(view === currentView) return;
    currentView = view;
    document.body.classList.toggle('view-2d', view==='2d'); // lets CSS hide 3D-only chrome
    document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===view));

    if(view==='2d'){
      mindmapContainer.classList.add('active');
      document.getElementById('three-canvas').style.display='none';
      document.getElementById('label-canvas').style.display='none';
      resizeMindmap();
      buildMindmap();
      animateMindmap();
      document.getElementById('mindmap-hint').classList.add('visible');
      setTimeout(()=>document.getElementById('mindmap-hint').classList.remove('visible'), 5000);
    } else {
      mindmapContainer.classList.remove('active');
      document.getElementById('three-canvas').style.display='block';
      document.getElementById('label-canvas').style.display='block';
      if(mmAnimFrame) cancelAnimationFrame(mmAnimFrame);
    }
  };
});

function buildMindmap(){
  mmNodes = []; mmEdges = []; mmExpanded.clear();
  const cx = window.innerWidth/2, cy = window.innerHeight/2 + 28; // leave room for the search + level bar

  // Hierarchical layout: center → category groups → morphemes
  // Groups arranged radially, morphemes branch out from their group
  const groups = [
    {id:'g_neg',label:'Negation\n否定',cats:['neg'],color:'#FF5252'},
    {id:'g_dir',label:'Direction\n方位',cats:['dir'],color:'#448AFF'},
    {id:'g_deg',label:'Degree\n程度',cats:['deg'],color:'#E040FB'},
    {id:'g_num',label:'Number\n数量',cats:['num'],color:'#FFAB40'},
    {id:'g_aux',label:'Auxiliary\n辅助',cats:['aux'],color:'#00BFA5'},
    {id:'g_create',label:'Create\n创造',cats:['create'],color:'#69F0AE'},
    {id:'g_move',label:'Action\n动作',cats:['move'],color:'#29B6F6'},
    {id:'g_sense',label:'Sense\n感知',cats:['sense'],color:'#FF7043'},
    {id:'g_mind',label:'Mind\n认知',cats:['mind'],color:'#B388FF'},
    {id:'g_lang',label:'Language\n语言',cats:['lang'],color:'#26C6DA'},
    {id:'g_nature',label:'Nature\n自然',cats:['nature'],color:'#9CCC65'},
    {id:'g_society',label:'Society\n社会',cats:['society'],color:'#FFA726'},
    {id:'g_noun',label:'Noun\n名词后缀',cats:['noun_s'],color:'#F06292'},
    {id:'g_adj',label:'Adj\n形容词后缀',cats:['adj_s'],color:'#AB47BC'},
    {id:'g_verb',label:'Verb\n动词后缀',cats:['verb_s'],color:'#EC407A'},
    {id:'g_adv',label:'Adv\n副词后缀',cats:['adv_s'],color:'#7E57C2'},
  ];

  // Center node
  mmNodes.push({
    id:'_center', type:'center', label:'Etymology\nNetwork', meaning:'', color:'#ffffff',
    x:cx, y:cy, tx:cx, ty:cy, r:26, isWord:false, isGroup:false, isCenter:true, parentId:null, data:null
  });

  // Place groups radially around center
  const groupR = Math.min(window.innerWidth, window.innerHeight) * 0.30;
  groups.forEach((g, i) => {
    const a = (i / groups.length) * Math.PI * 2 - Math.PI/2;
    const gx = cx + Math.cos(a) * groupR;
    const gy = cy + Math.sin(a) * groupR;
    // Count morphemes in this group
    const morphsInCat = nodes.filter(n => n.type!=='w' && g.cats.includes(NODE_CAT[n.id]));
    mmNodes.push({
      id:g.id, type:'group', label:g.label, meaning:morphsInCat.length+' morphemes', color:g.color,
      x:cx, y:cy, tx:gx, ty:gy, r:17, isWord:false, isGroup:true, isCenter:false,
      parentId:'_center', data:null, cats:g.cats, angle:a
    });
    mmEdges.push({from:'_center', to:g.id});
  });
}

// Collision avoidance: push children apart from each other AND away from
// existing nodes (passed as obstacles — they don't move).
// id → node map, built once per call site (mmNodes changes on expand/collapse)
function mmIndex(){ const m=new Map(); for(const n of mmNodes) m.set(n.id,n); return m; }

function mmResolveCollisions(childIds, obstacleIds){
  const byId=mmIndex();
  const children=childIds.map(id=>byId.get(id)).filter(Boolean);
  const obstacles=(obstacleIds||[]).map(id=>byId.get(id)).filter(Boolean);
  for(let iter=0;iter<12;iter++){
    // Children vs children — both move
    for(let i=0;i<children.length;i++){
      for(let j=i+1;j<children.length;j++){
        const a=children[i], b=children[j];
        const dx=a.tx-b.tx, dy=a.ty-b.ty;
        const dist=Math.sqrt(dx*dx+dy*dy);
        const labelW = a.isWord||b.isWord ? 70 : 55;
        const minDist=Math.max((a.r+b.r)*3+labelW, 30);
        if(dist<minDist && dist>0.1){
          const push=(minDist-dist)*0.55;
          const nx=dx/dist, ny=dy/dist;
          a.tx+=nx*push; a.ty+=ny*push;
          b.tx-=nx*push; b.ty-=ny*push;
        }
      }
    }
    // Children vs obstacles — only children move (full push)
    for(const c of children){
      for(const o of obstacles){
        const dx=c.tx-o.tx, dy=c.ty-o.ty;
        const dist=Math.sqrt(dx*dx+dy*dy);
        const labelW = c.isWord||o.isWord ? 70 : 55;
        const minDist=Math.max((c.r+o.r)*3+labelW, 30);
        if(dist<minDist && dist>0.1){
          const push=(minDist-dist);
          const nx=dx/dist, ny=dy/dist;
          c.tx+=nx*push; c.ty+=ny*push;
        }
      }
    }
  }
}

function expandNode(nodeId){
  if(mmExpanded.has(nodeId)) return;
  const parent = mmNodes.find(n=>n.id===nodeId);
  if(!parent) return;

  if(parent.isGroup){
    // Collapse other expanded groups first (single-group expansion)
    const expandedGroups = [...mmExpanded].filter(id => {
      const n = mmNodes.find(nn=>nn.id===id);
      return n && n.isGroup;
    });
    expandedGroups.forEach(gid => collapseNode(gid));

    mmExpanded.add(nodeId);
    const morphs = nodes.filter(n => n.type!=='w' && parent.cats.includes(NODE_CAT[n.id]));
    const count = morphs.length;
    if(!count) return;

    // Place morphemes in an arc with adaptive spacing
    const baseAngle = parent.angle || 0;
    const minSpacing = count > 15 ? 0.22 : 0.18;
    const totalSpread = Math.max(count * minSpacing, Math.PI * 0.4);
    const childR = 120 + count * 5;
    const newIds = [];

    morphs.forEach((n, i) => {
      const a = baseAngle + (i - (count-1)/2) * (totalSpread / Math.max(count-1,1));
      const tx = parent.tx + Math.cos(a) * childR;
      const ty = parent.ty + Math.sin(a) * childR;
      mmNodes.push({
        id:n.id, type:n.type, label:n.label, meaning:n.meaning, color:n.colorHex,
        x:parent.tx, y:parent.ty, tx, ty,
        r:11, isWord:false, isGroup:false, isCenter:false, parentId:nodeId, data:n,
        angle:a
      });
      mmEdges.push({from:nodeId, to:n.id});
      newIds.push(n.id);
    });
    // Avoid the center + previously-placed groups
    const obstacles = mmNodes.filter(n => (n.isCenter || n.isGroup) && !newIds.includes(n.id)).map(n=>n.id);
    mmResolveCollisions(newIds, obstacles);
  } else if(!parent.isWord && !parent.isCenter) {
    // Collapse other expanded morphemes in same group first
    const parentGroup = parent.parentId;
    const expandedSiblings = [...mmExpanded].filter(id => {
      const n = mmNodes.find(nn=>nn.id===id);
      return n && !n.isGroup && !n.isCenter && !n.isWord && n.parentId === parentGroup;
    });
    expandedSiblings.forEach(sid => collapseNode(sid));

    mmExpanded.add(nodeId);
    const morphNode = nodeMap[nodeId];
    // Show up to 12 words
    const words = morphNode && morphNode.wordList ? morphNode.wordList.filter(w=>wordVisible(w.en)).slice(0, 12) : [];
    const count = words.length;
    if(!count) return;

    // Place words in an arc pointing away from the group center.
    // Wider spread + larger radius give the collision step room to push
    // word labels off neighboring sibling morphemes.
    const baseAngle = parent.angle || 0;
    const minSpacing = 0.22;
    const totalSpread = Math.max(count * minSpacing, Math.PI * 0.5);
    const childR = 130;
    const newIds = [];

    words.forEach((w, i) => {
      const wid = 'w_'+w.en.toLowerCase().replace(/[^a-z]/g,'')+'_'+nodeId;
      if(mmNodes.find(m=>m.id===wid)) return;
      const a = baseAngle + (i - (count-1)/2) * (totalSpread / Math.max(count-1,1));
      const tx = parent.tx + Math.cos(a) * childR;
      const ty = parent.ty + Math.sin(a) * childR;
      mmNodes.push({
        id:wid, type:'w', label:w.en, meaning:shortCN(w.cn||''), color:parent.color,
        x:parent.tx, y:parent.ty, tx, ty,
        r:5, isWord:true, isGroup:false, isCenter:false, parentId:nodeId, data:null
      });
      mmEdges.push({from:nodeId, to:wid});
      newIds.push(wid);
    });
    // Avoid every existing morpheme (sibling roots, groups, center) so the
    // new word labels don't bleed into neighboring unexpanded morphemes.
    const obstacles = mmNodes.filter(n =>
      !n.isWord && n.id !== nodeId && !newIds.includes(n.id)
    ).map(n=>n.id);
    mmResolveCollisions(newIds, obstacles);
  }
}

function collapseNode(nodeId){
  if(!mmExpanded.has(nodeId)) return;
  mmExpanded.delete(nodeId);
  // Recursively remove all descendants
  const removeIds = new Set();
  function collectChildren(pid){
    mmNodes.forEach(n => {
      if(n.parentId===pid && !removeIds.has(n.id)){
        removeIds.add(n.id);
        if(mmExpanded.has(n.id)){ mmExpanded.delete(n.id); collectChildren(n.id); }
      }
    });
  }
  collectChildren(nodeId);
  mmEdges = mmEdges.filter(e => !removeIds.has(e.to));
  mmNodes = mmNodes.filter(n => !removeIds.has(n.id));
}

function drawMindmap(){
  const w = window.innerWidth, h = window.innerHeight;
  mmCtx.clearRect(0,0,w,h);
  mmCtx.save();
  mmCtx.translate(mmPan.x, mmPan.y);
  mmCtx.scale(mmZoom, mmZoom);

  // Draw edges with bezier curves
  const byId = mmIndex();
  mmEdges.forEach(e => {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if(!from||!to) return;
    mmCtx.beginPath();
    mmCtx.moveTo(from.x, from.y);
    const mx = (from.x+to.x)/2, my = (from.y+to.y)/2;
    mmCtx.quadraticCurveTo(mx + (to.y-from.y)*0.08, my - (to.x-from.x)*0.08, to.x, to.y);
    mmCtx.strokeStyle = (to.color||from.color) + '40';
    mmCtx.lineWidth = to.isWord ? 1 : 1.5;
    mmCtx.stroke();
  });

  // Draw nodes
  mmNodes.forEach(n => {
    n.x += (n.tx - n.x) * 0.1;
    n.y += (n.ty - n.y) * 0.1;
    const isHov = mmHovered && mmHovered.id === n.id;
    const isExp = mmExpanded.has(n.id);

    // Glow for non-word nodes
    if(!n.isWord){
      const glowR = n.isCenter ? n.r*2.5 : n.isGroup ? n.r*2 : n.r*2;
      const grad = mmCtx.createRadialGradient(n.x,n.y,0,n.x,n.y,glowR);
      grad.addColorStop(0, n.color + (n.isCenter?'18':'20'));
      grad.addColorStop(1, n.color + '00');
      mmCtx.beginPath(); mmCtx.arc(n.x,n.y,glowR,0,Math.PI*2); mmCtx.fillStyle=grad; mmCtx.fill();
    }

    // Node circle
    const rad = isHov ? n.r*1.3 : n.r;
    mmCtx.beginPath(); mmCtx.arc(n.x, n.y, rad, 0, Math.PI*2);
    if(n.isCenter){
      const cg=mmCtx.createRadialGradient(n.x,n.y,0,n.x,n.y,rad);
      cg.addColorStop(0,'rgba(0,229,255,0.3)'); cg.addColorStop(1,'rgba(105,240,174,0.1)');
      mmCtx.fillStyle=cg;
    } else {
      mmCtx.fillStyle = n.isWord ? n.color+'70' : n.color + (n.isGroup?'cc':'');
    }
    mmCtx.fill();
    if(isExp){ mmCtx.strokeStyle=n.color+'80'; mmCtx.lineWidth=1.5; mmCtx.stroke(); }

    // morpheme icon (kid theme) or "+" indicator for expandable nodes
    const kid=document.body.classList.contains('kid');
    if(kid && !n.isWord && !n.isCenter && !n.isGroup){
      mmCtx.font=Math.round(n.r*1.25)+"px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; mmCtx.textAlign='center'; mmCtx.textBaseline='middle';
      mmCtx.fillText(morphIcon(n.id), n.x, n.y+1);
    } else if(!n.isWord && !n.isCenter && !isExp){
      mmCtx.font="bold "+Math.round(n.r*0.9)+"px sans-serif"; mmCtx.fillStyle='rgba(255,255,255,0.6)';
      mmCtx.textAlign='center'; mmCtx.textBaseline='middle';
      mmCtx.fillText('+', n.x, n.y);
    }
    if(isExp && !n.isCenter){
      mmCtx.font="bold "+Math.round(n.r*0.9)+"px sans-serif"; mmCtx.fillStyle='rgba(255,255,255,0.5)';
      mmCtx.textAlign='center'; mmCtx.textBaseline='middle';
      mmCtx.fillText('−', n.x, n.y);
    }

    // Label
    mmCtx.textBaseline='alphabetic';
    if(n.isCenter){
      mmCtx.font="600 18px -apple-system,sans-serif"; mmCtx.fillStyle='rgba(255,255,255,0.85)';
      mmCtx.textAlign='center';
      n.label.split('\n').forEach((line,li)=>mmCtx.fillText(line, n.x, n.y-n.r-10+li*20));
    } else if(n.isGroup){
      mmCtx.font="600 14px -apple-system,sans-serif"; mmCtx.fillStyle=isHov?'#fff':n.color;
      mmCtx.textAlign='center';
      const lines=n.label.split('\n'); const top=n.y-n.r-10-(lines.length-1)*17;
      lines.forEach((line,li)=>{ mmCtx.font=li===0?"600 15px -apple-system,sans-serif":"400 12px 'PingFang SC','Microsoft YaHei',sans-serif"; mmCtx.fillStyle=isHov?'#fff':(li===0?n.color:'rgba(255,255,255,0.55)'); mmCtx.fillText(line, n.x, top+li*17); });
    } else if(n.isWord){
      mmCtx.font="400 12px -apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',system-ui,sans-serif"; mmCtx.fillStyle=isHov?'#fff':'rgba(255,255,255,0.7)';
      mmCtx.textAlign='center'; mmCtx.fillText(n.label, n.x, n.y-n.r-4);
    } else {
      mmCtx.font="500 13px 'SF Mono',monospace"; mmCtx.fillStyle=isHov?'#fff':n.color;
      mmCtx.textAlign='center'; mmCtx.fillText(n.label, n.x, n.y-n.r-5);
      // Show word count
      mmCtx.font="400 10px sans-serif"; mmCtx.fillStyle='rgba(255,255,255,0.35)';
      const wc = nodeMap[n.id]?nodeMap[n.id].wordCount:0;
      if(wc) mmCtx.fillText(wc+' words', n.x, n.y+n.r+13);
    }

    // Hover meaning
    if(isHov && n.meaning && !n.isCenter){
      mmCtx.font="400 12px 'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif"; mmCtx.fillStyle='rgba(255,255,255,0.55)';
      mmCtx.textAlign='center'; mmCtx.fillText(n.meaning, n.x, n.y+n.r+15);
    }
  });

  mmCtx.restore();
}

let mmNeedsRedraw=true;
function mmRequestRedraw(){ mmNeedsRedraw=true; }
function animateMindmap(){
  if(currentView !== '2d') return;
  // Check if nodes are still animating toward targets
  let animating=mmNeedsRedraw;
  if(!animating){
    for(let i=0;i<mmNodes.length;i++){
      const n=mmNodes[i];
      if(Math.abs(n.x-n.tx)>0.5||Math.abs(n.y-n.ty)>0.5){ animating=true; break; }
    }
  }
  if(animating||mmDragging){ drawMindmap(); mmNeedsRedraw=false; }
  mmAnimFrame = requestAnimationFrame(animateMindmap);
}

function mmHitTest(mx, my){
  const x = (mx - mmPan.x) / mmZoom;
  const y = (my - mmPan.y) / mmZoom;
  for(let i=mmNodes.length-1;i>=0;i--){
    const n = mmNodes[i];
    const dx = n.x-x, dy = n.y-y;
    // Word nodes: use wider hit area (label is wider than circle)
    const hitR = n.isWord ? Math.max(n.r+10, n.label.length*3.5) : n.r+6;
    if(dx*dx+dy*dy < hitR*hitR) return n;
  }
  return null;
}

// Mindmap mouse events
mindmapCanvas.addEventListener('mousemove', e => {
  if(mmDragging){
    mmPan.x = mmPanStart.x + (e.clientX - mmDragStart.x);
    mmPan.y = mmPanStart.y + (e.clientY - mmDragStart.y);
    return;
  }
  const found = mmHitTest(e.clientX, e.clientY);
  if(mmHovered!==found){ mmHovered=found; mmRequestRedraw(); }
  mindmapCanvas.style.cursor = found ? 'pointer' : 'grab';
});

mindmapCanvas.addEventListener('mousedown', e => {
  mmDragging = true;
  mmDragStart = {x:e.clientX, y:e.clientY};
  mmPanStart = {x:mmPan.x, y:mmPan.y};
  mindmapCanvas.style.cursor = 'grabbing';
});

mindmapCanvas.addEventListener('mouseup', e => {
  const dx = e.clientX - mmDragStart.x, dy = e.clientY - mmDragStart.y;
  mmDragging = false;
  mindmapCanvas.style.cursor = 'grab';
  if(Math.abs(dx)<8 && Math.abs(dy)<8){
    // Click
    const found = mmHitTest(e.clientX, e.clientY);
    if(found){
      if(found.isWord){
        showWordDetail(found.label, e.clientX, e.clientY);
      } else if(found.isGroup || found.isCenter){
        if(mmExpanded.has(found.id)) collapseNode(found.id);
        else expandNode(found.id);
      } else {
        // Morpheme node: show tooltip AND expand
        if(!mmExpanded.has(found.id)) expandNode(found.id);
        if(found.data && nodeMap[found.data.id]){
          pinNode(nodeMap[found.data.id]);
        }
      }
    } else {
      if(pinnedNode){ unpinNode(); }
    }
  }
});

mindmapCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const mx = e.clientX, my = e.clientY;
  mmPan.x = mx - (mx - mmPan.x) * delta;
  mmPan.y = my - (my - mmPan.y) * delta;
  mmZoom *= delta;
  mmZoom = Math.max(0.3, Math.min(3, mmZoom));
  mmRequestRedraw();
}, {passive:false});

// Touch support for mindmap
let mmTouchStart = {x:0,y:0,time:0,isDrag:false};
mindmapCanvas.addEventListener('touchstart', e => {
  if(e.touches.length===1){
    mmTouchStart = {x:e.touches[0].clientX, y:e.touches[0].clientY, time:Date.now(), isDrag:false};
    mmDragStart = {x:e.touches[0].clientX, y:e.touches[0].clientY};
    mmPanStart = {x:mmPan.x, y:mmPan.y};
  }
}, {passive:true});
mindmapCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if(e.touches.length===1){
    mmTouchStart.isDrag = true;
    mmPan.x = mmPanStart.x + (e.touches[0].clientX - mmDragStart.x);
    mmPan.y = mmPanStart.y + (e.touches[0].clientY - mmDragStart.y);
  }
}, {passive:false});
mindmapCanvas.addEventListener('touchend', e => {
  if(!mmTouchStart.isDrag && Date.now()-mmTouchStart.time<300){
    const found = mmHitTest(mmTouchStart.x, mmTouchStart.y);
    if(found){
      if(found.isWord){
        showWordDetail(found.label, mmTouchStart.x, mmTouchStart.y);
      } else if(found.isGroup || found.isCenter){
        if(mmExpanded.has(found.id)) collapseNode(found.id); else expandNode(found.id);
      } else {
        if(!mmExpanded.has(found.id)) expandNode(found.id);
        if(found.data && nodeMap[found.data.id]) pinNode(nodeMap[found.data.id]);
      }
    } else {
      if(pinnedNode) unpinNode();
    }
  }
});

window.addEventListener('resize', ()=>{
  if(currentView==='2d') resizeMindmap();
});
