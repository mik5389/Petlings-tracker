// Fast, bounded breeding planner. Pure calculation: never writes inventory or recipes.
(function(root){
'use strict';
function plan(animals,recipes,inventory,request,mode='inventory'){
 const byId=new Map(animals.map(a=>[a.id,a]));
 const byResult=new Map();
 for(const r of recipes){
  const result=byId.get(r.result);
  if(!result||!Array.isArray(r.parents)||r.parents.length!==(result.tier>=8?3:2)||
     r.parents.some(p=>byId.get(p)?.tier!==result.tier-1))continue;
  if(!byResult.has(r.result))byResult.set(r.result,[]);
  byResult.get(r.result).push(r);
 }
 const needs=request.type==='combination'?(Array.isArray(request.parents)?request.parents.slice():[]):
  Array.from({length:Math.max(1,Math.min(10,Math.floor(Number(request.quantity)||1)))},()=>request.target);
 if(!needs.length||needs.some(id=>!byId.has(id)))return {error:'Choose a valid animal or combination.'};
 const start=mode==='scratch'?{}:{...inventory};
 // Memoized lower-cost recipe estimates. This is a heuristic, not an exhaustive search.
 const estimates=new Map();
 function estimate(id){
  if(estimates.has(id))return estimates.get(id);
  const a=byId.get(id);
  if(!a)return Infinity;
  if(a.tier===1){estimates.set(id,1);return 1;}
  let best=Infinity;
  for(const r of byResult.get(id)||[]){
   const cost=r.parents.reduce((s,p)=>s+estimate(p),0);
   if(cost<best)best=cost;
  }
  estimates.set(id,best);return best;
 }
 // Score recipes by available inventory and estimated work. Limit search to a small
 // number of promising alternatives rather than exploring the full recipe tree.
 const LIMIT=25000;let calls=0;
 const scoreRecipe=(r,state)=>{
  const counts=new Map();for(const p of r.parents)counts.set(p,(counts.get(p)||0)+1);
  let missing=0,work=0;
  for(const [p,n] of counts){
   const owned=Math.max(0,Number(state.inv[p])||0);
   const deficit=Math.max(0,n-owned);
   const estimateCost=estimate(p);
   missing+=deficit*estimateCost;
   work+=deficit;
  }
  return missing*100+work;
 };
 function obtain(id,state){
  if(++calls>LIMIT)return null;
  const a=byId.get(id);if(!a)return null;
  const have=Math.max(0,Number(state.inv[id])||0);
  if(have>0){state.inv[id]=have-1;return state;}
  if(a.tier===1){state.missing[id]=(state.missing[id]||0)+1;return state;}
  const options=byResult.get(id)||[];
  if(!options.length)return null;
  const ranked=options.map((r,i)=>({r,i,score:scoreRecipe(r,state)}))
   .sort((a,b)=>a.score-b.score||a.i-b.i).slice(0,8);
  for(const {r} of ranked){
   const candidate={inv:{...state.inv},missing:{...state.missing},steps:state.steps.slice()};
   let valid=true;
   let working=candidate;
   for(const p of r.parents){working=obtain(p,working);if(!working){valid=false;break;}}
   if(!valid)continue;
   working.steps.push({parents:[...r.parents],result:id});
   return working;
  }
  return null;
 }
 let state={inv:{...start},missing:{},steps:[]};
 for(const id of needs){
  const next=obtain(id,state);
  if(!next)return {error:calls>=LIMIT?'Calculation limit reached. Try another breeding target.':'No complete confirmed recipe chain is available for these parents yet.'};
  state=next;
 }
 const missing=Object.entries(state.missing).filter(([,n])=>n>0)
  .map(([id,count])=>({id,count})).sort((a,b)=>(byId.get(a.id)?.name||'').localeCompare(byId.get(b.id)?.name||''));
 return {steps:state.steps,missing,merges:state.steps.length,
  experiment:request.type==='combination'?{parents:needs,result:request.result||null}:null,mode};
}
root.PetlingsGuidedEngine={plan};
if(typeof module!=='undefined'&&module.exports)module.exports={plan};
})(typeof globalThis!=='undefined'?globalThis:this);
