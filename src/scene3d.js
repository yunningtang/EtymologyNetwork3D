// 3D scene: Three.js renderer, stars, edges, glow/node point sprites, 2D label overlay, camera.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  THREE.JS SETUP
// ============================================================
let scene, camera, renderer;
let edgeGeom, glowGeom, nodeGeom;
let edgeMesh, glowMesh, nodeMesh;
let edgeColors, glowColors, glowSizes, nodeColors, nodeSizes, nodeAlphas;

// Colors are now per-node (assigned in buildGraph via CAT_META)

// Camera system — lerp-based smooth motion
let cam = { theta:0, phi:Math.PI/2, dist:500 }; // current
let camT = { theta:0, phi:Math.PI/2, dist:175 }; // target
const LERP_SPEED = 0.055;

function lerp(a,b,t){ return a+(b-a)*t; }
function lerpAngle(a,b,t){ let d=b-a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return a+d*t; }
function updateCamera(){
  cam.theta=lerpAngle(cam.theta,camT.theta,LERP_SPEED);
  cam.phi=lerp(cam.phi,camT.phi,LERP_SPEED);
  cam.dist=lerp(cam.dist,camT.dist,LERP_SPEED);
  camera.position.x=cam.dist*Math.sin(cam.phi)*Math.sin(cam.theta);
  camera.position.y=cam.dist*Math.cos(cam.phi);
  camera.position.z=cam.dist*Math.sin(cam.phi)*Math.cos(cam.theta);
  camera.lookAt(0,0,0);
}

function initThree(){
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,1,1000);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0x06090F,0); // transparent: the CSS nebula gradient on <body> shows through
  renderer.domElement.id='three-canvas';
  document.body.insertBefore(renderer.domElement,document.body.firstChild);
  buildStars(); buildEdges(); buildGlow(); buildNodes();
}

function buildStars(){
  // Two star layers: a dense faint field and a sparse brighter one
  const layer=(n,spread,size,opacity)=>{
    const pos=new Float32Array(n*3);
    for(let i=0;i<n;i++){pos[i*3]=(Math.random()-0.5)*spread;pos[i*3+1]=(Math.random()-0.5)*spread;pos[i*3+2]=(Math.random()-0.5)*spread;}
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size,transparent:true,opacity,sizeAttenuation:true,depthWrite:false})));
  };
  layer(1600,900,0.55,0.28); layer(220,700,1.4,0.5);
}

function buildEdges(){
  const pos=new Float32Array(edges.length*6), col=new Float32Array(edges.length*6); edgeColors=col;
  edges.forEach((e,i)=>{
    const a=nodeMap[e.source],b=nodeMap[e.target],i6=i*6;
    pos[i6]=a.x;pos[i6+1]=a.y;pos[i6+2]=a.z; pos[i6+3]=b.x;pos[i6+4]=b.y;pos[i6+5]=b.z;
    col[i6]=a.color.r;col[i6+1]=a.color.g;col[i6+2]=a.color.b; col[i6+3]=b.color.r;col[i6+4]=b.color.g;col[i6+5]=b.color.b;
  });
  edgeGeom=new THREE.BufferGeometry();
  edgeGeom.setAttribute('position',new THREE.BufferAttribute(pos,3));
  edgeGeom.setAttribute('color',new THREE.BufferAttribute(col,3));
  edgeMesh=new THREE.LineSegments(edgeGeom,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.4,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.add(edgeMesh);
}

function buildGlow(){
  const pos=new Float32Array(nodes.length*3),col=new Float32Array(nodes.length*3),siz=new Float32Array(nodes.length);
  glowColors=col; glowSizes=siz;
  nodes.forEach((n,i)=>{
    pos[i*3]=n.x;pos[i*3+1]=n.y;pos[i*3+2]=n.z;
    col[i*3]=n.color.r;col[i*3+1]=n.color.g;col[i*3+2]=n.color.b;
    siz[i]=n.baseSize*2.6;
  });
  glowGeom=new THREE.BufferGeometry();
  glowGeom.setAttribute('position',new THREE.BufferAttribute(pos,3));
  glowGeom.setAttribute('color',new THREE.BufferAttribute(col,3));
  glowGeom.setAttribute('size',new THREE.BufferAttribute(siz,1));
  glowMesh=new THREE.Points(glowGeom,new THREE.ShaderMaterial({
    vertexShader:`attribute float size;varying vec3 vColor;void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(220.0/-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-vec2(0.5))*2.0;if(d>1.0)discard;float a=0.42*pow(1.0-d,2.2)+0.08*(1.0-d);gl_FragColor=vec4(vColor,a);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true
  }));
  scene.add(glowMesh);
}

function buildNodes(){
  const pos=new Float32Array(nodes.length*3),col=new Float32Array(nodes.length*3),siz=new Float32Array(nodes.length),alp=new Float32Array(nodes.length),kind=new Float32Array(nodes.length),seed=new Float32Array(nodes.length);
  nodeColors=col; nodeSizes=siz; nodeAlphas=alp;
  const KIND={p:0,r:1,s:2};
  nodes.forEach((n,i)=>{
    pos[i*3]=n.x;pos[i*3+1]=n.y;pos[i*3+2]=n.z;
    col[i*3]=n.color.r;col[i*3+1]=n.color.g;col[i*3+2]=n.color.b;
    siz[i]=n.baseSize; alp[i]=1.0; kind[i]=KIND[n.type]||0;
    // deterministic per-morpheme seed so every planet keeps its own look between visits
    let h=0; for(const ch of n.id) h=(h*31+ch.charCodeAt(0))>>>0; seed[i]=(h%1000)/1000;
  });
  nodeGeom=new THREE.BufferGeometry();
  nodeGeom.setAttribute('position',new THREE.BufferAttribute(pos,3));
  nodeGeom.setAttribute('color',new THREE.BufferAttribute(col,3));
  nodeGeom.setAttribute('size',new THREE.BufferAttribute(siz,1));
  nodeGeom.setAttribute('alpha',new THREE.BufferAttribute(alp,1));
  nodeGeom.setAttribute('kind',new THREE.BufferAttribute(kind,1));
  nodeGeom.setAttribute('seed',new THREE.BufferAttribute(seed,1));
  // Every morpheme is a small procedural planet, shaded as a lit sphere (diffuse +
  // specular + rim). The three morpheme types get three planet families:
  //   prefixes  → ringed planets (a tilted ring, front half drawn over the sphere)
  //   roots     → gas giants with slowly drifting cloud bands
  //   suffixes  → cratered moons
  // The sprite is 1.9× the sphere so rings have room; seed varies tilt/bands/craters.
  nodeMesh=new THREE.Points(nodeGeom,new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uCartoon:{value:1}},
    vertexShader:`attribute float size;attribute float alpha;attribute float kind;attribute float seed;
      varying vec3 vColor;varying float vAlpha;varying float vKind;varying float vSeed;
      void main(){vColor=color;vAlpha=alpha;vKind=kind;vSeed=seed;vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=size*1.9*(200.0/-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uTime;uniform float uCartoon;varying vec3 vColor;varying float vAlpha;varying float vKind;varying float vSeed;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 uv=gl_PointCoord*2.0-1.0;            // sprite space, [-1,1]
        float R=0.53;                             // sphere radius inside the sprite
        vec2 p=uv/R; float r2=dot(p,p);
        float tilt=0.6+vSeed*1.2;                 // ring / band tilt
        mat2 rot=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt));
        vec3 L=normalize(vec3(-0.55,0.65,0.75));
        vec4 outc=vec4(0.0);
        // ---- ring (prefixes): ellipse around the sphere, back half hidden behind it
        float ringA=0.0; vec3 ringC=vec3(0.0);
        if(vKind<0.5){
          vec2 q=rot*uv; float e=sqrt(q.x*q.x/(0.95*0.95)+q.y*q.y/(0.36*0.36));
          float band=smoothstep(0.68,0.74,e)*(1.0-smoothstep(0.96,1.0,e));
          float grooves=0.75+0.25*sin(e*60.0+vSeed*20.0);
          bool front=q.y>0.0;                     // lower half of the tilted ring is in front
          float lit=0.55+0.45*max(dot(normalize(vec3(q.x,-q.y,0.4)),L),0.0);
          ringA=band*grooves*(front||r2>1.0?1.0:0.0)*0.85;
          ringC=mix(vColor,vec3(1.0),0.35)*lit;
        }
        // ---- sphere
        if(r2<=1.0){
          float z=sqrt(1.0-r2); vec3 nrm=vec3(p.x,-p.y,z);
          float diff=max(dot(nrm,L),0.0);
          float spec=pow(max(dot(reflect(-L,nrm),vec3(0.0,0.0,1.0)),0.0),30.0);
          float rim=pow(1.0-z,2.5);
          vec3 base=vColor;
          if(vKind<0.5){                         // prefix: smooth planet with a soft equatorial haze
            float lat=(rot*p).y; base*=0.9+0.1*sin(lat*4.0+vSeed*6.0);
          } else if(vKind<1.5){                  // root: drifting cloud bands
            float lat=(rot*p).y*1.0;
            float bands=sin(lat*9.0+vSeed*12.0+uTime*0.15+noise(vec2(lat*3.0,p.x*1.5+uTime*0.05))*1.6);
            base*=0.78+0.26*bands;
            float storm=smoothstep(0.80,0.98,noise(p*2.5+vSeed*10.0+vec2(uTime*0.02,0.0)));
            base=mix(base,mix(base,vec3(1.0),0.6),storm*0.5);
          } else {                               // suffix: cratered moon, a little desaturated
            float g=dot(base,vec3(0.33)); base=mix(base,vec3(g),0.25);
            float cr=noise(p*5.0+vSeed*30.0); float crater=smoothstep(0.58,0.72,cr);
            base*=1.0-0.35*crater; diff*=1.0-0.25*crater;
          }
          vec3 col=base*(0.28+0.82*diff)+vec3(1.0)*spec*0.5+vColor*rim*1.0;
          if(uCartoon>0.5){                      // cel shading: 3 light steps, big soft highlight, ink outline
            float steps=floor(diff*3.0+0.5)/3.0;
            col=base*(0.45+0.65*steps)+vec3(1.0)*smoothstep(0.55,0.95,spec)*0.7;
            float hl=smoothstep(0.30,0.0,length(p-vec2(-0.38,-0.38)));
            col=mix(col,vec3(1.0),hl*0.35);
            col=mix(col,vec3(0.10,0.11,0.25),smoothstep(0.80,0.98,r2)*0.85);
          }
          float edge=1.0-smoothstep(0.84,1.0,r2);
          outc=vec4(col,edge);
        }
        // composite ring over/under the sphere
        vec3 c=mix(outc.rgb,ringC,ringA*(1.0-outc.a*0.0));
        float a=max(outc.a,ringA);
        if(ringA>0.0 && outc.a>0.0) c=mix(outc.rgb,ringC,ringA);
        if(a<0.01) discard;
        gl_FragColor=vec4(c,a*vAlpha);
      }`,
    transparent:true,depthWrite:false,blending:THREE.NormalBlending,vertexColors:true
  }));
  scene.add(nodeMesh);
}

// ============================================================
//  LABEL RENDERER (2D canvas overlay for morpheme labels)
// ============================================================
const labelCanvas=document.getElementById('label-canvas');
const labelCtx=labelCanvas.getContext('2d');
const dpr=Math.min(window.devicePixelRatio||1,2);
function resizeLabels(){
  labelCanvas.width=window.innerWidth*dpr; labelCanvas.height=window.innerHeight*dpr;
  labelCanvas.style.width=window.innerWidth+'px'; labelCanvas.style.height=window.innerHeight+'px';
  labelCtx.setTransform(dpr,0,0,dpr,0,0);
}
const projVec=new THREE.Vector3();
function renderLabels(){
  labelCtx.clearRect(0,0,window.innerWidth,window.innerHeight);
  if(cam.dist>280) return;
  const cx=camera.position.x,cy=camera.position.y,cz=camera.position.z;
  nodes.forEach(n=>{
    if(n.type==='w') return;
    if(highlightSet && !highlightSet.has(n.id)) return;
    projVec.set(n.x,n.y,n.z); projVec.project(camera);
    if(projVec.z>1) return;
    const sx=(projVec.x+1)/2*window.innerWidth, sy=(-projVec.y+1)/2*window.innerHeight;
    if(sx<-50||sx>window.innerWidth+50||sy<-20||sy>window.innerHeight+20) return;
    const dx=n.x-cx,dy=n.y-cy,dz=n.z-cz, d=Math.sqrt(dx*dx+dy*dy+dz*dz);
    const alpha=Math.max(0,Math.min(1,1-(d-100)/150));
    if(alpha<0.05) return;
    labelCtx.font="600 14px 'SF Mono',ui-monospace,Menlo,Consolas,monospace";
    labelCtx.fillStyle=n.colorHex; labelCtx.globalAlpha=alpha*0.85;
    labelCtx.textAlign='center'; labelCtx.lineJoin='round'; labelCtx.lineWidth=3; labelCtx.strokeStyle='rgba(6,9,15,0.85)';
    const off=14+n.baseSize*0.9*(200/Math.max(40,d));
    labelCtx.strokeText(n.label,sx,sy-off); labelCtx.fillText(n.label,sx,sy-off);
  });
  labelCtx.globalAlpha=1;
}

// ============================================================
//  HIGHLIGHT SYSTEM
// ============================================================
let highlightSet=null, hoveredNode=null, pinnedNode=null;
let searchQuery='', filterType='all';
let searchResults=[], sdActiveIdx=-1, searchDebounce=null;
let filterCats = new Set();
let autoRotate=true, lastInteraction=Date.now();
const IDLE_TIMEOUT=5000;
