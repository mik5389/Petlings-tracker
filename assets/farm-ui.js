// Farm selector: one set of tools, separate farm data.
(function(){'use strict';
 const nav=document.getElementById('tabs');if(!nav||!window.PetlingsFarms)return;
 const bar=document.createElement('div');bar.className='panel';bar.id='petlingsFarmBar';
 bar.innerHTML='<label for="petlingsFarmSelect">Current farm</label><select id="petlingsFarmSelect" style="max-width:350px"><option value="main">🌿 Land Farm</option><option value="sea">🌊 Sea Farm</option></select><p class="muted small">Animals, recipes, discoveries, inventory and merge plans are separate for each farm.</p>';
 nav.before(bar);
 const select=bar.querySelector('select');select.value=window.PetlingsFarms.current;
 let busy=false;
 select.addEventListener('change',async()=>{
   if(busy)return;busy=true;select.disabled=true;
   const previous=window.PetlingsFarms.current;
   try{await window.PetlingsFarms.switchTo(select.value)}finally{select.value=window.PetlingsFarms.current;select.disabled=false;busy=false}
   if(previous!==window.PetlingsFarms.current){
     for(const id of ['guidedOutput','guidedSteps','reverseOutput','planOutput','craftableOutput','futureCombos']){
       const node=document.getElementById(id);if(node)node.replaceChildren();
     }
   }
 });
 const animalForm=document.getElementById('animalName')?.closest('.panel');
 if(animalForm){
   const field=document.createElement('div');field.className='fields';
   field.innerHTML='<div><label for="petlingsAdminFarm">Farm for new animal</label><select id="petlingsAdminFarm"><option value="main">Land Farm</option><option value="sea">Sea Farm</option></select></div>';
   animalForm.insertBefore(field,animalForm.querySelector('.fields'));
   const adminSelect=field.querySelector('select');adminSelect.value=select.value;
   adminSelect.addEventListener('change',()=>{select.value=adminSelect.value;select.dispatchEvent(new Event('change'))});
   document.addEventListener('petlings:farm-changed',()=>{adminSelect.value=window.PetlingsFarms.current});
 }
})();
