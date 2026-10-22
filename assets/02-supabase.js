
// Public recipes, local personal inventory. Only authenticated admins may write.
const api=window.supabase?.createClient('https://cgsqwrptzxtvjdhogtzk.supabase.co','sb_publishable_k92vjnQMPWHgMsNr_6k5jw_-Jff4m8X');
let isAdmin=false,remoteReady=false;
const personalKey='petlings-personal-v2';
const banner=document.createElement('div');banner.className='panel';banner.id='sharedStatus';banner.textContent='Connecting to shared encyclopedia…';document.querySelector('main').insertBefore(banner,document.querySelector('main nav'));
const adminArea=document.createElement('div');adminArea.className='panel';adminArea.innerHTML='<strong>Shared encyclopedia</strong><p id="accountStatus" class="muted">Checking your account…</p><button id="signIn" class="secondary">Sign in with GitHub</button> <button id="signOut" class="secondary" hidden>Sign out</button> <button id="refreshShared" class="secondary">Refresh shared recipes</button>';
document.querySelector('main').insertBefore(adminArea,document.querySelector('main nav'));
function personalSave(){localStorage.setItem(personalKey,JSON.stringify({inventory:data.inventory,tried:data.tried,discovered:Object.fromEntries(data.animals.map(a=>[a.id,a.discovered]))}));}
// Existing local data remains available as a backup; shared data is authoritative.
const oldSave=save;
save=function(){personalSave();renderAll()};
function mustAdmin(){if(!remoteReady){toast('Still connecting to the database');return false}if(!isAdmin){toast('Only the administrator can change shared animals and recipes. Sign in above.');return false}return true}
function dbId(id){return Number(String(id).slice(1))}
function idOf(n){return 'a'+n}
async function query(table,method,body,filter){
  if(method==='select'){
    // Count visible rows first, then fetch small, ordered pages. Never silently
    // accept a partial encyclopedia if a proxy/server truncates a response.
    const {count,error:countError}=await api.from(table).select('id',{count:'exact',head:true});
    if(countError)throw countError;
    if(!Number.isSafeInteger(count)||count<0)throw new Error('Could not verify the '+table+' record count.');
    const pageSize=200,all=[];
    for(let start=0;start<count;start+=pageSize){
      const end=Math.min(start+pageSize,count)-1;
      let rows=null,lastError=null;
      for(let attempt=0;attempt<3;attempt++){
        const response=await api.from(table).select('*').order('id',{ascending:true}).range(start,end);
        lastError=response.error;
        if(!lastError && Array.isArray(response.data) && response.data.length===end-start+1){rows=response.data;break;}
      }
      if(!rows)throw new Error('Incomplete '+table+' page at rows '+(start+1)+'–'+(end+1)+'. Expected '+(end-start+1)+' records. '+(lastError?.message||'Server returned fewer rows than requested.')+' Please refresh and try again.');
      all.push(...rows);
    }
    if(all.length!==count||new Set(all.map(row=>row.id)).size!==count){
      throw new Error('Incomplete '+table+' load: expected '+count+' distinct records, received '+all.length+'.');
    }
    return all;
  }
  let q=api.from(table);
  if(method==='insert')q=q.insert(body).select();
  else if(method==='delete')q=q.delete().eq('id',filter);
  else throw new Error('Unsupported database operation');
  const {data:rows,error}=await q;
  if(error)throw error;
  return rows;
}
async function loadShared(){if(!api){banner.textContent='Could not load database library. Check your internet connection.';return}banner.textContent='Loading shared animals and recipes…';try{
const [animals,recipes]=await Promise.all([query('animals','select'),query('recipes','select')]);
const savedPersonal=JSON.parse(localStorage.getItem(personalKey)||'null');
const oldAnimals=data.animals,oldInventory=data.inventory,oldTried=data.tried;
const mapOld=new Map(oldAnimals.map(a=>[a.name.toLowerCase()+'|'+a.tier,a]));
const newAnimals=animals.map(a=>{const old=mapOld.get(a.name.toLowerCase()+'|'+a.tier);return {id:idOf(a.id),name:a.name,tier:a.tier,discovered:savedPersonal?.discovered?.[idOf(a.id)]??old?.discovered??false}});
const remap={};for(let a of newAnimals){let old=mapOld.get(a.name.toLowerCase()+'|'+a.tier);if(old)remap[old.id]=a.id}
const inventory={};for(let a of newAnimals)inventory[a.id]=savedPersonal?.inventory?.[a.id]??oldInventory[a.id]??Object.entries(remap).filter(([,v])=>v===a.id).reduce((sum,[k])=>sum+(oldInventory[k]||0),0);
const tried=(savedPersonal?.tried||oldTried||[]).map(k=>k.split('|').map(id=>remap[id]||id).sort().join('|'));
data={animals:newAnimals,recipes:recipes.map(r=>({dbid:r.id,result:idOf(r.result_id),parents:r.parent_ids.map(idOf)})),inventory,tried};remoteReady=true;personalSave();renderAll();banner.textContent=`🩷 Shared encyclopedia connected: ${animals.length} animals and ${recipes.length} recipes. Your inventory stays on this device.`;
}catch(e){remoteReady=false;banner.textContent='Could not load shared database: '+e.message}}
async function refreshAuth(){if(!api)return;try{const {data:session}=await api.auth.getUser();const user=session?.user;isAdmin=false;if(user){const {data:allowed,error}=await api.rpc('is_petlings_admin');if(error)throw error;isAdmin=allowed===true}$('accountStatus').textContent=isAdmin?'Signed in as administrator — you can edit shared recipes.':user?'Signed in, but this account is read-only.':'Visitors can view recipes. Sign in to edit as administrator.';$('signIn').hidden=!!user;$('signOut').hidden=!user;renderAll()}catch(e){$('accountStatus').textContent='Account check failed: '+e.message}}
$('signIn').onclick=async()=>{const {error}=await api.auth.signInWithOAuth({provider:'github',options:{redirectTo:location.origin+location.pathname}});if(error)toast(error.message)};
$('signOut').onclick=async()=>{await api.auth.signOut();await refreshAuth()};
$('refreshShared').onclick=loadShared;
addAnimal=async function(){if(!mustAdmin())return;let n=$('animalName').value.trim(),t=Number($('animalTier').value);if(!n)return toast('Enter an animal name');if(data.animals.some(a=>a.name.toLowerCase()===n.toLowerCase()))return toast('Animal already exists');try{await query('animals','insert',{name:n,tier:t});$('animalName').value='';await loadShared();$('animalName').focus();toast('Shared animal saved!')}catch(e){toast('Save failed: '+e.message)}};
removeAnimal=async function(id){if(!mustAdmin())return;if(!confirm('Delete this shared animal? It may fail if recipes still use it.'))return;try{await query('animals','delete',null,dbId(id));await loadShared()}catch(e){toast('Delete failed: '+e.message)}};
addRecipe=async function(){if(!mustAdmin())return;const result=$('recipeResult').value,parents=[...document.querySelectorAll('.parent')].map(x=>x.value);const err=validateRemoteRecipe(result,parents);if(err)return toast(err);try{await query('recipes','insert',{result_id:dbId(result),parent_ids:sortIds(parents).map(dbId)});await loadShared();toast('Shared recipe saved!')}catch(e){toast('Save failed: '+e.message)}};
function validateRemoteRecipe(result,parents){let a=animal(result);if(!a||a.tier<2)return 'Choose a result animal';if(parents.length!==(a.tier>=8?3:2)||parents.some(p=>animal(p)?.tier!==a.tier-1))return 'Select parents from the tier below';let existing=data.recipes.find(r=>comboKey(r.parents)===comboKey(parents));if(existing)return 'Already known: '+name(existing.result);return null}
bulkAdd=async function(){if(!mustAdmin())return;const result=$('bulkResult').value,lines=$('bulkText').value.split('\n').filter(x=>x.trim());const rows=[],errors=[];for(let i=0;i<lines.length;i++){let parts=lines[i].split('+').map(x=>x.trim());let parents=parts.map(n=>data.animals.find(a=>a.name.toLowerCase()===n.toLowerCase())?.id);let err=validateRemoteRecipe(result,parents);if(err)errors.push(`Line ${i+1}: ${err}`);else rows.push({result_id:dbId(result),parent_ids:sortIds(parents).map(dbId)})}if(errors.length){alert(errors.join('\n'));return}if(!rows.length)return toast('Enter recipes first');try{await query('recipes','insert',rows);$('bulkText').value='';await loadShared();toast(rows.length+' shared recipes saved!')}catch(e){toast('Import failed: '+e.message)}};
removeRecipe=async function(i){if(!mustAdmin())return;let r=data.recipes[i];if(!r||!confirm('Remove this recipe from the shared encyclopedia?'))return;try{await query('recipes','delete',null,r.dbid);await loadShared()}catch(e){toast('Delete failed: '+e.message)}};
// Submit a new animal with Enter while the name field is focused.
// Reuse the existing admin-checked, Supabase-backed addAnimal handler.
$('animalName').addEventListener('keydown',function(event){
  if(event.key==='Enter' && !event.isComposing){
    event.preventDefault();
    if(!this.dataset.submitting){
      this.dataset.submitting='1';
      Promise.resolve(addAnimal()).finally(()=>{delete this.dataset.submitting});
    }
  }
});
const originalRenderAnimals=renderAnimals;renderAnimals=function(){originalRenderAnimals();if(!isAdmin)$('animalList').querySelectorAll('button.danger').forEach(b=>b.remove())};
const originalRenderRecipes=renderRecipes;renderRecipes=function(){originalRenderRecipes();if(!isAdmin)$('recipeList').querySelectorAll('button.danger').forEach(b=>b.remove())};
// Personal discovery toggles are never written to the shared database.
const originalSetInventory=setInventory;setInventory=function(id,v){originalSetInventory(id,v);personalSave()};
const originalToggle=toggleDiscovered;toggleDiscovered=function(id){originalToggle(id)};
// Never allow a local backup to overwrite shared records.
importData=function(){alert('Shared animals and recipes are managed online. Personal inventory stays on this device. Backup import from the older tracker is not supported in this version.')};
resetData=function(){if(confirm('Erase only your personal inventory and tried combinations on this device?')){data.inventory={};data.tried=[];data.animals.forEach(a=>a.discovered=false);personalSave();renderAll()}};
exportData=function(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='petlings-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
// Disable editing UI for visitors; discovery and inventory remain editable.
const originalRenderAll=renderAll;renderAll=function(){originalRenderAll();document.querySelectorAll('#animals > .panel:first-child input,#animals > .panel:first-child select,#animals > .panel:first-child button,#recipes > .panel:nth-child(-n+2) input,#recipes > .panel:nth-child(-n+2) select,#recipes > .panel:nth-child(-n+2) textarea,#recipes > .panel:nth-child(-n+2) button').forEach(el=>{el.disabled=!isAdmin});};
$('backup').querySelector('.muted').textContent='Download a copy of your personal inventory and the current shared encyclopedia. Shared recipes cannot be restored from a local backup.';
$('backup').querySelector('label[style]').style.display='none';
$('backup').querySelector('.danger').textContent='Erase my personal inventory and progress';
refreshAuth().then(loadShared);
