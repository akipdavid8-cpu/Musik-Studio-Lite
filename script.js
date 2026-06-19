/* ===== GLOBAL ERROR HELPER ===== */
window.addEventListener('error',function(e){console.warn('JS Error:',e.message,e.filename,e.lineno);});
window.addEventListener('unhandledrejection',function(e){console.warn('Promise Error:',e.reason);});

let isPlaying=false,audioCtx=null,masterBus=null,masterDestination=null,masterMeterDecayTimer=null,masterMediaRecorder=null,masterAudioChunks=[],masterAudioBlob=null,masterAudioUrl=null,currentStepPage=0,totalStepPages=4,legacySelectedNoteId=null,legacyCopiedNote=null,legacyRecordedEvents=[],importedAudioTracks=[],recordStartTime=Date.now(),bpm=120,playTimer=null,currentPlayIndex=0,selectedAudioId=null,copiedAudioClip=null,masterRecording=false,masterWaveform=[],masterRecordStart=0;
let tracks=[{id:'Drum',title:'🥁 Drum'},{id:'Piano',title:'🎹 Piano'},{id:'Guitar',title:'🎸 Guitar'},{id:'Bass',title:'🎸 Bass'},{id:'Vokal',title:'🎤 Vokal'},{id:'FX',title:'✨ FX'},{id:'MIDI',title:'🎼 MIDI'}];
function uid(){return 'ev'+Date.now()+Math.floor(Math.random()*9999)}
function getAudioContext(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();

    // MASTER BUS: semua suara masuk ke sini dulu sebelum keluar speaker.
    masterBus=audioCtx.createGain();
    masterBus.gain.value=0.95;

    // Tahap berikutnya: MediaRecorder akan merekam dari jalur ini.
    masterDestination=audioCtx.createMediaStreamDestination();

    masterBus.connect(audioCtx.destination);
    masterBus.connect(masterDestination);
    setTimeout(updateMasterBusStatus,0);
  }

  if(audioCtx.state==='suspended'){
    audioCtx.resume();
  }

  return audioCtx;
}

function getMasterOutput(){
  getAudioContext();
  return masterBus || audioCtx.destination;
}

function setMasterVolume(value){
  getAudioContext();
  const v=Math.max(0,Math.min(1,Number(value)));
  masterBus.gain.value=v;
  const label=document.getElementById('masterVolumeText');
  if(label)label.textContent=Math.round(v*100)+'%';
}

function updateMasterMeter(level){
  const safeLevel=Math.max(0,Math.min(1,Number(level)||0));
  const percent=Math.round(safeLevel*100);

  const fill=document.getElementById('masterMeterFill');
  const text=document.getElementById('masterMeterText');
  const timelineFill=document.getElementById('timelineMasterMeterFill');

  if(fill)fill.style.width=percent+'%';
  if(timelineFill)timelineFill.style.width=percent+'%';
  if(text)text.textContent=percent+'%';

  if(masterMeterDecayTimer)clearTimeout(masterMeterDecayTimer);
  masterMeterDecayTimer=setTimeout(()=>{
    if(fill)fill.style.width='0%';
    if(timelineFill)timelineFill.style.width='0%';
    if(text)text.textContent='0%';
  },220);
}

function updateMasterBusStatus(){
  const ready=!!masterBus;
  ['connDrum','connPiano','connGuitar','connBass'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.textContent=ready?'Connected ✅':'Waiting...';
  });
}

function closeAllPanels(){
  ['drumPanel','pianoPanel','guitarPanel','bassPanel','vocalPanel','fxPanel','midiPanel','importPanel','timelinePanel','exportPanel'].forEach(id=>{
    const e=document.getElementById(id);
    if(e)e.classList.remove('show');
  });
}

function openPanel(id){
  closeAllPanels();
  const panel=document.getElementById(id);
  if(!panel){ console.warn('Panel tidak ditemukan:',id); return; }
  panel.classList.add('show');

  try{ if(typeof renderTimeline==='function')renderTimeline(); }catch(e){ console.warn('renderTimeline error:',e); }
  try{ if(typeof updateMasterBusStatus==='function')updateMasterBusStatus(); }catch(e){ console.warn('updateMasterBusStatus error:',e); }
  try{ if(typeof syncExportWaveform==='function')syncExportWaveform(); }catch(e){ console.warn('syncExportWaveform error:',e); }
  try{ if(id==='drumPanel' && typeof updateDrumAssetStatus==='function')updateDrumAssetStatus(); }catch(e){ console.warn('drum status error:',e); }
}

function closePanel(id){
  const panel=document.getElementById(id);
  if(panel)panel.classList.remove('show');
}

function setPlayingUI(on){isPlaying=on;let t=document.getElementById('playTile');let l=document.getElementById('playLabel');if(t)t.classList.toggle('playing',on);if(l)l.textContent=on?'Playing':'Play'}
function changeBpm(v){bpm=Math.max(40,Math.min(300,bpm+v));document.getElementById('bpmText').textContent=bpm+' BPM'}
function addCustomTrack(){let i=document.getElementById('newTrackTitle'),t=(i.value||'').trim();if(!t)return;tracks.push({id:'Custom'+Date.now(),title:t});i.value='';renderTimeline()}
function deleteTrack(id){if(['Drum','Piano','Guitar','Bass','Vokal','FX','MIDI'].includes(id)){alert('Track bawaan tidak bisa dihapus.');return}if(confirm('Hapus track ini?')){tracks=tracks.filter(t=>t.id!==id);legacyRecordedEvents=legacyRecordedEvents.filter(e=>e.bank!==id);updateRecordList();renderTimeline()}}
function trackTitle(id){let t=tracks.find(x=>x.id===id);return t?t.title:id}
function autoRecord(bank,note){let step=legacyRecordedEvents.filter(e=>e.bank===bank).length%64;legacyRecordedEvents.push({id:uid(),bank,note,step,time:Date.now()-recordStartTime});currentStepPage=Math.floor(step/16);updateRecordList();renderTimeline()}
function clearTimeline(){legacyRecordedEvents=[];recordStartTime=Date.now();updateRecordList();renderTimeline()}
function updateRecordList(){let l=document.getElementById('recordList');if(!l)return;if(!legacyRecordedEvents.length){l.innerHTML='<span class="empty-record">Belum ada nada direkam</span>';return}l.innerHTML=legacyRecordedEvents.map((e,i)=>`<span class="record-chip">${i+1}. ${trackTitle(e.bank)} ${e.note} S${e.step+1}</span>`).join('');l.scrollTop=l.scrollHeight}

function updatePageText(){
  const txt=(currentStepPage+1)+'/'+totalStepPages;
  const a=document.getElementById('pageText');
  const b=document.getElementById('pageTextBottom');
  if(a)a.textContent=txt;
  if(b)b.textContent=txt;
}

function prevStepPage(){
  if(currentStepPage>0){
    currentStepPage--;
    legacySelectedNoteId=null;
    renderTimeline();
  }
}

function nextStepPage(){
  if(currentStepPage<totalStepPages-1){
    currentStepPage++;
    legacySelectedNoteId=null;
    renderTimeline();
  }
}

function clearSelectedNote(){
  legacySelectedNoteId=null;
  renderTimeline();
}

function selectNote(id){
  legacySelectedNoteId=id;
  renderTimeline();
}

function handleStepTap(bank,step,eventId){
  if(eventId){
    if(legacySelectedNoteId===eventId){
      editNote(eventId);
    }else{
      selectNote(eventId);
    }
    return;
  }

  if(legacySelectedNoteId){
    moveNote(legacySelectedNoteId,bank,step);
    legacySelectedNoteId=null;
    return;
  }

  if(legacyCopiedNote){
    const ok=confirm('Paste note ke step '+(step+1)+'?');
    if(ok){
      pasteNoteTo(bank,step);
    }
  }
}

function deleteSelectedNote(){
  if(!legacySelectedNoteId){
    alert('Pilih note dulu.');
    return;
  }
  legacyRecordedEvents=legacyRecordedEvents.filter(e=>e.id!==legacySelectedNoteId);
  legacySelectedNoteId=null;
  updateRecordList();
  renderTimeline();
}

function copySelectedNote(){
  if(!legacySelectedNoteId){
    alert('Pilih note dulu.');
    return;
  }
  const ev=legacyRecordedEvents.find(e=>e.id===legacySelectedNoteId);
  if(!ev)return;
  legacyCopiedNote={bank:ev.bank,note:ev.note,step:ev.step};
  alert('Note disalin.');
}

function pasteSelectedNote(){
  if(!legacyCopiedNote){
    alert('Belum ada note yang dicopy.');
    return;
  }
  const targetStep=currentStepPage*16;
  legacyRecordedEvents.push({id:uid(),bank:legacyCopiedNote.bank,note:legacyCopiedNote.note,step:targetStep,time:Date.now()-recordStartTime});
  updateRecordList();
  renderTimeline();
}

function pasteNoteTo(bank,step){
  if(!legacyCopiedNote){
    alert('Belum ada note yang dicopy.');
    return;
  }
  legacyRecordedEvents.push({id:uid(),bank,note:legacyCopiedNote.note,step,time:Date.now()-recordStartTime});
  updateRecordList();
  renderTimeline();
}

function renameTrack(id){
  const tr=tracks.find(t=>t.id===id);
  if(!tr)return;
  const name=prompt('Nama track baru:',tr.title);
  if(name&&name.trim()){
    tr.title=name.trim();
    updateRecordList();
    renderTimeline();
  }
}

function legacyRenderStepTimeline(active=-1){
  // Legacy step timeline dimatikan. Timeline utama sekarang memakai renderTimeline V2.
  return;
}

function editNote(id){let ev=legacyRecordedEvents.find(e=>e.id===id);if(!ev)return;let c=prompt('Edit note:\n1 = Hapus note\n2 = Ganti nama note\n3 = Pindah track\n4 = Batal','2');if(c==='1'){legacyRecordedEvents=legacyRecordedEvents.filter(e=>e.id!==id)}else if(c==='2'){let n=prompt('Nama note baru:',ev.note);if(n&&n.trim())ev.note=n.trim()}else if(c==='3'){let list=tracks.map((t,i)=>`${i+1}. ${t.title}`).join('\n'),n=parseInt(prompt('Pilih track tujuan:\n'+list,'1'),10);if(n>=1&&n<=tracks.length)ev.bank=tracks[n-1].id}updateRecordList();renderTimeline()}
function moveNote(id,bank,step){let ev=legacyRecordedEvents.find(e=>e.id===id);if(!ev)return;ev.bank=bank;ev.step=Number(step);updateRecordList();renderTimeline()}

function formatTime(ms){
  let total=ms/1000;
  let m=Math.floor(total/60);
  let s=Math.floor(total%60);
  let cs=Math.floor((total-Math.floor(total))*100);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0');
}

function updateTimeDisplay(ms){
  let el=document.getElementById('timeDisplay');
  if(el)el.textContent='Waktu: '+formatTime(ms);
}

function updatePlayhead(step){
  let line=document.getElementById('playheadLine');
  if(!line)return;
  const start=76+5;
  const stepW=34+5;
  line.style.left=(start+(step*stepW)+17)+'px';
  line.classList.add('show');
}

function hidePlayhead(){
  let line=document.getElementById('playheadLine');
  if(line)line.classList.remove('show');
}

function saveProject(){
  const data={bpm,tracks,legacyRecordedEvents,importedAudioTracks,masterWaveform,totalStepPages};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='musik_studio_project.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadProjectClick(){
  document.getElementById('loadProjectInput').click();
}

function playTimeline(){
  if(!legacyRecordedEvents.length)return;
  stopTimeline(false);
  setPlayingUI(true);
  currentPlayIndex=0;
  const stepMs=(60/bpm)*1000;
  updateTimeDisplay(0);
  updatePlayhead(0);
  playTimer=setInterval(()=>{
    if(currentPlayIndex>=64){
      stopTimeline();
      return;
    }
    legacyRecordedEvents.filter(e=>e.step===currentPlayIndex).forEach(playEvent);
    currentStepPage=Math.floor(currentPlayIndex/16);
    renderTimeline(currentPlayIndex);
    updatePlayhead(currentPlayIndex%16);
    updateTimeDisplay(currentPlayIndex*stepMs);
    currentPlayIndex++;
  },stepMs);
}
function stopTimeline(ui=true){
  if(playTimer){clearInterval(playTimer);playTimer=null}
  currentPlayIndex=0;
  renderTimeline();
  hidePlayhead();
  updateTimeDisplay(0);
  if(ui)setPlayingUI(false);
}
function playEvent(e){if(e.bank==='Drum')playDrum(e.note,false);if(e.bank==='Piano')playPiano(e.note,false);if(e.bank==='Guitar')playGuitar(e.note,false);if(e.bank==='Bass')playBass(e.note,false)}
function envGain(ctx,now,dur=0.4,vol=.5){let g=ctx.createGain();g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(vol,now+.02);g.gain.exponentialRampToValueAtTime(.001,now+dur);return g}
function playDrumSynthFallback(type,rec=true){let c=getAudioContext(),n=c.currentTime;if(type==='kick'){let o=c.createOscillator(),g=envGain(c,n,.23,1);o.type='sine';o.frequency.setValueAtTime(150,n);o.frequency.exponentialRampToValueAtTime(45,n+.16);o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+.23)}else if(['snare','clap','hat','shaker','crash','ride'].includes(type)){noiseHit(c,n,type==='crash'?.75:.18,type==='hat'?7000:1800)}else{let o=c.createOscillator(),g=envGain(c,n,.2,.75);o.type='triangle';o.frequency.value={tom1:180,tom2:140,tom3:95,perc1:360,perc2:520}[type]||220;o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+.2)}if(rec)autoRecord('Drum',type);captureMasterSignal(type==='kick'?1:.55);flashPadText(type)}

function tone(note,map,type,bank,rec=true,dur=.7){let c=getAudioContext(),n=c.currentTime,f=map[note]||440,o=c.createOscillator(),g=envGain(c,n,dur,.45);o.type=type;o.frequency.value=f;o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+dur);captureMasterSignal(.55);if(rec)autoRecord(bank,note);flashPadText(note)}
let piano={C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,B5:987.77,C6:1046.5,D6:1174.66},bass={C2:65.41,D2:73.42,E2:82.41,F2:87.31,G2:98,A2:110,B2:123.47,C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,B3:246.94,C4:261.63,D4:293.66};
function playPiano(note,rec=true){tone(note,piano,'triangle','Piano',rec,.75)}function playGuitar(note,rec=true){tone(note,piano,'sawtooth','Guitar',rec,.6)}function playBass(note,rec=true){tone(note,bass,'square','Bass',rec,.55)}
function noiseHit(c,n,d,f){let b=c.createBuffer(1,c.sampleRate*d,c.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;let s=c.createBufferSource(),fi=c.createBiquadFilter(),g=envGain(c,n,d,.7);s.buffer=b;fi.type='highpass';fi.frequency.value=f;s.connect(fi).connect(g).connect(getMasterOutput());s.start(n);s.stop(n+d)}
function flashPadText(v){let t=String(v).toLowerCase().replace('-','').replace(' ','');document.querySelectorAll('.pad').forEach(p=>{let x=p.textContent.toLowerCase().replace('-','').replace(' ','');if(x===t||t.includes(x)||x.includes(t)){p.classList.add('hit');setTimeout(()=>p.classList.remove('hit'),120)}})}

function openImportPicker(){
  const input=document.getElementById('importInput');
  if(!input){
    alert('Input import tidak ditemukan.');
    return;
  }
  input.value='';
  input.click();
}

function setupImportInput(){
  const input=document.getElementById('importInput');
  if(!input)return;

  input.addEventListener('change',async function(){
    let file=this.files && this.files[0];
    if(!file)return;

    let name=prompt('Masukkan nama track:',file.name.replace(/\.[^/.]+$/,''));
    if(!name||!name.trim()){
      this.value='';
      return;
    }

    try{
      const arrayBuffer=await file.arrayBuffer();
      const ctx=getAudioContext();
      const audioBuffer=await ctx.decodeAudioData(arrayBuffer.slice(0));
      const waveform=makeWaveform(audioBuffer,64);

      importedAudioTracks.push({
        id:'audio'+Date.now(),
        name:name.trim(),
        fileName:file.name,
        type:file.type||'audio',
        duration:audioBuffer.duration,
        waveform,
        offset:0
      });

      updateImportList();
      renderTimeline();
      openPanel('timelinePanel');
      alert('Import berhasil: '+name.trim());
    }catch(e){
      console.error(e);
      alert('File audio gagal dibaca. Coba MP3/WAV lain.');
    }

    this.value='';
  });
}


const loadProjectInputEl=document.getElementById('loadProjectInput');
if(loadProjectInputEl){loadProjectInputEl.addEventListener('change',function(){
  let file=this.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(){
    try{
      const data=JSON.parse(reader.result);
      bpm=data.bpm||120;
      tracks=data.tracks||tracks; totalStepPages=data.totalStepPages||4;
      legacyRecordedEvents=data.legacyRecordedEvents||[]; importedAudioTracks=data.importedAudioTracks||[]; masterWaveform=data.masterWaveform||[];
      document.getElementById('bpmText').textContent=bpm+' BPM';
      updateRecordList();
      updateImportList();
      renderTimeline();
      updateTimeDisplay(0);
      renderMasterWaveform();
      alert('Project berhasil dimuat');
    }catch(e){
      alert('File project tidak valid');
    }
  };
  reader.readAsText(file);
});}

function makeWaveform(buffer,count){
  const data=buffer.getChannelData(0);
  const block=Math.max(1,Math.floor(data.length/count));
  const values=[];
  for(let i=0;i<count;i++){
    let start=i*block,sum=0;
    for(let j=0;j<block;j++)sum+=Math.abs(data[start+j]||0);
    values.push(Math.min(1,(sum/block)*5));
  }
  return values;
}
function updateImportList(){
  const list=document.getElementById('importList');
  if(!list)return;
  if(importedAudioTracks.length===0){
    list.innerHTML='<span class="empty-record">Belum ada file import</span>';
    return;
  }
  list.innerHTML=importedAudioTracks.map(t=>`<div class="import-item"><div>🎧 ${t.name}<small>${t.fileName} • ${formatTime(t.duration*1000)}</small></div><button class="import-delete" onclick="deleteImportedAudio('${t.id}')">×</button></div>`).join('');
}
function deleteImportedAudio(id){
  importedAudioTracks=importedAudioTracks.filter(t=>t.id!==id);
  updateImportList();
  renderTimeline();
}
function renderAudioTracks(){
  const wrap=document.getElementById('audioTracks');
  if(!wrap)return;
  if(importedAudioTracks.length===0){wrap.innerHTML='';return}
  wrap.innerHTML=importedAudioTracks.map(t=>{
    if(typeof t.offset!=='number')t.offset=0;
    const bars=t.waveform.map(v=>`<span class="wavebar" style="height:${Math.max(6,Math.round(v*46))}px"></span>`).join('');
    const selected=t.id===selectedAudioId?' selected':'';
    return `<div class="audio-row${selected}" onclick="selectAudio('${t.id}')">
      <div class="audio-title">🎧 ${t.name}
        <div class="audio-tools">
          <button class="audio-mini-btn" onclick="event.stopPropagation();renameAudio('${t.id}')">Rename</button>
          <button class="audio-mini-btn" onclick="event.stopPropagation();copyAudio('${t.id}')">Copy</button>
          <button class="audio-mini-btn" onclick="event.stopPropagation();cutAudio('${t.id}')">Cut</button>
          <button class="audio-mini-btn danger" onclick="event.stopPropagation();deleteImportedAudio('${t.id}')">X</button>
        </div>
      </div>
      <div class="audio-lane" ondragover="event.preventDefault()" ondrop="dropAudioClip(event,'${t.id}')">
        <div class="audio-clip${selected}" draggable="true" onclick="event.stopPropagation();selectAudio('${t.id}')" ondragstart="dragAudioClip(event,'${t.id}')" style="margin-left:${t.offset}px" title="${t.fileName}">
          ${bars}
        </div>
      </div>
    </div>`;
  }).join('');
}

function selectAudio(id){
  selectedAudioId=id;
  renderTimeline();
}

function getSelectedAudio(){
  if(!selectedAudioId){alert('Pilih waveform dulu.');return null}
  const audio=importedAudioTracks.find(t=>t.id===selectedAudioId);
  if(!audio)alert('Audio tidak ditemukan.');
  return audio;
}

function renameAudio(id){
  const audio=importedAudioTracks.find(t=>t.id===id);
  if(!audio)return;
  const name=prompt('Nama audio track:',audio.name);
  if(name&&name.trim())audio.name=name.trim();
  updateImportList();
  renderTimeline();
}

function deleteImportedAudio(id){
  importedAudioTracks=importedAudioTracks.filter(t=>t.id!==id);
  if(selectedAudioId===id)selectedAudioId=null;
  updateImportList();
  renderTimeline();
}

function copyAudio(id){
  const audio=importedAudioTracks.find(t=>t.id===id);
  if(!audio)return;
  copiedAudioClip=JSON.parse(JSON.stringify(audio));
  selectedAudioId=id;
  renderTimeline();
  alert('Audio disalin.');
}

function copySelectedAudio(){
  const audio=getSelectedAudio();
  if(audio)copyAudio(audio.id);
}

function pasteAudio(){
  if(!copiedAudioClip){alert('Belum ada audio yang dicopy.');return}
  const copy=JSON.parse(JSON.stringify(copiedAudioClip));
  copy.id='audio'+Date.now();
  copy.name=copy.name+' Copy';
  copy.offset=(copy.offset||0)+30;
  importedAudioTracks.push(copy);
  selectedAudioId=copy.id;
  updateImportList();
  renderTimeline();
}

function cutAudio(id){
  const audio=importedAudioTracks.find(t=>t.id===id);
  if(!audio)return;
  if(!audio.waveform||audio.waveform.length<4){alert('Waveform terlalu pendek untuk dipotong.');return}
  const cutPoint=Math.floor(audio.waveform.length/2);
  const left=audio.waveform.slice(0,cutPoint);
  const right=audio.waveform.slice(cutPoint);
  audio.waveform=left;
  audio.name=audio.name+' A';
  audio.duration=audio.duration/2;
  const newClip=JSON.parse(JSON.stringify(audio));
  newClip.id='audio'+Date.now();
  newClip.name=audio.name.replace(' A',' B');
  newClip.waveform=right;
  newClip.offset=(audio.offset||0)+Math.max(80,left.length*10);
  importedAudioTracks.push(newClip);
  selectedAudioId=newClip.id;
  updateImportList();
  renderTimeline();
}

function cutSelectedAudio(){
  const audio=getSelectedAudio();
  if(audio)cutAudio(audio.id);
}

function dragAudioClip(ev,id){
  ev.dataTransfer.setData('audioId',id);
}

function dropAudioClip(ev,targetId){
  ev.preventDefault();
  const id=ev.dataTransfer.getData('audioId');
  const audio=importedAudioTracks.find(t=>t.id===id);
  if(!audio)return;
  const lane=ev.currentTarget.getBoundingClientRect();
  audio.offset=Math.max(0,Math.round(ev.clientX-lane.left-30));
  selectedAudioId=id;
  renderTimeline();
}

function scrollTimelineTop(){
  const panel=document.getElementById('timelinePanel');
  if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
}

function scrollTimelineBottom(){
  const panel=document.getElementById('timelinePanel');
  if(panel)panel.scrollIntoView({behavior:'smooth',block:'end'});
}



function getSupportedRecorderMime(){
  const types=[
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];

  for(const t of types){
    if(window.MediaRecorder && MediaRecorder.isTypeSupported(t))return t;
  }

  return '';
}

function updateAudioBufferStatus(){
  const el=document.getElementById('audioBufferStatus');
  if(!el)return;

  if(masterAudioBlob){
    el.textContent='Audio Buffer: Siap • '+formatBytes(masterAudioBlob.size);
    el.style.color='#4ade80';
  }else{
    el.textContent='Audio Buffer: Kosong';
    el.style.color='#facc15';
  }
}

function formatBytes(bytes){
  if(!bytes)return '0 KB';
  const kb=bytes/1024;
  if(kb<1024)return kb.toFixed(1)+' KB';
  return (kb/1024).toFixed(2)+' MB';
}

function createMasterTrackFromBuffer(){
  if(!masterAudioBlob)return;

  if(masterAudioUrl)URL.revokeObjectURL(masterAudioUrl);
  masterAudioUrl=URL.createObjectURL(masterAudioBlob);

  importedAudioTracks=importedAudioTracks.filter(t=>t.id!=='masterTrack');

  importedAudioTracks.unshift({
    id:'masterTrack',
    name:'Master Track',
    fileName:'master_recording_buffer.webm',
    type:masterAudioBlob.type || 'audio/webm',
    duration:Math.max(1,(Date.now()-masterRecordStart)/1000),
    waveform:[...masterWaveform],
    offset:0,
    isMaster:true,
    objectUrl:masterAudioUrl
  });

  updateImportList();
  renderTimeline();
}

function downloadMasterBuffer(){
  if(!masterAudioBlob){
    alert('Belum ada audio buffer asli.');
    return;
  }

  const a=document.createElement('a');
  a.href=URL.createObjectURL(masterAudioBlob);
  a.download=getExportFileName('webm');
  a.click();
  URL.revokeObjectURL(a.href);
}

function toggleMasterRecorder(){
  getAudioContext();

  if(!window.MediaRecorder){
    alert('MediaRecorder tidak didukung di browser ini.');
    return;
  }

  const btn=document.getElementById('recBtn');
  const status=document.getElementById('recordStatus');
  const exportStatus=document.getElementById('exportRecordStatus');

  if(!masterRecording){
    masterWaveform=[];
    masterAudioChunks=[];
    masterAudioBlob=null;
    masterRecordStart=Date.now();

    const mime=getSupportedRecorderMime();
    try{
      masterMediaRecorder=mime
        ? new MediaRecorder(masterDestination.stream,{mimeType:mime})
        : new MediaRecorder(masterDestination.stream);
    }catch(e){
      alert('Gagal membuat recorder audio.');
      return;
    }

    masterMediaRecorder.ondataavailable=function(ev){
      if(ev.data && ev.data.size>0){
        masterAudioChunks.push(ev.data);
      }
    };

    masterMediaRecorder.onstop=function(){
      const type=masterAudioChunks[0]?.type || masterMediaRecorder.mimeType || 'audio/webm';
      masterAudioBlob=new Blob(masterAudioChunks,{type});
      if(masterWaveform.length===0){
        masterWaveform=Array.from({length:48},()=>Math.random()*0.8+0.1);
      }
      createMasterTrackFromBuffer();
      renderMasterWaveform();
      updateAudioBufferStatus();
      if(status)status.textContent='Status: Audio Buffer Siap • '+formatBytes(masterAudioBlob.size);
      if(exportStatus)exportStatus.textContent=status?status.textContent:'Status: Audio Buffer Siap';
    };

    masterMediaRecorder.start(200);
    masterRecording=true;

    if(btn){
      btn.classList.add('recording');
      btn.textContent='⏹ Stop Rec';
    }
    if(status)status.textContent='Status: Recording Audio Buffer...';
    if(exportStatus)exportStatus.textContent='Status: Recording Audio Buffer...';
    updateAudioBufferStatus();
    renderMasterWaveform();
  }else{
    masterRecording=false;

    if(masterMediaRecorder && masterMediaRecorder.state!=='inactive'){
      masterMediaRecorder.stop();
    }

    if(btn){
      btn.classList.remove('recording');
      btn.textContent='🔴 Rec';
    }

    if(status)status.textContent='Status: Processing Audio Buffer...';
    if(exportStatus)exportStatus.textContent='Status: Processing Audio Buffer...';
  }
}

function captureMasterSignal(level){
  updateMasterMeter(level);
  if(!masterRecording)return;
  masterWaveform.push(Math.max(0.05,Math.min(1,level)));
  if(masterWaveform.length>96)masterWaveform.shift();
  renderMasterWaveform();
  updateAudioBufferStatus();
  updateImportList();
  renderTimeline();
}

function renderMasterWaveform(){
  const box=document.getElementById('masterWaveform');
  if(!box)return;
  if(masterWaveform.length===0){
    box.innerHTML='<span class="empty-record">Belum ada hasil rekam</span>';
    syncExportWaveform();
    return;
  }
  box.innerHTML=masterWaveform.map(v=>`<span class="master-bar" style="height:${Math.max(6,Math.round(v*48))}px"></span>`).join('');
  syncExportWaveform();
}

function clearMasterRecording(){
  masterWaveform=[];
  masterAudioChunks=[];
  masterAudioBlob=null;
  if(masterAudioUrl){URL.revokeObjectURL(masterAudioUrl);masterAudioUrl=null;}
  importedAudioTracks=importedAudioTracks.filter(t=>t.id!=='masterTrack');
  masterRecording=false;
  const btn=document.getElementById('recBtn');
  const status=document.getElementById('recordStatus');
  if(btn){
    btn.classList.remove('recording');
    btn.textContent='🔴 Rec';
  }
  if(status)status.textContent='Status: Idle';
  renderMasterWaveform();
}


function getExportFileName(ext){
  const input=document.getElementById('exportFileName');
  let name=(input&&input.value?input.value.trim():'MySong');
  name=name.replace(/[^a-zA-Z0-9_\- ]/g,'').trim()||'MySong';
  return name+'.'+ext;
}

function syncExportWaveform(){
  const src=document.getElementById('masterWaveform');
  const dest=document.getElementById('exportWaveform');
  const status=document.getElementById('recordStatus');
  const exportStatus=document.getElementById('exportRecordStatus');
  if(dest){
    if(masterWaveform.length===0){
      dest.innerHTML='<span class="empty-record">Belum ada hasil rekam</span>';
    }else{
      dest.innerHTML=masterWaveform.map(v=>`<span class="master-bar" style="height:${Math.max(6,Math.round(v*48))}px"></span>`).join('');
    }
  }
  if(exportStatus){
    exportStatus.textContent=status?status.textContent:'Status: Idle';
  }
}

async function saveMasterWav(){
  if(masterAudioBlob){
    try{
      const ctx=getAudioContext();
      const arr=await masterAudioBlob.arrayBuffer();
      const audioBuffer=await ctx.decodeAudioData(arr.slice(0));

      const channels=audioBuffer.numberOfChannels;
      const sampleRate=audioBuffer.sampleRate;
      const samples=audioBuffer.length;

      const wavBuffer=new ArrayBuffer(44 + samples * channels * 2);
      const view=new DataView(wavBuffer);

      function writeString(offset,str){
        for(let i=0;i<str.length;i++) view.setUint8(offset+i,str.charCodeAt(i));
      }

      writeString(0,'RIFF');
      view.setUint32(4,36 + samples * channels * 2,true);
      writeString(8,'WAVE');
      writeString(12,'fmt ');
      view.setUint32(16,16,true);
      view.setUint16(20,1,true);
      view.setUint16(22,channels,true);
      view.setUint32(24,sampleRate,true);
      view.setUint32(28,sampleRate*channels*2,true);
      view.setUint16(32,channels*2,true);
      view.setUint16(34,16,true);
      writeString(36,'data');
      view.setUint32(40,samples*channels*2,true);

      let offset=44;
      for(let i=0;i<samples;i++){
        for(let ch=0; ch<channels; ch++){
          let sample=audioBuffer.getChannelData(ch)[i];
          sample=Math.max(-1,Math.min(1,sample));
          view.setInt16(offset,sample<0?sample*32768:sample*32767,true);
          offset+=2;
        }
      }

      const wavBlob=new Blob([wavBuffer],{type:'audio/wav'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(wavBlob);
      a.download=getExportFileName('wav');
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }catch(err){
      console.error(err);
      alert('Gagal decode audio buffer, menggunakan mode fallback.');
    }
  }

  if(masterWaveform.length===0){
    alert('Belum ada hasil rekam.');
    return;
  }

  const sampleRate=44100;
  const seconds=Math.max(1,masterWaveform.length*0.08);
  const length=Math.floor(sampleRate*seconds);
  const buffer=new ArrayBuffer(44+length*2);
  const view=new DataView(buffer);

  function writeString(offset,str){
    for(let i=0;i<str.length;i++)view.setUint8(offset+i,str.charCodeAt(i));
  }

  writeString(0,'RIFF');
  view.setUint32(4,36+length*2,true);
  writeString(8,'WAVE');
  writeString(12,'fmt ');
  view.setUint32(16,16,true);
  view.setUint16(20,1,true);
  view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true);
  view.setUint32(28,sampleRate*2,true);
  view.setUint16(32,2,true);
  view.setUint16(34,16,true);
  writeString(36,'data');
  view.setUint32(40,length*2,true);

  for(let i=0;i<length;i++){
    const pos=i/length;
    const wi=Math.min(masterWaveform.length-1,Math.floor(pos*masterWaveform.length));
    const amp=masterWaveform[wi]||0;
    const sample=Math.sin(i*0.045)*amp*0.5;
    view.setInt16(44+i*2,Math.max(-1,Math.min(1,sample))*32767,true);
  }

  const blob=new Blob([view],{type:'audio/wav'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=getExportFileName('wav');
  a.click();
  URL.revokeObjectURL(a.href);
}


function getMp3EncoderLib(){
  if(window.lamejs && window.lamejs.Mp3Encoder)return window.lamejs;
  if(typeof lamejs==='function'){
    try{
      const lib=lamejs();
      if(lib && lib.Mp3Encoder){
        window.lamejs=lib;
        return lib;
      }
    }catch(e){}
  }
  return null;
}

function updateMp3EncoderStatus(){
  const el=document.getElementById('mp3EncoderStatus');
  if(!el)return;
  const lib=getMp3EncoderLib();
  if(lib){
    el.textContent='MP3 Encoder: Ready ✅';
    el.style.color='#4ade80';
  }else{
    el.textContent='MP3 Encoder: belum terbaca';
    el.style.color='#facc15';
  }
}

function floatTo16BitPCM(float32){
  const output=new Int16Array(float32.length);
  for(let i=0;i<float32.length;i++){
    const s=Math.max(-1,Math.min(1,float32[i]));
    output[i]=s<0?s*32768:s*32767;
  }
  return output;
}

function interleaveStereo(left,right){
  const length=left.length+right.length;
  const result=new Int16Array(length);
  let index=0;
  for(let i=0;i<left.length;i++){
    result[index++]=left[i];
    result[index++]=right[i];
  }
  return result;
}

async function decodeMasterAudioBuffer(){
  if(!masterAudioBlob)return null;
  const ctx=getAudioContext();
  const arr=await masterAudioBlob.arrayBuffer();
  return await ctx.decodeAudioData(arr.slice(0));
}

async function saveMasterMp3(){
  const lib=getMp3EncoderLib();

  if(!masterAudioBlob){
    alert('Belum ada audio buffer asli. Tekan Rec lalu Stop Rec dulu.');
    return;
  }

  if(!lib){
    alert('MP3 Encoder belum terbaca. Pastikan file lame.min.js ada satu folder dengan index.html dan dipanggil sebelum script.js.');
    updateMp3EncoderStatus();
    return;
  }

  try{
    const audioBuffer=await decodeMasterAudioBuffer();
    if(!audioBuffer){
      alert('Audio buffer tidak ditemukan.');
      return;
    }

    const sampleRate=audioBuffer.sampleRate;
    const channels=Math.min(2,audioBuffer.numberOfChannels);
    const kbps=128;
    const mp3Encoder=new lib.Mp3Encoder(channels,sampleRate,kbps);
    const mp3Data=[];
    const blockSize=1152;

    if(channels===1){
      const mono=floatTo16BitPCM(audioBuffer.getChannelData(0));
      for(let i=0;i<mono.length;i+=blockSize){
        const chunk=mono.subarray(i,i+blockSize);
        const mp3buf=mp3Encoder.encodeBuffer(chunk);
        if(mp3buf.length>0)mp3Data.push(mp3buf);
      }
    }else{
      const left=floatTo16BitPCM(audioBuffer.getChannelData(0));
      const right=floatTo16BitPCM(audioBuffer.getChannelData(1));
      for(let i=0;i<left.length;i+=blockSize){
        const l=left.subarray(i,i+blockSize);
        const r=right.subarray(i,i+blockSize);
        const mp3buf=mp3Encoder.encodeBuffer(l,r);
        if(mp3buf.length>0)mp3Data.push(mp3buf);
      }
    }

    const endBuf=mp3Encoder.flush();
    if(endBuf.length>0)mp3Data.push(endBuf);

    const mp3Blob=new Blob(mp3Data,{type:'audio/mpeg'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(mp3Blob);
    a.download=getExportFileName('mp3');
    a.click();
    URL.revokeObjectURL(a.href);

    const status=document.getElementById('exportRecordStatus');
    if(status)status.textContent='Status: MP3 berhasil dibuat • '+formatBytes(mp3Blob.size);
  }catch(err){
    console.error(err);
    alert('Export MP3 gagal. Coba Export WAV dulu untuk memastikan rekaman sudah benar.');
  }
}

document.addEventListener('DOMContentLoaded',()=>{setupImportInput();updateRecordList();updateImportList();renderTimeline();updateTimeDisplay(0);renderMasterWaveform();syncExportWaveform();updateMasterBusStatus();updateMasterMeter(0);updateAudioBufferStatus();updateMp3EncoderStatus()});



/* ===== IMPORT PLAYBACK + TIMELINE MIX FIX ===== */
let importedAudioSources = {};
let importedAudioBuffers = {};

function openImportPicker(){
  const input=document.getElementById('importInput');
  if(!input){
    alert('Input import tidak ditemukan.');
    return;
  }
  input.value='';
  input.click();
}

function setupImportInput(){
  const input=document.getElementById('importInput');
  if(!input || input.dataset.ready==='1')return;
  input.dataset.ready='1';

  input.addEventListener('change',async function(){
    const file=this.files && this.files[0];
    if(!file)return;

    const name=prompt('Masukkan nama track:',file.name.replace(/\.[^/.]+$/,''));
    if(!name || !name.trim()){
      this.value='';
      return;
    }

    try{
      const arrayBuffer=await file.arrayBuffer();
      const ctx=getAudioContext();
      const audioBuffer=await ctx.decodeAudioData(arrayBuffer.slice(0));
      const waveform=makeWaveform(audioBuffer,64);
      const id='audio'+Date.now();

      importedAudioBuffers[id]=audioBuffer;

      importedAudioTracks.push({
        id,
        name:name.trim(),
        fileName:file.name,
        type:file.type || 'audio',
        duration:audioBuffer.duration || 0,
        waveform,
        offset:0,
        volume:1
      });

      updateImportList();
      renderTimeline();
      openPanel('importPanel');
      alert('Import berhasil. File akan ikut berbunyi saat Timeline Play.');
    }catch(err){
      console.error(err);
      alert('File audio gagal dibaca. Coba MP3/WAV lain.');
    }

    this.value='';
  });
}

function updateImportList(){
  const l=document.getElementById('importList');
  if(!l)return;

  const visibleImports=importedAudioTracks.filter(t=>!t.isMaster && t.id!=='masterTrack' && t.name!=='Master Track');

  if(!visibleImports.length){
    l.innerHTML='<span class="empty-record">Belum ada file import</span>';
    return;
  }

  l.innerHTML=visibleImports.map(t=>`
    <div class="import-item">
      <div>
        <b>🎧 ${t.name}</b>
        <small>${t.fileName||'audio'} • ${formatTime((t.duration||0)*1000)}</small>
        <div class="import-audio-tools">
          <button onclick="playImportedAudio('${t.id}')">▶ Play</button>
          <button onclick="stopImportedAudio('${t.id}')">⏹ Stop</button>
          <button onclick="deleteImportedAudio('${t.id}')">🗑 Hapus</button>
        </div>
      </div>
    </div>
  `).join('');
}

function playImportedAudio(id, when=0){
  const track=importedAudioTracks.find(t=>t.id===id);
  const buffer=importedAudioBuffers[id];

  if(!track || !buffer){
    alert('Audio import belum siap. Import ulang file ini.');
    return null;
  }

  stopImportedAudio(id);

  const ctx=getAudioContext();
  const src=ctx.createBufferSource();
  const gain=ctx.createGain();

  src.buffer=buffer;
  gain.gain.value=Math.max(0,Math.min(1,track.volume ?? 1));

  src.connect(gain).connect(getMasterOutput());

  const startAt=ctx.currentTime + Math.max(0,when||0);
  src.start(startAt);

  src.onended=()=>{
    if(importedAudioSources[id]===src){
      delete importedAudioSources[id];
    }
  };

  importedAudioSources[id]=src;
  return src;
}

function playAllImportedAudio(){
  importedAudioTracks
    .filter(t=>!t.isMaster && importedAudioBuffers[t.id])
    .forEach(t=>playImportedAudio(t.id,0));
}

function stopImportedAudio(id){
  const src=importedAudioSources[id];
  if(src){
    try{src.stop();}catch(e){}
    delete importedAudioSources[id];
  }
}

function stopAllImportedAudio(){
  Object.keys(importedAudioSources).forEach(id=>stopImportedAudio(id));
}

function deleteImportedAudio(id){
  stopImportedAudio(id);
  delete importedAudioBuffers[id];
  importedAudioTracks=importedAudioTracks.filter(t=>t.id!==id);
  updateImportList();
  renderTimeline();
}

function playTimeline(){
  if(!legacyRecordedEvents.length && !importedAudioTracks.length)return;

  stopTimeline(false);
  stopAllImportedAudio();

  setPlayingUI(true);
  currentPlayIndex=0;

  const stepMs=(60/bpm)*1000;
  updateTimeDisplay(0);
  updatePlayhead(0);

  // File import ikut diputar dari awal Timeline.
  // Kalau Master Recorder sedang ON, suara import ikut masuk ke rekaman.
  playAllImportedAudio();

  playTimer=setInterval(()=>{
    if(currentPlayIndex>=16){
      stopTimeline();
      return;
    }

    legacyRecordedEvents.filter(e=>e.step===currentPlayIndex).forEach(playEvent);
    renderTimeline(currentPlayIndex);
    updatePlayhead(currentPlayIndex);
    updateTimeDisplay(currentPlayIndex*stepMs);
    currentPlayIndex++;
  },stepMs);
}

function stopTimeline(ui=true){
  if(playTimer){
    clearInterval(playTimer);
    playTimer=null;
  }

  stopAllImportedAudio();
  currentPlayIndex=0;
  renderTimeline();
  hidePlayhead();
  updateTimeDisplay(0);

  if(ui)setPlayingUI(false);
}

// Pastikan import input aktif setelah halaman dibuka.
document.addEventListener('DOMContentLoaded',()=>{
  setupImportInput();
  updateImportList();
});

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
function setupImportInput(){
  const input=document.getElementById('importInput');
  if(!input || input.dataset.v2ready==='1')return;
  input.dataset.v2ready='1';
  input.addEventListener('change',async function(){
    const file=this.files && this.files[0];
    if(!file)return;
    const name=prompt('Nama clip audio:',file.name.replace(/\.[^/.]+$/,''));
    if(!name || !name.trim()){ this.value=''; return; }
    try{
      const arrayBuffer=await file.arrayBuffer();
      const ctx=getAudioContext();
      const audioBuffer=await ctx.decodeAudioData(arrayBuffer.slice(0));
      const id='audio'+Date.now();
      if(typeof importedAudioBuffers!=='undefined')importedAudioBuffers[id]=audioBuffer;
      const waveform=makeWaveform(audioBuffer,64);
      const clip=createTimelineClip('Vokal',name.trim(),{id,name:name.trim(),duration:audioBuffer.duration,waveform,source:'import',fileName:file.name});
      importedAudioTracks.push({id:clip.id,name:clip.name,fileName:file.name,type:file.type||'audio',duration:clip.duration,waveform,offset:0,volume:1});
      updateImportList(); openPanel('timelinePanel');
    }catch(err){ console.error(err); alert('File audio gagal dibaca.'); }
    this.value='';
  });
}

function updateImportList(){
  const l=document.getElementById('importList'); if(!l)return;
  const imports=timelineClips.filter(c=>c.source==='import');
  if(!imports.length){ l.innerHTML='<span class="empty-record">Belum ada file import</span>'; return; }
  l.innerHTML=imports.map(c=>`<div class="import-item"><div><b>🎧 ${c.name}</b><small>${c.fileName||'audio'} • ${v2FormatSeconds(c.duration)}</small></div><button class="import-delete" onclick="deleteClipById('${c.id}')">×</button></div>`).join('');
}
function deleteClipById(id){
  timelineClips=timelineClips.filter(c=>c.id!==id);
  importedAudioTracks=importedAudioTracks.filter(t=>t.id!==id);
  if(typeof importedAudioBuffers!=='undefined')delete importedAudioBuffers[id];
  if(selectedClipId===id)selectedClipId=null;
  updateImportList(); updateRecordList(); renderTimeline();
}
function deleteImportedAudio(id){ deleteClipById(id); }

function saveProject(){
  const data={bpm,tracks,timelineClips,totalStepPages,masterWaveform};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='musik_studio_project_v2.json'; a.click(); URL.revokeObjectURL(a.href);
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

function saveProject(){
  const data={
    version:'v2-timeline-clips',
    bpm,tracks,totalStepPages,timelineClips,importedAudioTracks,masterWaveform
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='musik_studio_project_v2.json';
  a.click();
  URL.revokeObjectURL(a.href);
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



/* ===== V3 DRUM WAV ASSET ENGINE ===== */
const DRUM_ASSET_MAP={
  kick:'assets/drum/kick.wav',snare:'assets/drum/snare.wav',hihat_closed:'assets/drum/hihat_closed.wav',hat:'assets/drum/hihat_closed.wav',clap:'assets/drum/clap.wav',
  tom_high:'assets/drum/tom_high.wav',tom_mid:'assets/drum/tom_mid.wav',tom_low:'assets/drum/tom_low.wav',tom1:'assets/drum/tom_high.wav',tom2:'assets/drum/tom_mid.wav',tom3:'assets/drum/tom_low.wav',
  crash:'assets/drum/crash.wav',ride:'assets/drum/ride.wav',cymbal:'assets/drum/cymbal.wav',shaker:'assets/drum/shaker.wav',tambourine:'assets/drum/tambourine.wav',
  cowbell:'assets/drum/cowbell.wav',perc:'assets/drum/perc.wav',perc1:'assets/drum/perc.wav',perc2:'assets/drum/bloom_perc.wav',bloom_perc:'assets/drum/bloom_perc.wav',fx_hit:'assets/drum/fx_hit.wav'
};
let drumAssetBuffers={},drumAssetLoading={};
async function loadDrumAsset(type){
  const key=DRUM_ASSET_MAP[type]?type:'kick';
  if(drumAssetBuffers[key])return drumAssetBuffers[key];
  if(drumAssetLoading[key])return drumAssetLoading[key];
  drumAssetLoading[key]=(async()=>{
    const ctx=getAudioContext();
    const res=await fetch(DRUM_ASSET_MAP[key]);
    if(!res.ok)throw new Error('Asset drum tidak ditemukan: '+DRUM_ASSET_MAP[key]);
    const arr=await res.arrayBuffer();
    const buffer=await ctx.decodeAudioData(arr.slice(0));
    drumAssetBuffers[key]=buffer;
    return buffer;
  })();
  return drumAssetLoading[key];
}
function playDrumBufferV3(buffer,volume=1){
  const ctx=getAudioContext();
  const src=ctx.createBufferSource();
  const gain=ctx.createGain();
  src.buffer=buffer;
  gain.gain.value=Math.max(0,Math.min(1.5,volume));
  src.connect(gain).connect(getMasterOutput());
  src.start(ctx.currentTime);
}
function playDrum(type,rec=true){
  const key=DRUM_ASSET_MAP[type]?type:'kick';
  loadDrumAsset(key).then(buffer=>{playDrumBufferV3(buffer,1);captureMasterSignal(type==='kick'?1:.8);}).catch(err=>{
    console.warn(err);
    const c=getAudioContext(),n=c.currentTime,o=c.createOscillator(),g=envGain(c,n,.18,.8);
    o.type='sine';o.frequency.value=type==='kick'?70:220;o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+.18);
  });
  if(rec)autoRecord('Drum',type);
  flashPadText(type);
}
async function preloadDrumAssetsV3(){
  for(const k of Object.keys(DRUM_ASSET_MAP)){try{await loadDrumAsset(k)}catch(e){console.warn(e.message)}}
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(preloadDrumAssetsV3,500));

/* ===== V3 VOCAL PANEL FIX ===== */
let vocalRecorder=null, vocalChunks=[], vocalRecords=[], vocalRecording=false, vocalStream=null;

function setVocalStatus(text){const el=document.getElementById('vocalStatus');if(el)el.textContent=text;}

async function startVocalRecord(){
  if(vocalRecording){setVocalStatus('Sedang merekam...');return;}
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){alert('Browser/APK belum mendukung rekam mic.');return;}
  try{
    vocalStream=await navigator.mediaDevices.getUserMedia({audio:true});
    vocalChunks=[];
    vocalRecorder=new MediaRecorder(vocalStream);
    vocalRecorder.ondataavailable=e=>{if(e.data&&e.data.size>0)vocalChunks.push(e.data);};
    vocalRecorder.onstop=async()=>{
      const blob=new Blob(vocalChunks,{type:'audio/webm'});
      const url=URL.createObjectURL(blob);
      const id='vocal_'+Date.now()+Math.floor(Math.random()*999);
      const name='Vocal_'+String(vocalRecords.length+1).padStart(2,'0');
      let duration=3,waveform=makeSyntheticWaveform(name);
      try{
        const arr=await blob.arrayBuffer();
        const ctx=getAudioContext();
        const audioBuffer=await ctx.decodeAudioData(arr.slice(0));
        duration=audioBuffer.duration||duration;
        waveform=makeWaveform(audioBuffer,64);
      }catch(e){console.warn('Waveform vocal fallback:',e);}
      vocalRecords.push({id,name,blob,url,duration,waveform,createdAt:new Date().toLocaleString()});
      if(vocalStream){vocalStream.getTracks().forEach(t=>t.stop());vocalStream=null;}
      vocalRecording=false;
      setVocalStatus('Rekaman selesai: '+name);
      renderVocalList();
    };
    vocalRecorder.start();
    vocalRecording=true;
    setVocalStatus('Sedang merekam...');
  }catch(e){console.error(e);alert('Izin mic ditolak atau mic tidak tersedia.');setVocalStatus('Gagal merekam mic');}
}

function stopVocalRecord(){
  if(!vocalRecorder||!vocalRecording){setVocalStatus('Tidak sedang merekam.');return;}
  setVocalStatus('Memproses rekaman...');
  vocalRecorder.stop();
}

function playVocalRecord(id){
  const rec=vocalRecords.find(v=>v.id===id);if(!rec)return;
  const audio=new Audio(rec.url);audio.volume=1;
  audio.play().catch(()=>alert('Audio belum bisa diputar. Coba tekan lagi.'));
}

function deleteVocalRecord(id){
  const rec=vocalRecords.find(v=>v.id===id);if(!rec)return;
  if(!confirm('Hapus rekaman '+rec.name+'?'))return;
  try{URL.revokeObjectURL(rec.url)}catch(e){}
  vocalRecords=vocalRecords.filter(v=>v.id!==id);
  renderVocalList();
}

function addVocalToTimeline(id){
  const rec=vocalRecords.find(v=>v.id===id);if(!rec)return;
  if(typeof timelineClips==='undefined')window.timelineClips=[];
  const start=typeof playheadTime==='number'?playheadTime:0;
  const clip={id:'clip_vocal_'+Date.now(),name:rec.name,track:'Vokal',source:'vocal',sourceId:rec.id,url:rec.url,blob:rec.blob,startTime:start,duration:rec.duration||3,waveform:rec.waveform||makeSyntheticWaveform(rec.name),volume:1,pan:0,trimStart:0,trimEnd:0};
  timelineClips.push(clip);
  selectedClipId=clip.id;selectedAudioId=clip.id;
  if(typeof renderTimeline==='function')renderTimeline();
  openPanel('timelinePanel');
}

function renderVocalList(){
  const list=document.getElementById('vocalList');if(!list)return;
  if(!vocalRecords.length){list.innerHTML='<span class="empty-record">Belum ada rekaman vokal</span>';return;}
  list.innerHTML=vocalRecords.map(v=>`
    <div class="vocal-item">
      <div><b>${v.name}</b><small>${formatTime((v.duration||0)*1000)} • ${v.createdAt||''}</small></div>
      <div class="vocal-actions">
        <button onclick="playVocalRecord('${v.id}')">▶ Play</button>
        <button onclick="addVocalToTimeline('${v.id}')">➕ Timeline</button>
        <button class="danger" onclick="deleteVocalRecord('${v.id}')">🗑 Hapus</button>
      </div>
    </div>`).join('');
}

const _oldPlayClipV2BeforeVocalPatch = typeof playClipV2==='function' ? playClipV2 : null;
function playClipV2(c,delay=0,offsetInClip=0){
  if(c&&c.source==='vocal'){
    setTimeout(()=>{
      if(!c.url)return;
      const audio=new Audio(c.url);
      audio.volume=Math.max(0,Math.min(1,c.volume||1));
      audio.currentTime=Math.max(0,(c.trimStart||0)+(offsetInClip||0));
      audio.play().catch(e=>console.warn(e));
    },Math.max(0,delay*1000));
    return;
  }
  if(_oldPlayClipV2BeforeVocalPatch)return _oldPlayClipV2BeforeVocalPatch(c,delay,offsetInClip);
}
document.addEventListener('DOMContentLoaded',renderVocalList);



/* ===== FX CLEAN SYSTEM V4 READY =====
   Satu sistem FX saja:
   - Daftar FX Asset
   - Import FX
   - List Import FX
   - Play FX
   - Hapus Import FX
   - Tambah ke Timeline V2 via timelineClips
*/
const FX_ASSET_LIBRARY_CLEAN = [
  {id:'fx_asset_water_drop', name:'Water Drop', file:'assets/fx/water_drop.wav'},
  {id:'fx_asset_splash', name:'Splash', file:'assets/fx/splash.wav'},
  {id:'fx_asset_thunder', name:'Thunder', file:'assets/fx/thunder.wav'},
  {id:'fx_asset_wind', name:'Wind', file:'assets/fx/wind.wav'},
  {id:'fx_asset_crowd', name:'Crowd', file:'assets/fx/crowd.wav'}
];

let fxImportedClean = [];
let fxAssetBufferClean = {};
let fxImportBufferClean = {};

function openFxImportPicker(){
  const input=document.getElementById('fxImportInput');
  if(!input){alert('Input Import FX tidak ditemukan.');return;}
  input.value='';
  input.click();
}

function setupFxClean(){
  setupFxImportInputClean();
  renderFxAssetList();
  renderFxImportList();
}

function setupFxImportInputClean(){
  const input=document.getElementById('fxImportInput');
  if(!input || input.dataset.fxCleanReady==='1')return;
  input.dataset.fxCleanReady='1';

  input.addEventListener('change',async function(){
    const file=this.files && this.files[0];
    if(!file)return;

    const defaultName=file.name.replace(/\.[^/.]+$/,'');
    const inputName=prompt('Nama FX:',defaultName);
    if(!inputName || !inputName.trim()){this.value='';return;}

    const id='fx_import_'+Date.now()+Math.floor(Math.random()*999);
    const url=URL.createObjectURL(file);
    let duration=2;
    let waveform=makeSyntheticWaveform(inputName.trim());

    try{
      const arr=await file.arrayBuffer();
      const ctx=getAudioContext();
      const buffer=await ctx.decodeAudioData(arr.slice(0));
      fxImportBufferClean[id]=buffer;
      duration=buffer.duration || duration;
      waveform=makeWaveform(buffer,64);
    }catch(e){
      console.warn('Import FX waveform fallback:',e);
    }

    fxImportedClean.push({
      id,
      name:inputName.trim(),
      fileName:file.name,
      url,
      duration,
      waveform,
      createdAt:new Date().toLocaleString()
    });

    renderFxImportList();
    alert('FX berhasil diimport: '+inputName.trim());
    this.value='';
  });
}

async function loadFxAssetClean(asset){
  if(fxAssetBufferClean[asset.id])return fxAssetBufferClean[asset.id];

  const ctx=getAudioContext();
  const res=await fetch(asset.file);
  if(!res.ok)throw new Error('Asset FX belum ditemukan: '+asset.file);

  const arr=await res.arrayBuffer();
  const buffer=await ctx.decodeAudioData(arr.slice(0));
  fxAssetBufferClean[asset.id]=buffer;
  return buffer;
}

function playBufferClean(buffer,volume=1){
  const ctx=getAudioContext();
  const src=ctx.createBufferSource();
  const gain=ctx.createGain();
  src.buffer=buffer;
  gain.gain.value=Math.max(0,Math.min(1.5,Number(volume)||1));
  src.connect(gain).connect(getMasterOutput());
  src.start(ctx.currentTime);
  if(typeof captureMasterSignal==='function')captureMasterSignal(.75);
}

async function playFxAsset(id){
  const asset=FX_ASSET_LIBRARY_CLEAN.find(x=>x.id===id);
  if(!asset)return;
  try{
    const buffer=await loadFxAssetClean(asset);
    playBufferClean(buffer,1);
  }catch(e){
    alert(asset.name+' belum ada di folder assets/fx/. Masukkan file: '+asset.file.split('/').pop());
  }
}

function playFxImport(id){
  const fx=fxImportedClean.find(x=>x.id===id);
  if(!fx)return;

  if(fxImportBufferClean[id]){
    playBufferClean(fxImportBufferClean[id],1);
    return;
  }

  const audio=new Audio(fx.url);
  audio.volume=1;
  audio.play().catch(()=>alert('FX belum bisa diputar. Coba tekan lagi.'));
}

function renderFxAssetList(){
  const list=document.getElementById('fxAssetList');
  if(!list)return;

  list.innerHTML=FX_ASSET_LIBRARY_CLEAN.map(f=>`
    <div class="fx-item">
      <div>
        <b>${f.name}</b>
        <small>${f.file.replace('assets/fx/','')}</small>
      </div>
      <div class="fx-actions">
        <button onclick="playFxAsset('${f.id}')">▶ Play</button>
        <button onclick="addFxAssetToTimeline('${f.id}')">➕ Timeline</button>
      </div>
    </div>
  `).join('');
}

function renderFxImportList(){
  const list=document.getElementById('fxImportList');
  if(!list)return;

  if(!fxImportedClean.length){
    list.innerHTML='<span class="empty-record">Belum ada import FX</span>';
    return;
  }

  list.innerHTML=fxImportedClean.map(f=>`
    <div class="fx-item">
      <div>
        <b>${f.name}</b>
        <small>${f.fileName} • ${formatTime((f.duration||0)*1000)}</small>
      </div>
      <div class="fx-actions">
        <button onclick="playFxImport('${f.id}')">▶ Play</button>
        <button onclick="addFxImportToTimeline('${f.id}')">➕ Timeline</button>
        <button class="danger" onclick="deleteFxImport('${f.id}')">🗑 Hapus</button>
      </div>
    </div>
  `).join('');
}

async function addFxAssetToTimeline(id){
  const asset=FX_ASSET_LIBRARY_CLEAN.find(x=>x.id===id);
  if(!asset)return;

  let duration=2;
  let waveform=makeSyntheticWaveform(asset.name);

  try{
    const buffer=await loadFxAssetClean(asset);
    duration=buffer.duration||duration;
    waveform=makeWaveform(buffer,64);
  }catch(e){
    alert(asset.name+' belum bisa ditambahkan. File belum ada: '+asset.file.split('/').pop());
    return;
  }

  addFxClipToTimelineClean({
    id:'clip_fx_asset_'+Date.now(),
    name:asset.name,
    source:'fx_asset',
    sourceId:asset.id,
    file:asset.file,
    duration,
    waveform
  });
}

function addFxImportToTimeline(id){
  const fx=fxImportedClean.find(x=>x.id===id);
  if(!fx)return;

  addFxClipToTimelineClean({
    id:'clip_fx_import_'+Date.now(),
    name:fx.name,
    source:'fx_import',
    sourceId:fx.id,
    url:fx.url,
    duration:fx.duration||2,
    waveform:fx.waveform||makeSyntheticWaveform(fx.name)
  });
}

function addFxClipToTimelineClean(data){
  if(typeof timelineClips==='undefined')window.timelineClips=[];
  const start=typeof playheadTime==='number'?playheadTime:0;

  const clip={
    id:data.id,
    name:data.name,
    track:'FX',
    source:data.source,
    sourceId:data.sourceId,
    file:data.file,
    url:data.url,
    startTime:start,
    duration:data.duration||2,
    waveform:data.waveform||makeSyntheticWaveform(data.name),
    volume:1,
    pan:0,
    trimStart:0,
    trimEnd:0
  };

  timelineClips.push(clip);
  selectedClipId=clip.id;
  selectedAudioId=clip.id;

  if(typeof renderTimeline==='function')renderTimeline();
  openPanel('timelinePanel');
}

function deleteFxImport(id){
  const fx=fxImportedClean.find(x=>x.id===id);
  if(!fx)return;
  if(!confirm('Hapus FX '+fx.name+'?'))return;

  try{URL.revokeObjectURL(fx.url)}catch(e){}
  delete fxImportBufferClean[id];
  fxImportedClean=fxImportedClean.filter(x=>x.id!==id);
  renderFxImportList();
}

async function playFxTimelineClipClean(c,delay=0,offsetInClip=0){
  setTimeout(async()=>{
    try{
      if(c.source==='fx_asset'){
        const asset=FX_ASSET_LIBRARY_CLEAN.find(x=>x.id===c.sourceId);
        if(!asset)return;
        const buffer=await loadFxAssetClean(asset);
        playBufferClean(buffer,c.volume||1);
        return;
      }

      if(c.source==='fx_import'){
        const fx=fxImportedClean.find(x=>x.id===c.sourceId);
        if(!fx)return;

        if(fxImportBufferClean[fx.id]){
          playBufferClean(fxImportBufferClean[fx.id],c.volume||1);
          return;
        }

        const audio=new Audio(fx.url);
        audio.volume=Math.max(0,Math.min(1,c.volume||1));
        audio.currentTime=Math.max(0,(c.trimStart||0)+(offsetInClip||0));
        audio.play().catch(e=>console.warn(e));
      }
    }catch(e){
      console.warn('Play FX timeline gagal:',e);
    }
  },Math.max(0,delay*1000));
}

/* Bridge aman: panggil sistem lama untuk selain FX */
const _playClipV2BeforeFxClean = typeof playClipV2==='function' ? playClipV2 : null;
function playClipV2(c,delay=0,offsetInClip=0){
  if(c && (c.source==='fx_asset' || c.source==='fx_import')){
    playFxTimelineClipClean(c,delay,offsetInClip);
    return;
  }
  if(_playClipV2BeforeFxClean)return _playClipV2BeforeFxClean(c,delay,offsetInClip);
}

document.addEventListener('DOMContentLoaded',setupFxClean);



/* ===== DRUM ASSET ENGINE FIX =====
   Drum sekarang mencoba memutar file WAV dari assets/drum/.
   Jika file belum ada / gagal dibaca, otomatis fallback ke drum sintetis lama.
*/
const DRUM_ASSET_MAP = {
  kick:'assets/drum/kick.wav',
  snare:'assets/drum/snare.wav',
  hihat_closed:'assets/drum/hihat_closed.wav',
  clap:'assets/drum/clap.wav',
  tom_high:'assets/drum/tom_high.wav',
  tom_mid:'assets/drum/tom_mid.wav',
  tom_low:'assets/drum/tom_low.wav',
  crash:'assets/drum/crash.wav',
  ride:'assets/drum/ride.wav',
  cymbal:'assets/drum/cymbal.wav',
  shaker:'assets/drum/shaker.wav',
  tambourine:'assets/drum/tambourine.wav',
  cowbell:'assets/drum/cowbell.wav',
  perc:'assets/drum/perc.wav',
  bloom_perc:'assets/drum/bloom_perc.wav',
  fx_hit:'assets/drum/fx_hit.wav'
};

let drumAssetBuffers = {};
let drumAssetStatus = {};

async function loadDrumAsset(type){
  if(drumAssetBuffers[type])return drumAssetBuffers[type];

  const file = DRUM_ASSET_MAP[type];
  if(!file)throw new Error('Drum asset tidak dikenal: '+type);

  const ctx = getAudioContext();
  const res = await fetch(file);
  if(!res.ok)throw new Error('File drum belum ada: '+file);

  const arr = await res.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arr.slice(0));
  drumAssetBuffers[type] = buffer;
  drumAssetStatus[type] = 'asset';
  return buffer;
}

function playBufferToMaster(buffer, volume=1){
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = Math.max(0, Math.min(1.5, Number(volume)||1));
  src.connect(gain).connect(getMasterOutput());
  src.start(ctx.currentTime);
}

async function playDrum(type, rec=true){
  try{
    const buffer = await loadDrumAsset(type);
    playBufferToMaster(buffer, 1);
    if(rec)autoRecord('Drum',type);
    if(typeof captureMasterSignal==='function')captureMasterSignal(type==='kick'?1:.75);
    if(typeof flashPadText==='function')flashPadText(type);
  }catch(e){
    drumAssetStatus[type] = 'fallback';
    console.warn('Drum asset fallback:', type, e.message || e);
    if(typeof playDrumSynthFallback==='function'){
      playDrumSynthFallback(type, rec);
    }
  }
}

async function preloadDrumAssets(){
  const names = Object.keys(DRUM_ASSET_MAP);
  for(const n of names){
    try{
      await loadDrumAsset(n);
    }catch(e){
      drumAssetStatus[n] = 'fallback';
    }
  }
  updateDrumAssetStatus();
}

function updateDrumAssetStatus(){
  const total = Object.keys(DRUM_ASSET_MAP).length;
  const loaded = Object.values(drumAssetStatus).filter(v=>v==='asset').length;
  const fallback = Object.values(drumAssetStatus).filter(v=>v==='fallback').length;

  const panel = document.getElementById('drumPanel');
  if(!panel)return;

  let box = document.getElementById('drumAssetStatusBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'drumAssetStatusBox';
    box.className = 'import-info-box drum-asset-status';
    const head = panel.querySelector('.panel-head');
    if(head && head.nextSibling)panel.insertBefore(box, head.nextSibling);
    else panel.prepend(box);
  }

  box.innerHTML = `<b>Status Drum Asset:</b><span>${loaded}/${total} WAV aktif • ${fallback} fallback sintetis</span>`;
}

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(preloadDrumAssets,300);
});
