const test=require('node:test');const assert=require('node:assert/strict');const {plan}=require('../assets/guided-engine.js');
const animals=[{id:'a',name:'Chick',tier:1},{id:'b',name:'Bunny',tier:1},{id:'c',name:'Cat',tier:1},{id:'x',name:'X',tier:2},{id:'y',name:'Y',tier:3},{id:'z',name:'Z',tier:8},{id:'p',name:'P',tier:7}];
const recipes=[{result:'x',parents:['a','b']},{result:'y',parents:['x','x']},{result:'z',parents:['p','p','p']}];
test('from scratch produces ordered merge steps',()=>{const r=plan(animals,recipes,{}, {type:'animal',target:'y',quantity:1},'scratch');assert.equal(r.steps.length,3);assert.deepEqual(r.steps.map(x=>x.result),['x','x','y']);assert.deepEqual(r.missing,[{id:'b',count:2},{id:'a',count:2}].sort((a,b)=>animals.find(x=>x.id===a.id).name.localeCompare(animals.find(x=>x.id===b.id).name)))});
test('inventory reduces needed merges and Tier 1 shopping list',()=>{const r=plan(animals,recipes,{x:2},{type:'animal',target:'y'},'inventory');assert.equal(r.steps.length,1);assert.equal(r.missing.length,0)});
test('inventory can satisfy final animal directly',()=>{const r=plan(animals,recipes,{y:1},{type:'animal',target:'y'},'inventory');assert.equal(r.steps.length,0)});
test('experimental combination does not invent result',()=>{const r=plan(animals,recipes,{x:2},{type:'combination',parents:['x','x']},'inventory');assert.equal(r.steps.length,0);assert.equal(r.experiment.result,null)});
test('three parent recipes work for Tier 8',()=>{const r=plan(animals,recipes,{p:3},{type:'animal',target:'z'},'inventory');assert.equal(r.steps.length,1);assert.equal(r.steps[0].parents.length,3)});
test('missing recipes return a useful error',()=>{assert.match(plan(animals,recipes,{}, {type:'animal',target:'p'},'scratch').error,/No complete/)});
