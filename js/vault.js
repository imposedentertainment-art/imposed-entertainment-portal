/* Private document vault backed by the existing vault bucket and vault_files table. */
let vaultFiles=[];
let vaultLoading=false;
let vaultError='';
let vaultSearch='';
let vaultLoadRequestId=0;
async function loadVaultData(){
  const requestId=++vaultLoadRequestId;
  const userId=session?.user?.id;
  if(!userId||!profile){vaultFiles=[];vaultError='';vaultLoading=false;return;}
  const labelAdmin=isAdmin();
  vaultLoading=true;vaultError='';
  try{
    let q=sb.from('vault_files').select('*').order('created_at',{ascending:false}).limit(250);
    if(!labelAdmin)q=q.eq('artist_id',userId);
    const {data,error}=await q;
    if(requestId!==vaultLoadRequestId)return;
    if(session?.user?.id!==userId){vaultFiles=[];vaultError='';return;}
    if(error)throw error;
    vaultFiles=Array.isArray(data)?data:[];
  }catch(e){
    if(requestId!==vaultLoadRequestId)return;
    if(session?.user?.id!==userId){vaultFiles=[];vaultError='';return;}
    vaultError=e.message||'Could not load your private files.';
    vaultFiles=[];
  }finally{
    if(requestId===vaultLoadRequestId)vaultLoading=false;
  }
}
function vaultView(){
  const visible=vaultFiles.filter(f=>!vaultSearch||`${f.name||''} ${f.kind||''}`.toLowerCase().includes(vaultSearch.toLowerCase()));
  const artistOptions=isAdmin()?`<label class="field"><span>Store for artist</span><select id="vault-artist"><option value="">Choose artist…</option>${users.filter(u=>!isAdminRole(u.role)).map(u=>`<option value="${esc(u.id)}">${esc(u.display_name||u.full_name||u.email)}</option>`).join('')}</select></label>`:'';
  const total=vaultFiles.reduce((n,f)=>n+Number(f.size||0),0);
  const rows=visible.map(f=>`<article class="vault-file-row"><div class="vault-file-icon">${icon('file',21)}</div><div class="vault-file-copy"><strong>${esc(f.name||'Untitled file')}</strong><span>${esc(f.kind||'Document')} · ${fmtMB(Number(f.size||0))} · ${dateFmt(String(f.created_at||'').slice(0,10))}${isAdmin()?` · ${esc(users.find(u=>u.id===f.artist_id)?.display_name||'Artist')}`:''}</span></div><div class="row-actions"><button class="secondary mini" data-action="vault-download" data-id="${esc(f.id)}">Download</button>${(isAdmin()||f.uploaded_by===session.user.id)?`<button class="icon-btn danger-ghost" data-action="vault-delete" data-id="${esc(f.id)}" aria-label="Delete ${esc(f.name)}" title="Delete">×</button>`:''}</div></article>`).join('');
  return `<section class="page fade vault-page"><div class="page-heading"><p class="eyebrow">PRIVATE WORKSPACE</p><h1>File vault</h1><p class="sub">Keep contracts, artwork briefs, split sheets and other working documents together. Files stay private behind Supabase access policies.</p></div><div class="metrics"><div class="metric"><span>Files</span><strong>${vaultFiles.length}</strong><small>Saved in your vault</small></div><div class="metric"><span>Stored size</span><strong>${fmtMB(total)}</strong><small>Metadata total for visible files</small></div><div class="metric"><span>Access</span><strong>${isAdmin()?'Label + artists':'Private'}</strong><small>${isAdmin()?'Label team can manage files':'Only you and authorised label admins'}</small></div></div><div class="card vault-upload-card"><div><p class="eyebrow">ADD A FILE</p><h2>Upload to the vault</h2><p class="muted">Maximum 50 MB per file. Avoid uploading payment-card data or passwords.</p></div><div class="vault-upload-form">${artistOptions}<label class="field"><span>File</span><input id="vault-file" type="file" required></label><button class="primary" data-action="vault-upload">${icon('upload',16)} Upload file</button></div></div><div class="card vault-list-card"><div class="section-head"><div><h2>Your files</h2><p class="muted">Download links expire automatically after a short period.</p></div><input id="vault-search" class="vault-search" value="${esc(vaultSearch)}" placeholder="Search files…" aria-label="Search vault files"></div>${vaultError?`<div class="error-box">${esc(vaultError)}</div>`:''}${vaultLoading?'<p class="muted">Loading files…</p>':rows||`<div class="empty"><div class="empty-icon">${icon('file',24)}</div><h3>${vaultSearch?'No matching files':'Your vault is empty'}</h3><p>${vaultSearch?'Try a different search.':'Upload a document to make it available here.'}</p></div>`}</div></section>`;
}
async function uploadVaultFile(){
  const input=$('#vault-file'),file=input?.files?.[0];if(!file)throw new Error('Choose a file first.');if(file.size>50*1048576)throw new Error('Files must be 50 MB or smaller.');
  const artistId=isAdmin()?$('#vault-artist')?.value:session.user.id;if(!artistId)throw new Error('Choose which artist should own this file.');
  const safeName=String(file.name||'file').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-120)||'file';
  const path=`${artistId}/${crypto.randomUUID()}-${safeName}`;
  const {error:upError}=await sb.storage.from('vault').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});if(upError)throw upError;
  const {error:rowError}=await sb.from('vault_files').insert({artist_id:artistId,name:file.name,path,size:file.size,kind:file.type||'Document',uploaded_by:session.user.id});
  if(rowError){await sb.storage.from('vault').remove([path]);throw rowError;}
  vaultSearch='';await Promise.all([loadVaultData(),loadNotes()]);toast('File uploaded to your private vault.','success');render();
}
async function downloadVaultFile(id){const f=vaultFiles.find(x=>String(x.id)===String(id));if(!f)throw new Error('File not found. Refresh the vault and try again.');const {data,error}=await sb.storage.from('vault').createSignedUrl(f.path,300,{download:f.name||true});if(error)throw error;if(!data?.signedUrl)throw new Error('Could not create a secure download link.');const a=document.createElement('a');a.href=data.signedUrl;a.target='_blank';a.rel='noopener noreferrer';a.click();}
async function deleteVaultFile(id){const f=vaultFiles.find(x=>String(x.id)===String(id));if(!f)throw new Error('File not found.');if(!confirm(`Delete “${f.name}” permanently?`))return;const {error:storageError}=await sb.storage.from('vault').remove([f.path]);if(storageError)throw storageError;const {error}=await sb.from('vault_files').delete().eq('id',f.id);if(error)throw error;await loadVaultData();toast('File deleted.','success');render();}
