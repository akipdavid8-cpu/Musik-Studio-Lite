/* ===== V4.5 Tahap 8F-5: Project JS ===== */
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
