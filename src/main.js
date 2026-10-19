// Startup sequence.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  INIT
// ============================================================
function init(){
  const bar=document.getElementById('load-bar'), status=document.getElementById('load-status');
  bar.style.width='20%'; status.textContent='Loading '+WORD_DATA.size+' words & 200+ morphemes...';
  buildGraph(); nodes.forEach(n=>indexNode(n)); buildWordReverse();
  bar.style.width='40%'; status.textContent='Building morpheme network...';
  initPositions();
  setTimeout(()=>{
    bar.style.width='50%'; status.textContent='Computing layout (1/2)...';
    setTimeout(()=>{
      runSimulation(50);
      bar.style.width='70%'; status.textContent='Computing layout (2/2)...';
      setTimeout(()=>{
        runSimulation(50);
        bar.style.width='85%'; status.textContent='Rendering...';
        setTimeout(()=>{
          initThree(); resizeLabels();
          bar.style.width='100%';
          setTimeout(()=>{ startIntro(); animate(); },300);
        },50);
      },50);
    },50);
  },50);
}

init();
