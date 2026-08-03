(() => {
  function enhanceDetail(){
    const dialog=document.getElementById('detailDialog');
    const content=document.getElementById('detailContent');
    if(!dialog||!content||!dialog.open)return;
    let close=dialog.querySelector('.detail-close-fixed');
    if(!close){
      close=document.createElement('button');close.type='button';close.className='detail-close-fixed';close.setAttribute('aria-label','Close details');close.textContent='×';close.onclick=()=>dialog.close();dialog.prepend(close);
    }
    const candidates=[...content.querySelectorAll('button')].filter(button=>{
      const text=button.textContent.trim().toLowerCase();
      return text.includes('suggest schedule')||text.includes('report restock')||text.includes('hide from my view');
    });
    const unique=[];const seen=new Set();
    candidates.forEach(button=>{const key=button.textContent.trim().toLowerCase();if(seen.has(key)){button.classList.add('duplicate-action');return;}seen.add(key);unique.push(button)});
    if(!unique.length)return;
    let menu=dialog.querySelector('.detail-actions-menu');
    if(!menu){
      menu=document.createElement('details');menu.className='detail-actions-menu';
      const summary=document.createElement('summary');summary.setAttribute('aria-label','More actions');summary.textContent='⋮';
      const pop=document.createElement('div');pop.className='detail-actions-popover';menu.append(summary,pop);dialog.insertBefore(menu,content);
    }
    const pop=menu.querySelector('.detail-actions-popover');
    unique.forEach(button=>{button.dataset.uiMoved='true';pop.append(button)});
    pop.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>menu.removeAttribute('open'),{once:false}));
  }
  const observer=new MutationObserver(()=>enhanceDetail());observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  document.getElementById('detailDialog')?.addEventListener('close',()=>{
    document.querySelector('#detailDialog .detail-close-fixed')?.remove();
    document.querySelector('#detailDialog .detail-actions-menu')?.remove();
  });
})();