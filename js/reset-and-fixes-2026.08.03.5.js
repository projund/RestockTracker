(() => {
  const BUILD='2026.08.03.5';
  const RESET_KEY='crt-clean-build';
  const storageKeys=['crt-v4-products','crt-v4-sightings','crt-v4-schedules','crt-v4-restockActivity','crt-v4-scheduleChangeRequests','crt-hidden','crt-layout','crt-app-data-version','crt-preserved-watch-ids'];

  if(localStorage.getItem(RESET_KEY)!==BUILD){
    let products=[];
    try{products=JSON.parse(localStorage.getItem('crt-v4-products')||'[]')}catch{}
    products=products.filter(p=>p&&String(p.id||'').startsWith('catalog-')&&p.category).map(p=>({...p,favorite:false,hidden:false,active:true}));
    storageKeys.forEach(key=>localStorage.removeItem(key));
    localStorage.setItem('crt-v4-products',JSON.stringify(products));
    const now=Date.now();
    const sighting=(id,productId,storeId,status,quantity,hours,location,notes)=>({
      id,productId,storeId,status,quantity,quantityKnown:Number.isFinite(quantity),seenAt:new Date(now-hours*3600000).toISOString(),reporter:'Test User',inStoreLocation:location,
      source:'Manual sighting',pickup:'',shipping:'',productLink:'',inStore:status==='out-of-stock'?'unavailable':'available',confidence:'High',notes,photo:'',updates:[]
    });
    const ids=new Set(products.map(p=>p.id));
    const tests=[
      sighting('test-tcg-1','catalog-tcg-1','target-1115','in-stock',6,.4,'Collectibles wall','Fresh test sighting using Category → Game → Set → Product type.'),
      sighting('test-tcg-2','catalog-tcg-17','walmart-400','low-stock',2,.8,'Trading cards near registers','Fresh test sighting for a second Pokémon set.'),
      sighting('test-squishy-1','catalog-needoh-24','target-684','in-stock',4,.6,'Toy aisle endcap','Fresh NeeDoh test sighting using Category → Brand → Product.'),
      sighting('test-bey-1','catalog-bey-wave1-1','walmart-3213','in-stock',5,.3,'Beyblade shelf','Fresh Wave 1 Beyblade test sighting using Category → Item.'),
      sighting('test-bey-2','catalog-bey-wave1-9','target-2865','low-stock',1,1.1,'Toy aisle','Fresh Wave 1 dual-pack test sighting.')
    ].filter(s=>ids.has(s.productId));
    localStorage.setItem('crt-v4-sightings',JSON.stringify(tests));
    localStorage.setItem('crt-v4-schedules','[]');
    localStorage.setItem('crt-v4-restockActivity','[]');
    localStorage.setItem('crt-v4-scheduleChangeRequests','[]');
    localStorage.setItem(RESET_KEY,BUILD);
  }

  function closeNav(){
    document.body.classList.remove('nav-open');
    const sidebar=document.getElementById('sidebar');
    const backdrop=document.getElementById('navBackdrop');
    const button=document.getElementById('mobileMenuBtn');
    sidebar?.classList.remove('open');backdrop?.classList.remove('show');
    if(button){button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open menu');button.textContent='☰';}
  }
  closeNav();
  window.addEventListener('pageshow',closeNav);
  document.addEventListener('click',event=>{
    const button=event.target.closest('#mobileMenuBtn');
    if(button) requestAnimationFrame(()=>{const open=document.body.classList.contains('nav-open')||document.getElementById('sidebar')?.classList.contains('open');button.textContent=open?'×':'☰';button.setAttribute('aria-label',open?'Close menu':'Open menu');});
    if(event.target.closest('#nav [data-view]')) closeNav();
  },true);

  function patchWizard(){
    const form=document.getElementById('sightingForm');
    const category=form?.elements.wizardCategory;
    const secondary=form?.elements.wizardSecondary;
    const set=form?.elements.wizardSet;
    const product=form?.elements.productId;
    const steps=form?[...form.querySelectorAll('.wizard-step')]:[];
    if(!form||!category||!secondary||!set||!product||steps.length<4) return false;
    if(form.dataset.resetFlowPatched) return true;
    form.dataset.resetFlowPatched='true';

    const allProducts=()=>{try{return JSON.parse(localStorage.getItem('crt-v4-products')||'[]').filter(p=>p.active!==false)}catch{return[]}};
    const clearLaterFields=()=>{['storeId','source','pickup','shipping','productLink','status','quantity','inStoreLocation','inStore','confidence','notes'].forEach(name=>{const field=form.elements[name];if(!field)return;if(field.tagName==='SELECT')field.selectedIndex=0;else field.value='';});};
    const fillBeyblades=()=>{
      product.innerHTML='<option value="">Choose a Beyblade item</option>';
      allProducts().filter(p=>p.category==='Beyblade'&&p.beyModel&&p.beyModel!=='Other').sort((a,b)=>a.beyModel.localeCompare(b.beyModel)).forEach(p=>product.add(new Option(p.beyModel,p.id)));
      product.add(new Option('Other','__missing__'));
      product.required=true;
      const label=product.closest('label');if(label){const span=label.querySelector('span');if(span)span.textContent='Beyblade item';}
      steps[3].querySelector('h3').textContent='Beyblade item';
    };
    const syncCategory=()=>{
      product.value='';set.value='';secondary.value='';clearLaterFields();
      const bey=category.value==='Beyblade';
      steps[1].dataset.skipped=String(bey);steps[2].dataset.skipped=String(category.value!=='TCG');
      secondary.required=!bey;set.required=category.value==='TCG';
      if(bey) setTimeout(fillBeyblades,0);
    };
    const syncSecondary=()=>{set.value='';product.value='';clearLaterFields();};
    const syncSet=()=>{product.value='';clearLaterFields();};
    category.addEventListener('change',syncCategory);
    secondary.addEventListener('change',syncSecondary);
    set.addEventListener('change',syncSet);
    syncCategory();
    return true;
  }
  const timer=setInterval(()=>{if(patchWizard())clearInterval(timer);},50);
  setTimeout(()=>clearInterval(timer),6000);

  const observer=new MutationObserver(()=>document.querySelectorAll('.no-sightings').forEach(node=>node.remove()));
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();