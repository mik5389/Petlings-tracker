// Shared spoiler preference for Animals and Recipes. Never modifies Supabase records.
(function(){
  'use strict';
  const key='petlings-encyclopedia-spoilers-v1';
  let enabled=false;
  try{enabled=localStorage.getItem(key)==='true'}catch(_){}
  const visible=a=>enabled || a?.discovered===true;
  window.PetlingsSpoilers={visible,get enabled(){return enabled}};
  function addToggle(sectionId,anchorId){
    const anchor=document.getElementById(anchorId);
    if(!anchor)return;
    const holder=document.createElement('div');
    holder.className='petlings-spoiler-control';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='check';checkbox.id='petlingsSpoilers'+sectionId;checkbox.checked=enabled;
    const label=document.createElement('label');label.htmlFor=checkbox.id;label.textContent='Show spoilers (all animals and recipes)';
    holder.append(checkbox,label);
    const help=document.createElement('p');help.className='muted small';help.textContent='Off: only animals you have discovered, and recipes producing them, are shown.';holder.append(help);
    anchor.before(holder);
    checkbox.addEventListener('change',()=>{
      enabled=checkbox.checked;
      try{localStorage.setItem(key,String(enabled))}catch(_){}
      document.querySelectorAll('.petlings-spoiler-control input').forEach(el=>el.checked=enabled);
      renderAnimals();renderRecipes();
    });
  }
  addToggle('Animals','animalList');
  addToggle('Recipes','recipeList');
  // Discovery flags can change in either the Animals or Discover page.
  const priorToggle=toggleDiscovered;
  toggleDiscovered=function(id){const result=priorToggle(id);renderAnimals();renderRecipes();return result};
  const previousRenderDiscover=renderDiscover;
  renderDiscover=function(...args){const result=previousRenderDiscover.apply(this,args);renderAnimals();renderRecipes();return result};
  renderAnimals();renderRecipes();
})();
