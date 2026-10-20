// Startup sequence.
// Classic script: shares the global scope with the other files in src/ (load order matters, see index.html).

function init(){
  const bar=document.getElementById('load-bar'), status=document.getElementById('load-status');
  bar.style.width='30%'; status.textContent='装载 '+WORD_DATA.size+' 个单词和 206 块积木…';
  buildGraph(); nodes.forEach(n=>indexNode(n)); buildWordReverse();
  bar.style.width='70%'; status.textContent='把积木摆上架…';
  setTimeout(()=>{
    wsRender();
    bar.style.width='100%';
    setTimeout(startIntro,250);
  },60);
}
init();
