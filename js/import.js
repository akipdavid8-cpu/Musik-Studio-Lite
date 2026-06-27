/* ===============================
   IMPORT AUDIO V4.5 - TAHAP 2
   Import Lebih Kuat
================================ */

let importedFiles = [];
let selectedImportIndex = -1;

let importAudio = new Audio();
let autoTrackName = true;
let waveformEnabled = true;

/* ===============================
   INIT
================================ */

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("importInput");

    if (input) {
        input.addEventListener("change", handleImportFile);
    }

    updateImportUI();
});

/* ===============================
   OPEN PICKER
================================ */

function openImportPicker() {
    const input = document.getElementById("importInput");
    if (!input) return;

    input.click();
}

/* ===============================
   HANDLE IMPORT
================================ */

async function handleImportFile(event) {
    const files = Array.from(event.target.files);

    if (!files.length) return;

    for (const file of files) {
        const isValid = validateAudioFile(file);

        if (!isValid) {
            alert("File tidak didukung: " + file.name);
            continue;
        }

        try {
            const audioData = await getAudioMeta(file);
            const audioURL = URL.createObjectURL(file);

            const importItem = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                trackName: autoTrackName
                    ? "Import Track " + (importedFiles.length + 1)
                    : file.name,
                url: audioURL,
                size: file.size,
                type: file.type || getFileExtension(file.name),
                duration: audioData.duration,
                durationText: formatTime(audioData.duration),
                waveform: waveformEnabled,
                createdAt: new Date().toISOString()
            };

            importedFiles.push(importItem);
            selectedImportIndex = importedFiles.length - 1;

        } catch (error) {
            console.error("Gagal membaca audio:", error);
            alert("Gagal membaca file audio: " + file.name);
        }
    }

    updateImportUI();
    event.target.value = "";
}

/* ===============================
   VALIDASI FILE
================================ */

function validateAudioFile(file) {
    if (!file) return false;

    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    const validExt =
        name.endsWith(".mp3") ||
        name.endsWith(".wav") ||
        name.endsWith(".ogg") ||
        name.endsWith(".m4a");

    const validType =
        type.startsWith("audio/") ||
        type === "";

    return validExt && validType;
}

/* ===============================
   AMBIL DURASI AUDIO
================================ */

function getAudioMeta(file) {
    return new Promise((resolve, reject) => {
        const tempAudio = new Audio();
        const tempURL = URL.createObjectURL(file);

        tempAudio.preload = "metadata";

        tempAudio.onloadedmetadata = () => {
            const duration = tempAudio.duration;

            URL.revokeObjectURL(tempURL);

            if (!isFinite(duration) || duration <= 0) {
                reject("Durasi tidak valid");
                return;
            }

            resolve({
                duration: duration
            });
        };

        tempAudio.onerror = () => {
            URL.revokeObjectURL(tempURL);
            reject("File rusak atau tidak bisa dibaca");
        };

        tempAudio.src = tempURL;
    });
}

/* ===============================
   UPDATE UI
================================ */

function updateImportUI() {
    const status = document.getElementById("importStatus");
    const info = document.getElementById("importInfo");
    const list = document.getElementById("importList");

    if (!status || !info || !list) return;

    if (importedFiles.length === 0) {
        status.innerHTML = "🔴 Belum ada file diimport";
        info.innerHTML = "File Import : 0";
        list.innerHTML = "Belum ada file import.";
        return;
    }

    const totalSize = importedFiles.reduce((sum, item) => sum + item.size, 0);
    const totalDuration = importedFiles.reduce((sum, item) => sum + item.duration, 0);

    status.innerHTML = "🟢 File berhasil diimport";
    info.innerHTML =
        "File Import : " + importedFiles.length +
        " | Total Durasi : " + formatTime(totalDuration) +
        " | Total Size : " + formatFileSize(totalSize);

    list.innerHTML = "";

    importedFiles.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "import-item";

        if (index === selectedImportIndex) {
            div.classList.add("active");
        }

        div.innerHTML = `
            <strong>${index + 1}. ${item.trackName}</strong><br>
            <small>File : ${item.name}</small><br>
            <small>Durasi : ${item.durationText} | Size : ${formatFileSize(item.size)}</small><br>
            <small>Type : ${item.type}</small>
        `;

        div.onclick = () => {
            selectedImportIndex = index;
            updateImportUI();
        };

        list.appendChild(div);
    });
}

/* ===============================
   PLAY / STOP
================================ */

function playImportAudio() {
    const item = getSelectedImport();

    if (!item) {
        alert("Pilih file import dulu.");
        return;
    }

    importAudio.pause();
    importAudio.currentTime = 0;

    importAudio = new Audio(item.url);
    importAudio.play().catch(() => {
        alert("Audio tidak bisa diputar.");
    });
}

function stopImportAudio() {
    importAudio.pause();
    importAudio.currentTime = 0;
}

/* ===============================
   RENAME / DELETE
================================ */

function renameImportAudio() {
    const item = getSelectedImport();

    if (!item) {
        alert("Pilih file import dulu.");
        return;
    }

    const newName = prompt("Masukkan nama track baru:", item.trackName);

    if (!newName || !newName.trim()) return;

    item.trackName = newName.trim();
    updateImportUI();
}

function deleteImportAudio() {
    const item = getSelectedImport();

    if (!item) {
        alert("Pilih file import dulu.");
        return;
    }

    const yakin = confirm("Hapus file import ini?");

    if (!yakin) return;

    stopImportAudio();

    URL.revokeObjectURL(item.url);

    importedFiles.splice(selectedImportIndex, 1);

    if (importedFiles.length === 0) {
        selectedImportIndex = -1;
    } else if (selectedImportIndex >= importedFiles.length) {
        selectedImportIndex = importedFiles.length - 1;
    }

    updateImportUI();
}

/* ===============================
   TOGGLE
================================ */

function toggleAutoTrack() {
    autoTrackName = !autoTrackName;

    const btn = document.getElementById("autoTrackBtn");

    if (btn) {
        btn.innerHTML = autoTrackName
            ? "🎼 Auto Nama Track ON"
            : "🎼 Auto Nama Track OFF";
    }
}

function toggleWaveform() {
    waveformEnabled = !waveformEnabled;

    const btn = document.getElementById("autoWaveBtn");

    if (btn) {
        btn.innerHTML = waveformEnabled
            ? "🌊 Waveform ON"
            : "🌊 Waveform OFF";
    }

    const item = getSelectedImport();

    if (item) {
        item.waveform = waveformEnabled;
    }
}

/* ===============================
   TAMBAH KE TIMELINE SEMENTARA
================================ */

function addImportToTimeline() {
    const item = getSelectedImport();

    if (!item) {
        alert("Pilih file import dulu.");
        return;
    }

    const clip = {
        id: Date.now(),
        type: "audio",
        name: item.trackName,
        fileName: item.name,
        url: item.url,
        size: item.size,
        fileType: item.type,
        start: 0,
        duration: item.duration,
        durationText: item.durationText,
        volume: 1,
        pan: 0,
        waveform: item.waveform
    };

    if (typeof addClipToTimeline === "function") {
        addClipToTimeline(clip);
    } else {
        console.log("Clip siap masuk timeline:", clip);
        alert("Clip siap masuk timeline. Tahap 3 nanti kita sambungkan penuh.");
    }
}

/* ===============================
   HELPER
================================ */

function getSelectedImport() {
    if (selectedImportIndex < 0) return null;
    return importedFiles[selectedImportIndex] || null;
}

function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return "0 B";

    if (bytes < 1024) return bytes + " B";

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatTime(seconds) {
    if (!seconds || !isFinite(seconds)) return "00:00";

    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);

    return String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

function getFileExtension(name) {
    const parts = name.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "audio";
}
/* ===============================
   IMPORT AUDIO V4.5 - TAHAP 3
   Timeline Integration
================================ */

/* tambah file aktif ke timeline */
function addImportToTimeline() {
    const item = getSelectedImport();

    if (!item) {
        alert("Pilih file import dulu.");
        return;
    }

    const clip = createImportClip(item);

    sendClipToMusicEditor(clip);

    alert("Audio berhasil ditambahkan ke Editor Musik.");
}

/* buat data clip dari file import */
function createImportClip(item) {
    return {
        id: "clip_import_" + Date.now(),
        sourceId: item.id,

        type: "audio",
        source: "import",

        name: item.trackName,
        fileName: item.name,
        url: item.url,

        start: 0,
        duration: item.duration || 8,
        durationText: item.durationText || "00:08",

        volume: 1,
        pan: 0,
        muted: false,
        solo: false,

        waveform: item.waveform,
        color: getImportClipColor(),

        trimStart: 0,
        trimEnd: item.duration || 8,

        trackName: item.trackName,
        createdAt: new Date().toISOString()
    };
}

/* kirim clip ke editor musik */
function sendClipToMusicEditor(clip) {

    /*
      Prioritas 1:
      Kalau script.js kamu punya fungsi addClipToTimeline(),
      maka clip langsung dikirim ke timeline utama.
    */
    if (typeof addClipToTimeline === "function") {
        addClipToTimeline(clip);
        return;
    }

    /*
      Prioritas 2:
      Kalau kamu punya array timelineClips,
      clip dimasukkan ke sana.
    */
    if (typeof timelineClips !== "undefined" && Array.isArray(timelineClips)) {
        timelineClips.push(clip);

        if (typeof renderTimeline === "function") {
            renderTimeline();
        }

        return;
    }

    /*
      Prioritas 3:
      Kalau belum ada sistem timeline,
      simpan sementara di window.importTimelineClips.
    */
    if (!window.importTimelineClips) {
        window.importTimelineClips = [];
    }

    window.importTimelineClips.push(clip);

    console.log("Clip masuk penyimpanan sementara:", clip);
}

/* warna clip import */
function getImportClipColor() {
    const colors = [
        "#7C3AED",
        "#2563EB",
        "#059669",
        "#F59E0B",
        "#DC2626",
        "#DB2777"
    ];

    return colors[Math.floor(Math.random() * colors.length)];
}

/* simpan data import ke project */
function getImportProjectData() {
    return importedFiles.map(item => {
        return {
            id: item.id,
            name: item.name,
            trackName: item.trackName,
            size: item.size,
            type: item.type,
            duration: item.duration,
            durationText: item.durationText,
            waveform: item.waveform,
            createdAt: item.createdAt
        };
    });
}

/* restore data import dari project */
function restoreImportProjectData(data) {
    if (!Array.isArray(data)) return;

    importedFiles = data.map(item => {
        return {
            id: item.id || Date.now() + Math.random(),
            file: null,
            name: item.name,
            trackName: item.trackName,
            url: null,
            size: item.size || 0,
            type: item.type || "audio",
            duration: item.duration || 0,
            durationText: item.durationText || "00:00",
            waveform: item.waveform ?? true,
            createdAt: item.createdAt || new Date().toISOString(),
            restored: true
        };
    });

    selectedImportIndex = importedFiles.length ? 0 : -1;
    updateImportUI();
}

/* cek apakah import hasil restore masih bisa diputar */
function canPlayImportItem(item) {
    return item && item.url && !item.restored;
}
