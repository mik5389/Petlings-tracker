const fs=require('node:fs');const assert=require('node:assert/strict');const {test}=require('node:test');
const src=fs.readFileSync(require('node:path').join(__dirname,'analytics-ui.js'),'utf8');
test('basic visits do not depend on optional consent',()=>{assert.match(src,/if\(excluded\)return;\s*\/\/ Mark the session/);assert.match(src,/if\(!excluded\)visitOnce\(\)/)});
test('feature events still require consent',()=>assert.match(src,/name!==\x27visit\x27&&!optedIn/));
test('admin authorization checked before sending events',()=>assert.match(src,/const isAdministrator=await adminCheck\(\)/));
test('device exclusion blocks all events',()=>assert.match(src,/\|\|excluded\|\|!allowed\.has\(name\)/));
test('dashboard retains server-side admin-gated summary',()=>assert.match(src,/petlings_analytics_summary/));
test('no persistent visitor identifiers added',()=>assert.doesNotMatch(src,/crypto\.randomUUID|visitorId|fingerprint/i));
