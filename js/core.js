/* Config, constants, state variables, small helpers (esc, $, icon, toast) */

  const C = window.NullCore ? window.NullCore.readConfig(window.IMPOSED_CONFIG || {}) : (window.IMPOSED_CONFIG || {});
  const ready = Boolean(window.supabase && C.SUPABASE_URL && !C.SUPABASE_URL.includes('PASTE_') && C.SUPABASE_ANON_KEY && !C.SUPABASE_ANON_KEY.includes('PASTE_'));
  const sb = ready ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  const IE_APPEARANCE_DEFAULTS = {theme:'blood', workspaceTheme:'midnight-studio', accent:'#b3122a', mode:'dark', surfaceTint:'graphite', shadowIntensity:2, fontScale:100, contrast:'standard', motion:'system', lineHeight:100, borderWidth:1, saturation:100, density:'comfortable', style:'classic', font:'poster', cards:'slab', grain:35, radius:2, banner:'', bannerColor:'', bannerEnabled:false, dashboard:{metrics:true,tasks:true,insights:true,announcements:true,upcoming:true,activity:true,catalogue:true}, dashboardLayout:{order:['metrics','actions','upcoming','shortcuts','details'],sizes:{metrics:'full',actions:'full',upcoming:'half',shortcuts:'half',details:'full'},shapes:{metrics:'soft',actions:'soft',upcoming:'soft',shortcuts:'soft',details:'soft'}},quickCustomiser:{contentWidth:'standard',surface:'default',navStyle:'solid',buttonStyle:'soft',cardStyle:'elevated',artworkShape:'rounded',radius:'rounded',motion:'standard',glow:false,contrast:false,shadows:true,decorative:true}};
  const IE_APPEARANCE_THEMES = {
    violet:{accent:'#7868f4',hover:'#6655e7',ink:'#ffffff',soft:'rgba(120,104,244,.14)'},
    ocean:{accent:'#168bd2',hover:'#0875b7',ink:'#ffffff',soft:'rgba(22,139,210,.14)'},
    emerald:{accent:'#159b72',hover:'#0d805c',ink:'#ffffff',soft:'rgba(21,155,114,.14)'},
    rose:{accent:'#dc4779',hover:'#c52f64',ink:'#ffffff',soft:'rgba(220,71,121,.14)'},
    amber:{accent:'#b77b12',hover:'#96620b',ink:'#ffffff',soft:'rgba(183,123,18,.15)'},
    midnight:{accent:'#9c83ff',hover:'#8063f2',ink:'#17132a',soft:'rgba(156,131,255,.17)'},
    slate:{accent:'#536579',hover:'#3e5063',ink:'#ffffff',soft:'rgba(83,101,121,.14)'},
    blood:{accent:'#b3122a',hover:'#d41a36',ink:'#ffffff',soft:'rgba(179,18,42,.2)'},
    bone:{accent:'#d9cdb4',hover:'#efe5cf',ink:'#1a1610',soft:'rgba(217,205,180,.16)'},
    venom:{accent:'#8fa64a',hover:'#a9c25c',ink:'#10140a',soft:'rgba(143,166,74,.18)'}
  };
  const IE_DASHBOARD_WIDGETS=['metrics','actions','upcoming','shortcuts','details'];
  function normaliseDashboardLayout(value){
    const v=value&&typeof value==='object'?value:{};
    const order=Array.isArray(v.order)?v.order.filter((k,i,a)=>IE_DASHBOARD_WIDGETS.includes(k)&&a.indexOf(k)===i):[];
    IE_DASHBOARD_WIDGETS.forEach(k=>{if(!order.includes(k))order.push(k);});
    const sizes={},shapes={},heights={},starts={};
    IE_DASHBOARD_WIDGETS.forEach(k=>{sizes[k]=Number.isFinite(Number(v.sizes?.[k]))&&Number(v.sizes[k])>=3&&Number(v.sizes[k])<=12?Math.round(Number(v.sizes[k])):({'third':4,'half':6,'full':12}[v.sizes?.[k]]||({'third':4,'half':6,'full':12}[IE_APPEARANCE_DEFAULTS.dashboardLayout.sizes[k]]||12));shapes[k]=['soft','square','pill'].includes(v.shapes?.[k])?v.shapes[k]:IE_APPEARANCE_DEFAULTS.dashboardLayout.shapes[k];const h=Number(v.heights?.[k]);heights[k]=Number.isFinite(h)&&h>0?Math.min(900,Math.max(180,Math.round(h))):0;const st=Number(v.starts?.[k]);starts[k]=Number.isFinite(st)&&st>=1&&st<=12?Math.round(st):0;});
    return {order,sizes,shapes,heights,starts};
  }
function normaliseQuickCustomiser(value){
    const q=value&&typeof value==='object'?value:{};
    return {
      contentWidth:['standard','wide','full'].includes(q.contentWidth)?q.contentWidth:'standard',
      surface:['default','flat','glass'].includes(q.surface)?q.surface:'default',
      navStyle:['solid','floating','minimal'].includes(q.navStyle)?q.navStyle:'solid',
      buttonStyle:['soft','solid','outline','pill'].includes(q.buttonStyle)?q.buttonStyle:'soft',
      cardStyle:['elevated','outlined','minimal'].includes(q.cardStyle)?q.cardStyle:'elevated',
      artworkShape:['rounded','square','circle'].includes(q.artworkShape)?q.artworkShape:'rounded',
      radius:['sharp','rounded'].includes(q.radius)?q.radius:'rounded',
      motion:['system','standard','reduced','none'].includes(q.motion)?q.motion:'standard',
      glow:q.glow===true,contrast:q.contrast===true,shadows:q.shadows!==false,decorative:q.decorative!==false
    };
  }
  function getAppearancePreferences(){
    const saved=(profile&&profile.notification_preferences&&profile.notification_preferences.appearance)||{};
    const out={...IE_APPEARANCE_DEFAULTS,...saved};
    out.quickCustomiser=normaliseQuickCustomiser({...IE_APPEARANCE_DEFAULTS.quickCustomiser,...(saved.quickCustomiser||{})});
    /* A local selection is meaningful even when account preferences have already
       been populated with defaults by a different page or device. Remember explicit
       customiser edits; infer non-default legacy choices for pre-marker browsers. */
    let device={},deviceTouched=[];
    try{
      device=JSON.parse(localStorage.getItem('ie-workspace-personalisation-v2')||localStorage.getItem('ie-workspace-personalisation-v1')||'{}')||{};
      const touched=JSON.parse(localStorage.getItem('ie-workspace-personalisation-touched-v1')||'[]');
      if(Array.isArray(touched))deviceTouched=touched.filter(k=>typeof k==='string');
    }catch(_){}
    const locallyChosen=(key,changedFromDefault)=>deviceTouched.includes(key)||changedFromDefault;
    if(['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room'].includes(device.palette)&&locallyChosen('palette',device.palette!=='midnight-studio'))out.workspaceTheme=device.palette;
    if(['dark','light','system','amoled'].includes(device.theme)&&locallyChosen('theme',device.theme!=='dark'))out.mode=device.theme;
    if(/^#[0-9a-f]{6}$/i.test(String(device.accent||''))&&locallyChosen('accent',device.accent!=='#d8bd73'))out.accent=device.accent;
    if(Number.isFinite(Number(device.fontScale))&&locallyChosen('fontScale',Number(device.fontScale)!==1))out.fontScale=Math.round(Number(device.fontScale)*100);
    if(['compact','standard','comfortable'].includes(device.density)&&locallyChosen('density',device.density!=='standard'))out.density=({compact:'compact',standard:'comfortable',comfortable:'spacious'})[device.density];
    const quick=out.quickCustomiser;
    if(['standard','wide','full'].includes(device.contentWidth)&&locallyChosen('contentWidth',device.contentWidth!=='standard'))quick.contentWidth=device.contentWidth;
    if(['default','flat','glass'].includes(device.surface)&&locallyChosen('surface',device.surface!=='default'))quick.surface=device.surface;
    if(['solid','floating','minimal'].includes(device.navStyle)&&locallyChosen('navStyle',device.navStyle!=='solid'))quick.navStyle=device.navStyle;
    if(['soft','solid','outline','pill'].includes(device.buttonStyle)&&locallyChosen('buttonStyle',device.buttonStyle!=='soft'))quick.buttonStyle=device.buttonStyle;
    if(['elevated','outlined','minimal'].includes(device.cardStyle)&&locallyChosen('cardStyle',device.cardStyle!=='elevated'))quick.cardStyle=device.cardStyle;
    if(['rounded','square','circle'].includes(device.artworkShape)&&locallyChosen('artworkShape',device.artworkShape!=='rounded'))quick.artworkShape=device.artworkShape;
    if(['sharp','rounded'].includes(device.radius)&&locallyChosen('radius',device.radius!=='rounded'))quick.radius=device.radius;
    if(['system','standard','reduced','none'].includes(device.motion)&&locallyChosen('motion',device.motion!=='standard'))quick.motion=device.motion;
    ['glow','contrast','shadows','decorative'].forEach(k=>{if(typeof device[k]==='boolean'&&locallyChosen(k,device[k]!==({glow:false,contrast:false,shadows:true,decorative:true})[k]))quick[k]=device[k];});
    if(!IE_APPEARANCE_THEMES[out.theme])out.theme='slate';
    if(!['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room'].includes(out.workspaceTheme))out.workspaceTheme='midnight-studio';
    if(!/^#[0-9a-f]{6}$/i.test(String(out.accent)))out.accent=IE_APPEARANCE_THEMES[out.theme].accent;
    if(!['compact','comfortable','spacious'].includes(out.density))out.density='comfortable';
    if(!['dark','light','system','amoled'].includes(out.mode))out.mode='dark';
    if(!['graphite','warm','cool'].includes(out.surfaceTint))out.surfaceTint='graphite';
    out.shadowIntensity=Math.min(3,Math.max(0,Math.round(Number(out.shadowIntensity)||0)));
    out.fontScale=Math.min(125,Math.max(85,Math.round(Number(out.fontScale)||100)));
    if(!['soft','standard','high'].includes(out.contrast))out.contrast='standard';
    if(!['system','reduced','full'].includes(out.motion))out.motion='system';
    out.lineHeight=Math.min(130,Math.max(83,Math.round(Number(out.lineHeight)||100)));
    out.borderWidth=Math.min(3,Math.max(0,Math.round(Number(out.borderWidth)||0)));
    out.saturation=Math.min(150,Math.max(50,Math.round(Number(out.saturation)||100)));
    if(!['vivid','classic','minimal'].includes(out.style))out.style='classic';
    if(!['poster','blackletter','typewriter','occult','clean'].includes(out.font))out.font='poster';
    if(!['slab','glass','scar','ash'].includes(out.cards))out.cards='slab';
    out.grain=Math.min(100,Math.max(0,Math.round(Number(out.grain)||0)));
    out.radius=Math.min(24,Math.max(0,Math.round(Number(out.radius)||0)));
    out.banner=/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(String(out.banner||''))&&String(out.banner).length<240000?out.banner:'';
    out.bannerColor=/^#[0-9a-f]{6}$/i.test(String(out.bannerColor||''))?out.bannerColor:'';
    out.bannerEnabled=out.bannerEnabled===true;
    const dashboard=out.dashboard&&typeof out.dashboard==='object'?out.dashboard:{};
    out.dashboard=Object.fromEntries(['metrics','tasks','insights','announcements','upcoming','activity','catalogue'].map(k=>[k,dashboard[k]!==false]));
    out.dashboardLayout=normaliseDashboardLayout(out.dashboardLayout);
    out.quickCustomiser=normaliseQuickCustomiser(out.quickCustomiser);
    return out;
  }
  function applyAppearancePreferences(value){
    const a={...IE_APPEARANCE_DEFAULTS,...(value||getAppearancePreferences())};
    a.quickCustomiser=normaliseQuickCustomiser(a.quickCustomiser);
    const theme=IE_APPEARANCE_THEMES[a.theme]||IE_APPEARANCE_THEMES.slate;
    const accent=/^#[0-9a-f]{6}$/i.test(String(a.accent||''))?a.accent:theme.accent;
    const root=document.documentElement;
    root.dataset.ieTheme=a.theme||'slate';root.dataset.ieWorkspaceTheme=['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room'].includes(a.workspaceTheme)?a.workspaceTheme:'midnight-studio';root.dataset.ieMode=['dark','light','system','amoled'].includes(a.mode)?a.mode:'dark';root.dataset.ieSurface=['graphite','warm','cool'].includes(a.surfaceTint)?a.surfaceTint:'graphite';root.dataset.ieShadow=String(Math.min(3,Math.max(0,Number(a.shadowIntensity)||0)));root.dataset.ieFont=a.font||'poster';root.dataset.ieCards=a.cards||'slab';root.style.setProperty('--ie-font-scale',String(Math.min(125,Math.max(85,Number(a.fontScale)||100))/100));root.dataset.ieContrast=['soft','standard','high'].includes(a.contrast)?a.contrast:'standard';root.dataset.ieMotion=['system','reduced','full'].includes(a.motion)?a.motion:'system';root.dataset.ieBorderWidth=String(Math.min(3,Math.max(0,Number(a.borderWidth)||0)));root.style.setProperty('--ie-line-height',String(Math.min(130,Math.max(83,Number(a.lineHeight)||100))/100));root.style.setProperty('--ie-saturation',String(Math.min(150,Math.max(50,Number(a.saturation)||100))+'%'));root.style.setProperty('--ie-grain',String(Math.min(100,Math.max(0,Number(a.grain)||0))/100));root.style.setProperty('--ie-radius',(Math.min(24,Math.max(0,Number(a.radius)||0)))+'px');root.style.setProperty('--ie-banner',/^data:image\/jpeg;base64,/.test(String(a.banner||''))?'url('+a.banner+')':'none');root.style.setProperty('--ie-banner-color',/^#[0-9a-f]{6}$/i.test(String(a.bannerColor||''))?a.bannerColor:'transparent');root.dataset.ieBannerEnabled=a.bannerEnabled===true?'true':'false';root.dataset.ieDensity=a.density||'comfortable';root.dataset.ieStyle=a.style||'classic';
    const dashboard=a.dashboard&&typeof a.dashboard==='object'?a.dashboard:IE_APPEARANCE_DEFAULTS.dashboard;
    ['metrics','tasks','announcements','upcoming','activity','catalogue'].forEach(k=>{root.dataset['ieDashboard'+k[0].toUpperCase()+k.slice(1)]=dashboard[k]===false?'false':'true';});
    const dashboardLayout=normaliseDashboardLayout(a.dashboardLayout);
    document.querySelectorAll('[data-dashboard-widget-card]').forEach(el=>{const k=el.dataset.dashboardWidgetCard;el.dataset.widgetSize=String(dashboardLayout.sizes[k]||12);el.style.setProperty('grid-column',dashboardLayout.starts[k]?(dashboardLayout.starts[k]+' / span '+(dashboardLayout.sizes[k]||12)):('span '+(dashboardLayout.sizes[k]||12)),'important');el.dataset.widgetStart=String(dashboardLayout.starts[k]||1);el.style.setProperty('--dashboard-span',String(dashboardLayout.sizes[k]||12));el.dataset.widgetShape=dashboardLayout.shapes[k]||'soft';if(dashboardLayout.heights[k])el.style.setProperty('--dashboard-custom-height',dashboardLayout.heights[k]+'px');else el.style.removeProperty('--dashboard-custom-height');});
    document.querySelectorAll('[data-dashboard-widget]').forEach(i=>{i.checked=dashboard[i.dataset.dashboardWidget]!==false;});
    root.style.setProperty('--user-accent',accent);root.style.setProperty('--accent-user',accent);root.style.setProperty('--accent-user-hover',accent.toLowerCase()===String(theme.accent).toLowerCase()?theme.hover:accent);root.style.setProperty('--accent-user-ink',theme.ink);root.style.setProperty('--accent-user-soft',theme.soft);
    root.style.setProperty('--accent',accent);root.style.setProperty('--accent-hover',theme.hover);root.style.setProperty('--accent-ink',theme.ink);root.style.setProperty('--teal',accent);
    document.querySelectorAll('[data-theme-preset]').forEach(b=>{const selected=b.dataset.themePreset===a.theme;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('selected',selected);});
    document.querySelectorAll('[data-appearance-accent]').forEach(i=>{if(i.value!==accent)i.value=accent;});
    document.querySelectorAll('[data-appearance-density]').forEach(i=>{if(i.value!==a.density)i.value=a.density;});
    document.querySelectorAll('[data-appearance-style]').forEach(i=>{if(i.value!==a.style)i.value=a.style;});
    window.dispatchEvent(new CustomEvent('ie-appearance-change',{detail:{accent,density:a.density,font:a.font,theme:a.theme,workspaceTheme:root.dataset.ieWorkspaceTheme,style:a.style,cards:a.cards,grain:a.grain,radius:a.radius,mode:root.dataset.ieMode,surfaceTint:root.dataset.ieSurface,shadowIntensity:root.dataset.ieShadow,fontScale:a.fontScale,contrast:root.dataset.ieContrast,motion:root.dataset.ieMotion,lineHeight:a.lineHeight,borderWidth:root.dataset.ieBorderWidth,saturation:a.saturation,quickCustomiser:a.quickCustomiser}}));
  }
  // Persist quick-customiser edits to the signed-in account as well as local storage.
  // Keep this bridge separate from ie-appearance-change to avoid an account-sync feedback loop.
  let personaliseSyncTimer = null;
  let pendingPersonaliseSnapshot = null;
  const PERSONALISE_SYNC_MAX_RETRIES = 3;

  function publishPersonaliseSyncStatus(detail) {
    window.dispatchEvent(new CustomEvent('ie-personalise-sync-status', { detail }));
  }

  function schedulePersonaliseSync(snapshot, delay) {
    clearTimeout(personaliseSyncTimer);
    pendingPersonaliseSnapshot = snapshot;
    personaliseSyncTimer = setTimeout(() => {
      const next = pendingPersonaliseSnapshot;
      pendingPersonaliseSnapshot = null;
      if (next) syncPersonaliseSnapshot(next);
    }, delay);
  }

  async function syncPersonaliseSnapshot(snapshot) {
    if (!snapshot || !session?.user?.id || session.user.id !== snapshot.userId) return;
    if (!profile || profile.id !== snapshot.userId) {
      if ((snapshot.attempt || 0) < PERSONALISE_SYNC_MAX_RETRIES) {
        publishPersonaliseSyncStatus({ synced: false, retrying: true, reason: 'profile-not-ready', attempt: snapshot.attempt || 0 });
        schedulePersonaliseSync({ ...snapshot, attempt: (snapshot.attempt || 0) + 1 }, 500 * Math.pow(2, snapshot.attempt || 0));
      } else {
        publishPersonaliseSyncStatus({ synced: false, retrying: false, reason: 'profile-not-ready' });
      }
      return;
    }

    const previous = profile.notification_preferences && typeof profile.notification_preferences === 'object'
      ? profile.notification_preferences : {};
    const appearance = { ...(previous.appearance && typeof previous.appearance === 'object' ? previous.appearance : {}) };
    const validAccent = /^#[0-9a-f]{6}$/i.test(String(snapshot.accent || ''));
    if (validAccent) appearance.accent = snapshot.accent;
    if (['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room'].includes(snapshot.workspaceTheme)) appearance.workspaceTheme = snapshot.workspaceTheme;
    if (['dark','light','system','amoled'].includes(snapshot.mode || snapshot.theme)) appearance.mode = snapshot.mode || snapshot.theme;
    if (['compact','standard','comfortable'].includes(snapshot.density)) appearance.density = ({ compact:'compact', standard:'comfortable', comfortable:'spacious' })[snapshot.density];
    const fontMap = { modern:'clean', display:'poster', serif:'occult', mono:'typewriter' };
    if (fontMap[snapshot.font]) appearance.font = fontMap[snapshot.font];
    if (Number.isFinite(Number(snapshot.fontScale))) appearance.fontScale = Math.min(125, Math.max(85, Math.round(Number(snapshot.fontScale) * 100)));
    if (Number.isFinite(Number(snapshot.lineHeight))) appearance.lineHeight = Math.min(127, Math.max(83, Math.round((Number(snapshot.lineHeight) / 1.5) * 100)));
    const quickKeys = ['contentWidth','surface','navStyle','buttonStyle','cardStyle','artworkShape','radius','motion','glow','contrast','shadows','decorative'];
    const quick = { ...(appearance.quickCustomiser && typeof appearance.quickCustomiser === 'object' ? appearance.quickCustomiser : {}) };
    quickKeys.forEach(key => { if (Object.prototype.hasOwnProperty.call(snapshot, key)) quick[key] = snapshot[key]; });
    appearance.quickCustomiser = normaliseQuickCustomiser(quick);
    const nextPreferences = { ...previous, appearance };

    try {
      const { error } = await sb.from('profiles').update({ notification_preferences: nextPreferences }).eq('id', snapshot.userId);
      if (error) throw error;
      if (session?.user?.id !== snapshot.userId || !profile || profile.id !== snapshot.userId) return;
      profile.notification_preferences = nextPreferences;
      publishPersonaliseSyncStatus({ synced: true, attempt: snapshot.attempt || 0 });
    } catch (error) {
      console.warn('Could not sync interface preferences to the account.', error);
      const attempt = snapshot.attempt || 0;
      if (attempt < PERSONALISE_SYNC_MAX_RETRIES && session?.user?.id === snapshot.userId) {
        publishPersonaliseSyncStatus({ synced: false, retrying: true, reason: 'sync-failed', attempt: attempt + 1 });
        schedulePersonaliseSync({ ...snapshot, attempt: attempt + 1 }, 750 * Math.pow(2, attempt));
      } else {
        publishPersonaliseSyncStatus({ synced: false, retrying: false, reason: 'sync-failed', attempt });
      }
    }
  }

  window.addEventListener('ie-personalise-change', event => {
    const detail = event?.detail;
    if (!detail) return;
    if (!session?.user?.id || !sb) {
      clearTimeout(personaliseSyncTimer);
      pendingPersonaliseSnapshot = null;
      publishPersonaliseSyncStatus({ synced: false, retrying: false, reason: 'local-only' });
      return;
    }
    schedulePersonaliseSync({ ...detail, userId: session.user.id, attempt: 0 }, 350);
  });

  window.addEventListener('online', () => {
    const pending = pendingPersonaliseSnapshot;
    if (pending && session?.user?.id === pending.userId) schedulePersonaliseSync(pending, 100);
  });
  const STORES = ['Spotify','Apple Music','iTunes','YouTube Music','Amazon Music','Deezer','TIDAL','Pandora','Napster','iHeartRadio','Claro Musica','JioSaavn','Anghami','KKBox','NetEase','Tencent','TikTok','Facebook','Instagram','Snapchat','CapCut','Pinterest','Nuuday','ROXi','Kuack Media','Qobuz','Joox','Boomplay','Trebel','Melon','Flo','Bugs','Genie','Vibe'];
  const GENRES = ['Electronic','Rock','Metal','Metalcore','Hip Hop','Pop','Alternative','Ambient','Other'];
  const TYPES = ['Single','EP','Album','Mixtape'];
  const STATUSES = ['Draft','Submitted','Changes Requested','Approved','Sent to distributor','Live','Rejected'];

  const isAdminRole = r => ['admin','label_admin'].includes(String(r||'').trim().toLowerCase());
  const isAdmin = () => !!profile && isAdminRole(profile.role);
  const GICON = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const greet = () => { const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; };
  const firstName = () => String((profile&&(profile.display_name||profile.full_name))||'').split(' ')[0];
  let session = null;
  let profile = null;

  // Auth user_metadata is user-editable and must not decide application roles.
  let currentAccountRoleUserId = null;
  let currentAccountRole = null;
  let currentAccountRolePromise = null;
  function clearCurrentAccountRole() {
    currentAccountRoleUserId = null;
    currentAccountRole = null;
    currentAccountRolePromise = null;
  }
  function cacheCurrentAccountRole(userId, role) {
    if (!userId || (session?.user?.id && session.user.id !== userId)) return;
    currentAccountRoleUserId = userId;
    currentAccountRole = String(role || '').trim().toLowerCase() || null;
    if (currentAccountRolePromise?.userId === userId) currentAccountRolePromise = null;
  }
  async function resolveCurrentAccountRole(userId = session?.user?.id) {
    if (!ready || !sb || !userId) return null;
    if (currentAccountRoleUserId === userId && currentAccountRole) return currentAccountRole;
    if (currentAccountRolePromise?.userId === userId) return currentAccountRolePromise.promise;
    const promise = (async () => {
      const { data, error } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (error) throw error;
      const role = String(data?.role || '').trim().toLowerCase() || null;
      if (role) cacheCurrentAccountRole(userId, role);
      return role;
    })();
    currentAccountRolePromise = { userId, promise };
    try { return await promise; }
    finally { if (currentAccountRolePromise?.promise === promise) currentAccountRolePromise = null; }
  }
  function isCurrentUserListener() {
    const userId = session?.user?.id;
    if (!userId) return false;
    if (profile?.id === userId && profile.role) return String(profile.role).trim().toLowerCase() === 'listener';
    return currentAccountRoleUserId === userId && currentAccountRole === 'listener';
  }
  let releases = [];
  let users = [];
  let invites = [];
  let filter = 'All';
  let inbox = [], announcements = [], earnings = [], recentEvents = [];
  let inviteRole = 'artist';
  let detailTracks = [];
  let bands = [], bandMembers = [], bandInvites = [], myBandInvites = [], bandId = null;
  let invite = null;
  let view = 'dashboard';
  let selected = null;
  let mobile = false;
  let authMode = 'login';
  let wizardStep = 1;
  let draft = freshDraft();
  let busy = false;
  let search = '';
  let pipelineSearch = '';
  let pipelineFilter = 'All';
  let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let notificationPreferences = { release_updates: true, band_invites: true, announcements: true, unread_badge: true };
  let v30Audit = [], v30Deliveries = [], v30Statements = [], v30AuditError = '', v30DeliveryError = '', v30StatementError = ''; 
  let toastTimer;
  let draftDirty = false;
  const draftBackupKey = () => session?.user?.id ? `ie-v29-draft:${session.user.id}` : null;
  let draftBackupTimer=null;
  function writeDraftBackup(){if(!session?.user?.id||!draftDirty)return;try{const d={...draft,artworkFile:null,artworkPreview:'',tracks:(draft.tracks||[]).map(t=>({...t,file:null,fileName:t.fileName||'',duration:null}))};localStorage.setItem(draftBackupKey(),JSON.stringify({savedAt:new Date().toISOString(),draft:d,wizardStep}));}catch(e){console.warn('Local draft backup unavailable',e);}}
  function persistDraftBackup(){if(!session?.user?.id||!draftDirty)return;if(draftBackupTimer)clearTimeout(draftBackupTimer);draftBackupTimer=setTimeout(()=>{draftBackupTimer=null;writeDraftBackup();},350);}
  function flushDraftBackup(){if(draftBackupTimer){clearTimeout(draftBackupTimer);draftBackupTimer=null;}writeDraftBackup();}
  window.addEventListener('pagehide',flushDraftBackup);
  window.addEventListener('beforeunload',e=>{if(view==='builder'&&draftDirty){flushDraftBackup();e.preventDefault();e.returnValue='';}});
  async function restoreDraftBackup(){try{const userId=session?.user?.id,key=draftBackupKey(),raw=key&&localStorage.getItem(key);if(!userId||!raw)return;const checked=window.__draftRestoreCheckedUsers||(window.__draftRestoreCheckedUsers=new Set());if(checked.has(userId))return;checked.add(userId);const b=JSON.parse(raw);if(!b?.draft)return;if(!confirm(`A local release draft was saved ${new Date(b.savedAt).toLocaleString()}. Restore it? Uploaded files that were not saved to the portal must be selected again.`))return;if(!session||session.user.id!==userId)return;draft={...freshDraft(),...b.draft,artworkFile:null,artworkPreview:'',tracks:(b.draft.tracks||[]).map(t=>({...newTrack(),...t,file:null,fileName:t.fileName||''}))};wizardStep=Math.min(4,Math.max(1,Number(b.wizardStep)||1));draftDirty=true;view='builder';window.__draftRestored=true;toast('Local draft restored. Re-select any files that were not uploaded.','success');}catch(e){console.warn('Could not restore local draft',e);}}
  async function uploadWithRetry(bucket,path,file,options={}){let last;for(let attempt=1;attempt<=3;attempt++){try{let auth=await sb.auth.getSession();let active=auth.data?.session;if(active?.expires_at&&active.expires_at*1000<Date.now()+60000){const refreshed=await sb.auth.refreshSession();if(refreshed.error)throw refreshed.error;active=refreshed.data?.session;if(!active?.access_token)throw new Error('Your session could not be refreshed. Sign in again and retry the upload.');}if(!active?.access_token){const e=new Error('Your session expired. Sign in again and retry the upload.');e.retryable=false;throw e;}await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest(),url=C.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/'+encodeURIComponent(bucket)+'/'+path.split('/').map(encodeURIComponent).join('/');let lastPct=-1;xhr.open('POST',url,true);xhr.timeout=120000;xhr.setRequestHeader('apikey',C.SUPABASE_ANON_KEY);xhr.setRequestHeader('Authorization','Bearer '+active.access_token);xhr.setRequestHeader('Content-Type',options.contentType||file.type||'application/octet-stream');xhr.setRequestHeader('x-upsert','true');xhr.upload.onprogress=e=>{if(!e.lengthComputable)return;const pct=Math.round(e.loaded/e.total*100);if(pct===100||pct>=lastPct+5){lastPct=pct;toast(`Uploading ${file.name||path.split('/').pop()} — ${pct}%${attempt>1?` (retry ${attempt-1}/2)`:''}`);}};xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){resolve();return;}let msg='Storage returned HTTP '+xhr.status;try{msg=JSON.parse(xhr.responseText).message||JSON.parse(xhr.responseText).error||msg;}catch(_){}const e=new Error(msg);e.status=xhr.status;e.retryable=xhr.status>=500;reject(e);};xhr.onerror=()=>reject(new Error('Network error during upload.'));xhr.ontimeout=()=>reject(new Error('Upload timed out.'));xhr.onabort=()=>reject(new Error('Upload was cancelled.'));xhr.send(file);});return {data:{path},error:null};}catch(e){last=e;}if(attempt<3&&last?.retryable!==false){toast(`Upload failed; retrying (${attempt}/2)…`,'error');await new Promise(resolve=>setTimeout(resolve,400*attempt));}else if(last?.retryable===false)break;}throw new Error(`Upload failed after 3 attempts: ${last?.message||'network error'}`);}

  function newTrack(){ return {title:'',version:'',isrc:'',explicit:false,featured:'',writers:'',lyrics:'',file:null,fileName:'',path:'',duration:null}; }
  function freshDraft() {
    return { id:null, title:'', artist:'', bandId:'', releaseType:'Single', genre:'Rock', releaseDate:'', cLine:'', pLine:'', language:'English', prevReleased:false, origDate:'', rights:false, territory:'Worldwide', stores:[...STORES], streamingLinksText:'', artworkFile:null, artworkPreview:'', artworkPath:'', tracks:[newTrack()], status:'Draft' };
  }
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const $ = s => document.querySelector(s);
  const icon = (name,size=18) => { const p={bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',disc:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6"/>',home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',settings:'<path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/><circle cx="12" cy="12" r="4"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',x:'<path d="m6 6 12 12M18 6 6 18"/>',check:'<path d="m5 12 4 4L19 6"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',back:'<path d="M19 12H5M11 18l-6-6 6-6"/>',upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/>',image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',refresh:'<path d="M20 11a8 8 0 0 0-14.9-4L3 10"/><path d="M3 5v5h5M4 13a8 8 0 0 0 14.9 4L21 14"/><path d="M21 19v-5h-5"/>',download:'<path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16"/>',edit:'<path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="m14.5 7.5 2 2"/>' , workflow:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M10 6.5h3a2 2 0 0 1 2 2V14M14 17.5h-3a2 2 0 0 1-2-2V10"/>' ,sparkles:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2z"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>','briefcase-business':'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>','mic-vocal':'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>','chart-no-axes-combined':'<path d="M3 3v18h18M7 14l4-4 4 3 5-7"/><path d="M16 6h4v4"/>',command:'<path d="M9 7V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v14a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2V7z"/>','panel-left-open':'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M13 9l3 3-3 3"/>','panel-left-close':'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M16 9l-3 3 3 3"/>','check-square':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-7"/>',headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="13" width="4" height="7" rx="2"/><rect x="17" y="13" width="4" height="7" rx="2"/>','shopping-bag':'<path d="M5 8h14l1 13H4L5 8z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',sliders:'<path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M2 14h4m4-6h4m4 8h4"/>',music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',cloud:'<path d="M20 16.2A4.5 4.5 0 0 0 18 7.5 6 6 0 0 0 6.4 9 4 4 0 0 0 6 17h12"/>',palette:'<path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.6-3.2 1.8 1.8 0 0 1 1.5-2.8H18a3 3 0 0 0 3-3c0-5-4-9-9-9z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="11" cy="6.8" r=".8"/><circle cx="16" cy="8.5" r=".8"/>',briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>','file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>','users-round':'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8a4 4 0 0 1-2 3.5M18 15a4 4 0 0 1 3 4v2"/>'}; return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[name]||p.music}</svg>`; };  const statusClass = s => ({Draft:'neutral',Submitted:'blue','Changes Requested':'amber',Approved:'green','Sent to distributor':'blue',Live:'green',Rejected:'red'}[s]||'neutral');
  const currentLocale = () => ({en:'en-GB',es:'es-ES',fr:'fr-FR',de:'de-DE',pt:'pt-PT',pl:'pl-PL'}[(window.IE_I18N&&window.IE_I18N.language)||'en']||'en-GB');
  const formatNumber = (value, options={}) => Number(value||0).toLocaleString(currentLocale(),options);
  const dateFmt = d => d ? new Date(d+'T12:00:00').toLocaleDateString(currentLocale(),{day:'numeric',month:'short',year:'numeric'}) : 'No date';
  // Date-only fields (release dates and task deadlines) must use local calendar days, not UTC.
  const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  /* Artists never see distributor wording; the label does. */
  const statusLabel = s => (!isAdmin() && s==='Sent to distributor') ? 'Processing' : s;
  const notificationIsVisible = n => { const p=(profile&&profile.notification_preferences)||{}; if(n.band_invite_id&&p.band_invites===false)return false; if(['submission','release_status','sent','comment','update_requested','podcast_update'].includes(n.kind)&&p.release_updates===false)return false; if(['announcement','announce'].includes(n.kind)&&p.announcements===false)return false; return true; };
  const unreadVisibleCount = () => inbox.filter(n=>!n.read&&notificationIsVisible(n)).length;
  const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement&&document.activeElement.tagName)||'');
  function toast(msg,type='info'){ const r=$('#toast-root'); if(!r)return; r.innerHTML=`<div class="toast ${type}"><span class="toast-dot"></span><span>${esc(msg)}</span></div>`; clearTimeout(toastTimer); toastTimer=setTimeout(()=>r.innerHTML='',4000); }
  window.sendPortalEmail = async function(eventType, recordId){ try { if(!sb) return false; const {data:{session:active}}=await sb.auth.getSession(); if(!active?.access_token) return false; const {data,error}=await sb.functions.invoke('send-portal-email',{body:{event:eventType,id:recordId}}); if(error||data?.sent!==true){console.warn('Portal email was not sent',error||data?.reason||'unknown');toast('Saved successfully, but the email notification could not be sent. Check the email function setup.','error');return false;} return true; } catch(e) { console.warn('Portal email failed',e); toast('Saved successfully, but the email notification could not be sent.','error'); return false; } };

  /* Clean-path routing: readable URLs without .html; refresh restores the same view. */
  let unavailableReleaseRouteId=null;
  const ROUTES=['dashboard','podcasts','support','settings','earnings','statements','operations','notifications','activity','bands','roster','discover','discography','calendar','insights','pipeline','studio','vault','business','builder'];
  function syncHash(){
    if(view!=='release')unavailableReleaseRouteId=null;
    let path='/';
    if(ROUTES.includes(view)) path='/'+view;
    else if(view==='release'&&(selected?.id||unavailableReleaseRouteId)) path='/release/'+encodeURIComponent(selected?.id||unavailableReleaseRouteId);
    else if(view==='editprofile'&&pageId) path='/profile/'+encodeURIComponent(pageId)+'/edit';
    else if(view==='profile'&&pageId) path='/profile/'+encodeURIComponent(pageId);
    if(location.pathname!==path || location.hash) history.pushState(null,'',path+location.search);
  }
  function restoreRoute(){
    const path=decodeURIComponent(location.pathname.replace(/\/+$/,'')||'/');
    const route=path.split('/').filter(Boolean);
    if(route.length===1&&ROUTES.includes(route[0])&&!(route[0]==='roster'&&!isAdmin())){unavailableReleaseRouteId=null;view=route[0];return true;}
    if(route.length===2&&route[0]==='release'){
      const r=releases.find(x=>String(x.id)===route[1]);
      unavailableReleaseRouteId=r?null:route[1];selected=r||null;view='release';return true;
    }
    if(route.length===3&&route[0]==='profile'&&route[2]==='edit'){unavailableReleaseRouteId=null;
      view='editprofile';pageId=route[1];
      setTimeout(()=>openProfile(route[1]).then(()=>{if(pageData&&String(pageData.id)===String(route[1]))openEditor();}).catch(()=>toast('Could not open this profile. Please try again.','error')),0);
      return true;
    }
    if(route.length===2&&route[0]==='profile'){unavailableReleaseRouteId=null;
      view='profile';pageId=route[1];setTimeout(()=>openProfile(pageId).catch(()=>toast('Could not load this profile. Please try again.','error')),0);return true;
    }
    // Backwards compatibility with old links.
    const leaf=route[0]||'';const legacy=leaf.match(/^([a-z]+)\.html$/i);
    if(legacy&&ROUTES.includes(legacy[1].toLowerCase())){view=legacy[1].toLowerCase();return true;}
    const oldRelease=leaf.match(/^release-([\w-]+)\.html$/i);
    if(oldRelease){const r=releases.find(x=>String(x.id)===oldRelease[1]);if(r){selected=r;view='release';return true;}}
    const oldProfile=leaf.match(/^profile-([\w-]+)\.html$/i);
    if(oldProfile){view='profile';pageId=oldProfile[1];setTimeout(()=>openProfile(pageId),0);return true;}
    const m=location.hash.match(/^#\/([a-z]+)(?:\/([\w-]+))?/);
    if(!m)return false;
    if(m[1]==='release'&&m[2]){const r=releases.find(x=>String(x.id)===m[2]);if(r){selected=r;view='release';return true;}return false;}
    if(m[1]==='profile'&&m[2]){view='profile';pageId=m[2];setTimeout(()=>openProfile(m[2]),0);return true;}
    if(ROUTES.includes(m[1])&&!(m[1]==='roster'&&!isAdmin())){view=m[1];return true;}
    return false;
  }
  window.addEventListener('popstate',()=>{if(!session||!profile)return;if(restoreRoute())render();else{view='dashboard';pageId=null;selected=null;render();}});
  const QUOTA=()=>((window.IMPOSED_CONFIG&&window.IMPOSED_CONFIG.ARTIST_QUOTA_MB)||150)*1048576;
  const MAX_FILE=50*1048576, fmtMB=b=>(b/1048576).toFixed(1)+' MB';
