/* ===== V4.5 Tahap 8F-8C: Bass Recovery ===== */

let bassRecordEnabled = false;
let bassHoldEnabled = false;
let bassRecords = [];
let activeBassOsc = null;
let activeBassGain = null;

const bassBaseNotes = [
  "C2","D2","E2","F2","G2","A2",
  "B2","C3","D3","E3","F3","G3"
];

const bassPadNotes = [
  "C2","C#2","D2","D#2","E2","F2","F#2","G2",
  "G#2","A2","A#2","B2",
  "C3","C#3","D3","D#3","E3","F3","F#3","G3",
  "G#3","A3","A#3","B3",
  "C4","C#4","D4","D#4","E4","F4","F#4","G4"
];

const bassFreq = {
  C2:65.41, "C#2":69.30, D2:73.42, "D#2":77.78, E2:82.41, F2:87.31,
  "F#2":92.50, G2:98.00, "G#2":103.83, A2:110.00, "A#2":116.54, B2:123.47,
  C3:130.81, "C#3":138.59, D3:146.83, "D#3":155.56, E3:164.81, F3:174.61,
  "F#3":185.00, G3:196.00, "G#3":207.65, A3:220.00, "A#3":233.08, B3:246.94,
  C4:261.63, "C#4":277.18, D4:293.66, "D#4":311.13, E4:329.63, F4:349.23,
  "F#4":369.99, G4:392.00
};

function loadBassAssets(){
  const status = document.getElementById("bassStatus");
  if(status){
    status.innerHTML = "🟢 Bass Asset 12/12 Loaded | Pitch Up Only";
    status.className = "asset-status success";
  }
  renderBassPads();
}

function renderBassPads(){
  const grid = document.getElementById("bassPadGrid");
  if(!grid) return;

  grid.innerHTML = bassPadNotes.map(note => {
    return `<button class="pad bass-pad"
      onmousedown="startBassHold('${note}')"
      onmouseup="stopBassHold()"
      onmouseleave="stopBassHold()"
      ontouchstart="startBassHold('${note}')"
      ontouchend="stopBassHold()"
      onclick="playBass('${note}')">${note}</button>`;
  }).join("");
}

function toggleBassRecord(){
  bassRecordEnabled = !bassRecordEnabled;
  const btn = document.getElementById("bassRecordBtn");
  if(btn) btn.innerHTML = bassRecordEnabled ? "⏺ Record ON" : "⏺ Record OFF";
}

function toggleBassHold(){
  bassHoldEnabled = !bassHoldEnabled;
  const btn = document.getElementById("bassHoldBtn");
  if(btn) btn.innerHTML = bassHoldEnabled ? "🖐 Hold ON" : "🖐 Hold OFF";
}

function playBass(note, rec = true){
  if(bassHoldEnabled) return;

  tone(note, bassFreq, "square", "Bass", false, .55);

  if(bassRecordEnabled && rec){
    bassRecords.push({ note, time: Date.now() });
    updateBassRecordList();
  }
}

function startBassHold(note){
  if(!bassHoldEnabled) return;

  const ctx = getAudioContext();
  stopBassHold();

  activeBassOsc = ctx.createOscillator();
  activeBassGain = ctx.createGain();

  activeBassOsc.type = "square";
  activeBassOsc.frequency.value = bassFreq[note] || 110;
  activeBassGain.gain.value = 0.45;

  activeBassOsc.connect(activeBassGain).connect(getMasterOutput());
  activeBassOsc.start();

  if(bassRecordEnabled){
    bassRecords.push({ note: note + " HOLD", time: Date.now() });
    updateBassRecordList();
  }
}

function stopBassHold(){
  try{
    if(activeBassGain){
      activeBassGain.gain.setTargetAtTime(0.001, getAudioContext().currentTime, 0.04);
    }
    if(activeBassOsc){
      activeBassOsc.stop(getAudioContext().currentTime + 0.08);
    }
  }catch(e){}

  activeBassOsc = null;
  activeBassGain = null;
}

function updateBassRecordList(){
  const box = document.getElementById("bassRecordList");
  if(!box) return;

  if(bassRecords.length === 0){
    box.innerHTML = "Belum ada rekaman bass.";
    return;
  }

  box.innerHTML = bassRecords.map((r, i) => {
    return `${i + 1}. ${r.note}`;
  }).join("<br>");
}

function clearBassRecord(){
  bassRecords = [];
  updateBassRecordList();
}

function playBassRecord(){
  if(bassRecords.length === 0){
    alert("Belum ada rekaman Bass.");
    return;
  }

  let i = 0;
  const timer = setInterval(() => {
    if(i >= bassRecords.length){
      clearInterval(timer);
      return;
    }

    const note = bassRecords[i].note.replace(" HOLD", "");
    playBass(note, false);
    i++;
  }, 350);
}

function addBassToTimeline(){
  if(bassRecords.length === 0){
    alert("Belum ada rekaman Bass.");
    return;
  }

  bassRecords.forEach((r, i) => {
    if(typeof legacyRecordedEvents !== "undefined"){
      legacyRecordedEvents.push({
        id: "bass_" + Date.now() + "_" + i,
        bank: "Bass",
        note: r.note,
        step: i,
        time: Date.now()
      });
    }
  });

  if(typeof renderTimeline === "function") renderTimeline();
  if(typeof updateRecordList === "function") updateRecordList();

  alert("Bass masuk ke Timeline.");
}

document.addEventListener("DOMContentLoaded", function(){
  renderBassPads();
  updateBassRecordList();
});
