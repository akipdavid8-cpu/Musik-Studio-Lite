/* =========================================
   MIDI.JS PRO - TAHAP 1
   Base Engine
========================================= */

let midiBpm = 120;
let midiMarker = "Verse";
let midiList = [];
let midiPlayTimer = null;
let midiIsPlaying = false;

function setMidiStatus(text, type = "success") {
  const status = document.getElementById("midiStatus");
  if (!status) return;

  status.innerHTML = text;
  status.className = "";

  if (type === "success") status.classList.add("success");
  else if (type === "loading") status.classList.add("loading");
  else if (type === "warning") status.classList.add("warning");
  else status.classList.add("error");
}

function updateMidiInfo() {
  const bpmText = document.getElementById("midiBpmText");
  const markerText = document.getElementById("midiMarkerText");
  const info = document.getElementById("midiInfo");

  if (bpmText) bpmText.innerHTML = midiBpm;
  if (markerText) markerText.innerHTML = "Marker: " + midiMarker;
  if (info) {
    info.innerHTML =
      "🎹 Menggunakan Asset Piano • BPM: " +
      midiBpm +
      " • Marker: " +
      midiMarker;
  }
}

function changeMidiBpm(amount) {
  midiBpm += amount;

  if (midiBpm < 40) midiBpm = 40;
  if (midiBpm > 300) midiBpm = 300;

  updateMidiInfo();
}

function setMidiMarker(marker) {
  midiMarker = marker;
  updateMidiInfo();
  setMidiStatus("🟢 Marker dipilih: " + marker, "success");
}

function clearMidiInput() {
  const input = document.getElementById("midiTextInput");
  if (input) input.value = "";
  setMidiStatus("🟡 Input MIDI dibersihkan", "warning");
}

window.addEventListener("load", function () {
  updateMidiInfo();
  setMidiStatus("🟢 Siap membuat MIDI dari teks.", "success");
});

/* =========================================
   MIDI.JS PRO - TAHAP 2 REVISI
   Text Note / Chord Parser
   Cocok untuk 16 Asset Piano C4-D6
   Pitch Up Only
========================================= */

/* Asset piano dasar yang Anda punya */
const midiPianoBaseNotes = [
  "C4","D4","E4","F4","G4","A4","B4",
  "C5","D5","E5","F5","G5","A5","B5",
  "C6","D6"
];

/* Chord dasar */
const midiChordMap = {
  C:  ["C4", "E4", "G4"],
  D:  ["D4", "F#4", "A4"],
  E:  ["E4", "G#4", "B4"],
  F:  ["F4", "A4", "C5"],
  G:  ["G4", "B4", "D5"],
  A:  ["A4", "C#5", "E5"],
  B:  ["B4", "D#5", "F#5"],

  Cm: ["C4", "D#4", "G4"],
  Dm: ["D4", "F4", "A4"],
  Em: ["E4", "G4", "B4"],
  Fm: ["F4", "G#4", "C5"],
  Gm: ["G4", "A#4", "D5"],
  Am: ["A4", "C5", "E5"],
  Bm: ["B4", "D5", "F#5"],

  Bdim: ["B4", "D5", "F5"]
};

/* Urutan semitone */
const midiNoteIndex = {
  C:0, "C#":1,
  D:2, "D#":3,
  E:4,
  F:5, "F#":6,
  G:7, "G#":8,
  A:9, "A#":10,
  B:11
};

/* Ubah note ke angka MIDI */
function midiNoteToNumber(note){

  const match = note.match(/^([A-G]#?)(\d)$/);

  if(!match){
    return 60; // C4 default
  }

  const name = match[1];
  const octave = Number(match[2]);

  return (octave + 1) * 12 + midiNoteIndex[name];

}

/* Normalize note user:
   C  -> C4
   C# -> C#4
   A  -> A4
   C5 -> C5
*/
function normalizeMidiNote(note){

  note = note.trim();

  if(/\d$/.test(note)){
    return note;
  }

  return note + "4";

}

/* Cari asset dasar terdekat DI BAWAH target.
   Tidak boleh pitch turun.
*/
function findMidiPianoBaseNote(targetNote){

  const targetNumber = midiNoteToNumber(targetNote);

  let bestBase = midiPianoBaseNotes[0];

  midiPianoBaseNotes.forEach(function(baseNote){

    const baseNumber = midiNoteToNumber(baseNote);

    if(baseNumber <= targetNumber){
      bestBase = baseNote;
    }

  });

  return bestBase;

}

/* Hitung playbackRate pitch naik */
function getMidiPlaybackRate(targetNote){

  const targetNumber = midiNoteToNumber(targetNote);

  const baseNote = findMidiPianoBaseNote(targetNote);

  const baseNumber = midiNoteToNumber(baseNote);

  const semitoneDiff = Math.max(0, targetNumber - baseNumber);

  return Math.pow(2, semitoneDiff / 12);

}

/* Parse satu token:
   C  = note
   C# = note sharp
   Am = chord
*/
function parseMidiToken(token){

  token = token.trim();

  if(midiChordMap[token]){

    return {
      type: "chord",
      label: token,
      notes: midiChordMap[token].map(function(note){

        const normalized = normalizeMidiNote(note);

        return {
          note: normalized,
          base: findMidiPianoBaseNote(normalized),
          rate: getMidiPlaybackRate(normalized)
        };

      })
    };

  }

  const normalized = normalizeMidiNote(token);

  return {
    type: "note",
    label: token,
    notes: [{
      note: normalized,
      base: findMidiPianoBaseNote(normalized),
      rate: getMidiPlaybackRate(normalized)
    }]
  };

}

/* Buat MIDI dari teks */
function createMidiFromText(){

  const input = document.getElementById("midiTextInput");

  if(!input || !input.value.trim()){
    setMidiStatus("🔴 Input masih kosong.", "error");
    return;
  }

  const rawText = input.value.trim();

  const tokens = rawText.split(/\s+/);

  const parsed = tokens.map(function(token){
    return parseMidiToken(token);
  });

  const midiItem = {
    id: "midi_" + Date.now(),
    text: rawText,
    parsed: parsed,
    bpm: midiBpm,
    marker: midiMarker,
    createdAt: Date.now()
  };

  midiList.push(midiItem);

  if(typeof updateMidiList === "function"){
    updateMidiList();
  }

  setMidiStatus("🟢 MIDI berhasil dibuat dari teks.", "success");

}

/* =========================================
   MIDI.JS PRO - TAHAP 3
   List MIDI + Edit + Duplicate + Hapus
========================================= */

/* ===== UPDATE LIST MIDI ===== */
function updateMidiList(){

  const box = document.getElementById("midiList");

  if(!box)return;

  if(midiList.length === 0){

    box.innerHTML = "Belum ada MIDI.";

    return;

  }

  box.innerHTML = "";

  midiList.forEach(function(item,index){

    const row = document.createElement("div");

    row.className = "record-item midi-record-item";

    row.innerHTML = `

<div style="flex:1">

<b>${index + 1}. ${item.text}</b><br>

<small>BPM: ${item.bpm} • Marker: ${item.marker}</small>

</div>

<button onclick="playSingleMidi('${item.id}')">
▶
</button>

<button onclick="editMidiItem('${item.id}')">
✏
</button>

<button onclick="duplicateMidiItem('${item.id}')">
📄
</button>

<button onclick="deleteMidiItem('${item.id}')">
🗑
</button>

`;

    box.appendChild(row);

  });

}

/* ===== EDIT MIDI ITEM ===== */
function editMidiItem(id){

  const item = midiList.find(function(m){
    return m.id === id;
  });

  if(!item)return;

  const newText = prompt("Edit Nada / Chord", item.text);

  if(!newText || !newText.trim())return;

  const tokens = newText.trim().split(/\s+/);

  item.text = newText.trim();

  item.parsed = tokens.map(function(token){
    return parseMidiToken(token);
  });

  item.bpm = midiBpm;
  item.marker = midiMarker;

  updateMidiList();

  setMidiStatus("🟢 MIDI berhasil diedit.", "success");

}

/* ===== DUPLICATE MIDI ITEM ===== */
function duplicateMidiItem(id){

  const item = midiList.find(function(m){
    return m.id === id;
  });

  if(!item)return;

  const copy = {
    id: "midi_" + Date.now(),
    text: item.text,
    parsed: JSON.parse(JSON.stringify(item.parsed)),
    bpm: item.bpm,
    marker: item.marker,
    createdAt: Date.now()
  };

  midiList.push(copy);

  updateMidiList();

  setMidiStatus("🟢 MIDI berhasil diduplicate.", "success");

}

/* ===== DELETE MIDI ITEM ===== */
function deleteMidiItem(id){

  const ok = confirm("Hapus MIDI ini?");

  if(!ok)return;

  midiList = midiList.filter(function(m){
    return m.id !== id;
  });

  updateMidiList();

  setMidiStatus("🟢 MIDI berhasil dihapus.", "success");

}

/* ===== CLEAR ALL MIDI ===== */
function clearMidiList(){

  const ok = confirm("Hapus semua MIDI?");

  if(!ok)return;

  midiList = [];

  updateMidiList();

  setMidiStatus("🔴 Semua MIDI dihapus.", "error");

}

/* ===== INIT LIST ===== */
window.addEventListener("load", function(){

  updateMidiList();

});

/* =========================================
   MIDI.JS PRO - TAHAP 4
   Piano Asset Playback
========================================= */

let midiPlayIndex = 0;
let midiPlayTimeout = null;

/* ===== PLAY SATU MIDI ===== */
function playSingleMidi(id){

    stopMidiPlay();

    const item = midiList.find(function(m){
        return m.id === id;
    });

    if(!item)return;

    midiPlayParsed(item.parsed,item.bpm);

}

/* ===== PLAY SEMUA MIDI ===== */
function playMidiList(){

    stopMidiPlay();

    if(midiList.length===0){

        alert("Belum ada MIDI.");

        return;

    }

    midiPlayIndex = 0;

    playNextMidi();

}

/* ===== PLAY BERURUTAN ===== */
function playNextMidi(){

    if(midiPlayIndex>=midiList.length){

        stopMidiPlay();

        return;

    }

    const item = midiList[midiPlayIndex];

    midiPlayParsed(item.parsed,item.bpm);

    const delay = 60000/item.bpm;

    midiPlayTimeout = setTimeout(function(){

        midiPlayIndex++;

        playNextMidi();

    },delay*4);

}

/* ===== PLAY PARSED ===== */
function midiPlayParsed(parsed,bpm){

    const beat = 60000/bpm;

    parsed.forEach(function(token,index){

        setTimeout(function(){

            if(token.type==="note"){

                playMidiNotes(token.notes);

            }else{

                playMidiNotes(token.notes);

            }

        },index*beat);

    });

}

/* ===== PLAY NOTE / CHORD ===== */
function playMidiNotes(list){

    list.forEach(function(item){

        playMidiAsset(
            item.base,
            item.rate
        );

    });

}

/* ===== PLAY ASSET ===== */
function playMidiAsset(baseNote,rate){

    if(typeof pianoSamples==="undefined"){

        console.warn("pianoSamples belum tersedia.");

        return;

    }

    const sample = pianoSamples[baseNote];

    if(!sample){

        console.warn("Asset piano tidak ditemukan:",baseNote);

        return;

    }

    const audio = sample.cloneNode(true);

    audio.currentTime = 0;

    audio.playbackRate = rate;

    audio.volume = 0.95;

    audio.play().catch(function(e){

        console.warn(e);

    });

}

/* ===== STOP ===== */
function stopMidiPlay(){

    if(midiPlayTimeout){

        clearTimeout(midiPlayTimeout);

        midiPlayTimeout = null;

    }

    midiPlayIndex = 0;

    setMidiStatus(
        "🟡 Playback MIDI dihentikan.",
        "warning"
    );

}


/* =========================================
   MIDI.JS PRO - TAHAP 5
   Timeline Integration
========================================= */

/* ===== TAMBAH SEMUA MIDI KE TIMELINE ===== */
function addMidiToTimeline(){

    if(!midiList || midiList.length === 0){

        alert("Belum ada MIDI.");

        return;

    }

    midiList.forEach(function(item,index){

        addSingleMidiToTimeline(item.id,index);

    });

    setMidiStatus("🟢 Semua MIDI masuk ke Timeline.", "success");

    alert("MIDI berhasil ditambahkan ke Timeline.");

}

/* ===== TAMBAH SATU MIDI KE TIMELINE ===== */
function addSingleMidiToTimeline(id,index=0){

    const item = midiList.find(function(m){
        return m.id === id;
    });

    if(!item)return;

    if(typeof legacyRecordedEvents !== "undefined"){

        legacyRecordedEvents.push({
            id: "midi_" + Date.now() + "_" + index,
            bank: "MIDI",
            note: item.text,
            type: "midi_text",
            marker: item.marker,
            bpm: item.bpm,
            parsed: item.parsed,
            step: legacyRecordedEvents.length || index,
            time: Date.now()
        });

    }

    if(typeof renderTimeline === "function"){
        renderTimeline();
    }

    if(typeof updateRecordList === "function"){
        updateRecordList();
    }

}

/* ===== UPDATE LIST FINAL DENGAN TOMBOL TIMELINE ===== */
function updateMidiList(){

    const box = document.getElementById("midiList");

    if(!box)return;

    if(midiList.length === 0){

        box.innerHTML = "Belum ada MIDI.";

        return;

    }

    box.innerHTML = "";

    midiList.forEach(function(item,index){

        const row = document.createElement("div");

        row.className = "record-item midi-record-item";

        row.innerHTML = `

<div style="flex:1">

<b>${index + 1}. ${item.text}</b><br>

<small>BPM: ${item.bpm} • Marker: ${item.marker}</small>

</div>

<button onclick="playSingleMidi('${item.id}')">
▶
</button>

<button onclick="editMidiItem('${item.id}')">
✏
</button>

<button onclick="duplicateMidiItem('${item.id}')">
📄
</button>

<button onclick="addSingleMidiToTimeline('${item.id}',${index})">
➕
</button>

<button onclick="deleteMidiItem('${item.id}')">
🗑
</button>

`;

        box.appendChild(row);

    });

}

/* ===== FINAL CHECK MIDI ===== */
function midiFinalCheck(){

    let report = [];

    report.push(document.getElementById("midiTextInput") ? "✅ midiTextInput OK" : "❌ midiTextInput hilang");
    report.push(document.getElementById("midiStatus") ? "✅ midiStatus OK" : "❌ midiStatus hilang");
    report.push(document.getElementById("midiBpmText") ? "✅ midiBpmText OK" : "❌ midiBpmText hilang");
    report.push(document.getElementById("midiMarkerText") ? "✅ midiMarkerText OK" : "❌ midiMarkerText hilang");
    report.push(document.getElementById("midiList") ? "✅ midiList OK" : "❌ midiList hilang");

    report.push(typeof createMidiFromText === "function" ? "✅ createMidiFromText OK" : "❌ createMidiFromText hilang");
    report.push(typeof playMidiList === "function" ? "✅ playMidiList OK" : "❌ playMidiList hilang");
    report.push(typeof addMidiToTimeline === "function" ? "✅ addMidiToTimeline OK" : "❌ addMidiToTimeline hilang");

    console.log("MIDI FINAL CHECK");
    console.log(report.join("\\n"));

    alert(report.join("\\n"));

}

/* ===== INIT FINAL ===== */
window.addEventListener("load", function(){

    updateMidiList();

    console.log("MIDI Panel V4.5 siap.");

});
