const assert=require('node:assert/strict');
const {test}=require('node:test');
const {apply,maxMerges}=require('../assets/quick-merge-engine.js');
test('different parents are consumed and result added',()=>assert.deepEqual(apply({a:3,b:2},['a','b'],'c'),{a:2,b:1,c:1}));
test('identical parents consume twice',()=>assert.deepEqual(apply({a:5},['a','a'],'b',2),{a:1,b:2}));
test('three parents',()=>assert.deepEqual(apply({a:2,b:1,c:1},['a','b','c'],'d'),{a:1,b:0,c:0,d:1}));
test('insufficient stock cannot mutate original',()=>{const original={a:1};assert.throws(()=>apply(original,['a','a'],'b'));assert.deepEqual(original,{a:1})});
test('maximum merges handles repeated parents',()=>assert.equal(maxMerges({a:7,b:4},['a','a','b']),3));
test('invalid quantity rejected',()=>assert.throws(()=>apply({a:2},['a'],'b',0)));
