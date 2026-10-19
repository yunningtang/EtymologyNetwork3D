// Startup sequence.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

// ============================================================
//  INIT
// ============================================================
function init(){
  const bar=document.getElementById('load-bar'), status=document.getElementById('load-status');
  bar.style.width='20%'; status.textContent='装载 '+WORD_DATA.size+' 个单词和 206 个词根…';
  buildGraph(); nodes.forEach(n=>indexNode(n)); buildWordReverse();
  bar.style.width='40%'; status.textContent='连接词根之间的航线…';
  initPositions();
  setTimeout(()=>{
    bar.style.width='50%'; status.textContent='给星球找位置 (1/2)…';
    setTimeout(()=>{
      runSimulation(50);
      bar.style.width='70%'; status.textContent='给星球找位置 (2/2)…';
      setTimeout(()=>{
        runSimulation(50);
        bar.style.width='85%'; status.textContent='点火…';
        setTimeout(()=>{
          initThree(); resizeLabels(); if(window.applyTheme) applyTheme();
          bar.style.width='100%';
          setTimeout(()=>{ startIntro(); animate(); },300);
        },50);
      },50);
    },50);
  },50);
}

init();
