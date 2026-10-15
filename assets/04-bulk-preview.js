
// Preview first; never write unverified bulk recipes to the shared database.
(function(){
const textarea=document.getElementById('bulkText');
const importButton=textarea.nextElementSibling;
importButton.textContent='Preview recipes';
const preview=document.createElement('div');preview.id='bulkPreview';preview.setAttribute('aria-live','polite');
importButton.after(preview);
let snapshot=null;
const normalize=s=>s.trim().toLocaleLowerCase();
function distance(a,b){a=normalize(a);b=normalize(b);let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next;}return prev[b.length];}
function suggest(raw,tier){return data.animals.filter(a=>a.tier===tier).map(a=>({name:a.name,score:distance(raw,a.name)})).sort((a,b)=>a.score-b.score).filter(x=>x.score<=Math.max(2,Math.floor(raw.length/3))).slice(0,3).map(x=>x.name);}
function analyze(){
const result=document.getElementById('bulkResult').value;
const target=animal(result),expected=target?.tier>=8?3:2;
const lines=textarea.value.split(/\r?\n/);
const existing=new Map(data.recipes.map(r=>[comboKey(r.parents),name(r.result)]));
const seen=new Set();
const items=[];
lines.forEach((line,i)=>{
if(!line.trim())return;
const parts=line.split('+').map(x=>x.trim());
const errors=[];const notes=[];
if(!target||!target.tier||target.tier<2)errors.push('Select a Tier 2–10 result animal.');
if(parts.length!==expected)errors.push(`Expected ${expected} parents; found ${parts.length}.`);
const parents=parts.map(raw=>{
if(!raw){errors.push('Empty parent name.');return null;}
const match=data.animals.find(a=>normalize(a.name)===normalize(raw));
if(!match){const matches=suggest(raw,(target?.tier||2)-1);errors.push(`Unknown animal “${raw}”${matches.length?'. Did you mean '+matches.join(', ')+'?':''}`);return null;}
if(target&&match.tier!==target.tier-1)errors.push(`${match.name} is Tier ${match.tier}; expected Tier ${target.tier-1}.`);
return match.id;
});
let key=null;
if(!errors.length){key=comboKey(parents);if(existing.has(key))notes.push(`Already saved (result: ${existing.get(key)}).`);else if(seen.has(key))notes.push('Duplicate within this import.');else seen.add(key);}
items.push({number:i+1,line,parents,key,errors,notes,status:errors.length?'error':notes.length?'warn':'ok'});
});
return {result,raw:textarea.value,items,valid:items.filter(x=>x.status==='ok'),invalid:items.filter(x=>x.status==='error'),skipped:items.filter(x=>x.status==='warn')};
}
function renderPreview(){snapshot=analyze();const x=snapshot;preview.replaceChildren();
const title=document.createElement('p');title.className='muted';title.textContent=`${x.valid.length} ready to import · ${x.invalid.length} need correction · ${x.skipped.length} duplicates/already saved`;
preview.append(title);
for(const item of x.items){const row=document.createElement('div');row.className='bulk-row '+item.status;const head=document.createElement('strong');head.textContent=`Line ${item.number}: ${item.status==='ok'?'Ready':item.status==='warn'?'Skip':'Fix needed'}`;const content=document.createElement('div');content.textContent=item.line;row.append(head,content);for(const message of [...item.errors,...item.notes]){const note=document.createElement('div');note.className='small';note.textContent=message;row.append(note);}preview.append(row);}
if(!x.items.length){const note=document.createElement('p');note.className='muted';note.textContent='Paste one or more parent combinations to preview them.';preview.append(note);return;}
if(x.valid.length){const actions=document.createElement('div');actions.className='bulk-actions';const btn=document.createElement('button');btn.textContent=`Import ${x.valid.length} valid recipe${x.valid.length===1?'':'s'}`;btn.onclick=async()=>{
if(!mustAdmin())return;
if(!snapshot||textarea.value!==snapshot.raw||document.getElementById('bulkResult').value!==snapshot.result){renderPreview();toast('Recipes changed. Review the updated preview.');return;}
const fresh=analyze();if(fresh.valid.length!==snapshot.valid.length){renderPreview();toast('Database changed. Review again.');return;}
btn.disabled=true;btn.textContent='Saving…';
try{const rows=fresh.valid.map(item=>({result_id:dbId(fresh.result),parent_ids:sortIds(item.parents).map(dbId)}));await query('recipes','insert',rows);const remaining=fresh.items.filter(item=>item.status==='error').map(item=>item.line);textarea.value=remaining.join('\n');await loadShared();renderPreview();toast(rows.length+' shared recipes saved!'+(remaining.length?' Correct the remaining lines.':''));}
catch(e){toast('Import failed: '+e.message);btn.disabled=false;btn.textContent='Try importing again';}
};actions.append(btn);preview.append(actions);}
}
// Inline onclick resolves the newly assigned global function.
bulkAdd=renderPreview;
textarea.addEventListener('input',()=>{snapshot=null;preview.replaceChildren();});
document.getElementById('bulkResult').addEventListener('change',()=>{snapshot=null;preview.replaceChildren();});
})();
