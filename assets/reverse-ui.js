(function(){
  'use strict';
  const target=document.getElementById('reverseTarget');
  const qty=document.getElementById('reverseQty');
  const output=document.getElementById('reverseOutput');
  const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sync(){
    const previous=target.value;
    const items=[...data.animals].sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name));
    target.innerHTML='<option value="">Choose an animal…</option>'+items.map(a=>'<option value="'+escapeText(a.id)+'">'+escapeText(a.name)+' (Tier '+a.tier+')</option>').join('');
    if(items.some(a=>a.id===previous))target.value=previous;
  }
  function render(){
    if(!remoteReady){output.innerHTML='<p class="notice">Wait for the shared encyclopedia to finish loading.</p>';return;}
    const result=PetlingsReversePlanner.calculate(data.animals,data.recipes,target.value,qty.value);
    if(result.error){output.innerHTML='<p class="notice">'+escapeText(result.error)+'</p>';return;}
    const label=id=>data.animals.find(a=>a.id===id)?.name||'Unknown';
    output.innerHTML='<div class="reverse-summary"><strong>'+escapeText(result.target.name)+'</strong> · '+result.quantity+' needed · '+result.totalAlternatives+' complete top-level recipe option(s) found</div>'+
      result.plans.map((plan,i)=>'<div class="reverse-card"><h3>'+(i===0?'Recommended known path':'Alternative '+(i+1))+'</h3><strong>Tier 1 shopping list</strong><div class="reverse-base">'+plan.base.map(b=>'<span class="pill">'+b.count+' × '+escapeText(label(b.id))+'</span>').join('')+'</div><strong>'+plan.merges+' merges total</strong><details'+(i===0?' open':'')+'><summary>Step-by-step breeding order</summary><ol class="reverse-steps">'+plan.steps.map(step=>'<li>'+step.parents.map(p=>escapeText(label(p))).join(' + ')+' → <strong>'+escapeText(label(step.result))+'</strong></li>').join('')+'</ol></details></div>').join('')+
      '<p class="reverse-note">Plans assume you start with Tier 1 animals and use only confirmed recipes. Alternatives vary by the final recipe; intermediate steps use the best known chain. The count is not an inventory check. Tier 8–10 currently assume three parents.</p>';
  }
  document.getElementById('reverseCalculate').addEventListener('click',render);
  const originalLoadShared=loadShared;
  loadShared=async function(){await originalLoadShared();sync()};
  sync();
})();
