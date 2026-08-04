(() => {
  const BUILD='2026.08.03.6';
  const PRODUCT_KEY='crt-v4-products';
  const SIGHTING_KEY='crt-v4-sightings';

  const read=(key,fallback=[])=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));

  function normalizeCatalog(){
    if(localStorage.getItem('crt-product-form-normalized')===BUILD) return;
    const products=read(PRODUCT_KEY,[]).filter(product=>{
      const name=String(product.productName||product.beyModel||'').toLowerCase();
      const type=String(product.beyType||'').toLowerCase();
      if(product.category==='TCG'&&name==='sleeves') return false;
      if(type==='accessory'||name.includes('accessory')||name.includes('launcher')) return false;
      return true;
    });
    const productIds=new Set(products.map(product=>product.id));
    const sightings=read(SIGHTING_KEY,[]).filter(sighting=>productIds.has(sighting.productId));
    write(PRODUCT_KEY,products);
    write(SIGHTING_KEY,sightings);
    localStorage.setItem('crt-product-form-normalized',BUILD);
  }
  normalizeCatalog();

  function resetDetailDialog(){
    const dialog=document.getElementById('detailDialog');
    const content=document.getElementById('detailContent');
    if(!dialog||!content) return;
    dialog.querySelectorAll('.detail-actions-menu,.detail-close-fixed').forEach(node=>node.remove());
    content.replaceChildren();
  }

  function showDetailError(message){
    const dialog=document.getElementById('detailDialog');
    const content=document.getElementById('detailContent');
    if(!dialog||!content) return;
    resetDetailDialog();
    content.innerHTML=`<section class="detail-error"><h2>Listing unavailable</h2><p>${esc(message||'This listing could not be opened.')}</p><button type="button" class="btn primary" data-safe-close>Close</button></section>`;
    content.querySelector('[data-safe-close]')?.addEventListener('click',()=>dialog.close());
    if(!dialog.open) dialog.showModal();
  }

  function validIdFor(name,id){
    if(!id||id==='undefined'||id==='null') return false;
    const products=read(PRODUCT_KEY,[]);
    const sightings=read(SIGHTING_KEY,[]);
    const stores=read('crt-v4-stores',[]);
    if(/Product/i.test(name)) return products.some(item=>item.id===id);
    if(/Store/i.test(name)) return stores.some(item=>item.id===id);
    if(/Report|Sighting|Status/i.test(name)) return sightings.some(item=>item.id===id);
    return true;
  }

  const openerNames=['openProduct','openStore','openReport','openSighting','openListing','openActivity','openSchedule'];
  function protectOpeners(){
    openerNames.forEach(name=>{
      const original=window[name];
      if(typeof original!=='function'||original.__safeListingWrapper) return;
      const wrapped=function(id,...rest){
        try{
          resetDetailDialog();
          if(!validIdFor(name,id)){
            showDetailError('The selected listing no longer exists in the current data build.');
            return;
          }
          return original.call(this,id,...rest);
        }catch(error){
          console.error(`Failed to open ${name}`,error);
          showDetailError('This listing could not be displayed. The page is still usable.');
        }
      };
      wrapped.__safeListingWrapper=true;
      wrapped.__original=original;
      window[name]=wrapped;
    });
  }
  protectOpeners();
  const openerTimer=setInterval(protectOpeners,100);
  setTimeout(()=>clearInterval(openerTimer),8000);

  window.addEventListener('error',event=>{
    const target=event.target;
    if(target&&target!==window) return;
    if(document.getElementById('detailDialog')?.open){
      event.preventDefault();
      showDetailError('This listing could not be displayed. The page is still usable.');
    }
  });
  window.addEventListener('unhandledrejection',event=>{
    if(document.getElementById('detailDialog')?.open){
      event.preventDefault();
      console.error(event.reason);
      showDetailError('This listing could not be displayed. The page is still usable.');
    }
  });

  function setupProductForm(){
    const form=document.getElementById('productForm');
    if(!form||form.dataset.normalizedProductForm) return false;
    form.dataset.normalizedProductForm='true';
    const category=form.elements.category;
    const gameWrap=document.getElementById('tcgGameWrap');
    const game=form.elements.game;
    const setWrap=document.getElementById('setWrap');
    const brandWrap=document.getElementById('brandWrap');
    const brand=form.elements.brand;
    const nameWrap=document.getElementById('productNameWrap');
    const nameInput=form.elements.productName;
    const nameLabel=document.getElementById('productNameLabel');
    const beyModelWrap=document.getElementById('beyModelWrap');
    const beyModel=form.elements.beyModel;
    const beyTypeWrap=document.getElementById('beyTypeWrap');
    const beyType=form.elements.beyType;
    if(!category||!nameWrap||!nameInput) return false;

    const productType=document.createElement('select');
    productType.name='catalogProductType';
    productType.required=true;
    productType.hidden=true;
    nameInput.after(productType);

    const fill=(select,values,placeholder)=>{
      const current=select.value;
      select.innerHTML='';
      select.add(new Option(placeholder,''));
      values.forEach(value=>select.add(new Option(value,value)));
      if(values.includes(current)) select.value=current;
    };
    const products=()=>read(PRODUCT_KEY,[]);

    function syncProductType(){
      if(category.value!=='TCG') return;
      const setName=form.elements.setName?.value.trim();
      const values=unique(products().filter(product=>product.category==='TCG'&&(!game.value||product.game===game.value)&&(!setName||product.setName===setName)).map(product=>product.productName).filter(value=>String(value).toLowerCase()!=='sleeves'));
      fill(productType,values,'Choose a product type');
    }
    function syncBeyModels(){
      if(category.value!=='Beyblade') return;
      const type=beyType?.value;
      const models=unique(products().filter(product=>product.category==='Beyblade'&&(!type||product.beyType===type)).map(product=>product.beyModel||product.productName));
      let select=form.elements.catalogBeyModel;
      if(!select){
        select=document.createElement('select');select.name='catalogBeyModel';select.required=true;beyModel.after(select);
      }
      fill(select,models,'Choose an in-box model');
      select.hidden=false;beyModel.hidden=true;beyModel.required=false;
      select.onchange=()=>{beyModel.value=select.value;};
    }
    function sync(){
      const value=category.value;
      const tcg=value==='TCG';
      const squish=value==='Squishies';
      const bey=value==='Beyblade';
      if(gameWrap) gameWrap.hidden=!tcg;
      if(setWrap) setWrap.hidden=!tcg;
      if(brandWrap) brandWrap.hidden=!squish;
      if(beyTypeWrap) beyTypeWrap.hidden=!bey;
      if(beyModelWrap) beyModelWrap.hidden=!bey;
      nameWrap.hidden=bey;
      nameInput.hidden=tcg;
      nameInput.required=squish;
      productType.hidden=!tcg;
      productType.required=tcg;
      if(nameLabel) nameLabel.textContent=tcg?'Product type':'Product';
      if(tcg) syncProductType();
      if(bey) syncBeyModels();
      if(!bey){const select=form.elements.catalogBeyModel;if(select)select.hidden=true;beyModel.hidden=false;}
    }
    category.addEventListener('change',sync);
    game?.addEventListener('change',syncProductType);
    form.elements.setName?.addEventListener('input',syncProductType);
    beyType?.addEventListener('change',syncBeyModels);
    form.addEventListener('submit',()=>{
      if(category.value==='TCG') nameInput.value=productType.value;
      if(category.value==='Beyblade'){
        const select=form.elements.catalogBeyModel;
        if(select) beyModel.value=select.value;
      }
    },true);
    sync();
    return true;
  }
  const formTimer=setInterval(()=>{if(setupProductForm())clearInterval(formTimer);},100);
  setTimeout(()=>clearInterval(formTimer),8000);
})();