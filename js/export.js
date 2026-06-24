/* ===== V4.5 Tahap 8F-5: Export JS ===== */
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

function writeString(offset,str){
        for(let i=0;i<str.length;i++) view.setUint8(offset+i,str.charCodeAt(i));
      }

function writeString(offset,str){
    for(let i=0;i<str.length;i++)view.setUint8(offset+i,str.charCodeAt(i));
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
