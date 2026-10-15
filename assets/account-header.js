// Visible account shortcut; authentication and sync remain managed by existing scripts.
(function(){
'use strict';
const header=document.querySelector('header');
if(!header||typeof api === "undefined" || !api)return;
const button=document.createElement('button');button.type='button';button.id='petlingsAccountShortcut';
button.className='secondary';button.textContent='Sign in / Account';
header.append(button);
async function refresh(){
 try{const {data:{user}}=await api.auth.getUser();button.textContent=user?'My Account / Sync':'Sign in';}
 catch(_){button.textContent='Sign in / Account'}
}
button.addEventListener('click',async()=>{
 const {data:{user}}=await api.auth.getUser();
 if(!user){document.getElementById('syncLogin')?.click();return;}
 document.querySelector('#tabs button[data-tab="backup"]')?.click();
 document.getElementById('personalSyncPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
});
api.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();
})();
