/* Discography: every release an artist has (drafts included) in one place, with stats.
   Artists see their own and their bands' releases (band releases are view-only for non-owners).
   Label members see everyone's, grouped by artist. Stats live in release_stats: the label writes, artists read.
   Also holds release cover thumbnails (signed URLs) and the four-step progress strip. */
  let relStats = [], allTracks = [], discFilter = 'All', discQ = '', discSort = 'updated', backView = 'dashboard';
  const discCovers = {};
  const DISC_BUCKETS = [
    { key: 'Changes requested', test: r => r.status === 'Changes Requested', note: 'The label asked for changes. Edit and resubmit.' },
    { key: 'Drafts', test: r => r.status === 'Draft', note: 'Saved, not submitted yet. Pick one up where you left off.' },
    { key: 'In review', test: r => ['Submitted', 'Approved', 'Sent to distributor'].includes(r.status), note: 'With the label team.' },
    { key: 'Live', test: r => r.status === 'Live', note: 'Out in the world.' },
    { key: 'Rejected', test: r => r.status === 'Rejected', note: '' }
  ];
  const nfmt = n => formatNumber(n);
  const ncompact = n => new Intl.NumberFormat(currentLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n || 0));
  const periodLabel = p => new Date(p + 'T12:00:00').toLocaleDateString(currentLocale(), { month: 'short', year: '2-digit' });
  const isDiscAction = a => a === 'discography' || a.startsWith('disc-') || a.startsWith('stat-') || a === 'export-stats' || a === 'export-performance';
  const backTarget = () => ['discography','calendar'].includes(backView) ? backView : 'dashboard';

  async function loadStats() { const r = await sb.from('release_stats').select('*').order('period', { ascending: false }); relStats = r.data || []; }

  /* One number per period: an "All platforms" row wins, otherwise platform rows add up.
     Listeners only come from "All platforms" rows because they overlap across platforms. */
  function statPeriods(id) {
    const by = {};
    relStats.filter(x => x.release_id === id).forEach(x => { (by[x.period] = by[x.period] || []).push(x); });
    return Object.keys(by).sort().map(p => {
      const rows = by[p], all = rows.find(x => x.platform === 'All platforms'), src = all ? [all] : rows;
      return { period: p, streams: src.reduce((t, x) => t + Number(x.streams || 0), 0), saves: src.reduce((t, x) => t + Number(x.saves || 0), 0), listeners: all && all.listeners != null ? Number(all.listeners) : null };
    });
  }
  function relTotals(id) {
    const p = statPeriods(id), l = [...p].reverse().find(x => x.listeners != null);
    return { periods: p, streams: p.reduce((t, x) => t + x.streams, 0), saves: p.reduce((t, x) => t + x.saves, 0), listeners: l ? l.listeners : null };
  }
  const relEarned = id => earnings.filter(x => x.release_id === id).reduce((t, x) => t + Number(x.amount || 0), 0);

  /* Four-step progress: Files, Details, Review, Live */
  const hasAudio = r => { const t = allTracks.filter(x => x.release_id === r.id); return t.length > 0 && t.every(x => x.audio_path); };
  const metaDone = r => !!(r.title && r.artist_name && r.release_date && r.c_line && r.p_line && Array.isArray(r.stores) && r.stores.length);
  function relSteps(r) {
    const flags = [hasAudio(r) && !!r.artwork_path, metaDone(r), ['Approved', 'Sent to distributor', 'Live'].includes(r.status), r.status === 'Live'];
    const names = ['Files', 'Details', 'Review', 'Live'], cur = flags.indexOf(false);
    return `<div class="steps" role="img" aria-label="Progress: ${names.filter((n, i) => flags[i]).join(', ') || 'not started'}">${names.map((n, i) => `<span class="st ${flags[i] ? 'done' : i === cur ? 'cur' : ''}"><i>${flags[i] ? icon('check', 9) : ''}</i>${n}</span>`).join('')}</div>`;
  }

  /* Cover thumbnails: resolve only rendered cards and use constant-time release lookups. */
  const coverHtml = r => { const c = r.artwork_path && discCovers[r.artwork_path]; return c ? `<img loading="lazy" decoding="async" src="${esc(c.url)}" alt="">` : icon('disc', 22); };
  let coverHydrationPromise = null;
  async function hydrateCovers() {
    if (!sb || !session) return;
    const nodes = Array.from(document.querySelectorAll('[data-cover]'));
    if (!nodes.length) return;
    const releaseById = new Map(releases.map(r => [String(r.id), r]));
    const stale = Date.now() - 50 * 60 * 1000;
    const paths = [...new Set(nodes.map(el => releaseById.get(String(el.dataset.cover))).filter(r => r && r.artwork_path && !(discCovers[r.artwork_path] && discCovers[r.artwork_path].t > stale)).map(r => r.artwork_path))];
    if (paths.length) {
      if (coverHydrationPromise) {
        await coverHydrationPromise;
      } else {
        coverHydrationPromise = sb.storage.from('artwork').createSignedUrls(paths, 3600);
        try {
          const { data, error } = await coverHydrationPromise;
          if (error || !data) return;
          const timestamp = Date.now();
          data.forEach(d => { if (d.signedUrl) discCovers[d.path] = { url: d.signedUrl, t: timestamp }; });
        } finally { coverHydrationPromise = null; }
      }
    }
    nodes.forEach(el => {
      if (!el.isConnected || el.querySelector('img')) return;
      const release = releaseById.get(String(el.dataset.cover));
      if (release?.artwork_path && discCovers[release.artwork_path]) el.innerHTML = coverHtml(release);
    });
  }

  function discCard(r) {
    const own = r.owner_id === session.user.id, t = relTotals(r.id), e = relEarned(r.id), st = statusLabel(r.status);
    const editable = !isAdmin() && own && ['Draft', 'Changes Requested'].includes(r.status);
    const stat = (t.streams || e)
      ? `<div class="disc-stats"><span><b>${nfmt(t.streams)}</b> streams</span>${t.saves ? `<span><b>${nfmt(t.saves)}</b> saves</span>` : ''}${e ? `<span><b>${money(e)}</b> earned</span>` : ''}</div>`
      : (r.status === 'Live' ? '<div class="disc-stats muted">No stats added yet</div>' : '');
    const acts = [];
    if (editable) acts.push(`<button class="primary" data-action="disc-edit" data-release="${r.id}">${icon('edit', 15)} ${r.status === 'Draft' ? 'Continue editing' : 'Edit &amp; resubmit'}</button>`);
    acts.push(`<button class="secondary" data-action="disc-open" data-release="${r.id}">${icon('eye', 15)} ${editable ? 'Details' : 'Open'}</button>`);
    if (isAdmin() && r.status === 'Live') acts.push(`<button class="secondary" data-action="disc-stats" data-release="${r.id}">Add stats</button>`);
    if (!isAdmin() && !editable && ['Submitted', 'Approved', 'Sent to distributor', 'Live'].includes(r.status)) acts.push(`<button class="secondary" data-action="disc-request" data-release="${r.id}">Request update</button>`);
    if (!isAdmin() && own && r.status === 'Draft') acts.push(`<button class="icon-btn danger-ghost" data-action="disc-del" data-release="${r.id}" title="Delete draft" aria-label="Delete draft">${icon('trash', 16)}</button>`);
    return `<article class="disc-card"><button class="disc-cover" data-action="disc-open" data-release="${r.id}" data-cover="${r.id}" aria-label="Open ${esc(r.title)}">${coverHtml(r)}</button><div class="disc-body"><div class="disc-top"><span class="pill ${statusClass(r.status)}">${esc(st)}</span><small>${esc(r.release_type)} · ${dateFmt(r.release_date)}</small></div><h3 data-no-translate>${esc(r.title)}</h3><p class="disc-artist" data-no-translate>${esc(r.artist_name)}</p>${r.status === 'Changes Requested' && r.review_note ? `<p class="review-note">${esc(r.review_note)}</p>` : ''}${stat}${relSteps(r)}<div class="disc-actions">${acts.join('')}</div></div></article>`;
  }

  function discography() {
    const q = discQ.trim().toLocaleLowerCase(currentLocale());
    const searchable = r => [r.title, r.artist_name, r.genre, r.release_type, r.status, r.language, r.release_date, ...(Array.isArray(r.stores) ? r.stores : [])].filter(Boolean).join(' ').toLocaleLowerCase(currentLocale());
    const base = releases.filter(r => !q || searchable(r).includes(q));
    const counts = {}; DISC_BUCKETS.forEach(b => counts[b.key] = base.filter(b.test).length);
    const chips = ['All', ...DISC_BUCKETS.filter(b => counts[b.key] || b.key === discFilter).map(b => b.key)];
    const buckets = DISC_BUCKETS.filter(b => discFilter === 'All' || b.key === discFilter);
    const byDate = (a, b) => (b.release_date || '').localeCompare(a.release_date || '');
    const byEdit = (a, b) => String(b.updated_at || b.release_date || '').localeCompare(String(a.updated_at || a.release_date || ''));
    const byTitle = (a, b) => String(a.title || '').localeCompare(String(b.title || ''), currentLocale(), { sensitivity: 'base' });
    const byStreams = (a, b) => relTotals(b.id).streams - relTotals(a.id).streams || byTitle(a, b);
    const sortReleases = rs => rs.sort(discSort === 'date' ? byDate : discSort === 'title' ? byTitle : discSort === 'streams' ? byStreams : byEdit);
    const streams = releases.reduce((t, r) => t + relTotals(r.id).streams, 0), earned = releases.reduce((t, r) => t + relEarned(r.id), 0);
    const drafts = releases.filter(r => r.status === 'Draft').length, live = releases.filter(r => r.status === 'Live').length;
    let body = '';
    if (isAdmin()) {
      const picked = base.filter(r => buckets.some(b => b.test(r)));
      const artists = [...new Set(picked.map(r => r.artist_name))].sort((a, b) => String(a).localeCompare(String(b)));
      body = artists.map(a => { const rs = sortReleases(picked.filter(r => r.artist_name === a)), s = rs.reduce((t, r) => t + relTotals(r.id).streams, 0); return `<div class="section-head"><div><h2 data-no-translate>${esc(a)}</h2><p class="sub">${rs.length} release${rs.length === 1 ? '' : 's'}${s ? ' · ' + nfmt(s) + ' streams' : ''}</p></div></div><div class="disc-grid">${rs.map(discCard).join('')}</div>`; }).join('');
    } else {
      body = buckets.map(b => { const rs = sortReleases(base.filter(b.test)); return rs.length ? `<div class="section-head"><div><h2>${b.key}</h2>${b.note ? `<p class="sub">${b.note}</p>` : ''}</div></div><div class="disc-grid">${rs.map(discCard).join('')}</div>` : ''; }).join('');
    }
    if (!body) body = `<div class="empty"><div class="empty-icon">${icon('disc', 25)}</div><h3>${releases.length ? 'Nothing matches' : 'No releases yet'}</h3><p>${releases.length ? 'Try a different filter or search.' : (isAdmin() ? 'Releases appear here as artists create them.' : 'Create your first release and it will live here, drafts and all.')}</p>${!releases.length && !isAdmin() ? `<button class="primary" data-action="new">${icon('plus', 16)} Create release</button>` : ''}</div>`;
    return `<section class="page fade"><div class="hero-row"><div><p class="eyebrow">${isAdmin() ? 'LABEL' : 'ARTIST PORTAL'}</p><h1>Discography</h1><p class="sub">${isAdmin() ? 'Every artist\'s catalogue, with stats you add after release.' : 'Every release you have, drafts included. Pick up a draft, check a release, see how it is doing.'}</p></div>${isAdmin() ? '' : `<button class="primary large" data-action="new">${icon('plus', 18)} Create release</button>`}</div><div class="metrics"><div class="metric"><span>Releases</span><strong>${releases.length}</strong><small>${isAdmin() ? 'Across all artists' : (drafts ? drafts + ' draft' + (drafts === 1 ? '' : 's') : 'Your catalogue')}</small></div><div class="metric"><span>Live</span><strong>${live}</strong><small>Released</small></div><div class="metric"><span>Streams</span><strong>${nfmt(streams)}</strong><small>${relStats.length ? 'Reported by the label' : 'No stats yet'}</small></div><div class="metric"><span>Earned</span><strong>${money(earned)}</strong><small>All statements</small></div></div><div class="section-head release-head"><div class="chips" style="margin:0">${chips.map(f => `<button class="chip ${discFilter === f ? 'active' : ''}" data-action="disc-filter" data-f="${esc(f)}">${esc(f)}${f !== 'All' && counts[f] != null ? ' ' + counts[f] : ''}</button>`).join('')}</div><div class="disc-tools"><div class="search disc-search-box">${icon('search', 16)}<input id="disc-search" value="${esc(discQ)}" placeholder="Title, artist, genre, status..." aria-label="Search titles, artists, genres, release types, status, language and stores">${discQ ? `<button class="disc-clear-search" data-action="disc-search-clear" aria-label="Clear release search" title="Clear search">${icon('x', 14)}</button>` : ''}</div><p class="disc-result-count" aria-live="polite">${q ? `${base.length} matching` : `${releases.length} total`} release${(q ? base.length : releases.length) === 1 ? '' : 's'}</p><label class="disc-sort-label" for="disc-sort">Sort by<select id="disc-sort" class="disc-sort"><option value="updated" ${discSort === 'updated' ? 'selected' : ''}>Recently updated</option><option value="date" ${discSort === 'date' ? 'selected' : ''}>Release date</option><option value="title" ${discSort === 'title' ? 'selected' : ''}>Title A–Z</option><option value="streams" ${discSort === 'streams' ? 'selected' : ''}>Most streams</option></select></label></div></div>${body}${relStats.length ? '<p class="report-actions" style="margin-top:20px"><button class="secondary" data-action="export-stats">Export all reported stats CSV</button><button class="secondary" data-action="export-performance">Export performance summary CSV</button></p>' : ''}</section>`;
  }

  /* Stats card on the release page */
  function statsCard(r) {
    const has = relStats.some(x => x.release_id === r.id);
    if (!(r.status === 'Live' || has || (isAdmin() && r.status === 'Sent to distributor'))) return '';
    return `<div class="detail-card card" id="detail-stats">${statsInner(r)}</div>`;
  }
  function statsInner(r) {
    const t = relTotals(r.id), e = relEarned(r.id), recent = t.periods.slice(-12), max = Math.max(1, ...recent.map(p => p.streams));
    const last=recent[recent.length-1], prev=recent[recent.length-2], delta=last&&prev?last.streams-prev.streams:null, pct=delta!==null&&prev.streams>0?Math.round(delta/prev.streams*100):null;
    const rows = relStats.filter(x => x.release_id === r.id).sort((a, b) => b.period.localeCompare(a.period) || a.platform.localeCompare(b.platform)).slice(0, 40);
    const chart = recent.length ? `<div class="sbars" role="img" aria-label="Streams per period">${recent.map(p => `<div class="sbar" title="${esc(periodLabel(p.period))}: ${nfmt(p.streams)} streams"><b>${ncompact(p.streams)}</b><i style="height:${Math.max(3, p.streams / max * 100)}%"></i><small>${esc(periodLabel(p.period))}</small></div>`).join('')}</div>` : '';
    const form = isAdmin() ? `<div class="invite-form stat-form"><label class="field"><span>Period starts</span><input id="st-period" type="date"></label><label class="field"><span>Platform</span><select id="st-platform"><option>All platforms</option>${STORES.map(s => `<option>${esc(s)}</option>`).join('')}</select></label><label class="field"><span>Streams</span><input id="st-streams" type="number" min="0" step="1" placeholder="0"></label><label class="field"><span>Listeners</span><input id="st-listeners" type="number" min="0" step="1" placeholder="Optional"></label><label class="field"><span>Saves</span><input id="st-saves" type="number" min="0" step="1" placeholder="Optional"></label><button class="primary" data-action="stat-add" data-release="${r.id}">Save stats</button></div><small class="muted">One row per release, date and platform. Saving the same combination again replaces it. If a date has an All platforms row, that row is used for the total.</small>` : '';
    return `<h3>Stats</h3>${rows.length ? `<div class="stat-tiles"><div><span>Streams</span><b>${nfmt(t.streams)}</b></div><div><span>Saves</span><b>${nfmt(t.saves)}</b></div><div><span>Listeners</span><b>${t.listeners != null ? nfmt(t.listeners) : '—'}</b><small>latest period</small></div><div><span>Earned</span><b>${money(e)}</b></div></div>${chart}${last?`<div class="comparison-strip"><div><small>Latest period</small><b>${esc(periodLabel(last.period))} · ${nfmt(last.streams)} streams</b></div>${prev?`<div><small>Previous period</small><b>${esc(periodLabel(prev.period))} · ${nfmt(prev.streams)} streams</b></div><div><small>Change</small><b class="${delta>0?'positive':delta<0?'negative':''}">${delta>0?'+':''}${nfmt(delta)}${pct!==null?' ('+(pct>0?'+':'')+pct+'%)':''}</b></div>`:''}</div>`:''}<div class="stat-rows">${rows.map(x => `<div class="roster-row"><div class="release-info"><strong>${esc(dateFmt(x.period))} · ${esc(x.platform)}</strong><span>${nfmt(x.streams)} streams${x.listeners != null ? ' · ' + nfmt(x.listeners) + ' listeners' : ''}${x.saves != null ? ' · ' + nfmt(x.saves) + ' saves' : ''}</span></div>${isAdmin() ? `<button class="icon-btn" data-action="stat-del" data-id="${esc(x.id)}" title="Delete" aria-label="Delete stats row">&#10005;</button>` : ''}</div>`).join('')}</div>` : `<div class="muted">${isAdmin() ? 'No stats yet. Add the first period below.' : 'No stats yet. The label adds them once your release is out.'}</div>`}${form}`;
  }
  function refreshStats() { const el = $('#detail-stats'); if (el && selected) { el.innerHTML = statsInner(selected); bind(); } }

  async function purgeDraftFiles(r) {
    for (const bucket of ['artwork', 'audio', 'documents']) {
      try { const dir = `${r.owner_id}/${r.id}`; const { data } = await sb.storage.from(bucket).list(dir); if (data && data.length) await sb.storage.from(bucket).remove(data.map(f => `${dir}/${f.name}`)); } catch (_) { /* best effort */ }
    }
  }

  async function discAction(a, el) {
    const id = el && el.dataset.release, r = id ? releases.find(x => x.id === id) : null;
    if (a === 'discography') { view = 'discography'; mobile = false; render(); }
    else if (a === 'disc-search-clear') { discQ = ''; view = 'discography'; mobile = false; render(); const search = $('#disc-search'); if (search) search.focus(); }
    else if (a === 'disc-filter') { discFilter = el.dataset.f; view = 'discography'; mobile = false; render(); }
    else if (a === 'disc-open' || a === 'disc-stats') {
      if (!r) return; selected = r; backView = 'discography'; view = 'release'; mobile = false; render(); loadTracks();
      if (a === 'disc-stats') setTimeout(() => { const s = $('#detail-stats'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    }
    else if (a === 'disc-edit') { if (!r) return; if (view === 'discography') backView = 'discography'; mobile = false; await openDraft(r.id); }
    else if (a === 'disc-dup') {
      if (!r || r.owner_id !== session.user.id) return;
      const ins = await sb.from('releases').insert({ owner_id: session.user.id, band_id: r.band_id, title: r.title + ' (copy)', artist_name: r.artist_name, release_type: r.release_type, genre: r.genre, c_line: r.c_line, p_line: r.p_line, territory: r.territory, stores: r.stores, language: r.language, status: 'Draft' }).select().single(); if (ins.error) throw ins.error;
      const tr = await sb.from('release_tracks').select('*').eq('release_id', r.id).order('track_number');
      if (tr.data && tr.data.length) await sb.from('release_tracks').insert(tr.data.map(t => ({ release_id: ins.data.id, track_number: t.track_number, title: t.title, version: t.version, isrc: '', explicit: t.explicit, featured_artists: t.featured_artists, songwriters: t.songwriters })));
      await loadReleases(); toast('Copied as a draft. Add audio and artwork, then submit.', 'success'); backView = 'discography'; await openDraft(ins.data.id);
    }
    else if (a === 'disc-del') {
      if (!r || r.status !== 'Draft' || r.owner_id !== session.user.id) return;
      if (!confirm(`Delete the draft "${r.title}"? This cannot be undone.`)) return;
      const { data, error } = await sb.from('releases').delete().eq('id', r.id).eq('status', 'Draft').select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('That draft could not be deleted. It may have been submitted already.');
      await purgeDraftFiles(r); await loadReleases(); toast('Draft deleted', 'success'); render();
    }
    else if (a === 'disc-request') {
      if (!r) return;
      const v = await modal({ title: 'Request an update', sub: `Tell the label what should change on "${r.title}". They get it as a comment and can reopen the release for you to edit.`, fields: [{ label: 'What should change?', area: true, required: true, max: 600 }], ok: 'Send to label' });
      if (!v) return;
      const { error } = await sb.from('release_comments').insert({ release_id: r.id, author_id: session.user.id, body: 'Update request: ' + v[0] }); if (error) throw error;
      await sb.from('release_events').insert({ release_id: r.id, actor_id: session.user.id, event_type: 'update_requested', note: v[0] });
      toast('Sent to the label', 'success'); if (view === 'release') loadExtras();
    }
    else if (a === 'stat-add') {
      const period = $('#st-period').value; if (!period) throw new Error('Pick the date the period starts.');
      const num = q => { const v = $(q).value.trim(); if (v === '') return null; const n = Number(v); if (!Number.isInteger(n) || n < 0) throw new Error('Stats must be whole numbers, zero or more.'); return n; };
      const streams = num('#st-streams'); if (streams === null) throw new Error('Enter the stream count.');
      const row = { release_id: el.dataset.release, period, platform: $('#st-platform').value, streams, listeners: num('#st-listeners'), saves: num('#st-saves'), created_by: session.user.id };
      const { error } = await sb.from('release_stats').upsert(row, { onConflict: 'release_id,period,platform' }); if (error) throw error;
      await loadStats(); refreshStats(); toast('Stats saved', 'success');
    }
    else if (a === 'stat-del') {
      if (!confirm('Delete this stats row?')) return;
      const { error } = await sb.from('release_stats').delete().eq('id', el.dataset.id); if (error) throw error;
      await loadStats(); refreshStats();
    }
    else if (a === 'export-stats') {
      dlText('imposed-stats.csv', csvText([['Release', 'Artist', 'Period', 'Platform', 'Streams', 'Listeners', 'Saves'], ...relStats.map(x => { const rel = releases.find(y => y.id === x.release_id); return [rel ? rel.title : '', rel ? rel.artist_name : '', x.period, x.platform, x.streams, x.listeners, x.saves]; })]));
    }
    else if (a === 'export-performance') {
      const rows=[['Release','Artist','Status','Latest period','Latest streams','Previous period','Previous streams','Stream change','Stream change %','Latest saves','Latest listeners']];
      releases.forEach(r=>{const t=relTotals(r.id),p=t.periods||[],last=p[p.length-1],prev=p[p.length-2];if(!last)return;const delta=prev?last.streams-prev.streams:null,pct=prev&&prev.streams>0?Math.round(delta/prev.streams*100):null;rows.push([r.title,r.artist_name,r.status,last.period,last.streams,prev?.period||'',prev?.streams??'',delta??'',pct===null?'':pct+'%',last.saves??'',last.listeners??'']);});
      dlText('imposed-performance-summary.csv',csvText(rows));
    }
  }

  function bindDiscography() {
    const s = $('#disc-search'), sort = $('#disc-sort');
    if (sort) sort.onchange = e => { discSort = e.target.value; render(); };
    if (!s) return;
    s.oninput = e => { discQ = e.target.value; const p = e.target.selectionStart; clearTimeout(window.__dt); window.__dt = setTimeout(() => { render(); const n = $('#disc-search'); if (n) { n.focus(); n.setSelectionRange(p, p); } }, 140); };
  }
