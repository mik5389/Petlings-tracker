// UI-only terminology and About navigation. Never changes data, API names, or recipe keys.
(function () {
  'use strict';
  const nav = document.getElementById('tabs');
  const about = document.getElementById('about');
  const aboutTab = nav?.querySelector('[data-tab="about"]');
  if (!nav || !about || !aboutTab) return;
  function openTab(id) {
    const button=nav.querySelector('button[data-tab="'+id+'"]');
    if (!button || button.hidden) return;
    if (id!=='about') { button.click(); return; }
    nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===button));
    document.querySelectorAll('main > section').forEach(section=>{section.hidden=section!==about;});
    window.scrollTo({top:0,behavior:'auto'});
  }
  aboutTab.addEventListener('click',()=>openTab('about'));
  // Default to About on each new page load; user navigation remains unchanged.
  openTab('about');
  about.querySelectorAll('[data-about-go]').forEach(button=>button.addEventListener('click',()=>openTab(button.dataset.aboutGo)));
  // Replace visible UI terminology, including messages inserted after calculations.
  // Skip code, user inputs, and text being edited by players.
  const pattern=/\bbreeding\b/gi;
  function translate(value){return value.replace(pattern,word=>word===word.toUpperCase()?'MERGING':word[0]===word[0].toUpperCase()?'Merging':'merging');}
  function updateNode(node){
    if(node.nodeType===Node.TEXT_NODE){
      const parent=node.parentElement;
      if(!parent || parent.closest('script,style,textarea,code,pre,[contenteditable],#analytics'))return;
      if(pattern.test(node.nodeValue)){node.nodeValue=translate(node.nodeValue);}pattern.lastIndex=0;
    } else if(node.nodeType===Node.ELEMENT_NODE){
      if(node.matches('script,style,textarea,code,pre,[contenteditable]'))return;
      for(const attr of ['placeholder','aria-label','title']){
        const value=node.getAttribute(attr);if(value && /\bbreeding\b/i.test(value))node.setAttribute(attr,translate(value));
      }
      const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
      const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
      texts.forEach(updateNode);
    }
  }
  // Initial pass plus small asynchronous batches for dynamic planner/discovery output.
  updateNode(document.querySelector('header'));
  updateNode(document.querySelector('main'));
  let pending=new Set(),scheduled=false;
  function flush(){scheduled=false;const nodes=[...pending];pending.clear();nodes.forEach(n=>{if(n.isConnected)updateNode(n);});}
  const observer=new MutationObserver(records=>{
    for(const r of records){
      if(r.type==='characterData'){if(r.target.parentElement)pending.add(r.target);}
      else for(const n of r.addedNodes){if(n.nodeType===Node.TEXT_NODE||n.nodeType===Node.ELEMENT_NODE)pending.add(n);}
    }
    if(pending.size&&!scheduled){scheduled=true;setTimeout(flush,30);}
  });
  observer.observe(document.querySelector('main'),{childList:true,subtree:true,characterData:true});
})();
