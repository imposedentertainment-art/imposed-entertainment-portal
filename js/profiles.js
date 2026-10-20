/* Account pages: Discover (search), public profile page, profile editor, audio player */
let discoverQ = '', discoverRes = null, discoverError = '', discoverRequestId = 0, pageId = null, pageData = null, pageDisc = [], coverUrls = {}, editState = null, editTargetId = null, pfPlayer = null, pfNow = null, pfTimer, listenerSessionFallback = '';
function getListenerSession(){try{return sessionStorage.getItem('ie_listener_session')||listenerSessionFallback;}catch(_){return listenerSessionFallback;}}
function setListenerSession(value){listenerSessionFallback=String(value||'');try{sessionStorage.setItem('ie_listener_session',listenerSessionFallback);}catch(_){}return !!listenerSessionFallback;}
function clearListenerSession(){listenerSessionFallback='';try{sessionStorage.removeItem('ie_listener_session');}catch(_){}}
const slugifyArtist = v => String(v||'artist').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'artist';

// Recover gracefully when stored profile media is deleted or temporarily unavailable.
function bindProfileImageFallbacks(root = document) {
  root.querySelectorAll('.pf-avatar img, img.public-artist-avatar, .sidebar-profile .avatar img, .band-art img').forEach(img => {
    if (img.dataset.fallbackBound) return;
    img.dataset.fallbackBound = 'true';
    img.onerror = () => {
      const name = img.closest('.pf-avatar')?.parentElement?.querySelector('.pf-id h1, h1, strong')?.textContent
        || img.closest('.guest-artist-card')?.querySelector('h2')?.textContent
        || img.closest('.sidebar-profile')?.querySelector('.sidebar-profile-copy strong')?.textContent
        || img.closest('.band-card')?.querySelector('b')?.textContent
        || document.querySelector('.public-artist-id h1')?.textContent
        || 'Artist';
      const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() || 'A';
      if (img.matches('.public-artist-avatar')) {
        const fallback = document.createElement('span');
        fallback.className = 'public-artist-avatar public-artist-avatar-fallback';
        fallback.textContent = initial;
        fallback.setAttribute('aria-label', `${name} profile image unavailable`);
        img.replaceWith(fallback);
      } else {
        const wrapper = img.closest('.pf-avatar, .avatar, .band-art');
        if (wrapper) wrapper.textContent = Array.from(name.trim()).slice(0, 2).join('').toLocaleUpperCase() || '?';
        else img.replaceWith(document.createTextNode(initial));
      }
    };
  });
}
function renderPublicReleaseCard(r) {
  const listening = (Array.isArray(r.streaming_links) ? r.streaming_links : []).slice(0, 12)
    .map(l => ({ label: String(l.label || 'Listen').slice(0, 40), url: safeUrl(String(l.url || '')) })).filter(l => l.url);
  const tracks = Array.isArray(r.tracks) ? r.tracks : [];
  const trackHtml = tracks.map(t => {
    const title = esc(t.title || 'Untitled track');
    const number = Number(t.track_number) || 0;
    const lyrics = typeof t.lyrics === 'string' ? t.lyrics.trim() : '';
    return `<div class="public-release-track"><span>${number}. ${title}</span>${lyrics ? `<details class="public-lyrics"><summary>View lyrics</summary><div class="public-lyrics-text">${esc(lyrics).replace(/\n/g, '<br>')}</div></details>` : ''}</div>`;
  }).join('');
  const listenHtml = listening.length
    ? `<div class="public-listen-links"><span>Listen now</span>${listening.map(l => `<a class="pf-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(l.label)} ↗</a>`).join('')}</div>`
    : '<p class="public-listen-pending">Listening links coming soon</p>';
  return `<article class="card public-release-card" id="release-${esc(r.id||slugifyArtist(r.title))}"><div class="public-release-disc">${icon('disc', 30)}</div><h3>${esc(r.title)}</h3><p>${esc(r.release_type || 'Release')}${r.genre ? ' · ' + esc(r.genre) : ''}${r.release_date ? ' · ' + esc(String(r.release_date).slice(0, 4)) : ''}</p>${tracks.length ? `<div class="public-release-tracks"><span>TRACKLIST</span>${trackHtml}</div>` : ''}${listenHtml}<button type="button" class="secondary smartlink-copy" data-release-id="${esc(r.id||slugifyArtist(r.title))}">${icon('link',14)} Copy release link</button></article>`;
}

async function renderPublicArtist(slug) {
  if (!ready || !slug) return;
  if (!getListenerSession()) { await renderGuestDiscover(); return; }
  $('#app').innerHTML='<main class="public-artist page" id="main-content"><div class="public-profile-loading" role="status" aria-live="polite"><span class="loading-spinner" aria-hidden="true"></span><p>Loading artist page…</p><small>Fetching public profile and listening links</small></div></main>';
  let response;
  try { response = await sb.functions.invoke('verify-turnstile',{body:{action:'artist',slug,sessionToken:getListenerSession()}}); }
  catch (e) { renderPublicArtistError(slug, 'We could not connect to the artist page. Check your connection and try again.'); return; }
  const {data,error}=response;
  const row=data?.success ? data.artist : null;
  if(error?.context?.status===401 || /listener session has expired/i.test(String(data?.error||''))){clearListenerSession();await renderGuestDiscover();return;}
  if(error||!row){renderPublicArtistError(slug, data?.error || 'This page may be private or the link may be incorrect.', true);return;}
  const links=(Array.isArray(row.links)?row.links:[]).slice(0,16).map(l=>({label:String(l.label||'Link').slice(0,60),url:safeUrl(String(l.url||''))})).filter(l=>l.url);
  const avatar=MEDIA_URL(row.avatar_path),banner=MEDIA_URL(row.banner_path);
  $('#app').innerHTML=`<main class="public-artist page" id="main-content" style="--ac:${accentOf(row.accent)}"><header class="public-artist-nav"><a href="/" class="brand"><img src="/img/logo-64.png" alt=""><span>IMPOSED <b>ENTERTAINMENT</b></span></a><div class="public-artist-actions"><span>ARTIST PAGE</span><button type="button" class="secondary public-share-btn" id="public-save-btn">☆ Save artist</button><button type="button" class="secondary public-share-btn" id="public-share-btn">Share profile</button></div></header><section class="public-artist-hero"><div class="public-artist-id">${avatar?`<img class="public-artist-avatar" src="${esc(avatar)}" alt="" loading="eager" decoding="async" fetchpriority="high">`:''}<div><p class="eyebrow">IMPOSED ARTIST</p><h1>${esc(row.display_name)}</h1>${row.tagline?`<p>${esc(row.tagline)}</p>`:''}${row.location?`<small>${esc(row.location)}</small>`:''}</div></div></section>${row.bio?`<section class="card public-artist-bio"><h2>About</h2><p>${esc(row.bio).replace(/\n/g,'<br>')}</p></section>`:''}${links.length||row.contact_email?`<section class="card public-artist-links"><h2>Follow &amp; connect</h2>${links.map(l=>`<a class="pf-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(l.label)} ↗</a>`).join('')}${row.contact_email?`<a class="pf-link" href="mailto:${esc(row.contact_email)}">Contact</a>`:''}</section>`:''}<section class="public-artist-music"><p class="eyebrow">DISCOGRAPHY</p><h2>Released music</h2>${(row.releases||[]).length?`<div class="public-release-grid">${row.releases.map(renderPublicReleaseCard).join('')}</div>`:'<p class="muted">No public releases yet.</p>'}</section><footer class="public-artist-footer">Published by the artist on Imposed Entertainment <span aria-hidden="true">·</span> <a href="/privacy">Privacy Policy</a> <span aria-hidden="true">·</span> <a href="/terms">Terms of Service</a></footer></main>`;
  bindProfileImageFallbacks($('#app'));
  document.title = `${row.display_name || 'Artist'} — Imposed Entertainment`;
  const robots = document.querySelector('meta[name="robots"]');
  if (robots) robots.content = 'index,follow';
  let desc = document.querySelector('meta[name="description"]');
  if (!desc) { desc = document.createElement('meta'); desc.name = 'description'; document.head.appendChild(desc); }
  desc.content = String(row.tagline || row.bio || `Discover ${row.display_name || 'this artist'} on Imposed Entertainment.`).replace(/\s+/g, ' ').slice(0, 160);
  // Assign the image as a CSS property after parsing markup; never interpolate a URL into CSS source.
  const hero = $('.public-artist-hero');
  if (hero && banner) { hero.style.backgroundImage = `linear-gradient(90deg,rgba(8,10,15,.86),rgba(8,10,15,.28)), url(${JSON.stringify(banner)})`; hero.style.backgroundPosition='center'; hero.style.backgroundSize='cover'; }
  const savedKey='ie_saved_artists_v1';
  const readSaved=()=>{try{return JSON.parse(localStorage.getItem(savedKey)||'[]').filter(x=>typeof x==='string');}catch(_){return [];}};
  const saveBtn=$('#public-save-btn');if(saveBtn){const slug=String(row.public_slug||slugifyArtist(row.display_name));const paint=()=>{const saved=readSaved().includes(slug);saveBtn.textContent=saved?'★ Saved artist':'☆ Save artist';saveBtn.setAttribute('aria-pressed',String(saved));};paint();saveBtn.onclick=()=>{const saved=readSaved(),has=saved.includes(slug),next=has?saved.filter(x=>x!==slug):[...saved,slug].slice(-200);try{localStorage.setItem(savedKey,JSON.stringify(next));paint();toast(has?'Removed from your collection':'Artist saved to this browser','success');}catch(_){toast('Browser storage is unavailable.','error');}};}
  document.querySelectorAll('[data-release-id]').forEach(btn=>{btn.onclick=async()=>{const url=new URL(location.href);url.hash='release-'+btn.dataset.releaseId;const link=url.href;try{await navigator.clipboard.writeText(link);toast('Release smart link copied','success');}catch(_){window.prompt('Copy this release link:',link);}};});
  if(location.hash.startsWith('#release-')){const targetId=decodeURIComponent(location.hash.slice(1));setTimeout(()=>document.getElementById(targetId)?.scrollIntoView({behavior:'smooth',block:'start'}),80);}
  const shareBtn=$('#public-share-btn');if(shareBtn)shareBtn.onclick=async()=>{const shareData={title:document.title,text:`Discover ${row.display_name} on Imposed Entertainment`,url:location.href};try{if(navigator.share)await navigator.share(shareData);else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href);toast('Artist profile link copied.','success');}else{window.prompt('Copy this artist profile link:',location.href);}}catch(e){if(e?.name!=='AbortError'){try{await navigator.clipboard.writeText(location.href);toast('Artist profile link copied.','success');}catch(_){window.prompt('Copy this artist profile link:',location.href);}}}};
}

const MEDIA_URL = p => p ? sb.storage.from('profile-media').getPublicUrl(p).data.publicUrl : '';
const safeUrl = u => { try { const raw=String(u||'').trim(); if(!raw||raw.length>512)return ''; const x = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); return /^https?:$/.test(x.protocol)&&x.hostname&&!x.username&&!x.password ? x.href : ''; } catch (e) { return ''; } };
function renderPublicArtistError(slug, message, unavailable=false) {
  const app=$('#app'); if(!app)return;
  app.innerHTML=`<main class="public-artist page" id="main-content"><a href="/" class="brand">IMPOSED ENTERTAINMENT</a><section class="guest-empty-state" role="status"><h1>${unavailable?'Artist page unavailable':'Unable to load artist page'}</h1><p>${esc(String(message||'Please try again.').slice(0,240))}</p><button type="button" class="secondary" id="public-artist-retry">Try again</button><a class="secondary" href="/?explore=1">Discover artists</a></section></main>`;
  const retry=$('#public-artist-retry'); if(retry)retry.onclick=()=>renderPublicArtist(slug);
}
const accentOf = a => /^#[0-9a-f]{6}$/i.test(a || '') ? a : '#d7bd72';
function profileCompletion(p){if(!p)return 0;const checks=[!!p.avatar_path,!!p.banner_path,!!String(p.bio||'').trim(),!!String(p.tagline||'').trim(),!!String(p.location||'').trim(),Array.isArray(p.links)&&p.links.some(l=>safeUrl(String(l.url||''))),!!p.accent];return Math.round(checks.filter(Boolean).length/checks.length*100);}
const PRESETS = ['#d7bd72', '#8caed8', '#539df5', '#7c83ff', '#b79af0', '#ff6fae', '#f3727f', '#ffa42b', '#eadb62', '#e8eeeb'];
function avatarHtml(p, size) {
  const u = p.avatar_preview || MEDIA_URL(p.avatar_path);
  return `<span class="pf-avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size / 3)}px;background:${accentOf(p.accent)}">${u ? `<img loading="lazy" decoding="async" src="${esc(u)}" alt="">` : esc(String(p.display_name || '?').trim().slice(0, 2).toUpperCase())}</span>`;
}

/* ---------- Discover ---------- */
function discover() {
  return `<section class="page fade"><div class="page-heading"><p class="eyebrow">DISCOVER</p><h1>Find artists</h1><p class="sub">Search by name to see profiles, releases, music and links.</p></div><div class="pf-search-row"><input id="disc-q" class="pf-search" type="search" aria-label="Search artists by name" placeholder="Search by name…" value="${esc(discoverQ)}" autocomplete="off"><button type="button" class="secondary pf-search-clear" data-pf="clear-discover" ${discoverQ ? "" : "hidden"}>Clear</button></div><div id="disc-results">${discoverList()}</div></section>`;
}
function discoverList() {
  if (discoverRes === null) return '<div class="discover-loading-grid" role="status" aria-label="Loading artists" aria-busy="true"><span class="sr-only">Loading artists…</span>'+Array.from({length:6},()=>'<div class="discover-skeleton-card" aria-hidden="true"><i></i><span></span><span></span></div>').join('')+'</div>'; 
  if (discoverError) return `<div class="guest-empty-state" role="status"><p class="muted">${esc(discoverError)}</p><button type="button" class="secondary" data-pf="retry-discover">Try again</button></div>`;
  if (!discoverRes.length) return '<p class="muted">No accounts found.</p>';
  return `<div class="pf-grid">${discoverRes.map(p => `<button class="pf-card" data-pf="open-profile" data-id="${esc(p.id)}">${avatarHtml(p, 54)}<div><strong>${esc(p.display_name || 'Unnamed')}</strong><span>${esc(p.tagline || p.location || (p.role === 'label_admin' ? 'Label' : 'Artist'))}</span></div></button>`).join('')}</div>`;
}
async function runSearch(q) {
  discoverQ = q;
  const requestId = ++discoverRequestId;
  discoverError = '';
  const { data, error } = await sb.rpc('search_profiles', { p_q: q });
  // Query text alone is not enough: two identical requests can finish out of order.
  if (requestId !== discoverRequestId || q !== discoverQ || view !== 'discover') return;
  if (error) {
    console.error('Artist search failed', error);
    discoverError = 'We could not load artists right now. Check your connection and try again.';
    discoverRes = [];
  } else {
    discoverError = '';
    discoverRes = (data || []).slice().sort((a,b)=>String(a.display_name||'').localeCompare(String(b.display_name||''),undefined,{sensitivity:'base'}));
  }
  const el = $('#disc-results'); if (el) { el.innerHTML = discoverList(); bindProfiles(); }
}
function openDiscover() { view = 'discover'; mobile = false; discoverRes = null; discoverError = ''; render(); runSearch(discoverQ); }

/* ---------- Profile page ---------- */
async function openProfile(id) {
  pageId = id; pageData = null; pageDisc = []; coverUrls = {}; view = 'profile'; mobile = false; render(); window.scrollTo(0, 0);
  const [a, b] = await Promise.all([sb.rpc('get_profile', { p_id: id }), sb.rpc('profile_discography', { p_id: id })]);
  if (pageId !== id) return;
  const row = Array.isArray(a.data) ? a.data[0] : a.data;
  const mine = id === session.user.id;
  pageData = row ? (mine ? {...row,is_public:profile.is_public,public_slug:profile.public_slug,public_profile_preferences:profile.public_profile_preferences,show_email:profile.show_email} : row) : false;
  pageDisc = Array.isArray(b.data) ? b.data : [];
  // The profile RPC intentionally exposes released music only. On the signed-in user's own private page, load their full private catalogue separately.
  if (mine) {
    const own = await sb.from('releases').select('id,owner_id,title,artist_name,release_type,release_date,status,review_note,artwork_path,updated_at').eq('owner_id', id).order('updated_at', {ascending:false});
    if (pageId !== id) return;
    if (!own.error && own.data) {
      const ids = own.data.map(r => r.id);
      let tracks = [];
      if (ids.length) { const tr = await sb.from('release_tracks').select('id,release_id,track_number,title,version,audio_path,lyrics').in('release_id', ids).order('track_number'); if (!tr.error) tracks = tr.data || []; }
      pageDisc = own.data.map(r => ({...r, tracks: tracks.filter(t => t.release_id === r.id).map(t => ({n:t.track_number,title:t.title,version:t.version,audio_path:t.audio_path,lyrics:t.lyrics}))}));
    }
  }
  const paths = pageDisc.map(r => r.artwork_path).filter(Boolean);
  if (paths.length) { const s = await sb.storage.from('artwork').createSignedUrls(paths, 3600); (s.data || []).forEach(x => { if (x.signedUrl) coverUrls[x.path] = x.signedUrl; }); }
  if (view === 'profile' && pageId === id) render();
}
function profilePage() {
  const back = `<button class="back-link" data-pf="discover">${icon('back', 16)} Discover</button>`;
  if (pageData === null) return `<section class="page fade">${back}<p class="muted">Loading…</p></section>`;
  if (pageData === false) return `<section class="page fade">${back}<p class="muted">This profile is not available.</p></section>`;
  const p = pageData, ac = accentOf(p.accent), banner = MEDIA_URL(p.banner_path), mine = p.id === session.user.id, canEdit = mine || isAdmin();
  const links = (Array.isArray(p.links) ? p.links : []).map(l => ({ label: String(l.label || '').trim(), href: safeUrl(String(l.url || '')) })).filter(l => l.href);
  return `<section class="page fade pf-page" style="--ac:${ac}">${back}
    <div class="pf-banner" style="${banner ? `background-image:url(${esc(JSON.stringify(banner))})` : ''}"></div>
    <div class="pf-head">${avatarHtml(p, 96)}<div class="pf-id"><h1>${esc(p.display_name || 'Unnamed')}</h1>${p.tagline ? `<p class="pf-tag">${esc(p.tagline)}</p>` : ''}<p class="muted">${esc([p.role === 'label_admin' ? 'Label' : 'Artist', p.location].filter(Boolean).join(' · '))}</p></div>${canEdit ? `<div class="row-actions">${mine ? `<button class="secondary" data-pf="download-epk">Export press kit</button><button class="secondary" data-pf="copy-profile-link">Copy portal link</button>` : `<span class="pill blue">Label profile editor</span>`}<button class="primary" data-pf="edit-profile">${mine ? 'Edit profile' : 'Edit artist profile'}</button></div>` : ''}</div>
    <div class="pf-completion"><div><b>Profile completeness</b><small>${profileCompletion(p)}% · ${profileCompletion(p)===100?'Looking good':'Add a few details to make your page stand out'}</small></div><div class="bar"><i style="width:${profileCompletion(p)}%;background:var(--ac)"></i></div></div>
    ${p.bio ? `<div class="card pf-bio"><h3>About</h3><p>${esc(p.bio).replace(/\n/g, '<br>')}</p></div>` : ''}
    ${(links.length || p.contact_email) ? `<div class="card"><h3>Links & contact</h3><div class="pf-links">${links.map(l => `<a class="pf-link" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer nofollow">${esc(l.label || l.href.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40))} ↗</a>`).join('')}${p.contact_email ? `<a class="pf-link" href="mailto:${esc(p.contact_email)}">✉ ${esc(p.contact_email)}</a>` : ''}</div></div>` : ''}
    <div class="section-head"><div><p class="eyebrow">MUSIC</p><h2>${mine ? 'Your private discography' : 'Discography'}</h2><p class="sub">${mine ? 'Only you can see your drafts and review statuses here. Public pages still show released music only.' : 'Released music'}</p></div>${mine ? `<button class="primary" data-pf="new-release">+ Create release</button>` : ''}</div>
    ${pageDisc.length ? `<div class="pf-discog">${pageDisc.map(r => { const privateDraft = mine && r.status !== 'Live'; const editable = mine && ['Draft','Changes Requested'].includes(r.status); return `<article class="card pf-release"><div class="pf-cover">${coverUrls[r.artwork_path] ? `<img src="${esc(coverUrls[r.artwork_path])}" alt="${esc(r.title)} cover" loading="lazy">` : icon('disc', 34)}</div><div class="pf-rel-body"><div class="disc-top"><span class="pill ${statusClass(r.status||'Live')}">${esc(statusLabel(r.status||'Live'))}</span><small>${esc(r.release_type||'Release')}${r.release_date ? ' · ' + esc(String(r.release_date).slice(0, 4)) : ''}</small></div><h3>${esc(r.title)}</h3>${privateDraft && r.review_note ? `<p class="review-note">${esc(r.review_note)}</p>` : ''}<div class="pf-tracks">${(r.tracks || []).map(t => `<div class="pf-track">${!privateDraft && t.audio_path ? `<button class="pf-play" data-pf="play" data-path="${esc(t.audio_path || '')}" aria-label="Play ${esc(t.title)}">▶</button>` : ''}<span>${t.n}. ${esc(t.title)}${t.version ? ` <small>${esc(t.version)}</small>` : ''}</span></div>`).join('')}</div>${editable ? `<div class="row-actions"><button class="primary" data-pf="edit-draft-release" data-id="${esc(r.id)}">${r.status==='Draft'?'Continue editing':'Edit & resubmit'}</button></div>` : ''}</div></article>`; }).join('')}</div>` : `<div class="empty"><h3>${mine ? 'Your discography is empty' : 'No released music yet'}</h3><p>${mine ? 'Start a release and your drafts will appear here automatically.' : 'Released music will appear here.'}</p>${mine ? `<button class="primary" data-pf="new-release">+ Create release</button>` : ''}</div>`}
  </section>`;
}
async function playTrack(path) {
  if (!path) return;
  if (pfPlayer && pfNow === path) { pfPlayer.paused ? pfPlayer.play() : pfPlayer.pause(); return; }
  const { data, error } = await sb.storage.from('audio').createSignedUrl(path, 3600);
  if (error) return toast('Could not load audio: ' + error.message, 'error');
  if (pfPlayer) pfPlayer.pause();
  pfPlayer = new Audio(data.signedUrl); pfNow = path;
  pfPlayer.onplay = pfPlayer.onpause = pfPlayer.onended = syncPlayIcons;
  pfPlayer.play().catch(e => toast(e.message, 'error'));
}
function syncPlayIcons() { document.querySelectorAll('[data-pf="play"]').forEach(b => { b.textContent = (b.dataset.path === pfNow && pfPlayer && !pfPlayer.paused && !pfPlayer.ended) ? '❚❚' : '▶'; }); }

/* ---------- Editor ---------- */
function downloadEPK(p, disc){
  const links=(Array.isArray(p.links)?p.links:[]).map(l=>({label:String(l.label||l.url||'Link'),url:safeUrl(String(l.url||''))})).filter(l=>l.url);
  const escHtml=esc;
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escHtml(p.display_name||'Artist')+' — Press kit</title><style>body{margin:0;background:#11131a;color:#f4f4f5;font:16px/1.65 system-ui,sans-serif}.wrap{max-width:860px;margin:auto;padding:32px 20px}.hero{padding:30px;border-radius:24px;background:linear-gradient(135deg,'+accentOf(p.accent)+',#242637);color:#101116}.avatar{width:104px;height:104px;object-fit:cover;border-radius:50%;border:4px solid #fff}.banner{max-height:250px;width:100%;object-fit:cover;border-radius:18px}.card{background:#1a1d27;border:1px solid #303341;border-radius:16px;padding:22px;margin-top:18px}.links a{display:inline-block;margin:6px 8px 0 0;padding:8px 12px;border:1px solid #45495b;border-radius:99px;color:#fff;text-decoration:none}.release{padding:12px 0;border-bottom:1px solid #333}.muted{color:#a8adbd}h1{font-size:clamp(2rem,6vw,3.5rem);line-height:1.1;margin:16px 0 8px}h2{margin-top:0}</style></head><body><main class="wrap"><section class="hero">'+(p.banner_path?'<img class="banner" src="'+escHtml(MEDIA_URL(p.banner_path))+'" alt="">':'')+(p.avatar_path?'<img class="avatar" src="'+escHtml(MEDIA_URL(p.avatar_path))+'" alt="">':'')+'<h1>'+escHtml(p.display_name||'Artist')+'</h1>'+(p.tagline?'<p>'+escHtml(p.tagline)+'</p>':'')+'<p>'+escHtml([p.location,p.role==='label_admin'?'Label':'Artist'].filter(Boolean).join(' · '))+'</p></section>'+(p.bio?'<section class="card"><h2>About</h2><p>'+escHtml(p.bio).replace(/\n/g,'<br>')+'</p></section>':'')+'<section class="card links"><h2>Links</h2>'+links.map(l=>'<a href="'+escHtml(l.url)+'" target="_blank" rel="noopener noreferrer">'+escHtml(l.label)+' ↗</a>').join('')+(p.contact_email?'<a href="mailto:'+escHtml(p.contact_email)+'">Contact</a>':'')+'</section><section class="card"><h2>Discography</h2>'+disc.map(r=>'<div class="release"><b>'+escHtml(r.title)+'</b><div class="muted">'+escHtml(r.release_type||'Release')+(r.release_date?' · '+escHtml(String(r.release_date).slice(0,4)):'')+'</div></div>').join('')+'</section><p class="muted">Press kit exported from Imposed Entertainment.</p></main></body></html>';
  const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=(String(p.display_name||'artist').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-|-$/g,'')||'artist')+'-press-kit.html';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Press kit exported as an HTML file','success');
}

function openEditor() {
  const p = pageData || profile;
  if (isAdmin() && p.id === session.user.id) { view='settings'; mobile=false; render(); toast('Label accounts manage workspace details in settings.','info'); return; }
  if (p.id !== session.user.id && !isAdmin()) { toast('You can only edit your own profile.', 'error'); return; }
  editTargetId = p.id;
  const links = Array.isArray(p.links) && p.links.length ? p.links.map(l => ({ label: l.label || '', url: l.url || '' })) : [p.instagram ? { label: 'Instagram', url: p.instagram.startsWith('@') ? 'https://instagram.com/' + p.instagram.slice(1) : p.instagram } : null, p.website ? { label: 'Website', url: p.website } : null].filter(Boolean);
  editState = { display_name: p.display_name || '', tagline: p.tagline || '', bio: p.bio || '', location: p.location || '', accent: accentOf(p.accent), show_email: p.show_email !== false, is_public: !!p.is_public, public_slug: p.public_slug || slugifyArtist(p.display_name).slice(0,40)+'-'+String(p.id||'').slice(0,6), public_profile_preferences: {...{bio:true,links:true,location:true,discography:true,email:false},...(p.public_profile_preferences||{})}, links, avatarFile: null, bannerFile: null, avatarPreview: '', bannerPreview: '', avatarPath: p.avatar_path || '', bannerPath: p.banner_path || '' };
  view = 'editprofile'; mobile = false; render(); window.scrollTo(0, 0);
}
function editProfile() {
  const s = editState; if (!s) return discover();
  return `<section class="page fade profile-edit-page"><button class="back-link" data-pf="cancel-editor">${icon('back', 16)} Cancel</button><div class="page-heading"><p class="eyebrow">YOUR PAGE</p><h1>Edit profile</h1><p class="sub">This is what other accounts see when they find you. Your name is set by the label.</p></div>
  <div class="card pf-form"><h3>Look</h3>
    <div class="pf-media"><div>${avatarHtml({ display_name: s.display_name || (pageData||profile).display_name, accent: s.accent, avatar_path: s.avatarPath, avatar_preview:s.avatarPreview }, 72)}<label class="secondary pf-file">Choose photo<input type="file" accept="image/*" data-pf-file="avatar" hidden></label><small>${s.avatarFile ? esc(s.avatarFile.name) : ''}</small></div><div><label class="secondary pf-file">Choose banner<input type="file" accept="image/*" data-pf-file="banner" hidden></label><small>${s.bannerFile ? esc(s.bannerFile.name) : (s.bannerPath ? 'Banner set' : 'Wide image works best')}</small></div></div>
    <div class="field"><span>Accent colour</span>
      <div class="pf-preview" style="--ac:${esc(s.accent)}"><div class="pf-prev-banner"></div><div class="pf-prev-row"><i class="pf-prev-avatar"></i><div><b>${esc(s.display_name || (pageData||profile).display_name || 'Your name')}</b><small>${esc(s.tagline || 'Your tagline')}</small></div><button type="button" class="pf-prev-play" tabindex="-1" aria-hidden="true">&#9654;</button></div></div>
      <div class="pf-swatches">${PRESETS.map(c => `<button type="button" class="pf-sw ${c.toLowerCase() === s.accent.toLowerCase() ? 'on' : ''}" style="--c:${c}" data-pf="swatch" data-c="${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
      <div class="pf-hex"><span class="pf-hex-dot" style="background:${esc(s.accent)}"></span><input id="pf-hex" value="${esc(s.accent)}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex colour"></div></div></div>
  <div class="card pf-form"><h3>${isAdmin() && editTargetId !== session.user.id ? 'Artist identity' : 'About you'}</h3>
    ${isAdmin() && editTargetId !== session.user.id ? `<label class="field"><span>Display name</span><input data-pf-in="display_name" maxlength="80" value="${esc(s.display_name)}" placeholder="Artist name"></label>` : ''}
    <label class="field"><span>Tagline</span><input data-pf-in="tagline" maxlength="80" value="${esc(s.tagline)}" placeholder="Metalcore from Leeds"></label>
    <label class="field"><span>Bio</span><textarea data-pf-in="bio" rows="5" maxlength="600" placeholder="Tell people who you are">${esc(s.bio)}</textarea></label>
    <label class="field"><span>Location</span><input data-pf-in="location" maxlength="60" value="${esc(s.location)}" placeholder="City, Country"></label>
    <label class="pf-check"><input type="checkbox" id="pf-email" ${s.show_email ? 'checked' : ''}> Show my email on my page so people can contact me</label></div>
  <div class="card pf-form"><h3>Public page privacy</h3><p class="muted">Your public page is private until you enable it. Only live releases are listed; drafts, earnings, tasks and label notes are never published.</p><label class="pf-check"><input type="checkbox" id="pf-public" ${s.is_public?'checked':''}> Publish a public artist page</label><label class="field"><span>Shareable page slug</span><input id="pf-slug" maxlength="54" value="${esc(s.public_slug)}" autocomplete="off"><small>Public URL: ${esc(location.origin+'/listen/artist/'+s.public_slug)}</small></label>${['bio','links','location','discography','email'].map(k=>`<label class="pf-check"><input type="checkbox" data-public-pref="${k}" ${s.public_profile_preferences[k]!==false?'checked':''}> Show ${({bio:'my biography',links:'my links',location:'my location',discography:'my live discography',email:'my email address'}[k])} publicly</label>`).join('')}</div>
  <div class="card pf-form"><h3>Artist links</h3><p class="muted">These become the artist’s public link hub, so fans can go straight to your music and socials. Add up to 8 links.</p>
    ${s.links.map((l, i) => `<div class="pf-linkrow"><input data-pf-link="${i}" data-k="label" placeholder="Label" maxlength="30" value="${esc(l.label)}"><input data-pf-link="${i}" data-k="url" placeholder="https://" maxlength="200" value="${esc(l.url)}"><button class="icon-btn danger-ghost" data-pf="del-link" data-i="${i}" aria-label="Remove link">✕</button></div>`).join('')}
    ${s.links.length < 8 ? `<button class="secondary" data-pf="add-link">+ Add link</button>` : ''}</div>
  <div class="builder-buttons"><button class="primary" data-pf="save-profile">Save profile</button></div></section>`;
}
async function saveEditor() {
  if (busy) return; busy = true; const newlyUploaded=[]; const saveButton=document.querySelector('[data-pf="save-profile"]'); if(saveButton){saveButton.disabled=true;saveButton.textContent='Saving profile…';}
  try {
    const s = editState, uid = editTargetId || session.user.id; if (uid !== session.user.id && !isAdmin()) throw new Error('You can only edit your own profile.'); const up = async (f, kind) => {
      if (!f) return null; if (!/^image\//.test(f.type)) throw new Error('Pictures must be image files.'); if (f.size > 2 * 1024 * 1024) throw new Error('Pictures must be under 2 MB.');
      const path = `${session.user.id}/${uid===session.user.id?'':'managed-'+uid+'-'}${kind}-${Date.now()}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`;
      const r = await uploadWithRetry('profile-media',path,f,{contentType:f.type}); newlyUploaded.push(path); return path;
    };
    const a = await up(s.avatarFile, 'avatar'), b = await up(s.bannerFile, 'banner');
    const links = s.links.map(l => ({ label: l.label.trim(), url: safeUrl(l.url.trim()) })).filter(l => l.url);
    const slug=slugifyArtist($('#pf-slug')?.value||s.public_slug); const prefs={...s.public_profile_preferences}; document.querySelectorAll('[data-public-pref]').forEach(x=>prefs[x.dataset.publicPref]=x.checked); const v = { ...(isAdmin() && uid !== session.user.id ? {display_name: String(s.display_name || '').trim().slice(0,80) || 'Artist'} : {}), tagline: s.tagline.trim() || null, bio: s.bio.trim() || null, location: s.location.trim() || null, accent: s.accent, show_email: !!s.show_email, links, avatar_path: a || s.avatarPath || null, banner_path: b || s.bannerPath || null, is_public: !!$('#pf-public')?.checked, public_slug: slug, public_profile_preferences:prefs };
    const { data: savedRow, error } = await sb.from('profiles').update(v).eq('id', uid).select('id').maybeSingle(); if (error) throw new Error('Could not save profile: ' + error.message); if (!savedRow) throw new Error('Supabase did not save this profile. Check the profiles UPDATE policy allows label admins to edit artist profile fields. Your uploaded image was not attached to the account.');
    if (uid === session.user.id && a && s.avatarPath && s.avatarPath !== a) sb.storage.from('profile-media').remove([s.avatarPath]); if (uid === session.user.id && b && s.bannerPath && s.bannerPath !== b) sb.storage.from('profile-media').remove([s.bannerPath]); if (uid === session.user.id) Object.assign(profile, v); if(s.avatarPreview)URL.revokeObjectURL(s.avatarPreview);if(s.bannerPreview)URL.revokeObjectURL(s.bannerPreview);toast('Profile saved', 'success'); busy = false; editState = null; editTargetId = null; await openProfile(uid);
  } catch (e) { if(newlyUploaded.length)await sb.storage.from('profile-media').remove(newlyUploaded).catch(()=>{}); console.error(e); toast(e.message || 'Could not save profile', 'error'); } finally { busy = false; if(saveButton&&saveButton.isConnected){saveButton.disabled=false;saveButton.textContent='Save profile';} }
}

/* ---------- Wiring (called from bind() after every render) ---------- */
function bindProfiles() {
  bindProfileImageFallbacks(document);
  document.querySelectorAll('[data-pf="open-profile"][role="button"]').forEach(row=>{if(row.dataset.profileKeyboardBound)return;row.dataset.profileKeyboardBound='1';row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();row.click();}});});
  document.querySelectorAll('.brand img, .boot-brand img, .auth-logo img').forEach(img => { if (img.dataset.logoFallbackBound) return; img.dataset.logoFallbackBound='1'; img.addEventListener('error', () => { img.hidden=true; const mark=document.createElement('span'); mark.className='logo-fallback-mark'; mark.textContent='IE'; mark.setAttribute('aria-hidden','true'); img.insertAdjacentElement('afterend',mark); }, {once:true}); });
  document.querySelectorAll('[data-pf]').forEach(el => el.onclick = async () => {
    if (el.dataset.pendingAction === '1') return;
    el.dataset.pendingAction = '1'; const wasDisabled = !!el.disabled; el.classList.add('is-pending'); el.setAttribute('aria-busy', 'true'); if ('disabled' in el) el.disabled = true;
    const a = el.dataset.pf;
    try {
      if (a === 'discover') openDiscover();
      else if (a === 'retry-discover') { discoverRes = null; discoverError = ''; const el = $('#disc-results'); if (el) el.innerHTML = discoverList(); runSearch(discoverQ); }
      else if (a === 'clear-discover') { const q = $('#disc-q'); if (q) { q.value = ''; q.focus(); q.dispatchEvent(new Event('input', { bubbles: true })); } }
      else if (a === 'open-profile') await openProfile(el.dataset.id);
      else if (a === 'my-page') { if (isAdmin()) { view='settings'; mobile=false; render(); } else await openProfile(session.user.id); }
      else if (a === 'new-release') { draft=freshDraft(); draft.artist=profile.display_name||''; wizardStep=1; draftDirty=false; backView='profile'; view='builder'; render(); }
      else if (a === 'edit-draft-release') { const rel=releases.find(r=>r.id===el.dataset.id); if(!rel || rel.owner_id!==session.user.id || !['Draft','Changes Requested'].includes(rel.status)) throw new Error('This release is not editable.'); await openDraft(rel.id); }
      else if (a === 'cancel-editor') {const target=editTargetId||session.user.id;editTargetId=null;if(editState?.avatarPreview)URL.revokeObjectURL(editState.avatarPreview);if(editState?.bannerPreview)URL.revokeObjectURL(editState.bannerPreview);editState=null;await openProfile(target);}
      else if (a === 'edit-profile') openEditor();
      else if (a === 'download-epk') { downloadEPK(pageData,pageDisc); }
      else if (a === 'copy-profile-link') { const url=pageData?.is_public&&pageData?.public_slug?location.origin+'/listen/artist/'+encodeURIComponent(pageData.public_slug):location.origin+location.pathname+'#/profile/'+encodeURIComponent(pageId); try{await navigator.clipboard.writeText(url);toast(pageData?.is_public?'Public artist link copied':'Portal link copied; sign-in is required until you publish your page','success');}catch(_){window.prompt('Copy profile link',url);} }
      else if (a === 'save-profile') await saveEditor();
      else if (a === 'add-link') { editState.links.push({ label: '', url: '' }); render(); }
      else if (a === 'del-link') { editState.links.splice(Number(el.dataset.i), 1); render(); }
      else if (a === 'swatch') { setAccent(el.dataset.c); }
      else if (a === 'play') await playTrack(el.dataset.path);
    } catch (e) { toast(e.message, 'error'); } finally { delete el.dataset.pendingAction; el.classList.remove('is-pending'); el.removeAttribute('aria-busy'); if ('disabled' in el) el.disabled = wasDisabled; }
  });
  const q = $('#disc-q'); if (q) { q.oninput = () => { const nextQ = q.value.trim(); discoverQ = nextQ; ++discoverRequestId; discoverError = ''; discoverRes = null; const results = $('#disc-results'); if (results) results.innerHTML = discoverList(); const clear = document.querySelector('[data-pf=\"clear-discover\"]'); if (clear) clear.hidden = !nextQ; clearTimeout(pfTimer); pfTimer = setTimeout(() => runSearch(nextQ), 250); }; q.onkeydown = e => { if (e.key === 'Escape' && q.value) { q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); } }; if (document.activeElement === document.body) q.focus(); }
  if (editState && view === 'editprofile') {
    document.querySelectorAll('[data-pf-in]').forEach(i => i.oninput = () => { editState[i.dataset.pfIn] = i.value; });
    document.querySelectorAll('[data-pf-link]').forEach(i => i.oninput = () => { editState.links[Number(i.dataset.pfLink)][i.dataset.k] = i.value; });
    const hx = $('#pf-hex'); if (hx) hx.oninput = () => { let v = hx.value.trim(); if (v && v[0] !== '#') v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) setAccent(v, true); };
    const em = $('#pf-email'); if (em) em.onchange = () => { editState.show_email = em.checked; };
    const pub = $('#pf-public'); if(pub) pub.onchange=()=>{editState.is_public=pub.checked;};
    const slug = $('#pf-slug'); if(slug) slug.oninput=()=>{editState.public_slug=slug.value; const small=slug.parentElement.querySelector('small');if(small)small.textContent='Public URL: '+location.origin+'/listen/artist/'+slugifyArtist(slug.value);};
    document.querySelectorAll('[data-public-pref]').forEach(x=>x.onchange=()=>editState.public_profile_preferences[x.dataset.publicPref]=x.checked);
    document.querySelectorAll('[data-pf-file]').forEach(i => i.onchange = () => { const f = i.files && i.files[0]; if (!f) return; if(!/^image\/(jpeg|png|webp|gif)$/.test(f.type)){toast('Choose a JPG, PNG, WebP or GIF image.','error');i.value='';return;}if(f.size>2*1024*1024){toast('Images must be under 2 MB.','error');i.value='';return;}if (i.dataset.pfFile === 'avatar') {if(editState.avatarPreview)URL.revokeObjectURL(editState.avatarPreview);editState.avatarFile=f;editState.avatarPreview=URL.createObjectURL(f);} else {if(editState.bannerPreview)URL.revokeObjectURL(editState.bannerPreview);editState.bannerFile=f;editState.bannerPreview=URL.createObjectURL(f);} render(); });
  }
  syncPlayIcons();
}

function setAccent(c, fromHex) {
  editState.accent = c;
  const pv = document.querySelector('.pf-preview'); if (pv) pv.style.setProperty('--ac', c);
  const dot = document.querySelector('.pf-hex-dot'); if (dot) dot.style.background = c;
  const hx = $('#pf-hex'); if (hx && !fromHex) hx.value = c;
  document.querySelectorAll('.pf-sw').forEach(b => b.classList.toggle('on', b.dataset.c.toLowerCase() === c.toLowerCase()));
}


/* v33: visitor sessions are signed server-side; the directory/profile data is only returned by the verified Edge Function. */
async function renderGuestDiscover(){
  const app=$('#app'); if(!app)return;
  document.title='Discover artists | Imposed Entertainment';
  const listenerSession=getListenerSession();
  if(!listenerSession){
    app.innerHTML=`<main class="guest-discover page" id="main-content"><header class="public-artist-nav"><a href="/" class="brand"><img src="/img/logo-64.png" alt=""><span>IMPOSED <b>ENTERTAINMENT</b></span></a><a href="/" class="guest-back">Artist / label sign in</a></header><section class="guest-welcome"><p class="eyebrow blue">LISTENER ACCESS</p><h1>Find your next favourite artist.</h1><p>Explore public artist profiles and discover music released through Imposed Entertainment. No account or login required.</p><div class="guest-verify-card"><h2>Quick security check</h2><p>Complete Cloudflare verification to browse public artist pages.</p><div id="cf-turnstile" class="cf-box" aria-label="Cloudflare security verification"></div><p id="captcha-status" class="captcha-status" role="status" aria-live="polite">Loading security check…</p><button type="button" class="primary full" id="guest-verify-btn">Continue to discover artists ${icon('arrow',16)}</button><p class="guest-note">Only profiles artists have chosen to publish are shown.</p></div></section><footer class="guest-legal-footer"><a href="/privacy">Privacy Policy</a><span aria-hidden="true">·</span><a href="/terms">Terms of Service</a></footer></main>`;
    mountCaptcha();
    $('#guest-verify-btn').onclick=async()=>{const button=$('#guest-verify-btn');if(window.__ieGuestVerifySubmitting)return;window.__ieGuestVerifySubmitting=true;const original=button?.innerHTML;if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Checking security…';}try{const token=captchaToken();const {data,error}=await sb.functions.invoke('verify-turnstile',{body:{token}});if(error)throw error;if(!data?.success||!data?.sessionToken)throw new Error(data?.error||'Verification could not be confirmed. Please try again.');setListenerSession(data.sessionToken);const querySlug=new URLSearchParams(location.search).get('artist');const pathMatch=location.pathname.match(/^\/listen\/artist\/([^/]+)\/?$/);let pendingSlug=querySlug||(pathMatch?pathMatch[1]:null);if(pendingSlug){try{pendingSlug=decodeURIComponent(pendingSlug);}catch(_){/* Keep the raw slug if it is not percent-encoded. */}await renderPublicArtist(pendingSlug);}else await renderGuestDiscover();}catch(e){const status=$('#captcha-status');if(status){status.textContent=e.message||'Verification failed. Please try again.';status.dataset.state='error';}if(window.turnstile)resetCaptcha();}finally{window.__ieGuestVerifySubmitting=false;if(button?.isConnected){button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=original||'Continue to discover artists';}}};
    return;
  }
  app.innerHTML=`<main class="guest-discover page" id="main-content"><header class="public-artist-nav"><a href="/" class="brand"><img src="/img/logo-64.png" alt=""><span>IMPOSED <b>ENTERTAINMENT</b></span></a><a href="/" class="guest-back">Artist / label sign in</a></header><section class="guest-directory"><p class="eyebrow blue">THE ROSTER</p><h1>Discover artists</h1><p class="guest-directory-intro">Meet the artists who make Imposed Entertainment.</p><div class="guest-search-wrap"><input id="guest-search" type="search" placeholder="Search artists by name or location…" aria-label="Search artists"><button type="button" class="secondary guest-search-clear" id="guest-search-clear" aria-label="Clear artist search">Clear</button></div><div class="collection-toolbar"><button type="button" class="secondary" id="show-saved-artists">☆ My collection</button><small>Saved on this device</small></div><p class="guest-result-count" id="guest-result-count" aria-live="polite"></p><div id="guest-artist-grid" class="guest-artist-grid guest-artist-grid-loading" aria-busy="true" role="status" aria-label="Loading public artists"><span class="sr-only">Loading public artists…</span>${Array.from({length:6},()=>'<div class="guest-artist-skeleton" aria-hidden="true"><i></i><span></span><span></span></div>').join('')}</div><p class="guest-note">Showing only artist profiles that have been made public by their owners.</p></section></main>`;
  const grid=$('#guest-artist-grid');
  try{const {data,error}=await sb.functions.invoke('verify-turnstile',{body:{action:'directory',sessionToken:listenerSession}});if(error)throw error;if(!data?.success)throw new Error(data?.error||'Visitor verification expired. Please verify again.');const artists=(Array.isArray(data.artists)?data.artists:[]).slice().sort((a,b)=>String(a.display_name||'').localeCompare(String(b.display_name||''),undefined,{sensitivity:'base'}));
    let savedOnly=false;const savedKey='ie_saved_artists_v1';const readSaved=()=>{try{return JSON.parse(localStorage.getItem(savedKey)||'[]').filter(x=>typeof x==='string');}catch(_){return [];}};const draw=()=>{const q=($('#guest-search')?.value||'').trim().toLocaleLowerCase();const saved=readSaved();const list=artists.filter(a=>(!savedOnly||saved.includes(String(a.public_slug||'')))&&(String(a.display_name||'').toLocaleLowerCase().includes(q)||String(a.tagline||'').toLocaleLowerCase().includes(q)||String(a.location||'').toLocaleLowerCase().includes(q)));const count=$('#guest-result-count');if(count)count.textContent=list.length+' artist'+(list.length===1?'':'s')+(savedOnly?' saved':' found');grid.innerHTML=list.length?list.map(a=>`<article class="guest-artist-card guest-artist-card-enhanced"><a class="guest-artist-open" href="/listen/artist/${encodeURIComponent(a.public_slug)}"><div class="guest-artist-avatar">${a.avatar_path?`<img loading="lazy" decoding="async" src="${esc(MEDIA_URL(a.avatar_path))}" alt="">`:`<span>${esc(String(a.display_name||'A').slice(0,1).toUpperCase())}</span>`}</div><div class="guest-artist-copy"><h2>${esc(a.display_name||'Artist')}</h2>${a.tagline?`<p>${esc(a.tagline)}</p>`:''}${a.location?`<small>${esc(a.location)}</small>`:''}<span class="guest-view-profile">View artist profile ${icon('arrow',14)}</span></div></a><button type="button" class="collection-save" data-save-slug="${esc(a.public_slug||'')}" aria-label="${saved.includes(String(a.public_slug||''))?'Remove saved artist':'Save artist'}">${saved.includes(String(a.public_slug||''))?'★':'☆'}</button></article>`).join(''):'<div class="muted guest-empty"><p>No public artists match that search.</p><button type="button" class="secondary" id="guest-empty-clear">Clear search</button></div>';grid.querySelectorAll('.guest-artist-avatar img').forEach(img=>{img.onerror=()=>{const card=img.closest('.guest-artist-card');const name=card?.querySelector('h2')?.textContent||'Artist';const fallback=document.createElement('span');fallback.textContent=Array.from(name.trim())[0]?.toLocaleUpperCase()||'A';img.replaceWith(fallback);};});grid.querySelectorAll('[data-save-slug]').forEach(btn=>btn.onclick=()=>{const slug=btn.dataset.saveSlug,now=readSaved(),next=now.includes(slug)?now.filter(x=>x!==slug):[...now,slug].slice(-200);try{localStorage.setItem(savedKey,JSON.stringify(next));draw();}catch(_){toast('Browser storage is unavailable.','error');}});const savedToggle=$('#show-saved-artists');if(savedToggle){savedToggle.textContent=savedOnly?'← All artists':'☆ My collection';savedToggle.onclick=()=>{savedOnly=!savedOnly;draw();};}const emptyClear=$('#guest-empty-clear');if(emptyClear)emptyClear.onclick=()=>{const input=$('#guest-search');if(input){input.value='';input.focus();}draw();};};
    grid.classList.remove('guest-artist-grid-loading');grid.removeAttribute('aria-busy');grid.removeAttribute('role');draw();const search=$('#guest-search'),clear=$('#guest-search-clear');if(search){search.oninput=draw;search.onkeydown=e=>{if(e.key==='Escape'&&search.value){search.value='';draw();}};}if(clear)clear.onclick=()=>{if(search){search.value='';search.focus();}draw();};
  }catch(e){console.error('Public artist directory unavailable',e);if(e?.context?.status===401 || /session|verification|expired/i.test(String(e.message||''))){clearListenerSession();renderGuestDiscover();return;}grid.classList.remove('guest-artist-grid-loading');grid.removeAttribute('aria-busy');grid.removeAttribute('role');grid.innerHTML='<div class="guest-empty-state"><p class="muted">We could not load the artist directory right now.</p><button type="button" class="secondary" id="guest-directory-retry">Try again</button></div>';const retry=$('#guest-directory-retry');if(retry)retry.onclick=()=>renderGuestDiscover();}
}
