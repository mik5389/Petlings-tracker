
// Change an animal's tier in Supabase without changing its ID or deleting recipes.
(function(){
  const dialog=document.getElementById('petlingsEditDialog');
  const tierInput=document.getElementById('petlingsEditTier');
  const warning=document.getElementById('petlingsEditWarning');
  const saveButton=document.getElementById('petlingsEditSave');
  const cancelButton=document.getElementById('petlingsEditCancel');
  tierInput.innerHTML=Array.from({length:10},(_,i)=>'<option value="'+(i+1)+'">Tier '+(i+1)+'</option>').join('');
  let editingId=null;
  function inconsistentRecipes(id,newTier){
    return data.recipes.filter(r=>{
      if(r.result!==id&&!r.parents.includes(id))return false;
      const result=data.animals.find(a=>a.id===r.result);
      if(!result)return false;
      const resultTier=r.result===id?newTier:result.tier;
      const parentTiers=r.parents.map(p=>p===id?newTier:data.animals.find(a=>a.id===p)?.tier);
      return resultTier<2||r.parents.length!==(resultTier>=8?3:2)||parentTiers.some(t=>t!==resultTier-1);
    });
  }
  function updateWarning(){
    if(!editingId)return;
    const a=animal(editingId),next=Number(tierInput.value);
    const affected=inconsistentRecipes(editingId,next);
    warning.textContent=affected.length
      ?'Warning: '+affected.length+' existing recipe(s) would no longer follow the same-tier breeding rules. The recipes will NOT be deleted, but you should review and correct them afterward.'
      :'All existing recipes will remain connected to this animal.';
    saveButton.disabled=!a||next===a.tier;
  }
  function openEditor(id){
    if(!isAdmin)return;
    const a=animal(id);if(!a)return;
    editingId=id;
    document.getElementById('petlingsEditName').textContent=a.name+' (currently Tier '+a.tier+')';
    tierInput.value=String(a.tier);
    updateWarning();
    dialog.showModal();
  }
  cancelButton.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{editingId=null});
  tierInput.addEventListener('change',updateWarning);
  saveButton.addEventListener('click',async()=>{
    if(!editingId||!mustAdmin())return;
    const id=editingId,a=animal(id),next=Number(tierInput.value);
    if(!a||!Number.isInteger(next)||next<1||next>10)return;
    if(next===a.tier){dialog.close();return}
    const affected=inconsistentRecipes(id,next);
    if(affected.length&&!confirm('Changing '+a.name+' to Tier '+next+' will make '+affected.length+' existing recipe(s) inconsistent. They will remain saved. Continue?'))return;
    saveButton.disabled=true;
    try{
      const {data:rows,error}=await api.from('animals').update({tier:next}).eq('id',dbId(id)).select('id,tier');
      if(error)throw error;
      if(!rows||rows.length!==1)throw new Error('The database did not confirm the update.');
      dialog.close();
      await loadShared();
      toast('Tier updated. All existing recipes preserved.');
    }catch(e){toast('Tier update failed: '+e.message);saveButton.disabled=false}
  });
  // Render Edit tier alongside each animal directly, not via row-index matching.
  const previousRenderAnimals=renderAnimals;
  renderAnimals=function(){
    previousRenderAnimals();
    const list=document.getElementById('animalList');
    list.querySelectorAll('.petlings-edit-button').forEach(b=>b.remove());
    if(!isAdmin)return;
    const q=document.getElementById('animalSearch').value.trim().toLowerCase();
    const t=document.getElementById('animalFilter').value;
    const visible=data.animals.filter(a=>a.name.toLowerCase().includes(q)&&(t==='all'||a.tier===Number(t)))
      .sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name));
    list.querySelectorAll('.item').forEach((row,i)=>{
      const a=visible[i];if(!a)return;
      const btn=document.createElement('button');
      btn.type='button';btn.className='secondary petlings-edit-button';
      btn.textContent='Edit tier';btn.setAttribute('aria-label','Edit tier for '+a.name);
      btn.addEventListener('click',()=>openEditor(a.id));
      const controls=row.querySelector('button.danger');
      if(controls)controls.before(btn);else row.appendChild(btn);
    });
  };
  renderAnimals();
})();
