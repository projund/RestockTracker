(() => {
  let enhancing=false;

  function actionType(button){
    const text=button.textContent.trim().toLowerCase();
    if(text.includes('suggest schedule')) return 'schedule';
    if(text.includes('report restock')) return 'report';
    if(text.includes('hide from my view')) return 'hide';
    return '';
  }

  function removeInlineClose(content){
    [...content.querySelectorAll('button')].forEach(button=>{
      const text=button.textContent.trim().toLowerCase();
      if(text==='close' || (button.classList.contains('close') && text!=='×')) button.remove();
    });
  }

  function enhanceDetail(){
    if(enhancing) return;
    const dialog=document.getElementById('detailDialog');
    const content=document.getElementById('detailContent');
    if(!dialog||!content||!dialog.open) return;
    enhancing=true;
    try{
      let close=dialog.querySelector('.detail-close-fixed');
      if(!close){
        close=document.createElement('button');
        close.type='button';
        close.className='detail-close-fixed';
        close.setAttribute('aria-label','Close details');
        close.textContent='×';
        close.onclick=()=>dialog.close();
        dialog.prepend(close);
      }

      removeInlineClose(content);

      const originals={};
      [...content.querySelectorAll('button')].forEach(button=>{
        const type=actionType(button);
        if(!type) return;
        if(!originals[type]){
          originals[type]=button;
          button.hidden=true;
          button.dataset.detailActionOriginal=type;
        }else{
          button.remove();
        }
      });

      let menu=dialog.querySelector('.detail-actions-menu');
      if(!menu){
        menu=document.createElement('details');
        menu.className='detail-actions-menu';
        const summary=document.createElement('summary');
        summary.setAttribute('aria-label','More actions');
        summary.textContent='⋮';
        const pop=document.createElement('div');
        pop.className='detail-actions-popover';
        menu.append(summary,pop);
        dialog.insertBefore(menu,content);
      }

      const pop=menu.querySelector('.detail-actions-popover');
      pop.innerHTML='';
      const labels={schedule:'Suggest schedule change',report:'Report restock activity',hide:'Hide from my view'};
      ['schedule','report','hide'].forEach(type=>{
        const original=originals[type]||content.querySelector(`[data-detail-action-original="${type}"]`);
        if(!original) return;
        const proxy=document.createElement('button');
        proxy.type='button';
        proxy.className=original.className;
        proxy.removeAttribute('hidden');
        proxy.textContent=labels[type];
        proxy.onclick=event=>{
          event.preventDefault();
          menu.removeAttribute('open');
          original.click();
        };
        pop.append(proxy);
      });

      if(!pop.children.length) menu.remove();
    }finally{
      enhancing=false;
    }
  }

  const observer=new MutationObserver(()=>queueMicrotask(enhanceDetail));
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});

  document.getElementById('detailDialog')?.addEventListener('close',()=>{
    document.querySelector('#detailDialog .detail-close-fixed')?.remove();
    document.querySelector('#detailDialog .detail-actions-menu')?.remove();
  });
})();