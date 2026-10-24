/* Astra AI web assistant. Authenticated, optional and gracefully disabled until the server function is configured. */
(function(){
  'use strict';
  let mounted=false, busy=false;
  const history=[];
  const css=`
  #ie-astra-launch{position:fixed;right:18px;bottom:18px;z-index:9000;border:0;border-radius:999px;padding:13px 17px;background:#b3122a;color:#fff;font:600 14px/1.2 system-ui;box-shadow:0 8px 28px #0005;cursor:pointer}
  #ie-astra-panel{position:fixed;right:18px;bottom:76px;z-index:9001;width:min(390px,calc(100vw - 24px));height:min(570px,calc(100dvh - 105px));display:none;flex-direction:column;background:#101216;color:#f4f4f5;border:1px solid #333943;border-radius:18px;box-shadow:0 20px 70px #0008;overflow:hidden;font:14px/1.5 system-ui}
  #ie-astra-panel.open{display:flex} #ie-astra-head{padding:16px;border-bottom:1px solid #30343c;display:flex;align-items:center;justify-content:space-between}
  #ie-astra-head strong{font-size:16px} #ie-astra-head small{display:block;color:#a4aab5} #ie-astra-close{background:transparent;border:0;color:inherit;font-size:23px;cursor:pointer}
  #ie-astra-log{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
  .ie-astra-msg{padding:10px 12px;border-radius:12px;max-width:92%;white-space:pre-wrap;overflow-wrap:anywhere}.ie-astra-user{align-self:flex-end;background:#b3122a;color:#fff}.ie-astra-ai{align-self:flex-start;background:#20242b}
  #ie-astra-form{padding:12px;border-top:1px solid #30343c;display:flex;gap:8px} #ie-astra-input{min-width:0;flex:1;resize:none;max-height:100px;background:#191c22;color:#fff;border:1px solid #444b56;border-radius:10px;padding:10px;font:inherit}
  #ie-astra-send{border:0;border-radius:10px;background:#b3122a;color:white;padding:0 14px;font-weight:700} #ie-astra-send:disabled{opacity:.5}
  #ie-astra-note{padding:0 14px 10px;color:#a4aab5;font-size:11px} @media(max-width:520px){#ie-astra-launch{right:12px;bottom:12px}#ie-astra-panel{right:8px;bottom:68px;width:calc(100vw - 16px);height:min(620px,calc(100dvh - 86px))}`;
  function addMessage(role,text){const log=document.getElementById('ie-astra-log');if(!log)return;const node=document.createElement('div');node.className='ie-astra-msg '+(role==='user'?'ie-astra-user':'ie-astra-ai');node.textContent=text;log.appendChild(node);log.scrollTop=log.scrollHeight;return node;}
  async function send(text){if(busy||!text.trim())return;if(!(typeof sb!=='undefined' && sb)?.auth){addMessage('assistant','The secure assistant connection is not available right now. Please use the Help Centre.');return;}
    busy=true;const sendBtn=document.getElementById('ie-astra-send');if(sendBtn)sendBtn.disabled=true;addMessage('user',text);history.push({role:'user',content:text});const pending=addMessage('assistant','Thinking…');
    try{const {data,error}=await sb.functions.invoke('astra-chat',{body:{messages:history.slice(-12)}});if(error)throw error;const answer=String(data?.reply||'I couldn’t produce a reply just now. Please try again.').slice(0,8000);pending.textContent=answer;history.push({role:'assistant',content:answer});}
    catch(_){pending.textContent='Astra could not connect just now. Check that your website account is linked to Discord, then try again. If it keeps happening, use the Help Centre.';}
    finally{busy=false;if(sendBtn)sendBtn.disabled=false;}
  }
  async function mount(){if(mounted||!(typeof sb!=='undefined' && sb)?.auth)return;try{const {data}=await window.sb.auth.getSession();if(!data?.session?.user?.id)return;}catch(_){return;}
    mounted=true;const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
    const launch=document.createElement('button');launch.id='ie-astra-launch';launch.type='button';launch.textContent='✳ Ask Astra AI';launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls','ie-astra-panel');
    const panel=document.createElement('section');panel.id='ie-astra-panel';panel.setAttribute('aria-label','Astra AI assistant');panel.innerHTML='<div id="ie-astra-head"><div><strong>✳ Astra AI</strong><small>Imposed Entertainment assistant</small></div><button id="ie-astra-close" type="button" aria-label="Close assistant">×</button></div><div id="ie-astra-log" role="log" aria-live="polite"></div><div id="ie-astra-note">Do not share passwords, sign-in codes or sensitive payment details.</div><form id="ie-astra-form"><textarea id="ie-astra-input" rows="1" maxlength="2000" placeholder="Ask about your workspace…" aria-label="Message Astra AI" required></textarea><button id="ie-astra-send" type="submit">Send</button></form>';
    document.body.append(launch,panel);addMessage('assistant','Hi! I’m Astra, your Imposed Entertainment assistant. I can help with your workspace, release planning and label workflows.');
    function toggle(open){panel.classList.toggle('open',open);launch.setAttribute('aria-expanded',String(open));if(open)document.getElementById('ie-astra-input').focus();}
    launch.addEventListener('click',()=>toggle(!panel.classList.contains('open')));document.getElementById('ie-astra-close').addEventListener('click',()=>toggle(false));
    document.getElementById('ie-astra-form').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('ie-astra-input');const value=input.value.trim();if(!value)return;input.value='';send(value);});
    document.getElementById('ie-astra-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('ie-astra-form').requestSubmit();}});
    sb.auth.onAuthStateChange((_event,session)=>{if(!session?.user?.id){launch.remove();panel.remove();style.remove();mounted=false;history.length=0;}});
  }
  document.addEventListener('DOMContentLoaded',mount,{once:true});window.addEventListener('portal-ready',mount);document.addEventListener('ie-view-rendered',mount);
})();