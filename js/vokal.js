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
