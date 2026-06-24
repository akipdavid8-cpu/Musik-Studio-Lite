/* ===== V4.5 Tahap 8F-5: Import JS ===== */
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

function deleteImportedAudio(id){
  importedAudioTracks=importedAudioTracks.filter(t=>t.id!==id);
  if(selectedAudioId===id)selectedAudioId=null;
  updateImportList();
  renderTimeline();
}

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

// Pastikan import input aktif setelah halaman dibuka.
document.addEventListener('DOMContentLoaded',()=>{
  setupImportInput();
  updateImportList();
});
