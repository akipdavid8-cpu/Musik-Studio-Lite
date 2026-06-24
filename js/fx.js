/* ===== FX CLEAN SYSTEM V4 READY =====
   Satu sistem FX saja:
   - Daftar FX Asset
   - Import FX
   - List Import FX
   - Play FX
   - Hapus Import FX
   - Tambah ke Editor Musik V2 via timelineClips
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
        <button onclick="addFxAssetToTimeline('${f.id}')">➕ Editor Musik</button>
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
        <button onclick="addFxImportToTimeline('${f.id}')">➕ Editor Musik</button>
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