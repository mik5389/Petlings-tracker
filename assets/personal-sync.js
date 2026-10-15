// Optional, private per-account cloud sync. Never uploads without explicit opt-in.
(function(){
'use strict';
if(!window.supabase || !api) return;
const host=document.getElementById('backup')?.querySelector('.panel');
if(!host)return;
const panel=document.createElement('div');panel.className='panel';panel.id='personalSyncPanel';
panel.innerHTML='<h2>Sync between devices</h2><p class="muted">Optional. Sign in with the same GitHub account on your phone and laptop. Your inventory, discoveries, and tried combinations stay private.</p><p id="syncStatus" class="muted" aria-live="polite">Checking account…</p><div class="inline"><button id="syncLogin" type="button" class="secondary">Sign in with GitHub</button><button id="syncEnable" type="button" hidden>Set up sync</button><button id="syncRefresh" type="button" class="secondary" hidden>Check for updates</button><button id="syncDisable" type="button" class="secondary" hidden>Stop syncing on this device</button></div>';
host.before(panel);
const $sync=id=>document.getElementById(id);
let enabled=false, revision=0, busy=false, dirty=false, timer=null, userId=null, paused=false;
const key='petlings-cloud-sync-enabled-v1';
const fingerprintKey='petlings-cloud-sync-fingerprint-v1';
const fingerprint=()=>JSON.stringify(localSnapshot());
const localSnapshot=()=>({inventory:{...data.inventory},tried:[...data.tried],discovered:Object.fromEntries(data.animals.map(a=>[a.id,!!a.discovered]))});
function applySnapshot(p){
  if(!p||typeof p!=='object'||!p.inventory||typeof p.inventory!=='object'||!Array.isArray(p.tried)||!p.discovered||typeof p.discovered!=='object')throw Error('Cloud progress is invalid.');
  paused=true;
  try{
    data.inventory=Object.fromEntries(data.animals.map(a=>[a.id,Math.max(0,Math.floor(Number(p.inventory[a.id])||0))]));
    data.tried=p.tried.filter(x=>typeof x==='string');
    data.animals.forEach(a=>a.discovered=p.discovered[a.id]===true);
    originalPersonalSave();renderAll();
  }finally{paused=false}
}
function status(message){$sync('syncStatus').textContent=message}
function controls(){
  $sync('syncLogin').hidden=!!userId;
  $sync('syncEnable').hidden=!userId||enabled;
  $sync('syncRefresh').hidden=!enabled;
  $sync('syncDisable').hidden=!enabled;
}
async function getRemote(){
  const {data:rows,error}=await api.from('petlings_personal_progress').select('progress,revision').maybeSingle();
  if(error)throw error;
  return rows;
}
async function writeRemote(expected,payload){
  const {data:next,error}=await api.rpc('petlings_save_progress',{expected_revision:expected,new_progress:payload});
  if(error)throw error;
  if(!next)throw Error('Another device saved newer progress. Use Check for updates to resolve the conflict.');
  return Number(next);
}
async function flush(){
  if(!enabled||busy||!dirty||!navigator.onLine)return;
  busy=true;
  const payload=localSnapshot();dirty=false;
  try{
    revision=await writeRemote(revision,payload);
    localStorage.setItem(fingerprintKey,JSON.stringify(payload));
    status('Synced to your account.');
  }catch(e){dirty=true;status('Not synced: '+e.message)}
  finally{busy=false;if(dirty&&enabled)status('Unsynced changes on this device. Use Check for updates to resolve or retry.');}
}
function queue(){if(!enabled||paused)return;dirty=true;status('Saving changes…');clearTimeout(timer);timer=setTimeout(flush,900)}
const originalPersonalSave=personalSave;
personalSave=function(){originalPersonalSave();queue()};
async function enable(){
  if(!userId||!remoteReady){status('Wait for your account and encyclopedia to load.');return}
  try{
    const remote=await getRemote();
    if(remote){
      const choice=confirm('Cloud progress already exists. OK = use CLOUD progress on this device (replaces this device\'s inventory and discovery progress). Cancel = keep this device unchanged and do not enable sync.');
      if(!choice)return;
      applySnapshot(remote.progress);revision=Number(remote.revision);
    }else{
      if(!confirm('No cloud progress exists yet. Upload THIS device\'s current inventory and discoveries to start syncing?'))return;
      revision=await writeRemote(0,localSnapshot());
    }
    enabled=true;dirty=false;localStorage.setItem(key,userId);localStorage.setItem(fingerprintKey,fingerprint());controls();status('Sync enabled. Changes will upload automatically.');
  }catch(e){status('Sync setup failed: '+e.message)}
}
async function refresh(){
  if(!enabled||busy)return;
  busy=true;
  try{
    const remote=await getRemote();
    if(!remote)throw Error('No cloud progress found.');
    if(Number(remote.revision)===revision){status(dirty?'Local changes are not yet synced.':'Already up to date.');return}
    if(dirty){
      if(!confirm('This device has unsynced changes and another device has newer cloud progress. OK = replace local progress with cloud copy. Cancel = keep local progress; syncing stays paused until you resolve this.')){status('Conflict: local changes kept.');return}
    }else if(!confirm('Newer progress is available from another device. Load it here? This replaces this device\'s current inventory and discoveries.'))return;
    applySnapshot(remote.progress);revision=Number(remote.revision);dirty=false;localStorage.setItem(fingerprintKey,fingerprint());status('Loaded latest cloud progress.');
  }catch(e){status('Refresh failed: '+e.message)}finally{busy=false}
}
$sync('syncLogin').onclick=async()=>{const {error}=await api.auth.signInWithOAuth({provider:'github',options:{redirectTo:location.origin+location.pathname}});if(error)status(error.message)};
$sync('syncEnable').onclick=enable;
$sync('syncRefresh').onclick=refresh;
$sync('syncDisable').onclick=()=>{enabled=false;dirty=false;localStorage.removeItem(key);localStorage.removeItem(fingerprintKey);controls();status('Sync disabled on this device. Local inventory kept.')};
async function checkAuth(){
  try{
    const {data:{user},error}=await api.auth.getUser();if(error)throw error;
    const nextId=user?.id||null;
    if(nextId===userId&&enabled)return;
    if(nextId!==userId){enabled=false;dirty=false;revision=0;}
    userId=nextId;
    if(!userId){status('Sign in to sync, or keep using this device as a guest.');}
    else if(localStorage.getItem(key)===userId){
      status('Connecting to your saved progress…');
      // Wait for the shared animal list so cloud IDs can be mapped safely.
      for(let i=0;i<40&&!remoteReady;i++)await new Promise(r=>setTimeout(r,250));
      if(!remoteReady){status('Encyclopedia not ready. Click Set up sync when it loads.');}
      else if(localStorage.getItem(fingerprintKey)!==fingerprint()){
        status('This device has changes not confirmed in the cloud. Click Set up sync to choose a safe copy.');
      }else{
        try{
          const remote=await getRemote();
          if(remote){applySnapshot(remote.progress);revision=Number(remote.revision);enabled=true;dirty=false;localStorage.setItem(fingerprintKey,fingerprint());status('Synced. Personal progress loaded from cloud.');}
          else status('Cloud progress missing. Click Set up sync.');
        }catch(e){status('Cloud unavailable: '+e.message)}
      }
    }else status('Signed in. Set up sync to connect your personal progress.');
    controls();
  }catch(e){status('Account check failed: '+e.message)}
}
api.auth.onAuthStateChange(()=>{setTimeout(checkAuth,0)});
checkAuth();
window.addEventListener('online',()=>{if(enabled&&dirty)flush()});
window.addEventListener('focus',async()=>{if(!enabled||busy||dirty)return;try{const remote=await getRemote();if(remote&&Number(remote.revision)>revision){applySnapshot(remote.progress);revision=Number(remote.revision);localStorage.setItem(fingerprintKey,fingerprint());status('Updated from your other device.')}}catch(e){status('Cloud refresh failed: '+e.message)}});
})();
