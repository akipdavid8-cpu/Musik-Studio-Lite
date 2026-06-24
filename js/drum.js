/* ===== V4.5 Tahap 8F-2: Drum JS ===== */
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

function playDrumSynthFallback(type,rec=true){let c=getAudioContext(),n=c.currentTime;if(type==='kick'){let o=c.createOscillator(),g=envGain(c,n,.23,1);o.type='sine';o.frequency.setValueAtTime(150,n);o.frequency.exponentialRampToValueAtTime(45,n+.16);o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+.23)}else if(['snare','clap','hat','shaker','crash','ride'].includes(type)){noiseHit(c,n,type==='crash'?.75:.18,type==='hat'?7000:1800)}else{let o=c.createOscillator(),g=envGain(c,n,.2,.75);o.type='triangle';o.frequency.value={tom1:180,tom2:140,tom3:95,perc1:360,perc2:520}[type]||220;o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+.2)}if(rec)autoRecord('Drum',type);captureMasterSignal(type==='kick'?1:.55);flashPadText(type)}
