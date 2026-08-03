(() => {
  const VERSION='2026.08.03.2';
  const form=document.getElementById('sightingForm');
  if(!form) return;

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const unique=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const productTitle=p=>p.category==='TCG'?`${p.game} · ${p.setName||'Multiple sets'} · ${p.productName}`:p.category==='Squishies'?`${p.brand} · ${p.productName}`:`Beyblade · ${p.beyModel||p.productName}`;
  let products=[];
  let installed=false;

  async function loadProducts(){
    try{
      const saved=JSON.parse(localStorage.getItem('crt-v4-products')||'null');
      if(Array.isArray(saved)&&saved.length){products=saved.filter(p=>p.active!==false);return;}
    }catch{}
    try{products=(await fetch(`data/products.json?v=${VERSION}`).then(r=>r.ok?r.json():[])).filter(p=>p.active!==false);}catch{products=[];}
  }

  function label(text,control){
    const node=document.createElement('label');
    const caption=document.createElement('span');caption.textContent=text;
    node.append(caption,control);return node;
  }
  function select(name,required=true){const node=document.createElement('select');node.name=name;node.required=required;return node;}
  function fill(node,values,placeholder){
    const current=node.value;
    node.innerHTML='';
    node.add(new Option(placeholder,''));
    values.forEach(value=>node.add(new Option(value,value)));
    if(values.includes(current)) node.value=current;
  }
  function rawSelect(name){
    const node=form.elements[name];
    if(!node) return null;
    const wrapper=node.closest('.searchable-select');
    if(wrapper){wrapper.replaceWith(node);node.removeAttribute('size');}
    return node;
  }

  function install(){
    if(installed||!products.length||!form.dataset.wizardReady) return;
    installed=true;

    const grid=form.querySelector('.form-grid');
    const actions=form.querySelector('.modal-actions');
    const productSelect=rawSelect('productId');
    if(!grid||!actions||!productSelect) return;

    const field=name=>rawSelect(name)?.closest('label')||form.elements[name]?.closest('label');
    const categorySelect=select('wizardCategory');
    const gameSelect=select('wizardGame');
    const setSelect=select('wizardSet',false);
    const categoryLabel=label('Category',categorySelect);
    const gameLabel=label('Game',gameSelect);
    const setLabel=label('Set (optional)',setSelect);
    const productLabel=productSelect.closest('label')||label('Product',productSelect);
    const productCaption=productLabel.querySelector('span')||productLabel.firstChild;
    if(productCaption?.nodeType===Node.TEXT_NODE) productCaption.textContent='Product';

    const originalFields={
      store:field('storeId'),source:field('source'),pickup:field('pickup'),shipping:field('shipping'),productLink:field('productLink'),
      status:field('status'),quantity:field('quantity'),seenAt:field('seenAt'),reporter:field('reporter'),location:field('inStoreLocation'),
      inStore:field('inStore'),confidence:field('confidence'),photo:field('photoFile'),notes:field('notes')
    };

    grid.innerHTML='';
    const definitions=[
      ['Category',[categoryLabel]],
      ['Game',[gameLabel]],
      ['Set',[setLabel]],
      ['Product',[productLabel]],
      ['Store or online source',[originalFields.store,originalFields.source,originalFields.pickup,originalFields.shipping,originalFields.productLink]],
      ['Report details',[originalFields.status,originalFields.quantity,originalFields.seenAt,originalFields.reporter,originalFields.location,originalFields.inStore,originalFields.confidence,originalFields.photo,originalFields.notes]],
      ['Review and submit',[]]
    ];
    const steps=definitions.map(([name,nodes],index)=>{
      const section=document.createElement('section');section.className='wizard-step';section.hidden=index!==0;section.dataset.step=index;
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

    function relevantProducts(){
      const category=categorySelect.value;
      const game=gameSelect.value;
      const set=setSelect.value;
      return products.filter(product=>{
        if(product.category!==category) return false;
        if(category==='TCG'&&game&&product.game!==game) return false;
        if(category==='Squishies'&&game&&product.brand!==game) return false;
        if(category==='Beyblade'&&game&&product.beyType!==game) return false;
        if(category==='TCG'&&set&&product.setName!==set) return false;
        return true;
      });
    }
    function updateCategory(){
      fill(categorySelect,unique(products.map(p=>p.category)),'Choose a category');
      updateGame();
    }
    function updateGame(){
      const category=categorySelect.value;
      const values=unique(products.filter(p=>p.category===category).map(p=>category==='TCG'?p.game:category==='Squishies'?p.brand:p.beyType));
      const caption=category==='TCG'?'Game':category==='Squishies'?'Brand':'Product type';
      gameLabel.querySelector('span').textContent=caption;
      steps[1].querySelector('h3').textContent=caption;
      fill(gameSelect,values,`Choose a ${caption.toLowerCase()}`);
      updateSet();
    }
    function updateSet(){
      const category=categorySelect.value;
      const isTCG=category==='TCG';
      setLabel.hidden=!isTCG;
      steps[2].hidden=!isTCG;
      if(!isTCG){setSelect.value='';updateProducts();return;}
      const values=unique(products.filter(p=>p.category==='TCG'&&(!gameSelect.value||p.game===gameSelect.value)).map(p=>p.setName));
      fill(setSelect,values,'Skip set / Multiple sets');
      updateProducts();
    }
    function updateProducts(){
      const matches=relevantProducts();
      productSelect.innerHTML='';
      productSelect.add(new Option('Choose a product',''));
      matches.forEach(product=>productSelect.add(new Option(productTitle(product),product.id)));
      productSelect.add(new Option('Other / Item not listed','__missing__'));
      productSelect.required=true;
    }

    categorySelect.addEventListener('change',()=>{gameSelect.value='';setSelect.value='';updateGame();});
    gameSelect.addEventListener('change',()=>{setSelect.value='';updateSet();});
    setSelect.addEventListener('change',updateProducts);

    let current=0;
    function visibleStepIndexes(){return steps.map((step,index)=>({step,index})).filter(item=>!item.step.dataset.skipped&&!(item.index===2&&categorySelect.value!=='TCG')).map(item=>item.index);}
    function setCurrent(index){
      current=index;
      steps.forEach((step,i)=>step.hidden=i!==current);
      const order=visibleStepIndexes();const position=order.indexOf(current);
      const name=definitions[current][0]==='Game'?steps[current].querySelector('h3').textContent:definitions[current][0];
      progress.innerHTML=`<span>Step ${position+1} of ${order.length}</span><strong>${esc(name)}</strong><div><i style="width:${((position+1)/order.length)*100}%"></i></div>`;
      back.hidden=position===0;next.hidden=position===order.length-1;submit.hidden=position!==order.length-1;
      if(position===order.length-1) updateReview();
    }
    function updateReview(){
      const reviewStep=steps[6];reviewStep.querySelector('.wizard-review')?.remove();
      const review=document.createElement('div');review.className='wizard-review';
      const rows=[['Category',categorySelect.value],[gameLabel.querySelector('span').textContent,gameSelect.value]];
      if(categorySelect.value==='TCG') rows.push(['Set',setSelect.value||'Skipped / Multiple sets']);
      rows.push(['Product',productSelect.options[productSelect.selectedIndex]?.text],['Store',form.elements.storeId?.options[form.elements.storeId.selectedIndex]?.text],['Source',form.elements.source?.value],['Status',form.elements.status?.value],['Quantity',form.elements.quantity?.value||'Unknown'],['Sighting time',form.elements.seenAt?.value]);
      review.innerHTML=rows.filter(([,value])=>value).map(([name,value])=>`<div><b>${esc(name)}</b><span>${esc(value)}</span></div>`).join('');reviewStep.append(review);
    }
    function validateCurrent(){
      const invalid=[...steps[current].querySelectorAll('input,select,textarea')].find(control=>!control.checkValidity());
      if(invalid){invalid.reportValidity();return false;}return true;
    }
    next.onclick=()=>{
      if(!validateCurrent()) return;
      const order=visibleStepIndexes();const position=order.indexOf(current);setCurrent(order[Math.min(position+1,order.length-1)]);steps[current].scrollIntoView({block:'start'});
    };
    back.onclick=()=>{const order=visibleStepIndexes();const position=order.indexOf(current);setCurrent(order[Math.max(position-1,0)]);};
    form.closest('dialog')?.addEventListener('close',()=>setCurrent(0));

    updateCategory();setCurrent(0);
  }

  loadProducts().then(()=>{
    const timer=setInterval(()=>{install();if(installed)clearInterval(timer);},50);
    setTimeout(()=>clearInterval(timer),5000);
  });
})();