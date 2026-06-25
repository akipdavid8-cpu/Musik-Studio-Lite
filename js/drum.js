/* ===== V4.5 Tahap 8F-8D: Drum Recovery Complete With Asset ===== */
/* Folder asset wajib: assets/drum/ */

let drumRecordEnabled = false;
let drumRecords = [];
let drumSamples = {};
let drumAssetLoaded = false;
let drumLastPad = "";

const DRUM_FILES = {
  kick: "assets/drum/kick.wav",
  snare: "assets/drum/snare.wav",
  hihat_closed: "assets/drum/hihat_closed.wav",
  clap: "assets/drum/clap.wav",

  tom_high: "assets/drum/tom_high.wav",
  tom_mid: "assets/drum/tom_mid.wav",
  tom_low: "assets/drum/tom_low.wav",
  crash: "assets/drum/crash.wav",

  ride: "assets/drum/ride.wav",
  cymbal: "assets/drum/cymbal.wav",
  shaker: "assets/drum/shaker.wav",
  tambourine: "assets/drum/tambourine.wav",

  cowbell: "assets/drum/cowbell.wav",
  perc: "assets/drum/perc.wav",
  bloom_perc: "assets/drum/bloom_perc.wav",
  fx_hit: "assets/drum/fx_hit.wav"
};

function setDrumStatus(text, type = "error") {
  const status = document.getElementById("drumStatus");
  if (!status) return;

  status.innerHTML = text;
  status.className = "";

  if (type === "success") {
    status.classList.add("success");
  } else if (type === "loading") {
    status.classList.add("loading");
  } else {
    status.classList.add("error");
  }
}

async function loadDrumAssets() {
  setDrumStatus("🟡 Memuat Asset Drum...", "loading");

  drumSamples = {};
  let loaded = 0;
  let failed = 0;

  const entries = Object.entries(DRUM_FILES);

  for (const [name, path] of entries) {
    try {
      const audio = new Audio(path);
      audio.preload = "auto";
      audio.volume = 0.95;

      await new Promise((resolve) => {
        audio.oncanplaythrough = function () {
          drumSamples[name] = audio;
          loaded++;
          resolve();
        };

        audio.onerror = function () {
          failed++;
          console.warn("Asset drum gagal dimuat:", path);
          resolve();
        };

        audio.load();
      });
    } catch (err) {
      failed++;
      console.warn("Error load drum:", name, err);
    }
  }

  if (loaded === entries.length) {
    drumAssetLoaded = true;
    setDrumStatus("🟢 Asset Drum Berhasil Dimuat (16/16)", "success");
  } else if (loaded > 0) {
    drumAssetLoaded = true;
    setDrumStatus(
      "🟡 Asset Drum Dimuat " + loaded + "/16 • Gagal " + failed,
      "loading"
    );
  } else {
    drumAssetLoaded = false;
    setDrumStatus("🔴 Asset Drum Gagal Dimuat", "error");
  }
}

function toggleDrumRecord() {
  drumRecordEnabled = !drumRecordEnabled;

  const btn = document.getElementById("drumRecordBtn");
  if (btn) {
    btn.innerHTML = drumRecordEnabled ? "⏺ Record ON" : "⏺ Record OFF";
  }

  console.log(drumRecordEnabled ? "Record Drum ON" : "Record Drum OFF");
}

function playDrum(name, rec = true) {
  drumLastPad = name;

  const sample = drumSamples[name];

  if (sample) {
    const audio = sample.cloneNode(true);
    audio.volume = 0.95;
    audio.currentTime = 0;

    audio.play().catch(function (err) {
      console.warn("Drum play error:", err);
    });
  } else {
    if (typeof playDrumSynthFallback === "function") {
      playDrumSynthFallback(name, false);
    } else {
      console.warn("Drum asset belum dimuat:", name);
    }
  }

  if (drumRecordEnabled && rec) {
    drumRecords.push({
      name: name,
      time: Date.now()
    });

    updateDrumRecordList();
  }
}

function updateDrumRecordList() {
  const list = document.getElementById("drumRecordList");
  if (!list) return;

  if (drumRecords.length === 0) {
    list.innerHTML = "Belum ada rekaman.";
    return;
  }

  list.innerHTML = "";

  drumRecords.forEach(function (record, index) {
    const item = document.createElement("div");
    item.className = "record-item";
    item.innerHTML = "<span>" + (index + 1) + ". " + record.name + "</span>";
    list.appendChild(item);
  });
}

function clearDrumRecord() {
  drumRecords = [];
  updateDrumRecordList();
}

function playDrumRecord() {
  if (drumRecords.length === 0) {
    alert("Belum ada rekaman Drum.");
    return;
  }

  let i = 0;

  const timer = setInterval(function () {
    if (i >= drumRecords.length) {
      clearInterval(timer);
      return;
    }

    playDrum(drumRecords[i].name, false);
    i++;
  }, 300);
}

function addDrumToTimeline() {
  if (drumRecords.length === 0) {
    alert("Belum ada rekaman Drum.");
    return;
  }

  drumRecords.forEach(function (record, index) {
    if (typeof legacyRecordedEvents !== "undefined") {
      legacyRecordedEvents.push({
        id: "drum_" + Date.now() + "_" + index,
        bank: "Drum",
        note: record.name,
        step: index,
        time: Date.now()
      });
    }
  });

  if (typeof renderTimeline === "function") {
    renderTimeline();
  }

  if (typeof updateRecordList === "function") {
    updateRecordList();
  }

  alert("Drum masuk ke Timeline.");
}

window.addEventListener("load", function () {
  updateDrumRecordList();
  setDrumStatus("🔴 Asset Drum Belum Dimuat", "error");
});
