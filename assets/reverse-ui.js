(function(){
  'use strict';
  const target=document.getElementById('reverseTarget');
  const qty=document.getElementById('reverseQty');
  const output=document.getElementById('reverseOutput');
  if(!target||!qty||!output)return;
  const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style=document.createElement('style');style.textContent='.reverse-picker{position:relative}.reverse-picker-menu{position:absolute;z-index:60;top:100%;left:0;right:0;background:white;border:1px solid #edc9da;border-radius:10px;box-shadow:0 8px 20px #50344530;max-height:260px;overflow:auto}.reverse-picker-menu[hidden]{display:none}.reverse-picker-option{display:block;width:100%;text-align:left;background:white;color:#503445;border-radius:0;padding:10px 12px;border-bottom:1px solid #f5dfeb}.reverse-picker-option:hover,.reverse-picker-option.active{background:#ffe0ee}';document.head.append(style);
  const wrapper=document.createElement('div');
  wrapper.className='reverse-picker';
  const input=document.createElement('input');
  input.type='search';input.autocomplete='off';input.placeholder='Start typing an animal name…';
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
  const menu=document.createElement('div');menu.className='reverse-picker-menu';menu.hidden=true;menu.setAttribute('role','listbox');
  target.before(wrapper);wrapper.append(input,menu,target);target.style.display='none';
  let matches=[],active=-1,selectedId='',lastSignature='';
  function items(){return [...data.animals].sort((a,b)=>a.name.localeCompare(b.name));}
  function selectedLabel(){const a=data.animals.find(a=>a.id===selectedId);return a?a.name+' (Tier '+a.tier+')':'';}
  function close(restore=false){menu.hidden=true;input.setAttribute('aria-expanded','false');active=-1;if(restore)input.value=selectedLabel();}
  function paint(){[...menu.children].forEach((el,i)=>{el.classList.toggle('active',i===active);el.setAttribute('aria-selected',String(i===active));});if(active>=0)menu.children[active]?.scrollIntoView({block:'nearest'});}
  function choose(i){const a=matches[i];if(!a)return;selectedId=a.id;target.value=a.id;input.value=selectedLabel();close();input.focus();}
  function show(){const q=input.value.trim().toLowerCase();matches=items().filter(a=>a.name.toLowerCase().includes(q)).slice(0,80);active=-1;menu.replaceChildren();matches.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.className='reverse-picker-option';b.textContent=a.name+' (Tier '+a.tier+')';b.setAttribute('role','option');b.addEventListener('pointerdown',e=>e.preventDefault());b.addEventListener('click',()=>choose(i));menu.append(b);});menu.hidden=!matches.length;input.setAttribute('aria-expanded',String(!menu.hidden));}
  function sync(){
    const list=items();const signature=list.map(a=>a.id+':'+a.name+':'+a.tier).join('|');
    if(signature===lastSignature)return;
    lastSignature=signature;
    target.innerHTML='<option value="">Choose an animal…</option>'+list.map(a=>'<option value="'+escapeText(a.id)+'">'+escapeText(a.name)+' (Tier '+a.tier+')</option>').join('');
    if(list.some(a=>a.id===selectedId)){target.value=selectedId;}else{selectedId='';target.value='';}
    if(document.activeElement!==input)input.value=selectedLabel();
    if(document.activeElement===input)show();
  }
  input.addEventListener('focus',()=>{input.select();show();});
  input.addEventListener('input',()=>{selectedId='';target.value='';show();});
  input.addEventListener('keydown',e=>{
    if(!['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    if(e.key==='Escape'){close(true);return;}
    if(menu.hidden)show();
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      if(!matches.length)return;
      active=e.key==='ArrowDown'?(active+1)%matches.length:(active<0?matches.length-1:(active-1+matches.length)%matches.length);
      paint();return;
    }
    if(e.key==='Enter'&&matches.length)choose(active<0?0:active);
  });
  input.addEventListener('blur',()=>setTimeout(()=>close(true),150));
  function render(){
    sync();
    if(!remoteReady){output.innerHTML='<p class="notice">Wait for the shared encyclopedia to finish loading.</p>';return;}
    if(!selectedId){output.innerHTML='<p class="notice">Choose an animal from the suggestions first.</p>';return;}
    const result=PetlingsReversePlanner.calculate(data.animals,data.recipes,selectedId,qty.value);
    if(result.error){output.innerHTML='<p class="notice">'+escapeText(result.error)+'</p>';return;}
    const label=id=>data.animals.find(a=>a.id===id)?.name||'Unknown';
    output.innerHTML='<div class="reverse-summary"><strong>'+escapeText(result.target.name)+'</strong> · '+result.quantity+' needed · '+result.totalAlternatives+' complete top-level recipe option(s) found</div>'+result.plans.map((plan,i)=>'<div class="reverse-card"><h3>'+(i===0?'Recommended known path':'Alternative '+(i+1))+'</h3><strong>Tier 1 shopping list</strong><div class="reverse-base">'+plan.base.map(b=>'<span class="pill">'+b.count+' × '+escapeText(label(b.id))+'</span>').join('')+'</div><strong>'+plan.merges+' merges total</strong><details'+(i===0?' open':'')+'><summary>Step-by-step breeding order</summary><ol class="reverse-steps">'+plan.steps.map(step=>'<li>'+step.parents.map(p=>escapeText(label(p))).join(' + ')+' → <strong>'+escapeText(label(step.result))+'</strong></li>').join('')+'</ol></details></div>').join('')+'<p class="reverse-note">Plans assume you start with Tier 1 animals and use only confirmed recipes. Alternatives vary by the final recipe; intermediate steps use the best known chain. The count is not an inventory check. Tier 8–10 currently assume three parents.</p>';
  }
  document.getElementById('reverseCalculate').addEventListener('click',render);
  // Hook both normal re-renders and remote loads, including the initial asynchronous load.
  const previousRenderAll=renderAll;
  renderAll=function(){previousRenderAll();sync();};
  const previousLoadShared=loadShared;
  loadShared=async function(){const result=await previousLoadShared();sync();return result;};
  sync();
})();
