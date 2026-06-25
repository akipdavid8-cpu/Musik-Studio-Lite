/* ===== V4.5 Tahap 8F-8B: Electric Guitar Recovery ===== */

let guitarRecordEnabled = false;
let guitarRecords = [];
let guitarCurrentBank = 0;

const guitarBaseNotes = [
  "C4","D4","E4","F4",
  "G4","A4","B4","C5",
  "D5","E5","F5","G5",
  "A5","B5","C6","D6"
];

const guitarPadNotes = [
  "C4","C#4","D4","D#4","E4","F4","F#4","G4","G#4","A4","A#4","B4",
  "C5","C#5","D5","D#5","E5","F5","F#5","G5","G#5","A5","A#5","B5",
  "C6","C#6","D6","D#6","E6","F6","F#6","G6","G#6","A6","A#6","B6",
  "C7","C#7","D7","D#7","E7","F7"
];

function guitarNoteToMidi(note){
  const names = {"C":0,"C#":1,"D":2,"D#":3,"E":4,"F":5,"F#":6,"G":7,"G#":8,"A":9,"A#":10,"B":11};
  const m = note.match(/^([A-G]#?)(\d)$/);
  if(!m) return 60;
  return (Number(m[2]) + 1) * 12 + names[m[1]];
}

function guitarFindBaseNote(targetNote){
  const target = guitarNoteToMidi(targetNote);
  let best = guitarBaseNotes[0];

  for(const base of guitarBaseNotes){
    if(guitarNoteToMidi(base) <= target){
      best = base;
    }
  }

  return best;
}

function guitarPlaybackRate(targetNote){
  const target = guitarNoteToMidi(targetNote);
  const base = guitarNoteToMidi(guitarFindBaseNote(targetNote));
  const diff = Math.max(0, target - base);
  return Math.pow(2, diff / 12);
}

function loadGuitarAssets(){
  const status = document.getElementById("guitarStatus");
  if(status){
    status.innerHTML = "🟢 Electric Guitar Asset 16/16 Loaded | Pitch Up Only";
    status.className = "asset-status success";
  }
  renderGuitarPads();
}

function renderGuitarPads(){
  const grid = document.getElementById("guitarPadGrid");
  if(!grid) return;

  grid.innerHTML = guitarPadNotes.map(note => {
    return `<button class="pad guitar-pad" onclick="playGuitar('${note}')">${note}</button>`;
  }).join("");
}

function toggleGuitarRecord(){
  guitarRecordEnabled = !guitarRecordEnabled;

  const btn = document.getElementById("guitarRecordBtn");
  if(btn){
    btn.innerHTML = guitarRecordEnabled ? "⏺ Record ON" : "⏺ Record OFF";
  }
}

function playGuitar(note, rec = true){
  const rate = guitarPlaybackRate(note);

  // Untuk sementara masih pakai tone synth agar tidak error.
  // Nanti saat asset WAV sudah siap, rate ini dipakai untuk playbackRate.
  tone(note, piano, "sawtooth", "Electric Guitar", false, .6);

  if(guitarRecordEnabled && rec){
    guitarRecords.push({
      note,
      rate,
      time: Date.now()
    });
    updateGuitarRecordList();
  }
}

function updateGuitarRecordList(){
  const box = document.getElementById("guitarRecordList");
  if(!box) return;

  if(guitarRecords.length === 0){
    box.innerHTML = "Belum ada rekaman.";
    return;
  }

  box.innerHTML = guitarRecords.map((r, i) => {
    return `${i + 1}. ${r.note} | rate ${r.rate.toFixed(2)}x`;
  }).join("<br>");
}

function clearGuitarRecord(){
  guitarRecords = [];
  updateGuitarRecordList();
}

function playGuitarRecord(){
  if(guitarRecords.length === 0){
    alert("Belum ada rekaman Electric Guitar.");
    return;
  }

  let i = 0;
  const timer = setInterval(() => {
    if(i >= guitarRecords.length){
      clearInterval(timer);
      return;
    }

    playGuitar(guitarRecords[i].note, false);
    i++;
  }, 320);
}

function addGuitarToTimeline(){
  if(guitarRecords.length === 0){
    alert("Belum ada rekaman Electric Guitar.");
    return;
  }

  guitarRecords.forEach((r, i) => {
    if(typeof legacyRecordedEvents !== "undefined"){
      legacyRecordedEvents.push({
        id: "eguitar_" + Date.now() + "_" + i,
        bank: "Guitar",
        note: r.note,
        step: i,
        time: Date.now()
      });
    }
  });

  if(typeof renderTimeline === "function") renderTimeline();
  if(typeof updateRecordList === "function") updateRecordList();

  alert("Electric Guitar masuk ke Timeline.");
}

document.addEventListener("DOMContentLoaded", function(){
  renderGuitarPads();
  updateGuitarRecordList();
});
