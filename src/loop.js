// Main render loop (3D view).
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  MAIN LOOP
// ============================================================
let ttDragged=false; // set by drag handler to prevent auto-reposition
let _animLF=0;
function animate(){
  requestAnimationFrame(animate);
  if(document.hidden) return;
  if(currentView!=='3d') return; // skip 3D rendering in 2D mode

  // Idle auto-rotate resume
  if(appState==='active'&&!autoRotate&&!pinnedNode&&Date.now()-lastInteraction>IDLE_TIMEOUT){
    autoRotate=true;
  }
  if(autoRotate&&appState==='active') camT.theta+=0.0008;

  updateCamera();
  updateIntro();

  // Pinned tooltip follows node (only if not manually dragged)
  if(pinnedNode && !ttDragged && !pinnedNode.isVirtual){
    projVec.set(pinnedNode.x,pinnedNode.y,pinnedNode.z); projVec.project(camera);
    const sx=(projVec.x+1)/2*window.innerWidth, sy=(-projVec.y+1)/2*window.innerHeight;
    positionTooltip(sx,sy);
  }

  if(nodeMesh) nodeMesh.material.uniforms.uTime.value=performance.now()/1000;
  renderer.render(scene,camera);
  if(++_animLF%2===0||highlightSet) renderLabels();
}

// ============================================================
//  INIT
// ============================================================
