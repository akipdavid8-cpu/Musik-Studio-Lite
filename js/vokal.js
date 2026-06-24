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
        <button onclick="addVocalToTimeline('${v.id}')">➕ Editor Musik</button>
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