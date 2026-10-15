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
  function renderPersonal() {
    const t = Number(tier.value || 1), targetTier = t + 1;
    const allInTier = data.animals.filter(a => Number(a.tier) === targetTier);
    const discoveredCount = allInTier.filter(a => a.discovered === true).length;
    const undiscoveredCount = allInTier.length - discoveredCount;
    // Calculate the displayed list directly from personal discovery flags.
    // This does not depend on a separate engine version being cached by the browser.
    const candidates = allInTier.filter(a => status.value === 'all' ||
      (status.value === 'discovered' ? a.discovered === true : a.discovered !== true));
    const selectedLabel = status.value === 'all' ? 'All animals' :
      status.value === 'discovered' ? 'Discovered' : 'Undiscovered';
    // Keep the selected filter and its totals visible, even when spoilers are hidden.
    status.setAttribute('aria-label', 'Show animals: ' + selectedLabel);
    const recipesByResult = new Map();
    for (const r of data.recipes) {
      if (!recipesByResult.has(r.result)) recipesByResult.set(r.result, []);
      recipesByResult.get(r.result).push(r);
    }
    const entries = candidates.map(a => ({a, recipes: recipesByResult.get(a.id) || []}))
      .sort((x,y) => x.a.name.localeCompare(y.a.name));
    stats.textContent = selectedLabel + ': ' + entries.length + ' shown · Tier ' + targetTier +
      ' · ' + discoveredCount + ' discovered · ' + undiscoveredCount + ' undiscovered · ' +
      entries.filter(e => e.recipes.length).length + ' with documented recipes.';
    currentPage = Math.min(currentPage, Math.max(0, Math.ceil(entries.length / pageSize) - 1));
    const visible = entries.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    for (const {a,recipes} of visible) {
      if (!recipes.length) {
        if (reveal.checked || a.discovered) list.appendChild(makeRow(a.name, 'No confirmed recipe recorded yet.', a.id, false));
        else list.appendChild(makeRow('Undocumented animal', 'No suggested parent combination available yet. Use the name entry above after discovering it.', null, true));
        continue;
      }
      const recipe = recipes[0];
      const parents = recipe.parents.map(name).join(' + ');
      if (reveal.checked || a.discovered) {
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
    if (!entries.length) list.appendChild(makeRow('No ' + selectedLabel.toLowerCase() + ' animals in Tier ' + targetTier + '.',
      'Switch the filter or choose another tier. Your discovery progress is saved on this device.', null, false));
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