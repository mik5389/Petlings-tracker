// Personal animal-discovery checklist; shared recipe database remains read-only here.
(function () {
  'use strict';
  const mode = document.getElementById('discoveryMode');
  const tier = document.getElementById('discoverTier');
  const reveal = document.getElementById('discoveryReveal');
  const filter = document.getElementById('discoverFilter');
  const list = document.getElementById('discoverList');
  const stats = document.getElementById('discoverStats');
  const pager = document.getElementById('discoverPager');
  const markInput = document.getElementById('discoveryMarkAnimal');
  const markList = document.getElementById('discoveryAnimalNames');
  const revealKey = 'petlings-discovery-reveal-v1';
  const modeKey = 'petlings-discovery-mode-v1';
  const pageSize = 60;
  let currentPage = 0;
  try { reveal.checked = localStorage.getItem(revealKey) === 'true'; mode.value = localStorage.getItem(modeKey) || 'animals'; } catch (_) {}
  function parentCount(parentTier) { return parentTier >= 7 ? 3 : 2; }
  function persist() { if (typeof personalSave === 'function') personalSave(); else save(); }
  function isKnownAnimal(a) { return a.discovered === true; }
  function markDiscovered(id) {
    const a = animal(id);
    if (!a || a.discovered) return;
    a.discovered = true;
    persist();
    toast(a.name + ' marked discovered!');
    renderDiscover();
  }
  function makeRow(text, note, id, spoiler) {
    const row = document.createElement('div'); row.className = 'discovery-result';
    const heading = document.createElement('div'); heading.className = spoiler ? 'discovery-hidden' : '';
    heading.textContent = text; row.appendChild(heading);
    const subtitle = document.createElement('div'); subtitle.className = 'muted small'; subtitle.textContent = note; row.appendChild(subtitle);
    if (id) {
      const actions = document.createElement('div'); actions.className = 'discovery-actions';
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'secondary';
      btn.textContent = 'Mark discovered'; btn.setAttribute('aria-label', 'Mark this animal discovered');
      btn.addEventListener('click', () => markDiscovered(id)); actions.appendChild(btn); row.appendChild(actions);
    }
    return row;
  }
  function updateMarkOptions() {
    const q = markInput.value.trim().toLocaleLowerCase();
    const options = data.animals.filter(a => !a.discovered && (!q || a.name.toLocaleLowerCase().includes(q)))
      .sort((a,b) => a.name.localeCompare(b.name)).slice(0,100);
    markList.replaceChildren(...options.map(a => {
      const opt = document.createElement('option'); opt.value = a.name; return opt;
    }));
  }
  function renderPersonal() {
    const t = Number(tier.value || 1), targetTier = t + 1;
    const candidates = PetlingsDiscoveryEngine.pendingAnimals(data.animals, data.recipes, targetTier).map(item => animal(item.id));
    const recipesByResult = new Map();
    for (const r of data.recipes) {
      if (!recipesByResult.has(r.result)) recipesByResult.set(r.result, []);
      recipesByResult.get(r.result).push(r);
    }
    const entries = candidates.map(a => ({a, recipes: recipesByResult.get(a.id) || []}))
      .sort((x,y) => x.a.name.localeCompare(y.a.name));
    stats.textContent = entries.length + ' undiscovered Tier ' + targetTier + ' animals · ' +
      entries.filter(e => e.recipes.length).length + ' with documented recipes. ' +
      'Only animals in the shared encyclopedia are included.';
    currentPage = Math.min(currentPage, Math.max(0, Math.ceil(entries.length / pageSize) - 1));
    const visible = entries.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    for (const {a,recipes} of visible) {
      if (!recipes.length) {
        if (reveal.checked) list.appendChild(makeRow(a.name, 'No confirmed recipe recorded yet.', a.id, false));
        else list.appendChild(makeRow('Undocumented animal', 'No suggested parent combination available yet. Use the name entry above after discovering it.', null, true));
        continue;
      }
      const recipe = recipes[0];
      const parents = recipe.parents.map(name).join(' + ');
      if (reveal.checked) {
        const row = makeRow(a.name + ' (Tier ' + a.tier + ')', 'Try: ' + parents + ' · ' + recipes.length + ' known recipe(s)', a.id, false);
        if (recipes.length > 1) {
          const details = document.createElement('details'); const summary = document.createElement('summary');
          summary.textContent = 'See all ' + recipes.length + ' recipes'; details.appendChild(summary);
          for (const r of recipes) { const line = document.createElement('div'); line.className = 'small'; line.textContent = r.parents.map(name).join(' + '); details.appendChild(line); }
          row.appendChild(details);
        }
        list.appendChild(row);
      } else {
        // No result ID, animal name, or tier-specific recipe count is exposed in the rendered card.
        list.appendChild(makeRow(parents, 'Possible discovery · result hidden. Mark the animal by name above once you receive it.', null, true));
      }
    }
    if (!entries.length) list.appendChild(makeRow('No undiscovered animals in this tier.', 'Add more animals to the shared encyclopedia or select another tier.', null, false));
    renderPages(entries.length);
    updateMarkOptions();
  }
  function *allCombinations(ids, n) {
    if (n === 2) {
      for (let i=0;i<ids.length;i++) for (let j=i;j<ids.length;j++) yield [ids[i],ids[j]];
    } else {
      for (let i=0;i<ids.length;i++) for (let j=i;j<ids.length;j++) for (let k=j;k<ids.length;k++) yield [ids[i],ids[j],ids[k]];
    }
  }
  function renderMissing() {
    const t = Number(tier.value || 1), ids = tierAnimals(t).map(a => a.id);
    const known = knownKeys(), tried = new Set(data.tried), wanted = filter.value;
    const rows = []; let total = 0;
    for (const parents of allCombinations(ids, parentCount(t))) {
      const key = comboKey(parents);
      if (known.has(key)) continue;
      const isTried = tried.has(key);
      if (wanted === 'untried' && isTried || wanted === 'tried' && !isTried) continue;
      if (total >= currentPage*pageSize && total < (currentPage+1)*pageSize) rows.push({parents,key,isTried});
      total++;
    }
    stats.textContent = total + ' undocumented combinations from Tier ' + t + ' parents. These may already be known to other players.';
    for (const {parents,key,isTried} of rows) {
      const row = makeRow(parents.map(name).join(' + '), isTried ? 'Marked tried in this browser' : 'No documented result', null, false);
      const btn = document.createElement('button'); btn.type='button'; btn.className='secondary';
      btn.textContent = isTried ? 'Mark not tried' : 'Mark tried';
      btn.addEventListener('click', () => { toggleTried(key); renderDiscover(); });
      row.appendChild(btn); list.appendChild(row);
    }
    if (!total) list.appendChild(makeRow('No matching undocumented combinations.', 'Try a different tier or filter.', null, false));
    renderPages(total);
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
  renderDiscover = function () {
    const isPersonal = mode.value === 'animals';
    document.getElementById('discoveryPersonalControls').hidden = !isPersonal;
    document.getElementById('discoveryMissingControls').hidden = isPersonal;
    list.replaceChildren();
    if (isPersonal) renderPersonal(); else renderMissing();
  };
  function changeView() { currentPage=0; renderDiscover(); }
  mode.addEventListener('change',()=>{try{localStorage.setItem(modeKey,mode.value);}catch(_){} changeView();});
  tier.addEventListener('change',changeView);
  filter.addEventListener('change',changeView);
  reveal.addEventListener('change',()=>{try{localStorage.setItem(revealKey,String(reveal.checked));}catch(_){} changeView();});
  markInput.addEventListener('input',updateMarkOptions);
  document.getElementById('discoveryMarkButton').addEventListener('click',()=>{
    const text=markInput.value.trim().toLocaleLowerCase();
    const a=data.animals.find(a=>a.name.toLocaleLowerCase()===text);
    if (!a) {toast('Choose an existing animal name');return;}
    if (a.discovered) {toast('Already marked discovered');return;}
    markDiscovered(a.id); markInput.value=''; updateMarkOptions();
  });
  markInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('discoveryMarkButton').click();}});
  // When the user checks Discovered on the Animals page, refresh this checklist too.
  const previousToggle = toggleDiscovered;
  toggleDiscovered = function(id) { previousToggle(id); renderDiscover(); };
  // The existing renderAll / Supabase refresh pipeline invokes renderDiscover dynamically.
  renderDiscover();
})();
