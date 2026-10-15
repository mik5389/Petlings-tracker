
// Keep the collection counter tied to the selected tier and search.
(function () {
  const tierSelect = document.getElementById('animalFilter');
  const searchInput = document.getElementById('animalSearch');
  const countLabel = document.getElementById('animalCount');
  const list = document.getElementById('animalList');
  function refreshCollection() {
    const tier = tierSelect.value;
    const search = searchInput.value.trim().toLocaleLowerCase();
    const matching = data.animals.filter(a =>
      (tier === 'all' || Number(a.tier) === Number(tier)) &&
      a.name.toLocaleLowerCase().includes(search)
    ).sort((a,b) => a.tier-b.tier || a.name.localeCompare(b.name));
    countLabel.textContent = '(' + matching.length + ')';
    list.innerHTML = matching.map(a =>
      '<div class="item"><div><strong>' + esc(a.name) + '</strong> <span class="pill">Tier ' + a.tier + '</span><br>' +
      '<label class="small"><input class="check" type="checkbox" ' + (a.discovered?'checked':'') +
      ' onchange="toggleDiscovered(\'' + a.id + '\')"> Discovered</label></div>' +
      (isAdmin ? '<button class="danger" onclick="removeAnimal(\'' + a.id + '\')">Delete</button>' : '') + '</div>'
    ).join('') || '<p class="muted">No animals match this tier or search.</p>';
  }
  renderAnimals = refreshCollection;
  // The inline onchange/oninput handlers already call the final renderAnimals wrapper.
  // Do not render the list again here, as that removes admin Edit tier buttons.
  refreshCollection();
})();
