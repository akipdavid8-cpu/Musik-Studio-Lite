/* ===== V4.5 Tahap 8F-1: Modular Core - Audio Engine ===== */
window.addEventListener('error',function(e){console.warn('JS Error:',e.message,e.filename,e.lineno);});
window.addEventListener('unhandledrejection',function(e){console.warn('Promise Error:',e.reason);});

let isPlaying=false,audioCtx=null,masterBus=null,masterDestination=null,masterMeterDecayTimer=null,masterMediaRecorder=null,masterAudioChunks=[],masterAudioBlob=null,masterAudioUrl=null,currentStepPage=0,totalStepPages=8,legacySelectedNoteId=null,legacyCopiedNote=null,legacyRecordedEvents=[],importedAudioTracks=[],recordStartTime=Date.now(),bpm=120,playTimer=null,currentPlayIndex=0,selectedAudioId=null,copiedAudioClip=null,masterRecording=false,masterWaveform=[],masterRecordStart=0;
let tracks=[{id:'Drum',title:'🥁 Drum'},{id:'Piano',title:'🎹 Piano'},{id:'Guitar',title:'🎸 Guitar'},{id:'Bass',title:'🎸 Bass'},{id:'Vokal',title:'🎤 Vokal'},{id:'FX',title:'✨ FX'},{id:'MIDI',title:'🎼 MIDI'}];

function uid(){return 'ev'+Date.now()+Math.floor(Math.random()*9999)}
function getAudioContext(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    masterBus=audioCtx.createGain();
    masterBus.gain.value=0.95;
    masterDestination=audioCtx.createMediaStreamDestination();
    masterBus.connect(audioCtx.destination);
    masterBus.connect(masterDestination);
    setTimeout(updateMasterBusStatus,0);
  }
  if(audioCtx.state==='suspended')audioCtx.resume();
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

/* ===== V4.5 Tahap 8F-2: Shared Instrument Audio Helpers ===== */
function envGain(ctx,now,dur=0.4,vol=.5){let g=ctx.createGain();g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(vol,now+.02);g.gain.exponentialRampToValueAtTime(.001,now+dur);return g}

function tone(note,map,type,bank,rec=true,dur=.7){let c=getAudioContext(),n=c.currentTime,f=map[note]||440,o=c.createOscillator(),g=envGain(c,n,dur,.45);o.type=type;o.frequency.value=f;o.connect(g).connect(getMasterOutput());o.start(n);o.stop(n+dur);captureMasterSignal(.55);if(rec)autoRecord(bank,note);flashPadText(note)}

function noiseHit(c,n,d,f){let b=c.createBuffer(1,c.sampleRate*d,c.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;let s=c.createBufferSource(),fi=c.createBiquadFilter(),g=envGain(c,n,d,.7);s.buffer=b;fi.type='highpass';fi.frequency.value=f;s.connect(fi).connect(g).connect(getMasterOutput());s.start(n);s.stop(n+d)}

function flashPadText(v){let t=String(v).toLowerCase().replace('-','').replace(' ','');document.querySelectorAll('.pad').forEach(p=>{let x=p.textContent.toLowerCase().replace('-','').replace(' ','');if(x===t||t.includes(x)||x.includes(t)){p.classList.add('hit');setTimeout(()=>p.classList.remove('hit'),120)}})}
