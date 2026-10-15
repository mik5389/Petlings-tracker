
// Recipe browsing is public. Only recipe creation controls require admin access.
(function(){
  const search=document.getElementById('recipeBrowserSearch');
  const tier=document.getElementById('recipeBrowserTier');
  function enablePublicBrowsing(){
    if(search) search.disabled=false;
    if(tier) tier.disabled=false;
  }
  const priorRenderAll=renderAll;
  renderAll=function(){priorRenderAll();enablePublicBrowsing();};
  enablePublicBrowsing();
})();
