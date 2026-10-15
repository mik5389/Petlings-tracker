const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
test('spoiler UI includes shared preference and discovery-based visibility',()=>{
 const s=fs.readFileSync(path.join(root,'assets/spoiler-ui.js'),'utf8');
 assert.match(s,/petlings-encyclopedia-spoilers-v1/);
 assert.match(s,/enabled \|\| a\?\.discovered===true/);
 assert.match(s,/renderAnimals\(\);renderRecipes\(\)/);
});
test('animal and recipe lists use the same visibility rule',()=>{
 for(const f of ['06-collection.js','05-recipe-browser.js'])assert.match(fs.readFileSync(path.join(root,'assets',f),'utf8'),/PetlingsSpoilers\.visible/);
});
test('index loads spoiler UI after existing components',()=>{
 const s=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(s.indexOf('assets/spoiler-ui.js')>s.indexOf('assets/discover-ui.js'));
});
