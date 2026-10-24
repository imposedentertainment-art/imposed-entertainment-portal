/* Rollout tasks UI helpers, loadReleases/loadInvites, invite-link reader */
  let tasks=[];
  // Track partial backend failures separately so empty states never masquerade as successful loads.
  let workspaceDataWarnings = {};
  function setWorkspaceDataWarning(key, message) {
    if (message) workspaceDataWarnings[key] = message;
    else delete workspaceDataWarnings[key];
  }
  const taskMine=t=>isAdmin()?t.assignee==='label':t.assignee==='artist';
  function taskRow(t,show){const od=!t.done&&t.due_date&&t.due_date<localDateKey();const rel=releases.find(r=>r.id===t.release_id);return `<label class="task-row${t.done?' done':''}" style="display:flex;gap:10px;align-items:center;padding:8px 0"><input type="checkbox" data-task="${t.id}" ${t.done?'checked':''}><span style="flex:1">${esc(t.title)}${show&&rel?` <small>· ${esc(rel.title)}</small>`:''}<br><small>${t.assignee==='label'?'Label':'Artist'}${t.priority&&t.priority!=='normal'?` · ${esc(t.priority)} priority`:''}</small></span><small style="${od?'color:var(--red);font-weight:600':''}">${t.due_date?dateFmt(t.due_date):''}${od?' overdue':''}</small></label>`;}
  function todoCard(){const lim=localDateKey(new Date(Date.now()+7*864e5));const list=tasks.filter(t=>!t.done&&t.due_date&&taskMine(t)&&(isAdmin()||t.due_date<=lim)).sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,12);return `<div class="card dashboard-todo" style="margin:16px 0;padding:18px 20px"><h3>${isAdmin()?'Due across the catalogue':'Your to-do, next 7 days'}</h3>${list.length?list.map(t=>taskRow(t,true)).join(''):'<p class="sub">Nothing due.</p>'}</div>`;}
  const CAMPAIGN_TEMPLATES={Single:[['Confirm master and final mix',-35,'artist','high'],['Approve artwork and credits',-28,'label','high'],['Prepare pre-save and smart links',-21,'label','normal'],['Prepare launch-week content',-14,'artist','normal'],['Final metadata and rights check',-7,'label','urgent'],['Release-day availability check',0,'label','high'],['Collect first-week performance',7,'label','low']],EP:[['Lock tracklist and masters',-56,'artist','high'],['Approve artwork and credits',-42,'label','high'],['Confirm metadata and rights',-35,'label','urgent'],['Prepare pre-save and smart links',-28,'label','normal'],['Plan short-form campaign',-21,'artist','normal'],['Final release QA',-7,'label','urgent'],['Release-day availability check',0,'label','high'],['Collect first-week performance',7,'label','low']],Album:[['Lock tracklist and masters',-84,'artist','high'],['Confirm features, writers and splits',-70,'artist','high'],['Approve artwork and credits',-56,'label','high'],['Confirm metadata and rights',-49,'label','urgent'],['Plan singles and campaign milestones',-42,'label','high'],['Prepare pre-save and smart links',-28,'label','normal'],['Schedule launch content',-21,'artist','normal'],['Final release QA',-7,'label','urgent'],['Release-day availability check',0,'label','high'],['Collect first-month performance',30,'label','low']]};
  function rolloutCard(r){const l=tasks.filter(t=>t.release_id===r.id);const can=isAdmin()||r.owner_id===session.user.id;const opts=['Single','EP','Album'].map(k=>`<button class="secondary small" data-action="campaign-template" data-release="${r.id}" data-template="${k}">${k} template</button>`).join('');return `<div class="detail-card card"><div class="section-head"><div><h3>Release campaign</h3><p class="muted">${l.filter(t=>t.done).length} of ${l.length} tasks complete</p></div></div>${l.length?l.map(t=>taskRow(t,false)).join(''):'<p class="muted">No campaign checklist yet. Start from a reusable template.</p>'}${can?`<div class="campaign-template-actions"><span class="muted">Add checklist</span>${opts}</div>`:''}</div>`;}
  async function loadReleases(){
    // Run each catalogue query independently: a network rejection in the task or track
    // query must not discard a successful release catalogue response.
    const results=await Promise.allSettled([
      sb.from('releases').select('*').order('updated_at',{ascending:false}),
      sb.from('release_tasks').select('*').order('sort'),
      sb.from('release_tracks').select('id,release_id,audio_path,track_number,isrc,title')
    ]);
    const [releaseResult,taskResult,trackResult]=results;
    const releaseResponse=releaseResult.status==='fulfilled'?releaseResult.value:null;
    if(releaseResult.status==='rejected'||releaseResponse?.error){
      setWorkspaceDataWarning('releases','Release catalogue could not load. Check your connection and retry workspace data.');
      throw releaseResult.status==='rejected'?releaseResult.reason:releaseResponse.error;
    }
    releases=releaseResponse.data||[];
    setWorkspaceDataWarning('releases',null);
    const taskResponse=taskResult.status==='fulfilled'?taskResult.value:null;
    if(taskResult.status==='rejected'||taskResponse?.error){
      tasks=[];
      setWorkspaceDataWarning('tasks','Campaign tasks could not load, so task counts and calendars may be incomplete.');
    }else{
      tasks=taskResponse.data||[];
      setWorkspaceDataWarning('tasks',null);
    }
    const trackResponse=trackResult.status==='fulfilled'?trackResult.value:null;
    if(trackResult.status==='rejected'||trackResponse?.error){
      allTracks=[];
      setWorkspaceDataWarning('tracks','Track metadata could not load. Release audio and track tools may be incomplete.');
    }else{
      allTracks=trackResponse.data||[];
      setWorkspaceDataWarning('tracks',null);
    }
  }
  async function loadInvites(){ const {data,error}=await sb.from('invites').select('*').order('created_at',{ascending:false}); if(error){setWorkspaceDataWarning('invites','Invite records could not load. Invite management may be incomplete.');throw error;} invites=data||[];setWorkspaceDataWarning('invites',null); }
  async function readInviteFromUrl(){ const code=new URLSearchParams(location.search).get('invite'); if(!code) return; const {data}=await sb.rpc('get_invite',{p_code:code}); const row=Array.isArray(data)?data[0]:data; if(row&&row.email){ invite={code,email:row.email,artist_name:row.artist_name||'',role:row.role}; authMode='signup'; } else toast('This invite link is invalid or has expired.','error'); }
