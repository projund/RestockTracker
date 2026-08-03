(() => {
  const form=document.getElementById('sightingForm');
  if(!form)return;
  const generic={TCG:'catalog-other-tcg',Squishies:'catalog-other-squishies',Beyblade:'catalog-other-beyblade'};
  form.addEventListener('change',event=>{
    const select=event.target;
    if(select?.name!=='productId'||select.value!=='__missing__')return;
    const category=form.elements.wizardCategory?.value||'TCG';
    const id=generic[category]||generic.TCG;
    if(![...select.options].some(option=>option.value===id))select.add(new Option('Other',id));
    select.value=id;
    event.stopImmediatePropagation();
  },true);
})();