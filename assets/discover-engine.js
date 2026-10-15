// Pure helpers for personal discovery tracking (no database writes).
(function(root){
  'use strict';
  function pendingAnimals(animals,recipes,targetTier){
    const counts=new Map();
    for(const r of recipes) counts.set(r.result,(counts.get(r.result)||0)+1);
    return animals.filter(a=>a.tier===targetTier&&!a.discovered)
      .map(a=>({id:a.id,name:a.name,recipes:counts.get(a.id)||0}));
  }
  function filterByDiscovery(animals,targetTier,status){
    return animals.filter(a=>a.tier===targetTier && (status==='all' || (status==='discovered' ? a.discovered===true : a.discovered!==true)));
  }
  function isUnresolved(parents,recipes,keyFn){
    const key=keyFn(parents);
    return !recipes.some(r=>keyFn(r.parents)===key);
  }
  const api={pendingAnimals,filterByDiscovery,isUnresolved};
  root.PetlingsDiscoveryEngine=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
