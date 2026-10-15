// Pure inventory transaction helpers. No database access.
(function(root){
  'use strict';
  function apply(inventory, parents, result, times=1){
    if(!Array.isArray(parents)||!parents.length||!result||!Number.isSafeInteger(times)||times<1)throw Error('Invalid merge');
    const required={};
    for(const id of parents){if(!id)throw Error('Invalid parent');required[id]=(required[id]||0)+times;}
    const next={...inventory};
    for(const [id,count] of Object.entries(required)){
      const available=Number(next[id]||0);
      if(!Number.isSafeInteger(available)||available<count)throw Error('Not enough '+id+' (need '+count+', have '+available+')');
    }
    for(const [id,count] of Object.entries(required))next[id]=Number(next[id]||0)-count;
    next[result]=Number(next[result]||0)+times;
    return next;
  }
  function maxMerges(inventory,parents){
    if(!parents?.length)return 0;
    const required={};for(const id of parents)required[id]=(required[id]||0)+1;
    return Math.max(0,Math.min(...Object.entries(required).map(([id,n])=>Math.floor(Number(inventory[id]||0)/n))));
  }
  const engine={apply,maxMerges};
  root.PetlingsQuickMerge=engine;
  if(typeof module!=='undefined'&&module.exports)module.exports=engine;
})(typeof globalThis!=='undefined'?globalThis:this);
