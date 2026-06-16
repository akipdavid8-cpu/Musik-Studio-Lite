let isPlaying=false,audioCtx=null,masterBus=null,masterDestination=null,masterMeterDecayTimer=null,masterMediaRecorder=null,masterAudioChunks=[],masterAudioBlob=null,masterAudioUrl=null,currentStepPage=0,totalStepPages=4,selectedNoteId=null,copiedNote=null,recordedEvents=[],importedAudioTracks=[],recordStartTime=Date.now(),bpm=120,playTimer=null,currentPlayIndex=0,selectedAudioId=null,copiedAudioClip=null,masterRecording=false,masterWaveform=[],masterRecordStart=0;
let tracks=[{id:'Drum',title:'🥁 Drum'},{id:'Piano',title:'🎹 Piano'},{id:'Guitar',title:'🎸 Guitar'},{id:'Bass',title:'🎸 Bass'}];
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

function closeAllPanels(){['drumPanel','pianoPanel','guitarPanel','bassPanel','importPanel','timelinePanel','exportPanel'].forEach(id=>{let e=document.getElementById(id);if(e)e.classList.remove('show')})}
function openPanel(id){closeAllPanels();document.getElementById(id).classList.add('show');renderTimeline();updateMasterBusStatus();syncExportWaveform()}
function closePanel(id){document.getElementById(id).classList.remove('show')}
function setPlayingUI(on){isPlaying=on;let t=document.getElementById('playTile');let l=document.getElementById('playLabel');if(t)t.classList.toggle('playing',on);if(l)l.textContent=on?'Playing':'Play'}
function changeBpm(v){bpm=Math.max(40,Math.min(300,bpm+v));document.getElementById('bpmText').textContent=bpm+' BPM'}
function addCustomTrack(){let i=document.getElementById('newTrackTitle'),t=(i.value||'').trim();if(!t)return;tracks.push({id:'Custom'+Date.now(),title:t});i.value='';renderTimeline()}
function deleteTrack(id){if(['Drum','Piano','Guitar','Bass'].includes(id)){alert('Track bawaan tidak bisa dihapus.');return}if(confirm('Hapus track ini?')){tracks=tracks.filter(t=>t.id!==id);recordedEvents=recordedEvents.filter(e=>e.bank!==id);updateRecordList();renderTimeline()}}
function trackTitle(id){let t=tracks.find(x=>x.id===id);return t?t.title:id}
function autoRecord(bank,note){let step=recordedEvents.filter(e=>e.bank===bank).length%64;recordedEvents.push({id:uid(),bank,note,step,time:Date.now()-recordStartTime});currentStepPage=Math.floor(step/16);updateRecordList();renderTimeline()}
function clearTimeline(){recordedEvents=[];recordStartTime=Date.now();updateRecordList();renderTimeline()}
function updateRecordList(){let l=document.getElementById('recordList');if(!l)return;if(!recordedEvents.length){l.innerHTML='<span class="empty-record">Belum ada nada direkam</span>';return}l.innerHTML=recordedEvents.map((e,i)=>`<span class="record-chip">${i+1}. ${trackTitle(e.bank)} ${e.note} S${e.step+1}</span>`).join('');l.scrollTop=l.scrollHeight}

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
    selectedNoteId=null;
    renderTimeline();
  }
}

function nextStepPage(){
  if(currentStepPage<totalStepPages-1){
    currentStepPage++;
    selectedNoteId=null;
    renderTimeline();
  }
}

function clearSelectedNote(){
  selectedNoteId=null;
  renderTimeline();
}

function selectNote(id){
  selectedNoteId=id;
  renderTimeline();
}

function handleStepTap(bank,step,eventId){
  if(eventId){
    if(selectedNoteId===eventId){
      editNote(eventId);
    }else{
      selectNote(eventId);
    }
    return;
  }

  if(selectedNoteId){
    moveNote(selectedNoteId,bank,step);
    selectedNoteId=null;
    return;
  }

  if(copiedNote){
    const ok=confirm('Paste note ke step '+(step+1)+'?');
    if(ok){
      pasteNoteTo(bank,step);
    }
  }
}

function deleteSelectedNote(){
  if(!selectedNoteId){
    alert('Pilih note dulu.');
    return;
  }
  recordedEvents=recordedEvents.filter(e=>e.id!==selectedNoteId);
  selectedNoteId=null;
  updateRecordList();
  renderTimeline();
}

function copySelectedNote(){
  if(!selectedNoteId){
    alert('Pilih note dulu.');
    return;
  }
  const ev=recordedEvents.find(e=>e.id===selectedNoteId);
  if(!ev)return;
  copiedNote={bank:ev.bank,note:ev.note,step:ev.step};
  alert('Note disalin.');
}

function pasteSelectedNote(){
  if(!copiedNote){
    alert('Belum ada note yang dicopy.');
    return;
  }
  const targetStep=currentStepPage*16;
  recordedEvents.push({id:uid(),bank:copiedNote.bank,note:copiedNote.note,step:targetStep,time:Date.now()-recordStartTime});
  updateRecordList();
  renderTimeline();
}

function pasteNoteTo(bank,step){
  if(!copiedNote){
    alert('Belum ada note yang dicopy.');
    return;
  }
  recordedEvents.push({id:uid(),bank,note:copiedNote.note,step,time:Date.now()-recordStartTime});
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

function renderTimeline(active=-1){
  updatePageText();
  renderAudioTracks();
  let h=document.getElementById('stepHeader'),w=document.getElementById('timelineTracks');
  if(!h||!w)return;

  const pageStart=currentStepPage*16;
  h.innerHTML='<div></div>'+Array.from({length:16},(_,i)=>`<div class="step-num">${String(pageStart+i+1).padStart(2,'0')}</div>`).join('');
  w.innerHTML='';

  tracks.forEach(tr=>{
    let r=document.createElement('div');
    r.className='track-row';

    let title=document.createElement('div');
    title.className='track-title';
    title.innerHTML=`<span>${tr.title}</span><div class="track-actions"><button onclick="renameTrack('${tr.id}')">✏</button>${tr.id.startsWith('Custom')?`<button onclick="deleteTrack('${tr.id}')">🗑</button>`:''}</div>`;
    r.appendChild(title);

    for(let i=0;i<16;i++){
      let realStep=pageStart+i;
      let s=document.createElement('div');
      let ev=recordedEvents.find(e=>e.bank===tr.id&&e.step===realStep);

      s.className='step'+(ev?' filled':'')+(realStep===active?' playing-step':'')+(ev&&ev.id===selectedNoteId?' selected-note':'');
      s.textContent=ev?ev.note:'';

      s.onclick=()=>handleStepTap(tr.id,realStep,ev?ev.id:null);
      s.oncontextmenu=(e)=>{e.preventDefault(); if(ev){selectedNoteId=ev.id; copySelectedNote()}else{pasteNoteTo(tr.id,realStep)}};

      r.appendChild(s);
    }
    w.appendChild(r);
  });
}
function editNote(id){let ev=recordedEvents.find(e=>e.id===id);if(!ev)return;let c=prompt('Edit note:\n1 = Hapus note\n2 = Ganti nama note\n3 = Pindah track\n4 = Batal','2');if(c==='1'){recordedEvents=recordedEvents.filter(e=>e.id!==id)}else if(c==='2'){let n=prompt('Nama note baru:',ev.note);if(n&&n.trim())ev.note=n.trim()}else if(c==='3'){let list=tracks.map((t,i)=>`${i+1}. ${t.title}`).join('\n'),n=parseInt(prompt('Pilih track tujuan:\n'+list,'1'),10);if(n>=1&&n<=tracks.length)ev.bank=tracks[n-1].id}updateRecordList();renderTimeline()}
function moveNote(id,bank,step){let ev=recordedEvents.find(e=>e.id===id);if(!ev)return;ev.bank=bank;ev.step=Number(step);updateRecordList();renderTimeline()}

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
  const data={bpm,tracks,recordedEvents,importedAudioTracks,masterWaveform,totalStepPages};
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
  if(!recordedEvents.length)return;
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
    recordedEvents.filter(e=>e.step===currentPlayIndex).forEach(playEvent);
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
function playDrum(type,rec=true){let c=getAudioContext(),n=c.currentTime;if(type==='kick'){let o=c.createOscillator(),g=envGain(c,n,.23,1);o.type='sine';o.frequency.setValueAtTime(150,n);o.frequency.exponentialRampToValueAtTime(45,n+.16);o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+.23)}else if(['snare','clap','hat','shaker','crash','ride'].includes(type)){noiseHit(c,n,type==='crash'?.75:.18,type==='hat'?7000:1800)}else{let o=c.createOscillator(),g=envGain(c,n,.2,.75);o.type='triangle';o.frequency.value={tom1:180,tom2:140,tom3:95,perc1:360,perc2:520}[type]||220;o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+.2)}if(rec)autoRecord('Drum',type);captureMasterSignal(type==='kick'?1:.55);flashPadText(type)}
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


document.getElementById('loadProjectInput').addEventListener('change',function(){
  let file=this.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(){
    try{
      const data=JSON.parse(reader.result);
      bpm=data.bpm||120;
      tracks=data.tracks||tracks; totalStepPages=data.totalStepPages||4;
      recordedEvents=data.recordedEvents||[]; importedAudioTracks=data.importedAudioTracks||[]; masterWaveform=data.masterWaveform||[];
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
});

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
  if(!recordedEvents.length && !importedAudioTracks.length)return;

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

    recordedEvents.filter(e=>e.step===currentPlayIndex).forEach(playEvent);
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
