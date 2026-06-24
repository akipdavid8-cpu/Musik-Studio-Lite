/* ===== V4.5 Tahap 8F-4: Editor Musik JS ===== */
/* =========================================================
   MUSIK STUDIO LITE V2 - TIMELINE CLIP ENGINE
   Mengubah timeline utama menjadi
   timelineClips + startTime + duration. Kode lama tetap aman
   render/play V2 memakai clip waktu.
========================================================= */
var timelineClips = Array.isArray(typeof timelineClips==='undefined'?null:timelineClips) ? timelineClips : [];
var selectedClipId = typeof selectedClipId==='undefined' ? null : selectedClipId;
var copiedClip = typeof copiedClip==='undefined' ? null : copiedClip;
var playheadTime = typeof playheadTime==='undefined' ? 0 : playheadTime;
var v2PlayTimers = [];
var v2PlayStartClock = 0;
const V2_PAGE_SECONDS = 20;
const V2_PX_PER_SECOND = 30;
const V2_MIN_CLIP_SECONDS = 0.10;
const V2_SNAP_SECONDS = 1; // Snap grid waktu: 1 detik
let v2SnapEnabled = true;

const V2_DRAG_THRESHOLD = 6;
let v2DragState = null;

function snapTimeV2(seconds){
  seconds = Math.max(0, Number(seconds) || 0);
  if(!v2SnapEnabled)return seconds;
  return Math.round(seconds / V2_SNAP_SECONDS) * V2_SNAP_SECONDS;
}

function snapDurationV2(seconds){
  seconds = Math.max(V2_MIN_CLIP_SECONDS, Number(seconds) || V2_MIN_CLIP_SECONDS);
  if(!v2SnapEnabled)return seconds;
  return Math.max(V2_MIN_CLIP_SECONDS, Math.round(seconds / V2_SNAP_SECONDS) * V2_SNAP_SECONDS);
}

function toggleSnapV2(){
  v2SnapEnabled = !v2SnapEnabled;
  renderTimeline();
}

function ensureV2Tracks(){
  const defaults=[
    {id:'Drum',title:'🥁 Drum'},
    {id:'Piano',title:'🎹 Piano'},
    {id:'Guitar',title:'🎸 Guitar'},
    {id:'Bass',title:'🎸 Bass'},
    {id:'Vokal',title:'🎤 Vokal'},
    {id:'FX',title:'✨ FX'},
    {id:'MIDI',title:'🎼 MIDI'}
  ];
  defaults.forEach(d=>{ if(!tracks.find(t=>t.id===d.id))tracks.push(d); });
}

function v2CurrentPageStart(){ return currentStepPage * V2_PAGE_SECONDS; }
function v2CurrentPageEnd(){ return v2CurrentPageStart() + V2_PAGE_SECONDS; }
function v2ClipLeft(sec){ return Math.max(0, Math.round((sec - v2CurrentPageStart()) * V2_PX_PER_SECOND)); }
function v2ClipWidth(sec){ return Math.max(30, Math.round(sec * V2_PX_PER_SECOND)); }
function v2FormatSeconds(sec){ return formatTime(Math.max(0,sec)*1000).replace('.00',''); }
function v2SetPlayhead(sec){
  playheadTime=Math.max(0, Math.min(totalStepPages*V2_PAGE_SECONDS, Number(sec)||0));
  currentStepPage=Math.max(0,Math.min(totalStepPages-1,Math.floor(playheadTime/V2_PAGE_SECONDS)));
  renderTimeline();
}

function makeSyntheticWaveform(seed,count=28){
  const s=String(seed||'clip');
  let n=0; for(let i=0;i<s.length;i++)n+=s.charCodeAt(i);
  const arr=[];
  for(let i=0;i<count;i++){
    const a=Math.abs(Math.sin((i+1)*(0.31+(n%7)*0.04)));
    const b=Math.abs(Math.cos((i+2)*(0.19+(n%5)*0.03)));
    arr.push(Math.min(1,0.18+a*0.55+b*0.25));
  }
  return arr;
}

function v2NextName(track,note){
  const base=String(note||track||'Clip').replace(/\s+/g,'_');
  const count=timelineClips.filter(c=>c.track===track && String(c.name||'').startsWith(base)).length+1;
  return base+'_'+String(count).padStart(2,'0');
}

function createTimelineClip(track,note,options={}){
  ensureV2Tracks();
  const dur=Number(options.duration)||({Drum:.45,Piano:.85,Guitar:.75,Bass:.65,Vokal:2,FX:1,MIDI:.75}[track]||.75);
  const clip={
    id:options.id||uid(),
    track,
    name:options.name||v2NextName(track,note),
    note:note||options.name||'Clip',
    startTime:Math.max(0,Number(options.startTime ?? playheadTime)||0),
    duration:Math.max(V2_MIN_CLIP_SECONDS,dur),
    waveform:options.waveform||makeSyntheticWaveform(note||track),
    source:options.source||'pad',
    fileName:options.fileName||'',
    volume:Number(options.volume ?? 1)
  };
  timelineClips.push(clip);
  selectedClipId=clip.id;
  updateRecordList();
  renderTimeline();
  return clip;
}

// Auto record baru: pad langsung menjadi clip waktu, bukan step.
function autoRecord(bank,note){
  createTimelineClip(bank,note,{source:'pad'});
}

function updateRecordList(){
  const l=document.getElementById('recordList');
  if(!l)return;
  if(!timelineClips.length){
    l.innerHTML='<span class="empty-record">Belum ada clip di timeline</span>';
    return;
  }
  l.innerHTML=timelineClips.map((c,i)=>`<span class="record-chip">${i+1}. ${trackTitle(c.track)} ${c.name} • ${v2FormatSeconds(c.startTime)}</span>`).join('');
  l.scrollTop=l.scrollHeight;
}

function renderTimeRuler(){
  let h=document.getElementById('stepHeader');
  if(!h)return;
  const start=v2CurrentPageStart();
  let marks=[];
  for(let i=0;i<=4;i++){
    const t=start+i*5;
    marks.push(`<div class="time-mark" style="left:${Math.round(i*5*V2_PX_PER_SECOND)}px">${v2FormatSeconds(t)}</div>`);
  }
  h.className='v2-time-ruler';
  h.innerHTML=marks.join('');
}

function renderPatternList(){
  let box=document.getElementById('patternList');
  const panel=document.getElementById('timelinePanel');
  if(!panel)return;
  if(!box){
    box=document.createElement('div');
    box.id='patternList';
    box.className='pattern-list-v2';
    panel.appendChild(box);
  }
  const clip=timelineClips.find(c=>c.id===selectedClipId);
  if(!clip){
    box.innerHTML='<h3>List Pattern</h3><p class="empty-record">Pilih waveform clip dulu.</p>';
    return;
  }
  box.innerHTML=`
    <h3>List Pattern</h3>
    <div class="selected-pattern-name">Audio Terpilih: <b>${clip.name}</b></div>
    <div class="pattern-actions-v2">
      <button onclick="trimStartClip()">✂ Trim Start</button>
      <button onclick="trimEndClip()">✂ Trim End</button>
      <button onclick="splitClipAtPlayhead()">✂ Split</button>
      <button onclick="copySelectedClip()">📋 Copy</button>
      <button onclick="pasteClip()">📌 Paste</button>
      <button onclick="renameSelectedClip()">✏ Rename</button>
      <button class="danger" onclick="deleteSelectedClip()">🗑 Delete</button>
    </div>`;
}

function renderAudioTracks(){ renderClipTimeline(); }

function renderClipTimeline(){
  ensureV2Tracks();
  const wrap=document.getElementById('audioTracks');
  if(!wrap)return;
  const pageStart=v2CurrentPageStart(), pageEnd=v2CurrentPageEnd();
  const laneWidth=V2_PAGE_SECONDS*V2_PX_PER_SECOND;

  wrap.innerHTML=tracks.map(t=>{
    const clips=timelineClips.filter(c=>c.track===t.id && c.startTime < pageEnd && (c.startTime+c.duration) > pageStart);
    const html=clips.map(c=>{
      const bars=(c.waveform||makeSyntheticWaveform(c.name)).map(v=>`<span class="wavebar" style="height:${Math.max(6,Math.round(v*46))}px"></span>`).join('');
      const selected=c.id===selectedClipId?' selected':'';
      return `<div class="audio-clip timeline-clip-v2${selected}" draggable="true"
        style="left:${v2ClipLeft(c.startTime)}px;width:${v2ClipWidth(c.duration)}px"
        onclick="event.stopPropagation();selectClip('${c.id}')"
        onpointerdown="startDragClipV2(event,'${c.id}')"
        ondragstart="dragClipV2(event,'${c.id}')"
        title="${c.name} • ${v2FormatSeconds(c.startTime)}">
          <span class="clip-name-v2">${c.name}</span>${bars}
        </div>`;
    }).join('');
    return `<div class="audio-row v2-track-row">
      <div class="audio-title">${t.title}<div class="audio-tools"><button class="audio-mini-btn" onclick="renameTrack('${t.id}')">Rename</button>${t.id.startsWith('Custom')?`<button class="audio-mini-btn danger" onclick="deleteTrack('${t.id}')">X</button>`:''}</div></div>
      <div class="audio-lane v2-lane" data-track-id="${t.id}" style="min-width:${laneWidth}px" onclick="setPlayheadFromLane(event)" ondragover="event.preventDefault()" ondrop="dropClipV2(event,'${t.id}')">${html}</div>
    </div>`;
  }).join('');
}


function ensureSnapButtonV2(){
  const bar=document.querySelector('#timelinePanel .timeline-controls');
  if(!bar || document.getElementById('snapBtnV2'))return;
  const btn=document.createElement('button');
  btn.id='snapBtnV2';
  btn.onclick=toggleSnapV2;
  btn.textContent='Snap ON';
  bar.appendChild(btn);
}

function updateSnapButtonV2(){
  const btn=document.getElementById('snapBtnV2');
  if(btn)btn.textContent=v2SnapEnabled?'Snap ON':'Snap OFF';
}

function renderTimeline(active=-1){
  ensureV2Tracks();
  updatePageText();
  renderTimeRuler();
  renderClipTimeline();
  renderPatternList();
  ensureSnapButtonV2();
  updateSnapButtonV2();
  const old=document.getElementById('timelineTracks');
  if(old){ old.innerHTML=''; old.style.display='none'; }
  const line=document.getElementById('playheadLine');
  if(line){
    const left=76+v2ClipLeft(playheadTime);
    line.style.left=left+'px';
    line.classList.add('show');
  }
  updateTimeDisplay(playheadTime*1000);
}

function setPlayheadFromLane(event){
  const lane=event.currentTarget.getBoundingClientRect();
  const x=Math.max(0,event.clientX-lane.left);
  playheadTime=snapTimeV2(v2CurrentPageStart()+x/V2_PX_PER_SECOND);
  renderTimeline();
}

function selectClip(id){ selectedClipId=id; selectedAudioId=id; renderTimeline(); }
function getSelectedClip(){
  if(!selectedClipId){ alert('Pilih clip dulu.'); return null; }
  const clip=timelineClips.find(c=>c.id===selectedClipId);
  if(!clip)alert('Clip tidak ditemukan.');
  return clip;
}

function dragClipV2(ev,id){
  if(ev.dataTransfer){
    ev.dataTransfer.setData('clipId',id);
    ev.dataTransfer.effectAllowed='move';
  }
}

function dropClipV2(ev,trackId){
  ev.preventDefault();
  const id=ev.dataTransfer.getData('clipId')||ev.dataTransfer.getData('audioId');
  moveClipToLaneV2(id,trackId,ev.clientX);
}

function clearLaneDragStateV2(){
  document.querySelectorAll('.v2-lane.drag-target-v2').forEach(el=>el.classList.remove('drag-target-v2'));
  document.querySelectorAll('.timeline-clip-v2.dragging-v2').forEach(el=>el.classList.remove('dragging-v2'));
}

function getLaneFromPointV2(clientX,clientY){
  const el=document.elementFromPoint(clientX,clientY);
  return el ? el.closest('.v2-lane') : null;
}

function moveClipToLaneV2(id,trackId,clientX){
  const clip=timelineClips.find(c=>c.id===id);
  if(!clip)return;
  const lane=document.querySelector(`.v2-lane[data-track-id="${trackId}"]`);
  if(!lane)return;

  const rect=lane.getBoundingClientRect();
  const x=Math.max(0,Math.min(rect.width,clientX-rect.left));
  clip.track=trackId;
  clip.startTime=snapTimeV2(v2CurrentPageStart()+x/V2_PX_PER_SECOND);
  selectedClipId=id;
  selectedAudioId=id;
  clearLaneDragStateV2();
  renderTimeline();
  updateRecordList();
}

function startDragClipV2(ev,id){
  if(ev.target && ev.target.closest('.resize-handle-v2'))return;
  ev.stopPropagation();
  const clip=timelineClips.find(c=>c.id===id);
  if(!clip)return;
  selectedClipId=id;
  selectedAudioId=id;

  const startX=ev.clientX || 0;
  const startY=ev.clientY || 0;
  v2DragState={
    id,
    startX,
    startY,
    moved:false
  };

  const clipEl=ev.currentTarget;
  if(clipEl)clipEl.classList.add('dragging-v2');

  function move(e){
    if(!v2DragState)return;
    const x=e.clientX || startX;
    const y=e.clientY || startY;
    const dx=x-v2DragState.startX;
    const dy=y-v2DragState.startY;
    if(Math.abs(dx)>V2_DRAG_THRESHOLD || Math.abs(dy)>V2_DRAG_THRESHOLD){
      v2DragState.moved=true;
    }

    clearLaneDragStateV2();
    const lane=getLaneFromPointV2(x,y);
    if(lane)lane.classList.add('drag-target-v2');
  }

  function up(e){
    document.removeEventListener('pointermove',move);
    document.removeEventListener('pointerup',up);
    if(!v2DragState)return;

    const x=e.clientX || v2DragState.startX;
    const y=e.clientY || v2DragState.startY;
    const lane=getLaneFromPointV2(x,y);

    if(v2DragState.moved && lane && lane.dataset.trackId){
      moveClipToLaneV2(v2DragState.id,lane.dataset.trackId,x);
    }else{
      clearLaneDragStateV2();
      renderTimeline();
    }

    v2DragState=null;
  }

  document.addEventListener('pointermove',move);
  document.addEventListener('pointerup',up);
}

function deleteSelectedClip(){
  const c=getSelectedClip(); if(!c)return;
  timelineClips=timelineClips.filter(x=>x.id!==c.id);
  selectedClipId=null;
  updateRecordList(); renderTimeline();
}
function renameSelectedClip(){
  const c=getSelectedClip(); if(!c)return;
  const name=prompt('Nama clip:',c.name);
  if(name&&name.trim())c.name=name.trim();
  updateRecordList(); renderTimeline();
}
function copySelectedClip(){
  const c=getSelectedClip(); if(!c)return;
  copiedClip=JSON.parse(JSON.stringify(c));
  alert('Clip disalin.');
}
function pasteClip(){
  if(!copiedClip){ alert('Belum ada clip yang dicopy.'); return; }
  const c=JSON.parse(JSON.stringify(copiedClip));
  c.id=uid(); c.name=c.name+' Copy'; c.startTime=snapTimeV2(playheadTime);
  timelineClips.push(c); selectedClipId=c.id;
  updateRecordList(); renderTimeline();
}
function splitClipAtPlayhead(){
  const c=getSelectedClip(); if(!c)return;
  if(playheadTime<=c.startTime || playheadTime>=c.startTime+c.duration){ alert('Playhead harus berada di dalam clip.'); return; }
  const leftDur=playheadTime-c.startTime;
  const rightDur=(c.startTime+c.duration)-playheadTime;
  const wf=c.waveform||makeSyntheticWaveform(c.name);
  const idx=Math.max(1,Math.min(wf.length-1,Math.round(wf.length*(leftDur/c.duration))));
  const right=JSON.parse(JSON.stringify(c));
  right.id=uid(); right.name=c.name+'_B'; right.startTime=playheadTime; right.duration=rightDur; right.waveform=wf.slice(idx);
  c.name=c.name+'_A'; c.duration=leftDur; c.waveform=wf.slice(0,idx);
  timelineClips.push(right); selectedClipId=right.id;
  updateRecordList(); renderTimeline();
}
function trimStartClip(){
  const c=getSelectedClip(); if(!c)return;
  if(playheadTime<=c.startTime || playheadTime>=c.startTime+c.duration){ alert('Playhead harus berada di dalam clip.'); return; }
  const oldEnd=c.startTime+c.duration;
  c.startTime=playheadTime; c.duration=Math.max(V2_MIN_CLIP_SECONDS,oldEnd-playheadTime);
  renderTimeline();
}
function trimEndClip(){
  const c=getSelectedClip(); if(!c)return;
  if(playheadTime<=c.startTime || playheadTime>=c.startTime+c.duration){ alert('Playhead harus berada di dalam clip.'); return; }
  c.duration=Math.max(V2_MIN_CLIP_SECONDS,playheadTime-c.startTime);
  renderTimeline();
}

// Kompatibilitas tombol lama agar mengarah ke clip engine.
function deleteSelectedNote(){ deleteSelectedClip(); }
function copySelectedNote(){ copySelectedClip(); }
function pasteSelectedNote(){ pasteClip(); }
function clearSelectedNote(){ selectedClipId=null; renderTimeline(); }
function selectNote(id){ selectClip(id); }
function moveNote(id,bank,step){ const c=timelineClips.find(x=>x.id===id); if(c){c.track=bank;c.startTime=step*(60/bpm);renderTimeline();} }

function clearTimeline(){
  if(!confirm('Hapus semua clip timeline?'))return;
  timelineClips=[]; selectedClipId=null;
  updateRecordList(); renderTimeline();
}

function playClipV2(c){
  if(c.source==='import' && typeof importedAudioBuffers!=='undefined' && importedAudioBuffers[c.id]){
    playImportedAudio(c.id,0);
    return;
  }
  if(c.track==='Drum')playDrum(c.note,false);
  else if(c.track==='Piano')playPiano(c.note,false);
  else if(c.track==='Guitar')playGuitar(c.note,false);
  else if(c.track==='Bass')playBass(c.note,false);
}

function playTimeline(){
  if(!timelineClips.length)return;
  stopTimeline(false);
  if(typeof stopAllImportedAudio==='function')stopAllImportedAudio();
  setPlayingUI(true);
  v2PlayStartClock=Date.now()-playheadTime*1000;
  const start=playheadTime;
  timelineClips.filter(c=>c.startTime>=start).forEach(c=>{
    const delay=Math.max(0,(c.startTime-start)*1000);
    v2PlayTimers.push(setTimeout(()=>playClipV2(c),delay));
  });
  playTimer=setInterval(()=>{
    playheadTime=(Date.now()-v2PlayStartClock)/1000;
    if(playheadTime>=totalStepPages*V2_PAGE_SECONDS){ stopTimeline(); return; }
    currentStepPage=Math.floor(playheadTime/V2_PAGE_SECONDS);
    renderTimeline();
  },100);
}
function stopTimeline(ui=true){
  if(playTimer){clearInterval(playTimer); playTimer=null;}
  v2PlayTimers.forEach(t=>clearTimeout(t)); v2PlayTimers=[];
  if(typeof stopAllImportedAudio==='function')stopAllImportedAudio();
  if(ui)setPlayingUI(false);
  renderTimeline();
}

// Import MP3/WAV langsung menjadi timelineClip + tetap disimpan sebagai audio buffer.


function deleteClipById(id){
  timelineClips=timelineClips.filter(c=>c.id!==id);
  importedAudioTracks=importedAudioTracks.filter(t=>t.id!==id);
  if(typeof importedAudioBuffers!=='undefined')delete importedAudioBuffers[id];
  if(selectedClipId===id)selectedClipId=null;
  updateImportList(); updateRecordList(); renderTimeline();
}


// Jalankan ulang setelah semua script lama siap.
document.addEventListener('DOMContentLoaded',()=>{
  ensureV2Tracks();
  setupImportInput();
  updateRecordList();
  updateImportList();
  renderTimeline();
});

/* =========================================================
   V2 FIX PACK - PROJECT LOAD, RESIZE CLIP, CLEAN TRACK DELETE
   Perbaikan ini sengaja diletakkan di akhir agar menimpa fungsi lama.
========================================================= */
function v2MigrateOldEvents(events){
  if(!Array.isArray(events))return [];
  const stepSeconds=5;
  return events.map((e,i)=>({
    id:e.id||uid(),
    track:e.bank||e.track||'Drum',
    name:(e.note||'Clip')+'_'+String(i+1).padStart(2,'0'),
    note:e.note||'Clip',
    startTime:Math.max(0,Number(e.step||0)*stepSeconds),
    duration:Math.max(V2_MIN_CLIP_SECONDS,Number(e.duration)||({Drum:.45,Piano:.85,Guitar:.75,Bass:.65,Vokal:2,FX:1,MIDI:.75}[e.bank]||.75)),
    waveform:makeSyntheticWaveform(e.note||e.bank||'clip'),
    source:'migrated',
    fileName:'',
    volume:1
  }));
}

function setupV2ProjectLoader(){
  const oldInput=document.getElementById('loadProjectInput');
  if(!oldInput || oldInput.dataset.v2loader==='1')return;
  const input=oldInput.cloneNode(true);
  input.dataset.v2loader='1';
  oldInput.parentNode.replaceChild(input,oldInput);
  input.addEventListener('change',async function(){
    const file=this.files && this.files[0];
    if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      bpm=Number(data.bpm)||120;
      tracks=Array.isArray(data.tracks)&&data.tracks.length?data.tracks:tracks;
      ensureV2Tracks();
      totalStepPages=Number(data.totalStepPages)||totalStepPages||4;
      timelineClips=Array.isArray(data.timelineClips)?data.timelineClips:v2MigrateOldEvents(data.legacyRecordedEvents||[]);
      legacyRecordedEvents=[];
      importedAudioTracks=Array.isArray(data.importedAudioTracks)?data.importedAudioTracks:[];
      masterWaveform=Array.isArray(data.masterWaveform)?data.masterWaveform:[];
      selectedClipId=null; legacySelectedNoteId=null; copiedClip=null; legacyCopiedNote=null; playheadTime=0; currentStepPage=0;
      const bpmText=document.getElementById('bpmText'); if(bpmText)bpmText.textContent=bpm+' BPM';
      updateRecordList(); updateImportList(); renderTimeline(); syncExportWaveform();
      alert('Project V2 berhasil dimuat.');
    }catch(err){ console.error(err); alert('Project gagal dibuka.'); }
    this.value='';
  });
}


function deleteTrack(id){
  if(['Drum','Piano','Guitar','Bass','Vokal','FX','MIDI'].includes(id)){
    alert('Track bawaan tidak bisa dihapus.');return;
  }
  if(confirm('Hapus track ini beserta clip di dalamnya?')){
    tracks=tracks.filter(t=>t.id!==id);
    timelineClips=timelineClips.filter(c=>c.track!==id);
    legacyRecordedEvents=[];
    if(selectedClipId && !timelineClips.find(c=>c.id===selectedClipId))selectedClipId=null;
    updateRecordList();renderTimeline();
  }
}

function prevStepPage(){
  if(currentStepPage>0){currentStepPage--;playheadTime=v2CurrentPageStart();selectedClipId=null;renderTimeline();}
}
function nextStepPage(){
  if(currentStepPage<totalStepPages-1){currentStepPage++;playheadTime=v2CurrentPageStart();selectedClipId=null;renderTimeline();}
}
function updatePageText(){
  const txt=(currentStepPage+1)+'/'+totalStepPages;
  const a=document.getElementById('pageText'); const b=document.getElementById('pageTextBottom');
  if(a)a.textContent=txt; if(b)b.textContent=txt;
}

function startResizeClipV2(ev,id,side){
  ev.stopPropagation(); ev.preventDefault();
  const clip=timelineClips.find(c=>c.id===id); if(!clip)return;
  selectedClipId=id;
  const startX=ev.clientX || (ev.touches&&ev.touches[0]&&ev.touches[0].clientX) || 0;
  const originalStart=clip.startTime;
  const originalDuration=clip.duration;
  function move(e){
    const x=e.clientX || (e.touches&&e.touches[0]&&e.touches[0].clientX) || startX;
    const delta=(x-startX)/V2_PX_PER_SECOND;
    if(side==='right'){
      clip.duration=snapDurationV2(originalDuration+delta);
    }else{
      const oldEnd=originalStart+originalDuration;
      const rawStart=Math.max(0,Math.min(oldEnd-V2_MIN_CLIP_SECONDS,originalStart+delta));
      const newStart=snapTimeV2(rawStart);
      clip.startTime=Math.min(newStart, oldEnd - V2_MIN_CLIP_SECONDS);
      clip.duration=snapDurationV2(oldEnd-clip.startTime);
    }
    renderTimeline();
  }
  function up(){
    document.removeEventListener('pointermove',move);
    document.removeEventListener('pointerup',up);
  }
  document.addEventListener('pointermove',move);
  document.addEventListener('pointerup',up);
}

function renderClipTimeline(){
  ensureV2Tracks();
  const wrap=document.getElementById('audioTracks');
  if(!wrap)return;
  const pageStart=v2CurrentPageStart(), pageEnd=v2CurrentPageEnd();
  const laneWidth=V2_PAGE_SECONDS*V2_PX_PER_SECOND;

  wrap.innerHTML=tracks.map(t=>{
    const clips=timelineClips.filter(c=>c.track===t.id && c.startTime < pageEnd && (c.startTime+c.duration) > pageStart);
    const html=clips.map(c=>{
      const bars=(c.waveform||makeSyntheticWaveform(c.name)).map(v=>`<span class="wavebar" style="height:${Math.max(6,Math.round(v*46))}px"></span>`).join('');
      const selected=c.id===selectedClipId?' selected':'';
      return `<div class="audio-clip timeline-clip-v2${selected}" draggable="true"
        style="left:${v2ClipLeft(c.startTime)}px;width:${v2ClipWidth(c.duration)}px"
        onclick="event.stopPropagation();selectClip('${c.id}')"
        onpointerdown="startDragClipV2(event,'${c.id}')"
        ondragstart="dragClipV2(event,'${c.id}')"
        title="${c.name} • ${v2FormatSeconds(c.startTime)}">
          <span class="resize-handle-v2 left" onpointerdown="startResizeClipV2(event,'${c.id}','left')"></span>
          <span class="clip-name-v2">${c.name}</span>${bars}
          <span class="resize-handle-v2 right" onpointerdown="startResizeClipV2(event,'${c.id}','right')"></span>
        </div>`;
    }).join('');
    return `<div class="audio-row v2-track-row">
      <div class="audio-title">${t.title}<div class="audio-tools"><button class="audio-mini-btn" onclick="renameTrack('${t.id}')">Rename</button>${t.id.startsWith('Custom')?`<button class="audio-mini-btn danger" onclick="deleteTrack('${t.id}')">X</button>`:''}</div></div>
      <div class="audio-lane v2-lane" data-track-id="${t.id}" style="min-width:${laneWidth}px" onclick="setPlayheadFromLane(event)" ondragover="event.preventDefault()" ondrop="dropClipV2(event,'${t.id}')">${html}</div>
    </div>`;
  }).join('');
}
function renderAudioTracks(){renderClipTimeline();}

function playClipV2(c){
  if(c.source==='import' && typeof importedAudioBuffers!=='undefined' && importedAudioBuffers[c.id]){playImportedAudio(c.id,0);return;}
  if(c.track==='Drum')playDrum(c.note,false);
  else if(c.track==='Piano')playPiano(c.note,false);
  else if(c.track==='Guitar')playGuitar(c.note,false);
  else if(c.track==='Bass')playBass(c.note,false);
}

function playTimeline(){
  if(!timelineClips.length)return;
  stopTimeline(false);
  if(typeof stopAllImportedAudio==='function')stopAllImportedAudio();
  setPlayingUI(true);
  v2PlayStartClock=Date.now()-playheadTime*1000;
  const start=playheadTime;
  timelineClips.filter(c=>(c.startTime+c.duration)>=start).forEach(c=>{
    const delay=Math.max(0,(c.startTime-start)*1000);
    v2PlayTimers.push(setTimeout(()=>playClipV2(c),delay));
  });
  playTimer=setInterval(()=>{
    playheadTime=(Date.now()-v2PlayStartClock)/1000;
    if(playheadTime>=totalStepPages*V2_PAGE_SECONDS){stopTimeline();return;}
    currentStepPage=Math.floor(playheadTime/V2_PAGE_SECONDS);
    renderTimeline();
  },100);
}

function stopTimeline(ui=true){
  if(playTimer){clearInterval(playTimer);playTimer=null;}
  v2PlayTimers.forEach(t=>clearTimeout(t));v2PlayTimers=[];
  if(typeof stopAllImportedAudio==='function')stopAllImportedAudio();
  if(ui)setPlayingUI(false);
  renderTimeline();
}

document.addEventListener('DOMContentLoaded',()=>{
  ensureV2Tracks();
  setupV2ProjectLoader();
  updateRecordList();
  updateImportList();
  renderTimeline();
});

/* =========================================================
   V2 FINAL FIX - CLIP ENGINE UTAMA
   Tujuan:
   - UI dan tombol lama diarahkan ke timelineClips
   - Header timeline menjadi time ruler 00:00, 00:05, 00:10
   - Playhead/playback berbasis waktu
   - Trim/Split import audio memakai audioOffset agar playback lebih benar
========================================================= */
(function(){
  const BUILTIN_TRACKS = ['Drum','Piano','Guitar','Bass','Vokal','FX','MIDI'];

  window.timelineClips = Array.isArray(window.timelineClips) ? window.timelineClips : (typeof timelineClips !== 'undefined' && Array.isArray(timelineClips) ? timelineClips : []);
  window.selectedClipId = typeof window.selectedClipId === 'undefined' ? (typeof selectedClipId !== 'undefined' ? selectedClipId : null) : window.selectedClipId;
  window.copiedClip = typeof window.copiedClip === 'undefined' ? (typeof copiedClip !== 'undefined' ? copiedClip : null) : window.copiedClip;
  window.playheadTime = Number(window.playheadTime || (typeof playheadTime !== 'undefined' ? playheadTime : 0)) || 0;
  window.v2PlayTimers = Array.isArray(window.v2PlayTimers) ? window.v2PlayTimers : [];

  window.ensureV2Tracks = function(){
    const defaults=[
      {id:'Drum',title:'🥁 Drum'},
      {id:'Piano',title:'🎹 Piano'},
      {id:'Guitar',title:'🎸 Guitar'},
      {id:'Bass',title:'🎸 Bass'},
      {id:'Vokal',title:'🎤 Vokal'},
      {id:'FX',title:'✨ FX'},
      {id:'MIDI',title:'🎼 MIDI'}
    ];
    if(!Array.isArray(tracks)) tracks=[];
    defaults.forEach(d=>{ if(!tracks.find(t=>t.id===d.id)) tracks.push(d); });
  };

  window.v2CurrentPageStart = function(){ return currentStepPage * V2_PAGE_SECONDS; };
  window.v2CurrentPageEnd = function(){ return v2CurrentPageStart() + V2_PAGE_SECONDS; };
  window.v2FormatSeconds = function(sec){
    sec=Math.max(0, Number(sec)||0);
    const m=String(Math.floor(sec/60)).padStart(2,'0');
    const s=String(Math.floor(sec%60)).padStart(2,'0');
    return m+':'+s;
  };
  window.v2ClipLeft = function(sec){ return Math.max(0, Math.round((Number(sec)-v2CurrentPageStart()) * V2_PX_PER_SECOND)); };
  window.v2ClipWidth = function(sec){ return Math.max(34, Math.round((Number(sec)||0) * V2_PX_PER_SECOND)); };

  window.updatePageText = function(){
    const txt=(currentStepPage+1)+'/'+totalStepPages;
    const a=document.getElementById('pageText');
    const b=document.getElementById('pageTextBottom');
    if(a)a.textContent=txt;
    if(b)b.textContent=txt;
  };

  window.renderTimeRuler = function(){
    const h=document.getElementById('stepHeader');
    if(!h)return;
    const start=v2CurrentPageStart();
    const laneWidth=V2_PAGE_SECONDS*V2_PX_PER_SECOND;
    let marks=[];
    for(let t=0;t<=V2_PAGE_SECONDS;t+=5){
      marks.push(`<div class="time-mark" style="left:${Math.round(t*V2_PX_PER_SECOND)}px">${v2FormatSeconds(start+t)}</div>`);
    }
    h.className='step-header v2-time-ruler';
    h.style.minWidth=(76+laneWidth)+'px';
    h.innerHTML=`<div class="time-left-space"></div><div class="time-ruler-lane" style="width:${laneWidth}px">${marks.join('')}</div>`;
  };

  window.updateRecordList = function(){
    const l=document.getElementById('recordList');
    if(!l)return;
    if(!timelineClips.length){
      l.innerHTML='<span class="empty-record">Belum ada clip timeline</span>';
      return;
    }
    l.innerHTML=timelineClips
      .slice()
      .sort((a,b)=>(a.startTime||0)-(b.startTime||0))
      .map((c,i)=>`<span class="record-chip ${c.id===selectedClipId?'selected-chip-list':''}" onclick="selectClip('${c.id}')">${i+1}. ${trackTitle(c.track)} ${c.name} ${v2FormatSeconds(c.startTime||0)}</span>`)
      .join('');
    l.scrollTop=l.scrollHeight;
  };

  window.renderPatternList = function(){
    let box=document.getElementById('patternList');
    const panel=document.getElementById('timelinePanel');
    if(!panel)return;
    if(!box){
      box=document.createElement('div');
      box.id='patternList';
      box.className='pattern-list-v2';
      panel.appendChild(box);
    }
    const clip=timelineClips.find(c=>c.id===selectedClipId);
    if(!clip){
      box.innerHTML='<h3>List Pattern</h3><p class="empty-record">Pilih waveform clip dulu.</p>';
      return;
    }
    box.innerHTML=`
      <h3>List Pattern</h3>
      <div class="selected-pattern-name">Audio Terpilih: <b>${clip.name}</b></div>
      <small>${trackTitle(clip.track)} • Mulai ${v2FormatSeconds(clip.startTime||0)} • Durasi ${v2FormatSeconds(clip.duration||0)}</small>
      <div class="pattern-actions-v2">
        <button onclick="trimStartClip()">✂ Trim Start</button>
        <button onclick="trimEndClip()">✂ Trim End</button>
        <button onclick="splitClipAtPlayhead()">✂ Split</button>
        <button onclick="copySelectedClip()">📋 Copy</button>
        <button onclick="pasteClip()">📌 Paste</button>
        <button onclick="renameSelectedClip()">✏ Rename</button>
        <button class="danger" onclick="deleteSelectedClip()">🗑 Delete</button>
      </div>`;
  };

  window.renderClipTimeline = function(){
    ensureV2Tracks();
    const wrap=document.getElementById('audioTracks');
    if(!wrap)return;
    const pageStart=v2CurrentPageStart();
    const pageEnd=v2CurrentPageEnd();
    const laneWidth=V2_PAGE_SECONDS*V2_PX_PER_SECOND;
    wrap.innerHTML=tracks.map(t=>{
      const clips=timelineClips.filter(c=>c.track===t.id && (Number(c.startTime)||0) < pageEnd && ((Number(c.startTime)||0)+(Number(c.duration)||0)) > pageStart);
      const html=clips.map(c=>{
        const bars=(c.waveform||makeSyntheticWaveform(c.name)).map(v=>`<span class="wavebar" style="height:${Math.max(6,Math.round(v*46))}px"></span>`).join('');
        const selected=c.id===selectedClipId?' selected':'';
        return `<div class="audio-clip timeline-clip-v2${selected}" draggable="true"
          style="left:${v2ClipLeft(c.startTime||0)}px;width:${v2ClipWidth(c.duration||0)}px"
          onclick="event.stopPropagation();selectClip('${c.id}')"
          ondragstart="dragClipV2(event,'${c.id}')"
          title="${c.name} • ${v2FormatSeconds(c.startTime||0)}">
            <span class="resize-handle-v2 left" onpointerdown="startResizeClipV2(event,'${c.id}','left')"></span>
            <span class="clip-name-v2">${c.name}</span>${bars}
            <span class="resize-handle-v2 right" onpointerdown="startResizeClipV2(event,'${c.id}','right')"></span>
          </div>`;
      }).join('');
      return `<div class="audio-row v2-track-row">
        <div class="audio-title">${t.title}<div class="audio-tools"><button class="audio-mini-btn" onclick="renameTrack('${t.id}')">Rename</button>${t.id.startsWith('Custom')?`<button class="audio-mini-btn danger" onclick="deleteTrack('${t.id}')">X</button>`:''}</div></div>
        <div class="audio-lane v2-lane" data-track-id="${t.id}" style="min-width:${laneWidth}px" onclick="setPlayheadFromLane(event)" ondragover="event.preventDefault()" ondrop="dropClipV2(event,'${t.id}')">${html}</div>
      </div>`;
    }).join('');
  };

  window.renderAudioTracks = function(){ renderClipTimeline(); };

  window.renderTimeline = function(){
    ensureV2Tracks();
    updatePageText();
    renderTimeRuler();
    renderClipTimeline();
    renderPatternList();
  ensureSnapButtonV2();
  updateSnapButtonV2();
    const old=document.getElementById('timelineTracks');
    if(old){ old.innerHTML=''; old.style.display='none'; }
    const line=document.getElementById('playheadLine');
    if(line){
      line.style.left=(76+v2ClipLeft(playheadTime))+'px';
      line.classList.add('show');
    }
    updateTimeDisplay(playheadTime*1000);
  };

  window.selectClip = function(id){
    selectedClipId=id;
    selectedAudioId=id;
    updateRecordList();
    renderTimeline();
  };

  window.getSelectedClip = function(){
    if(!selectedClipId){ alert('Pilih clip dulu.'); return null; }
    const clip=timelineClips.find(c=>c.id===selectedClipId);
    if(!clip) alert('Clip tidak ditemukan.');
    return clip;
  };

  window.setPlayheadFromLane = function(event){
    const lane=event.currentTarget.getBoundingClientRect();
    const x=Math.max(0,event.clientX-lane.left);
    playheadTime=snapTimeV2(v2CurrentPageStart()+x/V2_PX_PER_SECOND);
    renderTimeline();
  };

  window.createTimelineClip = function(track,note,options={}){
    ensureV2Tracks();
    const dur=Number(options.duration)||({Drum:.45,Piano:.85,Guitar:.75,Bass:.65,Vokal:2,FX:1,MIDI:.75}[track]||.75);
    const clip={
      id:options.id||uid(),
      track,
      name:options.name||v2NextName(track,note),
      note:note||options.name||'Clip',
      startTime:Math.max(0,Number(options.startTime ?? playheadTime)||0),
      duration:Math.max(V2_MIN_CLIP_SECONDS,dur),
      waveform:options.waveform||makeSyntheticWaveform(note||track),
      source:options.source||'pad',
      fileName:options.fileName||'',
      volume:Number(options.volume ?? 1),
      audioOffset:Number(options.audioOffset||0)
    };
    timelineClips.push(clip);
    selectedClipId=clip.id;
    legacyRecordedEvents=[];
    updateRecordList();
    updateImportList();
    renderTimeline();
    return clip;
  };

  window.splitClipAtPlayhead = function(){
    const c=getSelectedClip(); if(!c)return;
    const start=Number(c.startTime)||0, dur=Number(c.duration)||0, end=start+dur;
    if(playheadTime<=start || playheadTime>=end){ alert('Playhead harus berada di dalam clip.'); return; }
    const leftDur=playheadTime-start;
    const rightDur=end-playheadTime;
    const wf=c.waveform||makeSyntheticWaveform(c.name);
    const idx=Math.max(1,Math.min(wf.length-1,Math.round(wf.length*(leftDur/dur))));
    const right=JSON.parse(JSON.stringify(c));
    right.id=uid();
    right.name=c.name+'_B';
    right.startTime=playheadTime;
    right.duration=rightDur;
    right.waveform=wf.slice(idx);
    right.audioOffset=Number(c.audioOffset||0)+leftDur;
    c.name=c.name+'_A';
    c.duration=leftDur;
    c.waveform=wf.slice(0,idx);
    timelineClips.push(right);
    selectedClipId=right.id;
    updateRecordList();
    renderTimeline();
  };

  window.trimStartClip = function(){
    const c=getSelectedClip(); if(!c)return;
    const start=Number(c.startTime)||0, end=start+(Number(c.duration)||0);
    if(playheadTime<=start || playheadTime>=end){ alert('Playhead harus berada di dalam clip.'); return; }
    const cut=playheadTime-start;
    c.startTime=playheadTime;
    c.duration=Math.max(V2_MIN_CLIP_SECONDS,end-playheadTime);
    c.audioOffset=Number(c.audioOffset||0)+cut;
    renderTimeline();
  };

  window.trimEndClip = function(){
    const c=getSelectedClip(); if(!c)return;
    const start=Number(c.startTime)||0, end=start+(Number(c.duration)||0);
    if(playheadTime<=start || playheadTime>=end){ alert('Playhead harus berada di dalam clip.'); return; }
    c.duration=Math.max(V2_MIN_CLIP_SECONDS,playheadTime-start);
    renderTimeline();
  };

  window.copySelectedClip = function(){
    const c=getSelectedClip(); if(!c)return;
    copiedClip=JSON.parse(JSON.stringify(c));
    alert('Clip disalin.');
  };

  window.pasteClip = function(){
    if(!copiedClip){ alert('Belum ada clip yang dicopy.'); return; }
    const c=JSON.parse(JSON.stringify(copiedClip));
    c.id=uid();
    c.name=c.name+' Copy';
    c.startTime=playheadTime;
    timelineClips.push(c);
    selectedClipId=c.id;
    updateRecordList();
    updateImportList();
    renderTimeline();
  };

  window.deleteSelectedClip = function(){
    const c=getSelectedClip(); if(!c)return;
    if(!confirm('Hapus clip '+c.name+'?'))return;
    deleteClipById(c.id);
  };

  window.deleteClipById = function(id){
    timelineClips=timelineClips.filter(c=>c.id!==id);
    importedAudioTracks=importedAudioTracks.filter(t=>t.id!==id);
    if(typeof importedAudioBuffers!=='undefined') delete importedAudioBuffers[id];
    if(selectedClipId===id) selectedClipId=null;
    legacyRecordedEvents=[];
    updateImportList();
    updateRecordList();
    renderTimeline();
  };

  window.deleteSelectedNote = function(){ deleteSelectedClip(); };
  window.copySelectedNote = function(){ copySelectedClip(); };
  window.pasteSelectedNote = function(){ pasteClip(); };
  window.clearSelectedNote = function(){ selectedClipId=null; legacySelectedNoteId=null; renderTimeline(); };
  window.cutSelectedAudio = function(){ splitClipAtPlayhead(); };
  window.copySelectedAudio = function(){ copySelectedClip(); };
  window.pasteAudio = function(){ pasteClip(); };

  window.prevStepPage = function(){
    if(currentStepPage>0){
      currentStepPage--;
      playheadTime=v2CurrentPageStart();
      selectedClipId=null;
      renderTimeline();
    }
  };
  window.nextStepPage = function(){
    if(currentStepPage<totalStepPages-1){
      currentStepPage++;
      playheadTime=v2CurrentPageStart();
      selectedClipId=null;
      renderTimeline();
    }
  };

  window.deleteTrack = function(id){
    if(BUILTIN_TRACKS.includes(id)){ alert('Track bawaan tidak bisa dihapus.'); return; }
    if(confirm('Hapus track ini beserta clip di dalamnya?')){
      tracks=tracks.filter(t=>t.id!==id);
      timelineClips=timelineClips.filter(c=>c.track!==id);
      legacyRecordedEvents=[];
      selectedClipId=null;
      updateRecordList();
      renderTimeline();
    }
  };

  window.clearTimeline = function(){
    if(!confirm('Hapus semua clip timeline?'))return;
    timelineClips=[];
    legacyRecordedEvents=[];
    importedAudioTracks=[];
    selectedClipId=null;
    legacySelectedNoteId=null;
    playheadTime=0;
    currentStepPage=0;
    updateImportList();
    updateRecordList();
    renderTimeline();
  };

  function playImportedClipV2(c, delay, offsetInClip){
    if(typeof importedAudioBuffers==='undefined' || !importedAudioBuffers[c.id]){ return; }
    if(typeof importedAudioSources!=='undefined' && importedAudioSources[c.id]){
      try{ importedAudioSources[c.id].stop(); }catch(e){}
      delete importedAudioSources[c.id];
    }
    const ctx=getAudioContext();
    const src=ctx.createBufferSource();
    const gain=ctx.createGain();
    const buffer=importedAudioBuffers[c.id];
    src.buffer=buffer;
    gain.gain.value=Math.max(0,Math.min(1,Number(c.volume ?? 1)));
    src.connect(gain).connect(getMasterOutput());
    const offset=Math.max(0, Number(c.audioOffset||0) + Number(offsetInClip||0));
    const maxDur=Math.max(0.05, Math.min(Number(c.duration||0)-Number(offsetInClip||0), buffer.duration-offset));
    try{ src.start(ctx.currentTime + Math.max(0,delay||0), offset, maxDur); }catch(e){ console.warn(e); }
    src.onended=()=>{ if(importedAudioSources[c.id]===src) delete importedAudioSources[c.id]; };
    if(typeof importedAudioSources!=='undefined') importedAudioSources[c.id]=src;
  }

  window.playClipV2 = function(c, delay=0, offsetInClip=0){
    if(c.source==='import'){
      playImportedClipV2(c, delay, offsetInClip);
      return;
    }
    setTimeout(()=>{
      if(c.track==='Drum')playDrum(c.note,false);
      else if(c.track==='Piano')playPiano(c.note,false);
      else if(c.track==='Guitar')playGuitar(c.note,false);
      else if(c.track==='Bass')playBass(c.note,false);
    }, Math.max(0,delay*1000));
  };

  window.playTimeline = function(){
    if(!timelineClips.length)return;
    stopTimeline(false);
    if(typeof stopAllImportedAudio==='function')stopAllImportedAudio();
    setPlayingUI(true);
    const start=playheadTime;
    v2PlayStartClock=Date.now()-start*1000;
    timelineClips.filter(c=>(Number(c.startTime||0)+Number(c.duration||0))>=start).forEach(c=>{
      const cStart=Number(c.startTime)||0;
      const delay=Math.max(0,cStart-start);
      const offsetInClip=Math.max(0,start-cStart);
      if(c.source==='import'){
        playImportedClipV2(c,delay,offsetInClip);
      }else{
        v2PlayTimers.push(setTimeout(()=>playClipV2(c,0,offsetInClip),delay*1000));
      }
    });
    playTimer=setInterval(()=>{
      playheadTime=(Date.now()-v2PlayStartClock)/1000;
      if(playheadTime>=totalStepPages*V2_PAGE_SECONDS){ stopTimeline(); return; }
      currentStepPage=Math.floor(playheadTime/V2_PAGE_SECONDS);
      renderTimeline();
    },100);
  };

  window.stopTimeline = function(ui=true){
    if(playTimer){ clearInterval(playTimer); playTimer=null; }
    v2PlayTimers.forEach(t=>clearTimeout(t));
    v2PlayTimers=[];
    if(typeof stopAllImportedAudio==='function')stopAllImportedAudio();
    if(ui)setPlayingUI(false);
    renderTimeline();
  };

  window.saveProject = function(){
    const data={version:'v2-timeline-clips-fixed',bpm,tracks,totalStepPages,timelineClips,masterWaveform};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='musik_studio_project_v2.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  window.setupV2ProjectLoader = function(){
    const input=document.getElementById('loadProjectInput');
    if(!input || input.dataset.finalV2Loader==='1')return;
    input.dataset.finalV2Loader='1';
    input.addEventListener('change',async function(){
      const file=this.files && this.files[0];
      if(!file)return;
      try{
        const data=JSON.parse(await file.text());
        bpm=Number(data.bpm)||120;
        tracks=Array.isArray(data.tracks)&&data.tracks.length?data.tracks:tracks;
        ensureV2Tracks();
        totalStepPages=Number(data.totalStepPages)||4;
        timelineClips=Array.isArray(data.timelineClips)?data.timelineClips:v2MigrateOldEvents(data.legacyRecordedEvents||[]);
        legacyRecordedEvents=[];
        importedAudioTracks=Array.isArray(data.importedAudioTracks)?data.importedAudioTracks:[];
        selectedClipId=null; legacySelectedNoteId=null; playheadTime=0; currentStepPage=0;
        const bpmText=document.getElementById('bpmText'); if(bpmText)bpmText.textContent=bpm+' BPM';
        updateImportList(); updateRecordList(); renderTimeline();
        alert('Project V2 berhasil dimuat.');
      }catch(e){ console.error(e); alert('Project gagal dibuka.'); }
      this.value='';
    });
  };

  document.addEventListener('DOMContentLoaded',()=>{
    ensureV2Tracks();
    setupV2ProjectLoader();
    legacyRecordedEvents=[];
    updateImportList();
    updateRecordList();
    renderTimeline();
  });
})();

/* =========================================================
   V2 FINAL MIX + TRIM UNDO PATCH
   Memperbaiki:
   1. Volume/Pan per Clip masuk lagi
   2. Volume/Pan mempengaruhi playback audio import
   3. Trim Visual memakai pushUndoV2()
========================================================= */

(function(){
  function clampV2(n,min,max){ return Math.max(min,Math.min(max,Number(n)||0)); }

  window.ensureClipMixDataV2 = function(clip){
    if(!clip)return clip;
    if(typeof clip.volume!=='number') clip.volume=1;
    if(typeof clip.pan!=='number') clip.pan=0;
    clip.volume=clampV2(clip.volume,0,2);
    clip.pan=clampV2(clip.pan,-1,1);
    return clip;
  };

  window.panTextV2 = function(p){
    p=Number(p)||0;
    if(Math.abs(p)<0.01)return 'Center';
    return p<0 ? 'L '+Math.round(Math.abs(p)*100) : 'R '+Math.round(p*100);
  };

  window.getSelectedClipsForMixV2 = function(){
    let arr=[];
    if(typeof getSelectedClipsV2==='function')arr=getSelectedClipsV2();
    else if(typeof timelineClips!=='undefined' && selectedClipId)arr=timelineClips.filter(c=>c.id===selectedClipId);
    return arr.map(ensureClipMixDataV2);
  };

  window.setClipVolumeV2 = function(value){
    const clips=getSelectedClipsForMixV2();
    if(!clips.length)return;
    if(typeof pushUndoV2==='function')pushUndoV2();
    const v=clampV2(Number(value)/100,0,2);
    clips.forEach(c=>c.volume=v);
    renderTimeline();
  };

  window.setClipPanV2 = function(value){
    const clips=getSelectedClipsForMixV2();
    if(!clips.length)return;
    if(typeof pushUndoV2==='function')pushUndoV2();
    const p=clampV2(Number(value)/100,-1,1);
    clips.forEach(c=>c.pan=p);
    renderTimeline();
  };

  window.resetClipMixV2 = function(){
    const clips=getSelectedClipsForMixV2();
    if(!clips.length){alert('Pilih clip dulu.');return;}
    if(typeof pushUndoV2==='function')pushUndoV2();
    clips.forEach(c=>{c.volume=1;c.pan=0;});
    renderTimeline();
  };

  function clipIsSelectedMixV2(id){
    if(typeof isSelectedClipV2==='function')return isSelectedClipV2(id);
    return id===selectedClipId;
  }

  function fullDurForTrimV2(c){
    if(typeof getClipFullDurationV2==='function')return getClipFullDurationV2(c);
    return Math.max(Number(c.fullDuration)||0, Number(c.duration)||0.1);
  }

  window.renderClipTimeline = function(){
    ensureV2Tracks();
    const wrap=document.getElementById('audioTracks');
    if(!wrap)return;
    const pageStart=v2CurrentPageStart(), pageEnd=v2CurrentPageEnd();
    const laneWidth=V2_PAGE_SECONDS*V2_PX_PER_SECOND;

    wrap.innerHTML=tracks.map(t=>{
      const clips=(typeof timelineClips!=='undefined'?timelineClips:[])
        .map(c=>{
          if(typeof ensureTrimDataV2==='function')ensureTrimDataV2(c);
          ensureClipMixDataV2(c);
          return c;
        })
        .filter(c=>c.track===t.id && c.startTime < pageEnd && (c.startTime+c.duration) > pageStart);

      const html=clips.map(c=>{
        const bars=(c.waveform||makeSyntheticWaveform(c.name)).map(v=>`<span class="wavebar" style="height:${Math.max(6,Math.round(v*46))}px"></span>`).join('');
        const selected=clipIsSelectedMixV2(c.id)?' selected multi-selected-v2':'';
        const full=fullDurForTrimV2(c);
        const leftPct=(typeof c.trimStart==='number')?Math.max(0,Math.min(95,(c.trimStart/full)*100)):0;
        const rightPct=(typeof c.trimEnd==='number')?Math.max(0,Math.min(95,(c.trimEnd/full)*100)):0;
        const trimLabel=(c.trimStart||c.trimEnd)?`<span class="trim-label-v2">trim ${Math.round(c.trimStart||0)}s / ${Math.round(c.trimEnd||0)}s</span>`:'';
        const mixLabel=`<span class="clip-mix-label-v2">Vol ${Math.round((c.volume||1)*100)}% • ${panTextV2(c.pan)}</span>`;

        return `<div class="audio-clip timeline-clip-v2 trim-visual-clip-v2${selected}" draggable="true" data-clip-id="${c.id}"
          style="left:${v2ClipLeft(c.startTime)}px;width:${v2ClipWidth(c.duration)}px;opacity:${Math.max(.25,Math.min(1,c.volume||1))}"
          onclick="typeof selectClipProV2==='function' ? selectClipProV2(event,'${c.id}') : selectClip('${c.id}')"
          onpointerdown="startDragClipV2(event,'${c.id}')"
          ondragstart="dragClipV2(event,'${c.id}')"
          title="${c.name} • Volume ${Math.round((c.volume||1)*100)}% • Pan ${panTextV2(c.pan)}">
            <span class="trim-shadow-v2 left" style="width:${leftPct}%"></span>
            <span class="trim-shadow-v2 right" style="width:${rightPct}%"></span>
            <span class="trim-handle-v2 left" onpointerdown="startTrimVisualV2(event,'${c.id}','left')">◀</span>
            <span class="clip-name-v2">${c.name}</span>${mixLabel}${trimLabel}${bars}
            <span class="trim-handle-v2 right" onpointerdown="startTrimVisualV2(event,'${c.id}','right')">▶</span>
          </div>`;
      }).join('');

      return `<div class="audio-row v2-track-row">
        <div class="audio-title">${t.title}<div class="audio-tools">
          <button class="audio-mini-btn" onclick="renameTrack('${t.id}')">Rename</button>
          ${t.id.startsWith('Custom')?`<button class="audio-mini-btn danger" onclick="deleteTrack('${t.id}')">X</button>`:''}
        </div></div>
        <div class="audio-lane v2-lane" data-track-id="${t.id}" style="min-width:${laneWidth}px"
          onclick="setPlayheadFromLane(event)"
          onpointerdown="typeof startLassoV2==='function' && startLassoV2(event,'${t.id}')"
          ondragover="event.preventDefault()"
          ondrop="dropClipV2(event,'${t.id}')">${html}</div>
      </div>`;
    }).join('');
  };

  window.renderPatternList = function(){
    let box=document.getElementById('patternList');
    const panel=document.getElementById('timelinePanel');
    if(!panel)return;
    if(!box){
      box=document.createElement('div');
      box.id='patternList';
      box.className='pattern-list-v2';
      panel.appendChild(box);
    }

    const selected=getSelectedClipsForMixV2();
    if(!selected.length){
      box.innerHTML='<h3>List Pattern</h3><p class="empty-record">Pilih waveform clip dulu.</p>';
      return;
    }

    const first=selected[0];
    const label=selected.length===1?first.name:(selected.length+' clip terpilih');
    const vol=Math.round((first.volume??1)*100);
    const pan=Math.round((first.pan??0)*100);

    box.innerHTML=`
      <h3>List Pattern</h3>
      <div class="selected-pattern-name">Audio Terpilih: <b>${label}</b></div>

      <div class="clip-mix-v2">
        <label>Volume Clip: <b>${vol}%</b>
          <input type="range" min="0" max="200" value="${vol}" oninput="setClipVolumeV2(this.value)">
        </label>
        <label>Pan Clip: <b>${panTextV2(first.pan)}</b>
          <input type="range" min="-100" max="100" value="${pan}" oninput="setClipPanV2(this.value)">
        </label>
        <button onclick="resetClipMixV2()">Reset Volume/Pan</button>
      </div>

      <div class="pattern-actions-v2">
        <button onclick="trimStartClip()">✂ Trim Start</button>
        <button onclick="trimEndClip()">✂ Trim End</button>
        <button onclick="splitClipAtPlayhead()">✂ Split</button>
        <button onclick="copySelectedClip()">📋 Copy</button>
        <button onclick="pasteClip()">📌 Paste</button>
        <button onclick="duplicateSelectedClip()">⧉ Duplicate</button>
        <button onclick="renameSelectedClip()">✏ Rename</button>
        <button onclick="undoTimelineV2()">↶ Undo</button>
        <button onclick="redoTimelineV2()">↷ Redo</button>
        <button class="danger" onclick="deleteSelectedClip()">🗑 Delete</button>
      </div>`;
  };

  function connectClipOutputV2(ctx, source, clip){
    ensureClipMixDataV2(clip);
    const gain=ctx.createGain();
    gain.gain.value=clip.volume;
    const panner=ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    source.connect(gain);
    if(panner){
      panner.pan.value=clip.pan;
      gain.connect(panner);
      panner.connect(getMasterOutput());
    }else{
      gain.connect(getMasterOutput());
    }
  }

  function playImportedClipWithMixV2(c, delay=0, offsetInClip=0){
    if(typeof importedAudioBuffers==='undefined' || !importedAudioBuffers[c.id])return;

    if(typeof importedAudioSources!=='undefined' && importedAudioSources[c.id]){
      try{ importedAudioSources[c.id].stop(); }catch(e){}
      delete importedAudioSources[c.id];
    }

    const ctx=getAudioContext();
    const src=ctx.createBufferSource();
    const buffer=importedAudioBuffers[c.id];
    src.buffer=buffer;

    connectClipOutputV2(ctx,src,c);

    const offset=Math.max(0, Number(c.audioOffset||0) + Number(c.trimStart||0) + Number(offsetInClip||0));
    const maxDur=Math.max(0.05, Math.min(Number(c.duration||0)-Number(offsetInClip||0), buffer.duration-offset));
    try{ src.start(ctx.currentTime + Math.max(0,delay||0), offset, maxDur); }catch(e){ console.warn(e); }

    src.onended=()=>{ if(typeof importedAudioSources!=='undefined' && importedAudioSources[c.id]===src) delete importedAudioSources[c.id]; };
    if(typeof importedAudioSources!=='undefined')importedAudioSources[c.id]=src;
  }

  window.playClipV2 = function(c, delay=0, offsetInClip=0){
    ensureClipMixDataV2(c);
    if(c.source==='import'){
      playImportedClipWithMixV2(c,delay,offsetInClip);
      return;
    }

    setTimeout(()=>{
      const oldMaster=masterBus && masterBus.gain ? masterBus.gain.value : null;
      if(c.track==='Drum')playDrum(c.note,false);
      else if(c.track==='Piano')playPiano(c.note,false);
      else if(c.track==='Guitar')playGuitar(c.note,false);
      else if(c.track==='Bass')playBass(c.note,false);
    }, Math.max(0,delay*1000));
  };

  window.startTrimVisualV2 = function(ev,id,side){
    ev.stopPropagation();
    ev.preventDefault();

    const clip=(typeof timelineClips!=='undefined'?timelineClips:[]).find(c=>c.id===id);
    if(!clip)return;

    if(typeof pushUndoV2==='function')pushUndoV2();

    if(typeof ensureTrimDataV2==='function')ensureTrimDataV2(clip);
    ensureClipMixDataV2(clip);
    if(typeof setSelectionV2==='function')setSelectionV2([id]);
    else selectedClipId=id;

    const startX=ev.clientX || 0;
    const oldStart=Number(clip.startTime)||0;
    const oldDuration=Number(clip.duration)||0.1;
    const oldTrimStart=Number(clip.trimStart)||0;
    const oldTrimEnd=Number(clip.trimEnd)||0;
    const full=(typeof getClipFullDurationV2==='function')?getClipFullDurationV2(clip):Math.max(oldDuration+oldTrimStart+oldTrimEnd,oldDuration);
    const minDur=typeof V2_MIN_CLIP_SECONDS!=='undefined'?V2_MIN_CLIP_SECONDS:0.1;

    function move(e){
      const x=e.clientX || startX;
      const delta=(x-startX)/(typeof V2_PX_PER_SECOND!=='undefined'?V2_PX_PER_SECOND:30);

      if(side==='left'){
        let newTrimStart=Math.max(0, Math.min(full-oldTrimEnd-minDur, oldTrimStart + delta));
        if(typeof snapTimeV2==='function')newTrimStart=snapTimeV2(newTrimStart);
        newTrimStart=Math.max(0, Math.min(full-oldTrimEnd-minDur, newTrimStart));

        const trimDelta=newTrimStart-oldTrimStart;
        clip.trimStart=newTrimStart;
        clip.startTime=Math.max(0, oldStart + trimDelta);
        clip.duration=Math.max(minDur, full - clip.trimStart - oldTrimEnd);
        clip.audioOffset=Number(clip.audioOffset||0) + Math.max(0, trimDelta);
      }else{
        let newTrimEnd=Math.max(0, Math.min(full-oldTrimStart-minDur, oldTrimEnd - delta));
        if(typeof snapTimeV2==='function')newTrimEnd=snapTimeV2(newTrimEnd);
        newTrimEnd=Math.max(0, Math.min(full-oldTrimStart-minDur, newTrimEnd));

        clip.trimEnd=newTrimEnd;
        clip.duration=Math.max(minDur, full - oldTrimStart - clip.trimEnd);
      }

      renderTimeline();
      if(typeof showTrimInfoV2==='function')showTrimInfoV2(clip);
    }

    function up(){
      document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',up);
      if(typeof hideTrimInfoV2==='function')hideTrimInfoV2();
      renderTimeline();
    }

    document.addEventListener('pointermove',move);
    document.addEventListener('pointerup',up);
  };

  const oldRenderTimelineMixFinal = window.renderTimeline || renderTimeline;
  window.renderTimeline = function(active=-1){
    if(typeof timelineClips!=='undefined')timelineClips.forEach(ensureClipMixDataV2);
    oldRenderTimelineMixFinal(active);
    ensureClipMixButtonV2();
  };

  function ensureClipMixButtonV2(){
    const bar=document.querySelector('#timelinePanel .timeline-controls');
    if(!bar || document.getElementById('mixResetBtnV2'))return;
    const btn=document.createElement('button');
    btn.id='mixResetBtnV2';
    btn.textContent='Reset Mix Clip';
    btn.onclick=resetClipMixV2;
    bar.appendChild(btn);
  }
})();

/* =========================================================
   V2 CLEAN FINAL TIMELINE ENGINE
   Fungsi utama disatukan di sini:
   - renderTimeline
   - playTimeline
   - renderClipTimeline
   - renderPatternList
   - Multi Select Lasso 100%
   Catatan: fungsi lama tetap menjadi cadangan, tetapi yang dipakai browser
   adalah versi final di bawah ini karena posisinya paling akhir.
========================================================= */

(function(){
  const PX = typeof V2_PX_PER_SECOND !== 'undefined' ? V2_PX_PER_SECOND : 30;
  const PAGE = typeof V2_PAGE_SECONDS !== 'undefined' ? V2_PAGE_SECONDS : 20;
  const MIN_DUR = typeof V2_MIN_CLIP_SECONDS !== 'undefined' ? V2_MIN_CLIP_SECONDS : 0.10;

  window.selectedClipIdsV2 = Array.isArray(window.selectedClipIdsV2) ? window.selectedClipIdsV2 : [];
  window.multiSelectModeV2 = !!window.multiSelectModeV2;
  window.lassoStateV2 = null;

  function safeClips(){
    if(typeof timelineClips === 'undefined') window.timelineClips=[];
    return timelineClips;
  }

  function clamp(n,min,max){ return Math.max(min, Math.min(max, Number(n)||0)); }

  window.ensureClipMixDataV2 = window.ensureClipMixDataV2 || function(c){
    if(!c)return c;
    if(typeof c.volume!=='number')c.volume=1;
    if(typeof c.pan!=='number')c.pan=0;
    c.volume=clamp(c.volume,0,2);
    c.pan=clamp(c.pan,-1,1);
    return c;
  };

  window.panTextV2 = window.panTextV2 || function(p){
    p=Number(p)||0;
    if(Math.abs(p)<.01)return 'Center';
    return p<0?'L '+Math.round(Math.abs(p)*100):'R '+Math.round(p*100);
  };

  window.isSelectedClipV2 = function(id){
    return window.selectedClipIdsV2.includes(id) || selectedClipId===id;
  };

  window.setSelectionV2 = function(ids){
    window.selectedClipIdsV2=[...new Set((ids||[]).filter(Boolean))];
    selectedClipId=window.selectedClipIdsV2[0] || null;
    selectedAudioId=selectedClipId;
  };

  window.getSelectedClipsV2 = function(){
    const ids=window.selectedClipIdsV2.length ? window.selectedClipIdsV2 : (selectedClipId?[selectedClipId]:[]);
    return safeClips().filter(c=>ids.includes(c.id));
  };

  window.selectClipProV2 = function(ev,id){
    if(ev)ev.stopPropagation();
    if(window.multiSelectModeV2 || (ev && (ev.shiftKey||ev.ctrlKey||ev.metaKey))){
      if(window.selectedClipIdsV2.includes(id)){
        window.selectedClipIdsV2=window.selectedClipIdsV2.filter(x=>x!==id);
      }else{
        window.selectedClipIdsV2.push(id);
      }
      selectedClipId=window.selectedClipIdsV2[0] || null;
    }else{
      setSelectionV2([id]);
    }
    renderTimeline();
  };

  window.selectClip = function(id){
    setSelectionV2([id]);
    renderTimeline();
  };

  window.toggleMultiSelectV2 = function(){
    window.multiSelectModeV2=!window.multiSelectModeV2;
    renderTimeline();
  };

  window.startLassoV2 = function(ev,trackId){
    if(!window.multiSelectModeV2)return;
    if(ev.target && ev.target.closest('.timeline-clip-v2'))return;
    ev.stopPropagation();
    ev.preventDefault();

    const startX=ev.clientX, startY=ev.clientY;
    const box=document.createElement('div');
    box.className='lasso-box-v2';
    box.style.left=startX+'px';
    box.style.top=startY+'px';
    box.style.width='0px';
    box.style.height='0px';
    document.body.appendChild(box);

    function move(e){
      const x=e.clientX, y=e.clientY;
      const left=Math.min(startX,x), top=Math.min(startY,y);
      const width=Math.abs(x-startX), height=Math.abs(y-startY);
      box.style.left=left+'px';
      box.style.top=top+'px';
      box.style.width=width+'px';
      box.style.height=height+'px';
    }

    function up(){
      document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',up);
      const r=box.getBoundingClientRect();
      const ids=[];
      document.querySelectorAll('.timeline-clip-v2[data-clip-id]').forEach(el=>{
        const a=el.getBoundingClientRect();
        const hit=!(a.right<r.left || a.left>r.right || a.bottom<r.top || a.top>r.bottom);
        if(hit)ids.push(el.dataset.clipId);
      });
      box.remove();
      setSelectionV2(ids);
      renderTimeline();
    }

    document.addEventListener('pointermove',move);
    document.addEventListener('pointerup',up);
  };

  window.ensureEditorButtonsV2 = function(){
    const bar=document.querySelector('#timelinePanel .timeline-controls');
    if(!bar)return;
    const defs=[
      ['multiBtnV2',toggleMultiSelectV2,()=>window.multiSelectModeV2?'Multi ON':'Multi OFF'],
      ['copyBtnV2',()=>copySelectedClip(),'Copy'],
      ['pasteBtnV2',()=>pasteClip(),'Paste'],
      ['dupBtnV2',()=>duplicateSelectedClip(),'Duplicate'],
      ['deleteBtnV2',()=>deleteSelectedClip(),'Delete'],
      ['undoBtnV2',()=>undoTimelineV2(),'Undo'],
      ['redoBtnV2',()=>redoTimelineV2(),'Redo'],
      ['mixResetBtnV2',()=>resetClipMixV2(),'Reset Mix Clip']
    ];
    defs.forEach(([id,fn,label])=>{
      let b=document.getElementById(id);
      if(!b){
        b=document.createElement('button');
        b.id=id;
        b.onclick=fn;
        bar.appendChild(b);
      }
      b.textContent=typeof label==='function'?label():label;
    });
  };

  window.renderPatternList = function(){
    let box=document.getElementById('patternList');
    const panel=document.getElementById('timelinePanel');
    if(!panel)return;
    if(!box){
      box=document.createElement('div');
      box.id='patternList';
      box.className='pattern-list-v2';
      panel.appendChild(box);
    }

    const selected=getSelectedClipsV2().map(c=>ensureClipMixDataV2(c));
    if(!selected.length){
      box.innerHTML='<h3>List Pattern</h3><p class="empty-record">Pilih waveform clip dulu.</p>';
      return;
    }

    const first=selected[0];
    const label=selected.length===1?first.name:(selected.length+' clip terpilih');
    const vol=Math.round((first.volume??1)*100);
    const pan=Math.round((first.pan??0)*100);

    box.innerHTML=`
      <h3>List Pattern</h3>
      <div class="selected-pattern-name">Audio Terpilih: <b>${label}</b></div>
      <div class="clip-mix-v2">
        <label>Volume Clip: <b>${vol}%</b>
          <input type="range" min="0" max="200" value="${vol}" oninput="setClipVolumeV2(this.value)">
        </label>
        <label>Pan Clip: <b>${panTextV2(first.pan)}</b>
          <input type="range" min="-100" max="100" value="${pan}" oninput="setClipPanV2(this.value)">
        </label>
        <button onclick="resetClipMixV2()">Reset Volume/Pan</button>
      </div>
      <div class="pattern-actions-v2">
        <button onclick="trimStartClip()">✂ Trim Start</button>
        <button onclick="trimEndClip()">✂ Trim End</button>
        <button onclick="splitClipAtPlayhead()">✂ Split</button>
        <button onclick="copySelectedClip()">📋 Copy</button>
        <button onclick="pasteClip()">📌 Paste</button>
        <button onclick="duplicateSelectedClip()">⧉ Duplicate</button>
        <button onclick="renameSelectedClip()">✏ Rename</button>
        <button onclick="undoTimelineV2()">↶ Undo</button>
        <button onclick="redoTimelineV2()">↷ Redo</button>
        <button class="danger" onclick="deleteSelectedClip()">🗑 Delete</button>
      </div>`;
  };

  window.renderClipTimeline = function(){
    ensureV2Tracks();
    const wrap=document.getElementById('audioTracks');
    if(!wrap)return;

    const pageStart=v2CurrentPageStart();
    const pageEnd=v2CurrentPageEnd();
    const laneWidth=PAGE*PX;

    wrap.innerHTML=tracks.map(t=>{
      const clips=safeClips()
        .map(c=>{
          if(typeof ensureTrimDataV2==='function')ensureTrimDataV2(c);
          ensureClipMixDataV2(c);
          return c;
        })
        .filter(c=>c.track===t.id && c.startTime < pageEnd && (c.startTime+c.duration) > pageStart);

      const html=clips.map(c=>{
        const bars=(c.waveform||makeSyntheticWaveform(c.name)).map(v=>`<span class="wavebar" style="height:${Math.max(6,Math.round(v*46))}px"></span>`).join('');
        const selected=isSelectedClipV2(c.id)?' selected multi-selected-v2':'';
        const full=typeof getClipFullDurationV2==='function'?getClipFullDurationV2(c):Math.max(Number(c.duration)||1,1);
        const leftPct=typeof c.trimStart==='number'?Math.max(0,Math.min(95,(c.trimStart/full)*100)):0;
        const rightPct=typeof c.trimEnd==='number'?Math.max(0,Math.min(95,(c.trimEnd/full)*100)):0;
        const trimLabel=(c.trimStart||c.trimEnd)?`<span class="trim-label-v2">trim ${Math.round(c.trimStart||0)}s / ${Math.round(c.trimEnd||0)}s</span>`:'';
        const mixLabel=`<span class="clip-mix-label-v2">Vol ${Math.round((c.volume||1)*100)}% • ${panTextV2(c.pan)}</span>`;

        return `<div class="audio-clip timeline-clip-v2 trim-visual-clip-v2${selected}" draggable="true" data-clip-id="${c.id}"
          style="left:${v2ClipLeft(c.startTime)}px;width:${v2ClipWidth(c.duration)}px;opacity:${Math.max(.25,Math.min(1,c.volume||1))}"
          onclick="selectClipProV2(event,'${c.id}')"
          onpointerdown="startDragClipV2(event,'${c.id}')"
          ondragstart="dragClipV2(event,'${c.id}')"
          title="${c.name} • ${v2FormatSeconds(c.startTime)} • Vol ${Math.round((c.volume||1)*100)}% • ${panTextV2(c.pan)}">
            <span class="trim-shadow-v2 left" style="width:${leftPct}%"></span>
            <span class="trim-shadow-v2 right" style="width:${rightPct}%"></span>
            <span class="trim-handle-v2 left" onpointerdown="startTrimVisualV2(event,'${c.id}','left')">◀</span>
            <span class="clip-name-v2">${c.name}</span>${mixLabel}${trimLabel}${bars}
            <span class="trim-handle-v2 right" onpointerdown="startTrimVisualV2(event,'${c.id}','right')">▶</span>
          </div>`;
      }).join('');

      return `<div class="audio-row v2-track-row">
        <div class="audio-title">${t.title}<div class="audio-tools">
          <button class="audio-mini-btn" onclick="renameTrack('${t.id}')">Rename</button>
          ${t.id.startsWith('Custom')?`<button class="audio-mini-btn danger" onclick="deleteTrack('${t.id}')">X</button>`:''}
        </div></div>
        <div class="audio-lane v2-lane" data-track-id="${t.id}" style="min-width:${laneWidth}px"
          onclick="setPlayheadFromLane(event)"
          onpointerdown="startLassoV2(event,'${t.id}')"
          ondragover="event.preventDefault()"
          ondrop="dropClipV2(event,'${t.id}')">${html}</div>
      </div>`;
    }).join('');
  };

  function playImportedClipCleanV2(c,delay=0,offsetInClip=0){
    if(typeof importedAudioBuffers==='undefined' || !importedAudioBuffers[c.id])return;
    if(typeof importedAudioSources!=='undefined' && importedAudioSources[c.id]){
      try{importedAudioSources[c.id].stop();}catch(e){}
      delete importedAudioSources[c.id];
    }

    const ctx=getAudioContext();
    const src=ctx.createBufferSource();
    const gain=ctx.createGain();
    const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
    const buffer=importedAudioBuffers[c.id];

    ensureClipMixDataV2(c);
    src.buffer=buffer;
    gain.gain.value=c.volume;

    src.connect(gain);
    if(pan){
      pan.pan.value=c.pan;
      gain.connect(pan);
      pan.connect(getMasterOutput());
    }else{
      gain.connect(getMasterOutput());
    }

    const offset=Math.max(0,Number(c.audioOffset||0)+Number(c.trimStart||0)+Number(offsetInClip||0));
    const dur=Math.max(0.05,Math.min(Number(c.duration||0)-Number(offsetInClip||0),buffer.duration-offset));
    try{src.start(ctx.currentTime+Math.max(0,delay),offset,dur);}catch(e){console.warn(e);}
    src.onended=()=>{if(typeof importedAudioSources!=='undefined' && importedAudioSources[c.id]===src)delete importedAudioSources[c.id];};
    if(typeof importedAudioSources!=='undefined')importedAudioSources[c.id]=src;
  }

  window.playClipV2 = function(c,delay=0,offsetInClip=0){
    ensureClipMixDataV2(c);
    if(c.source==='import'){
      playImportedClipCleanV2(c,delay,offsetInClip);
      return;
    }
    setTimeout(()=>{
      if(c.track==='Drum')playDrum(c.note,false);
      else if(c.track==='Piano')playPiano(c.note,false);
      else if(c.track==='Guitar')playGuitar(c.note,false);
      else if(c.track==='Bass')playBass(c.note,false);
    },Math.max(0,delay*1000));
  };

  window.playTimeline = function(){
    if(!safeClips().length)return;
    stopTimeline(false);
    if(typeof stopAllImportedAudio==='function')stopAllImportedAudio();
    setPlayingUI(true);
    const start=Number(playheadTime)||0;
    v2PlayStartClock=Date.now()-start*1000;

    safeClips().filter(c=>(Number(c.startTime||0)+Number(c.duration||0))>=start).forEach(c=>{
      const cStart=Number(c.startTime)||0;
      const delay=Math.max(0,cStart-start);
      const offsetInClip=Math.max(0,start-cStart);
      v2PlayTimers.push(setTimeout(()=>playClipV2(c,0,offsetInClip),delay*1000));
    });

    playTimer=setInterval(()=>{
      playheadTime=(Date.now()-v2PlayStartClock)/1000;
      if(playheadTime>=totalStepPages*PAGE){stopTimeline();return;}
      currentStepPage=Math.floor(playheadTime/PAGE);
      renderTimeline();
    },100);
  };

  window.renderTimeline = function(active=-1){
    ensureV2Tracks();
    safeClips().forEach(ensureClipMixDataV2);
    updatePageText();
    renderTimeRuler();
    renderClipTimeline();
    renderPatternList();
    if(typeof ensureSnapButtonV2==='function')ensureSnapButtonV2();
    if(typeof updateSnapButtonV2==='function')updateSnapButtonV2();
    if(typeof ensureSplitButtonV2==='function')ensureSplitButtonV2();
    ensureEditorButtonsV2();

    const old=document.getElementById('timelineTracks');
    if(old){old.innerHTML='';old.style.display='none';}

    const line=document.getElementById('playheadLine');
    if(line){
      line.style.left=(76+v2ClipLeft(playheadTime))+'px';
      line.classList.add('show');
    }
    updateTimeDisplay(playheadTime*1000);
  };
})();

/* ===== EDITOR MUSIK V4 FIX + LIST REKAM TIMELINE =====
   - Memperbaiki error duplikasi DRUM_ASSET_MAP
   - Menambahkan List Rekam Timeline
   - Menyimpan timelineClips ke project JSON
   - ID timelinePanel tetap dipakai agar kode lama aman
*/
var timelineRecordsV4 = Array.isArray(typeof timelineRecordsV4 !== 'undefined' ? timelineRecordsV4 : null) ? timelineRecordsV4 : [];

function safeCloneV4(obj){
  try{return JSON.parse(JSON.stringify(obj));}
  catch(e){return obj;}
}

function getTimelineClipCountV4(){
  return Array.isArray(timelineClips) ? timelineClips.length : 0;
}

function getTimelineDurationV4(clips){
  clips = Array.isArray(clips) ? clips : [];
  let end = 0;
  clips.forEach(c=>{
    end = Math.max(end, Number(c.startTime || 0) + Number(c.duration || 0));
  });
  return end;
}

function saveTimelineRecordV4(){
  if(typeof timelineClips === 'undefined' || !Array.isArray(timelineClips) || timelineClips.length === 0){
    alert('Editor Musik masih kosong. Tambahkan clip dulu.');
    return;
  }

  const defaultName = 'Timeline_Record_' + String(timelineRecordsV4.length + 1).padStart(2,'0');
  const name = prompt('Nama rekam timeline:', defaultName);
  if(!name || !name.trim())return;

  const clips = safeCloneV4(timelineClips);
  const rec = {
    id:'tl_record_' + Date.now(),
    name:name.trim(),
    bpm:typeof bpm !== 'undefined' ? bpm : 120,
    tracks:safeCloneV4(typeof tracks !== 'undefined' ? tracks : []),
    clips,
    duration:getTimelineDurationV4(clips),
    createdAt:new Date().toLocaleString()
  };

  timelineRecordsV4.push(rec);
  renderTimelineRecordListV4();
}

function loadTimelineRecordToEditorV4(id, autoPlay=false){
  const rec = timelineRecordsV4.find(r=>r.id===id);
  if(!rec)return;

  if(typeof timelineClips !== 'undefined') timelineClips = safeCloneV4(rec.clips || []);
  if(typeof tracks !== 'undefined' && Array.isArray(rec.tracks) && rec.tracks.length) tracks = safeCloneV4(rec.tracks);
  if(typeof bpm !== 'undefined' && rec.bpm) bpm = rec.bpm;
  if(typeof playheadTime !== 'undefined') playheadTime = 0;
  if(typeof selectedClipId !== 'undefined') selectedClipId = null;

  const bpmText = document.getElementById('bpmText');
  if(bpmText)bpmText.textContent = bpm + ' BPM';

  if(typeof renderTimeline === 'function')renderTimeline();
  openPanel('timelinePanel');

  if(autoPlay && typeof playTimeline === 'function'){
    setTimeout(()=>playTimeline(),150);
  }
}

function playTimelineRecordV4(id){
  loadTimelineRecordToEditorV4(id, true);
}

function renameTimelineRecordV4(id){
  const rec = timelineRecordsV4.find(r=>r.id===id);
  if(!rec)return;
  const name = prompt('Nama baru:', rec.name);
  if(name && name.trim()){
    rec.name = name.trim();
    renderTimelineRecordListV4();
  }
}

function deleteTimelineRecordV4(id){
  const rec = timelineRecordsV4.find(r=>r.id===id);
  if(!rec)return;
  if(!confirm('Hapus ' + rec.name + '?'))return;
  timelineRecordsV4 = timelineRecordsV4.filter(r=>r.id!==id);
  renderTimelineRecordListV4();
}

function renderTimelineRecordListV4(){
  const box = document.getElementById('timelineRecordListV4');
  if(!box)return;

  if(!timelineRecordsV4.length){
    box.innerHTML = '<span class="empty-record">Belum ada rekam timeline</span>';
    return;
  }

  box.innerHTML = timelineRecordsV4.map(r=>`
    <div class="timeline-record-item">
      <div>
        <b>🎵 ${r.name}</b>
        <small>${(r.clips||[]).length} clip • ${formatTime((r.duration||0)*1000)} • BPM ${r.bpm||120}</small>
      </div>
      <div class="timeline-record-actions">
        <button onclick="loadTimelineRecordToEditorV4('${r.id}',false)">📂 Buka</button>
        <button onclick="playTimelineRecordV4('${r.id}')">▶ Play</button>
        <button onclick="renameTimelineRecordV4('${r.id}')">✏ Rename</button>
        <button class="danger" onclick="deleteTimelineRecordV4('${r.id}')">🗑 Hapus</button>
      </div>
    </div>
  `).join('');
}

// Override save project agar data V4 tidak hilang.

// Load Project V4 tambahan. Handler lama tetap aman, ini melengkapi data V4.
document.addEventListener('DOMContentLoaded',()=>{
  const input = document.getElementById('loadProjectInput');
  if(input && input.dataset.timelineRecordV4 !== '1'){
    input.dataset.timelineRecordV4 = '1';
    input.addEventListener('change',function(){
      const file = this.files && this.files[0];
      if(!file)return;
      const reader = new FileReader();
      reader.onload = function(){
        try{
          const data = JSON.parse(reader.result);
          if(typeof bpm !== 'undefined')bpm = data.bpm || bpm || 120;
          if(typeof tracks !== 'undefined' && Array.isArray(data.tracks))tracks = data.tracks;
          if(typeof totalStepPages !== 'undefined')totalStepPages = data.totalStepPages || totalStepPages || 4;
          if(typeof timelineClips !== 'undefined' && Array.isArray(data.timelineClips))timelineClips = data.timelineClips;
          if(Array.isArray(data.timelineRecordsV4))timelineRecordsV4 = data.timelineRecordsV4;
          if(Array.isArray(data.exportHistoryV4))exportHistoryV4 = data.exportHistoryV4;
          if(typeof legacyRecordedEvents !== 'undefined' && Array.isArray(data.legacyRecordedEvents))legacyRecordedEvents = data.legacyRecordedEvents;
          if(typeof importedAudioTracks !== 'undefined' && Array.isArray(data.importedAudioTracks))importedAudioTracks = data.importedAudioTracks;
          if(typeof masterWaveform !== 'undefined' && Array.isArray(data.masterWaveform))masterWaveform = data.masterWaveform;

          const bpmText = document.getElementById('bpmText');
          if(bpmText)bpmText.textContent = bpm + ' BPM';

          if(typeof updateRecordList === 'function')updateRecordList();
          if(typeof updateImportList === 'function')updateImportList();
          if(typeof renderMasterWaveform === 'function')renderMasterWaveform();
          if(typeof renderTimeline === 'function')renderTimeline();
          renderTimelineRecordListV4();
        }catch(e){
          console.warn('Load Project V4 gagal:',e);
        }
      };
      reader.readAsText(file);
    });
  }

  renderTimelineRecordListV4();

  const panel = document.getElementById('timelinePanel');
  if(panel){
    const h2 = panel.querySelector('.panel-head h2');
    const p = panel.querySelector('.panel-head p');
    if(h2)h2.textContent = '🎼 Editor Musik V2';
    if(p)p.textContent = 'Jantung Musik Studio Lite: track, clip, pattern, dan persiapan export';
  }
});

/* ===== NO 64 STEP LIMIT V4 =====
   Editor Musik tidak lagi berhenti di 64 step.
   Panjang mengikuti totalStepPages * 16.
   Default: 8 halaman = 128 step.
*/
function getMaxTimelineStepsV4(){
  return Math.max(16,(Number(totalStepPages)||1)*16);
}

function addTimelinePageV4(){
  totalStepPages = Math.min(32,(Number(totalStepPages)||1)+1);
  updatePageText();
  renderTimeline();
}

function removeTimelinePageV4(){
  totalStepPages = Math.max(1,(Number(totalStepPages)||1)-1);
  if(currentStepPage >= totalStepPages) currentStepPage = totalStepPages-1;
  const maxSteps = getMaxTimelineStepsV4();
  legacyRecordedEvents = legacyRecordedEvents.filter(e => Number(e.step||0) < maxSteps);
  updateRecordList();
  updatePageText();
  renderTimeline();
}

document.addEventListener('DOMContentLoaded',()=>{
  updatePageText();
});

/* ===== EXPORT TIMELINE RECORD V4 ===== */
var selectedTimelineRecordExportIdV4 = null;
var exportHistoryV4 = Array.isArray(typeof exportHistoryV4 !== 'undefined' ? exportHistoryV4 : null) ? exportHistoryV4 : [];

function getTimelineRecordsForExportV4(){
  if(typeof timelineRecordsV4 !== 'undefined' && Array.isArray(timelineRecordsV4)) return timelineRecordsV4;
  return [];
}
function refreshExportTimelineRecordsV4(){ renderExportTimelineRecordsV4(); }
function selectTimelineRecordForExportV4(id){
  selectedTimelineRecordExportIdV4 = id;
  renderExportTimelineRecordsV4();
}
function getSelectedTimelineRecordForExportV4(){
  return getTimelineRecordsForExportV4().find(r => r.id === selectedTimelineRecordExportIdV4) || null;
}
function renderExportTimelineRecordsV4(){
  const box = document.getElementById('exportTimelineListV4');
  const info = document.getElementById('exportSelectedInfoV4');
  if(!box) return;
  const records = getTimelineRecordsForExportV4();
  if(!records.length){
    box.innerHTML = '<span class="empty-record">Belum ada Timeline Record. Buka Editor Musik lalu tekan 💾 Simpan Timeline.</span>';
    if(info) info.textContent = 'Belum memilih Timeline Record';
    return;
  }
  if(!selectedTimelineRecordExportIdV4 || !records.some(r => r.id === selectedTimelineRecordExportIdV4)){
    selectedTimelineRecordExportIdV4 = records[records.length - 1].id;
  }
  box.innerHTML = records.map(r => {
    const selected = r.id === selectedTimelineRecordExportIdV4 ? ' selected' : '';
    const clips = Array.isArray(r.clips) ? r.clips.length : 0;
    const dur = typeof formatTime === 'function' ? formatTime((r.duration || 0) * 1000) : String(r.duration || 0);
    return `<button class="export-timeline-item${selected}" onclick="selectTimelineRecordForExportV4('${r.id}')"><b>🎵 ${r.name || 'Timeline Record'}</b><small>${clips} clip • ${dur} • BPM ${r.bpm || 120}</small></button>`;
  }).join('');
  const rec = getSelectedTimelineRecordForExportV4();
  if(info) info.textContent = rec ? `Dipilih: ${rec.name || 'Timeline Record'} • ${(rec.clips || []).length} clip • BPM ${rec.bpm || 120}` : 'Belum memilih Timeline Record';
}
function safeFilenameV4(name){
  return String(name || 'timeline_record').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_').slice(0,80);
}
function makeTimelineExportPayloadV4(rec, format){
  return {
    app:'Musik Studio Lite',
    version:'Export Timeline Record V4',
    format,
    exportedAt:new Date().toISOString(),
    record:rec,
    note:'Export terhubung ke Timeline Record. File ini adalah paket data export; render audio WAV/MP3 asli tahap berikutnya.'
  };
}
function downloadExportPayloadV4(rec, format){
  const payload = makeTimelineExportPayloadV4(rec, format);
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = safeFilenameV4(rec.name) + '_export_' + format.toLowerCase() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  exportHistoryV4.push({id:'export_'+Date.now(),name:rec.name || 'Timeline Record',format,createdAt:new Date().toLocaleString(),clips:Array.isArray(rec.clips) ? rec.clips.length : 0});
  renderExportHistoryV4();
  const status = document.getElementById('exportStatusV4');
  if(status) status.textContent = `Status: ${format} dibuat untuk ${rec.name || 'Timeline Record'}`;
}
function exportSelectedTimelineRecordWavV4(){
  const rec = getSelectedTimelineRecordForExportV4();
  if(!rec){ alert('Pilih Timeline Record dulu.'); return; }
  downloadExportPayloadV4(rec,'WAV');
}
function exportSelectedTimelineRecordMp3V4(){
  const rec = getSelectedTimelineRecordForExportV4();
  if(!rec){ alert('Pilih Timeline Record dulu.'); return; }
  downloadExportPayloadV4(rec,'MP3');
}
function renderExportHistoryV4(){
  const box = document.getElementById('exportHistoryListV4');
  if(!box) return;
  if(!exportHistoryV4.length){
    box.innerHTML = '<span class="empty-record">Belum ada hasil export</span>';
    return;
  }
  box.innerHTML = exportHistoryV4.slice().reverse().map(h => `<div class="export-history-item"><div><b>📦 ${h.name}</b><small>${h.format} • ${h.clips} clip • ${h.createdAt}</small></div></div>`).join('');
}
const _openPanelBeforeExportTimelineV4 = typeof openPanel === 'function' ? openPanel : null;

document.addEventListener('DOMContentLoaded',()=>{ renderExportTimelineRecordsV4(); renderExportHistoryV4(); });

let projectsV4=[];
function renderProjectListV4(){
 const box=document.getElementById('projectListV4');
 if(!box)return;
 if(!projectsV4.length){box.innerHTML='<span class="empty-record">Belum ada project</span>';return;}
 box.innerHTML=projectsV4.map(p=>`<div class="project-item-v4"><b>📁 ${p.name}</b><div><button onclick="renameProjectV4('${p.id}')">✏</button><button onclick="deleteProjectV4('${p.id}')">🗑</button></div></div>`).join('');
}
function createProjectV4(){const n=prompt('Nama project:','Project Baru');if(!n)return;projectsV4.push({id:'pj'+Date.now(),name:n});renderProjectListV4();}
function renameProjectV4(id){const p=projectsV4.find(x=>x.id===id);if(!p)return;const n=prompt('Nama baru:',p.name);if(n){p.name=n;renderProjectListV4();}}
function deleteProjectV4(id){projectsV4=projectsV4.filter(x=>x.id!==id);renderProjectListV4();}
document.addEventListener('DOMContentLoaded',renderProjectListV4);

/* ===== SAVE / LOAD PATTERN V4 ===== */
var savedPatternsV4 = Array.isArray(typeof savedPatternsV4 !== 'undefined' ? savedPatternsV4 : null) ? savedPatternsV4 : [];

function clonePatternV4(obj){
  try{return JSON.parse(JSON.stringify(obj));}
  catch(e){return obj;}
}

function getCurrentPatternEventsV4(){
  if(typeof legacyRecordedEvents !== 'undefined' && Array.isArray(legacyRecordedEvents)){
    return clonePatternV4(legacyRecordedEvents);
  }
  return [];
}

function savePatternV4(){
  const events = getCurrentPatternEventsV4();
  if(!events.length){
    alert('Editor Musik masih kosong. Rekam atau tambahkan clip/note dulu.');
    return;
  }

  const name = prompt('Nama Pattern:', 'Pattern ' + String(savedPatternsV4.length + 1).padStart(2,'0'));
  if(!name || !name.trim())return;

  savedPatternsV4.push({
    id:'ptn_' + Date.now(),
    name:name.trim(),
    bpm:typeof bpm !== 'undefined' ? bpm : 120,
    totalStepPages:typeof totalStepPages !== 'undefined' ? totalStepPages : 8,
    tracks:typeof tracks !== 'undefined' ? clonePatternV4(tracks) : [],
    events:events,
    createdAt:new Date().toLocaleString()
  });

  renderSavedPatternListV4();
  alert('Pattern tersimpan.');
}

function loadPatternV4(id){
  const p = savedPatternsV4.find(x=>x.id===id);
  if(!p)return;

  const mode = prompt('Load Pattern:\n1 = Ganti isi Editor Musik\n2 = Tambahkan ke akhir\n3 = Batal','2');
  if(mode === '1'){
    if(typeof legacyRecordedEvents !== 'undefined') legacyRecordedEvents = clonePatternV4(p.events || []);
  }else if(mode === '2'){
    const current = Array.isArray(legacyRecordedEvents) ? legacyRecordedEvents : [];
    const maxStep = current.length ? Math.max(...current.map(e=>Number(e.step||0))) + 1 : 0;
    const add = (p.events || []).map(e => ({
      ...clonePatternV4(e),
      id:uid(),
      step:Number(e.step||0) + maxStep,
      time:Date.now() - recordStartTime
    }));
    legacyRecordedEvents = current.concat(add);
  }else{
    return;
  }

  if(typeof bpm !== 'undefined' && p.bpm) bpm = p.bpm;
  const bpmText=document.getElementById('bpmText');
  if(bpmText)bpmText.textContent=bpm+' BPM';

  if(typeof updateRecordList === 'function') updateRecordList();
  if(typeof renderTimeline === 'function') renderTimeline();
  if(typeof openPanel === 'function') openPanel('timelinePanel');
}

function renamePatternV4(id){
  const p = savedPatternsV4.find(x=>x.id===id);
  if(!p)return;
  const name = prompt('Nama baru pattern:', p.name);
  if(name && name.trim()){
    p.name = name.trim();
    renderSavedPatternListV4();
  }
}

function deletePatternV4(id){
  const p = savedPatternsV4.find(x=>x.id===id);
  if(!p)return;
  if(!confirm('Hapus pattern: ' + p.name + '?'))return;
  savedPatternsV4 = savedPatternsV4.filter(x=>x.id!==id);
  renderSavedPatternListV4();
}

function duplicatePatternV4(id){
  const p = savedPatternsV4.find(x=>x.id===id);
  if(!p)return;
  const copy = clonePatternV4(p);
  copy.id = 'ptn_' + Date.now();
  copy.name = p.name + ' Copy';
  copy.createdAt = new Date().toLocaleString();
  savedPatternsV4.push(copy);
  renderSavedPatternListV4();
}

function renderSavedPatternListV4(){
  const box = document.getElementById('savedPatternListV4');
  if(!box)return;

  if(!savedPatternsV4.length){
    box.innerHTML = '<span class="empty-record">Belum ada pattern tersimpan</span>';
    return;
  }

  box.innerHTML = savedPatternsV4.map(p=>{
    const count = Array.isArray(p.events) ? p.events.length : 0;
    return `
      <div class="saved-pattern-item-v4">
        <div>
          <b>📋 ${p.name}</b>
          <small>${count} note/clip • BPM ${p.bpm || 120} • ${p.createdAt || ''}</small>
        </div>
        <div class="saved-pattern-actions-v4">
          <button onclick="loadPatternV4('${p.id}')">📂 Load</button>
          <button onclick="duplicatePatternV4('${p.id}')">📑 Duplikat</button>
          <button onclick="renamePatternV4('${p.id}')">✏ Rename</button>
          <button class="danger" onclick="deletePatternV4('${p.id}')">🗑 Hapus</button>
        </div>
      </div>
    `;
  }).join('');
}

// Pastikan saveProject final ikut menyimpan savedPatternsV4.
// Jika fungsi projectFinalDataV4 sudah ada, override aman dengan versi lengkap.
if(typeof projectFinalDataV4 === 'function'){
  const _projectFinalDataBeforePatternV4 = projectFinalDataV4;
  projectFinalDataV4 = function(){
    const data = _projectFinalDataBeforePatternV4();
    data.savedPatternsV4 = clonePatternV4(savedPatternsV4);
    return data;
  };
}

document.addEventListener('DOMContentLoaded',()=>{
  renderSavedPatternListV4();
});

var markersV4=[];

function renderMarkerListV4(){
 const box=document.getElementById('markerListV4');
 if(!box)return;
 if(!markersV4.length){box.innerHTML='<span class="empty-record">Belum ada marker</span>';return;}
 box.innerHTML=markersV4.map(m=>`<div class="marker-item-v4">
 <b>📌 ${m.name}</b>
 <span>Step ${m.step+1}</span>
 <button onclick="gotoMarkerV4(${m.step})">🎯</button>
 <button onclick="deleteMarkerV4('${m.id}')">🗑</button>
 </div>`).join('');
}

function addMarkerV4(){
 const name=prompt('Nama Marker','Verse');
 if(!name)return;
 const step=(currentStepPage||0)*16;
 markersV4.push({id:'mk'+Date.now(),name:name,step:step});
 renderMarkerListV4();
}

function gotoMarkerV4(step){
 currentStepPage=Math.floor(step/16);
 if(typeof renderTimeline==='function')renderTimeline();
}

function deleteMarkerV4(id){
 markersV4=markersV4.filter(m=>m.id!==id);
 renderMarkerListV4();
}

document.addEventListener('DOMContentLoaded',renderMarkerListV4);

/* ===== LOOP AREA FINAL V4 ===== */
var loopAreaV4 = (typeof loopAreaV4 !== 'undefined' && loopAreaV4) ? loopAreaV4 : {
  enabled:false,
  start:0,
  end:15
};

function getMaxTimelineStepV4(){
  return Math.max(16,(Number(totalStepPages)||1)*16);
}

function normalizeLoopAreaV4(){
  const max = getMaxTimelineStepV4();
  loopAreaV4.start = Math.max(0,Math.min(max-1,Number(loopAreaV4.start)||0));
  loopAreaV4.end = Math.max(loopAreaV4.start,Math.min(max-1,Number(loopAreaV4.end)||15));
}

function getCurrentStepForLoopV4(){
  if(typeof currentPlayIndex !== 'undefined' && currentPlayIndex > 0){
    return Math.max(0,currentPlayIndex-1);
  }
  return Math.max(0,(Number(currentStepPage)||0)*16);
}

function updateLoopAreaStatusV4(){
  normalizeLoopAreaV4();

  const status = document.getElementById('loopAreaStatusV4');
  const btn = document.getElementById('loopToggleBtnV4');

  if(status){
    status.textContent =
      'Loop: ' + (loopAreaV4.enabled ? 'ON' : 'OFF') +
      ' • A: ' + (loopAreaV4.start + 1) +
      ' • B: ' + (loopAreaV4.end + 1);
  }

  if(btn){
    btn.textContent = loopAreaV4.enabled ? 'Loop ON' : 'Loop OFF';
    btn.classList.toggle('active', !!loopAreaV4.enabled);
  }
}

function toggleLoopAreaV4(){
  loopAreaV4.enabled = !loopAreaV4.enabled;
  updateLoopAreaStatusV4();
}

function setLoopStartV4(){
  loopAreaV4.start = getCurrentStepForLoopV4();
  if(loopAreaV4.end <= loopAreaV4.start){
    loopAreaV4.end = Math.min(getMaxTimelineStepV4()-1, loopAreaV4.start + 15);
  }
  updateLoopAreaStatusV4();
}

function setLoopEndV4(){
  loopAreaV4.end = Math.max(loopAreaV4.start, getCurrentStepForLoopV4());
  updateLoopAreaStatusV4();
}

function clearLoopAreaV4(){
  loopAreaV4.enabled = false;
  loopAreaV4.start = 0;
  loopAreaV4.end = Math.min(15,getMaxTimelineStepV4()-1);
  updateLoopAreaStatusV4();
}

function playLoopAreaV4(){
  loopAreaV4.enabled = true;
  normalizeLoopAreaV4();
  currentStepPage = Math.floor(loopAreaV4.start/16);
  updateLoopAreaStatusV4();
  playTimeline();
}

// Override playTimeline agar mendukung Loop Area.
function playTimeline(){
  if(!legacyRecordedEvents.length)return;

  normalizeLoopAreaV4();
  stopTimeline(false);
  setPlayingUI(true);

  currentPlayIndex = loopAreaV4.enabled ? loopAreaV4.start : 0;

  const stepMs = (60/bpm)*1000;
  updateTimeDisplay(currentPlayIndex*stepMs);
  updatePlayhead(currentPlayIndex%16);

  playTimer = setInterval(()=>{
    const maxStep = getMaxTimelineStepV4();

    if(loopAreaV4.enabled && currentPlayIndex > loopAreaV4.end){
      currentPlayIndex = loopAreaV4.start;
    }

    if(!loopAreaV4.enabled && currentPlayIndex >= maxStep){
      stopTimeline();
      return;
    }

    legacyRecordedEvents
      .filter(e=>Number(e.step)===currentPlayIndex)
      .forEach(playEvent);

    currentStepPage = Math.floor(currentPlayIndex/16);

    if(typeof renderTimeline === 'function') renderTimeline(currentPlayIndex);
    updatePlayhead(currentPlayIndex%16);
    updateTimeDisplay(currentPlayIndex*stepMs);
    updateLoopAreaStatusV4();

    currentPlayIndex++;
  }, stepMs);
}

// Simpan Loop Area ke Save Project Final jika fungsi final tersedia.
if(typeof projectFinalDataV4 === 'function'){
  const _projectFinalDataBeforeLoopAreaV4 = projectFinalDataV4;
  projectFinalDataV4 = function(){
    const data = _projectFinalDataBeforeLoopAreaV4();
    data.loopAreaV4 = JSON.parse(JSON.stringify(loopAreaV4));
    return data;
  };
}

// Load Loop Area dari Project Final jika fungsi apply tersedia.
if(typeof applyProjectFinalV4 === 'function'){
  const _applyProjectFinalBeforeLoopAreaV4 = applyProjectFinalV4;
  applyProjectFinalV4 = function(data){
    _applyProjectFinalBeforeLoopAreaV4(data);
    if(data && data.loopAreaV4){
      loopAreaV4 = Object.assign({enabled:false,start:0,end:15}, data.loopAreaV4);
      updateLoopAreaStatusV4();
    }
  };
}

document.addEventListener('DOMContentLoaded',()=>{
  updateLoopAreaStatusV4();
});


/* ===== MASTER UI TO TOOLS V4.5 2A fallback was not applied: master block not found ===== */

function openPatternToolsV45(){
  const c=document.getElementById('toolsSheetContentV45');
  if(!c)return;
  c.innerHTML=`
  <button class="tool-back-v45" onclick="openToolHomeV45()">← Kembali</button>
  <div class="tool-card-v45">
    <button onclick="savePattern()">💾 Save Pattern</button>
    <button onclick="loadPattern()">📂 Load Pattern</button>
    <button onclick="renderPatternList&&renderPatternList()">📋 Refresh List</button>
    <button onclick="renamePattern&&renamePattern()">✏ Rename Pattern</button>
    <button onclick="duplicatePattern&&duplicatePattern()">📑 Duplicate Pattern</button>
    <button onclick="deletePattern&&deletePattern()">🗑 Delete Pattern</button>
  </div>
  <div class="tool-card-v45">
    <div id="patternToolsInfo">Pattern sekarang dapat diakses dari Tools.</div>
  </div>`;
}

/* ===== V4.5 Tahap 4A: Timeline Record ke Tools ===== */
function openTimelineRecordToolsV45(){
  const title=document.getElementById('toolsSheetTitleV45');
  const desc=document.getElementById('toolsSheetDescV45');
  const home=document.getElementById('toolsSheetHomeV45');
  const content=document.getElementById('toolsSheetContentV45');

  if(title)title.textContent='📋 Timeline Record';
  if(desc)desc.textContent='Simpan dan kelola susunan Editor Musik';
  if(home)home.style.display='none';
  if(!content)return;

  content.innerHTML = `
    <button class="tool-back-v45" onclick="openToolHomeV45()">← Kembali</button>
    <div class="tool-card-v45 timeline-record-tool-v45">
      <button onclick="timelineRecordSaveFromToolsV45()">💾 Save Record</button>
      <button onclick="timelineRecordRefreshFromToolsV45()">📋 Refresh List</button>
      <button onclick="timelineRecordRenameFromToolsV45()">✏ Rename Record</button>
      <button onclick="timelineRecordDeleteFromToolsV45()">🗑 Delete Record</button>
      <button onclick="timelineRecordAddToTimelineFromToolsV45()">➕ Add To Timeline</button>
    </div>
    <div class="tool-card-v45 timeline-record-tool-v45">
      <b>📋 List Rekam Timeline</b>
      <div id="timelineRecordToolsListV45" class="timeline-record-tools-list-v45">
        <span class="empty-record">Belum ada rekam timeline</span>
      </div>
    </div>
  `;
  timelineRecordRefreshFromToolsV45();
}

function getTimelineRecordSourceV45(){
  if(Array.isArray(window.timelineRecordsV4))return window.timelineRecordsV4;
  if(Array.isArray(window.timelineRecordListV4))return window.timelineRecordListV4;
  if(Array.isArray(window.savedTimelineRecordsV4))return window.savedTimelineRecordsV4;
  if(Array.isArray(window.savedTimelineRecordsV45))return window.savedTimelineRecordsV45;
  return null;
}

function timelineRecordSaveFromToolsV45(){
  if(typeof saveTimelineRecordV4==='function'){
    saveTimelineRecordV4();
    setTimeout(timelineRecordRefreshFromToolsV45,50);
    return;
  }

  const name=prompt('Nama Timeline Record:','Record '+new Date().toLocaleTimeString());
  if(!name)return;
  window.savedTimelineRecordsV45 = window.savedTimelineRecordsV45 || [];
  window.savedTimelineRecordsV45.push({
    id:'tr'+Date.now(),
    name:name.trim(),
    bpm:typeof bpm!=='undefined'?bpm:120,
    events:Array.isArray(legacyRecordedEvents)?JSON.parse(JSON.stringify(legacyRecordedEvents)):[]
  });
  timelineRecordRefreshFromToolsV45();
}

function timelineRecordRefreshFromToolsV45(){
  const wrap=document.getElementById('timelineRecordToolsListV45');
  if(!wrap)return;

  const oldList=document.getElementById('timelineRecordListV4');
  if(oldList && oldList.innerHTML.trim() && !oldList.innerHTML.includes('Belum ada')){
    wrap.innerHTML = oldList.innerHTML;
    return;
  }

  const records=getTimelineRecordSourceV45() || [];
  if(!records.length){
    wrap.innerHTML='<span class="empty-record">Belum ada rekam timeline</span>';
    return;
  }

  wrap.innerHTML = records.map((r,i)=>{
    const name=r.name || r.title || ('Record '+(i+1));
    const count=(r.events||r.legacyRecordedEvents||[]).length;
    return `<div class="timeline-record-tool-item-v45">
      <b>${i+1}. ${name}</b>
      <small>${count} item</small>
    </div>`;
  }).join('');
}

function timelineRecordRenameFromToolsV45(){
  const records=getTimelineRecordSourceV45() || [];
  if(!records.length){ alert('Belum ada Timeline Record.'); return; }
  const no=parseInt(prompt('Nomor record yang ingin di-rename:','1'),10)-1;
  if(no<0 || no>=records.length)return;
  const old=records[no].name || records[no].title || ('Record '+(no+1));
  const name=prompt('Nama baru:',old);
  if(!name)return;
  records[no].name=name.trim();
  records[no].title=name.trim();
  timelineRecordRefreshFromToolsV45();
  if(typeof renderTimelineRecordListV4==='function')renderTimelineRecordListV4();
}

function timelineRecordDeleteFromToolsV45(){
  const records=getTimelineRecordSourceV45() || [];
  if(!records.length){ alert('Belum ada Timeline Record.'); return; }
  const no=parseInt(prompt('Nomor record yang ingin dihapus:','1'),10)-1;
  if(no<0 || no>=records.length)return;
  if(!confirm('Hapus record ini?'))return;
  records.splice(no,1);
  timelineRecordRefreshFromToolsV45();
  if(typeof renderTimelineRecordListV4==='function')renderTimelineRecordListV4();
}

function timelineRecordAddToTimelineFromToolsV45(){
  const records=getTimelineRecordSourceV45() || [];
  if(!records.length){ alert('Belum ada Timeline Record.'); return; }
  const no=parseInt(prompt('Nomor record yang ingin dimasukkan ke timeline:','1'),10)-1;
  if(no<0 || no>=records.length)return;

  const r=records[no];
  const events=r.events || r.legacyRecordedEvents || [];
  if(Array.isArray(events) && events.length){
    legacyRecordedEvents = JSON.parse(JSON.stringify(events));
    updateRecordList();
    renderTimeline();
    alert('Timeline Record dimasukkan ke Editor Musik.');
    return;
  }
  alert('Record ini belum memiliki data event.');
}

/* ===== V4.5 Tahap 5A: Clip Selection System ===== */
function getSelectedClipV45(id){
  const clipId = id || selectedAudioId;
  if(!clipId || !Array.isArray(importedAudioTracks))return null;
  return importedAudioTracks.find(t=>t.id===clipId) || null;
}

function openClipEditorToolsV45(id){
  if(id)selectedAudioId=id;

  const clip=getSelectedClipV45();
  const sheet=document.getElementById('toolsSheetV45');
  const title=document.getElementById('toolsSheetTitleV45');
  const desc=document.getElementById('toolsSheetDescV45');
  const home=document.getElementById('toolsSheetHomeV45');
  const content=document.getElementById('toolsSheetContentV45');

  if(sheet)sheet.classList.add('show');
  if(title)title.textContent='✂ Clip Editor';
  if(desc)desc.textContent='Info clip yang sedang dipilih';
  if(home)home.style.display='none';
  if(!content)return;

  if(!clip){
    content.innerHTML = `
      <button class="tool-back-v45" onclick="openToolHomeV45()">← Kembali</button>
      <div class="tool-card-v45 clip-editor-empty-v45">
        <b>Belum ada clip dipilih</b>
        <small>Tekan audio clip di Timeline untuk membuka Clip Editor.</small>
      </div>
    `;
    return;
  }

  const duration = typeof clip.duration === 'number' ? formatTime(clip.duration*1000) : '-';
  const offset = typeof clip.offset === 'number' ? clip.offset : 0;
  const fileName = clip.fileName || 'Audio Clip';
  const name = clip.name || fileName || 'Clip';

  content.innerHTML = `
    <button class="tool-back-v45" onclick="openToolHomeV45()">← Kembali</button>

    <div class="tool-card-v45 clip-editor-card-v45">
      <b>🎧 ${name}</b>
      <small>File: ${fileName}</small>
      <small>Durasi: ${duration}</small>
      <small>Offset Timeline: ${offset}</small>
      <small>ID: ${clip.id}</small>
    </div>

    <div class="tool-card-v45 clip-editor-card-v45">
      <b>Status Tahap 5A</b>
      <small>Clip sudah bisa dipilih dan dibaca oleh Clip Editor.</small>
      <small>Tahap berikutnya: Split, Copy, Paste, Delete.</small>
    </div>
  `;

  if(typeof renderTimeline==='function')renderTimeline();
}

function closeClipEditorToolsV45(){
  selectedAudioId=null;
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openToolHomeV45==='function')openToolHomeV45();
}

/* ===== V4.5 Tahap 5B: Clip Basic Edit ===== */
var copiedAudioClipV45 = (typeof copiedAudioClipV45 !== 'undefined') ? copiedAudioClipV45 : null;

function getAudioClipIndexV45(id){
  if(!Array.isArray(importedAudioTracks))return -1;
  return importedAudioTracks.findIndex(c=>c.id===id);
}

function getAudioClipV45(id){
  const i=getAudioClipIndexV45(id);
  return i>=0 ? importedAudioTracks[i] : null;
}

function cloneAudioClipV45(clip){
  try{return JSON.parse(JSON.stringify(clip));}
  catch(e){return Object.assign({},clip);}
}

function refreshClipEditViewV45(){
  if(typeof updateImportList==='function')updateImportList();
  if(typeof renderMasterWaveform==='function')renderMasterWaveform();
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(selectedAudioId);
}

function copySelectedAudioClipV45(){
  const clip=getAudioClipV45(selectedAudioId);
  if(!clip){
    alert('Pilih audio clip dulu.');
    return;
  }
  copiedAudioClipV45=cloneAudioClipV45(clip);
  alert('Clip disalin.');
}

function pasteAudioClipV45(){
  if(!copiedAudioClipV45){
    alert('Belum ada clip yang disalin.');
    return;
  }
  const copy=cloneAudioClipV45(copiedAudioClipV45);
  copy.id='audio_'+Date.now();
  copy.name=(copy.name || copy.fileName || 'Audio Clip')+' Copy';
  copy.fileName=copy.fileName || copy.name;
  copy.offset=Number(copy.offset || 0)+1;
  importedAudioTracks.push(copy);
  selectedAudioId=copy.id;
  refreshClipEditViewV45();
}

function deleteSelectedAudioClipV45(){
  const idx=getAudioClipIndexV45(selectedAudioId);
  if(idx<0){
    alert('Pilih audio clip dulu.');
    return;
  }
  if(!confirm('Hapus clip ini?'))return;
  importedAudioTracks.splice(idx,1);
  selectedAudioId=null;
  refreshClipEditViewV45();
}

function splitSelectedAudioClipV45(){
  const clip=getAudioClipV45(selectedAudioId);
  if(!clip){
    alert('Pilih audio clip dulu.');
    return;
  }

  const dur=Number(clip.duration || 0);
  if(!dur || dur<=1){
    alert('Durasi clip terlalu pendek untuk split.');
    return;
  }

  const cutInput=prompt('Split di detik ke berapa?', String(Math.round(dur/2)));
  if(cutInput===null)return;
  const cut=Number(cutInput);

  if(!cut || cut<=0 || cut>=dur){
    alert('Posisi split tidak valid.');
    return;
  }

  const idx=getAudioClipIndexV45(clip.id);
  if(idx<0)return;

  const partA=cloneAudioClipV45(clip);
  const partB=cloneAudioClipV45(clip);

  partA.id='audio_'+Date.now()+'_A';
  partB.id='audio_'+Date.now()+'_B';

  partA.name=(clip.name || clip.fileName || 'Audio Clip')+' A';
  partB.name=(clip.name || clip.fileName || 'Audio Clip')+' B';

  partA.duration=cut;
  partB.duration=dur-cut;

  partB.trimStart=Number(clip.trimStart || 0)+cut;
  partB.offset=Number(clip.offset || 0)+cut;

  importedAudioTracks.splice(idx,1,partA,partB);
  selectedAudioId=partB.id;
  refreshClipEditViewV45();
}

function renameSelectedAudioClipV45(){
  const clip=getAudioClipV45(selectedAudioId);
  if(!clip){
    alert('Pilih audio clip dulu.');
    return;
  }
  const name=prompt('Nama clip:', clip.name || clip.fileName || 'Audio Clip');
  if(!name || !name.trim())return;
  clip.name=name.trim();
  refreshClipEditViewV45();
}

/* Upgrade panel Clip Editor 5A dengan tombol basic edit 5B */
const _openClipEditorToolsBefore5B = typeof openClipEditorToolsV45 === 'function' ? openClipEditorToolsV45 : null;
function openClipEditorToolsV45(id){
  if(_openClipEditorToolsBefore5B){
    _openClipEditorToolsBefore5B(id);
  }

  const content=document.getElementById('toolsSheetContentV45');
  const clip=getAudioClipV45(selectedAudioId);
  if(!content || !clip)return;

  const actions=document.createElement('div');
  actions.className='tool-card-v45 clip-basic-actions-v45';
  actions.innerHTML=`
    <b>🛠 Basic Edit</b>
    <div class="clip-basic-grid-v45">
      <button onclick="splitSelectedAudioClipV45()">✂ Split</button>
      <button onclick="copySelectedAudioClipV45()">📋 Copy</button>
      <button onclick="pasteAudioClipV45()">📌 Paste</button>
      <button onclick="deleteSelectedAudioClipV45()">🗑 Delete</button>
      <button onclick="renameSelectedAudioClipV45()">✏ Rename</button>
    </div>
  `;
  content.appendChild(actions);
}

/* ===== V4.5 Tahap 5C: Clip Properties ===== */
function ensureClipPropertiesV45(clip){
  if(!clip)return clip;
  if(typeof clip.volume !== 'number') clip.volume = 1;
  if(typeof clip.pan !== 'number') clip.pan = 0;
  if(!clip.color) clip.color = '#8b5cf6';
  return clip;
}

function setSelectedClipVolumeV45(value){
  const clip=getAudioClipV45(selectedAudioId);
  if(!clip){ alert('Pilih clip dulu.'); return; }
  clip.volume=Math.max(0,Math.min(2,Number(value)||1));
  refreshClipEditViewV45();
}

function setSelectedClipPanV45(value){
  const clip=getAudioClipV45(selectedAudioId);
  if(!clip){ alert('Pilih clip dulu.'); return; }
  clip.pan=Math.max(-1,Math.min(1,Number(value)||0));
  refreshClipEditViewV45();
}

function setSelectedClipColorV45(value){
  const clip=getAudioClipV45(selectedAudioId);
  if(!clip){ alert('Pilih clip dulu.'); return; }
  clip.color=value || '#8b5cf6';
  refreshClipEditViewV45();
}

function resetSelectedClipPropertiesV45(){
  const clip=getAudioClipV45(selectedAudioId);
  if(!clip){ alert('Pilih clip dulu.'); return; }
  clip.volume=1;
  clip.pan=0;
  clip.color='#8b5cf6';
  refreshClipEditViewV45();
}

function applyClipPropsToAudioDOMV45(){
  if(!Array.isArray(importedAudioTracks))return;
  importedAudioTracks.forEach(ensureClipPropertiesV45);
}

/* Override renderAudioTracks agar warna clip terlihat jika property color ada. */
const _renderAudioTracksBeforePropsV45 = typeof renderAudioTracks === 'function' ? renderAudioTracks : null;
if(_renderAudioTracksBeforePropsV45){
  renderAudioTracks = function(){
    applyClipPropsToAudioDOMV45();
    _renderAudioTracksBeforePropsV45();

    importedAudioTracks.forEach(clip=>{
      const color=clip.color || '#8b5cf6';
      document.querySelectorAll(`[onclick*="${clip.id}"]`).forEach(el=>{
        if(el.classList.contains('audio-row') || el.classList.contains('audio-clip')){
          el.style.borderColor=color;
          el.style.boxShadow = clip.id===selectedAudioId ? `0 0 18px ${color}` : '';
        }
      });
    });
  };
}

/* Upgrade Clip Editor: tambahkan Volume, Pan, Color */
const _openClipEditorToolsBefore5C = typeof openClipEditorToolsV45 === 'function' ? openClipEditorToolsV45 : null;
function openClipEditorToolsV45(id){
  if(_openClipEditorToolsBefore5C){
    _openClipEditorToolsBefore5C(id);
  }

  const content=document.getElementById('toolsSheetContentV45');
  const clip=getAudioClipV45(selectedAudioId);
  if(!content || !clip)return;

  ensureClipPropertiesV45(clip);

  const props=document.createElement('div');
  props.className='tool-card-v45 clip-props-card-v45';
  props.innerHTML=`
    <b>🎚 Clip Properties</b>

    <label>🔊 Volume <span>${Math.round((clip.volume||1)*100)}%</span></label>
    <input type="range" min="0" max="200" value="${Math.round((clip.volume||1)*100)}"
      oninput="setSelectedClipVolumeV45(this.value/100)">

    <label>🎚 Pan <span>${Math.round((clip.pan||0)*100)}</span></label>
    <input type="range" min="-100" max="100" value="${Math.round((clip.pan||0)*100)}"
      oninput="setSelectedClipPanV45(this.value/100)">

    <label>🎨 Clip Color</label>
    <input type="color" value="${clip.color || '#8b5cf6'}"
      oninput="setSelectedClipColorV45(this.value)">

    <button onclick="resetSelectedClipPropertiesV45()">♻ Reset Properties</button>
  `;
  content.appendChild(props);
}

/* Saat audio diputar dari clip, property disiapkan dulu untuk tahap berikutnya. */
if(Array.isArray(importedAudioTracks)){
  importedAudioTracks.forEach(ensureClipPropertiesV45);
}

/* ===== V4.5 Tahap 7A: Drag Clip System ===== */
var dragClipStateV45 = null;

function getDragStepUnitV45(){
  // 1 grid = 1 step/beat sederhana. Tahap berikutnya Snap Grid akan memakai unit ini.
  return 1;
}

function getAudioLaneElementV45(id){
  const rows=document.querySelectorAll('.audio-row');
  for(const row of rows){
    if(row.innerHTML.includes(id))return row.querySelector('.audio-lane');
  }
  return null;
}

function startDragAudioClipV45(ev,id){
  ev.preventDefault();
  ev.stopPropagation();

  const clip=getAudioClipV45 ? getAudioClipV45(id) : (Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===id):null);
  if(!clip)return;

  selectedAudioId=id;
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(id);

  const pointer = ev.touches ? ev.touches[0] : ev;
  dragClipStateV45 = {
    id,
    startX:pointer.clientX,
    startOffset:Number(clip.offset || 0),
    moved:false
  };

  document.body.classList.add('dragging-audio-clip-v45');

  window.addEventListener('pointermove', dragAudioClipMoveV45, {passive:false});
  window.addEventListener('pointerup', endDragAudioClipV45, {passive:false});
  window.addEventListener('touchmove', dragAudioClipMoveV45, {passive:false});
  window.addEventListener('touchend', endDragAudioClipV45, {passive:false});
}

function dragAudioClipMoveV45(ev){
  if(!dragClipStateV45)return;
  ev.preventDefault();

  const pointer = ev.touches ? ev.touches[0] : ev;
  if(!pointer)return;

  const clip=getAudioClipV45 ? getAudioClipV45(dragClipStateV45.id) : null;
  if(!clip)return;

  const dx=pointer.clientX - dragClipStateV45.startX;
  const secondsPerPixel = 1 / 48; // 48px ≈ 1 detik/beat awal
  let newOffset = dragClipStateV45.startOffset + (dx * secondsPerPixel);
  newOffset = Math.max(0, newOffset);

  clip.offset = Math.round(newOffset * 100) / 100;
  dragClipStateV45.moved=true;

  updateDragClipPreviewV45(clip.id, clip.offset);
}

function updateDragClipPreviewV45(id, offset){
  const el=document.querySelector(`.audio-clip[data-audio-id="${id}"]`);
  if(el){
    el.style.transform=`translateX(${Math.round(offset*48)}px)`;
    el.classList.add('drag-preview-v45');
  }
}

function endDragAudioClipV45(ev){
  if(!dragClipStateV45)return;

  const state=dragClipStateV45;
  dragClipStateV45=null;
  document.body.classList.remove('dragging-audio-clip-v45');

  window.removeEventListener('pointermove', dragAudioClipMoveV45);
  window.removeEventListener('pointerup', endDragAudioClipV45);
  window.removeEventListener('touchmove', dragAudioClipMoveV45);
  window.removeEventListener('touchend', endDragAudioClipV45);

  if(state.moved){
    if(typeof renderTimeline==='function')renderTimeline();
    if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(state.id);
  }
}

/* Patch renderAudioTracks agar audio clip bisa di-drag dengan pointer/touch */
const _renderAudioTracksBeforeDragV45 = typeof renderAudioTracks === 'function' ? renderAudioTracks : null;
if(_renderAudioTracksBeforeDragV45){
  renderAudioTracks = function(){
    _renderAudioTracksBeforeDragV45();

    if(!Array.isArray(importedAudioTracks))return;
    importedAudioTracks.forEach(clip=>{
      const id=clip.id;
      document.querySelectorAll(`.audio-clip`).forEach(el=>{
        if(el.getAttribute('onclick') && el.getAttribute('onclick').includes(id)){
          el.dataset.audioId=id;
          el.style.transform=`translateX(${Math.round(Number(clip.offset||0)*48)}px)`;
          el.onpointerdown=(ev)=>startDragAudioClipV45(ev,id);
          el.ontouchstart=(ev)=>startDragAudioClipV45(ev,id);
        }
      });
    });
  };
}

function moveSelectedClipLeftV45(){
  const clip=getAudioClipV45 ? getAudioClipV45(selectedAudioId) : null;
  if(!clip){alert('Pilih clip dulu.');return;}
  clip.offset=Math.max(0,Number(clip.offset||0)-getDragStepUnitV45());
  refreshClipEditViewV45();
}

function moveSelectedClipRightV45(){
  const clip=getAudioClipV45 ? getAudioClipV45(selectedAudioId) : null;
  if(!clip){alert('Pilih clip dulu.');return;}
  clip.offset=Number(clip.offset||0)+getDragStepUnitV45();
  refreshClipEditViewV45();
}

/* Tambahkan kontrol manual drag ke Clip Editor */
const _openClipEditorToolsBeforeDragV45 = typeof openClipEditorToolsV45 === 'function' ? openClipEditorToolsV45 : null;
function openClipEditorToolsV45(id){
  if(_openClipEditorToolsBeforeDragV45){
    _openClipEditorToolsBeforeDragV45(id);
  }

  const content=document.getElementById('toolsSheetContentV45');
  const clip=getAudioClipV45 ? getAudioClipV45(selectedAudioId) : null;
  if(!content || !clip)return;

  const box=document.createElement('div');
  box.className='tool-card-v45 clip-drag-card-v45';
  box.innerHTML=`
    <b>🖐 Drag Clip</b>
    <small>Geser clip langsung di timeline, atau pakai tombol kiri/kanan.</small>
    <div class="clip-drag-actions-v45">
      <button onclick="moveSelectedClipLeftV45()">← Kiri</button>
      <button onclick="moveSelectedClipRightV45()">Kanan →</button>
    </div>
    <small>Offset: ${Number(clip.offset||0).toFixed(2)}</small>
  `;
  content.appendChild(box);
}


/* ===== V4.5 Tahap 7B : Resize Clip System ===== */
function resizeSelectedClipShorterV45(){
 if(!selectedAudioId)return alert('Pilih clip dulu');
 const c=importedAudioTracks.find(x=>x.id===selectedAudioId);
 if(!c)return;
 c.duration=Math.max(1,(Number(c.duration)||1)-1);
 updateImportList(); renderTimeline();
}
function resizeSelectedClipLongerV45(){
 if(!selectedAudioId)return alert('Pilih clip dulu');
 const c=importedAudioTracks.find(x=>x.id===selectedAudioId);
 if(!c)return;
 c.duration=(Number(c.duration)||1)+1;
 updateImportList(); renderTimeline();
}

/* ===== V4.5 Tahap 7C: Snap Grid System ===== */
var snapGridEnabledV45 = (typeof snapGridEnabledV45 !== 'undefined') ? snapGridEnabledV45 : true;
var snapGridSizeV45 = (typeof snapGridSizeV45 !== 'undefined') ? snapGridSizeV45 : 1; // 1 = 1 beat/detik awal

function snapValueV45(value){
  value = Number(value) || 0;
  if(!snapGridEnabledV45)return Math.max(0, Math.round(value*100)/100);
  const grid = Math.max(0.25, Number(snapGridSizeV45) || 1);
  return Math.max(0, Math.round(value / grid) * grid);
}

function toggleSnapGridV45(){
  snapGridEnabledV45 = !snapGridEnabledV45;
  if(typeof renderTimeline === 'function')renderTimeline();
  if(typeof openClipEditorToolsV45 === 'function')openClipEditorToolsV45(selectedAudioId);
}

function setSnapGridSizeV45(value){
  snapGridSizeV45 = Math.max(0.25, Number(value) || 1);
  if(typeof openClipEditorToolsV45 === 'function')openClipEditorToolsV45(selectedAudioId);
}

function snapSelectedClipV45(){
  if(!selectedAudioId)return alert('Pilih clip dulu.');
  const clip = Array.isArray(importedAudioTracks) ? importedAudioTracks.find(x=>x.id===selectedAudioId) : null;
  if(!clip)return;
  clip.offset = snapValueV45(clip.offset || 0);
  clip.duration = Math.max(0.25, snapValueV45(clip.duration || 1));
  if(typeof refreshClipEditViewV45 === 'function')refreshClipEditViewV45();
  else { if(typeof updateImportList==='function')updateImportList(); if(typeof renderTimeline==='function')renderTimeline(); }
}

/* Snap otomatis setelah drag selesai */
const _endDragAudioClipBeforeSnapV45 = typeof endDragAudioClipV45 === 'function' ? endDragAudioClipV45 : null;
if(_endDragAudioClipBeforeSnapV45){
  endDragAudioClipV45 = function(ev){
    const id = dragClipStateV45 && dragClipStateV45.id ? dragClipStateV45.id : selectedAudioId;
    _endDragAudioClipBeforeSnapV45(ev);
    if(id && snapGridEnabledV45){
      const clip = Array.isArray(importedAudioTracks) ? importedAudioTracks.find(x=>x.id===id) : null;
      if(clip){
        clip.offset = snapValueV45(clip.offset || 0);
        selectedAudioId = id;
        if(typeof renderTimeline === 'function')renderTimeline();
        if(typeof openClipEditorToolsV45 === 'function')openClipEditorToolsV45(id);
      }
    }
  };
}

/* Snap otomatis saat resize tombol 7B */
const _resizeShorterBeforeSnapV45 = typeof resizeSelectedClipShorterV45 === 'function' ? resizeSelectedClipShorterV45 : null;
if(_resizeShorterBeforeSnapV45){
  resizeSelectedClipShorterV45 = function(){
    _resizeShorterBeforeSnapV45();
    snapSelectedClipV45();
  };
}
const _resizeLongerBeforeSnapV45 = typeof resizeSelectedClipLongerV45 === 'function' ? resizeSelectedClipLongerV45 : null;
if(_resizeLongerBeforeSnapV45){
  resizeSelectedClipLongerV45 = function(){
    _resizeLongerBeforeSnapV45();
    snapSelectedClipV45();
  };
}

/* Tambahkan kontrol Snap Grid ke Clip Editor */
const _openClipEditorToolsBeforeSnapV45 = typeof openClipEditorToolsV45 === 'function' ? openClipEditorToolsV45 : null;
function openClipEditorToolsV45(id){
  if(_openClipEditorToolsBeforeSnapV45){
    _openClipEditorToolsBeforeSnapV45(id);
  }

  const content = document.getElementById('toolsSheetContentV45');
  if(!content)return;

  const clip = Array.isArray(importedAudioTracks) ? importedAudioTracks.find(x=>x.id===selectedAudioId) : null;
  const offsetText = clip ? Number(clip.offset||0).toFixed(2) : '-';
  const durationText = clip ? Number(clip.duration||0).toFixed(2) : '-';

  const box = document.createElement('div');
  box.className = 'tool-card-v45 snap-grid-card-v45';
  box.innerHTML = `
    <b>📍 Snap Grid</b>
    <small>Status: ${snapGridEnabledV45 ? 'Aktif ✅' : 'Mati ❌'}</small>
    <small>Grid: ${snapGridSizeV45} beat</small>
    <small>Offset: ${offsetText} | Durasi: ${durationText}</small>

    <div class="snap-grid-actions-v45">
      <button onclick="toggleSnapGridV45()">${snapGridEnabledV45 ? 'Matikan Snap' : 'Aktifkan Snap'}</button>
      <button onclick="snapSelectedClipV45()">📍 Snap Clip</button>
    </div>

    <label class="snap-grid-label-v45">Ukuran Grid</label>
    <select onchange="setSnapGridSizeV45(this.value)">
      <option value="0.25" ${snapGridSizeV45==0.25?'selected':''}>1/4 Beat</option>
      <option value="0.5" ${snapGridSizeV45==0.5?'selected':''}>1/2 Beat</option>
      <option value="1" ${snapGridSizeV45==1?'selected':''}>1 Beat</option>
      <option value="2" ${snapGridSizeV45==2?'selected':''}>2 Beat</option>
      <option value="4" ${snapGridSizeV45==4?'selected':''}>4 Beat</option>
    </select>
  `;
  content.appendChild(box);
}

/* ===== V4.5 Tahap 8A: Drag Antar Track ===== */
var dragTrackClipIdV45 = null;

function ensureAudioClipTrackV45(clip){
  if(!clip)return clip;
  if(!clip.track) clip.track = clip.bank || 'Audio';
  return clip;
}

function getAudioClipTrackV45(id){
  const c = Array.isArray(importedAudioTracks) ? importedAudioTracks.find(x=>x.id===id) : null;
  return c ? ensureAudioClipTrackV45(c).track : 'Audio';
}

function setAudioClipTrackV45(id, trackId){
  const c = Array.isArray(importedAudioTracks) ? importedAudioTracks.find(x=>x.id===id) : null;
  if(!c)return;
  c.track = trackId || 'Audio';
  c.bank = c.track;
}

function startTrackDragClipV45(ev,id){
  dragTrackClipIdV45 = id;
  selectedAudioId = id;
  if(ev && ev.dataTransfer){
    ev.dataTransfer.setData('text/plain', id);
    ev.dataTransfer.effectAllowed = 'move';
  }
}

function allowTrackDropV45(ev,trackId){
  ev.preventDefault();
  const lane = ev.currentTarget;
  if(lane)lane.classList.add('track-drop-hover-v45');
}

function leaveTrackDropV45(ev){
  const lane = ev.currentTarget;
  if(lane)lane.classList.remove('track-drop-hover-v45');
}

function dropAudioClipToTrackV45(ev,trackId){
  ev.preventDefault();
  const lane = ev.currentTarget;
  if(lane)lane.classList.remove('track-drop-hover-v45');

  const id = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || dragTrackClipIdV45 || selectedAudioId;
  if(!id)return;

  setAudioClipTrackV45(id, trackId);
  selectedAudioId = id;
  dragTrackClipIdV45 = null;

  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(id);
}

/* Render ulang audio tracks menjadi lane per track agar clip bisa dipindah antar track */
const _renderAudioTracksBeforeTrackDragV45 = typeof renderAudioTracks === 'function' ? renderAudioTracks : null;
if(_renderAudioTracksBeforeTrackDragV45){
  renderAudioTracks = function(){
    const wrap=document.getElementById('audioTracks');
    if(!wrap){
      _renderAudioTracksBeforeTrackDragV45();
      return;
    }

    if(!Array.isArray(importedAudioTracks) || importedAudioTracks.length===0){
      wrap.innerHTML='';
      return;
    }

    importedAudioTracks.forEach(ensureAudioClipTrackV45);

    const trackList = Array.isArray(tracks) && tracks.length ? tracks : [{id:'Audio',title:'🎧 Audio'}];

    wrap.innerHTML = trackList.map(tr=>{
      const clips = importedAudioTracks.filter(c=>(ensureAudioClipTrackV45(c).track || 'Audio')===tr.id);
      const clipHtml = clips.map(t=>{
        const selected = t.id===selectedAudioId ? ' selected' : '';
        const bars = Array.isArray(t.waveform) ? t.waveform.map(v=>`<span class="wavebar" style="height:${Math.max(6,Math.round(v*46))}px"></span>`).join('') : '';
        const offset = Math.round(Number(t.offset||0)*48);
        const durPx = Math.max(160, Math.round(Number(t.duration||3)*48));
        return `
          <div class="audio-clip${selected}" data-audio-id="${t.id}" draggable="true"
               onclick="event.stopPropagation();selectAudio('${t.id}')"
               ondragstart="startTrackDragClipV45(event,'${t.id}')"
               style="transform:translateX(${offset}px);min-width:${durPx}px">
            ${bars || `<span class="wavebar" style="height:30px"></span>`}
          </div>
        `;
      }).join('');

      return `
        <div class="audio-row${clips.some(c=>c.id===selectedAudioId)?' selected':''}">
          <div class="audio-title">${tr.title}
            <div class="audio-tools">
              <small>Drop clip ke track ini</small>
            </div>
          </div>
          <div class="audio-lane track-drop-lane-v45"
               ondragover="allowTrackDropV45(event,'${tr.id}')"
               ondragleave="leaveTrackDropV45(event)"
               ondrop="dropAudioClipToTrackV45(event,'${tr.id}')">
            ${clipHtml || '<span class="empty-record">Drop audio clip di sini</span>'}
          </div>
        </div>
      `;
    }).join('');

    if(typeof applyClipPropsToAudioDOMV45==='function')applyClipPropsToAudioDOMV45();
  };
}

/* Tambahkan info track di Clip Editor */
const _openClipEditorToolsBeforeTrackDragV45 = typeof openClipEditorToolsV45 === 'function' ? openClipEditorToolsV45 : null;
function openClipEditorToolsV45(id){
  if(_openClipEditorToolsBeforeTrackDragV45){
    _openClipEditorToolsBeforeTrackDragV45(id);
  }

  const content=document.getElementById('toolsSheetContentV45');
  const clip=Array.isArray(importedAudioTracks) ? importedAudioTracks.find(x=>x.id===selectedAudioId) : null;
  if(!content || !clip)return;

  ensureAudioClipTrackV45(clip);
  const currentTrack = Array.isArray(tracks) ? tracks.find(t=>t.id===clip.track) : null;

  const box=document.createElement('div');
  box.className='tool-card-v45 track-drag-card-v45';
  box.innerHTML=`
    <b>↕ Drag Antar Track</b>
    <small>Track sekarang: ${currentTrack ? currentTrack.title : clip.track}</small>
    <small>Tekan tahan clip lalu seret ke lane track tujuan.</small>
    <select onchange="setAudioClipTrackV45(selectedAudioId,this.value);renderTimeline();openClipEditorToolsV45(selectedAudioId)">
      ${(tracks||[]).map(t=>`<option value="${t.id}" ${t.id===clip.track?'selected':''}>${t.title}</option>`).join('')}
    </select>
  `;
  content.appendChild(box);
}

/* ===== V4.5 Tahap 8B: Waveform Audio Asli Per Clip Lite Pro ===== */
function makeWaveformProV45(buffer,count){
  count=count||256;
  const data=buffer.getChannelData(0);
  const block=Math.max(1,Math.floor(data.length/count));
  const values=[];
  for(let i=0;i<count;i++){
    let peak=0,sum=0,start=i*block;
    for(let j=0;j<block;j++){
      const v=Math.abs(data[start+j]||0);
      peak=Math.max(peak,v);
      sum+=v;
    }
    values.push(Math.min(1,Math.max(peak,(sum/block)*2.4)));
  }
  return values;
}

function normalizeWaveformForClipV45(clip){
  if(!clip)return [];
  if(!Array.isArray(clip.waveform))clip.waveform=[];
  if(!Array.isArray(clip.waveformPro)||clip.waveformPro.length<128){
    const src=clip.waveform.length?clip.waveform:[0.25];
    const out=[];
    for(let i=0;i<256;i++){
      const pos=(i/255)*(src.length-1);
      const a=Math.floor(pos), b=Math.min(src.length-1,a+1), t=pos-a;
      out.push((src[a]||0)*(1-t)+(src[b]||0)*t);
    }
    clip.waveformPro=out;
  }
  return clip.waveformPro;
}

function renderWaveformBarsV45(clip){
  const wf=normalizeWaveformForClipV45(clip);
  const duration=Math.max(1,Number(clip.duration||3));
  const px=Math.max(160,Math.round(duration*48));
  const barsCount=Math.max(48,Math.min(256,Math.round(px/3)));
  let html='';
  for(let i=0;i<barsCount;i++){
    const idx=Math.floor((i/Math.max(1,barsCount-1))*(wf.length-1));
    const h=Math.max(5,Math.round((wf[idx]||0.08)*48));
    html+=`<span class="wavebar wavebar-pro-v45" style="height:${h}px"></span>`;
  }
  return html;
}

if(typeof makeWaveform==='function'&&!window.__wave8b_make_patch){
  window.__wave8b_make_patch=true;
  const _makeWaveformBefore8B=makeWaveform;
  makeWaveform=function(buffer,count){
    try{return makeWaveformProV45(buffer,256);}
    catch(e){return _makeWaveformBefore8B(buffer,count||64);}
  };
}

const _renderAudioTracksBeforeWave8B=typeof renderAudioTracks==='function'?renderAudioTracks:null;
if(_renderAudioTracksBeforeWave8B&&!window.__wave8b_render_patch){
  window.__wave8b_render_patch=true;
  renderAudioTracks=function(){
    _renderAudioTracksBeforeWave8B();
    if(!Array.isArray(importedAudioTracks))return;
    importedAudioTracks.forEach(clip=>{
      const list=Array.from(document.querySelectorAll('.audio-clip'));
      const el=document.querySelector(`.audio-clip[data-audio-id="${clip.id}"]`)||list.find(x=>{
        const on=x.getAttribute('onclick')||'';
        const drag=x.getAttribute('ondragstart')||'';
        return on.includes(clip.id)||drag.includes(clip.id);
      });
      if(!el)return;
      const duration=Math.max(1,Number(clip.duration||3));
      const width=Math.max(160,Math.round(duration*48));
      el.dataset.audioId=clip.id;
      el.classList.add('audio-clip-wave-pro-v45');
      el.style.minWidth=width+'px';
      el.style.width=width+'px';
      el.innerHTML=renderWaveformBarsV45(clip);
      el.title=`${clip.name||clip.fileName||'Audio Clip'} • ${duration.toFixed(2)}s`;
    });
  };
}

function upgradeAllWaveformsV45(){
  if(!Array.isArray(importedAudioTracks))return;
  importedAudioTracks.forEach(c=>normalizeWaveformForClipV45(c));
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(selectedAudioId);
}

const _openClipEditorToolsBeforeWave8B=typeof openClipEditorToolsV45==='function'?openClipEditorToolsV45:null;
function openClipEditorToolsV45(id){
  if(_openClipEditorToolsBeforeWave8B)_openClipEditorToolsBeforeWave8B(id);
  const content=document.getElementById('toolsSheetContentV45');
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!content||!clip)return;
  const wf=normalizeWaveformForClipV45(clip);
  const box=document.createElement('div');
  box.className='tool-card-v45 waveform-pro-card-v45';
  box.innerHTML=`
    <b>🌊 Waveform Pro Lite</b>
    <small>Resolusi: ${wf.length} titik</small>
    <small>Durasi clip: ${Number(clip.duration||0).toFixed(2)} detik</small>
    <small>Waveform mengikuti panjang dan resize clip.</small>
    <button onclick="upgradeAllWaveformsV45()">🔄 Refresh Waveform</button>
  `;
  content.appendChild(box);
}

/* ===== V4.5 Tahap 8C: Fade In / Fade Out ===== */
function ensureClipFadeV45(clip){
  if(!clip)return clip;
  if(typeof clip.fadeIn!=='number')clip.fadeIn=0;
  if(typeof clip.fadeOut!=='number')clip.fadeOut=0;
  return clip;
}

function setSelectedClipFadeInV45(value){
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!clip){alert('Pilih clip dulu.');return;}
  ensureClipFadeV45(clip);
  const dur=Math.max(0,Number(clip.duration||0));
  clip.fadeIn=Math.max(0,Math.min(Number(value)||0,dur));
  if(clip.fadeIn+clip.fadeOut>dur)clip.fadeOut=Math.max(0,dur-clip.fadeIn);
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(selectedAudioId);
}

function setSelectedClipFadeOutV45(value){
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!clip){alert('Pilih clip dulu.');return;}
  ensureClipFadeV45(clip);
  const dur=Math.max(0,Number(clip.duration||0));
  clip.fadeOut=Math.max(0,Math.min(Number(value)||0,dur));
  if(clip.fadeIn+clip.fadeOut>dur)clip.fadeIn=Math.max(0,dur-clip.fadeOut);
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(selectedAudioId);
}

function resetSelectedClipFadeV45(){
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!clip){alert('Pilih clip dulu.');return;}
  clip.fadeIn=0;
  clip.fadeOut=0;
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(selectedAudioId);
}

function applyFadeVisualsV45(){
  if(!Array.isArray(importedAudioTracks))return;
  importedAudioTracks.forEach(clip=>{
    ensureClipFadeV45(clip);
    const el=document.querySelector(`.audio-clip[data-audio-id="${clip.id}"]`) ||
      Array.from(document.querySelectorAll('.audio-clip')).find(x=>{
        const on=x.getAttribute('onclick')||'';
        const drag=x.getAttribute('ondragstart')||'';
        return on.includes(clip.id)||drag.includes(clip.id);
      });
    if(!el)return;

    el.classList.toggle('clip-has-fade-v45',(clip.fadeIn||0)>0||(clip.fadeOut||0)>0);

    let left=el.querySelector('.fade-handle-in-v45');
    let right=el.querySelector('.fade-handle-out-v45');
    if(!left){
      left=document.createElement('span');
      left.className='fade-handle-in-v45';
      el.appendChild(left);
    }
    if(!right){
      right=document.createElement('span');
      right.className='fade-handle-out-v45';
      el.appendChild(right);
    }

    const dur=Math.max(1,Number(clip.duration||1));
    left.style.width=Math.min(45,Math.max(0,(Number(clip.fadeIn||0)/dur)*100))+'%';
    right.style.width=Math.min(45,Math.max(0,(Number(clip.fadeOut||0)/dur)*100))+'%';
    left.style.display=(clip.fadeIn||0)>0?'block':'none';
    right.style.display=(clip.fadeOut||0)>0?'block':'none';
  });
}

/* Patch renderAudioTracks supaya visual fade muncul setelah timeline dirender */
const _renderAudioTracksBeforeFade8C=typeof renderAudioTracks==='function'?renderAudioTracks:null;
if(_renderAudioTracksBeforeFade8C&&!window.__fade8c_render_patch){
  window.__fade8c_render_patch=true;
  renderAudioTracks=function(){
    _renderAudioTracksBeforeFade8C();
    applyFadeVisualsV45();
  };
}

/* Data fade ikut saveProject otomatis karena tersimpan di importedAudioTracks */
function getFadeGainValueV45(clip,timeInClip){
  ensureClipFadeV45(clip);
  const dur=Math.max(0,Number(clip.duration||0));
  let gain=1;
  if(clip.fadeIn>0 && timeInClip<clip.fadeIn){
    gain=Math.min(gain,timeInClip/clip.fadeIn);
  }
  if(clip.fadeOut>0 && timeInClip>dur-clip.fadeOut){
    gain=Math.min(gain,Math.max(0,(dur-timeInClip)/clip.fadeOut));
  }
  return Math.max(0,Math.min(1,gain));
}

/* Tambahkan UI Fade ke Clip Editor */
const _openClipEditorToolsBeforeFade8C=typeof openClipEditorToolsV45==='function'?openClipEditorToolsV45:null;
function openClipEditorToolsV45(id){
  if(_openClipEditorToolsBeforeFade8C)_openClipEditorToolsBeforeFade8C(id);

  const content=document.getElementById('toolsSheetContentV45');
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!content||!clip)return;

  ensureClipFadeV45(clip);
  const dur=Math.max(1,Number(clip.duration||1));
  const maxFade=Math.min(10,Math.max(1,Math.floor(dur)));

  const box=document.createElement('div');
  box.className='tool-card-v45 clip-fade-card-v45';
  box.innerHTML=`
    <b>🎚 Fade In / Fade Out</b>

    <label>Fade In <span>${Number(clip.fadeIn||0).toFixed(2)}s</span></label>
    <input type="range" min="0" max="${maxFade}" step="0.1" value="${Number(clip.fadeIn||0)}"
      oninput="setSelectedClipFadeInV45(this.value)">

    <label>Fade Out <span>${Number(clip.fadeOut||0).toFixed(2)}s</span></label>
    <input type="range" min="0" max="${maxFade}" step="0.1" value="${Number(clip.fadeOut||0)}"
      oninput="setSelectedClipFadeOutV45(this.value)">

    <small>Fade tersimpan di clip dan siap dipakai untuk playback/export tahap lanjutan.</small>
    <button onclick="resetSelectedClipFadeV45()">♻ Reset Fade</button>
  `;
  content.appendChild(box);
  applyFadeVisualsV45();
}

/* ===== V4.5 Tahap 8D: Clip Trim ===== */
function ensureClipTrimV45(clip){
  if(!clip)return clip;
  if(typeof clip.trimStart!=='number')clip.trimStart=0;
  if(typeof clip.trimEnd!=='number')clip.trimEnd=0;
  return clip;
}

function getClipTrimSafeDurationV45(clip){
  ensureClipTrimV45(clip);
  const dur=Math.max(0,Number(clip.duration||0));
  const start=Math.max(0,Number(clip.trimStart||0));
  const end=Math.max(0,Number(clip.trimEnd||0));
  return Math.max(0.25,dur-start-end);
}

function setSelectedClipTrimStartV45(value){
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!clip){alert('Pilih clip dulu.');return;}
  ensureClipTrimV45(clip);
  const dur=Math.max(0,Number(clip.duration||0));
  clip.trimStart=Math.max(0,Math.min(Number(value)||0,Math.max(0,dur-clip.trimEnd-0.25)));
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(selectedAudioId);
}

function setSelectedClipTrimEndV45(value){
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!clip){alert('Pilih clip dulu.');return;}
  ensureClipTrimV45(clip);
  const dur=Math.max(0,Number(clip.duration||0));
  clip.trimEnd=Math.max(0,Math.min(Number(value)||0,Math.max(0,dur-clip.trimStart-0.25)));
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(selectedAudioId);
}

function resetSelectedClipTrimV45(){
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!clip){alert('Pilih clip dulu.');return;}
  clip.trimStart=0;
  clip.trimEnd=0;
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof openClipEditorToolsV45==='function')openClipEditorToolsV45(selectedAudioId);
}

function applyTrimVisualsV45(){
  if(!Array.isArray(importedAudioTracks))return;
  importedAudioTracks.forEach(clip=>{
    ensureClipTrimV45(clip);
    const el=document.querySelector(`.audio-clip[data-audio-id="${clip.id}"]`) ||
      Array.from(document.querySelectorAll('.audio-clip')).find(x=>{
        const on=x.getAttribute('onclick')||'';
        const drag=x.getAttribute('ondragstart')||'';
        return on.includes(clip.id)||drag.includes(clip.id);
      });
    if(!el)return;

    const dur=Math.max(1,Number(clip.duration||1));
    const startPct=Math.min(80,Math.max(0,(clip.trimStart/dur)*100));
    const endPct=Math.min(80,Math.max(0,(clip.trimEnd/dur)*100));

    el.classList.toggle('clip-has-trim-v45',clip.trimStart>0||clip.trimEnd>0);

    let start=el.querySelector('.trim-start-v45');
    let end=el.querySelector('.trim-end-v45');
    if(!start){
      start=document.createElement('span');
      start.className='trim-start-v45';
      el.appendChild(start);
    }
    if(!end){
      end=document.createElement('span');
      end.className='trim-end-v45';
      el.appendChild(end);
    }

    start.style.width=startPct+'%';
    end.style.width=endPct+'%';
    start.style.display=clip.trimStart>0?'block':'none';
    end.style.display=clip.trimEnd>0?'block':'none';

    el.title=(clip.name||clip.fileName||'Audio Clip')+
      ` • Trim ${Number(clip.trimStart||0).toFixed(2)}s / ${Number(clip.trimEnd||0).toFixed(2)}s`;
  });
}

/* Patch renderAudioTracks supaya visual trim muncul */
const _renderAudioTracksBeforeTrim8D=typeof renderAudioTracks==='function'?renderAudioTracks:null;
if(_renderAudioTracksBeforeTrim8D&&!window.__trim8d_render_patch){
  window.__trim8d_render_patch=true;
  renderAudioTracks=function(){
    _renderAudioTracksBeforeTrim8D();
    applyTrimVisualsV45();
  };
}

/* Upgrade width clip agar mengikuti durasi setelah trim */
function applyTrimWidthV45(){
  if(!Array.isArray(importedAudioTracks))return;
  importedAudioTracks.forEach(clip=>{
    ensureClipTrimV45(clip);
    const el=document.querySelector(`.audio-clip[data-audio-id="${clip.id}"]`);
    if(!el)return;
    const visible=getClipTrimSafeDurationV45(clip);
    const width=Math.max(140,Math.round(visible*48));
    el.style.minWidth=width+'px';
    el.style.width=width+'px';
  });
}

/* Tambahkan UI Trim ke Clip Editor */
const _openClipEditorToolsBeforeTrim8D=typeof openClipEditorToolsV45==='function'?openClipEditorToolsV45:null;
function openClipEditorToolsV45(id){
  if(_openClipEditorToolsBeforeTrim8D)_openClipEditorToolsBeforeTrim8D(id);

  const content=document.getElementById('toolsSheetContentV45');
  const clip=Array.isArray(importedAudioTracks)?importedAudioTracks.find(x=>x.id===selectedAudioId):null;
  if(!content||!clip)return;

  ensureClipTrimV45(clip);
  const dur=Math.max(1,Number(clip.duration||1));
  const visible=getClipTrimSafeDurationV45(clip);

  const box=document.createElement('div');
  box.className='tool-card-v45 clip-trim-card-v45';
  box.innerHTML=`
    <b>✂ Clip Trim</b>

    <label>Trim Start <span>${Number(clip.trimStart||0).toFixed(2)}s</span></label>
    <input type="range" min="0" max="${Math.max(0,dur-0.25)}" step="0.1" value="${Number(clip.trimStart||0)}"
      oninput="setSelectedClipTrimStartV45(this.value)">

    <label>Trim End <span>${Number(clip.trimEnd||0).toFixed(2)}s</span></label>
    <input type="range" min="0" max="${Math.max(0,dur-0.25)}" step="0.1" value="${Number(clip.trimEnd||0)}"
      oninput="setSelectedClipTrimEndV45(this.value)">

    <small>Durasi asli: ${dur.toFixed(2)}s</small>
    <small>Durasi terlihat: ${visible.toFixed(2)}s</small>
    <small>Trim tidak menghapus file asli, hanya menyembunyikan awal/akhir clip.</small>
    <button onclick="resetSelectedClipTrimV45()">♻ Reset Trim</button>
  `;
  content.appendChild(box);
  applyTrimVisualsV45();
  applyTrimWidthV45();
}
