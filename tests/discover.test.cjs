const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../assets/discover-engine.js');
const animals = [{id:'a1',name:'Chick',tier:1,discovered:true},{id:'a2',name:'Animal X',tier:2,discovered:false},{id:'a3',name:'Animal Y',tier:2,discovered:false}];
const recipes = Array.from({length:100},(_,i)=>({result:'a2',parents:['a1','a'+(i+10)]}));
test('undiscovered animal appears once even with 100 recipes',()=>{
  const pending=engine.pendingAnimals(animals,recipes,2);
  assert.equal(pending.length,2);
  assert.equal(pending.find(a=>a.id==='a2').recipes,100);
});
test('marking animal discovered removes all its recipes from discovery suggestions',()=>{
  const marked=animals.map(a=>a.id==='a2'?{...a,discovered:true}:a);
  assert.deepEqual(engine.pendingAnimals(marked,recipes,2).map(a=>a.id),['a3']);
  assert.equal(recipes.length,100);
});
test('other player has independent discovery state',()=>{
  assert.equal(engine.pendingAnimals(animals,recipes,2).length,2);
});
test('undocumented means no recipe for that parent combination',()=>{
  const key=ids=>[...ids].sort().join('|');
  assert.equal(engine.isUnresolved(['a1','a10'],recipes,key),false);
  assert.equal(engine.isUnresolved(['a1','a999'],recipes,key),true);
});
