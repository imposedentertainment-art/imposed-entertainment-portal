/* Release save/submit/status, downloads, per-release loaders */

function routeNoteHandoffText(rel,tracks){
  const lines=[
    'IMPOSED ENTERTAINMENT — INTERNAL DISTRIBUTION HANDOFF',
    'IMPORTANT: INTERNAL STAFF DOCUMENT. Use this as a human-readable checklist; all release details and files must be entered manually in the distributor portal.',
    '',
    'RELEASE DETAILS',
    'Label name: Imposed Entertainment (confirm exact label name registered in RouteNote)',
    `Release title: ${rel.title||''}`,
    `Primary artist: ${rel.artist_name||''}`,
    `Release type: ${rel.release_type||''}`,
    `Genre: ${rel.genre||''}`,
    `Planned release date: ${rel.release_date||'Confirm in RouteNote'}`,
    `C-line: ${rel.c_line||'TO CONFIRM / ENTER'}`,
    `P-line: ${rel.p_line||'TO CONFIRM / ENTER'}`,`Language: ${rel.language||'English'}`,`Previously released: ${rel.previously_released?'Yes, original date '+(rel.original_release_date||'?'):'No'}`,`Artist rights declaration: ${rel.rights_confirmed?'Confirmed':'NOT CONFIRMED'}`,
    `Territory preference: ${rel.territory||'Worldwide'}`,
    `Portal store preferences: ${(Array.isArray(rel.stores)?rel.stores:[]).join(', ')||'Choose in RouteNote'}`,
    '',
    'TRACKS'
  ];
  (tracks||[]).forEach((t,i)=>lines.push(`${i+1}. ${t.title||''}${t.version&&t.version!=='Original'?` (${t.version})`:''}`,`   ISRC: ${t.isrc||'Leave blank if RouteNote should assign / confirm'}`,`   Explicit: ${t.explicit?'YES':'No'}   Featuring: ${t.featured_artists||'-'}   Writers: ${t.songwriters||'-'}`,`   Portal audio filename: ${(t.audio_path||'').split('/').pop()||'Missing'}`));
  lines.push('','MANUAL ROUTENOTE CHECKLIST',
    '[ ] Create or open the release in RouteNote; enter existing UPC only if one is already assigned.',
    '[ ] Enter album details, primary artists, genre, language, original release date, release date, copyright and phonogram lines.',
    '[ ] Download and upload every track individually; enter track titles, versions, artist credits and ISRCs.',
    '[ ] Upload the artwork file.',
    '[ ] Select the actual RouteNote stores and territories. Portal preferences are not synced.',
    '[ ] Review metadata and rights, accept RouteNote terms, then submit to RouteNote moderation.',
    '[ ] Only then mark this release “Sent to distributor” in the portal.',
    '[ ] Mark “Live” only after confirming the release is available on the relevant stores.',
    '',
    'DISTRIBUTOR UPLOAD REQUIREMENTS (check the current official guide before upload)',
    '- Audio: stereo FLAC or MP3; 44.1 kHz; 16-bit FLAC or 320 kbps MP3.',
    '- Artwork: JPG, RGB, exactly 3000 × 3000 px, less than 25 MB.',
    '- Artwork must not contain URLs, contact/social handles, pricing, barcodes or unlicensed/copyrighted imagery.',
    '- Current RouteNote guidance describes release titles up to 15 words and track titles up to 12 words.',
    '',
    'Official references:',
    'https://support.routenote.com/kb-article/how-do-i-create-a-release-on-routenote/',
    'https://support.routenote.com/kb-article/what-are-the-audio-file-requirements/',
    'https://support.routenote.com/kb-article/what-are-the-album-artwork-requirements/',
    'https://support.routenote.com/kb-article/routenote-style-guide/'
  );
  return lines.join('\n');
}

  async function saveProfileName(){if(!session?.user?.id||!profile?.id||profile.id!==session.user.id){toast('Sign in to update your display name.','error');return;}const name=prompt('Display name (1–80 characters)',profile.display_name||'');if(name===null)return;const displayName=name.trim();if(!displayName){toast('Your display name cannot be empty.','error');return;}if(displayName.length>80){toast('Display names must be 80 characters or fewer.','error');return;}if(displayName===String(profile.display_name||''))return;const {data,error}=await sb.from('profiles').update({display_name:displayName}).eq('id',session.user.id).select().maybeSingle();if(error)throw error;if(!data)throw new Error('Your display name was not saved. Check your profile permissions and try again.');profile=data;if(Array.isArray(users)){const i=users.findIndex(u=>u.id===data.id);if(i>=0)users[i]={...users[i],...data};}toast('Profile updated','success');render();}
  function parseStreamingLinks(raw){const source=String(raw||'');if(source.length>12000)throw new Error('Listening links are too long. Shorten the URLs and try again.');const lines=source.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);if(lines.length>12)throw new Error('Add no more than 12 listening links per release.');return lines.map(line=>{const parts=line.split('|');const label=(parts.length>1?parts.shift():'Listen').trim().slice(0,40);const rawUrl=parts.join('|').trim();let url='';try{if(rawUrl.length>512)throw new Error('too long');const parsed=new URL(/^https?:\/\//i.test(rawUrl)?rawUrl:'https://'+rawUrl);if(['https:','http:'].includes(parsed.protocol)&&parsed.hostname&&!parsed.username&&!parsed.password)url=parsed.href;}catch(_){}if(!url)throw new Error('Listening links must be valid http or https URLs (maximum 512 characters). Use “Spotify | https://…” format.');return {label:label||'Listen',url};});}
  async function createRelease(status='Draft'){ if(busy)return; busy=true; try{validateBasics(); const payload={owner_id:session.user.id,band_id:draft.bandId||null,title:draft.title.trim(),artist_name:draft.artist.trim(),release_type:draft.releaseType,genre:draft.genre,release_date:draft.releaseDate||null,c_line:draft.cLine.trim(),p_line:draft.pLine.trim(),language:draft.language,previously_released:!!draft.prevReleased,original_release_date:draft.prevReleased?(draft.origDate||null):null,rights_confirmed:!!draft.rights,rights_confirmed_at:draft.rights?new Date().toISOString():null,territory:draft.territory,stores:draft.stores,streaming_links:parseStreamingLinks(draft.streamingLinksText),status}; let id=draft.id; const isNew=!id; let res; if(id)res=await sb.from('releases').update(payload).eq('id',id).select().single(); else res=await sb.from('releases').insert(payload).select().single(); if(res.error)throw res.error; id=res.data.id; draft.id=id; if(isNew) await sb.from('release_events').insert({release_id:id,actor_id:session.user.id,event_type:'draft_saved',note:''}); return res.data; } finally{busy=false;} }
  function validateBasics(){if(!draft.title.trim())throw new Error('Release title is required.');if(!draft.artist.trim())throw new Error('Artist / project is required.');}
  function releaseReadiness(){
    const tracks=Array.isArray(draft.tracks)?draft.tracks:[];
    const checks=[
      ['Release title',!!String(draft.title||'').trim()],
      ['Artist / project',!!String(draft.artist||'').trim()],
      ['Release date',!!draft.releaseDate],
      ['Artwork',!!draft.artworkFile||!!draft.artworkPath],
      ['At least one track',tracks.length>0],
      ['Track titles',tracks.length>0&&tracks.every(t=>!!String(t.title||'').trim())],
      ['Audio for every track',tracks.length>0&&tracks.every(t=>!!t.file||!!t.path)],
      ['Songwriter credits',tracks.length>0&&tracks.every(t=>!!String(t.writers||'').trim())],
      ['Stores selected',(draft.stores||[]).length>0],
      ['Rights declaration',!!draft.rights],
      ['Original date (if previously released)',!draft.prevReleased||!!draft.origDate]
    ];
    const warnings=typeof rnProblems==='function'?rnProblems():[];
    return {checks,warnings,complete:checks.filter(x=>x[1]).length,total:checks.length,ready:checks.every(x=>x[1])&&!warnings.length};
  }
  async function storageUsage(){ const uid=session.user.id; let total=0; for(const b of ['artwork','audio','documents']){ const {data:dirs}=await sb.storage.from(b).list(uid,{limit:1000}); for(const d of dirs||[]){ const {data:fs}=await sb.storage.from(b).list(`${uid}/${d.name}`,{limit:1000}); (fs||[]).forEach(f=>total+=Number(f.metadata&&f.metadata.size||0)); } } return total; }
  async function showUsage(){ const el=$('#st-usage'); if(!el)return; try{ const u=await storageUsage(), q=QUOTA(), p=Math.min(100,u/q*100); el.innerHTML=isAdmin()?`<b>Label account</b><span>${fmtMB(u)} used. Label uploads are not capped.</span>`:`<b>${fmtMB(u)} of ${fmtMB(q)} used</b><div class="bar"><i style="width:${p}%"></i></div><span>Drafts you delete free their space. Max 50 MB per audio file.</span>`; }catch(e){ el.textContent='Could not read usage.'; } }
  async function saveDraft(){
    if(busy) return false;
    const rel=await createRelease('Draft'); if(!rel) return false;
    draftDirty=true;persistDraftBackup();busy=true;
    const oldFilesToRemove=[];
    try{
      const id=draft.id, user=rel.owner_id, upd={};
      if(!isAdmin()){ const pend=(draft.artworkFile?draft.artworkFile.size:0)+draft.tracks.reduce((t,x)=>t+(x.file?x.file.size:0),0); if(pend){ const used=await storageUsage(); if(used+pend>QUOTA()) throw new Error(`Not enough storage: ${fmtMB(used)} used of ${fmtMB(QUOTA())}. Delete an old draft or ask the label for more space.`); } }
      if(draft.artworkFile){const ext=(draft.artworkFile.name.split('.').pop()||'jpg').toLowerCase(), p=`${user}/${id}/artwork-${Date.now()}.${ext}`; const up=await uploadWithRetry('artwork',p,draft.artworkFile,{contentType:draft.artworkFile.type}); if(draft.artworkPath&&draft.artworkPath!==p) oldFilesToRemove.push(['artwork',draft.artworkPath]); draft.artworkPath=p; draft.artworkFile=null; upd.artwork_path=p;persistDraftBackup();}
      const rows=[];
      for(let i=0;i<draft.tracks.length;i++){const t=draft.tracks[i]; let path=t.path||null;
        if(t.file){const ext=(t.file.name.split('.').pop()||'mp3').toLowerCase(); path=`${user}/${id}/track-${String(i+1).padStart(2,'0')}-${Date.now()}-${i}.${ext}`; await uploadWithRetry('audio',path,t.file,{contentType:t.file.type||'audio/mpeg'}); if(t.path&&t.path!==path) oldFilesToRemove.push(['audio',t.path]); t.path=path; t.file=null;persistDraftBackup();}
        rows.push({release_id:id,track_number:i+1,title:t.title.trim()||'Untitled track',version:t.version.trim(),isrc:t.isrc.trim(),explicit:!!t.explicit,featured_artists:(t.featured||'').trim(),songwriters:(t.writers||'').trim(),lyrics:String(t.lyrics||'').slice(0,20000),language:draft.language,audio_path:path});}
      const oldRows=await sb.from('release_tracks').select('id').eq('release_id',id); if(oldRows.error)throw new Error('Could not read tracks: '+oldRows.error.message);
      let insertedTrackIds=[];
      if(rows.length){const tr=await sb.from('release_tracks').insert(rows).select('id'); if(tr.error)throw new Error('Could not save tracks: '+tr.error.message);insertedTrackIds=(tr.data||[]).map(x=>x.id);}
      const oldIds=(oldRows.data||[]).map(x=>x.id); if(oldIds.length){const d=await sb.from('release_tracks').delete().in('id',oldIds); if(d.error){if(insertedTrackIds.length)await sb.from('release_tracks').delete().in('id',insertedTrackIds);throw new Error('Could not replace old tracks: '+d.error.message);}}
      try{ const dir=`${user}/${id}`, keep=new Set(rows.map(x=>x.audio_path).filter(Boolean)); const {data:fl}=await sb.storage.from('audio').list(dir); const orphan=(fl||[]).map(f=>`${dir}/${f.name}`).filter(p=>!keep.has(p)); if(orphan.length) await sb.storage.from('audio').remove(orphan); }catch(_){}
      if(Object.keys(upd).length){const ur=await sb.from('releases').update(upd).eq('id',id); if(ur.error)throw new Error('Could not link artwork: '+ur.error.message);}
      for(const [bucket,path] of oldFilesToRemove){try{await sb.storage.from(bucket).remove([path]);}catch(e){console.warn('Old upload cleanup deferred',bucket,path,e);}}
      await loadReleases(); draftDirty=false; try{localStorage.removeItem(draftBackupKey());}catch(_){} return true;
    }catch(e){console.error(e);toast(e.message||'Could not save draft','error');return false;}
    finally{busy=false;}
  }
  async function openDraft(id){
    const r=releases.find(x=>x.id===id); if(!r)return;
    const {data,error}=await sb.from('release_tracks').select('*').eq('release_id',id).order('track_number'); if(error)return toast(error.message,'error');
    draft={id:r.id,title:r.title||'',artist:r.artist_name||'',bandId:r.band_id||'',releaseType:r.release_type||'Single',genre:r.genre||'Rock',releaseDate:r.release_date||'',cLine:r.c_line||'',pLine:r.p_line||'',language:r.language||'English',prevReleased:!!r.previously_released,origDate:r.original_release_date||'',rights:!!r.rights_confirmed,territory:r.territory||'Worldwide',stores:Array.isArray(r.stores)?r.stores:[...STORES],streamingLinksText:(Array.isArray(r.streaming_links)?r.streaming_links:[]).map(x=>`${x.label||'Listen'} | ${x.url||''}`).join('\n'),artworkFile:null,artworkPreview:'',artworkPath:r.artwork_path||'',tracks:(data&&data.length?data:[null]).map(t=>t?{title:t.title==='Untitled track'?'':t.title,version:t.version||'',isrc:t.isrc||'',explicit:!!t.explicit,featured:t.featured_artists||'',writers:t.songwriters||'',lyrics:t.lyrics||'',file:null,fileName:'',path:t.audio_path||'',duration:null}:newTrack()),status:'Draft'};
    wizardStep=1; view='builder'; render();
  }
  async function submitRelease(){
    if(busy) return;
    try{
      validateBasics();
      const readiness=releaseReadiness();
      if(readiness.warnings.length)throw new Error(readiness.warnings[0]);
      const missing=readiness.checks.filter(x=>!x[1]).map(x=>x[0]);
      if(missing.length)throw new Error('Complete the release checklist first: '+missing.join(', ')+'.');
      if(!draft.releaseDate)throw new Error('Release date is required before submission.');
      if(!draft.stores.length)throw new Error('Select at least one store.');
      if(!draft.rights)throw new Error('Please confirm the rights declaration before submitting.');
      if(draft.prevReleased&&!draft.origDate)throw new Error('Add the original release date, or untick Previously released.');
      if(draft.tracks.some(t=>!(t.writers||'').trim()))throw new Error('Every track needs its songwriter / composer credit.');
      if(!draft.artworkFile&&!draft.artworkPath)throw new Error('Artwork is required.');
      if(!draft.tracks.length||draft.tracks.some(t=>!t.title.trim()||(!t.file&&!t.path)))throw new Error('Every track needs a title and audio file.');
      if(rnProblems().length)throw new Error(rnProblems()[0]);
      toast('Saving your release and checking uploaded files…');
      if(!(await saveDraft())) return;
      busy=true;
      toast('Uploading the final metadata package…');
      const releaseId=draft.id, user=session.user.id;
      const metadata={schema:'imposed-entertainment/v1',release:{title:draft.title,artist:draft.artist,releaseType:draft.releaseType,genre:draft.genre,releaseDate:draft.releaseDate,cLine:draft.cLine,pLine:draft.pLine,language:draft.language,previouslyReleased:!!draft.prevReleased,originalReleaseDate:draft.origDate||null,rightsConfirmed:!!draft.rights,territory:draft.territory,stores:draft.stores},tracks:draft.tracks.map((t,i)=>({number:i+1,title:t.title,version:t.version,isrc:t.isrc,explicit:!!t.explicit,featuredArtists:t.featured||'',songwriters:t.writers||'',lyrics:t.lyrics||'',fileName:t.fileName||(t.path||'').split('/').pop()}))};
      const metaPath=`${user}/${releaseId}/metadata.json`;
      const mu=await sb.storage.from('documents').upload(metaPath,new Blob([JSON.stringify(metadata,null,2)],{type:'application/json'}),{upsert:true,contentType:'application/json'}); if(mu.error)throw new Error('Metadata upload failed: '+mu.error.message);
      const ur=await sb.from('releases').update({artwork_path:draft.artworkPath,metadata_path:metaPath,status:'Submitted'}).eq('id',releaseId).select('id').maybeSingle(); if(ur.error)throw new Error('Could not mark submitted: '+ur.error.message); if(!ur.data)throw new Error('The release was saved but submission status was not changed. Check your access and retry.');
      const ev=await sb.from('release_events').insert({release_id:releaseId,actor_id:user,event_type:'submitted',note:'Release submitted with artwork, audio and metadata.'}); if(ev.error)console.warn('Submission event could not be recorded',ev.error);
      toast('Release submitted to Imposed Entertainment','success'); draftDirty=false; try{localStorage.removeItem(draftBackupKey());}catch(_){} await loadReleases(); view=backTarget(); draft=freshDraft(); wizardStep=1; render();
    }catch(e){console.error(e);toast(e.message||'Submission failed','error');}finally{busy=false;}
  }

  async function setStatus(id,status,note=''){const patch={status,review_note:(status==='Changes Requested'||status==='Rejected')?note:null};if(status==='Sent to distributor')patch.sent_at=new Date().toISOString();const {error}=await sb.from('releases').update(patch).eq('id',id);if(error)throw error;await sb.from('release_events').insert({release_id:id,actor_id:session.user.id,event_type:status.toLowerCase().replace(/ /g,'_'),note});await loadReleases();selected=releases.find(x=>x.id===id)||selected;toast(`Release marked ${status.toLowerCase()}`,'success');render();if(view==='release')loadTracks();if(isAdmin())await window.sendPortalEmail?.('release_status',id);}
  const safeName=x=>String(x||'').replace(/[\\/:*?"<>|]+/g,'').trim();
  const fileExt=p=>(String(p||'').split('.').pop()||'').toLowerCase();
  function metaText(r,tr){const L=['RELEASE',`Title: ${r.title}`,`Primary artist: ${r.artist_name}`,`Release type: ${r.release_type}`,`Release date: ${r.release_date||''}`,`Genre: ${r.genre||''}`,`Territory: ${r.territory||''}`,`C-line: ${r.c_line||''}`,`P-line: ${r.p_line||''}`,`Language: ${r.language||''}`,`Previously released: ${r.previously_released?'Yes, '+(r.original_release_date||''):'No'}`,`Rights confirmed: ${r.rights_confirmed?'Yes':'No'}`,'','TRACKS'];tr.forEach(t=>L.push(`${t.track_number}. ${t.title}${t.version&&t.version!=='Original'?` (${t.version})`:''} | ISRC: ${t.isrc||''} | Explicit: ${t.explicit?'Yes':'No'} | Featuring: ${t.featured_artists||''} | Writers: ${t.songwriters||''}`));return L.join('\n');}
  async function copyText(t){try{await navigator.clipboard.writeText(t);toast('Copied to clipboard','success');}catch(_){window.prompt('Copy this text',t);}}
  async function download(bucket,path,name){const {data,error}=await sb.storage.from(bucket).createSignedUrl(path,300,{download:name});if(error)throw error;const a=document.createElement('a');a.href=data.signedUrl;a.download=name;document.body.appendChild(a);a.click();a.remove();toast('Download started','success');}
  async function loadCover(){const r=selected,el=$('.detail-cover');if(!r||!r.artwork_path||!el)return;const {data}=await sb.storage.from('artwork').createSignedUrl(r.artwork_path,600);if(data&&data.signedUrl)el.innerHTML=`<img loading="lazy" decoding="async" src="${esc(data.signedUrl)}" alt="Cover art">`;}
  async function loadEvents(){ if(!selected) return; const el=$('#detail-activity'); if(!el) return; const {data}=await sb.from('release_events').select('*').eq('release_id',selected.id).order('created_at',{ascending:false}); el.innerHTML=(data||[]).map(e=>`<div class="tl-item"><i></i><div><b>${esc(isAdmin()?String(e.event_type||'').replace(/_/g,' '):(e.event_type==='sent_to_distributor'?'processing started':String(e.event_type||'').replace(/_/g,' ')))}</b>${e.note&&(isAdmin()||e.event_type!=='sent_to_distributor')?`<p>${esc(e.note)}</p>`:''}<small>${ago(e.created_at)}</small></div></div>`).join('')||'<div class="muted">No activity yet.</div>'; }
  async function loadTracks(){if(!selected)return;const el=$('#detail-tracks');if(!el)return;loadCover();const {data,error}=await sb.from('release_tracks').select('*').eq('release_id',selected.id).order('track_number');if(error){el.innerHTML=`<div class="error-box">${esc(error.message)}</div>`;return;}detailTracks=data||[];const tf=$('#tf-track');if(tf)tf.innerHTML='<option value="">Choose a track…</option>'+detailTracks.map(t=>`<option value="${esc(t.id)}">${t.track_number}. ${esc(t.title)}</option>`).join('');loadTrackFeedback();el.innerHTML=(data||[]).map((t,i)=>`<div class="track-summary"><span>${t.track_number}</span><div><b>${esc(t.title)}</b><small>${esc(t.version||'Original')} ${t.isrc?`· ${esc(t.isrc)}`:''}${t.explicit?' · Explicit':''}${t.featured_artists?` · feat. ${esc(t.featured_artists)}`:''}</small></div>${isAdmin()?`<button class=\"copy-btn\" data-action=\"copy\" data-text=\"${esc(t.title)}\">Title</button>${t.isrc?`<button class=\"copy-btn\" data-action=\"copy\" data-text=\"${esc(t.isrc)}\">ISRC</button>`:''}`:''}<span>${t.audio_path?'Audio uploaded':'No audio'}</span>${t.lyrics&& (isAdmin()||selected.owner_id===session.user.id)?`<details class="track-lyrics"><summary>Submitted lyrics</summary><pre>${esc(t.lyrics)}</pre></details>`:''}${(isAdmin()||selected.owner_id===session.user.id||selected.band_id)?`<span class="track-tools">${t.audio_path?`<button class="secondary" data-action="review-play" data-path="${esc(t.audio_path)}">Preview</button><button class="secondary" data-action="dl-audio" data-i="${i}">Download</button><button class="copy-btn" data-action="share-private-file" data-bucket="audio" data-path="${esc(t.audio_path)}">Copy 15-min link</button>`:''}<button class="copy-btn" data-action="copy" data-text="${esc(`${t.title}${t.version&&t.version!=='Original'?` (${t.version})`:''}${t.isrc?` | ISRC ${t.isrc}`:''}`)}">Copy</button></span>`:''}</div>`).join('')||'<div class="muted">No tracks.</div>'; loadEvents(); loadExtras(); loadTrackVersionHistory();}


  async function loadTrackVersionHistory(){
    const el=$('#track-version-history');if(!el||!selected)return;
    const {data,error}=await sb.from('release_track_version_history').select('id,track_id,track_number,previous_version,created_at').eq('release_id',selected.id).order('created_at',{ascending:false}).limit(50);
    if(error){el.innerHTML='<p class="muted">Version history unavailable. Apply the v30 track-history migration to enable it.</p>';return;}
    const rows=data||[];
    el.innerHTML=rows.length?rows.map(x=>{const v=x.previous_version||{};return `<div class="roster-row v30-row"><div class="release-info"><strong>${esc(x.track_number||'—')}. ${esc(v.title||'Previous track version')}</strong><span>${esc(v.version||'Original')}${v.isrc?' · ISRC '+esc(v.isrc):''} · ${dateFmt(String(x.created_at).slice(0,10))}</span><small>${v.audio_path?'Previous audio file was uploaded':'No previous audio file'}${v.duration_seconds?' · '+Math.round(Number(v.duration_seconds))+' sec':''}${v.explicit?' · Explicit':''}</small></div><span class="muted">Metadata snapshot</span></div>`}).join(''):'<p class="muted">No previous versions recorded yet. When track metadata or its audio path changes, the previous version is saved here. Existing history is not backfilled.</p>';
  }
