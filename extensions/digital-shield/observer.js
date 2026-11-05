/* No URL, content, pointer/key data or browsing history is sent. The worker derives the granted domain. */
(() => {
  if(window.top!==window)return;
  let pending=false;
  async function sample(){
    if(pending||document.hidden||!document.hasFocus())return;
    pending=true;
    try{await chrome.runtime.sendMessage({protocol:1,id:crypto.randomUUID(),command:'observe'});}catch{}finally{pending=false;}
  }
  setInterval(sample,1000);
  document.addEventListener('visibilitychange',sample);
  window.addEventListener('focus',sample);
})();
