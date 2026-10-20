/* Imposed Entertainment — per-device workspace personalisation. No account data is sent. */
(function(){
  'use strict';
  var KEY='ie-workspace-personalisation-v1';
  var presets=[['Gold','#d8bd73'],['Ice blue','#8ecdf0'],['Lavender','#c4a5f5'],['Rose','#f09aa9'],['Mint','#8dd9b5'],['White','#f2f0ee']];
  var defaults={accent:'#d8bd73',density:'standard',fontScale:1,glow:false,contrast:false};
  function read(){try{var v=JSON.parse(localStorage.getItem(KEY)||'{}');return Object.assign({},defaults,v)}catch(_){return Object.assign({},defaults)}}
  var state=read();
  function apply(){
    var root=document.documentElement,body=document.body;
    root.style.setProperty('--user-accent',state.accent);
    root.style.setProperty('--user-font-scale',String(state.fontScale));
    body.classList.toggle('personalise-glow',!!state.glow);
    body.classList.toggle('personalise-compact',state.density==='compact');
    body.classList.toggle('personalise-comfort',state.density==='comfortable');
    body.classList.toggle('personalise-high-contrast',!!state.contrast);
    var panel=document.getElementById('ie-personalise-panel');
    if(panel)render();
  }
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){} apply(); announce('Your workspace preferences have been saved on this device.')}
  function announce(msg){var n=document.getElementById('ie-personalise-status');if(n)n.textContent=msg}
  function el(tag,attrs,text){var n=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){if(k==='className')n.className=attrs[k];else n.setAttribute(k,attrs[k])});if(text!==undefined)n.textContent=text;return n}
  function render(){
    var panel=document.getElementById('ie-personalise-panel');if(!panel)return;
    panel.replaceChildren();
    var head=el('div',{className:'ie-p-head'});
    head.append(el('h2',{},'Make it yours'));
    var close=el('button',{'type':'button','aria-label':'Close personalisation'},'✕');close.addEventListener('click',function(){panel.hidden=true;document.getElementById('ie-personalise-trigger').focus()});head.append(close);panel.append(head);
    panel.append(el('p',{className:'ie-p-sub'},'Personalise how your workspace looks. These choices stay on this device.'));
    var colours=el('fieldset',{}),legend=el('legend',{},'Accent colour');colours.append(legend);
    var swatches=el('div',{className:'ie-p-colours'});
    presets.forEach(function(p){var b=el('button',{type:'button',className:'ie-p-swatch','aria-label':p[0],'aria-pressed':String(state.accent===p[1]),title:p[0]});b.style.background=p[1];b.addEventListener('click',function(){state.accent=p[1];apply()});swatches.append(b)});
    colours.append(swatches);panel.append(colours);
    var density=el('fieldset',{});density.append(el('legend',{},'Workspace spacing'));
    var select=el('select',{'aria-label':'Workspace spacing'});
    [['compact','Compact'],['standard','Standard'],['comfortable','Comfortable']].forEach(function(o){var op=el('option',{value:o[0]},o[1]);op.selected=state.density===o[0];select.append(op)});
    select.addEventListener('change',function(){state.density=select.value;apply()});density.append(select);panel.append(density);
    var scale=el('fieldset',{});scale.append(el('legend',{},'Text size'));
    var range=el('input',{type:'range',min:'0.9',max:'1.2',step:'0.05',value:String(state.fontScale),'aria-label':'Text size'});var value=el('p',{},Math.round(state.fontScale*100)+'%');
    range.addEventListener('input',function(){state.fontScale=Number(range.value);value.textContent=Math.round(state.fontScale*100)+'%';document.documentElement.style.setProperty('--user-font-scale',String(state.fontScale))});scale.append(range,value);panel.append(scale);
    var toggles=el('fieldset',{});toggles.append(el('legend',{},'Visual effects'));
    [['glow','Subtle accent glow'],['contrast','Stronger contrast']].forEach(function(o){var row=el('label',{className:'ie-p-toggle'});row.append(el('span',{},o[1]));var input=el('input',{type:'checkbox','aria-label':o[1]});input.checked=!!state[o[0]];input.addEventListener('change',function(){state[o[0]]=input.checked;apply()});row.append(input);toggles.append(row)});panel.append(toggles);
    var actions=el('div',{className:'ie-p-actions'}),reset=el('button',{type:'button'},'Reset'),save=el('button',{type:'button',className:'ie-p-save'},'Save preferences');
    reset.addEventListener('click',function(){state=Object.assign({},defaults);apply()});save.addEventListener('click',persist);actions.append(reset,save);panel.append(actions);
    panel.append(el('p',{id:'ie-personalise-status','role':'status','aria-live':'polite'}));
  }
  function init(){
    if(document.getElementById('ie-personalise-trigger'))return;
    var trigger=el('button',{id:'ie-personalise-trigger',type:'button','aria-label':'Customise workspace','aria-expanded':'false','aria-controls':'ie-personalise-panel'},'✳');
    trigger.addEventListener('click',function(){var panel=document.getElementById('ie-personalise-panel');panel.hidden=!panel.hidden;trigger.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){render();var first=panel.querySelector('button');if(first)first.focus()}});
    var panel=el('section',{id:'ie-personalise-panel','aria-label':'Workspace personalisation','role':'dialog','aria-modal':'false',hidden:''});
    document.body.append(trigger,panel);apply();
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('pageshow',apply);
})();