/* Repairs accent swatches and intercepts same-route portal links without full-page reloads. */
(function(){
 'use strict';
 function repairSwatches(root){
  (root||document).querySelectorAll('#ie-personalise-panel .ie-p-swatch').forEach(function(button){
   var colour=button.style.backgroundColor||button.style.background;
   if(colour&&colour!=='transparent')button.style.setProperty('background-color',colour,'important');
   button.style.setProperty('background-image','none','important');
   button.style.setProperty('opacity','1','important');
   button.style.setProperty('visibility','visible','important');
  });
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
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){repairSwatches();});
 else repairSwatches();
 new MutationObserver(function(){repairSwatches();}).observe(document.documentElement,{childList:true,subtree:true});
})();
