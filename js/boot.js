/* Setup screen, boot(), loadProfile, loadApp */
  let appLoadPromise = null;
  let appLoadUserId = null;
  function showPortalLoading(message='Preparing your workspace…', detail='Connecting securely'){
    const overlay=document.getElementById('app-loading');
    if(!overlay)return;
    const title=document.getElementById('loading-message'),sub=document.getElementById('loading-detail'),retry=document.getElementById('loading-retry');
    if(title)title.textContent=message;if(sub)sub.textContent=detail;if(retry)retry.hidden=true;
    overlay.classList.remove('is-hidden');const app=document.getElementById('app');if(app)app.setAttribute('aria-busy','true');
  }
  function hidePortalLoading(){
    const overlay=document.getElementById('app-loading');if(overlay)overlay.classList.add('is-hidden');
    const app=document.getElementById('app');if(app)app.setAttribute('aria-busy','false');
    window.dispatchEvent(new Event('portal-ready'));
  }
  function requireReady(){ if(!ready){ renderSetup(); return false; } return true; }
  // Public listener routes must survive direct links, refreshes, and auth callbacks.
  function isListenerRoute(){
    const q=new URLSearchParams(location.search);
    const path=location.pathname.replace(/\/+$/,'')||'/';
    return q.has('explore') || q.has('artist') || path==='/listen' || /^\/listen\/artist\/[^/]+$/.test(path) || /^\/link\/[^/]+$/.test(path);
  }
  function renderListenerRoute(){
    const q=new URLSearchParams(location.search);
    const path=location.pathname.replace(/\/+$/,'')||'/';
    let slug=q.get('artist');
    const match=path.match(/^\/listen\/artist\/([^/]+)$/);
    const linkMatch=path.match(/^\/link\/([^/]+)$/);
    if(linkMatch){let linkSlug;try{linkSlug=decodeURIComponent(linkMatch[1]);}catch(_){linkSlug=linkMatch[1];}renderPublicSmartLink(linkSlug);return;}
    if(!slug&&match){try{slug=decodeURIComponent(match[1]);}catch(_){slug=match[1];}}
    if(slug) renderPublicArtist(slug); else renderGuestDiscover();
  }
  function renderSetup(){
    const hasConfig=Boolean(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&!String(C.SUPABASE_URL).includes('PASTE_')&&!String(C.SUPABASE_ANON_KEY).includes('PASTE_'));
    const sdkMissing=hasConfig&&!window.supabase;
    $('#app').innerHTML=`<main id="main-content" class="setup" tabindex="-1"><div class="setup-card"><div class="brand-mark">${icon(sdkMissing?'refresh':'disc',22)}</div><p class="eyebrow blue">${sdkMissing?'CONNECTION LIBRARY UNAVAILABLE':'SUPABASE REQUIRED'}</p><h1>${sdkMissing?'We could not start a secure connection':'Connect Imposed Entertainment'}</h1><p>${sdkMissing?'The Supabase client library did not load. This can happen if a content blocker, CDN outage or network filter blocks the script. Check your connection and retry.':'This deployment requires a live Supabase project. Add your Supabase Project URL and anon public key to config.js, then redeploy.'}</p>${sdkMissing?'<button class="primary" type="button" onclick="location.reload()">Retry connection</button>':`<div class="setup-code"><b>config.js</b><pre>window.IMPOSED_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY"
};</pre></div><ol><li>Use the existing Supabase project and its applied migrations; do not run an old schema file over a live database.</li><li>Confirm the Project URL and publishable/anon key in <code>config.js</code>.</li><li>Upload this folder to your existing Cloudflare Pages project.</li><li>Have the existing label administrator invite artists and label members from Roster &amp; invites.</li></ol>`}<p class="setup-note">The portal contains no seeded catalogue data. Everything shown after sign-in comes from your Supabase project.</p></div></main>`;
  }

  // Start the portal explicitly. Without this entry point, events.js calls boot()
  // before any auth state is rendered, leaving the initial skeleton on screen.
  async function boot(){
    if(!ready){
      renderSetup();
      hidePortalLoading();
      return;
    }
    showPortalLoading('Preparing your workspace…','Connecting securely');
    const sessionRequest=sb.auth.getSession();
    let startupTimeoutId;
    const timeoutRequest=new Promise((_,reject)=>{startupTimeoutId=setTimeout(()=>{
      const error=new Error('Supabase session check timed out. Check your connection and retry.');
      error.code='PORTAL_STARTUP_TIMEOUT';
      reject(error);
    },15000);});
    let sessionResult;
    try { sessionResult=await Promise.race([sessionRequest,timeoutRequest]); }
    finally { clearTimeout(startupTimeoutId); }
    const {data,error}=sessionResult;
    if(error) throw error;
    session=data?.session||null;
    // Do not force public listener links through the artist/label sign-in screen.
    if(isListenerRoute()){ renderListenerRoute(); hidePortalLoading(); }
    sb.auth.onAuthStateChange((event,nextSession)=>{
      // Defer work so Supabase's auth callback lock is released before data calls.
      setTimeout(async()=>{
        if(isListenerRoute()){ session=nextSession||null; renderListenerRoute(); hidePortalLoading(); return; }
        const previousUserId=session?.user?.id||null;
        session=nextSession||null;
        if(session){
          if(previousUserId!==session.user.id || !profile) {
            try { await loadApp(); }
            catch(e){ console.error('Workspace refresh failed',e); }
          }
        } else {
          profile=null;
          releases=[]; users=[]; invites=[]; inbox=[]; bands=[]; myBandInvites=[];
          if(isListenerRoute()) renderListenerRoute(); else renderAuth();
          hidePortalLoading();
        }
      },0);
    });
    if(isListenerRoute()) return;
    if(session) await loadApp();
    else { renderAuth(); hidePortalLoading(); }
  }

  async function loadProfile(){
    const {data,error}=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
    if(error) throw error;
    if(!data){ const {data:p,error:e}=await sb.from('profiles').insert({id:session.user.id,email:session.user.email,display_name:session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'Artist'}).select().single(); if(e) throw e; profile=p; }
    else profile=data;
    profile.role=String(profile.role||'artist').trim().toLowerCase();
    if(typeof applyAppearancePreferences==='function')applyAppearancePreferences(getAppearancePreferences());
    if(window.IE_I18N){
      if(profile.preferred_language && window.IE_I18N.languages[profile.preferred_language]) window.IE_I18N.setLanguage(profile.preferred_language,{notify:false});
      else {
        const language=window.IE_I18N.language||'en';
        const {error:languageError}=await sb.from('profiles').update({preferred_language:language}).eq('id',session.user.id);
        if(!languageError) profile.preferred_language=language; else console.warn('Could not sync language preference to profile',languageError);
      }
    }
  }

  window.addEventListener('ie-language-change',async e=>{
    const language=e.detail&&e.detail.language;
    if(!session||!profile||!window.IE_I18N||!window.IE_I18N.languages[language])return;
    try{const {error}=await sb.from('profiles').update({preferred_language:language}).eq('id',session.user.id);if(error)throw error;profile.preferred_language=language;}
    catch(err){console.warn('Language saved on this device; profile sync failed',err);}
  });
  function loadApp(){
    if(!session){renderAuth();hidePortalLoading();return Promise.resolve();}
    const uid=session.user.id;
    if(appLoadPromise && appLoadUserId===uid) return appLoadPromise;
    const previous=appLoadPromise;
    appLoadUserId=uid;
    const task=(async()=>{
      if(previous) await previous.catch(()=>{});
      if(!session || session.user.id!==uid) return;
      await loadAppInternal(uid);
    })();
    appLoadPromise=task;
    return task.finally(()=>{if(appLoadPromise===task){appLoadPromise=null;appLoadUserId=null;}});
  }
  async function loadAppInternal(expectedUserId){
    if(!session || session.user.id!==expectedUserId){renderAuth();hidePortalLoading();return;}
    if(window.__workspaceDataUid!==expectedUserId){
      // Never let a failed/slow query leave the previous account's cached workspace visible.
      profile=null; releases=[]; tasks=[]; allTracks=[]; podcastSubmissions=[]; podcastLoaded=false; resetPodcastEditor(); users=[]; invites=[]; inbox=[]; bands=[]; bandMembers=[]; bandInvites=[]; myBandInvites=[]; announcements=[]; earnings=[]; relStats=[]; recentEvents=[]; selected=null;
      // Do not leak partial-load warnings from the previous account into the new session.
      workspaceDataWarnings={};
      view='dashboard'; window.__workspaceDataUid=expectedUserId;
      if(window.__rt){try{sb.removeChannel(window.__rt);}catch(_){}} window.__rt=null; window.__rtUid=null;
    }
    showPortalLoading('Loading your workspace…','Syncing your releases and notifications'); try { await loadProfile(); if(!session || session.user.id!==expectedUserId)return; await restoreDraftBackup(); const startupResults=await Promise.allSettled([loadReleases(), loadBands(), loadNotes(), loadMisc(), ...(isAdmin()?[loadUsers(), loadInvites()]:[])]); const startupFailures=startupResults.filter(x=>x.status==='rejected'); if(startupFailures.length)console.warn('Some workspace data did not load; preserving the requested route.',startupFailures.map(x=>x.reason));
    if(!session || session.user.id!==expectedUserId) return;
    if(!window.__poll) window.__poll=setInterval(async()=>{ if(!session||!profile||document.hidden) return; const u=inbox.filter(n=>!n.read).length, p=myBandInvites.length; await loadNotes(); try{const m=await sb.rpc('my_band_invites'); myBandInvites=m.data||[];}catch(_){} let rosterChanged=false;if(isAdmin()){const before=users.map(x=>`${x.id}:${x.avatar_path||''}:${x.display_name||''}:${x.updated_at||''}`).join('|');try{await loadUsers();rosterChanged=before!==users.map(x=>`${x.id}:${x.avatar_path||''}:${x.display_name||''}:${x.updated_at||''}`).join('|');}catch(_){}} if(view!=='builder'&&!typing()&&(rosterChanged||inbox.filter(n=>!n.read).length!==u||myBandInvites.length!==p)) render(); },60000);
    if(window.__rtUid!==session.user.id){ try{ if(window.__rt) sb.removeChannel(window.__rt); window.__rtUid=session.user.id; window.__rt=sb.channel('notes-'+session.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+session.user.id},async p=>{ await loadNotes(); try{const m=await sb.rpc('my_band_invites'); myBandInvites=m.data||[];}catch(_){} await loadMisc(); if(p.new&&p.new.release_id) await loadReleases(); if(p.new&&p.new.title&&notificationIsVisible(p.new)) toast(p.new.title+(p.new.body?': '+p.new.body:''),'success'); if(view!=='builder'&&!typing()) render(); }).subscribe(); }catch(e){ console.warn('Realtime unavailable',e); } }
    // Keep the label's roster avatar/name data in sync when an artist updates their profile elsewhere.
    if(isAdmin()&&window.__profilesRtUid!==session.user.id){
      try{
        if(window.__profilesRt)sb.removeChannel(window.__profilesRt);
        window.__profilesRtUid=session.user.id;
        window.__profilesRt=sb.channel('profiles-'+session.user.id).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},async()=>{
          if(!session||!isAdmin())return;
          try{await loadUsers();if(['dashboard','roster','insights'].includes(view))render();}catch(err){console.warn('Roster profile sync deferred until next refresh',err);}
        }).subscribe();
      }catch(err){console.warn('Profile realtime sync unavailable; periodic refresh remains enabled',err);}
    }
        // Re-resolve the current URL after workspace data loads, including refreshes and auth rechecks.
    // The rendered view writes its canonical route, so the address bar remains the source of truth.
    window.__routed=true;restoreRoute();
    if(view==='operations'&&isAdmin())await loadOperationsData();
    if(view==='vault')await loadVaultData();
    if(view==='podcasts')await loadPodcastSubmissions();
    if(view==='statements')await loadStatementData();
    if(window.__draftRestored)view='builder';
    if(!session || session.user.id!==expectedUserId) return; render(); } catch(e){ console.error(e); toast('Some workspace data could not be loaded. Check your connection and retry.','error'); if(session && session.user.id===expectedUserId){if(!profile)renderAuth();else render();} } finally { if(!session || session.user.id===expectedUserId) hidePortalLoading(); } }
