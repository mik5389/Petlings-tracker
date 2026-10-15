// Automatic cookieless visit counts; optional feature analytics. Admins and excluded devices are not tracked.
(function () {
  'use strict';
  const CONSENT='petlings-analytics-opt-in-v1';
  const EXCLUDE='petlings-analytics-exclude-device-v1';
  const DECISION='petlings-analytics-choice-v1';
  const VISIT='petlings-analytics-basic-visit-v2';
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
  section.innerHTML='<div class="panel"><h2>Website Analytics</h2><p class="muted">Private administrator dashboard. Basic cookieless visit counts run automatically unless this device is excluded. Detailed feature analytics require opt-in. Administrators are excluded. Visits are not unique people.</p><div class="fields"><div><label for="analyticsDays">Period</label><select id="analyticsDays"><option value="1">Last 24 hours</option><option value="7" selected>Last 7 days</option><option value="30">Last 30 days</option></select></div></div><p id="analyticsTrackingStatus" class="muted"></p><button id="analyticsRefresh" type="button">Refresh analytics</button><div id="analyticsResults" aria-live="polite" style="margin-top:14px"></div></div>';
  main.append(section);
  const privacy=document.createElement('div');privacy.className='panel';privacy.id='analyticsPrivacy';
  privacy.innerHTML='<h2>Privacy &amp; Analytics</h2><p class="muted">Basic cookieless visit counts are collected automatically unless you exclude this device. Each counted visit includes general device category and referral category (Reddit, direct, or other). Optional feature analytics record general tab and button usage only if you enable them. This tracker does not store IP addresses, names, email addresses, precise locations, persistent visitor IDs, inventory contents, or individual breeding choices in its analytics table. Hosting and infrastructure providers may process technical request data separately. Administrators and excluded devices are not counted. You can change your choices anytime. Turning tracking off does not delete previously recorded aggregate events.</p><label><input id="analyticsConsent" type="checkbox" class="check"> Share optional feature-usage analytics</label><label><input id="analyticsExcludeDevice" type="checkbox" class="check"> Exclude this device from analytics (even while signed out)</label><p class="muted" id="analyticsConsentStatus"></p>';
  const backup=document.getElementById('backup');if(backup)backup.append(privacy);else main.append(privacy);
  const privacyLink=document.createElement('button');privacyLink.type='button';privacyLink.className='secondary';privacyLink.textContent='Privacy & analytics';privacyLink.style.margin='12px';
  (document.getElementById('petlingsAccountFooter')||document.body).append(privacyLink);
  privacyLink.addEventListener('click',()=>{document.querySelector('#tabs button[data-tab="backup"]')?.click();privacy.scrollIntoView({block:'start',behavior:'smooth'});});
  const checkbox=document.getElementById('analyticsConsent');checkbox.checked=optedIn;
  const excludeBox=document.getElementById('analyticsExcludeDevice');excludeBox.checked=excluded;
  const status=document.getElementById('analyticsConsentStatus');
  const trackingStatus=document.getElementById('analyticsTrackingStatus');
  function showConsent(){
    const state=excluded?'All analytics excluded on this device.':adminVerified?'Administrator activity excluded.':optedIn?'Basic visits automatic; optional feature analytics enabled.':'Basic visits automatic; optional feature analytics off.';
    status.textContent=state;
    trackingStatus.textContent=state;
  }
  showConsent();
  // First-visit choice: do not start optional tracking until explicitly accepted.
  // Basic visit counting follows the separate, disclosed basic-analytics policy.
  const privacyDialog=document.createElement('dialog');
  privacyDialog.id='petlingsAnalyticsWelcome';
  privacyDialog.setAttribute('aria-labelledby','petlingsAnalyticsWelcomeTitle');
  privacyDialog.innerHTML=`<div style="max-width:420px"><h2 id="petlingsAnalyticsWelcomeTitle">Help improve Petlings! 🐾</h2><p>We count basic website visits, general device type, and referral source (such as Reddit), unless this device is excluded.</p><p>Would you also like to share anonymous feature usage, such as which tabs and calculators you use? We don't include your inventory, breeding choices, name, or email in analytics.</p><div style="display:flex;flex-direction:column;gap:10px"><button type="button" id="petlingsAnalyticsAccept">Yes, share feature usage</button><button type="button" class="secondary" id="petlingsAnalyticsBasic">Basic analytics only</button></div><p class="muted small">You can change this later in Backup → Privacy &amp; Analytics.</p></div>`;
  privacyDialog.style.cssText='border:1px solid #b8d3c9;border-radius:16px;padding:24px;width:min(460px,calc(100vw - 32px));max-height:85vh;overflow:auto;color:#344b48;background:#fff;box-shadow:0 12px 50px #0003';
  const backdropStyle=document.createElement('style');backdropStyle.textContent='#petlingsAnalyticsWelcome::backdrop{background:rgba(23,39,38,.6)}';document.head.append(backdropStyle);
  document.body.append(privacyDialog);
  function decide(accept){
    optedIn=accept;checkbox.checked=accept;
    put(CONSENT,accept?'yes':'no');put(DECISION,'yes');
    showConsent();privacyDialog.close();visitOnce();
  }
  privacyDialog.querySelector('#petlingsAnalyticsAccept').addEventListener('click',()=>decide(true));
  privacyDialog.querySelector('#petlingsAnalyticsBasic').addEventListener('click',()=>decide(false));
  // Prevent dismissal without making a choice; either option leaves the site usable.
  privacyDialog.addEventListener('cancel',e=>e.preventDefault());
  async function showFirstVisitChoice(){
    if(get(DECISION)==='yes'||excluded)return;
    const admin=await adminCheck();
    if(admin!==false||excluded||get(DECISION)==='yes')return;
    if(!privacyDialog.open)privacyDialog.showModal();
  }
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
    if((name!=='visit'&&!optedIn)||excluded||!allowed.has(name)||typeof api==='undefined'||!api)return;
    const isAdministrator=await adminCheck();
    if(isAdministrator!==false||(name!=='visit'&&!optedIn)||excluded)return;
    try{const {error}=await api.rpc('petlings_record_event',{p_event:name,p_device:device(),p_source:originalSource});if(error)console.warn('Optional analytics unavailable:',error.message)}catch(_){}
  }
  function visitOnce(){
    if(excluded)return;
    // Mark the session only after we know the event is eligible to be recorded.
    adminCheck().then(admin=>{
      if(admin!==false||excluded)return;
      try{if(sessionStorage.getItem(VISIT))return;sessionStorage.setItem(VISIT,'yes')}catch(_){}
      send('visit');
    });
  }
  checkbox.addEventListener('change',()=>{optedIn=checkbox.checked;put(CONSENT,optedIn?'yes':'no');put(DECISION,'yes');showConsent();});
  excludeBox.addEventListener('change',()=>{excluded=excludeBox.checked;put(EXCLUDE,excluded?'yes':'no');showConsent();if(!excluded){if(get(DECISION)==='yes')visitOnce();else showFirstVisitChoice();}});
  if(!excluded){if(get(DECISION)==='yes')visitOnce();else showFirstVisitChoice();}
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
  function table(title,obj){const rows=Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]);return '<h3>'+escapeHtml(title)+'</h3>'+(rows.length?'<div class="scroll">'+rows.map(([k,v])=>'<div class="item"><span>'+escapeHtml(k.replaceAll('_',' '))+'</span><strong>'+Number(v).toLocaleString()+'</strong></div>').join('')+'</div>':'<p class="muted">No recorded activity yet.</p>');}
  async function refresh(){
    const out=document.getElementById('analyticsResults');
    if(typeof isAdmin==='undefined'||!isAdmin){out.textContent='Administrator access required.';return;}
    out.textContent='Loading analytics…';
    try{const {data:summary,error}=await api.rpc('petlings_analytics_summary',{p_days:Number(document.getElementById('analyticsDays').value)});if(error)throw error;
      out.innerHTML='<div class="fields"><div class="panel"><strong>Counted visits</strong><h2>'+Number(summary.visits||0).toLocaleString()+'</h2></div><div class="panel"><strong>Registered accounts</strong><h2>'+Number(summary.registered_accounts||0).toLocaleString()+'</h2></div></div>'+table('Referrals',summary.by_source)+table('Device types',summary.by_device)+table('Feature activity',summary.by_feature)+'<p class="muted">Basic visits are counted once per browser tab session, not unique people. Optional feature events require consent. Device and referral information are approximate. No demographic age, gender, or individual identities are tracked.</p>';
    }catch(e){out.textContent='Could not load analytics: '+e.message+' — confirm analytics-setup.sql was run in Supabase.';}
  }
  document.getElementById('analyticsRefresh').addEventListener('click',refresh);
  document.getElementById('analyticsDays').addEventListener('change',refresh);
  applyAccess();
})();
// Consent-choice aggregates and optional anonymous player survey.
(function(){
'use strict';
const get=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
const put=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
const choiceKey='petlings-analytics-choice-counted-v1';
const surveyKey='petlings-survey-submitted-v1';
const welcome=document.getElementById('petlingsAnalyticsWelcome');
const apiReady=()=>typeof api!=='undefined'&&!!api;
async function eligible(){
  if(get('petlings-analytics-exclude-device-v1')==='yes'||!apiReady())return false;
  try{
    const {data:auth,error}=await api.auth.getUser();
    if(error&&!/session missing/i.test(error.message||''))return false;
    if(!auth?.user)return true;
    const {data:admin,error:err}=await api.rpc('is_petlings_admin');
    return !err&&admin===false;
  }catch(_){return false}
}
async function recordChoice(choice){
  if(get(choiceKey)||!await eligible())return;
  try{
    const {error}=await api.rpc('petlings_record_consent',{p_choice:choice});
    if(!error)put(choiceKey,'yes');
  }catch(_){/* Analytics must never interrupt gameplay. */}
}
if(welcome){
  welcome.querySelector('#petlingsAnalyticsAccept')?.addEventListener('click',()=>recordChoice('accepted'));
  welcome.querySelector('#petlingsAnalyticsBasic')?.addEventListener('click',()=>recordChoice('basic_only'));
}
const privacy=document.getElementById('analyticsPrivacy');
if(!privacy)return;
const link=document.createElement('button');link.type='button';link.className='secondary';link.textContent='Optional player survey';link.style.margin='8px 0';
privacy.append(link);
const survey=document.createElement('dialog');survey.id='petlingsSurvey';
survey.style.cssText='border:1px solid #b8d3c9;border-radius:16px;padding:22px;width:min(460px,calc(100vw - 32px));max-height:85vh;overflow:auto;background:white;color:#344b48';
survey.innerHTML=`<form method="dialog"><h2>Optional Petlings player survey 🐾</h2><p class="muted">Anonymous and completely optional. For adult players only. Skip any question by choosing “Prefer not to say.” Responses are shown only as totals and are not linked to your account.</p><label for="surveyAge">Age range</label><select id="surveyAge"><option value="prefer_not">Prefer not to say</option><option value="18_24">18–24</option><option value="25_34">25–34</option><option value="35_44">35–44</option><option value="45_54">45–54</option><option value="55_plus">55+</option></select><label for="surveyRegion" style="margin-top:12px">Region</label><select id="surveyRegion"><option value="prefer_not">Prefer not to say</option><option value="north_america">North America</option><option value="south_america">South America</option><option value="europe">Europe</option><option value="africa">Africa</option><option value="asia">Asia</option><option value="oceania">Oceania</option></select><div class="inline" style="margin-top:14px"><button type="button" id="surveySubmit">Submit anonymously</button><button type="submit" class="secondary">Not now</button></div><p id="surveyMessage" class="muted" aria-live="polite"></p></form>`;
document.body.append(survey);
link.onclick=()=>{if(get(surveyKey)){alert('Thanks! You have already submitted this survey in this browser.');return}survey.showModal()};
survey.querySelector('#surveySubmit').onclick=async()=>{
  const msg=survey.querySelector('#surveyMessage');
  if(get(surveyKey)){msg.textContent='Already submitted in this browser.';return}
  if(!apiReady()){msg.textContent='Survey unavailable right now.';return}
  const submit=survey.querySelector('#surveySubmit');submit.disabled=true;
  try{
    const {error}=await api.rpc('petlings_submit_survey',{p_age:survey.querySelector('#surveyAge').value,p_region:survey.querySelector('#surveyRegion').value});
    if(error)throw error;
    put(surveyKey,'yes');msg.textContent='Thank you! Your anonymous response was saved.';
    submit.textContent='Submitted';
  }catch(_){msg.textContent='Could not save your response. Please try again.';submit.disabled=false}
};
const analytics=document.getElementById('analytics');
if(!analytics)return;
const panel=document.createElement('div');panel.className='panel';panel.innerHTML='<h2>Consent & player survey</h2><p class="muted">Anonymous choice counts and voluntary adult survey responses. Counts are not unique people; they may include repeat submissions from separate browsers.</p><div id="analyticsExtraResults">Open Analytics to load these statistics.</div>';
analytics.append(panel);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={prefer_not:'Prefer not to say',north_america:'North America',south_america:'South America',europe:'Europe',africa:'Africa',asia:'Asia',oceania:'Oceania','18_24':'18–24','25_34':'25–34','35_44':'35–44','45_54':'45–54','55_plus':'55+'};
function list(title,values){const entries=Object.entries(values||{}).sort((a,b)=>Number(b[1])-Number(a[1]));return '<h3>'+title+'</h3>'+(entries.length?entries.map(([k,n])=>'<div class="item"><span>'+escape(names[k]||k)+'</span><strong>'+Number(n).toLocaleString()+'</strong></div>').join(''):'<p class="muted">No responses yet.</p>')}
async function refreshExtra(){
  const out=document.getElementById('analyticsExtraResults');
  if(typeof isAdmin==='undefined'||!isAdmin)return;
  out.textContent='Loading…';
  try{
    const days=Number(document.getElementById('analyticsDays').value);
    const {data:stats,error}=await api.rpc('petlings_analytics_extra_summary',{p_days:days});
    if(error)throw error;
    const yes=Number(stats.consent_accepted||0),no=Number(stats.consent_basic_only||0),total=yes+no;
    out.innerHTML='<div class="fields"><div><strong>Choices recorded</strong><h2>'+total.toLocaleString()+'</h2></div><div><strong>Accepted</strong><h2>'+yes.toLocaleString()+'</h2></div><div><strong>Basic only</strong><h2>'+no.toLocaleString()+'</h2></div><div><strong>Acceptance rate</strong><h2>'+(total?Math.round(yes/total*100)+'%':'—')+'</h2></div></div><p><strong>Survey responses:</strong> '+Number(stats.survey_responses||0).toLocaleString()+'</p>'+list('Age ranges (voluntary)',stats.by_age)+list('Regions (voluntary)',stats.by_region);
  }catch(e){out.textContent='Additional analytics unavailable: '+e.message}
}
document.querySelector('#tabs button[data-tab="analytics"]')?.addEventListener('click',refreshExtra);
document.getElementById('analyticsRefresh')?.addEventListener('click',refreshExtra);
document.getElementById('analyticsDays')?.addEventListener('change',refreshExtra);
})();
