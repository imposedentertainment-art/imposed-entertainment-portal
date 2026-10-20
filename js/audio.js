/* Audio file checks and RouteNote style checks. No RouteNote API is used. */
async function checkAudio(f){
  const ext=(f.name.split('.').pop()||'').toLowerCase();
  if(!['flac','mp3'].includes(ext)) return 'Only stereo FLAC or MP3 files are accepted. Convert other formats first.';
  if(f.size===0) return 'This audio file is empty.';
  if(f.size>MAX_FILE) return `Audio file is ${fmtMB(f.size)}. The limit is 50 MB per file. Use MP3 320 or a shorter FLAC.`;
  const b=new Uint8Array(await f.slice(0,65536).arrayBuffer());
  const tag=(x,n)=>String.fromCharCode(...x.slice(0,n));
  if(ext==='flac'){
    if(tag(b,4)!=='fLaC') return 'This does not look like a valid FLAC file.';
    if(b.length<42 || (b[4]&127)!==0) return 'Could not read the FLAC STREAMINFO header.';
    const sr=(b[18]<<12)|(b[19]<<4)|(b[20]>>4);
    const ch=((b[20]>>1)&7)+1;
    const bits=(((b[20]&1)<<4)|(b[21]>>4))+1;
    if(sr!==44100) return `FLAC sample rate is ${sr} Hz. Audio must be 44.1 kHz.`;
    if(bits!==16) return `FLAC is ${bits}-bit. FLAC must be 16-bit.`;
    if(ch!==2) return 'Audio must be stereo.';
    return '';
  }
  let h=b;
  if(tag(b,3)==='ID3'){
    if(b.length<10) return 'This MP3 has an incomplete ID3 header.';
    const off=10+(((b[6]&127)<<21)|((b[7]&127)<<14)|((b[8]&127)<<7)|(b[9]&127));
    h=new Uint8Array(await f.slice(off,off+16384).arrayBuffer());
  }
  let k=0;
  while(k<h.length-4&&!(h[k]===255&&(h[k+1]&224)===224)) k++;
  if(k>=h.length-4) return 'Could not find a readable MP3 frame. Check or re-export the file.';
  const version=(h[k+1]>>3)&3, layer=(h[k+1]>>1)&3, bitrateIndex=(h[k+2]>>4)&15, sampleIndex=(h[k+2]>>2)&3, channelMode=(h[k+3]>>6)&3;
  if(version!==3||layer!==1) return 'MP3 must be MPEG-1 Layer III.';
  if(bitrateIndex!==14) return 'MP3 must use 320 kbps. Please export a 320 kbps MP3.';
  if(sampleIndex!==0) return 'MP3 sample rate must be 44.1 kHz.';
  if(channelMode===3) return 'Audio must be stereo, not mono.';
  return '';
}
function rnProblems(){
  const d=draft,bad=[],urlPattern=/(https?:\/\/|www\.)/i;
  const wordCount=x=>String(x||'').trim().split(/\s+/).filter(Boolean).length;
  if(wordCount(d.title)>15) bad.push('Release title is over the 15-word limit.');
  if([d.title,d.artist,...d.tracks.map(t=>t.title)].some(x=>urlPattern.test(x||''))) bad.push('Remove website URLs from release titles, artist names and track titles.');
  if(d.releaseType==='Single'&&d.tracks.length>1) bad.push('A Single should contain one track. Choose EP or Album.');
  if(d.releaseType==='Single'&&d.tracks[0]&&d.title.trim().toLowerCase()!==d.tracks[0].title.trim().toLowerCase()) bad.push('For a Single, make the release title match the track title.');
  if(d.artist.split(/,|&| x /i).filter(x=>x.trim()).length>=4) bad.push('Four or more primary artists may need to be credited as “Various Artists”; check with the label.');
  const seen=new Set();
  d.tracks.forEach((t,i)=>{
    const title=t.title.trim();
    if(wordCount(title)>12) bad.push(`Track ${i+1}: title is over the 12-word limit.`);
    if(title&&d.artist.trim()&&title.toLowerCase().includes(d.artist.trim().toLowerCase())) bad.push(`Track ${i+1}: remove the primary artist name from the track title and enter credits in the correct artist field.`);
    const key=title.toLowerCase();
    if(key&&seen.has(key)) bad.push(`Track ${i+1}: duplicate track title. Confirm this is intentional and follows store rules.`);
    if(key)seen.add(key);
    if(/\b(ft\.?|featuring|feat)\b/i.test(title)&&!/\((feat\.|with) [^)]+\)/i.test(title)) bad.push(`Track ${i+1}: format a featured artist consistently, e.g. “Title (feat. Artist)”, and add the artist in the Featured artists field.`);
  });
  return [...new Set(bad)];
}
