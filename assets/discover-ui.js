// Personal animal-discovery checklist; shared recipe database remains read-only here.
(function () {
  'use strict';
  const mode = document.getElementById('discoveryMode');
  const tier = document.getElementById('discoverTier');
  const reveal = document.getElementById('discoveryReveal');
  const status = document.getElementById('discoveryStatus');
  const filter = document.getElementById('discoverFilter');
  const list = document.getElementById('discoverList');
  const stats = document.getElementById('discoverStats');
  const pager = document.getElementById('discoverPager');
  const markInput = document.getElementById('discoveryMarkAnimal');
  const markList = document.getElementById('discoveryAnimalNames');
  const revealKey = 'petlings-discovery-reveal-v1';
  const modeKey = 'petlings-discovery-mode-v1';
  const statusKey = 'petlings-discovery-status-v1';
  const pageSize = 60;
  let currentPage = 0;
  let rankingRun = 0;
  let rankingCache = {key:null, entries:null};
  try { reveal.checked = localStorage.getItem(revealKey) === 'true'; mode.value = localStorage.getItem(modeKey) || 'animals'; status.value = localStorage.getItem(statusKey) || 'undiscovered'; } catch (_) {}
  function parentCount(parentTier) { return parentTier >= 7 ? 3 : 2; }
  function persist() { if (typeof personalSave === 'function') personalSave(); else save(); }
  function isKnownAnimal(a) { return a.discovered === true; }
  function setDiscovered(id, discovered) {
    const a = animal(id);
    if (!a || a.discovered === discovered) return;
    a.discovered = discovered;
    persist();
    toast(a.name + (discovered ? ' marked discovered!' : ' marked undiscovered!'));
    renderDiscover();
    updateMarkButton();
  }
  function makeRow(text, note, id, spoiler) {
    const row = document.createElement('div'); row.className = 'discovery-result';
    const heading = document.createElement('div'); heading.className = spoiler ? 'discovery-hidden' : '';
    heading.textContent = text; row.appendChild(heading);
    const subtitle = document.createElement('div'); subtitle.className = 'muted small'; subtitle.textContent = note; row.appendChild(subtitle);
    if (id) {
      const actions = document.createElement('div'); actions.className = 'discovery-actions';
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'secondary';
      const a = animal(id);
      btn.textContent = a?.discovered ? 'Mark undiscovered' : 'Mark discovered';
      btn.setAttribute('aria-label', btn.textContent + ': ' + (a?.name || 'animal'));
      btn.addEventListener('click', () => setDiscovered(id, !a?.discovered)); actions.appendChild(btn); row.appendChild(actions);
    }
    return row;
  }
  function updateMarkOptions() {
    const q = markInput.value.trim().toLocaleLowerCase();
    const options = data.animals.filter(a => !q || a.name.toLocaleLowerCase().includes(q))
      .sort((a,b) => a.name.localeCompare(b.name)).slice(0,100);
    markList.replaceChildren(...options.map(a => {
      const opt = document.createElement('option'); opt.value = a.name; return opt;
    }));
  }
  function rankingKey(kind, extra) {
    // Recalculate whenever inventory, recipes, animals, or the chosen filters change.
    return JSON.stringify([kind, extra, data.inventory, data.recipes, data.animals.map(a=>[a.id,a.tier,a.discovered]), data.tried]);
  }
  function evaluateParents(parents) {
    if (!window.PetlingsGuidedEngine) return {missing:Infinity,merges:Infinity,error:'Planner unavailable'};
    try {
      const result=window.PetlingsGuidedEngine.plan(data.animals,data.recipes,data.inventory,{type:'combination',parents},'inventory');
      if(result.error)return {missing:Infinity,merges:Infinity,error:result.error};
      return {missing:result.missing.reduce((n,x)=>n+x.count,0),merges:result.merges,error:null};
    } catch(e) { return {missing:Infinity,merges:Infinity,error:String(e.message||e)}; }
  }
  const rankCompare=(a,b)=>a.missing-b.missing||a.merges-b.merges||a.sortName.localeCompare(b.sortName);
  function calculateRanked(kind,key,items,calculate,finished) {
    const token=++rankingRun;
    if(rankingCache.key===key && rankingCache.entries){finished(rankingCache.entries);return;}
    const results=[];let position=0;
    stats.textContent='Ranking combinations using your current inventory… 0 / '+items.length;
    pager.replaceChildren();
    list.replaceChildren();
    const progress=document.createElement('p');progress.className='muted';progress.textContent='Finding the easiest combinations…';list.append(progress);
    function batch(){
      if(token!==rankingRun)return;
      const end=Math.min(position+3,items.length);
      for(;position<end;position++)results.push(calculate(items[position]));
      if(position<items.length){
        stats.textContent='Ranking combinations using your current inventory… '+position+' / '+items.length;
        setTimeout(batch,0);return;
      }
      results.sort(rankCompare);
      rankingCache={key,entries:results};
      finished(results);
    }
    setTimeout(batch,0);
  }
  function renderPersonal() {
    const t=Number(tier.value||1),targetTier=t+1;
    const allInTier=data.animals.filter(a=>Number(a.tier)===targetTier);
    const discoveredCount=allInTier.filter(a=>a.discovered===true).length;
    const candidates=allInTier.filter(a=>status.value==='all'||(status.value==='discovered'?a.discovered===true:a.discovered!==true));
    const recipesByResult=new Map();
    for(const r of data.recipes){if(!recipesByResult.has(r.result))recipesByResult.set(r.result,[]);recipesByResult.get(r.result).push(r);}
    const entries=candidates.map(a=>({a,recipes:recipesByResult.get(a.id)||[]}));
    const key=rankingKey('personal',[t,status.value]);
    calculateRanked('personal',key,entries,entry=>{
      let best={missing:Infinity,merges:Infinity},bestRecipe=null;
      for(const recipe of entry.recipes){
        const rank=evaluateParents(recipe.parents);
        if(rank.missing<best.missing||(rank.missing===best.missing&&rank.merges<best.merges)){best=rank;bestRecipe=recipe;}
        if(best.missing===0&&best.merges===0)break;
      }
      return {...entry,...best,bestRecipe,sortName:entry.a.name};
    },ranked=>{
      list.replaceChildren();
      const selectedLabel=status.value==='all'?'All animals':status.value==='discovered'?'Discovered':'Undiscovered';
      stats.textContent=selectedLabel+': '+ranked.length+' shown · Tier '+targetTier+' · '+discoveredCount+' discovered · '+(allInTier.length-discoveredCount)+' undiscovered · ranked by missing Tier 1 animals, then merges.';
      currentPage=Math.min(currentPage,Math.max(0,Math.ceil(ranked.length/pageSize)-1));
      for(const entry of ranked.slice(currentPage*pageSize,(currentPage+1)*pageSize)){
        const {a,recipes,bestRecipe,missing,merges}=entry;
        const visible=reveal.checked||a.discovered;
        const title=visible?a.name+' (Tier '+a.tier+')':bestRecipe?bestRecipe.parents.map(name).join(' + '):'Undocumented animal';
        const readiness=Number.isFinite(missing)?(missing===0?(merges===0?'Ready to merge now':'Can breed with current inventory · '+merges+' merges'):'Missing '+missing+' Tier 1 animals · '+merges+' merges'):'No complete known breeding path';
        const note=(visible&&bestRecipe?'Best known recipe: '+bestRecipe.parents.map(name).join(' + ')+' · ':'')+readiness;
        const row=makeRow(title,note,visible?a.id:null,!visible);
        list.append(row);
        if(bestRecipe)attachPlan(row,bestRecipe.parents);
        if(visible&&recipes.length>1){
          const details=document.createElement('details'),summary=document.createElement('summary');
          summary.textContent='See all '+recipes.length+' known recipes';details.append(summary);
          for(const r of recipes){const line=document.createElement('div');line.className='small';line.textContent=r.parents.map(name).join(' + ');details.append(line);}
          row.append(details);
        }
      }
      if(!ranked.length)list.append(makeRow('No matching animals.','Try another tier or discovery filter.',null,false));
      renderPages(ranked.length);updateMarkOptions();
    });
  }
  function *allCombinations(ids, n) {
    if (n === 2) {
      for (let i=0;i<ids.length;i++) for (let j=i;j<ids.length;j++) yield [ids[i],ids[j]];
    } else {
      for (let i=0;i<ids.length;i++) for (let j=i;j<ids.length;j++) for (let k=j;k<ids.length;k++) yield [ids[i],ids[j],ids[k]];
    }
  }
  function renderMissing() {
    const t=Number(tier.value||1),ids=tierAnimals(t).map(a=>a.id);
    const known=knownKeys(),tried=new Set(data.tried),wanted=filter.value;
    const entries=[];
    for(const parents of allCombinations(ids,parentCount(t))){
      const key=comboKey(parents);if(known.has(key))continue;
      const isTried=tried.has(key);
      if((wanted==='untried'&&isTried)||(wanted==='tried'&&!isTried))continue;
      entries.push({parents,key,isTried});
    }
    const key=rankingKey('missing',[t,wanted]);
    calculateRanked('missing',key,entries,entry=>({...entry,...evaluateParents(entry.parents),sortName:entry.parents.map(name).join(' + ')}),ranked=>{
      list.replaceChildren();
      stats.textContent=ranked.length+' undocumented combinations from Tier '+t+' parents · sorted by missing Tier 1 animals, then preparation merges. Results use your inventory.';
      currentPage=Math.min(currentPage,Math.max(0,Math.ceil(ranked.length/pageSize)-1));
      for(const entry of ranked.slice(currentPage*pageSize,(currentPage+1)*pageSize)){
        const {parents,key,isTried,missing,merges}=entry;
        const note=(isTried?'Marked tried · ':'')+(Number.isFinite(missing)?'Missing '+missing+' Tier 1 animals · '+merges+' preparation merges':'No complete known path');
        const row=makeRow(parents.map(name).join(' + '),note,null,false);
        const btn=document.createElement('button');btn.type='button';btn.className='secondary';
        btn.textContent=isTried?'Mark not tried':'Mark tried';
        btn.addEventListener('click',()=>{toggleTried(key);renderDiscover();});
        row.append(btn);list.append(row);attachPlan(row,parents);
      }
      if(!ranked.length)list.append(makeRow('No matching undocumented combinations.','Try another tier or filter.',null,false));
      renderPages(ranked.length);
    });
  }
  // On-demand comparison. Work in small batches so large recipe collections do not freeze the page.
  function attachReadiness(row, combinations) {
    if (!window.PetlingsGuidedEngine || !combinations.length) return;
    const button=document.createElement('button');button.type='button';button.className='secondary discovery-readiness-button';
    button.textContent=combinations.length>1?'Compare breeding options':'Check inventory readiness';
    const results=document.createElement('div');results.className='discovery-readiness-results';
    row.append(button,results);
    let run=0;
    button.addEventListener('click',()=>{
      const token=++run;
      const inventoryAtStart=JSON.stringify(data.inventory);
      const recipesAtStart=data.recipes;
      const candidates=combinations.slice(0,120);
      const evaluated=[];let pos=0;
      button.disabled=true;
      results.textContent='Checking breeding paths… 0 / '+candidates.length;
      function chunk(){
        if(token!==run||!row.isConnected)return;
        if(JSON.stringify(data.inventory)!==inventoryAtStart || data.recipes!==recipesAtStart){button.disabled=false;results.textContent='Inventory or recipes changed. Click again for updated results.';return;}
        const end=Math.min(pos+2,candidates.length);
        for(;pos<end;pos++){
          const parents=candidates[pos];
          const direct=parents.every(id=>parents.filter(p=>p===id).length<=Number(data.inventory[id]||0));
          const plan=window.PetlingsGuidedEngine.plan(data.animals,data.recipes,data.inventory,{type:'combination',parents},'inventory');
          if(plan.error){evaluated.push({parents,error:plan.error,missing:Infinity,merges:Infinity,direct:false});continue;}
          const missing=plan.missing.reduce((n,m)=>n+m.count,0);
          evaluated.push({parents,missing,merges:plan.merges,direct});
        }
        if(pos<candidates.length){results.textContent='Checking breeding paths… '+pos+' / '+candidates.length;setTimeout(chunk,0);return;}
        button.disabled=false;
        evaluated.sort((a,b)=>a.missing-b.missing||a.merges-b.merges);
        results.replaceChildren();
        const intro=document.createElement('p');intro.className='muted small';intro.textContent='Best options first · '+evaluated.length+' checked'+(combinations.length>120?' (first 120 of '+combinations.length+' recipes)':'')+'.';results.append(intro);
        for(const entry of evaluated.slice(0,10)){
          const line=document.createElement('div');line.className='discovery-ready-row';
          const desc=document.createElement('div');
          const names=entry.parents.map(name).join(' + ');
          const title=document.createElement('strong');title.textContent=names;desc.append(title);
          const note=document.createElement('div');note.className='muted small';
          note.textContent=entry.error?'No complete known path':entry.direct?'Ready to merge now':entry.missing===0?'Can breed using current inventory · '+entry.merges+' preparation merges':'Missing '+entry.missing+' Tier 1 animals · '+entry.merges+' preparation merges';
          desc.append(note);line.append(desc);
          const go=document.createElement('button');go.type='button';go.className='secondary';go.textContent='Plan this';
          go.onclick=()=>window.PetlingsGuided?.openCombination([...entry.parents]);line.append(go);results.append(line);
        }
        if(evaluated.length>10){const note=document.createElement('p');note.className='muted small';note.textContent='Showing the 10 easiest options.';results.append(note)}
      }
      setTimeout(chunk,0);
    });
  }
  function attachPlan(row,parents){
    if(!Array.isArray(parents)||!parents.length)return;
    const b=document.createElement('button');b.type='button';b.className='secondary discovery-plan-btn';
    b.textContent='Plan this combination';
    b.addEventListener('click',()=>{if(window.PetlingsGuided)window.PetlingsGuided.openCombination([...parents]);else toast('Planner is still loading. Please refresh.');});
    row.appendChild(b);
  }
  function renderPages(total) {
    const count = Math.max(1, Math.ceil(total/pageSize));
    const back = document.createElement('button'); back.type='button'; back.className='secondary'; back.textContent='Previous'; back.disabled=currentPage===0;
    back.addEventListener('click',()=>{currentPage--;renderDiscover();});
    const next = document.createElement('button'); next.type='button'; next.className='secondary'; next.textContent='Next'; next.disabled=currentPage>=count-1;
    next.addEventListener('click',()=>{currentPage++;renderDiscover();});
    const label = document.createElement('span'); label.textContent='Page '+(currentPage+1)+' of '+count;
    pager.replaceChildren(back,label,next); pager.className='discover-page-controls';
  }
  // Undocumented combinations are an administrator-only workspace.
  // Regular visitors retain the personal discovery checklist and spoiler toggle.
  function enforceDiscoveryAccess() {
    const admin = typeof isAdmin !== 'undefined' && isAdmin === true;
    const missingOption = mode.querySelector('option[value="missing"]');
    if (missingOption) {
      missingOption.hidden = !admin;
      missingOption.disabled = !admin;
    }
    if (!admin && mode.value !== 'animals') {
      mode.value = 'animals';
      currentPage = 0;
    }
    // Hide the complete View field (including its label and grid footprint).
    // Explicit display styling avoids layout gaps from competing CSS rules.
    const modeField = mode.parentElement;
    const fieldGrid = modeField?.parentElement;
    if (modeField) {
      modeField.hidden = !admin;
      if (admin) modeField.style.removeProperty('display');
      else modeField.style.setProperty('display', 'none', 'important');
    }
    if (fieldGrid && fieldGrid.classList.contains('fields')) {
      if (admin) fieldGrid.style.removeProperty('grid-template-columns');
      else fieldGrid.style.setProperty('grid-template-columns', 'minmax(0, 1fr)');
    }
    // The View selector remains available to administrators.
    mode.hidden = !admin;
  }
  renderDiscover = function () {
    ++rankingRun;
    enforceDiscoveryAccess();
    const isPersonal = mode.value === 'animals';
    document.getElementById('discoveryPersonalControls').hidden = !isPersonal;
    document.getElementById('discoveryMissingControls').hidden = isPersonal;
    list.replaceChildren();
    if (isPersonal) renderPersonal(); else renderMissing();
  };
  function changeView() { currentPage=0; renderDiscover(); }
  mode.addEventListener('change',()=>{try{localStorage.setItem(modeKey,mode.value);}catch(_){} changeView();});
  tier.addEventListener('change',changeView);
  function onStatusChange() {
    try { localStorage.setItem(statusKey, status.value); } catch (_) {}
    currentPage = 0;
    renderDiscover();
  }
  status.addEventListener('change', onStatusChange);
  status.addEventListener('input', onStatusChange);
  filter.addEventListener('change',changeView);
  reveal.addEventListener('change',()=>{try{localStorage.setItem(revealKey,String(reveal.checked));}catch(_){} changeView();});
  function updateMarkButton(){
    const selected = data.animals.find(a=>a.name.toLocaleLowerCase()===markInput.value.trim().toLocaleLowerCase());
    document.getElementById('discoveryMarkButton').textContent = selected?.discovered ? 'Mark undiscovered' : 'Mark discovered';
  }
  markInput.addEventListener('input',()=>{updateMarkOptions();updateMarkButton();});
  document.getElementById('discoveryMarkButton').addEventListener('click',()=>{
    const text=markInput.value.trim().toLocaleLowerCase();
    const a=data.animals.find(a=>a.name.toLocaleLowerCase()===text);
    if (!a) {toast('Choose an existing animal name');return;}
    setDiscovered(a.id, !a.discovered); markInput.value=''; updateMarkOptions();
  });
  markInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('discoveryMarkButton').click();}});
  // When the user checks Discovered on the Animals page, refresh this checklist too.
  const previousToggle = toggleDiscovered;
  toggleDiscovered = function(id) { previousToggle(id); renderDiscover(); };
  // The existing renderAll / Supabase refresh pipeline invokes renderDiscover dynamically.
  renderDiscover();
})();