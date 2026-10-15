// Pure recipe-first calculator. No browser or database access.
(function(global){
  'use strict';
  function calculate(animals, recipes, targetId, quantity=1, alternatives=5){
    const byId=new Map(animals.map(a=>[a.id,a]));
    const byResult=new Map();
    for(const r of recipes){if(!byResult.has(r.result))byResult.set(r.result,[]);byResult.get(r.result).push(r)}
    const memo=new Map();
    const compare=(a,b)=>a.merges-b.merges || a.steps.length-b.steps.length || a.signature.localeCompare(b.signature);
    function solve(id,stack=new Set()){
      if(memo.has(id))return memo.get(id);
      const a=byId.get(id);
      if(!a||stack.has(id))return null;
      if(a.tier===1){const result={base:new Map([[id,1]]),steps:[],merges:0,signature:id};memo.set(id,result);return result;}
      let best=null;
      const next=new Set(stack);next.add(id);
      for(const r of byResult.get(id)||[]){
        if(!Array.isArray(r.parents)||r.parents.length!==(a.tier>=8?3:2))continue;
        if(r.parents.some(p=>byId.get(p)?.tier!==a.tier-1))continue;
        const parts=r.parents.map(p=>solve(p,next));
        if(parts.some(p=>!p))continue;
        const base=new Map(),steps=[];let merges=1;
        for(const p of parts){for(const [k,v] of p.base)base.set(k,(base.get(k)||0)+v);steps.push(...p.steps);merges+=p.merges;}
        steps.push({parents:[...r.parents],result:id});
        const candidate={base,steps,merges,signature:r.parents.join('|')};
        if(!best||compare(candidate,best)<0)best=candidate;
      }
      memo.set(id,best);return best;
    }
    const target=byId.get(targetId);
    if(!target)return {error:'Select an animal.'};
    const qty=Math.max(1,Math.min(100,Math.floor(Number(quantity)||1)));
    const best=solve(targetId);
    if(!best)return {error:'No complete recipe chain to Tier 1 is known yet for this animal. Add the missing recipes and try again.'};
    const candidates=[];
    if(target.tier>1){
      for(const r of byResult.get(targetId)||[]){
        if(r.parents.length!==(target.tier>=8?3:2)||r.parents.some(p=>byId.get(p)?.tier!==target.tier-1))continue;
        const parts=r.parents.map(p=>solve(p,new Set([targetId])));
        if(parts.some(p=>!p))continue;
        const base=new Map(),steps=[];let merges=1;
        for(const p of parts){for(const [k,v] of p.base)base.set(k,(base.get(k)||0)+v);steps.push(...p.steps);merges+=p.merges;}
        steps.push({parents:[...r.parents],result:targetId});
        candidates.push({base,steps,merges,signature:r.parents.join('|')});
      }
    }else candidates.push(best);
    candidates.sort(compare);
    const unique=[],seen=new Set();
    for(const c of candidates){if(seen.has(c.signature))continue;seen.add(c.signature);unique.push(c);if(unique.length>=alternatives)break;}
    return {target,quantity:qty,totalAlternatives:candidates.length,plans:unique.map(c=>({base:[...c.base].map(([id,count])=>({id,count:count*qty})).sort((x,y)=>(byId.get(x.id)?.name||'').localeCompare(byId.get(y.id)?.name||'')),steps:Array.from({length:qty},()=>c.steps).flat(),merges:c.merges*qty,signature:c.signature}))};
  }
  global.PetlingsReversePlanner={calculate};
})(typeof window!=='undefined'?window:globalThis);
