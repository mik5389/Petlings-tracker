const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const js=fs.readFileSync(path.join(root,'assets/analytics-ui.js'),'utf8');const sql=fs.readFileSync(path.join(root,'analytics-setup.sql'),'utf8');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('analytics script is loaded',()=>assert.match(html,/assets\/analytics-ui\.js/));
test('analytics is opt-in and off by default',()=>{assert.match(js,/optedIn=false/);assert.match(js,/if\(!optedIn\|\|!allowed\.has\(name\)/);});
test('admin dashboard access checked in browser and database',()=>{assert.match(js,/isAdmin===true/);assert.match(sql,/public\.is_petlings_admin\(\)/);assert.match(sql,/auth\.uid\(\) is null/);});
test('raw analytics table not exposed to visitors',()=>{assert.match(sql,/revoke all on public\.petlings_analytics_events from anon, authenticated/);assert.match(sql,/enable row level security/);});
test('events contain no user or inventory identifiers',()=>{assert.doesNotMatch(sql,/user_id|ip_address|animal_id|inventory_id/);assert.match(sql,/event_name text/);});
