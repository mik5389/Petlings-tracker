// Opt-in aggregate analytics. Excludes administrator accounts and opted-out devices.
(function () {
  'use strict';
  const CONSENT='petlings-analytics-opt-in-v1';
  const EXCLUDE='petlings-analytics-exclude-device-v1';
  const VISIT='petlings-analytics-visit';
  const allowed=new Set(['visit','tab_animals','tab_recipes','tab_discover','tab_inventory','tab_planner','tab_backup','plan_calculate','quick_merge']);
  const get=(k)=>{try{return localStorage.getItem(k)}catch(_){return null}};
  const put=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
  let optedIn=get(CONSENT)==='yes';
  let excluded=get(EXCLUDE)==='yes';
  let adminVerified=false;
  let checking=null;
  const nav=document.getElementById('tabs');
  const main=document.querySelector('main');
  if(!nav||!main)return;
  const btn=document.createElement('button');btn.type='button';btn.dataset.tab='analytics';btn.textContent='Analytics';btn.hidden=true;nav.append(btn);
  const section=document.createElement('section');section.id='analytics';section.hidden=true;
  section.innerHTML='<div class="panel"><h2>Website Analytics</h2><p class="muted">Private administrator dashboard. Counts include only visits from people who opted in, excluding administrator activity and excluded devices. Visits are not unique people.</p><div class="fields"><div><label for="analyticsDays">Period</label><select id="analyticsDays"><option value="1">Last 24 hours</option><option value="7" selected>Last 7 days</option><option value="30">Last 30 days</option></select></div></div><p id="analyticsTrackingStatus" class="muted"></p><button id="analyticsRefresh" type="button">Refresh analytics</button><div id="analyticsResults" aria-live="polite" style="margin-top:14px"></div></div>';
  main.append(section);
  const privacy=document.createElement('div');privacy.className='panel';privacy.id='analyticsPrivacy';
  privacy.innerHTML='<h2>Privacy &amp; Analytics</h2><p class="muted">Optional anonymous analytics help us see website visits, general device type, Reddit referrals, and feature popularity. We do not record IP addresses, names, email addresses, exact locations, inventory contents, or individual breeding choices in analytics. No analytics events are sent without consent. Administrator activity and excluded devices are not tracked. Your account and personal cloud sync are separate. You can change your choice at any time. Previously collected events are not automatically deleted when you opt out.</p><label><input id="analyticsConsent" type="checkbox" class="check"> Allow optional usage analytics</label><label><input id="analyticsExcludeDevice" type="checkbox" class="check"> Exclude this device from analytics (even while signed out)</label><p class="muted" id="analyticsConsentStatus"></p>';
  const backup=document.getElementById('backup');if(backup)backup.append(privacy);else main.append(privacy);
  const privacyLink=document.createElement('button');privacyLink.type='button';privacyLink.className='secondary';privacyLink.textContent='Privacy & analytics';privacyLink.style.margin='12px';
  (document.getElementById('petlingsAccountFooter')||document.body).append(privacyLink);
  privacyLink.addEventListener('click',()=>{document.querySelector('#tabs button[data-tab="backup"]')?.click();privacy.scrollIntoView({block:'start',behavior:'smooth'});});
  const checkbox=document.getElementById('analyticsConsent');checkbox.checked=optedIn;
  const excludeBox=document.getElementById('analyticsExcludeDevice');excludeBox.checked=excluded;
  const status=document.getElementById('analyticsConsentStatus');
  const trackingStatus=document.getElementById('analyticsTrackingStatus');
  function showConsent(){
    const state=excluded?'Tracking excluded on this device.':adminVerified?'Administrator activity is excluded.':optedIn?'Optional analytics enabled (for non-admin visitors).':'Optional analytics disabled.';
    status.textContent=state;
    trackingStatus.textContent=state;
  }
  showConsent();
  const device=()=>/iPad|Tablet|Android(?!.*Mobile)/i.test(navigator.userAgent)?'tablet':/Mobi|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop';
  const source=()=>{try{const host=new URL(document.referrer).hostname.toLowerCase();return host==='reddit.com'||host.endsWith('.reddit.com')?'reddit':host?'other':'direct';}catch(_){return 'direct';}};
  const originalSource=source();
  // Check server-side account status BEFORE sending any event. Fail closed if authentication is unavailable.
  async function checkAdmin(){
    if(typeof api==='undefined'||!api)return null;
    try{
      const {data:auth,error}=await api.auth.getUser();
      if(error && !/session missing/i.test(error.message||''))return null;
      if(!auth?.user){adminVerified=false;showConsent();return false;}
      const {data:allowedAdmin,error:rpcError}=await api.rpc('is_petlings_admin');
      if(rpcError)return null;
      adminVerified=allowedAdmin===true;
      showConsent();
      return adminVerified;
    }catch(_){return null;}
  }
  function adminCheck(){
    if(!checking)checking=checkAdmin().finally(()=>{checking=null});
    return checking;
  }
  async function send(name){
    if(!optedIn||excluded||!allowed.has(name)||typeof api==='undefined'||!api)return;
    const isAdministrator=await adminCheck();
    if(isAdministrator!==false||!optedIn||excluded)return;
    try{const {error}=await api.rpc('petlings_record_event',{p_event:name,p_device:device(),p_source:originalSource});if(error)console.warn('Optional analytics unavailable:',error.message)}catch(_){}
  }
  function visitOnce(){
    if(!optedIn||excluded)return;
    // Mark the session only after we know the event is eligible to be recorded.
    adminCheck().then(admin=>{
      if(admin!==false||!optedIn||excluded)return;
      try{if(sessionStorage.getItem(VISIT))return;sessionStorage.setItem(VISIT,'yes')}catch(_){}
      send('visit');
    });
  }
  checkbox.addEventListener('change',()=>{optedIn=checkbox.checked;put(CONSENT,optedIn?'yes':'no');showConsent();if(optedIn)visitOnce();});
  excludeBox.addEventListener('change',()=>{excluded=excludeBox.checked;put(EXCLUDE,excluded?'yes':'no');showConsent();if(!excluded)visitOnce();});
  if(optedIn&&!excluded)visitOnce();
  nav.addEventListener('click',event=>{const tab=event.target.closest('button[data-tab]');if(!tab||tab.dataset.tab==='analytics')return;send('tab_'+tab.dataset.tab);});
  document.addEventListener('click',event=>{if(event.target.closest('#guidedCalculate'))send('plan_calculate');if(event.target.closest('#quickMergeApply,#quickMergeButton'))send('quick_merge');});
  function applyAccess(){
    const admin=typeof isAdmin!=='undefined'&&isAdmin===true;
    btn.hidden=!admin;
    if(admin){adminVerified=true;showConsent();}
    if(!admin&&!section.hidden){section.hidden=true;document.querySelector('#tabs button[data-tab="animals"]')?.click();}
  }
  btn.addEventListener('click',()=>{if(typeof isAdmin==='undefined'||!isAdmin)return;nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));main.querySelectorAll(':scope > section').forEach(s=>s.hidden=s!==section);refresh();});
  const previousRender=renderAll;
  renderAll=function(...args){const r=previousRender.apply(this,args);applyAccess();return r;};
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function table(title,obj){const rows=Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]);return '<h3>'+escapeHtml(title)+'</h3>'+(rows.length?'<div class="scroll">'+rows.map(([k,v])=>'<div class="item"><span>'+escapeHtml(k.replaceAll('_',' '))+'</span><strong>'+Number(v).toLocaleString()+'</strong></div>').join('')+'</div>':'<p class="muted">No opted-in activity yet.</p>');}
  async function refresh(){
    const out=document.getElementById('analyticsResults');
    if(typeof isAdmin==='undefined'||!isAdmin){out.textContent='Administrator access required.';return;}
    out.textContent='Loading analytics…';
    try{const {data:summary,error}=await api.rpc('petlings_analytics_summary',{p_days:Number(document.getElementById('analyticsDays').value)});if(error)throw error;
      out.innerHTML='<div class="fields"><div class="panel"><strong>Opted-in visits</strong><h2>'+Number(summary.visits||0).toLocaleString()+'</h2></div><div class="panel"><strong>Registered accounts</strong><h2>'+Number(summary.registered_accounts||0).toLocaleString()+'</h2></div></div>'+table('Referrals',summary.by_source)+table('Device types',summary.by_device)+table('Feature activity',summary.by_feature)+'<p class="muted">Visits are counted once per browser tab session after consent, not unique people. Device and referral information are approximate. No demographic age, gender, or individual identities are tracked.</p>';
    }catch(e){out.textContent='Could not load analytics: '+e.message+' — confirm analytics-setup.sql was run in Supabase.';}
  }
  document.getElementById('analyticsRefresh').addEventListener('click',refresh);
  document.getElementById('analyticsDays').addEventListener('change',refresh);
  applyAccess();
})();
