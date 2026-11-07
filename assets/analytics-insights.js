// Administrator-only aggregate analytics insights. Uses existing authorized RPCs.
(function(){
 'use strict';
 const tab=document.querySelector('#tabs [data-tab="analytics"]');
 const section=document.getElementById('analytics');
 if(!tab||!section)return;
 const panel=document.createElement('div');panel.className='panel';panel.id='petlingsInsights';
 panel.innerHTML='<h2>Traffic insights</h2><p class="muted">Aggregated visits and opt-in feature events. These are not unique people; no individual profiles or new tracking are added.</p><button type="button" class="secondary" id="petlingsInsightsRefresh">Refresh insights</button><div id="petlingsInsightsBody" aria-live="polite"><p class="muted">Open Analytics to load insights.</p></div>';
 section.append(panel);
 const out=panel.querySelector('#petlingsInsightsBody');
 const safe=(v)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number(n||0).toLocaleString();
 const pct=(n,d)=>d?((100*n/d).toFixed(1)+'%'):'—';
 function block(title,items){return '<h3>'+safe(title)+'</h3>'+(items.length?'<div class="scroll">'+items.map(([label,count,share])=>'<div class="item"><span>'+safe(label)+'</span><strong>'+fmt(count)+(share?' · '+safe(share):'')+'</strong></div>').join('')+'</div>':'<p class="muted">No recorded data for this period.</p>');}
 function breakdown(obj,total){return Object.entries(obj||{}).sort((a,b)=>Number(b[1])-Number(a[1])).map(([k,v])=>[k.replaceAll('_',' '),Number(v),pct(Number(v),total)]);}
 let running=false;
 async function refresh(){
  if(running||typeof isAdmin==='undefined'||isAdmin!==true||typeof api==='undefined'||!api)return;
  running=true;out.textContent='Loading aggregate insights…';
  try{
   const days=Number(document.getElementById('analyticsDays')?.value||7);
   const periods=[0,1,7,30];
   const responses=await Promise.all(periods.map(p=>api.rpc('petlings_analytics_summary',{p_days:p})));
   for(const r of responses)if(r.error)throw r.error;
   if(typeof isAdmin==='undefined'||isAdmin!==true){out.textContent='Administrator access required.';return;}
   const selected=responses[periods.indexOf(days)];
    if(!selected)throw new Error('Unsupported analytics period: '+days);
    const stats=selected.data||{};
   const visits=Number(stats.visits||0),sources=stats.by_source||{},devices=stats.by_device||{},features=stats.by_feature||{};
   const interactions=Object.values(features).reduce((a,b)=>a+Number(b||0),0);
   const all=responses.map((r,i)=>[periods[i]+' day'+(periods[i]>1?'s':''),Number(r.data?.visits||0)]);
   const lastDay=all[0][1],lastWeek=all[1][1],lastMonth=all[2][1];
   let html='<div class="fields"><div><strong>Visits in selected period</strong><h2>'+fmt(visits)+'</h2></div><div><strong>Opt-in feature actions</strong><h2>'+fmt(interactions)+'</h2></div></div>';
   html+=block('Traffic windows',all.map(([k,v])=>[k,v,'']));
   html+='<p class="muted small">Previous 6 days (excluding the last 24 hours): '+fmt(Math.max(0,lastWeek-lastDay))+' visits. Previous 23 days (excluding the last 7 days): '+fmt(Math.max(0,lastMonth-lastWeek))+' visits. Windows are rolling, not calendar days.</p>';
   html+=block('Where visits came from',breakdown(sources,visits));
   html+=block('Devices used',breakdown(devices,visits));
   html+=block('Popular features (consenting visitors only)',breakdown(features,interactions));
   html+='<p class="muted small">Feature-action percentages are shares of tracked actions, not shares of people. Direct traffic may include referrals hidden by browsers or apps. Counts exclude administrators only when their session was correctly recognized before tracking.</p>';
   out.innerHTML=html;
  }catch(e){out.textContent='Could not load insights: '+(e?.message||'Unknown error');}
  finally{running=false;}
 }
 panel.querySelector('#petlingsInsightsRefresh').addEventListener('click',refresh);
 document.getElementById('analyticsDays')?.addEventListener('change',()=>{if(!section.hidden)refresh();});
 tab.addEventListener('click',()=>{if(typeof isAdmin!=='undefined'&&isAdmin===true)refresh();});
})();
