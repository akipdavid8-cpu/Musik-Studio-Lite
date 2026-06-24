function setPlayingUI(on){isPlaying=on;let t=document.getElementById('playTile');let l=document.getElementById('playLabel');if(t)t.classList.toggle('playing',on);if(l)l.textContent=on?'Playing':'Play'}
function changeBpm(v){bpm=Math.max(40,Math.min(300,bpm+v));document.getElementById('bpmText').textContent=bpm+' BPM'}
function addCustomTrack(){let i=document.getElementById('newTrackTitle'),t=(i.value||'').trim();if(!t)return;tracks.push({id:'Custom'+Date.now(),title:t});i.value='';renderTimeline()}

function trackTitle(id){let t=tracks.find(x=>x.id===id);return t?t.title:id}

document.addEventListener('DOMContentLoaded',()=>{
  ['setupImportInput','updateRecordList','updateImportList','renderTimeline','renderMasterWaveform','syncExportWaveform','updateMasterBusStatus','updateAudioBufferStatus','updateMp3EncoderStatus'].forEach(fn=>{try{if(typeof window[fn]==='function')window[fn]();}catch(e){console.warn(fn,e);}});
  try{if(typeof updateTimeDisplay==='function')updateTimeDisplay(0);}catch(e){console.warn('updateTimeDisplay',e);}
  try{if(typeof updateMasterMeter==='function')updateMasterMeter(0);}catch(e){console.warn('updateMasterMeter',e);}
});
