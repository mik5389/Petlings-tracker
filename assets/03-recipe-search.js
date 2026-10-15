
// Keyboard-accessible searchable selectors for recipes.
(function(){
  const enhanced = new WeakMap();
  function enhance(select){
    if(!select || enhanced.has(select)) return;
    const wrap=document.createElement('div');wrap.className='recipe-search-box';
    const input=document.createElement('input');input.type='text';input.autocomplete='off';input.placeholder='Type an animal name...';
    input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-expanded','false');
    const menu=document.createElement('div');menu.className='recipe-search-menu';menu.hidden=true;
    let results=[],active=-1;
    const current=()=>select.selectedOptions[0]?.textContent||'';
    function close(restore=false){menu.hidden=true;input.setAttribute('aria-expanded','false');active=-1;if(restore)input.value=current();}
    function paint(){Array.from(menu.children).forEach((node,i)=>{node.classList.toggle('keyboard-active',i===active);node.setAttribute('aria-selected',String(i===active));});if(active>=0)menu.children[active]?.scrollIntoView({block:'nearest'});}
    function show(){const q=input.value.trim().toLowerCase();results=Array.from(select.options).filter(o=>o.value&&o.textContent.toLowerCase().includes(q)).slice(0,60);menu.replaceChildren();active=-1;results.forEach((o,i)=>{const item=document.createElement('button');item.type='button';item.className='recipe-search-option';item.textContent=o.textContent;item.setAttribute('role','option');item.addEventListener('pointerdown',e=>e.preventDefault());item.addEventListener('click',()=>choose(i));menu.append(item)});menu.hidden=!results.length;input.setAttribute('aria-expanded',String(!menu.hidden));}
    function choose(i){const o=results[i];if(!o)return;select.value=o.value;input.value=o.textContent;close();select.dispatchEvent(new Event('change',{bubbles:true}));input.focus();}
    input.value=current();
    input.addEventListener('focus',()=>{input.select();show()});
    input.addEventListener('input',show);
    input.addEventListener('blur',()=>setTimeout(()=>close(true),180));
    // Capture phase prevents other page-level Enter shortcuts from swallowing selection.
    input.addEventListener('keydown',e=>{
      if(!['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      if(e.key==='Escape'){close(true);return;}
      if(menu.hidden)show();
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        if(!results.length)return;
        active=e.key==='ArrowDown'?(active+1)%results.length:(active<0?results.length-1:(active-1+results.length)%results.length);
        paint();return;
      }
      if(e.key==='Enter'&&results.length)choose(active<0?0:active);
    },true);
    select.before(wrap);wrap.append(input,menu,select);select.classList.add('recipe-original-select');
    enhanced.set(select,{input,close});
  }
  function sync(){
    ['recipeResult','bulkResult'].forEach(id=>enhance(document.getElementById(id)));
    document.querySelectorAll('#parentInputs select').forEach(enhance);
    document.querySelectorAll('#recipes .recipe-search-box').forEach(w=>{
      const select=w.querySelector('select'),input=w.querySelector('input');
      input.disabled=select.disabled;
      if(document.activeElement!==input)input.value=select.selectedOptions[0]?.textContent||'';
    });
  }
  const previousRender=renderAll;
  renderAll=function(){previousRender();sync()};
  const previousParents=updateRecipeInputs;
  updateRecipeInputs=function(){previousParents();sync()};
  sync();
})();
