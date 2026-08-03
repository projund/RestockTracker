(() => {
  const VERSION='2026.08.03.3';
  const form=document.getElementById('sightingForm');
  if(!form) return;

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  let products=[];
  let installed=false;

  async function loadProducts(){
    try{
      const saved=JSON.parse(localStorage.getItem('crt-v4-products')||'null');
      if(Array.isArray(saved)&&saved.length){products=saved.filter(p=>p.active!==false);return;}
    }catch{}
    try{products=(await fetch(`data/products.json?v=${VERSION}`).then(r=>r.ok?r.json():[])).filter(p=>p.active!==false);}catch{products=[];}
  }

  function makeSelect(name,required=true){const select=document.createElement('select');select.name=name;select.required=required;return select;}
  function makeLabel(text,control){const label=document.createElement('label');const span=document.createElement('span');span.textContent=text;label.append(span,control);return label;}
  function fill(select,items,placeholder){
    const current=select.value;select.innerHTML='';select.add(new Option(placeholder,''));
    items.forEach(item=>select.add(new Option(typeof item==='string'?item:item.label,typeof item==='string'?item:item.value)));
    if([...select.options].some(option=>option.value===current)) select.value=current;
  }
  function unwrapSelect(name){
    const select=form.elements[name];if(!select)return null;
    const wrapper=select.closest('.searchable-select');
    if(wrapper){wrapper.replaceWith(select);select.removeAttribute('size');}
    return select;
  }
  function field(name){const control=unwrapSelect(name)||form.elements[name];return control?.closest('label')||null;}

  function install(){
    if(installed||!products.length||!form.dataset.wizardReady)return;
    const grid=form.querySelector('.form-grid');
    const actions=form.querySelector('.modal-actions');
    const productSelect=unwrapSelect('productId');
    if(!grid||!actions||!productSelect)return;
    installed=true;

    const categorySelect=makeSelect('wizardCategory');
    const secondarySelect=makeSelect('wizardSecondary');
    const setSelect=makeSelect('wizardSet');
    const categoryLabel=makeLabel('Category',categorySelect);
    const secondaryLabel=makeLabel('Game',secondarySelect);
    const setLabel=makeLabel('Set',setSelect);
    const productLabel=productSelect.closest('label')||makeLabel('Product',productSelect);
    const firstText=[...productLabel.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
    if(firstText)firstText.textContent='Product type';

    const fields={
      store:field('storeId'),source:field('source'),pickup:field('pickup'),shipping:field('shipping'),productLink:field('productLink'),
      status:field('status'),quantity:field('quantity'),seenAt:field('seenAt'),reporter:field('reporter'),location:field('inStoreLocation'),
      inStore:field('inStore'),confidence:field('confidence'),photo:field('photoFile'),notes:field('notes')
    };

    grid.innerHTML='';
    const definitions=[
      ['Category',[categoryLabel]],
      ['Game or brand',[secondaryLabel]],
      ['Set',[setLabel]],
      ['Product type',[productLabel]],
      ['Store or online source',[fields.store,fields.source,fields.pickup,fields.shipping,fields.productLink]],
      ['Report details',[fields.status,fields.quantity,fields.seenAt,fields.reporter,fields.location,fields.inStore,fields.confidence,fields.photo,fields.notes]],
      ['Review and submit',[]]
    ];
    const steps=definitions.map(([name,nodes],index)=>{
      const section=document.createElement('section');section.className='wizard-step';section.dataset.step=String(index);section.hidden=index!==0;
      const heading=document.createElement('h3');heading.textContent=name;section.append(heading);
      nodes.filter(Boolean).forEach(node=>section.append(node));grid.append(section);return section;
    });

    form.querySelector('.wizard-progress')?.remove();
    const progress=document.createElement('div');progress.className='wizard-progress';progress.setAttribute('aria-live','polite');grid.before(progress);
    [...actions.querySelectorAll('button')].filter(button=>['Back','Next'].includes(button.textContent.trim())).forEach(button=>button.remove());
    const submit=actions.querySelector('button:not([type="button"])');
    const cancel=actions.querySelector('.close');
    const back=document.createElement('button');back.type='button';back.className='btn';back.textContent='Back';
    const next=document.createElement('button');next.type='button';next.className='btn primary';next.textContent='Next';
    actions.insertBefore(back,cancel||submit);actions.insertBefore(next,cancel||submit);

    function categoryProducts(){return products.filter(product=>product.category===categorySelect.value);}
    function secondaryValue(product){
      if(categorySelect.value==='TCG')return product.game;
      if(categorySelect.value==='Squishies')return product.brand;
      return product.beyType;
    }
    function productName(product){return categorySelect.value==='Beyblade'?(product.beyModel||product.productName):product.productName;}
    function matchingProducts(){
      return categoryProducts().filter(product=>{
        if(secondarySelect.value&&secondaryValue(product)!==secondarySelect.value)return false;
        if(categorySelect.value==='TCG'&&setSelect.value&&setSelect.value!=='Other'&&product.setName!==setSelect.value)return false;
        return true;
      });
    }

    function updateCategory(){
      fill(categorySelect,unique(products.map(product=>product.category)),'Choose a category');
      updateSecondary();
    }
    function updateSecondary(){
      const category=categorySelect.value;
      const caption=category==='TCG'?'Game':category==='Squishies'?'Brand':'Product type';
      secondaryLabel.querySelector('span').textContent=caption;
      steps[1].querySelector('h3').textContent=caption;
      fill(secondarySelect,unique(categoryProducts().map(secondaryValue)),`Choose a ${caption.toLowerCase()}`);
      updateSet();
    }
    function updateSet(){
      const isTCG=categorySelect.value==='TCG';
      steps[2].dataset.skipped=String(!isTCG);
      setLabel.hidden=!isTCG;
      if(!isTCG){setSelect.required=false;setSelect.value='';updateProducts();return;}
      setSelect.required=true;
      const sets=unique(categoryProducts().filter(product=>!secondarySelect.value||product.game===secondarySelect.value).map(product=>product.setName));
      fill(setSelect,[...sets,'Other'],'Choose a set');
      updateProducts();
    }
    function updateProducts(){
      const seen=new Set();
      const options=[];
      matchingProducts().forEach(product=>{
        const label=productName(product);if(!label||seen.has(label))return;seen.add(label);options.push({label,value:product.id});
      });
      options.sort((a,b)=>a.label.localeCompare(b.label));
      options.push({label:'Other',value:'__missing__'});
      fill(productSelect,options,'Choose a product type');
      productSelect.required=true;
    }

    categorySelect.addEventListener('change',()=>{secondarySelect.value='';setSelect.value='';updateSecondary();});
    secondarySelect.addEventListener('change',()=>{setSelect.value='';updateSet();});
    setSelect.addEventListener('change',updateProducts);

    let current=0;
    function visibleIndexes(){return steps.map((step,index)=>({step,index})).filter(({step})=>step.dataset.skipped!=='true').map(({index})=>index);}
    function updateReview(){
      const reviewStep=steps[6];reviewStep.querySelector('.wizard-review')?.remove();
      const review=document.createElement('div');review.className='wizard-review';
      const secondaryCaption=secondaryLabel.querySelector('span').textContent;
      const rows=[['Category',categorySelect.value],[secondaryCaption,secondarySelect.value]];
      if(categorySelect.value==='TCG')rows.push(['Set',setSelect.value]);
      rows.push(['Product type',productSelect.options[productSelect.selectedIndex]?.text],['Store',form.elements.storeId?.options[form.elements.storeId.selectedIndex]?.text],['Source',form.elements.source?.value],['Status',form.elements.status?.value],['Quantity',form.elements.quantity?.value||'Unknown'],['Sighting time',form.elements.seenAt?.value]);
      review.innerHTML=rows.filter(([,value])=>value).map(([name,value])=>`<div><b>${esc(name)}</b><span>${esc(value)}</span></div>`).join('');reviewStep.append(review);
    }
    function setCurrent(index){
      current=index;steps.forEach((step,i)=>step.hidden=i!==current);
      const order=visibleIndexes();const position=order.indexOf(current);
      progress.innerHTML=`<span>Step ${position+1} of ${order.length}</span><strong>${esc(steps[current].querySelector('h3').textContent)}</strong><div><i style="width:${((position+1)/order.length)*100}%"></i></div>`;
      back.hidden=position===0;next.hidden=position===order.length-1;submit.hidden=position!==order.length-1;
      if(position===order.length-1)updateReview();
    }
    function validCurrent(){const invalid=[...steps[current].querySelectorAll('input,select,textarea')].find(control=>!control.checkValidity());if(invalid){invalid.reportValidity();return false;}return true;}
    next.onclick=()=>{if(!validCurrent())return;const order=visibleIndexes();const position=order.indexOf(current);setCurrent(order[Math.min(position+1,order.length-1)]);steps[current].scrollIntoView({block:'start'});};
    back.onclick=()=>{const order=visibleIndexes();const position=order.indexOf(current);setCurrent(order[Math.max(position-1,0)]);};
    form.closest('dialog')?.addEventListener('close',()=>setCurrent(0));

    updateCategory();setCurrent(0);
  }

  loadProducts().then(()=>{
    const timer=setInterval(()=>{install();if(installed)clearInterval(timer);},50);
    setTimeout(()=>clearInterval(timer),5000);
  });
})();