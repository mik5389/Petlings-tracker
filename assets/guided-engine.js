// Pure, bounded recipe planner. No database writes or browser dependencies.
(function(root){
'use strict';
function plan(animals,recipes,inventory,request,mode='inventory'){
 const byId=new Map(animals.map(a=>[a.id,a]));
 const byResult=new Map();
 for(const r of recipes){if(!byResult.has(r.result))byResult.set(r.result,[]);byResult.get(r.result).push(r)}
 const start=mode==='scratch'?{}:{...inventory};
 const needs=request.type==='combination'?request.parents.map(id=>id):Array.from({length:Math.max(1,Math.min(10,Math.floor(Number(request.quantity)||1)))},()=>request.target);
 if(!needs.length||needs.some(id=>!byId.has(id)))return {error:'Choose a valid animal or combination.'};
 let calls=0;const LIMIT=35000;
 function obtain(id,state,stack){
  if(++calls>LIMIT)throw Error('This breeding chain is too complex to calculate. Try a lower tier or a different animal.');
  const a=byId.get(id);if(!a||stack.has(id))return null;
  const have=Number(state.inv[id]||0);
  if(have>0){const s={inv:{...state.inv,[id]:have-1},missing:{...state.missing},steps:state.steps.slice(),cost:state.cost};return s}
  if(a.tier===1){const s={inv:{...state.inv},missing:{...state.missing,[id]:(state.missing[id]||0)+1},steps:state.steps.slice(),cost:state.cost};return s}
  let best=null;
  const nextStack=new Set(stack);nextStack.add(id);
  for(const r of (byResult.get(id)||[]).slice(0,80)){
   if(!Array.isArray(r.parents)||r.parents.length!==(a.tier>=8?3:2)||r.parents.some(p=>byId.get(p)?.tier!==a.tier-1))continue;
   let s=state;
   for(const p of r.parents){s=obtain(p,s,nextStack);if(!s)break}
   if(!s)continue;
   s={...s,steps:[...s.steps,{parents:[...r.parents],result:id}],cost:s.cost+1};
   const score=x=>Object.values(x.missing).reduce((v,n)=>v+n,0)*100000+x.cost;
   if(!best||score(s)<score(best))best=s;
   if(best&&score(best)===0)break;
  }
  return best;
 }
 try{
  let state={inv:start,missing:{},steps:[],cost:0};
  for(const id of needs){state=obtain(id,state,new Set());if(!state)return {error:'No complete confirmed recipe chain is available for these parents yet.'}}
  const missing=Object.entries(state.missing).filter(([,n])=>n>0).map(([id,count])=>({id,count})).sort((a,b)=>(byId.get(a.id)?.name||'').localeCompare(byId.get(b.id)?.name||''));
  return {steps:state.steps,missing,merges:state.steps.length,experiment:request.type==='combination'?{parents:request.parents,result:request.result||null}:null,mode};
 }catch(e){return {error:e.message}}
}
root.PetlingsGuidedEngine={plan};if(typeof module!=='undefined'&&module.exports)module.exports={plan};
})(typeof globalThis!=='undefined'?globalThis:this);
