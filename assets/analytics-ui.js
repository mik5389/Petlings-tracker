// Opt-in aggregate usage analytics; no visitor identifiers or private game data collected.
(function () {
  'use strict';
  const CONSENT='petlings-analytics-opt-in-v1';
  const allowed=new Set(['visit','tab_animals','tab_recipes','tab_discover','tab_inventory','tab_planner','tab_backup','plan_calculate','quick_merge']);
  let optedIn=false;
  try { optedIn=localStorage.getItem(CONSENT)==='yes'; } catch (_) {}
  const nav=document.getElementById('tabs');
  const main=document.querySelector('main');
  if(!nav||!main)return;
  const btn=document.createElement('button');btn.type='button';btn.dataset.tab='analytics';btn.textContent='Analytics';btn.hidden=true;nav.append(btn);
  const section=document.createElement('section');section.id='analytics';section.hidden=true;
  section.innerHTML='<div class="panel"><h2>Website Analytics</h2><p class="muted">Private administrator dashboard. Counts include only visits from people who opted in. Visits are not unique people.</p><div class="fields"><div><label for="analyticsDays">Period</label><select id="analyticsDays"><option value="1">Last 24 hours</option><option value="7" selected>Last 7 days</option><option value="30">Last 30 days</option></select></div></div><button id="analyticsRefresh" type="button">Refresh analytics</button><div id="analyticsResults" aria-live="polite" style="margin-top:14px"></div></div>';
  main.append(section);
  const privacy=document.createElement('div');privacy.className='panel';privacy.id='analyticsPrivacy';
  privacy.innerHTML='<h2>Privacy &amp; Analytics</h2><p class="muted">Optional anonymous analytics help us see website visits, general device type, Reddit referrals, and feature popularity. We do not record IP addresses, names, email addresses, exact locations, inventory contents, or individual breeding choices in analytics. No analytics events are sent until you opt in. Your account and personal cloud sync are separate. You can change your choice at any time. Events already collected remain as aggregate records; contact the site administrator to request deletion of analytics data.</p><label><input id="analyticsConsent" type="checkbox" class="check"> Allow optional usage analytics</label><p class="muted" id="analyticsConsentStatus"></p>';
  const backup=document.getElementById('backup');if(backup)backup.append(privacy);else main.append(privacy);
  const privacyLink=document.createElement('button');privacyLink.type='button';privacyLink.className='secondary';privacyLink.textContent='Privacy & analytics';privacyLink.style.margin='12px';
  (document.getElementById('petlingsAccountFooter')||document.body).append(privacyLink);
  privacyLink.addEventListener('click',()=>{document.querySelector('#tabs button[data-tab="backup"]')?.click();privacy.scrollIntoView({block:'start',behavior:'smooth'});});
  const checkbox=document.getElementById('analyticsConsent');checkbox.checked=optedIn;
  const status=document.getElementById('analyticsConsentStatus');
  function showConsent(){status.textContent=optedIn?'Optional analytics enabled on this browser.':'Optional analytics disabled on this browser.';}
  showConsent();
  const device=()=>/iPad|Tablet|Android(?!.*Mobile)/i.test(navigator.userAgent)?'tablet':/Mobi|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop';
  const source=()=>{try{const host=new URL(document.referrer).hostname.toLowerCase();return host==='reddit.com'||host.endsWith('.reddit.com')?'reddit':host?'other':'direct';}catch(_){return 'direct';}};
  const originalSource=source();
  function send(name){
    if(!optedIn||!allowed.has(name)||typeof api==='undefined'||!api)return;
    api.rpc('petlings_record_event',{p_event:name,p_device:device(),p_source:originalSource}).then(({error})=>{if(error)console.warn('Optional analytics unavailable:',error.message)}).catch(()=>{});
  }
  checkbox.addEventListener('change',()=>{
    optedIn=checkbox.checked;
    try{localStorage.setItem(CONSENT,optedIn?'yes':'no')}catch(_){}
    showConsent();
    if(optedIn)visitOnce();
  });
  function visitOnce(){
    try{if(sessionStorage.getItem('petlings-analytics-visit'))return;sessionStorage.setItem('petlings-analytics-visit','yes')}catch(_){}
    send('visit');
  }
  if(optedIn)visitOnce();
  nav.addEventListener('click',event=>{
    const tab=event.target.closest('button[data-tab]');if(!tab||tab.dataset.tab==='analytics')return;
    send('tab_'+tab.dataset.tab);
  });
  // Track explicit button actions, not animal names, quantities, or recipe details.
  document.addEventListener('click',event=>{
    if(event.target.closest('#guidedCalculate'))send('plan_calculate');
    if(event.target.closest('#quickMergeApply,#quickMergeButton'))send('quick_merge');
  });
  function applyAccess(){
    const admin=typeof isAdmin!=='undefined'&&isAdmin===true;
    btn.hidden=!admin;
    if(!admin&&!section.hidden){section.hidden=true;document.querySelector('#tabs button[data-tab="animals"]')?.click();}
  }
  btn.addEventListener('click',()=>{
    if(typeof isAdmin==='undefined'||!isAdmin)return;
    nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));
    main.querySelectorAll(':scope > section').forEach(s=>s.hidden=s!==section);
    refresh();
  });
  const previousRender=renderAll;
  renderAll=function(...args){const r=previousRender.apply(this,args);applyAccess();return r;};
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function table(title,obj){const rows=Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]);return '<h3>'+escapeHtml(title)+'</h3>'+(rows.length?'<div class="scroll">'+rows.map(([k,v])=>'<div class="item"><span>'+escapeHtml(k.replaceAll('_',' '))+'</span><strong>'+Number(v).toLocaleString()+'</strong></div>').join('')+'</div>':'<p class="muted">No opted-in activity yet.</p>');}
  async function refresh(){
    const out=document.getElementById('analyticsResults');
    if(typeof isAdmin==='undefined'||!isAdmin){out.textContent='Administrator access required.';return;}
    out.textContent='Loading analytics…';
    try{
      const {data:summary,error}=await api.rpc('petlings_analytics_summary',{p_days:Number(document.getElementById('analyticsDays').value)});
      if(error)throw error;
      out.innerHTML='<div class="fields"><div class="panel"><strong>Opted-in visits</strong><h2>'+Number(summary.visits||0).toLocaleString()+'</h2></div><div class="panel"><strong>Registered accounts</strong><h2>'+Number(summary.registered_accounts||0).toLocaleString()+'</h2></div></div>'+table('Referrals',summary.by_source)+table('Device types',summary.by_device)+table('Feature activity',summary.by_feature)+'<p class="muted">Visits are counted once per browser tab session after consent, not unique people. Device and referral information are approximate. No demographic age, gender, or individual identities are tracked.</p>';
    }catch(e){out.textContent='Could not load analytics: '+e.message+' — confirm analytics-setup.sql was run in Supabase.';}
  }
  document.getElementById('analyticsRefresh').addEventListener('click',refresh);
  document.getElementById('analyticsDays').addEventListener('change',refresh);
  applyAccess();
})();
