/* ===== V4.5 Tahap 8F-1: Modular Core - Tools / Panel UI ===== */
function closeAllPanels(){
  ['drumPanel','pianoPanel','guitarPanel','bassPanel','vocalPanel','fxPanel','midiPanel','importPanel','timelinePanel','exportPanel','projectPanel'].forEach(id=>{
    const e=document.getElementById(id);
    if(e)e.classList.remove('show');
  });
  const backdrop=document.getElementById('panelBackdrop');
  if(backdrop)backdrop.classList.remove('show');
  document.body.classList.remove('panel-open');
}
function openPanel(id){
  closeAllPanels();
  const panel=document.getElementById(id);
  if(!panel){ alert('Panel tidak ditemukan: '+id); return; }
  panel.classList.add('show');
  const backdrop=document.getElementById('panelBackdrop');
  if(backdrop)backdrop.classList.add('show');
  document.body.classList.add('panel-open');
}
function closePanel(id){
  const panel=document.getElementById(id);
  if(panel)panel.classList.remove('show');
  if(!document.querySelector('.panel.show')){
    const backdrop=document.getElementById('panelBackdrop');
    if(backdrop)backdrop.classList.remove('show');
    document.body.classList.remove('panel-open');
  }
}
