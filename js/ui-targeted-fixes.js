/* Repairs accent swatches and intercepts same-route portal links without full-page reloads. */
(function(){
 'use strict';
 var panelSelector='#ie-personalise-panel';
 var swatchSelector='.ie-p-swatch';
 var repairQueued=false;
 function repairSwatches(root){
  var panel=root&&root.matches&&root.matches(panelSelector)?root:(root&&root.querySelector?root.querySelector(panelSelector):null)||document.querySelector(panelSelector);
  if(!panel)return;
  panel.querySelectorAll(swatchSelector).forEach(function(button){
   var colour=button.style.backgroundColor||button.style.background;
   if(colour&&colour!=='transparent')button.style.setProperty('background-color',colour,'important');
   button.style.setProperty('background-image','none','important');
   button.style.setProperty('opacity','1','important');
   button.style.setProperty('visibility','visible','important');
  });
 }
 function scheduleSwatchRepair(){
  if(repairQueued)return;
  repairQueued=true;
  var run=function(){repairQueued=false;repairSwatches(document.querySelector(panelSelector));};
  if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(run);
  else window.setTimeout(run,16);
 }
 function focusAuth(){
  var target=document.querySelector('.auth-card input:not([type=hidden]),.auth-card button[type=submit],.auth-card [data-auth-form]');
  if(target&&typeof target.focus==='function')target.focus({preventScroll:true});
 }
 document.addEventListener('click',function(event){
  var link=event.target&&event.target.closest?event.target.closest('a[href]'):null;
  if(!link)return;
  var url;
  try{url=new URL(link.href,location.href)}catch(_){return}
  if(url.origin!==location.origin)return;
  var path=url.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/signin'&&path!=='/listen')return;
  event.preventDefault();
  if(path==='/signin'){
   if((location.pathname.replace(/\/+$/,'')||'/')!=='/signin')history.pushState({iePortalRoute:true},'',url.pathname+url.search+url.hash);
   if(typeof window.renderAuth==='function')window.renderAuth();
   else if(typeof window.boot==='function')window.boot();
   setTimeout(focusAuth,0);
   return;
  }
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/listen')history.pushState({iePortalRoute:true},'',url.pathname+url.search+url.hash);
  if(typeof window.renderListenerRoute==='function')window.renderListenerRoute();
  else if(typeof window.boot==='function')window.boot();
 },true);
 window.addEventListener('popstate',function(){
  var path=location.pathname.replace(/\/+$/,'')||'/';
  if(path==='/listen'&&typeof window.renderListenerRoute==='function')window.renderListenerRoute();
  else if(path==='/signin'&&typeof window.renderAuth==='function')window.renderAuth();
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleSwatchRepair,{once:true});
 else scheduleSwatchRepair();
 /* Avoid scanning the whole document on every DOM mutation. Only queue a repair
    when the customiser panel or one of its descendants changes. */
 new MutationObserver(function(records){
  var relevant=records.some(function(record){
   var target=record.target;
   if(target&&target.nodeType===1&&(target.matches(panelSelector)||target.closest(panelSelector)))return true;
   return Array.from(record.addedNodes||[]).some(function(node){
    if(node.nodeType!==1)return false;
    return (node.matches&&node.matches(panelSelector))||
      (node.querySelector&&(node.querySelector(panelSelector)||node.querySelector(swatchSelector)));
   });
  });
  if(relevant)scheduleSwatchRepair();
 }).observe(document.documentElement,{childList:true,subtree:true});
})();
