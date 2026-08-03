const BUILD_VERSION = '2026.08.03.1';
const APP_DATA_VERSION = '2026.08.03.1';
const HIDDEN_KEY = 'crt-hidden';
const DATA_VERSION_KEY = 'crt-app-data-version';
const DATA_KEYS = ['products','stores','sightings','schedules','restockActivity','scheduleChangeRequests'];
let revisionStores = [];
let revisionProducts = [];
let detailContext = null;
let storeMap = null;
let storeMapLayer = null;
let enhancementQueued = false;

const r$ = id => document.getElementById(id);
const normalizeText = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/['’\-]/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function readHidden(){
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '{}'); }
  catch { return {}; }
}
function writeHidden(data){ localStorage.setItem(HIDDEN_KEY, JSON.stringify(data)); }
function isHidden(type,id){ return (readHidden()[type] || []).includes(id); }
function hideItem(type,id,label){
  if(!confirm(`Hide ${label || 'this item'} from your view? This only affects this browser and does not change shared data.`)) return;
  const hidden = readHidden();
  hidden[type] = [...new Set([...(hidden[type] || []), id])];
  writeHidden(hidden);
  document.getElementById('detailDialog')?.close();
  window.showView?.(type === 'store' ? 'stores' : 'products');
  queueEnhancements();
}

function initializeDataVersion(){
  const previous = localStorage.getItem(DATA_VERSION_KEY);
  if(previous && previous !== APP_DATA_VERSION){
    const hidden = localStorage.getItem(HIDDEN_KEY);
    const watched = (() => {
      try { return JSON.parse(localStorage.getItem('crt-v4-products') || '[]').filter(p => p.favorite).map(p => p.id); }
      catch { return []; }
    })();
    DATA_KEYS.forEach(key => localStorage.removeItem(`crt-v4-${key}`));
    if(hidden) localStorage.setItem(HIDDEN_KEY, hidden);
    localStorage.setItem('crt-preserved-watch-ids', JSON.stringify(watched));
    sessionStorage.setItem('crt-data-reset-notice','1');
  }
  localStorage.setItem(DATA_VERSION_KEY, APP_DATA_VERSION);
}

async function cleanupOldAppCaches(){
  if('serviceWorker' in navigator){
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    } catch(error){ console.warn('Service worker cleanup was unavailable.', error); }
  }
  if('caches' in window){
    try {
      const names = await caches.keys();
      await Promise.all(names.filter(name => !name.includes(BUILD_VERSION)).map(name => caches.delete(name)));
    } catch(error){ console.warn('Cache cleanup was unavailable.', error); }
  }
}

function setMobileNav(open){
  const sidebar = r$('sidebar');
  const backdrop = r$('navBackdrop');
  const button = r$('mobileMenuBtn');
  sidebar?.classList.toggle('open', open);
  backdrop?.classList.toggle('show', open);
  document.body.classList.toggle('nav-open', open);
  if(button){
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
}

function bindMobileNavigation(){
  r$('mobileMenuBtn')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setMobileNav(!r$('sidebar')?.classList.contains('open'));
  }, true);
  r$('navBackdrop')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setMobileNav(false);
  }, true);
  r$('nav')?.addEventListener('click', event => {
    if(event.target.closest('[data-view]')) setMobileNav(false);
  }, true);
  document.addEventListener('pointerdown', event => {
    if(!r$('sidebar')?.classList.contains('open')) return;
    if(event.target.closest('#sidebar') || event.target.closest('#mobileMenuBtn')) return;
    setMobileNav(false);
  }, true);
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape'){
      setMobileNav(false);
      closeSearchableSelects();
    }
  });
}

function mapsUrl(address){
  const encoded = encodeURIComponent(address);
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return apple ? `https://maps.apple.com/?q=${encoded}` : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
function addressLink(address,storeName){
  return `<a class="map-address-link" href="${mapsUrl(address)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(storeName || address)} in maps">${escapeHtml(address)}</a>`;
}
function linkifyAddresses(root=document){
  if(!revisionStores.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      if(!node.parentElement || node.parentElement.closest('a,script,style,button,select,option')) return NodeFilter.FILTER_REJECT;
      return revisionStores.some(store => node.nodeValue.includes(store.address)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const store = revisionStores.find(item => node.nodeValue.includes(item.address));
    if(!store) return;
    const before = node.nodeValue.slice(0,node.nodeValue.indexOf(store.address));
    const after = node.nodeValue.slice(node.nodeValue.indexOf(store.address)+store.address.length);
    const fragment=document.createDocumentFragment();
    if(before) fragment.append(before);
    const wrapper=document.createElement('span');
    wrapper.innerHTML=addressLink(store.address,store.name);
    fragment.append(wrapper.firstElementChild);
    if(after) fragment.append(after);
    node.replaceWith(fragment);
  });
}

function extractId(element,fnName){
  const source = element.getAttribute('onclick') || '';
  return source.match(new RegExp(`${fnName}\\('([^']+)'\\)`))?.[1] || '';
}
function addHideButton(container,type,id,label){
  if(!container || !id || container.querySelector(`.hide-view-btn[data-hide-id="${CSS.escape(id)}"]`)) return;
  const button=document.createElement('button');
  button.type='button';
  button.className='btn danger hide-view-btn';
  button.dataset.hideId=id;
  button.textContent='Hide from my view';
  button.addEventListener('click',event=>{
    event.preventDefault(); event.stopPropagation();
    hideItem(type,id,label);
  });
  const actions=container.querySelector('.actions,.report-actions,.modal-actions') || container;
  actions.append(button);
}
function enhanceHideControls(){
  document.querySelectorAll('.product-card').forEach(card=>{
    const id=extractId(card,'openProduct');
    addHideButton(card,'product',id,card.querySelector('h3')?.textContent);
  });
  document.querySelectorAll('.compact-card').forEach(card=>{
    const addButton=card.querySelector('[onclick*="addSightingFor"]');
    const id=addButton?.getAttribute('onclick').match(/addSightingFor\('([^']+)'\)/)?.[1];
    addHideButton(card,'product',id,card.querySelector('strong')?.textContent);
  });
  document.querySelectorAll('.store-row').forEach(row=>{
    const id=extractId(row,'openStore');
    addHideButton(row,'store',id,row.querySelector('h3')?.textContent);
  });
  if(detailContext && r$('detailDialog')?.open){
    addHideButton(r$('detailContent'),'detail' === detailContext.type ? 'product' : detailContext.type,detailContext.id,detailContext.label);
  }
}

function wrapDetailOpeners(){
  ['openProduct','openStore'].forEach(name=>{
    const original=window[name];
    if(typeof original !== 'function' || original.__revisionWrapped) return;
    const wrapped=function(id){
      const item=(name==='openStore'?revisionStores:revisionProducts).find(x=>x.id===id);
      detailContext={type:name==='openStore'?'store':'product',id,label:item?.name || item?.productName || id};
      const result=original.apply(this,arguments);
      setTimeout(queueEnhancements,0);
      return result;
    };
    wrapped.__revisionWrapped=true;
    window[name]=wrapped;
  });
}

function renderRevisionMap(){
  const storesView=r$('stores');
  if(!storesView || !storesView.classList.contains('active')) return;
  const toolbar=storesView.querySelector('.store-toolbar');
  const list=storesView.querySelector('.store-list');
  if(!toolbar || !list || storesView.querySelector('.revision-store-map-wrap')) return;
  storesView.querySelector('[data-store-mode="list"]')?.click();
  const visibleIds=[...storesView.querySelectorAll('.store-row')].map(row=>extractId(row,'openStore')).filter(Boolean);
  const visibleStores=revisionStores.filter(store=>visibleIds.includes(store.id) && !isHidden('store',store.id));
  const wrap=document.createElement('section');
  wrap.className='revision-store-map-wrap';
  wrap.innerHTML='<div class="map-status" role="status">Loading store map…</div><div id="revisionStoreMap" class="map revision-map" aria-label="Map of matching stores"></div>';
  storesView.insertBefore(wrap,toolbar);
  storesView.querySelector('.segmented')?.remove();
  const host=wrap.querySelector('#revisionStoreMap');
  const status=wrap.querySelector('.map-status');
  if(!window.L){ status.textContent='Map could not load. Leaflet is unavailable.'; host.hidden=true; return; }
  try{
    storeMap?.remove();
    storeMap=L.map(host).setView([30.31,-95.47],10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(storeMap);
    storeMapLayer=L.layerGroup().addTo(storeMap);
    const bounds=[];
    visibleStores.filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng))).forEach(s=>{
      const icon=L.divIcon({className:'retailer-map-icon',html:`<div class="map-pin ${String(s.retailer).toLowerCase()}"><img src="assets/icons/${String(s.retailer).toLowerCase()}.png" alt=""></div>`,iconSize:[42,42],iconAnchor:[21,21]});
      const marker=L.marker([Number(s.lat),Number(s.lng)],{icon}).addTo(storeMapLayer);
      marker.bindPopup(`<b>${escapeHtml(s.name)}</b><br>${addressLink(s.address,s.name)}<br><button class="btn" onclick="window.openStore('${s.id}')">Open store details</button>`);
      marker.on('click',()=>window.openStore?.(s.id));
      bounds.push([Number(s.lat),Number(s.lng)]);
    });
    status.hidden=true;
    if(bounds.length) storeMap.fitBounds(bounds,{padding:[30,30],maxZoom:12});
    else status.textContent='No matching stores have valid map coordinates.';
    requestAnimationFrame(()=>storeMap.invalidateSize());
    setTimeout(()=>storeMap?.invalidateSize(),150);
  }catch(error){
    console.error(error);
    status.hidden=false;
    status.textContent='The store map could not be displayed. Refresh and try again.';
    host.hidden=true;
  }
}

function renameAddMenu(){
  const productButton=r$('addProductBtn');
  const sightingButton=r$('addSightingBtn');
  const activityButton=r$('addActivityBtn');
  if(productButton) productButton.textContent='New Product';
  if(sightingButton) sightingButton.textContent='Sighting';
  if(activityButton) activityButton.textContent='Restock';
  const menu=r$('addMenu');
  if(menu && sightingButton && activityButton && productButton){
    menu.append(sightingButton,activityButton,productButton);
  }
  if(productButton && !productButton.dataset.warningBound){
    productButton.dataset.warningBound='true';
    productButton.addEventListener('click',event=>{
      event.preventDefault(); event.stopImmediatePropagation();
      showNewProductWarning();
    },true);
  }
}
function showNewProductWarning(){
  let dialog=r$('newProductWarningDialog');
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.id='newProductWarningDialog';
    dialog.innerHTML=`<form method="dialog"><h2>Add a new product?</h2><p>This creates a new product in the shared database. Search the existing product list first to avoid duplicates.</p><div class="modal-actions"><button class="btn" value="search">Search existing products</button><button class="btn primary" value="continue">Continue to new product</button></div></form>`;
    document.body.append(dialog);
    dialog.addEventListener('close',()=>{
      if(dialog.returnValue==='search') window.showView?.('products');
      if(dialog.returnValue==='continue'){
        r$('productCategory')?.dispatchEvent(new Event('change'));
        r$('productDialog')?.showModal();
        setTimeout(()=>prepareWizard(r$('productForm'),'New Product'),0);
      }
    });
  }
  dialog.showModal();
}

function levenshtein(a,b){
  const matrix=Array.from({length:b.length+1},(_,i)=>[i]);
  for(let j=0;j<=a.length;j++) matrix[0][j]=j;
  for(let i=1;i<=b.length;i++) for(let j=1;j<=a.length;j++) matrix[i][j]=b[i-1]===a[j-1]?matrix[i-1][j-1]:Math.min(matrix[i-1][j-1],matrix[i][j-1],matrix[i-1][j])+1;
  return matrix[b.length][a.length];
}
function similarProducts(name,category){
  const target=normalizeText(name);
  if(target.length<3) return [];
  return revisionProducts.map(product=>{
    const candidate=normalizeText(product.beyModel || product.productName || '');
    const distance=levenshtein(target,candidate);
    const score=1-distance/Math.max(target.length,candidate.length,1);
    return {product,score};
  }).filter(x=>x.product.category===category && x.score>=0.55).sort((a,b)=>b.score-a.score).slice(0,3);
}
function bindDuplicateProductWarning(){
  const form=r$('productForm');
  if(!form || form.dataset.duplicateBound) return;
  form.dataset.duplicateBound='true';
  const inputs=[form.elements.productName,form.elements.beyModel].filter(Boolean);
  inputs.forEach(input=>input.addEventListener('input',()=>{
    let box=form.querySelector('.duplicate-warning');
    if(!box){ box=document.createElement('div'); box.className='wide duplicate-warning'; form.querySelector('.form-grid')?.append(box); }
    const matches=similarProducts(input.value,form.elements.category?.value);
    box.hidden=!matches.length;
    box.innerHTML=matches.length?`<strong>Possible duplicate found</strong><p>A similar product already exists:</p>${matches.map(({product})=>`<button type="button" class="similar-product btn" data-product-id="${product.id}">${escapeHtml(product.category)} · ${escapeHtml(product.beyModel || product.productName)}</button>`).join('')}<p class="muted">You may use an existing product or continue with the new product. This warning does not block submission.</p>`:'';
    box.querySelectorAll('.similar-product').forEach(button=>button.onclick=()=>{ window.showView?.('products'); r$('productDialog')?.close(); });
  }));
}

function addMissingProductOption(){
  const select=r$('sightingForm')?.elements.productId;
  if(!select || [...select.options].some(o=>o.value==='__missing__')) return;
  select.add(new Option('Other / Item not listed','__missing__'));
  select.addEventListener('change',()=>{
    if(select.value!=='__missing__') return;
    r$('sightingDialog')?.close();
    showNewProductWarning();
  });
}

function prepareWizard(form,title){
  if(!form || form.dataset.wizardReady) return;
  form.dataset.wizardReady='true';
  const grid=form.querySelector('.form-grid');
  if(!grid) return;
  const fields=[...grid.children];
  const groups=[];
  if(form.id==='sightingForm') groups.push([0],[1],[2,3,4,5],[6,7,8,9,10,11,12,13,14],[15],[16]);
  else if(form.id==='activityForm') groups.push([1],[0],[2,3,4,5],[6,7],[8]);
  else groups.push([0,1,2,3],[4,5,6],[7,8,9,10,11],[12]);
  const stepNames=form.id==='sightingForm'?['Submission type','Category and product','Store and report details','Availability details','Evidence','Review and submit']:form.id==='activityForm'?['Submission type','Store','Restock details','Evidence','Review and submit']:['Category','Product details','Source details','Review and submit'];
  const steps=groups.map((indexes,index)=>{
    const step=document.createElement('section'); step.className='wizard-step'; step.dataset.step=String(index); step.hidden=index!==0;
    const heading=document.createElement('h3'); heading.textContent=stepNames[index] || `Step ${index+1}`; step.append(heading);
    indexes.forEach(i=>{ if(fields[i]) step.append(fields[i]); });
    grid.append(step); return step;
  });
  const progress=document.createElement('div'); progress.className='wizard-progress'; progress.setAttribute('aria-live','polite');
  grid.before(progress);
  const actions=form.querySelector('.modal-actions');
  const submit=actions?.querySelector('button:not([type="button"])');
  if(!actions || !submit) return;
  submit.hidden=true;
  const back=document.createElement('button'); back.type='button'; back.className='btn'; back.textContent='Back';
  const next=document.createElement('button'); next.type='button'; next.className='btn primary'; next.textContent='Next';
  actions.prepend(back,next);
  let current=0;
  const update=()=>{
    steps.forEach((step,i)=>step.hidden=i!==current);
    progress.innerHTML=`<span>Step ${current+1} of ${steps.length}</span><strong>${escapeHtml(stepNames[current]||'')}</strong><div><i style="width:${((current+1)/steps.length)*100}%"></i></div>`;
    back.hidden=current===0; next.hidden=current===steps.length-1; submit.hidden=current!==steps.length-1;
    if(current===steps.length-1){
      let review=steps[current].querySelector('.wizard-review');
      if(!review){ review=document.createElement('div'); review.className='wizard-review'; steps[current].append(review); }
      review.innerHTML=[...form.elements].filter(el=>el.name && el.type!=='file' && el.value).map(el=>`<div><b>${escapeHtml(el.closest('label')?.childNodes[0]?.textContent.trim() || el.name)}</b><span>${escapeHtml(el.options?.[el.selectedIndex]?.text || el.value)}</span></div>`).join('');
    }
  };
  next.onclick=()=>{
    const invalid=[...steps[current].querySelectorAll('input,select,textarea')].find(el=>!el.checkValidity());
    if(invalid){ invalid.reportValidity(); return; }
    current=Math.min(current+1,steps.length-1); update(); steps[current].scrollIntoView({block:'start'});
  };
  back.onclick=()=>{ current=Math.max(0,current-1); update(); };
  form.closest('dialog')?.addEventListener('close',()=>{ current=0; update(); });
  update();
}

function makeSelectSearchable(select){
  if(!select || select.dataset.searchable || select.options.length<6) return;
  select.dataset.searchable='true';
  const wrapper=document.createElement('div'); wrapper.className='searchable-select';
  const input=document.createElement('input'); input.type='search'; input.className='select-search'; input.placeholder='Search options'; input.setAttribute('aria-label',`Search ${select.closest('label')?.childNodes[0]?.textContent.trim() || 'options'}`);
  select.parentNode.insertBefore(wrapper,select); wrapper.append(input,select);
  const original=[...select.options].map(option=>({value:option.value,text:option.text,selected:option.selected,disabled:option.disabled}));
  const filter=()=>{
    const q=normalizeText(input.value); const selected=select.value;
    select.innerHTML='';
    original.filter(option=>!q || normalizeText(option.text).includes(q)).forEach(option=>select.add(new Option(option.text,option.value,false,option.value===selected)));
    if(!select.options.length) select.add(new Option('No matches found','',true,true));
    select.size=Math.min(Math.max(select.options.length,2),7);
  };
  input.addEventListener('focus',filter); input.addEventListener('input',filter);
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){ event.preventDefault(); select.focus(); if(select.options.length) select.selectedIndex=0; }
    if(event.key==='Enter' && select.options.length===1){ select.selectedIndex=0; select.dispatchEvent(new Event('change',{bubbles:true})); }
    if(event.key==='Escape'){ input.value=''; filter(); select.size=1; }
  });
  select.addEventListener('change',()=>{ input.value=select.options[select.selectedIndex]?.text || ''; select.size=1; });
  select.addEventListener('keydown',event=>{ if(event.key==='Escape'){ select.size=1; input.focus(); } });
}
function enhanceSearchableSelects(){ document.querySelectorAll('select').forEach(makeSelectSearchable); }
function closeSearchableSelects(){ document.querySelectorAll('.searchable-select select').forEach(select=>select.size=1); }

function enhanceDataPage(){
  const page=r$('settings'); if(!page || !page.classList.contains('active') || page.querySelector('.version-diagnostics')) return;
  const panel=document.createElement('section'); panel.className='card version-diagnostics';
  panel.innerHTML=`<h2>Version and troubleshooting</h2><dl><div><dt>Current build version</dt><dd>Build ${BUILD_VERSION}</dd></div><div><dt>Current local data version</dt><dd>${escapeHtml(localStorage.getItem(DATA_VERSION_KEY)||'Not set')}</dd></div></dl><div class="actions"><button class="btn danger" id="resetPrototypeData">Reset local prototype data</button><button class="btn" id="clearCachedFiles">Clear cached app files</button></div><p class="muted">Reset removes locally saved prototype products, sightings, schedules, activities, requests, and audit data. Watchlists and hidden items are preserved when compatible.</p>`;
  page.prepend(panel);
  r$('resetPrototypeData').onclick=resetPrototypeData;
  r$('clearCachedFiles').onclick=clearCachedFiles;
}
function resetPrototypeData(){
  if(!confirm('Reset local prototype data and reload the latest bundled sample data? Watchlists and hidden items will be preserved when compatible.')) return;
  const hidden=localStorage.getItem(HIDDEN_KEY);
  let watched=[]; try{ watched=JSON.parse(localStorage.getItem('crt-v4-products')||'[]').filter(p=>p.favorite).map(p=>p.id); }catch{}
  DATA_KEYS.forEach(key=>localStorage.removeItem(`crt-v4-${key}`));
  if(hidden) localStorage.setItem(HIDDEN_KEY,hidden);
  localStorage.setItem('crt-preserved-watch-ids',JSON.stringify(watched));
  localStorage.setItem(DATA_VERSION_KEY,APP_DATA_VERSION);
  sessionStorage.setItem('crt-data-reset-notice','1');
  location.reload();
}
async function clearCachedFiles(){
  try{
    if('caches' in window) await Promise.all((await caches.keys()).map(name=>caches.delete(name)));
    if('serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map(reg=>reg.unregister()));
    alert('Cached app files and service-worker registrations were cleared where browser permissions allowed.');
  }catch(error){ alert(`Cached files could not be fully cleared: ${error.message}`); }
}

function showResetNotice(){
  if(sessionStorage.getItem('crt-data-reset-notice')!=='1') return;
  sessionStorage.removeItem('crt-data-reset-notice');
  const notice=document.createElement('div'); notice.className='app-notice'; notice.setAttribute('role','status'); notice.innerHTML='<span>Prototype data was reset to the latest bundled sample data. Compatible watchlist and hidden-item preferences were preserved.</span><button aria-label="Dismiss notice">×</button>';
  notice.querySelector('button').onclick=()=>notice.remove(); document.body.append(notice);
}

function queueEnhancements(){
  if(enhancementQueued) return; enhancementQueued=true;
  requestAnimationFrame(()=>{
    enhancementQueued=false;
    renameAddMenu(); wrapDetailOpeners(); addMissingProductOption(); bindDuplicateProductWarning();
    enhanceSearchableSelects(); enhanceHideControls(); linkifyAddresses(); enhanceDataPage(); renderRevisionMap();
    prepareWizard(r$('sightingForm'),'Sighting'); prepareWizard(r$('activityForm'),'Restock');
  });
}

initializeDataVersion(); cleanupOldAppCaches();
Promise.all([
  fetch('data/stores.json').then(r=>r.ok?r.json():[]).catch(()=>[]),
  fetch('data/products.json').then(r=>r.ok?r.json():[]).catch(()=>[])
]).then(([stores,products])=>{ revisionStores=stores; revisionProducts=products; queueEnhancements(); });

document.addEventListener('DOMContentLoaded',()=>{
  bindMobileNavigation(); renameAddMenu(); showResetNotice(); queueEnhancements();
  const observer=new MutationObserver(queueEnhancements);
  observer.observe(document.body,{subtree:true,childList:true});
});
