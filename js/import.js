/* =========================================
   IMPORT.JS PRO - TAHAP 1
   Import Engine MP3 / WAV
   Musik Studio Lite V4.5
========================================= */

let importedAudioList = [];
let selectedImportId = null;
let importAutoTrack = true;
let importWaveformEnabled = true;
let importCurrentAudio = null;

/* ===== STATUS ===== */
function setImportStatus(text, type = "error") {
  const status = document.getElementById("importStatus");
  if (!status) return;

  status.innerHTML = text;
  status.className = "";

  if (type === "success") {
    status.classList.add("success");
  } else if (type === "loading") {
    status.classList.add("loading");
  } else if (type === "warning") {
    status.classList.add("warning");
  } else {
    status.classList.add("error");
  }
}

/* ===== UPDATE INFO ===== */
function updateImportInfo() {
  const info = document.getElementById("importInfo");
  if (!info) return;

  info.innerHTML = "File Import : " + importedAudioList.length;
}

/* ===== OPEN PICKER ===== */
function openImportPicker() {
  const input = document.getElementById("importInput");

  if (!input) {
    alert("Input import tidak ditemukan.");
    return;
  }

  input.value = "";
  input.click();
}

/* ===== SETUP INPUT ===== */
function setupImportInput() {
  const input = document.getElementById("importInput");

  if (!input) return;

  input.onchange = function (event) {
    const file = event.target.files[0];

    if (!file) return;

    handleImportFile(file);
  };
}

/* ===== HANDLE FILE ===== */
function handleImportFile(file) {
  const isAudio =
    file.type.startsWith("audio/") ||
    file.name.toLowerCase().endsWith(".mp3") ||
    file.name.toLowerCase().endsWith(".wav");

  if (!isAudio) {
    setImportStatus("🔴 File bukan audio MP3/WAV.", "error");
    return;
  }

  setImportStatus("🟡 Mengimport file audio...", "loading");

  const url = URL.createObjectURL(file);

  const audio = new Audio(url);
  audio.preload = "metadata";

  audio.onloadedmetadata = function () {
    const item = {
      id: "import_" + Date.now(),
      name: importAutoTrack
        ? "Track " + String(importedAudioList.length + 1).padStart(2, "0")
        : file.name,
      fileName: file.name,
      file: file,
      url: url,
      type: file.type || "audio",
      duration: audio.duration || 0,
      waveform: [],
      createdAt: Date.now()
    };

    importedAudioList.push(item);
    selectedImportId = item.id;

    updateImportInfo();

    if (typeof updateImportList === "function") {
      updateImportList();
    }

    setImportStatus("🟢 File berhasil diimport: " + file.name, "success");
  };

  audio.onerror = function () {
    URL.revokeObjectURL(url);
    setImportStatus("🔴 Gagal membaca file audio.", "error");
  };

  audio.load();
}

/* ===== TOGGLE AUTO TRACK ===== */
function toggleAutoTrack() {
  importAutoTrack = !importAutoTrack;

  const btn = document.getElementById("autoTrackBtn");

  if (btn) {
    btn.innerHTML = importAutoTrack
      ? "🎼 Auto Nama Track ON"
      : "🎼 Auto Nama Track OFF";
  }
}

/* ===== TOGGLE WAVEFORM ===== */
function toggleWaveform() {
  importWaveformEnabled = !importWaveformEnabled;

  const btn = document.getElementById("autoWaveBtn");

  if (btn) {
    btn.innerHTML = importWaveformEnabled
      ? "🌊 Waveform ON"
      : "🌊 Waveform OFF";
  }
}

/* ===== INIT ===== */
window.addEventListener("load", function () {
  setupImportInput();
  updateImportInfo();
  setImportStatus("🔴 Belum ada file diimport", "error");
});
/* =========================================
   IMPORT.JS PRO - TAHAP 2
   List Import + Play + Stop + Rename + Hapus
========================================= */

/* ===== FORMAT DURASI ===== */
function formatImportDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";

  const total = Math.floor(seconds);
  const min = Math.floor(total / 60);
  const sec = total % 60;

  return String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

/* ===== UPDATE LIST IMPORT ===== */
function updateImportList() {
  const box = document.getElementById("importList");
  if (!box) return;

  if (importedAudioList.length === 0) {
    box.innerHTML = "Belum ada file import.";
    return;
  }

  box.innerHTML = "";

  importedAudioList.forEach(function(item, index) {
    const row = document.createElement("div");
    row.className = "record-item import-item";

    const selected = selectedImportId === item.id ? " ✅" : "";

    row.innerHTML = `
      <div style="flex:1">
        <b>${index + 1}. ${item.name}${selected}</b><br>
        <small>${item.fileName} • ${formatImportDuration(item.duration)}</small>
      </div>

      <button onclick="selectImportAudio('${item.id}')">📌</button>
      <button onclick="playImportAudio('${item.id}')">▶</button>
      <button onclick="renameImportAudio('${item.id}')">✏</button>
      <button onclick="deleteImportAudio('${item.id}')">🗑</button>
    `;

    box.appendChild(row);
  });
}

/* ===== PILIH AUDIO IMPORT ===== */
function selectImportAudio(id) {
  const item = importedAudioList.find(function(audio) {
    return audio.id === id;
  });

  if (!item) return;

  selectedImportId = id;
  updateImportList();
  setImportStatus("🟢 Dipilih: " + item.name, "success");
}

/* ===== PLAY IMPORT ===== */
function playImportAudio(id) {
  const targetId = id || selectedImportId;

  const item = importedAudioList.find(function(audio) {
    return audio.id === targetId;
  });

  if (!item) {
    alert("Belum ada audio import yang dipilih.");
    return;
  }

  stopImportAudio();

  importCurrentAudio = new Audio(item.url);
  importCurrentAudio.volume = 0.95;
  importCurrentAudio.currentTime = 0;

  importCurrentAudio.play().catch(function(err) {
    console.warn("Play import error:", err);
  });

  selectedImportId = item.id;
  updateImportList();
  setImportStatus("🟢 Memutar: " + item.name, "success");
}

/* ===== STOP IMPORT ===== */
function stopImportAudio() {
  if (importCurrentAudio) {
    importCurrentAudio.pause();
    importCurrentAudio.currentTime = 0;
    importCurrentAudio = null;
  }

  setImportStatus("🟡 Playback import berhenti", "warning");
}

/* ===== RENAME IMPORT ===== */
function renameImportAudio(id) {
  const targetId = id || selectedImportId;

  const item = importedAudioList.find(function(audio) {
    return audio.id === targetId;
  });

  if (!item) {
    alert("Belum ada audio import yang dipilih.");
    return;
  }

  const name = prompt("Nama track import", item.name);

  if (!name || !name.trim()) return;

  item.name = name.trim();

  updateImportList();
  setImportStatus("🟢 Nama track diubah", "success");
}

/* ===== HAPUS IMPORT ===== */
function deleteImportAudio(id) {
  const targetId = id || selectedImportId;

  const item = importedAudioList.find(function(audio) {
    return audio.id === targetId;
  });

  if (!item) {
    alert("Belum ada audio import yang dipilih.");
    return;
  }

  const ok = confirm("Hapus file import ini?");

  if (!ok) return;

  if (item.url) {
    URL.revokeObjectURL(item.url);
  }

  importedAudioList = importedAudioList.filter(function(audio) {
    return audio.id !== targetId;
  });

  selectedImportId = importedAudioList.length ? importedAudioList[0].id : null;

  updateImportInfo();
  updateImportList();

  setImportStatus("🟢 File import dihapus", "success");
}

/* ===== INIT LIST ===== */
window.addEventListener("load", function() {
  updateImportList();
});
/* =========================================
   IMPORT.JS PRO - TAHAP 3
   Timeline Integration + Waveform Placeholder
========================================= */

function createImportWaveformPlaceholder(item) {
  if (!item) return [];

  const points = [];

  for (let i = 0; i < 32; i++) {
    points.push(Math.random());
  }

  return points;
}

function addImportToTimeline(id) {
  const targetId = id || selectedImportId;

  const item = importedAudioList.find(function(audio) {
    return audio.id === targetId;
  });

  if (!item) {
    alert("Belum ada audio import yang dipilih.");
    return;
  }

  const waveform = importWaveformEnabled
    ? createImportWaveformPlaceholder(item)
    : [];

  if (typeof importedAudioTracks !== "undefined") {
    importedAudioTracks.push({
      id: item.id,
      name: item.name,
      fileName: item.fileName,
      type: "import",
      duration: item.duration,
      waveform: waveform,
      offset: 0,
      url: item.url
    });
  }

  if (typeof renderTimeline === "function") {
    renderTimeline();
  }

  if (typeof updateImportList === "function") {
    updateImportList();
  }

  setImportStatus("🟢 Audio import masuk ke Timeline", "success");

  alert(item.name + " berhasil ditambahkan ke Timeline.");
}

function addAllImportToTimeline() {
  if (importedAudioList.length === 0) {
    alert("Belum ada file import.");
    return;
  }

  importedAudioList.forEach(function(item) {
    addImportToTimeline(item.id);
  });

  setImportStatus("🟢 Semua file import masuk ke Timeline", "success");
}
/* =========================================
   IMPORT.JS PRO - TAHAP 4
   Waveform + Final List
========================================= */

/* ===== GENERATE WAVEFORM ===== */
async function generateWaveform(item){

    if(!item)return [];

    try{

        const arrayBuffer = await item.file.arrayBuffer();

        const audioContext =
            new(window.AudioContext||window.webkitAudioContext)();

        const audioBuffer =
            await audioContext.decodeAudioData(arrayBuffer);

        const channel = audioBuffer.getChannelData(0);

        const samples = 128;

        const block = Math.floor(channel.length / samples);

        const waveform = [];

        for(let i=0;i<samples;i++){

            let sum = 0;

            for(let j=0;j<block;j++){

                sum += Math.abs(channel[(i*block)+j]);

            }

            waveform.push(sum/block);

        }

        return waveform;

    }catch(e){

        console.warn("Waveform fallback",e);

        return createImportWaveformPlaceholder(item);

    }

}

/* ===== UPDATE WAVEFORM ===== */
async function updateImportWaveform(id){

    const item = importedAudioList.find(function(a){

        return a.id===id;

    });

    if(!item)return;

    if(!importWaveformEnabled){

        item.waveform=[];

        return;

    }

    item.waveform =
        await generateWaveform(item);

}

/* ===== REFRESH SEMUA ===== */
async function refreshAllWaveforms(){

    for(const item of importedAudioList){

        await updateImportWaveform(item.id);

    }

}

/* ===== RENAME TRACK OTOMATIS ===== */
function autoRenameTracks(){

    importedAudioList.forEach(function(item,index){

        item.name =
            "Track "+
            String(index+1).padStart(2,"0");

    });

    updateImportList();

}

/* ===== SORT BERDASARKAN WAKTU ===== */
function sortImportList(){

    importedAudioList.sort(function(a,b){

        return a.createdAt-b.createdAt;

    });

    updateImportList();

}

/* ===== FINAL CHECK ===== */
function importFinalCheck(){

    let report=[];

    report.push(document.getElementById("importInput")
        ?"✅ importInput"
        :"❌ importInput");

    report.push(document.getElementById("importList")
        ?"✅ importList"
        :"❌ importList");

    report.push(document.getElementById("importStatus")
        ?"✅ importStatus"
        :"❌ importStatus");

    report.push(typeof handleImportFile==="function"
        ?"✅ Import Engine"
        :"❌ Import Engine");

    report.push(typeof playImportAudio==="function"
        ?"✅ Play"
        :"❌ Play");

    report.push(typeof addImportToTimeline==="function"
        ?"✅ Timeline"
        :"❌ Timeline");

    console.log(report.join("\n"));

    alert(report.join("\n"));

}

/* ===== INIT ===== */
window.addEventListener("load",async function(){

    await refreshAllWaveforms();

    sortImportList();

});
/* =========================================
   IMPORT.JS PRO - TAHAP 5
   Editor Musik Integration + Final Tools
========================================= */

/* ===== BUAT CLIP IMPORT UNTUK EDITOR MUSIK ===== */
function createImportTimelineClip(item){

    const clip = {
        id: "clip_import_" + Date.now(),
        sourceId: item.id,
        type: "audio-import",
        bank: "Import",
        name: item.name,
        fileName: item.fileName,
        url: item.url,
        duration: item.duration || 0,
        waveform: item.waveform || [],
        start: 0,
        offset: 0,
        volume: 1,
        pan: 0,
        muted: false,
        solo: false,
        selected: false,
        color: "#9d4edd",
        createdAt: Date.now()
    };

    return clip;

}

/* ===== TAMBAH IMPORT KE EDITOR MUSIK ===== */
function addImportToEditor(item){

    if(!item){
        alert("File import tidak ditemukan.");
        return;
    }

    const clip = createImportTimelineClip(item);

    if(typeof timelineClips !== "undefined"){

        timelineClips.push(clip);

    }else if(typeof importedAudioTracks !== "undefined"){

        importedAudioTracks.push(clip);

    }else if(typeof legacyRecordedEvents !== "undefined"){

        legacyRecordedEvents.push({
            id: clip.id,
            bank: "Import",
            note: clip.name,
            type: "audio-import",
            time: Date.now(),
            clip: clip
        });

    }

    if(typeof renderTimeline === "function"){
        renderTimeline();
    }

    if(typeof updateRecordList === "function"){
        updateRecordList();
    }

    if(typeof updateImportList === "function"){
        updateImportList();
    }

    setImportStatus("🟢 Clip import masuk ke Editor Musik", "success");

}

/* ===== OVERRIDE TAMBAH KE TIMELINE FINAL ===== */
function addImportToTimeline(id){

    const targetId = id || selectedImportId;

    const item = importedAudioList.find(function(audio){
        return audio.id === targetId;
    });

    if(!item){
        alert("Belum ada audio import yang dipilih.");
        return;
    }

    if(importWaveformEnabled && (!item.waveform || item.waveform.length === 0)){
        item.waveform = createImportWaveformPlaceholder(item);
    }

    addImportToEditor(item);

    alert(item.name + " berhasil masuk ke Editor Musik.");

}

/* ===== TAMBAH SEMUA IMPORT KE EDITOR MUSIK ===== */
function addAllImportToTimeline(){

    if(importedAudioList.length === 0){
        alert("Belum ada file import.");
        return;
    }

    importedAudioList.forEach(function(item){

        if(importWaveformEnabled && (!item.waveform || item.waveform.length === 0)){
            item.waveform = createImportWaveformPlaceholder(item);
        }

        addImportToEditor(item);

    });

    setImportStatus("🟢 Semua import masuk ke Editor Musik", "success");

    alert("Semua file import berhasil masuk ke Editor Musik.");

}

/* ===== EXPORT DATA IMPORT UNTUK PROJECT SAVE ===== */
function getImportProjectData(){

    return importedAudioList.map(function(item){

        return {
            id: item.id,
            name: item.name,
            fileName: item.fileName,
            type: item.type,
            duration: item.duration,
            waveform: item.waveform || [],
            createdAt: item.createdAt
        };

    });

}

/* ===== CLEAR SEMUA IMPORT ===== */
function clearAllImportAudio(){

    const ok = confirm("Hapus semua file import?");

    if(!ok)return;

    stopImportAudio();

    importedAudioList.forEach(function(item){

        if(item.url){
            URL.revokeObjectURL(item.url);
        }

    });

    importedAudioList = [];
    selectedImportId = null;

    updateImportInfo();
    updateImportList();

    setImportStatus("🔴 Semua file import dihapus", "error");

}

/* ===== UPDATE LIST FINAL DENGAN TOMBOL TIMELINE ===== */
function updateImportList(){

    const box = document.getElementById("importList");

    if(!box)return;

    if(importedAudioList.length === 0){

        box.innerHTML = "Belum ada file import.";

        return;

    }

    box.innerHTML = "";

    importedAudioList.forEach(function(item,index){

        const row = document.createElement("div");

        row.className = "record-item import-item";

        const selected =
            selectedImportId === item.id ? " ✅" : "";

        const waveText =
            item.waveform && item.waveform.length
            ? "🌊 Waveform"
            : "Waveform kosong";

        row.innerHTML = `

<div style="flex:1">

<b>${index + 1}. ${item.name}${selected}</b><br>

<small>${item.fileName} • ${formatImportDuration(item.duration)} • ${waveText}</small>

</div>

<button onclick="selectImportAudio('${item.id}')">
📌
</button>

<button onclick="playImportAudio('${item.id}')">
▶
</button>

<button onclick="renameImportAudio('${item.id}')">
✏
</button>

<button onclick="addImportToTimeline('${item.id}')">
➕
</button>

<button onclick="deleteImportAudio('${item.id}')">
🗑
</button>

`;

        box.appendChild(row);

    });

}

/* ===== FINAL CHECK IMPORT ===== */
function importPanelFinalCheck(){

    let report = [];

    report.push(document.getElementById("importInput") ? "✅ importInput OK" : "❌ importInput hilang");
    report.push(document.getElementById("importStatus") ? "✅ importStatus OK" : "❌ importStatus hilang");
    report.push(document.getElementById("importInfo") ? "✅ importInfo OK" : "❌ importInfo hilang");
    report.push(document.getElementById("importList") ? "✅ importList OK" : "❌ importList hilang");

    report.push(typeof openImportPicker === "function" ? "✅ openImportPicker OK" : "❌ openImportPicker hilang");
    report.push(typeof handleImportFile === "function" ? "✅ handleImportFile OK" : "❌ handleImportFile hilang");
    report.push(typeof playImportAudio === "function" ? "✅ playImportAudio OK" : "❌ playImportAudio hilang");
    report.push(typeof addImportToTimeline === "function" ? "✅ addImportToTimeline OK" : "❌ addImportToTimeline hilang");

    console.log("IMPORT PANEL FINAL CHECK");
    console.log(report.join("\\n"));

    alert(report.join("\\n"));

}

/* ===== INIT FINAL IMPORT ===== */
window.addEventListener("load", function(){

    updateImportInfo();
    updateImportList();

    console.log("Import Panel V4.5 siap.");

});
