/* ===== V4.5 Tahap 8F-8A: Restore Piano Modular =====
   72 Pad Piano mulai C4
   16 asset dasar: C4,D4,E4,F4,G4,A4,B4,C5,D5,E5,F5,G5,A5,B5,C6,D6
   Pitch naik saja: playbackRate selalu >= 1
*/

const PIANO_BASE_NOTES_V45 = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5','C6','D6'];
const PIANO_ALL_NOTES_V45 = buildPianoNotesV45('C4',72);
let pianoCurrentBankV45 = 0;
let pianoRecordEnabledV45 = false;
let pianoRecordStartV45 = 0;
let pianoRecordsV45 = [];
let pianoAssetBuffersV45 = {};
let pianoAssetLoadedV45 = false;
let pianoAssetLoadedCountV45 = 0;

// Tetap sediakan map lama agar fungsi lain tidak rusak.
let piano = Object.assign(typeof piano === 'object' ? piano : {}, makePianoFrequencyMapV45());

function noteToMidiV45(note){
  const m = String(note).match(/^([A-G])(#?)(-?\d+)$/);
  if(!m)return 60;
  const base = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]] + (m[2] === '#' ? 1 : 0);
  return (Number(m[3]) + 1) * 12 + base;
}

function midiToNoteV45(midi){
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const n = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return names[n] + oct;
}

function noteFreqV45(note){
  return 440 * Math.pow(2,(noteToMidiV45(note)-69)/12);
}

function buildPianoNotesV45(startNote,count){
  const start = noteToMidiV45(startNote);
  return Array.from({length:count},(_,i)=>midiToNoteV45(start+i));
}

function makePianoFrequencyMapV45(){
  const map = {};
  buildPianoNotesV45('C0',120).forEach(n=>map[n]=noteFreqV45(n));
  return map;
}

function findPianoSourceNoteV45(targetNote){
  const targetMidi = noteToMidiV45(targetNote);
  let best = PIANO_BASE_NOTES_V45[0];
  for(const n of PIANO_BASE_NOTES_V45){
    if(noteToMidiV45(n) <= targetMidi) best = n;
    else break;
  }
  return best;
}

function pianoPlaybackRateV45(targetNote,sourceNote){
  const rate = noteFreqV45(targetNote) / noteFreqV45(sourceNote);
  return Math.max(1, rate); // Hz naik saja, tidak pernah turun.
}

function setPianoStatusV45(type,msg,info){
  const st = document.getElementById('pianoAssetStatusV45');
  const inf = document.getElementById('pianoAssetInfoV45');
  if(st){
    st.className = 'piano-status-v45 ' + (type || 'fail');
    st.textContent = msg || '🔴 Belum load asset';
  }
  if(inf)inf.textContent = info || `Asset: ${pianoAssetLoadedCountV45}/16 • Mode: Pitch Up Only • Base: C4 → D6`;
}

async function loadAudioFirstOkV45(urls){
  const ctx = getAudioContext();
  for(const url of urls){
    try{
      const res = await fetch(url,{cache:'no-store'});
      if(!res.ok)continue;
      const arr = await res.arrayBuffer();
      return await ctx.decodeAudioData(arr.slice(0));
    }catch(e){/* coba nama berikutnya */}
  }
  return null;
}

async function loadPianoAssetsV45(){
  setPianoStatusV45('loading','🟡 Loading asset piano...','Mencari 16 asset di assets/piano/');
  pianoAssetLoadedCountV45 = 0;
  pianoAssetBuffersV45 = {};

  for(const note of PIANO_BASE_NOTES_V45){
    const plain = note.replace('#','s');
    const urls = [
      `assets/piano/${note}.wav`,
      `assets/piano/${plain}.wav`,
      `assets/piano/${note}.mp3`,
      `assets/piano/${plain}.mp3`,
      `assets/piano/piano_${note}.wav`,
      `assets/piano/piano_${plain}.wav`,
      `assets/piano/${note.toLowerCase()}.wav`,
      `assets/piano/${plain.toLowerCase()}.wav`
    ];
    const buffer = await loadAudioFirstOkV45(urls);
    if(buffer){
      pianoAssetBuffersV45[note] = buffer;
      pianoAssetLoadedCountV45++;
    }
  }

  pianoAssetLoadedV45 = pianoAssetLoadedCountV45 === PIANO_BASE_NOTES_V45.length;
  if(pianoAssetLoadedV45){
    setPianoStatusV45('success','🟢 SUCCESS: 16 asset piano berhasil dimuat',`Asset: 16/16 • Mode: Pitch Up Only • Base: C4 → D6 • Pad: 72`);
  }else if(pianoAssetLoadedCountV45 > 0){
    setPianoStatusV45('loading',`🟡 Sebagian asset terbaca: ${pianoAssetLoadedCountV45}/16`,`Asset: ${pianoAssetLoadedCountV45}/16 • Fallback synth untuk asset kosong • Mode: Pitch Up Only`);
  }else{
    setPianoStatusV45('fail','🔴 FAILED: asset piano tidak ditemukan','Asset: 0/16 • Cek folder assets/piano/ dan nama file C4.wav, D4.wav, dst');
  }
}

function playPianoAssetV45(note){
  const sourceNote = findPianoSourceNoteV45(note);
  const buffer = pianoAssetBuffersV45[sourceNote];
  if(!buffer)return false;
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  src.playbackRate.value = pianoPlaybackRateV45(note,sourceNote);
  gain.gain.value = 0.9;
  src.connect(gain).connect(getMasterOutput());
  src.start();
  try{ src.stop(ctx.currentTime + Math.min(3, buffer.duration / src.playbackRate.value)); }catch(e){}
  if(typeof captureMasterSignal === 'function')captureMasterSignal(.65);
  return true;
}

function recordPianoHitV45(note){
  if(!pianoRecordEnabledV45)return;
  const now = Date.now();
  if(!pianoRecordStartV45)pianoRecordStartV45 = now;
  pianoRecordsV45.push({note, time: now - pianoRecordStartV45});
  updatePianoRecordListV45();
}

function playPiano(note,rec=false){
  // rec sengaja diabaikan agar tidak auto record dari sistem lama.
  const ok = playPianoAssetV45(note);
  if(!ok && typeof tone === 'function'){
    tone(note,piano,'triangle','Piano',false,.75);
  }
  recordPianoHitV45(note);
  if(typeof flashPadText === 'function')flashPadText(note);
}

function togglePianoRecordV45(){
  pianoRecordEnabledV45 = !pianoRecordEnabledV45;
  if(pianoRecordEnabledV45 && !pianoRecordStartV45)pianoRecordStartV45 = Date.now();
  const btn = document.getElementById('pianoRecordBtnV45');
  if(btn){
    btn.textContent = pianoRecordEnabledV45 ? '⏺ Record ON' : '⏺ Record OFF';
    btn.classList.toggle('recording',pianoRecordEnabledV45);
  }
  updatePianoRecordListV45();
}

function playPianoRecordV45(){
  if(!pianoRecordsV45.length){alert('Belum ada rekam piano.');return;}
  const start = pianoRecordsV45[0].time || 0;
  pianoRecordsV45.forEach(r=>{
    setTimeout(()=>playPiano(r.note,false), Math.max(0,r.time-start));
  });
}

function clearPianoRecordV45(){
  if(!pianoRecordsV45.length)return;
  if(!confirm('Hapus semua rekam piano?'))return;
  pianoRecordsV45 = [];
  pianoRecordStartV45 = 0;
  updatePianoRecordListV45();
}

function addPianoRecordToTimelineV45(){
  if(!pianoRecordsV45.length){alert('List rekam piano masih kosong.');return;}
  const startBase = (typeof playheadTime !== 'undefined' ? Number(playheadTime)||0 : 0);
  const first = pianoRecordsV45[0].time || 0;
  pianoRecordsV45.forEach(r=>{
    const offsetSec = Math.max(0,(r.time-first)/1000);
    if(typeof createTimelineClip === 'function'){
      createTimelineClip('Piano',r.note,{source:'piano-record',startTime:startBase+offsetSec,duration:.75,name:'Piano_'+r.note});
    }else if(typeof autoRecord === 'function'){
      autoRecord('Piano',r.note);
    }
  });
  if(typeof openPanel === 'function')openPanel('timelinePanel');
}

function updatePianoRecordListV45(){
  const list = document.getElementById('pianoRecordListV45');
  if(!list)return;
  if(!pianoRecordsV45.length){
    list.innerHTML = '<span class="empty-record">Belum ada rekam piano</span>';
    return;
  }
  list.innerHTML = pianoRecordsV45.map((r,i)=>`<span class="record-chip">${i+1}. ${r.note} • ${formatTime ? formatTime(r.time) : (r.time+'ms')}</span>`).join('');
  list.scrollTop = list.scrollHeight;
}

function changePianoBankV45(delta){
  pianoCurrentBankV45 = Math.max(0,Math.min(2,pianoCurrentBankV45 + delta));
  renderPianoPadsV45();
}

function renderPianoPadsV45(){
  const grid = document.getElementById('pianoPadGridV45');
  const label = document.getElementById('pianoBankTextV45');
  if(!grid)return;
  const start = pianoCurrentBankV45 * 24;
  const notes = PIANO_ALL_NOTES_V45.slice(start,start+24);
  if(label)label.textContent = `Bank ${pianoCurrentBankV45+1}/3`;
  grid.innerHTML = notes.map(n=>`<button class="pad piano-pad" onclick="playPiano('${n}')">${n}</button>`).join('');
}

document.addEventListener('DOMContentLoaded',()=>{
  renderPianoPadsV45();
  updatePianoRecordListV45();
  setPianoStatusV45('fail','🔴 Belum load asset','Asset: 0/16 • Mode: Pitch Up Only • Base: C4 → D6 • Pad: 72');
});
