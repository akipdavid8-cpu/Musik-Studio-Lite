/* =========================================
   FX.JS PRO - TAHAP 1
   Asset Engine
   Musik Studio Lite V4.5
========================================= */

let fxCurrentBank = "A";
let fxDefaultSamples = {};
let fxDefaultLoaded = false;

const FX_DEFAULT_COUNT = 30;
const FX_DEFAULT_PATH = "assets/fx/";

const fxDefaultList = [
  "fx1","fx2","fx3","fx4","fx5",
  "fx6","fx7","fx8","fx9","fx10",
  "fx11","fx12","fx13","fx14","fx15",
  "fx16","fx17","fx18","fx19","fx20",
  "fx21","fx22","fx23","fx24","fx25",
  "fx26","fx27","fx28","fx29","fx30"
];

/* ===== STATUS ===== */
function setFxStatus(text, type = "error") {
  const status = document.getElementById("fxStatus");
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

/* ===== INFO JUMLAH FX ===== */
function updateFxInfo() {
  const info = document.getElementById("fxInfo");
  if (!info) return;

  const defaultCount = Object.keys(fxDefaultSamples).length;
  const userCount = typeof fxUserSamples !== "undefined"
    ? Object.keys(fxUserSamples).length
    : 0;

  info.innerHTML =
    "Default FX: " + defaultCount + "/30 • User FX: " + userCount + "/30";
}

/* ===== LOAD 30 ASSET DEFAULT FX ===== */
async function loadFxAssets() {
  setFxStatus("🟡 Memuat 30 Asset FX...", "loading");

  fxDefaultSamples = {};
  let loaded = 0;
  let failed = 0;

  for (const name of fxDefaultList) {
    try {
      const audio = new Audio(FX_DEFAULT_PATH + name + ".wav");
      audio.preload = "auto";
      audio.volume = 0.95;

      await new Promise(function(resolve) {
        audio.oncanplaythrough = function() {
          fxDefaultSamples[name] = audio;
          loaded++;
          resolve();
        };

        audio.onerror = function() {
          failed++;
          console.warn("FX asset gagal dimuat:", name);
          resolve();
        };

        audio.load();
      });

    } catch (err) {
      failed++;
      console.warn("Error load FX:", name, err);
    }
  }

  if (loaded === FX_DEFAULT_COUNT) {
    fxDefaultLoaded = true;
    setFxStatus("🟢 30 Asset FX Berhasil Dimuat", "success");
  } else if (loaded > 0) {
    fxDefaultLoaded = true;
    setFxStatus("🟡 Asset FX Dimuat " + loaded + "/30 • Gagal " + failed, "warning");
  } else {
    fxDefaultLoaded = false;
    setFxStatus("🔴 Asset FX Gagal Dimuat", "error");
  }

  updateFxInfo();
  renderFxDefaultPads();
}

/* ===== RENDER 30 PAD DEFAULT ===== */
function renderFxDefaultPads() {
  const grid = document.getElementById("fxDefaultGrid");
  if (!grid) return;

  grid.innerHTML = "";

  fxDefaultList.forEach(function(name, index) {
    const btn = document.createElement("button");
    btn.className = "pad fx-pad";
    btn.innerHTML = "FX" + (index + 1);
    btn.onclick = function() {
      playDefaultFx(name);
    };
    grid.appendChild(btn);
  });
}

/* ===== PLAY DEFAULT FX ===== */
function playDefaultFx(name) {
  const sample = fxDefaultSamples[name];

  if (!sample) {
    console.warn("FX belum dimuat:", name);
    setFxStatus("🔴 " + name + " belum dimuat", "error");
    return;
  }

  const audio = sample.cloneNode(true);
  audio.volume = 0.95;
  audio.currentTime = 0;

  audio.play().catch(function(err) {
    console.warn("Play FX error:", err);
  });

  if (typeof fxRecordEnabled !== "undefined" && fxRecordEnabled) {
    if (typeof fxRecords !== "undefined") {
      fxRecords.push({
        type: "default",
        name: name,
        label: name.toUpperCase(),
        time: Date.now()
      });

      if (typeof updateFxRecordList === "function") {
        updateFxRecordList();
      }
    }
  }
}

/* ===== BANK NAVIGATION ===== */
function showFxBank(bank) {
  fxCurrentBank = bank;

  const title = document.getElementById("fxBankTitle");
  const defaultGrid = document.getElementById("fxDefaultGrid");
  const userGrid = document.getElementById("fxUserGrid");
  const userTools = document.getElementById("fxUserTools");
  const message = document.getElementById("fxBankMessage");

  if (bank === "A") {
    if (title) title.innerHTML = "[A] Default FX";
    if (defaultGrid) defaultGrid.style.display = "grid";
    if (userGrid) userGrid.style.display = "none";
    if (userTools) userTools.style.display = "none";
    if (message) message.innerHTML = "Bank A Default FX siap digunakan setelah asset dimuat.";
  } else {
    if (title) title.innerHTML = "[B] User FX";
    if (defaultGrid) defaultGrid.style.display = "none";
    if (userGrid) userGrid.style.display = "grid";
    if (userTools) userTools.style.display = "block";
    if (message) message.innerHTML = "Bank B User FX: import WAV/MP3 ke 30 pad user.";
  }
}

/* ===== NEXT BANK ===== */
function nextFxBank() {
  if (fxCurrentBank === "A") {
    showFxBank("B");
  } else {
    showFxBank("A");
  }
}

/* ===== PREV BANK ===== */
function prevFxBank() {
  if (fxCurrentBank === "A") {
    showFxBank("B");
  } else {
    showFxBank("A");
  }
}

/* ===== INIT ===== */
window.addEventListener("load", function() {
  setFxStatus("🔴 Asset FX Belum Dimuat", "error");
  updateFxInfo();
  renderFxDefaultPads();
  showFxBank("A");
});

/* =========================================
   FX.JS PRO - TAHAP 2
   User FX Bank
   30 Pad User FX + Import WAV/MP3
========================================= */

let fxUserSamples = {};
let fxUserFiles = {};
let fxSelectedUserPad = null;

const FX_USER_COUNT = 30;

/* ===== RENDER 30 PAD USER ===== */
function renderFxUserPads(){

    const grid = document.getElementById("fxUserGrid");

    if(!grid)return;

    grid.innerHTML = "";

    for(let i = 1; i <= FX_USER_COUNT; i++){

        const key = "user_fx_" + i;

        const btn = document.createElement("button");

        btn.className = "pad fx-pad";

        if(fxUserSamples[key]){
            btn.innerHTML = "U" + i + " ✅";
        }else{
            btn.innerHTML = "U" + i;
        }

        btn.onclick = function(){
            playUserFx(key);
        };

        btn.oncontextmenu = function(e){
            e.preventDefault();
            selectUserFxPad(key);
            return false;
        };

        btn.ondblclick = function(){
            selectUserFxPad(key);
        };

        grid.appendChild(btn);

    }

    updateFxInfo();

}

/* ===== PILIH PAD USER UNTUK IMPORT ===== */
function selectUserFxPad(key){

    fxSelectedUserPad = key;

    const input = document.getElementById("fxImportInput");

    if(input){
        input.value = "";
        input.click();
    }

}

/* ===== OPEN IMPORT PICKER ===== */
function openFxImportPicker(){

    if(!fxSelectedUserPad){
        fxSelectedUserPad = "user_fx_1";
    }

    const input = document.getElementById("fxImportInput");

    if(input){
        input.value = "";
        input.click();
    }

}

/* ===== HANDLE IMPORT USER FX ===== */
function setupFxImportInput(){

    const input = document.getElementById("fxImportInput");

    if(!input)return;

    input.onchange = function(event){

        const file = event.target.files[0];

        if(!file)return;

        const key = fxSelectedUserPad || findEmptyUserFxPad();

        if(!key){
            alert("Semua 30 User FX sudah terisi.");
            return;
        }

        const url = URL.createObjectURL(file);

        const audio = new Audio(url);
        audio.preload = "auto";
        audio.volume = 0.95;

        audio.oncanplaythrough = function(){

            fxUserSamples[key] = audio;

            fxUserFiles[key] = {
                name: file.name,
                url: url,
                type: file.type,
                size: file.size
            };

            fxSelectedUserPad = null;

            renderFxUserPads();

            setFxStatus("🟢 User FX berhasil diimport: " + file.name, "success");

        };

        audio.onerror = function(){

            URL.revokeObjectURL(url);

            setFxStatus("🔴 Gagal import User FX", "error");

        };

        audio.load();

    };

}

/* ===== CARI PAD KOSONG USER FX ===== */
function findEmptyUserFxPad(){

    for(let i = 1; i <= FX_USER_COUNT; i++){

        const key = "user_fx_" + i;

        if(!fxUserSamples[key]){
            return key;
        }

    }

    return null;

}

/* ===== PLAY USER FX ===== */
function playUserFx(key){

    const sample = fxUserSamples[key];

    if(!sample){

        setFxStatus("🔴 Pad User FX masih kosong", "error");

        return;

    }

    const audio = sample.cloneNode(true);

    audio.volume = 0.95;

    audio.currentTime = 0;

    audio.play().catch(function(err){
        console.warn("Play User FX error:", err);
    });

    if(typeof fxRecordEnabled !== "undefined" && fxRecordEnabled){

        if(typeof fxRecords !== "undefined"){

            const info = fxUserFiles[key];

            fxRecords.push({
                type: "user",
                name: key,
                label: info ? info.name : key,
                time: Date.now()
            });

            if(typeof updateFxRecordList === "function"){
                updateFxRecordList();
            }

        }

    }

}

/* ===== HAPUS USER FX PAD ===== */
function deleteUserFx(key){

    if(!fxUserSamples[key]){
        alert("Pad ini masih kosong.");
        return;
    }

    const ok = confirm("Hapus User FX ini?");

    if(!ok)return;

    if(fxUserFiles[key] && fxUserFiles[key].url){
        URL.revokeObjectURL(fxUserFiles[key].url);
    }

    delete fxUserSamples[key];
    delete fxUserFiles[key];

    renderFxUserPads();

    setFxStatus("🟢 User FX dihapus", "success");

}

/* ===== HAPUS SEMUA USER FX ===== */
function clearAllUserFx(){

    const ok = confirm("Hapus semua User FX?");

    if(!ok)return;

    Object.keys(fxUserFiles).forEach(function(key){

        if(fxUserFiles[key].url){
            URL.revokeObjectURL(fxUserFiles[key].url);
        }

    });

    fxUserSamples = {};
    fxUserFiles = {};

    renderFxUserPads();

    setFxStatus("🟢 Semua User FX dihapus", "success");

}

/* ===== INFO USER FX ===== */
function getUserFxCount(){

    return Object.keys(fxUserSamples).length;

}

/* ===== UPDATE INFO FX OVERRIDE ===== */
function updateFxInfo(){

    const info = document.getElementById("fxInfo");

    if(!info)return;

    const defaultCount = Object.keys(fxDefaultSamples || {}).length;

    const userCount = Object.keys(fxUserSamples || {}).length;

    info.innerHTML =
        "Default FX: " + defaultCount + "/30 • User FX: " + userCount + "/30";

}

/* ===== INIT USER FX ===== */
window.addEventListener("load", function(){

    renderFxUserPads();

    setupFxImportInput();

});
/* =========================================
   FX.JS PRO - TAHAP 3
   Record System
   Record ON/OFF + Play Rekam + List Rekam
========================================= */

let fxRecordEnabled = false;
let fxRecords = [];
let fxRecordPlaybackTimer = null;
let fxSelectedRecordId = null;

/* ===== RECORD ON / OFF ===== */
function toggleFxRecord(){

    fxRecordEnabled = !fxRecordEnabled;

    const btn = document.getElementById("fxRecordBtn");

    if(btn){
        btn.innerHTML = fxRecordEnabled
        ? "⏺ Record ON"
        : "⏺ Record OFF";
    }

    if(fxRecordEnabled){
        setFxStatus("🟢 Record FX Aktif", "success");
    }else{
        setFxStatus("🔴 Record FX Mati", "error");
    }

}

/* ===== UPDATE LIST REKAM FX ===== */
function updateFxRecordList(){

    const box = document.getElementById("fxRecordList");

    if(!box)return;

    if(fxRecords.length === 0){

        box.innerHTML = "Belum ada rekaman FX.";

        return;

    }

    box.innerHTML = "";

    fxRecords.forEach(function(rec,index){

        const item = document.createElement("div");

        item.className = "record-item";

        item.innerHTML = `

<div style="flex:1">

<b>${rec.label || rec.name}</b><br>

<small>${rec.type === "user" ? "User FX" : "Default FX"} • Urutan ${index+1}</small>

</div>

<button onclick="playSingleFxRecord('${rec.id || index}')">
▶
</button>

<button onclick="renameFxRecord('${rec.id || index}')">
✏
</button>

<button onclick="deleteFxRecord('${rec.id || index}')">
🗑
</button>

`;

        box.appendChild(item);

    });

}

/* ===== NORMALISASI RECORD ID ===== */
function ensureFxRecordIds(){

    fxRecords.forEach(function(rec,index){

        if(!rec.id){
            rec.id = "fx_record_" + index + "_" + Date.now();
        }

    });

}

/* ===== PLAY SEMUA REKAMAN FX ===== */
function playFxRecord(){

    if(fxRecords.length === 0){
        alert("Belum ada rekaman FX.");
        return;
    }

    stopFxPlayback();

    let i = 0;

    fxRecordPlaybackTimer = setInterval(function(){

        if(i >= fxRecords.length){

            stopFxPlayback();
            return;

        }

        playFxRecordItem(fxRecords[i]);

        i++;

    },300);

    setFxStatus("🟢 Memutar Rekaman FX", "success");

}

/* ===== PLAY SATU ITEM ===== */
function playSingleFxRecord(id){

    ensureFxRecordIds();

    const rec = fxRecords.find(function(item,index){
        return item.id === id || String(index) === String(id);
    });

    if(!rec)return;

    playFxRecordItem(rec);

}

/* ===== PLAY ITEM RECORD ===== */
function playFxRecordItem(rec){

    if(rec.type === "user"){

        playUserFx(rec.name);

    }else{

        playDefaultFx(rec.name);

    }

}

/* ===== STOP PLAYBACK FX ===== */
function stopFxPlayback(){

    if(fxRecordPlaybackTimer){
        clearInterval(fxRecordPlaybackTimer);
        fxRecordPlaybackTimer = null;
    }

    setFxStatus("🟡 Playback FX Berhenti", "warning");

}

/* ===== HAPUS SEMUA REKAMAN ===== */
function clearFxRecord(){

    const ok = confirm("Hapus semua rekaman FX?");

    if(!ok)return;

    fxRecords = [];

    updateFxRecordList();

    setFxStatus("🟢 Rekaman FX dihapus", "success");

}

/* ===== HAPUS SATU RECORD ===== */
function deleteFxRecord(id){

    ensureFxRecordIds();

    fxRecords = fxRecords.filter(function(item,index){
        return item.id !== id && String(index) !== String(id);
    });

    updateFxRecordList();

}

/* ===== RENAME RECORD ===== */
function renameFxRecord(id){

    ensureFxRecordIds();

    const rec = fxRecords.find(function(item,index){
        return item.id === id || String(index) === String(id);
    });

    if(!rec)return;

    const name = prompt("Nama rekaman FX", rec.label || rec.name);

    if(!name)return;

    rec.label = name;

    updateFxRecordList();

}

/* ===== INIT RECORD LIST ===== */
window.addEventListener("load", function(){

    updateFxRecordList();

});
/* =========================================
   FX.JS PRO - TAHAP 4
   FX Effects ON/OFF
   Reverb / Delay / Pitch / Reverse
========================================= */

let fxReverbEnabled = false;
let fxDelayEnabled = false;
let fxPitchEnabled = false;
let fxReverseEnabled = false;

/* ===== TOGGLE REVERB ===== */
function toggleFxReverb(){

    fxReverbEnabled = !fxReverbEnabled;

    const btn = document.getElementById("fxReverbBtn");

    if(btn){
        btn.innerHTML = fxReverbEnabled
        ? "🌀 Reverb ON"
        : "🌀 Reverb OFF";
    }

    setFxStatus(
        fxReverbEnabled ? "🟢 Reverb FX Aktif" : "🔴 Reverb FX Mati",
        fxReverbEnabled ? "success" : "error"
    );

}

/* ===== TOGGLE DELAY ===== */
function toggleFxDelay(){

    fxDelayEnabled = !fxDelayEnabled;

    const btn = document.getElementById("fxDelayBtn");

    if(btn){
        btn.innerHTML = fxDelayEnabled
        ? "⏱ Delay ON"
        : "⏱ Delay OFF";
    }

    setFxStatus(
        fxDelayEnabled ? "🟢 Delay FX Aktif" : "🔴 Delay FX Mati",
        fxDelayEnabled ? "success" : "error"
    );

}

/* ===== TOGGLE PITCH ===== */
function toggleFxPitch(){

    fxPitchEnabled = !fxPitchEnabled;

    const btn = document.getElementById("fxPitchBtn");

    if(btn){
        btn.innerHTML = fxPitchEnabled
        ? "🎵 Pitch ON"
        : "🎵 Pitch OFF";
    }

    setFxStatus(
        fxPitchEnabled ? "🟢 Pitch FX Aktif" : "🔴 Pitch FX Mati",
        fxPitchEnabled ? "success" : "error"
    );

}

/* ===== TOGGLE REVERSE ===== */
function toggleFxReverse(){

    fxReverseEnabled = !fxReverseEnabled;

    const btn = document.getElementById("fxReverseBtn");

    if(btn){
        btn.innerHTML = fxReverseEnabled
        ? "🔄 Reverse ON"
        : "🔄 Reverse OFF";
    }

    setFxStatus(
        fxReverseEnabled ? "🟢 Reverse FX Aktif" : "🔴 Reverse FX Mati",
        fxReverseEnabled ? "success" : "error"
    );

}

/* ===== APPLY FX TO AUDIO ELEMENT ===== */
function applyFxToAudio(audio){

    if(!audio)return audio;

    if(fxPitchEnabled){
        audio.playbackRate = 1.15;
    }else{
        audio.playbackRate = 1;
    }

    if(fxReverseEnabled){
        console.warn("Reverse FX membutuhkan proses buffer audio. Untuk V4.5 masih mode placeholder.");
    }

    if(fxReverbEnabled){
        console.warn("Reverb FX aktif - placeholder ringan V4.5.");
    }

    if(fxDelayEnabled){
        console.warn("Delay FX aktif - placeholder ringan V4.5.");
    }

    return audio;

}

/* ===== OVERRIDE PLAY DEFAULT FX DENGAN EFFECT ===== */
const oldPlayDefaultFxV45 = playDefaultFx;

playDefaultFx = function(name){

    const sample = fxDefaultSamples[name];

    if(!sample){
        console.warn("FX belum dimuat:", name);
        setFxStatus("🔴 " + name + " belum dimuat", "error");
        return;
    }

    let audio = sample.cloneNode(true);

    audio.volume = 0.95;
    audio.currentTime = 0;

    audio = applyFxToAudio(audio);

    audio.play().catch(function(err){
        console.warn("Play FX error:", err);
    });

    if(typeof fxRecordEnabled !== "undefined" && fxRecordEnabled){

        if(typeof fxRecords !== "undefined"){

            fxRecords.push({
                id: "fx_record_" + Date.now(),
                type: "default",
                name: name,
                label: name.toUpperCase(),
                time: Date.now(),
                effects: {
                    reverb: fxReverbEnabled,
                    delay: fxDelayEnabled,
                    pitch: fxPitchEnabled,
                    reverse: fxReverseEnabled
                }
            });

            if(typeof updateFxRecordList === "function"){
                updateFxRecordList();
            }

        }

    }

};

/* ===== OVERRIDE PLAY USER FX DENGAN EFFECT ===== */
const oldPlayUserFxV45 = playUserFx;

playUserFx = function(key){

    const sample = fxUserSamples[key];

    if(!sample){

        setFxStatus("🔴 Pad User FX masih kosong", "error");

        return;

    }

    let audio = sample.cloneNode(true);

    audio.volume = 0.95;

    audio.currentTime = 0;

    audio = applyFxToAudio(audio);

    audio.play().catch(function(err){
        console.warn("Play User FX error:", err);
    });

    if(typeof fxRecordEnabled !== "undefined" && fxRecordEnabled){

        if(typeof fxRecords !== "undefined"){

            const info = fxUserFiles[key];

            fxRecords.push({
                id: "fx_record_" + Date.now(),
                type: "user",
                name: key,
                label: info ? info.name : key,
                time: Date.now(),
                effects: {
                    reverb: fxReverbEnabled,
                    delay: fxDelayEnabled,
                    pitch: fxPitchEnabled,
                    reverse: fxReverseEnabled
                }
            });

            if(typeof updateFxRecordList === "function"){
                updateFxRecordList();
            }

        }

    }

};

/* ===== INIT EFFECT BUTTONS ===== */
window.addEventListener("load", function(){

    const reverbBtn = document.getElementById("fxReverbBtn");
    const delayBtn = document.getElementById("fxDelayBtn");
    const pitchBtn = document.getElementById("fxPitchBtn");
    const reverseBtn = document.getElementById("fxReverseBtn");

    if(reverbBtn) reverbBtn.innerHTML = "🌀 Reverb OFF";
    if(delayBtn) delayBtn.innerHTML = "⏱ Delay OFF";
    if(pitchBtn) pitchBtn.innerHTML = "🎵 Pitch OFF";
    if(reverseBtn) reverseBtn.innerHTML = "🔄 Reverse OFF";

});
/* =========================================
   FX.JS PRO - TAHAP 5
   Timeline Integration + Final Check
========================================= */

/* ===== TAMBAH REKAMAN FX KE TIMELINE ===== */
function addFxToTimeline(){

    if(!fxRecords || fxRecords.length === 0){
        alert("Belum ada rekaman FX.");
        return;
    }

    fxRecords.forEach(function(rec,index){

        if(typeof legacyRecordedEvents !== "undefined"){

            legacyRecordedEvents.push({
                id: "fx_" + Date.now() + "_" + index,
                bank: "FX",
                note: rec.label || rec.name,
                type: rec.type,
                step: index,
                time: Date.now(),
                effects: rec.effects || {
                    reverb:false,
                    delay:false,
                    pitch:false,
                    reverse:false
                }
            });

        }

    });

    if(typeof renderTimeline === "function"){
        renderTimeline();
    }

    if(typeof updateRecordList === "function"){
        updateRecordList();
    }

    setFxStatus("🟢 Rekaman FX masuk ke Timeline", "success");

    alert("FX berhasil ditambahkan ke Timeline.");

}

/* ===== TAMBAH SATU ITEM FX KE TIMELINE ===== */
function addSingleFxToTimeline(id){

    ensureFxRecordIds();

    const rec = fxRecords.find(function(item,index){
        return item.id === id || String(index) === String(id);
    });

    if(!rec){
        alert("Rekaman FX tidak ditemukan.");
        return;
    }

    if(typeof legacyRecordedEvents !== "undefined"){

        legacyRecordedEvents.push({
            id: "fx_single_" + Date.now(),
            bank: "FX",
            note: rec.label || rec.name,
            type: rec.type,
            step: legacyRecordedEvents.length || 0,
            time: Date.now(),
            effects: rec.effects || {
                reverb:false,
                delay:false,
                pitch:false,
                reverse:false
            }
        });

    }

    if(typeof renderTimeline === "function"){
        renderTimeline();
    }

    if(typeof updateRecordList === "function"){
        updateRecordList();
    }

    setFxStatus("🟢 1 FX masuk ke Timeline", "success");

}

/* ===== UPDATE LIST FINAL DENGAN TOMBOL TIMELINE ===== */
function updateFxRecordList(){

    const box = document.getElementById("fxRecordList");

    if(!box)return;

    if(!fxRecords || fxRecords.length === 0){

        box.innerHTML = "Belum ada rekaman FX.";

        return;

    }

    ensureFxRecordIds();

    box.innerHTML = "";

    fxRecords.forEach(function(rec,index){

        const effectText =
            "Reverb:" + (rec.effects && rec.effects.reverb ? "ON" : "OFF") +
            " • Delay:" + (rec.effects && rec.effects.delay ? "ON" : "OFF") +
            " • Pitch:" + (rec.effects && rec.effects.pitch ? "ON" : "OFF") +
            " • Reverse:" + (rec.effects && rec.effects.reverse ? "ON" : "OFF");

        const item = document.createElement("div");

        item.className = "record-item";

        item.innerHTML = `

<div style="flex:1">

<b>${rec.label || rec.name}</b><br>

<small>${rec.type === "user" ? "User FX" : "Default FX"} • Urutan ${index+1}</small><br>

<small>${effectText}</small>

</div>

<button onclick="playSingleFxRecord('${rec.id}')">
▶
</button>

<button onclick="renameFxRecord('${rec.id}')">
✏
</button>

<button onclick="addSingleFxToTimeline('${rec.id}')">
➕
</button>

<button onclick="deleteFxRecord('${rec.id}')">
🗑
</button>

`;

        box.appendChild(item);

    });

}

/* ===== FX FINAL CHECK ===== */
function fxFinalCheck(){

    let report = [];

    const hasStatus = !!document.getElementById("fxStatus");
    const hasDefaultGrid = !!document.getElementById("fxDefaultGrid");
    const hasUserGrid = !!document.getElementById("fxUserGrid");
    const hasRecordList = !!document.getElementById("fxRecordList");
    const hasImportInput = !!document.getElementById("fxImportInput");

    report.push(hasStatus ? "✅ fxStatus OK" : "❌ fxStatus hilang");
    report.push(hasDefaultGrid ? "✅ fxDefaultGrid OK" : "❌ fxDefaultGrid hilang");
    report.push(hasUserGrid ? "✅ fxUserGrid OK" : "❌ fxUserGrid hilang");
    report.push(hasRecordList ? "✅ fxRecordList OK" : "❌ fxRecordList hilang");
    report.push(hasImportInput ? "✅ fxImportInput OK" : "❌ fxImportInput hilang");

    report.push(typeof loadFxAssets === "function" ? "✅ loadFxAssets OK" : "❌ loadFxAssets hilang");
    report.push(typeof toggleFxRecord === "function" ? "✅ toggleFxRecord OK" : "❌ toggleFxRecord hilang");
    report.push(typeof playFxRecord === "function" ? "✅ playFxRecord OK" : "❌ playFxRecord hilang");
    report.push(typeof addFxToTimeline === "function" ? "✅ addFxToTimeline OK" : "❌ addFxToTimeline hilang");

    console.log("FX FINAL CHECK");
    console.log(report.join("\\n"));

    alert(report.join("\\n"));

}

/* ===== INIT FINAL ===== */
window.addEventListener("load", function(){

    updateFxRecordList();

    console.log("FX Panel V4.5 siap.");

});
