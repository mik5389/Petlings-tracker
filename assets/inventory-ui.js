// Petlings inventory controls: personal-only, no shared database writes.
(function(){
  'use strict';
  const section=document.getElementById('inventory');
  const list=document.getElementById('inventoryList');
  if(!section||!list)return;
  const panel=list.closest('.panel');
  const tools=document.createElement('div');
  tools.className='inventory-tools';
  tools.innerHTML=`<div class="inventory-heading"><div><strong id="inventoryOwnedCount">0 animals owned</strong><p class="muted">Only your browser's inventory changes here.</p></div><button type="button" class="danger" id="inventoryReset">Reset inventory to 0</button></div>
  <div class="inventory-filter-grid"><div><label for="inventorySearch">Find animal</label><input type="search" id="inventorySearch" placeholder="Start typing an animal…" autocomplete="off"></div><div><label for="inventoryTier">Tier</label><select id="inventoryTier"><option value="all">All tiers</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}">Tier ${i+1}</option>`).join('')}</select></div><div><label for="inventoryDisplay">Show</label><select id="inventoryDisplay"><option value="owned">Owned only</option><option value="all">All animals</option></select></div></div>
  <p class="muted" id="inventoryHint">Search for an animal to add it, or select All animals.</p>`;
  panel.insertBefore(tools,list);
  const search=document.getElementById('inventorySearch');
  const tier=document.getElementById('inventoryTier');
  const display=document.getElementById('inventoryDisplay');
  const hint=document.getElementById('inventoryHint');
  const count=document.getElementById('inventoryOwnedCount');
  const reset=document.getElementById('inventoryReset');
  function quantity(id){return Math.max(0,Math.floor(Number(data.inventory[id])||0));}
  function updateCount(){
    const owned=data.animals.filter(a=>quantity(a.id)>0);
    count.textContent=owned.length+' animal types owned · '+owned.reduce((n,a)=>n+quantity(a.id),0)+' total animals';
  }
  function draw(){
    updateCount();
    const q=search.value.trim().toLocaleLowerCase();
    const selected=tier.value;
    const rows=data.animals.filter(a=>(selected==='all'||a.tier===Number(selected))&&a.name.toLocaleLowerCase().includes(q)&&(display.value==='all'||q||quantity(a.id)>0)).sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name));
    hint.textContent=display.value==='owned'&&!q?'Showing animals you own. Search to find and add another.':'Use + / − or type a quantity. Changes save automatically.';
    list.innerHTML=rows.map(a=>`<div class="item inventory-row" data-animal-id="${esc(a.id)}"><div><strong>${esc(a.name)}</strong> <span class="pill">Tier ${a.tier}</span></div><div class="inventory-stepper"><button type="button" class="secondary" data-step="-1" aria-label="Remove one ${esc(a.name)}">−</button><input type="number" min="0" max="999999" step="1" inputmode="numeric" value="${quantity(a.id)}" aria-label="Quantity of ${esc(a.name)}"><button type="button" class="secondary" data-step="1" aria-label="Add one ${esc(a.name)}">+</button></div></div>`).join('')||'<p class="muted">No matching animals. Try searching by name or selecting All animals.</p>';
  }
  // Override only the inventory list display; other inventory calculators stay intact.
  renderInventory=draw;
  const priorSet=setInventory;
  setInventory=function(id,v){
    priorSet(id,Math.max(0,Math.min(999999,Math.floor(Number(v)||0))));
    draw();
  };
  list.addEventListener('click',e=>{
    const button=e.target.closest('button[data-step]');
    if(!button)return;
    const row=button.closest('[data-animal-id]');
    if(!row)return;
    const id=row.dataset.animalId;
    setInventory(id,quantity(id)+Number(button.dataset.step));
  });
  list.addEventListener('change',e=>{
    if(!e.target.matches('input[type="number"]'))return;
    const row=e.target.closest('[data-animal-id]');
    if(row)setInventory(row.dataset.animalId,e.target.value);
  });
  [search,tier,display].forEach(el=>el.addEventListener(el===search?'input':'change',draw));
  reset.addEventListener('click',()=>{
    if(!confirm('Set every inventory quantity to 0 on this device? Your shared animals, recipes and discovery progress will NOT be deleted.'))return;
    data.inventory={};
    // Preserve tried/discovered status; use existing personal storage format.
    if(typeof personalSave==='function')personalSave();
    else localStorage.setItem(KEY,JSON.stringify(data));
    renderInventory();
    renderInventoryCombos();
    const summary=document.getElementById('futureSummary');
    const future=document.getElementById('futureCombos');
    if(summary)summary.textContent='Inventory reset. Calculate again to refresh plans.';
    if(future)future.innerHTML='';
    toast('Inventory reset to 0');
  });
  draw();
})();
