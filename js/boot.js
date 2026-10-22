/* Setup screen, boot(), loadProfile, loadApp */
  let appLoadPromise = null;
  let appLoadUserId = null;
  // Ignore async auth/profile work that belongs to an older identity transition.
  let authTransitionVersion = 0;
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
    return path==='/' || q.has('explore') || q.has('artist') || path==='/listen' || path==='/shop' || path==='/shop/manage' || path==='/listen/account' || /^\/listen\/artist\/[^/]+$/.test(path) || /^\/link\/[^/]+$/.test(path);
  }
  function renderListenerRoute(){
    const q=new URLSearchParams(location.search);
    const path=location.pathname.replace(/\/+$/,'')||'/';
    let slug=q.get('artist');
    const match=path.match(/^\/listen\/artist\/([^/]+)$/);
    const linkMatch=path.match(/^\/link\/([^/]+)$/);
    if(path==='/shop'||path==='/shop/manage'){renderShopRoute();return;}
    if(path==='/listen/account'){renderListenerAccount();return;}
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

  // Release account-scoped timers and realtime subscriptions when identity changes.
  // Otherwise a signed-out or switched account can leave old channels alive.
  function cleanupWorkspaceSubscriptions(){
    if(window.__poll){clearInterval(window.__poll);window.__poll=null;}
    for(const key of ['__rt','__profilesRt']){
      const channel=window[key];
      if(channel&&sb){try{sb.removeChannel(channel);}catch(error){console.warn('Could not remove workspace realtime channel',error);}}
      window[key]=null;
    }
    window.__rtUid=null;
    window.__profilesRtUid=null;
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
    let bootSessionResolved=false;
    let bootFailed=false;
    let pendingAuthEvent=false;
    let pendingAuthSession=null;
    const authSubscription=sb.auth.onAuthStateChange((event,nextSession)=>{
      // Defer work so Supabase's auth callback lock is released before data calls.
      setTimeout(async()=>{
        const transitionVersion = ++authTransitionVersion;
        if(bootFailed)return;
        if(!bootSessionResolved){pendingAuthEvent=true;pendingAuthSession=nextSession||null;return;}
        const currentUserId=session?.user?.id||null;
        const nextUserId=nextSession?.user?.id||null;
        if(!nextSession||currentUserId!==nextUserId){
          // Persist any dirty draft under the outgoing identity before replacing the session.
          if(currentUserId&&draftDirty)flushDraftBackup();
          draft=freshDraft();draftDirty=false;wizardStep=1;window.__draftRestored=false;
          cleanupWorkspaceSubscriptions();
          profile=null;
          clearCurrentAccountRole();
          // Do not leave a signed-out browser showing the last account's private visual choices.
          if(!nextSession && currentUserId){
            try {
              ['ie-workspace-personalisation-v2','ie-workspace-personalisation-v1','ie-workspace-personalisation-touched-v1','ie-personalisation-account-v1'].forEach(key=>localStorage.removeItem(key));
            } catch(storageError) {
              console.warn('Could not clear account-specific appearance state on sign-out.', storageError);
            }
            window.dispatchEvent(new CustomEvent('ie-personalise-account-change', { detail: { userId: null } }));
          }
        }
        const previousUserId=currentUserId;
        session=nextSession||null;
        if(!session){
          profile=null;
          clearCurrentAccountRole();
          releases=[]; users=[]; invites=[]; inbox=[]; bands=[]; myBandInvites=[];
          window.__workspaceDataUid=null;
          workspaceDataWarnings={};
          if(isListenerRoute())renderListenerRoute();else renderAuth();
          hidePortalLoading();
          return;
        }
        let trustedRole=null;
        try{trustedRole=await resolveCurrentAccountRole(session.user.id);}
        catch(roleError){console.warn('Could not resolve the signed-in profile role yet; workspace loading will verify it again.',roleError);}
        // A later sign-in/sign-out may have happened while role lookup was pending.
        if(transitionVersion!==authTransitionVersion || session?.user?.id!==nextUserId)return;
        if(trustedRole==='listener'){
          if(!isListenerRoute())history.replaceState(null,'','/listen/account');
          renderListenerRoute();hidePortalLoading();return;
        }
        if(isListenerRoute()){renderListenerRoute();hidePortalLoading();return;}
        if(previousUserId!==session.user.id||!profile){
          try{await loadApp();}
          catch(e){console.error('Workspace refresh failed',e);}
        }
      },0);
    });
    // Retry a single transient Supabase Auth failure before failing the whole app boot.
    // Auth can return a temporary 5xx/context-cancelled response while rotating refresh tokens.
    const sessionRequest=(async()=>{
      let lastError;
      for(let attempt=0;attempt<2;attempt++){
        try{
          const result=await sb.auth.getSession();
          if(!result.error)return result;
          lastError=result.error;
        }catch(error){lastError=error;}
        const message=String(lastError?.message||lastError||'');
        const transient=Number(lastError?.status)>=500||/context canceled|network|fetch failed|temporarily unavailable|timeout/i.test(message);
        if(!transient||attempt===1)throw lastError;
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      throw lastError;
    })();
    let startupTimeoutId;
    const timeoutRequest=new Promise((_,reject)=>{startupTimeoutId=setTimeout(()=>{
      const error=new Error('Supabase session check timed out. Check your connection and retry.');
      error.code='PORTAL_STARTUP_TIMEOUT';
      reject(error);
    },15000);});
    let sessionResult;
    try { sessionResult=await Promise.race([sessionRequest,timeoutRequest]); }
    catch(error){bootFailed=true;bootSessionResolved=true;authSubscription?.data?.subscription?.unsubscribe();throw error;}
    finally { clearTimeout(startupTimeoutId); }
    const {data,error}=sessionResult;
    if(error){bootFailed=true;bootSessionResolved=true;authSubscription?.data?.subscription?.unsubscribe();throw error;}
    session=pendingAuthEvent?pendingAuthSession:(data?.session||null);
    bootSessionResolved=true;
    if(!session)clearCurrentAccountRole();
    else{
      try{await resolveCurrentAccountRole(session.user.id);}
      catch(roleError){console.warn('Could not resolve the signed-in profile role at startup; verifying during profile load.',roleError);}
    }
    if(isListenerRoute()){renderListenerRoute();hidePortalLoading();return;}
    if(isCurrentUserListener()){
      history.replaceState(null,'','/listen/account');
      renderListenerRoute();hidePortalLoading();return;
    }
    if(session)await loadApp();
    else{renderAuth();hidePortalLoading();}
  }

  async function loadProfile(){
    const activeSession=session;
    const userId=activeSession?.user?.id;
    if(!userId)throw new Error('Sign in again to load your profile.');
    const isCurrentAccount=()=>!!session&&session.user.id===userId;
    const {data,error}=await sb.from('profiles').select('*').eq('id',userId).maybeSingle();
    if(!isCurrentAccount())return;
    if(error) throw error;
    let loadedProfile=data;
    if(!loadedProfile){
      const {data:created,error:createError}=await sb.from('profiles').insert({
        id:userId,
        email:activeSession.user.email,
        display_name:activeSession.user.user_metadata?.full_name||activeSession.user.email?.split('@')[0]||'Artist'
      }).select().single();
      if(!isCurrentAccount())return;
      if(createError)throw createError;
      loadedProfile=created;
    }
    if(!isCurrentAccount()||!loadedProfile)return;
    loadedProfile.role=String(loadedProfile.role||'artist').trim().toLowerCase();
    profile=loadedProfile;
    cacheCurrentAccountRole(userId,loadedProfile.role);
    // Device customisation storage is shared by browser profiles, not by accounts.
    // Clear it when the authenticated identity changes so a previous user's local
    // overrides cannot take precedence over this account's saved appearance.
    try {
      const accountKey = 'ie-personalisation-account-v1';
      const previousAccountId = localStorage.getItem(accountKey);
      if (previousAccountId && previousAccountId !== userId) {
        ['ie-workspace-personalisation-v2','ie-workspace-personalisation-v1','ie-workspace-personalisation-touched-v1'].forEach(key => localStorage.removeItem(key));
        window.dispatchEvent(new CustomEvent('ie-personalise-account-change', { detail: { userId } }));
      }
      localStorage.setItem(accountKey, userId);
    } catch (storageError) {
      console.warn('Could not scope local appearance preferences to the signed-in account.', storageError);
    }
    if(!isCurrentAccount())return;
    if(typeof applyAppearancePreferences==='function')applyAppearancePreferences(getAppearancePreferences());
    if(window.IE_I18N){
      if(loadedProfile.preferred_language && window.IE_I18N.languages[loadedProfile.preferred_language]) {
        window.IE_I18N.setLanguage(loadedProfile.preferred_language,{notify:false});
      } else {
        const language=window.IE_I18N.language||'en';
        const {error:languageError}=await sb.from('profiles').update({preferred_language:language}).eq('id',userId);
        if(!isCurrentAccount()||!profile||profile.id!==userId)return;
        if(!languageError)profile.preferred_language=language;
        else console.warn('Could not sync language preference to profile',languageError);
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
  function renderSignedInWorkspaceRecovery(expectedUserId){
    const app=document.getElementById('app');
    if(!app)return;
    app.innerHTML=`<main id="main-content" class="auth-shell" tabindex="-1"><section class="auth-panel"><div class="auth-card"><p class="eyebrow blue">SIGNED IN</p><h1>Your session is safe.</h1><p class="sub">We signed you in, but couldn't finish loading your workspace. Your account hasn't been signed out. Check your connection and retry.</p><p id="workspace-recovery-status" role="status" aria-live="polite"></p><button id="workspace-retry" class="primary full" type="button">Retry workspace</button><button id="workspace-signout" class="secondary full" type="button">Sign out</button></div></section></main>`;
    const retry=document.getElementById('workspace-retry');
    const status=document.getElementById('workspace-recovery-status');
    if(retry)retry.onclick=async()=>{
      if(!session||session.user.id!==expectedUserId){renderAuth();hidePortalLoading();return;}
      retry.disabled=true;retry.textContent='Retrying…';
      if(status)status.textContent='Reconnecting to your workspace…';
      try{await loadApp();}
      catch(_){if(status&&status.isConnected)status.textContent='The workspace is still unavailable. Please retry in a moment.';}
      finally{if(retry.isConnected){retry.disabled=false;retry.textContent='Retry workspace';}}
    };
    const signout=document.getElementById('workspace-signout');
    if(signout)signout.onclick=async()=>{
      signout.disabled=true;signout.textContent='Signing out…';
      try{
        const {error}=await sb.auth.signOut();
        if(error)throw error;
        session=null;profile=null;clearCurrentAccountRole();
        renderAuth();hidePortalLoading();
      }catch(_){
        if(signout.isConnected){signout.disabled=false;signout.textContent='Sign out';}
        if(status)status.textContent='Sign-out failed. Check your connection and try again.';
      }
    };
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
    showPortalLoading('Loading your workspace…','Syncing your releases and notifications'); try { await loadProfile(); if(!session || session.user.id!==expectedUserId)return; if(profile?.role==='listener'){history.replaceState(null,'','/listen/account');renderListenerRoute();hidePortalLoading();return;} await restoreDraftBackup(); const startupResults=await Promise.allSettled([loadReleases(), loadBands(), loadNotes(), loadMisc(), ...(isAdmin()?[loadUsers(), loadInvites()]:[])]); const startupFailures=startupResults.filter(x=>x.status==='rejected'); if(startupFailures.length)console.warn('Some workspace data did not load; preserving the requested route.',startupFailures.map(x=>x.reason));
    if(!session || session.user.id!==expectedUserId) return;
    if(!window.__poll) window.__poll=setInterval(async()=>{ if(!session||!profile||document.hidden) return; const u=inbox.filter(n=>!n.read).length, p=myBandInvites.length; await loadNotes(); try{const m=await sb.rpc('my_band_invites'); myBandInvites=m.data||[];}catch(_){} let rosterChanged=false;if(isAdmin()){const rosterSignature=x=>`${x.id}:${x.avatar_path||''}:${x.avatar_url||''}:${x.banner_path||''}:${x.display_name||''}:${x.accent||''}:${x.tagline||''}:${x.updated_at||''}`;const before=users.map(rosterSignature).join('|');try{await loadUsers();rosterChanged=before!==users.map(rosterSignature).join('|');}catch(_){}} if(view!=='builder'&&!typing()&&(rosterChanged||inbox.filter(n=>!n.read).length!==u||myBandInvites.length!==p)) render(); },60000);
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
    if(window.__draftRestored&&(['','/','/index.html','/dashboard'].includes(location.pathname.replace(/\/+$/,''))))view='builder';
    if(!session || session.user.id!==expectedUserId) return; render(); } catch(e){ if(session && session.user.id===expectedUserId){console.error('Workspace load failed for active session',e);toast('You are signed in, but your workspace could not finish loading. Retry below.','error');if(!profile)renderSignedInWorkspaceRecovery(expectedUserId);else render();} } finally { if(!session || session.user.id===expectedUserId) hidePortalLoading(); } }
