// Admin-only bulk recipe correction. Server RPC enforces authorization and atomicity.
(function(){
'use strict';
const recipesSection=document.getElementById('recipes');
const list=document.getElementById('recipeList');
if(!recipesSection||!list)return;
const panel=document.createElement('div');panel.className='panel';panel.id='bulkRecipeManager';panel.hidden=true;
panel.innerHTML=`<h2>Manage recipes in bulk</h2><p class="muted">Move recipes assigned to the wrong result animal, or delete a batch. Only the current farm is affected.</p>
<div class="fields"><div><label for="brmSource">Recipes currently assigned to</label><select id="brmSource"></select></div><div><label for="brmAction">Action</label><select id="brmAction"><option value="move">Move selected recipes</option><option value="delete">Delete selected recipes</option></select></div><div id="brmTargetField"><label for="brmTarget">Correct result animal</label><select id="brmTarget"></select></div></div>
<div class="inline"><button type="button" class="secondary" id="brmSelectAll">Select all shown</button><button type="button" class="secondary" id="brmClear">Clear selection</button><span class="muted" id="brmCount"></span></div>
<div id="brmRows" class="scroll" style="max-height:380px;margin:12px 0"></div>
<button type="button" id="brmApply">Apply to selected recipes</button><p id="brmStatus" class="muted" aria-live="polite"></p>`;
const recipePanel=list.closest('.panel');recipePanel.parentNode.insertBefore(panel,recipePanel);
const el=id=>document.getElementById(id);
const source=el('brmSource'),target=el('brmTarget'),action=el('brmAction'),rows=el('brmRows'),count=el('brmCount'),status=el('brmStatus');
const selected=new Set();let busy=false;let previousFarm=null;let previousSignature='';
function farm(){return window.PetlingsFarms?.current||'main'}
function validId(r){return Number.isSafeInteger(Number(r.dbid))&&Number(r.dbid)>0}
function entries(){return data.recipes.filter(r=>r.result===source.value&&validId(r))}
function refreshRows(){
 const items=entries();const ids=new Set(items.map(r=>Number(r.dbid)));
 for(const id of selected)if(!ids.has(id))selected.delete(id);
 rows.replaceChildren();
 for(const r of items){const line=document.createElement('label');line.className='item';line.style.cssText='display:flex;justify-content:flex-start;gap:12px;cursor:pointer';
 const check=document.createElement('input');check.type='checkbox';check.className='check';check.checked=selected.has(Number(r.dbid));check.disabled=busy;
 check.addEventListener('change',()=>{if(check.checked)selected.add(Number(r.dbid));else selected.delete(Number(r.dbid));updateCount()});
 const label=document.createElement('span');label.textContent=r.parents.map(name).join(' + ');line.append(check,label);rows.append(line)}
 if(!items.length){const p=document.createElement('p');p.className='muted';p.textContent='No recipes for this animal.';rows.append(p)}
 updateCount();
}
function updateCount(){count.textContent=selected.size+' selected of '+entries().length;el('brmApply').disabled=busy||!selected.size||action.value==='move'&&!target.value;}
function refreshTargets(){
 const original=target.value;const a=animal(source.value);
 const candidates=data.animals.filter(x=>a&&x.tier===a.tier&&x.id!==a.id).sort((x,y)=>x.name.localeCompare(y.name));
 target.replaceChildren();for(const x of candidates){const opt=document.createElement('option');opt.value=x.id;opt.textContent=x.name;target.append(opt)}
 if(candidates.some(x=>x.id===original))target.value=original;
 el('brmTargetField').hidden=action.value!=='move';updateCount();
}
function refresh(){
 const admin=typeof isAdmin!=='undefined'&&isAdmin===true;
 panel.hidden=!admin;if(!admin)return;
 const f=farm();const signature=data.animals.map(a=>a.id).join(',')+'|'+data.recipes.length;
 if(f!==previousFarm){selected.clear();source.value='';previousFarm=f;status.textContent=''}
 const old=source.value;const animals=data.animals.filter(a=>data.recipes.some(r=>r.result===a.id)).sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name));
 source.replaceChildren();for(const a of animals){const opt=document.createElement('option');opt.value=a.id;opt.textContent=a.name+' ('+data.recipes.filter(r=>r.result===a.id).length+')';source.append(opt)}
 if(animals.some(a=>a.id===old))source.value=old;
 if(signature!==previousSignature){selected.clear();previousSignature=signature}
 refreshTargets();refreshRows();
}
source.addEventListener('change',()=>{selected.clear();status.textContent='';refreshTargets();refreshRows()});
action.addEventListener('change',refreshTargets);target.addEventListener('change',updateCount);
el('brmSelectAll').addEventListener('click',()=>{for(const r of entries())selected.add(Number(r.dbid));refreshRows()});
el('brmClear').addEventListener('click',()=>{selected.clear();refreshRows()});
el('brmApply').addEventListener('click',async()=>{
 if(busy||typeof isAdmin==='undefined'||!isAdmin||!selected.size)return;
 const ids=[...selected],originalFarm=farm(),from=animal(source.value),to=animal(target.value);
 if(!from){status.textContent='Choose an animal first.';return}
 if(action.value==='move'&&(!to||to.id===from.id||to.tier!==from.tier)){status.textContent='Choose a different animal in the same tier.';return}
 const verb=action.value==='move'?'MOVE':'DELETE';
 const description=action.value==='move'?`Move ${ids.length} recipes from ${from.name} to ${to.name}?`:`PERMANENTLY DELETE ${ids.length} recipes from ${from.name}?`;
 if(!confirm(description+'\n\nThis changes the shared encyclopedia for all players.'))return;
 busy=true;updateCount();status.textContent='Saving '+ids.length+' changes…';
 try{
  const {data:changed,error}=await api.rpc('petlings_bulk_manage_recipes',{p_ids:ids,p_action:action.value,p_target_id:action.value==='move'?Number(to.id.slice(1)):null,p_farm:originalFarm});
  if(error)throw error;
  if(Number(changed)!==ids.length)throw Error('Unexpected changed-row count. Refresh before trying again.');
  selected.clear();status.textContent=changed+' recipes updated. Refreshing…';
  await loadShared();status.textContent=changed+' recipes '+(action.value==='move'?'moved':'deleted')+' successfully.';
 }catch(e){status.textContent='Batch failed: '+(e?.message||String(e))+' — no automatic retry. Check the database before retrying.'}
 finally{busy=false;refresh()}
});
const prior=renderAll;renderAll=function(...args){const result=prior.apply(this,args);refresh();return result};
document.addEventListener('petlings:farm-changed',refresh);
refresh();
})();
