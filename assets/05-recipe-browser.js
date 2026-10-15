
// Compact, searchable recipe encyclopedia. Keeps all database writes unchanged.
(function(){
const list=document.getElementById('recipeList');
const panel=list.closest('.panel');
const controls=document.createElement('div');controls.className='recipe-browser-tools';
controls.innerHTML='<div><label for="recipeBrowserSearch">Search result animals</label><input id="recipeBrowserSearch" type="search" placeholder="e.g. Bison" autocomplete="off"></div><div><label for="recipeBrowserTier">Filter tier</label><select id="recipeBrowserTier"><option value="all">All tiers</option>'+Array.from({length:9},(_,i)=>'<option value="'+(i+2)+'">Tier '+(i+2)+'</option>').join('')+'</select></div>';
panel.insertBefore(controls,list);
const search=document.getElementById('recipeBrowserSearch');
const tier=document.getElementById('recipeBrowserTier');
const prior=renderRecipes;
renderRecipes=function(){
  // Keep original form selectors synchronized with newly added animals.
  prior();
  const queryText=search.value.trim().toLocaleLowerCase();
  const tierValue=tier.value;
  const openGroups=new Set(Array.from(list.querySelectorAll('details[open]')).map(el=>el.dataset.animal));
  const grouped=new Map();
  data.recipes.forEach((recipe,index)=>{
    const result=animal(recipe.result);
    if(!result)return;
    if(window.PetlingsSpoilers && !window.PetlingsSpoilers.visible(result))return;
    if(tierValue!=='all'&&result.tier!==Number(tierValue))return;
    if(queryText&&!result.name.toLocaleLowerCase().includes(queryText))return;
    if(!grouped.has(result.id))grouped.set(result.id,{result,entries:[]});
    grouped.get(result.id).entries.push({recipe,index});
  });
  const groups=[...grouped.values()].sort((a,b)=>a.result.tier-b.result.tier||a.result.name.localeCompare(b.result.name));
  let currentTier=null;
  const html=[];
  for(const group of groups){
    if(group.result.tier!==currentTier){currentTier=group.result.tier;html.push('<h3 class="recipe-tier-heading">Tier '+currentTier+'</h3>')}
    group.entries.sort((a,b)=>a.recipe.parents.map(name).join(' + ').localeCompare(b.recipe.parents.map(name).join(' + ')));
    const expanded=openGroups.has(group.result.id)?' open':'';
    html.push('<details class="recipe-animal-group" data-animal="'+esc(group.result.id)+'"'+expanded+'><summary><strong>'+esc(group.result.name)+'</strong><span class="pill">'+group.entries.length+' recipe'+(group.entries.length===1?'':'s')+'</span></summary><div class="recipe-group-body">'+group.entries.map(({recipe,index})=>'<div class="item"><span>'+esc(recipe.parents.map(name).join(' + '))+'</span>'+(typeof isAdmin!=='undefined'&&isAdmin?'<button class="danger" onclick="removeRecipe('+index+')">Remove</button>':'')+'</div>').join('')+'</div></details>');
  }
  list.innerHTML=html.join('')||'<p class="muted">No recipes match. Turn on Show spoilers to browse recipes for undiscovered animals.</p>';
  // Count exactly the recipe rows displayed by the active tier/search filters.
  const visibleRecipeCount = groups.reduce((total, group) => total + group.entries.length, 0);
  document.getElementById('recipeCount').textContent = '(' + visibleRecipeCount + ')';
};
search.addEventListener('input',()=>renderRecipes());
tier.addEventListener('change',()=>renderRecipes());
renderRecipes();
})();
