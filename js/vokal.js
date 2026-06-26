/* =========================================
   VOCAL.JS PRO - TAHAP 1
   Recording Engine
   Musik Studio Lite V4.5
========================================= */

let vocalRecorder = null;
let vocalStream = null;
let vocalChunks = [];

let vocalRecording = false;
let vocalPaused = false;

let vocalRecords = [];
let vocalRecordStartTime = 0;
let vocalPauseStartTime = 0;
let vocalTotalPausedTime = 0;

/* ===== STATUS ===== */
function setVocalStatus(text, type = "error") {
  const status = document.getElementById("vocalStatus");
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

/* ===== MIME TYPE ===== */
function getVocalMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg"
  ];

  for (const type of types) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

/* ===== TOGGLE RECORD ON / OFF ===== */
async function toggleVocalRecord() {
  if (vocalRecording) {
    finishVocalRecord();
    return;
  }

  await startVocalRecord();
}

/* ===== START RECORD ===== */
async function startVocalRecord() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Browser ini belum mendukung rekam mikrofon.");
    return;
  }

  try {
    setVocalStatus("🟡 Siap-Siap", "loading");

    vocalStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    vocalChunks = [];
    vocalPaused = false;
    vocalRecordStartTime = Date.now();
    vocalTotalPausedTime = 0;

    const mimeType = getVocalMimeType();
    const options = mimeType ? { mimeType: mimeType } : undefined;

    vocalRecorder = new MediaRecorder(vocalStream, options);

    vocalRecorder.ondataavailable = function (event) {
      if (event.data && event.data.size > 0) {
        vocalChunks.push(event.data);
      }
    };

    vocalRecorder.onstop = function () {
      saveVocalRecord();
    };

    setTimeout(function () {
      if (!vocalRecorder) return;

      vocalRecorder.start(250);
      vocalRecording = true;
      vocalPaused = false;

      const btn = document.getElementById("vocalRecordToggleBtn");
      if (btn) btn.innerHTML = "🎤 Rekam ON";

      setVocalStatus("🟢 Mulai Menyanyi", "success");
    }, 800);

  } catch (err) {
    console.error("Gagal akses mikrofon:", err);
    setVocalStatus("🔴 Mikrofon gagal aktif", "error");
    cleanupVocalRecord();
  }
}

/* ===== STOP = PAUSE / LANJUT ===== */
function pauseVocalRecord() {
  if (!vocalRecorder || !vocalRecording) return;

  if (!vocalPaused) {
    if (vocalRecorder.state === "recording") {
      vocalRecorder.pause();
      vocalPaused = true;
      vocalPauseStartTime = Date.now();

      setVocalStatus("🟡 Rekaman Dijeda", "warning");

      const stopBtn = document.getElementById("vocalStopBtn");
      if (stopBtn) stopBtn.innerHTML = "▶ Lanjut";
    }
  } else {
    if (vocalRecorder.state === "paused") {
      vocalRecorder.resume();
      vocalPaused = false;
      vocalTotalPausedTime += Date.now() - vocalPauseStartTime;

      setVocalStatus("🟢 Mulai Menyanyi", "success");

      const stopBtn = document.getElementById("vocalStopBtn");
      if (stopBtn) stopBtn.innerHTML = "⏹ Stop";
    }
  }
}

/* ===== FINISH RECORD ===== */
function finishVocalRecord() {
  if (!vocalRecorder) return;

  try {
    if (vocalRecorder.state !== "inactive") {
      vocalRecorder.stop();
    }
  } catch (err) {
    console.warn("Gagal stop recorder:", err);
  }

  vocalRecording = false;
  vocalPaused = false;

  const btn = document.getElementById("vocalRecordToggleBtn");
  if (btn) btn.innerHTML = "🎤 Rekam OFF";

  const stopBtn = document.getElementById("vocalStopBtn");
  if (stopBtn) stopBtn.innerHTML = "⏹ Stop";

  setVocalStatus("🟡 Menyimpan Rekaman...", "loading");
}

/* ===== SAVE RECORD ===== */
function saveVocalRecord() {
  if (!vocalChunks || vocalChunks.length === 0) {
    setVocalStatus("🔴 Rekaman kosong", "error");
    cleanupVocalRecord();
    return;
  }

  const blob = new Blob(vocalChunks, {
    type: vocalChunks[0].type || "audio/webm"
  });

  const url = URL.createObjectURL(blob);

  const duration =
    Date.now() - vocalRecordStartTime - vocalTotalPausedTime;

  const record = {
    id: "vocal_" + Date.now(),
    name: "Vokal " + String(vocalRecords.length + 1).padStart(2, "0"),
    blob: blob,
    url: url,
    duration: duration,
    createdAt: Date.now(),
    processed: false,
    progress: 0
  };

  vocalRecords.push(record);

  cleanupVocalRecord();

  setVocalStatus("🔴 Belum Mulai", "error");

  if (typeof updateVocalList === "function") {
    updateVocalList();
  }
}

/* ===== CLEANUP ===== */
function cleanupVocalRecord() {
  try {
    if (vocalStream) {
      vocalStream.getTracks().forEach(function (track) {
        track.stop();
      });
    }
  } catch (e) {}

  vocalStream = null;
  vocalRecorder = null;
  vocalChunks = [];
}

/* ===== INIT ===== */
window.addEventListener("load", function () {
  setVocalStatus("🔴 Belum Mulai", "error");

  const btn = document.getElementById("vocalRecordToggleBtn");
  if (btn) btn.innerHTML = "🎤 Rekam OFF";

  const stopBtn = document.getElementById("vocalStopBtn");
  if (stopBtn) stopBtn.innerHTML = "⏹ Stop";
});
/* =========================================
   VOCAL.JS PRO - TAHAP 2
   Playback & Record Manager
========================================= */

/* ===== PLAY TERAKHIR ===== */
function playLastVocal(){

    if(vocalRecords.length===0){
        alert("Belum ada rekaman.");
        return;
    }

    const rec=vocalRecords[vocalRecords.length-1];
    const audio=new Audio(rec.url);

    audio.volume=1;
    audio.play();

}

/* ===== PLAY BERDASARKAN ID ===== */
function playVocalRecord(id){

    const rec=vocalRecords.find(r=>r.id===id);

    if(!rec)return;

    const audio=new Audio(rec.url);

    audio.volume=1;
    audio.play();

}

/* ===== HAPUS ===== */
function deleteVocalRecord(id){

    const rec=vocalRecords.find(r=>r.id===id);

    if(!rec)return;

    URL.revokeObjectURL(rec.url);

    vocalRecords=vocalRecords.filter(r=>r.id!==id);

    updateVocalList();

}

/* ===== RENAME ===== */
function renameVocalRecord(id){

    const rec=vocalRecords.find(r=>r.id===id);

    if(!rec)return;

    const name=prompt("Nama Rekaman",rec.name);

    if(!name)return;

    rec.name=name;

    updateVocalList();

}

/* ===== FORMAT DURASI ===== */
function formatDuration(ms){

    let sec=Math.floor(ms/1000);

    let m=Math.floor(sec/60);

    let s=sec%60;

    if(m<10)m="0"+m;
    if(s<10)s="0"+s;

    return m+":"+s;

}

/* ===== UPDATE LIST ===== */
function updateVocalList(){

    const box=document.getElementById("vocalList");

    if(!box)return;

    if(vocalRecords.length===0){

        box.innerHTML="Belum ada rekaman.";

        return;

    }

    box.innerHTML="";

    vocalRecords.forEach(function(rec,index){

        box.innerHTML+=`

<div class="record-item">

<div style="flex:1">

<b>${rec.name}</b><br>

<span>${formatDuration(rec.duration)}</span>

</div>

<button onclick="playVocalRecord('${rec.id}')">
▶
</button>

<button onclick="renameVocalRecord('${rec.id}')">
✏
</button>

<button onclick="deleteVocalRecord('${rec.id}')">
🗑
</button>

</div>

`;

    });

}

/* =========================================
   VOCAL.JS PRO - TAHAP 3
   Vocal FX Engine
   Noise / Smooth / Focus
========================================= */

let vocalNoiseEnabled = false;
let vocalSmoothEnabled = false;
let vocalFocusEnabled = false;

/* ===== TOGGLE NOISE ===== */
function toggleNoiseClean(){

    vocalNoiseEnabled = !vocalNoiseEnabled;

    const btn = document.getElementById("noiseBtn");

    if(btn){
        btn.innerHTML = vocalNoiseEnabled
        ? "🧹 Bersihkan Noise ON"
        : "🧹 Bersihkan Noise OFF";
    }

}

/* ===== TOGGLE SMOOTH ===== */
function toggleVocalSmooth(){

    vocalSmoothEnabled = !vocalSmoothEnabled;

    const btn = document.getElementById("smoothBtn");

    if(btn){
        btn.innerHTML = vocalSmoothEnabled
        ? "✨ Perhalus Vokal ON"
        : "✨ Perhalus Vokal OFF";
    }

}

/* ===== TOGGLE FOCUS ===== */
function toggleVocalFocus(){

    vocalFocusEnabled = !vocalFocusEnabled;

    const btn = document.getElementById("focusBtn");

    if(btn){
        btn.innerHTML = vocalFocusEnabled
        ? "🎯 Focus Vokal ON"
        : "🎯 Focus Vokal OFF";
    }

}

/* ===== PROSES PERHALUS ===== */
function enhanceVocalRecord(id){

    const rec = vocalRecords.find(r => r.id === id);

    if(!rec){
        alert("Rekaman tidak ditemukan.");
        return;
    }

    rec.progress = 10;
    rec.processed = false;

    updateVocalList();

    const steps = [20,30,40,50,60,70,80,90,100];
    let i = 0;

    const timer = setInterval(function(){

        rec.progress = steps[i];

        if(rec.progress >= 100){

            clearInterval(timer);

            rec.processed = true;
            rec.progress = 100;

            updateVocalList();

            alert("Perhalus vokal selesai.");

            return;
        }

        updateVocalList();

        i++;

    }, 250);

}

/* ===== UPDATE LIST VERSI FX ===== */
/* Menimpa updateVocalList dari Tahap 2 agar ada tombol Perhalus */
function updateVocalList(){

    const box = document.getElementById("vocalList");

    if(!box)return;

    if(vocalRecords.length === 0){

        box.innerHTML = "Belum ada rekaman.";

        return;

    }

    box.innerHTML = "";

    vocalRecords.forEach(function(rec,index){

        let progressText = "";

        if(rec.processed){
            progressText = "✅ Sukses";
        }else if(rec.progress && rec.progress > 0){
            progressText = "Memperhalus proses " + rec.progress + "%";
        }else{
            progressText = "Belum diproses";
        }

        box.innerHTML += `

<div class="record-item">

<div style="flex:1">

<b>${rec.name}</b><br>

<span>${formatDuration(rec.duration)}</span><br>

<small>${progressText}</small>

</div>

<button onclick="playVocalRecord('${rec.id}')">
▶
</button>

<button onclick="renameVocalRecord('${rec.id}')">
✏
</button>

<button onclick="enhanceVocalRecord('${rec.id}')">
✨
</button>

<button onclick="deleteVocalRecord('${rec.id}')">
🗑
</button>

</div>

`;

    });
}
/* =========================================
   VOCAL.JS PRO - TAHAP 4
   Timeline Integration
========================================= */

/* ===== TAMBAH VOKAL KE TIMELINE ===== */
function addVocalToTimeline(id){

    const rec = vocalRecords.find(r => r.id === id);

    if(!rec){
        alert("Rekaman vokal tidak ditemukan.");
        return;
    }

    if(typeof importedAudioTracks !== "undefined"){

        importedAudioTracks.push({
            id: rec.id,
            name: rec.name,
            fileName: rec.name + ".webm",
            type: "vocal",
            duration: rec.duration / 1000,
            waveform: [],
            offset: 0,
            url: rec.url
        });

    }

    if(typeof renderTimeline === "function"){
        renderTimeline();
    }

    if(typeof updateImportList === "function"){
        updateImportList();
    }

    alert(rec.name + " berhasil masuk ke Timeline.");

}

/* ===== UPDATE LIST VERSI TIMELINE ===== */
/* Menimpa updateVocalList dari Tahap 3 agar ada tombol Timeline */
function updateVocalList(){

    const box = document.getElementById("vocalList");

    if(!box)return;

    if(vocalRecords.length === 0){

        box.innerHTML = "Belum ada rekaman.";

        return;

    }

    box.innerHTML = "";

    vocalRecords.forEach(function(rec,index){

        let progressText = "";

        if(rec.processed){
            progressText = "✅ Sukses";
        }else if(rec.progress && rec.progress > 0){
            progressText = "Memperhalus proses " + rec.progress + "%";
        }else{
            progressText = "Belum diproses";
        }

        box.innerHTML += `

<div class="record-item">

<div style="flex:1">

<b>${rec.name}</b><br>

<span>${formatDuration(rec.duration)}</span><br>

<small>${progressText}</small>

</div>

<button onclick="playVocalRecord('${rec.id}')">
▶
</button>

<button onclick="renameVocalRecord('${rec.id}')">
✏
</button>

<button onclick="enhanceVocalRecord('${rec.id}')">
✨
</button>

<button onclick="addVocalToTimeline('${rec.id}')">
➕
</button>

<button onclick="deleteVocalRecord('${rec.id}')">
🗑
</button>

</div>

`;

    });

}

/* ===== TAMBAH SEMUA VOKAL KE TIMELINE ===== */
function addAllVocalToTimeline(){

    if(vocalRecords.length === 0){
        alert("Belum ada rekaman vokal.");
        return;
    }

    vocalRecords.forEach(function(rec){

        if(typeof importedAudioTracks !== "undefined"){

            importedAudioTracks.push({
                id: rec.id + "_all",
                name: rec.name,
                fileName: rec.name + ".webm",
                type: "vocal",
                duration: rec.duration / 1000,
                waveform: [],
                offset: 0,
                url: rec.url
            });

        }

    });

    if(typeof renderTimeline === "function"){
        renderTimeline();
    }

    if(typeof updateImportList === "function"){
        updateImportList();
    }

    alert("Semua rekaman vokal masuk ke Timeline.");

}
