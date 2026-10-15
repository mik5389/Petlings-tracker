// Unified breeding planner and step-by-step inventory updates.
(function(){
'use strict';
const planner=document.getElementById('planner');
if(!planner||!window.PetlingsGuidedEngine||!window.PetlingsQuickMerge)return;
// Preserve legacy tools in source for compatibility, but remove their duplicate panels from the interface.
// Keep legacy DOM nodes for core renderAll() compatibility; hide redundant interfaces.
for(const oldPanel of planner.querySelectorAll(':scope > .panel'))oldPanel.hidden=true;
const inventory=document.getElementById('inventory');
const inventoryPanels=inventory.querySelectorAll(':scope > .panel');
if(inventoryPanels[2])inventoryPanels[2].hidden=true;
const quick=document.getElementById('quickMergePanel');if(quick)quick.hidden=true;
const panel=document.createElement('div');panel.className='panel';panel.id='guidedPlanner';
panel.innerHTML=`<h2>🐾 Breeding Planner</h2><p class="muted">One plan, two ways to calculate. Follow the highlighted step while playing; complete merges here to update your personal inventory.</p>
<div class="fields"><div><label for="guidedMode">Calculate using</label><select id="guidedMode"><option value="inventory">My current inventory</option><option value="scratch">From scratch (Tier 1)</option></select></div><div><label for="guidedType">Plan for</label><select id="guidedType"><option value="animal">An animal</option><option value="combination">An experimental combination</option></select></div></div>
<div id="guidedAnimalFields"><div class="fields"><div><label for="guidedSearch">Target animal</label><input id="guidedSearch" type="search" autocomplete="off" placeholder="Type an animal name…" role="combobox" aria-expanded="false"><div id="guidedSuggestions" class="guided-suggestions" hidden></div></div><div><label for="guidedQty">Quantity</label><input id="guidedQty" type="number" min="1" max="10" value="1"></div></div></div>
<div id="guidedCombinationFields" hidden><p class="muted">Choose same-tier parents. The final experimental result stays unknown until you identify it.</p><div class="fields"><div><label for="guidedParentTier">Parent tier</label><select id="guidedParentTier"></select></div><div><label for="guidedParents">Parents</label><div id="guidedParents"></div></div></div></div>
<div class="inline"><button type="button" id="guidedCalculate">Build breeding plan</button><button type="button" class="secondary" id="guidedRecalculate">Recalculate using latest inventory</button><button type="button" class="secondary" id="guidedClear">Clear plan</button></div>
<div id="guidedOutput" aria-live="polite"></div>`;
planner.prepend(panel);
const guidedStyle=document.createElement('style');
guidedStyle.textContent='.guided-step-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.guided-step-actions button{font-size:.9rem}.guided-step-actions p{flex-basis:100%;margin:0}.guided-finish{margin-top:18px;padding-top:14px;border-top:1px solid #f1d5e3}.guided-finish button:disabled{opacity:.45;cursor:not-allowed}.guided-step.current{outline:2px solid #d94f91;outline-offset:-2px}';
document.head.append(guidedStyle);
const el=id=>document.getElementById(id);
const search=el('guidedSearch'),suggestions=el('guidedSuggestions'),tier=el('guidedParentTier');
let selected='',matches=[],active=-1,current=null,index=0,history=[],signature='',baseline=null;
const label=id=>animal(id)?.name||'Unknown';
const safe=s=>esc(String(s));
function persist(){if(typeof personalSave==='function')personalSave();else localStorage.setItem(KEY,JSON.stringify(data))}
function syncInventory(){renderInventory();renderInventoryCombos();}
function choose(id){selected=id;search.value=label(id);suggestions.hidden=true;search.setAttribute('aria-expanded','false')}
function showSuggestions(){const q=search.value.trim().toLowerCase();matches=data.animals.filter(a=>a.name.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,45);active=-1;suggestions.replaceChildren();matches.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.textContent=a.name+' (Tier '+a.tier+')';b.addEventListener('pointerdown',e=>e.preventDefault());b.addEventListener('click',()=>choose(a.id));suggestions.append(b)});suggestions.hidden=!matches.length;search.setAttribute('aria-expanded',String(!suggestions.hidden))}
search.addEventListener('input',()=>{selected='';showSuggestions()});search.addEventListener('focus',()=>{search.select();showSuggestions()});search.addEventListener('blur',()=>setTimeout(()=>suggestions.hidden=true,160));
search.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){suggestions.hidden=true;return}if(suggestions.hidden)showSuggestions();if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!matches.length)return;active=e.key==='ArrowDown'?(active+1)%matches.length:(active<0?matches.length-1:(active-1+matches.length)%matches.length);Array.from(suggestions.children).forEach((b,i)=>b.classList.toggle('active',i===active));suggestions.children[active]?.scrollIntoView({block:'nearest'})}else if(matches.length)choose(matches[active<0?0:active].id)});
function fillTiers(){const old=tier.value;tier.innerHTML=Array.from({length:9},(_,i)=>'<option value="'+(i+1)+'">Tier '+(i+1)+' → '+(i+2)+'</option>').join('');if(old)tier.value=old;fillParents()}
function fillParents(){const t=Number(tier.value||1),arr=tierAnimals(t),n=t>=7?3:2;const box=el('guidedParents');const previous=Array.from(box.querySelectorAll('select')).map(s=>s.value);box.innerHTML=Array.from({length:n},(_,i)=>'<select class="guided-parent" aria-label="Parent '+(i+1)+'">'+arr.map(a=>'<option value="'+safe(a.id)+'">'+safe(a.name)+'</option>').join('')+'</select>').join('');box.querySelectorAll('select').forEach((s,i)=>{if(previous[i]&&arr.some(a=>a.id===previous[i]))s.value=previous[i]})}
tier.addEventListener('change',fillParents);
el('guidedType').addEventListener('change',()=>{const experimental=el('guidedType').value==='combination';el('guidedAnimalFields').hidden=experimental;el('guidedCombinationFields').hidden=!experimental});
// Revert only the inventory changes caused by a guided merge. Other manual
// adjustments (including newly hatched animals) are preserved.
function reverseMerge(inv,entry){
  const next={...inv};
  const delta=entry.delta;
  for(const [id,change] of Object.entries(delta)){
    const updated=Number(next[id]||0)-change;
    if(!Number.isFinite(updated)||updated<0)return null;
    next[id]=updated;
  }
  return next;
}
function reverseHistory(inv){
  let next={...inv};
  for(let i=history.length-1;i>=0;i--){
    next=reverseMerge(next,history[i]);
    if(!next)return null;
  }
  return next;
}
function discardPlan(){current=null;index=0;history=[];baseline=null;el('guidedOutput').replaceChildren()}
function clearPlan(){
  if(!current){discardPlan();return;}
  if(!confirm('Clear this breeding plan and reverse its recorded merges? Animals hatched or added separately will be kept.'))return;
  const restored=reverseHistory(data.inventory);
  if(!restored){
    alert('Some animals produced by this plan are no longer in inventory. The plan cannot safely undo all merges. Nothing was changed.');
    return;
  }
  data.inventory=restored;persist();syncInventory();discardPlan();toast('Plan cleared. Guided merges reversed; other inventory changes kept.');
}
el('guidedClear').addEventListener('click',clearPlan);
function makeRequest(){if(el('guidedType').value==='combination')return {type:'combination',parents:[...document.querySelectorAll('.guided-parent')].map(s=>s.value)};return {type:'animal',target:selected,quantity:Number(el('guidedQty').value)}}
function calculate(request){
  if(!remoteReady){el('guidedOutput').textContent='Wait for the shared encyclopedia to load.';return;}
  // Recalculation always uses CURRENT quantities. Do not restore the starting
  // snapshot: that would discard animals hatched while following the plan.
  if(current&&history.length&&!confirm('Recalculate from your current inventory? Completed merges and newly hatched animals will be kept. The old checklist and its Undo history will be replaced.'))return;
  const result=PetlingsGuidedEngine.plan(data.animals,data.recipes,data.inventory,request,el('guidedMode').value);
  if(result.error){el('guidedOutput').innerHTML='<p class="notice">'+safe(result.error)+'</p>';return;}
  discardPlan();current=result;baseline={...data.inventory};signature=JSON.stringify(request);draw();
}
el('guidedCalculate').addEventListener('click',()=>calculate(makeRequest()));
el('guidedRecalculate').addEventListener('click',()=>calculate(makeRequest()));
function draw(){const out=el('guidedOutput');if(!current)return;const steps=current.steps,done=index===steps.length;const missing=current.missing.map(m=>m.count+' × '+label(m.id));let html='<div class="guided-summary"><strong>'+index+' / '+steps.length+' preparation merges completed</strong><p class="muted">'+(current.mode==='scratch'?'From scratch':'Using your inventory at calculation time')+' · '+steps.length+' known merges</p>'+(missing.length?'<p class="notice"><strong>Additional Tier 1 animals needed:</strong> '+safe(missing.join(', '))+'. Add these to your inventory before completing dependent steps.</p>':'<p class="muted">No additional Tier 1 animals needed for the calculated path.</p>')+'</div>';
html+='<div class="guided-progress"><div style="width:'+(steps.length?Math.round(index/steps.length*100):100)+'%"></div></div><div class="guided-steps">';
steps.forEach((s,i)=>{const state=i<index?'done':i===index?'current':'upcoming';html+='<div class="guided-step '+state+'"><span class="guided-step-number">'+(i+1)+'.</span><div><strong>'+safe(s.parents.map(label).join(' + '))+' → '+safe(label(s.result))+'</strong><div class="muted small">'+(state==='done'?'Completed':state==='current'?'Current merge':'Coming up')+'</div>'+(state==='current'?'<div class="guided-step-actions"><button id="guidedNext" type="button">Complete merge &amp; next step →</button><button id="guidedUndo" type="button" class="secondary" '+(!history.length?'disabled':'')+'>Undo last merge</button><p id="guidedMessage" class="muted small" aria-live="polite"></p></div>':'')+'</div></div>'});html+='</div>';
if(current.experiment)html+='<div class="notice"><strong>Final experiment:</strong> '+safe(current.experiment.parents.map(label).join(' + '))+' → Unknown result. Try it in the game, then record the animal you received. This final experiment is not automatically applied to inventory.</div>';
if(done)html+='<p class="notice">All planned preparation merges are complete.'+(current.experiment?' The final unknown-result experiment is not recorded automatically.':'')+'</p><div class="guided-step-actions"><button id="guidedUndo" type="button" class="secondary" '+(!history.length?'disabled':'')+'>Undo last merge</button><p id="guidedMessage" class="muted small" aria-live="polite"></p></div>'; 
html+='<div class="guided-finish"><button id="guidedFinish" type="button" '+(!done?'disabled':'')+'>Finish plan — keep inventory &amp; close checklist</button><p class="muted small">Finish preserves your inventory. Clear Plan reverses only guided merges and keeps separately hatched animals. Recalculate starts a new checklist from current inventory.</p></div>';
out.innerHTML=html;
if(el('guidedNext'))el('guidedNext').onclick=complete;
if(el('guidedUndo'))el('guidedUndo').onclick=undo;
el('guidedFinish').onclick=finishPlan;
}
function finishPlan(){if(!current||index!==current.steps.length)return;discardPlan();toast('Plan finished. Inventory changes kept.')}
function complete(){
  if(!current||index>=current.steps.length)return;
  const s=current.steps[index];
  try{
    const before={...data.inventory},after=PetlingsQuickMerge.apply(before,s.parents,s.result,1);
    const delta={};
    for(const id of new Set([...Object.keys(before),...Object.keys(after)])){
      const change=Number(after[id]||0)-Number(before[id]||0);
      if(change)delta[id]=change;
    }
    data.inventory=after;persist();history.push({delta});index++;syncInventory();draw();
  }catch(e){const message=el('guidedMessage');if(message)message.textContent=e.message+'. Add the required animals to inventory, then recalculate or try again.'}
}
function undo(){
  const last=history[history.length-1];if(!last)return;
  const restored=reverseMerge(data.inventory,last);
  if(!restored){
    const message=el('guidedMessage');
    if(message)message.textContent='Cannot undo safely: an animal produced by this merge is no longer available. No inventory changes were made.';
    return;
  }
  data.inventory=restored;history.pop();index=Math.max(0,index-1);persist();syncInventory();draw();
}
// Discover can open the guided planner without duplicating its calculation logic.
window.PetlingsGuided={openCombination(parents){el('guidedType').value='combination';el('guidedType').dispatchEvent(new Event('change'));const t=animal(parents[0])?.tier;if(t)tier.value=String(t);fillParents();document.querySelectorAll('.guided-parent').forEach((s,i)=>s.value=parents[i]||'');go();calculate({type:'combination',parents})},openAnimal(id){el('guidedType').value='animal';el('guidedType').dispatchEvent(new Event('change'));choose(id);go();calculate({type:'animal',target:id,quantity:1})}};
function go(){document.querySelector('#tabs button[data-tab="planner"]')?.click();panel.scrollIntoView({block:'start',behavior:'smooth'})}
// Keep the planner stable when inventory changes, but refresh tier choices after shared data loads.
const oldRender=renderAll;renderAll=function(){oldRender();fillTiers()};fillTiers();
})();