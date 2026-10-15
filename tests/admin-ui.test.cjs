const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'assets','admin-ui.js'),'utf8');
const discover=fs.readFileSync(path.join(root,'assets','discover-ui.js'),'utf8');
test('admin UI script is loaded after discover UI',()=>assert.ok(html.indexOf('assets/admin-ui.js')>html.indexOf('assets/discover-ui.js')));
test('visitor editor panels are hidden while recipe browsing remains available',()=>{
 assert.match(ui,/animalForm\.hidden = !admin/);
 assert.match(ui,/panel\.hidden = !admin/);
 assert.doesNotMatch(ui,/recipeBrowserSearch.*disabled/);
});
test('sign in remains accessible in footer',()=>{
 assert.match(ui,/Admin sign in/);
 assert.match(ui,/getElementById\('signIn'\)\.click\(\)/);
});
test('render pipeline updates visibility after authentication',()=>assert.match(ui,/renderAll = function/));
test('undocumented combinations restricted to admin',()=>{
 assert.match(discover,/missingOption\.hidden = !admin/);
 assert.match(discover,/mode\.value = 'animals'/);
});
