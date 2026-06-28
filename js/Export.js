/* =========================================
   EXPORT.JS V4.5 - TAHAP 1
   Timeline Record Manager
========================================= */

/* ===== DATA EXPORT ===== */

let exportSelectedId = null;
let exportHistory = [];
let exportNormalize = true;

/* ===== STATUS ===== */

function setExportStatus(text, type = "info") {

    const status = document.getElementById("exportStatusV4");
    if (!status) return;

    status.innerHTML = text;
    status.className = "export-status";

    status.classList.add(type);

}

/* ===== REFRESH TIMELINE ===== */

function refreshExportTimelineRecordsV4() {

    const list = document.getElementById("exportTimelineListV4");
    if (!list) return;

    list.innerHTML = "";

    if (
        typeof timelineRecordsV4 === "undefined" ||
        timelineRecordsV4.length === 0
    ) {

        list.innerHTML =
        "<span class='empty-record'>Belum ada Timeline Record</span>";

        updateExportInfo();
        return;

    }

    timelineRecordsV4.forEach(function(record,index){

        const item = document.createElement("div");

        item.className = "export-record";

        if(record.id===exportSelectedId){
            item.classList.add("active");
        }

        item.innerHTML=
        "<b>"+(index+1)+". "+record.name+"</b><br>"+
        "Clip : "+record.clips.length+
        " | BPM : "+record.bpm;

        item.onclick=function(){

            exportSelectedId=record.id;

            refreshExportTimelineRecordsV4();

            updateExportInfo();

        };

        list.appendChild(item);

    });

    updateExportInfo();

}

/* ===== UPDATE INFO ===== */

function updateExportInfo(){

    const info=document.getElementById("exportSelectedInfoV4");

    if(!info) return;

    if(exportSelectedId==null){

        info.innerHTML="Belum memilih Timeline Record";

        return;

    }

    const record=timelineRecordsV4.find(r=>r.id===exportSelectedId);

    if(!record){

        info.innerHTML="Timeline tidak ditemukan";

        return;

    }

    info.innerHTML=
    "<b>"+record.name+"</b><br>"+
    "Track : "+record.tracks.length+
    "<br>Clip : "+record.clips.length+
    "<br>BPM : "+record.bpm+
    "<br>Durasi : "+formatEditorTime(record.duration);

}

/* ===== GET RECORD ===== */

function getSelectedTimelineRecord(){

    if(exportSelectedId==null) return null;

    return timelineRecordsV4.find(function(r){

        return r.id===exportSelectedId;

    });

}

/* ===== NORMALIZE ===== */

function toggleExportNormalize(){

    exportNormalize=!exportNormalize;

    const btn=document.getElementById("exportNormalizeBtn");

    if(!btn) return;

    btn.innerHTML=
    exportNormalize ?
    "Normalize ON":
    "Normalize OFF";

}

/* ===== HISTORY ===== */

function addExportHistory(type,name){

    exportHistory.unshift({

        type:type,
        name:name,
        time:new Date().toLocaleTimeString()

    });

    renderExportHistory();

}

function renderExportHistory(){

    const list=document.getElementById("exportHistoryListV4");

    if(!list) return;

    if(exportHistory.length===0){

        list.innerHTML=
        "<span class='empty-record'>Belum ada hasil export</span>";

        return;

    }

    list.innerHTML="";

    exportHistory.forEach(function(item){

        const div=document.createElement("div");

        div.className="export-history-item";

        div.innerHTML=
        "📁 "+
        item.name+
        "<br><small>"+
        item.type+
        " | "+
        item.time+
        "</small>";

        list.appendChild(div);

    });

}

/* ===== PLACEHOLDER EXPORT ===== */

function exportSelectedTimelineRecordWavV4(){

    const record=getSelectedTimelineRecord();

    if(!record){

        alert("Pilih Timeline Record.");

        return;

    }

    setExportStatus("Menyiapkan Export WAV...","loading");

}

function exportSelectedTimelineRecordMp3V4(){

    const record=getSelectedTimelineRecord();

    if(!record){

        alert("Pilih Timeline Record.");

        return;

    }

    setExportStatus("Menyiapkan Export MP3...","loading");

}

/* ===== INIT ===== */

document.addEventListener("DOMContentLoaded",function(){

    refreshExportTimelineRecordsV4();

    renderExportHistory();

    setExportStatus("Siap Export","success");

});
/* =========================================
   EXPORT.JS V4.5 - TAHAP 2
   Export WAV Dasar
========================================= */

/* ===== EXPORT WAV ===== */

async function exportSelectedTimelineRecordWavV4() {

    const record = getSelectedTimelineRecord();

    if (!record) {
        alert("Pilih Timeline Record dulu.");
        return;
    }

    try {

        setExportStatus("⏳ Membuat WAV dari Timeline Record...", "loading");

        const sampleRate = getExportSampleRate();
        const wavBuffer = await renderTimelineRecordToWavBuffer(record, sampleRate);

        const wavBlob = encodeWavBlob(wavBuffer, sampleRate);

        const fileName = sanitizeExportFileName(record.name) + ".wav";

        downloadExportFile(wavBlob, fileName);

        addExportHistory("WAV", fileName);

        if (typeof markTimelineRecordExportedV45 === "function") {
            markTimelineRecordExportedV45(record.id, "WAV");
        }

        setExportStatus("✅ Export WAV selesai: " + fileName, "success");

    } catch (err) {

        console.error(err);
        setExportStatus("❌ Gagal Export WAV", "error");
        alert("Export WAV gagal. Cek console.");

    }

}

/* ===== RENDER TIMELINE KE AUDIO BUFFER ===== */

async function renderTimelineRecordToWavBuffer(record, sampleRate) {

    const duration = Math.max(1, record.duration || 1);
    const totalSamples = Math.ceil(duration * sampleRate);

    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);

    const clips = record.clips || [];

    for (const clip of clips) {

        await renderClipToExportBuffer(clip, left, right, sampleRate);

    }

    if (exportNormalize) {
        normalizeStereoBuffer(left, right);
    }

    return {
        left: left,
        right: right,
        sampleRate: sampleRate,
        duration: duration
    };

}

/* ===== RENDER SATU CLIP ===== */

async function renderClipToExportBuffer(clip, left, right, sampleRate) {

    if (!clip) return;

    const startSample = Math.floor((clip.start || 0) * sampleRate);
    const duration = clip.duration || 1;
    const clipSamples = Math.floor(duration * sampleRate);

    /*
      Tahap 2 ini sudah menghasilkan WAV,
      tapi untuk clip audio asli dari MP3/WAV,
      decoding penuh akan kita kuatkan di Tahap 5.
      Sekarang:
      - Clip instrument dibuat synthetic placeholder
      - Clip import/vokal/fx yang punya url dicoba decode
    */

    if (clip.url) {
        try {
            const decoded = await decodeExportAudioUrl(clip.url, sampleRate);
            mixDecodedBufferToExport(decoded, left, right, startSample, clip);
            return;
        } catch (e) {
            console.warn("Gagal decode clip url, pakai tone placeholder:", clip.name);
        }
    }

    renderSyntheticClipToExport(clip, left, right, startSample, clipSamples, sampleRate);

}

/* ===== DECODE AUDIO URL ===== */

async function decodeExportAudioUrl(url, sampleRate) {

    const ctx = new OfflineAudioContext(2, sampleRate, sampleRate);

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    const audioCtxTemp = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtxTemp.decodeAudioData(arrayBuffer);

    try {
        await audioCtxTemp.close();
    } catch (e) {}

    return audioBuffer;

}

/* ===== MIX DECODED AUDIO ===== */

function mixDecodedBufferToExport(audioBuffer, left, right, startSample, clip) {

    const volume = clip.volume ?? 1;
    const pan = clip.pan ?? 0;

    const sourceLeft = audioBuffer.getChannelData(0);
    const sourceRight = audioBuffer.numberOfChannels > 1
        ? audioBuffer.getChannelData(1)
        : sourceLeft;

    const maxSamples = Math.min(
        sourceLeft.length,
        Math.floor((clip.duration || audioBuffer.duration) * audioBuffer.sampleRate)
    );

    for (let i = 0; i < maxSamples; i++) {

        const targetIndex = startSample + i;

        if (targetIndex >= left.length) break;

        const lGain = pan <= 0 ? 1 : 1 - pan;
        const rGain = pan >= 0 ? 1 : 1 + pan;

        left[targetIndex] += sourceLeft[i] * volume * lGain;
        right[targetIndex] += sourceRight[i] * volume * rGain;

    }

}

/* ===== SYNTHETIC PLACEHOLDER EXPORT ===== */

function renderSyntheticClipToExport(clip, left, right, startSample, clipSamples, sampleRate) {

    const volume = clip.volume ?? 0.5;
    const pan = clip.pan ?? 0;

    const freq = getExportClipFrequency(clip);
    const beatStep = Math.floor(sampleRate * 0.5);

    for (let i = 0; i < clipSamples; i++) {

        const targetIndex = startSample + i;
        if (targetIndex >= left.length) break;

        let amp = 0;

        if (clip.type === "drum" || clip.source === "drum") {
            const local = i % beatStep;
            amp = Math.sin(local * 0.08) * Math.exp(-local / 3000);
        } else {
            amp = Math.sin(2 * Math.PI * freq * (i / sampleRate)) * 0.25;
        }

        const fade = Math.min(1, i / 1000, (clipSamples - i) / 1000);
        amp *= fade;

        const lGain = pan <= 0 ? 1 : 1 - pan;
        const rGain = pan >= 0 ? 1 : 1 + pan;

        left[targetIndex] += amp * volume * lGain;
        right[targetIndex] += amp * volume * rGain;

    }

}

function getExportClipFrequency(clip) {

    const type = String(clip.type || clip.source || "").toLowerCase();

    if (type.includes("bass")) return 110;
    if (type.includes("piano")) return 440;
    if (type.includes("guitar")) return 330;
    if (type.includes("midi")) return 523;
    if (type.includes("vocal")) return 220;
    if (type.includes("fx")) return 660;
    if (type.includes("drum")) return 80;

    return 440;

}

/* ===== NORMALIZE ===== */

function normalizeStereoBuffer(left, right) {

    let peak = 0;

    for (let i = 0; i < left.length; i++) {
        peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    }

    if (peak <= 0) return;

    const gain = 0.95 / peak;

    for (let i = 0; i < left.length; i++) {
        left[i] *= gain;
        right[i] *= gain;
    }

}

/* ===== ENCODE WAV ===== */

function encodeWavBlob(bufferData, sampleRate) {

    const left = bufferData.left;
    const right = bufferData.right;

    const numChannels = 2;
    const bitsPerSample = 16;

    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;

    const dataLength = left.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, "WAVE");

    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    let offset = 44;

    for (let i = 0; i < left.length; i++) {

        const l = Math.max(-1, Math.min(1, left[i]));
        const r = Math.max(-1, Math.min(1, right[i]));

        view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7FFF, true);
        offset += 2;

        view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7FFF, true);
        offset += 2;

    }

    return new Blob([buffer], { type: "audio/wav" });

}

/* ===== HELPER EXPORT ===== */

function writeString(view, offset, string) {

    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }

}

function getExportSampleRate() {

    const select = document.getElementById("exportSampleRate");

    if (!select) return 44100;

    return Number(select.value) || 44100;

}

function sanitizeExportFileName(name) {

    return String(name || "export")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, "_")
        .toLowerCase();

}

function downloadExportFile(blob, fileName) {

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);

}
=========================================
EXPORT.JS V4.5
TAHAP 3 — EXPORT MP3
=========================================

1. 🎵 LAME Encoder
   ✅ Menggunakan lame.min.js
   ✅ Konversi PCM → MP3

2. ⚙️ Pilih Bitrate
   ✅ 128 kbps
   ✅ 192 kbps
   ✅ 256 kbps
   ✅ 320 kbps

3. 📤 Export MP3
   ✅ Mengambil Timeline Record
   ✅ Render seluruh clip
   ✅ Encode menjadi MP3
   ✅ Progress Export
   ✅ Status Export

4. 📥 Download MP3
   ✅ Nama file otomatis
   ✅ Download ke perangkat
   ✅ Masuk Riwayat Export
/* =========================================
   EXPORT.JS V4.5 - TAHAP 4
   Export Setting
========================================= */

/* ===== EXPORT SETTING DATA ===== */

let exportSettingsV45 = {
    sampleRate: 44100,
    mp3Bitrate: 192,
    normalize: true,
    channels: "stereo",
    fileName: ""
};

/* ===== INIT SETTING ===== */

document.addEventListener("DOMContentLoaded", function () {
    loadExportSettingsFromUI();
});

/* ===== LOAD SETTING DARI HTML ===== */

function loadExportSettingsFromUI() {
    exportSettingsV45.sampleRate = getExportSampleRate();
    exportSettingsV45.mp3Bitrate = getExportBitrate();
    exportSettingsV45.normalize = exportNormalize;
    exportSettingsV45.channels = getExportChannelMode();
    exportSettingsV45.fileName = getExportCustomFileName();
}

/* ===== SAMPLE RATE ===== */

function getExportSampleRate() {
    const select = document.getElementById("exportSampleRate");

    if (!select) return 44100;

    const rate = Number(select.value);

    if (rate === 48000) return 48000;

    return 44100;
}

function setExportSampleRate(rate) {
    exportSettingsV45.sampleRate = Number(rate) || 44100;

    const select = document.getElementById("exportSampleRate");
    if (select) {
        select.value = String(exportSettingsV45.sampleRate);
    }
}

/* ===== MP3 BITRATE ===== */

function getExportBitrate() {
    const select = document.getElementById("exportMp3Quality");

    if (!select) return 192;

    const bitrate = Number(select.value);

    if ([128, 192, 256, 320].includes(bitrate)) {
        return bitrate;
    }

    return 192;
}

function setExportBitrate(bitrate) {
    exportSettingsV45.mp3Bitrate = Number(bitrate) || 192;

    const select = document.getElementById("exportMp3Quality");
    if (select) {
        select.value = String(exportSettingsV45.mp3Bitrate);
    }
}

/* ===== NORMALIZE ===== */

function toggleExportNormalize() {
    exportNormalize = !exportNormalize;
    exportSettingsV45.normalize = exportNormalize;

    const btn = document.getElementById("exportNormalizeBtn");

    if (btn) {
        btn.innerHTML = exportNormalize
            ? "Normalize ON"
            : "Normalize OFF";
    }

    setExportStatus(
        exportNormalize ? "Normalize aktif" : "Normalize mati",
        "info"
    );
}

function isExportNormalizeEnabled() {
    return exportNormalize === true;
}

/* ===== CHANNEL MODE ===== */

function getExportChannelMode() {
    const select = document.getElementById("exportChannelMode");

    if (!select) return "stereo";

    if (select.value === "mono") return "mono";

    return "stereo";
}

function setExportChannelMode(mode) {
    exportSettingsV45.channels = mode === "mono" ? "mono" : "stereo";

    const select = document.getElementById("exportChannelMode");
    if (select) {
        select.value = exportSettingsV45.channels;
    }
}

/* ===== FILE NAME ===== */

function getExportCustomFileName() {
    const input = document.getElementById("exportFileName");

    if (!input) return "";

    return input.value.trim();
}

function getFinalExportFileName(record, ext) {
    loadExportSettingsFromUI();

    let name = exportSettingsV45.fileName;

    if (!name) {
        name = record?.name || "musik-studio-export";
    }

    name = sanitizeExportFileName(name);

    return name + "." + ext;
}

/* ===== UPDATE SETTING STATUS ===== */

function updateExportSettingStatus() {
    loadExportSettingsFromUI();

    const status = document.getElementById("exportStatusV4");
    if (!status) return;

    status.innerHTML =
        "Setting: " +
        exportSettingsV45.sampleRate +
        "Hz • " +
        exportSettingsV45.mp3Bitrate +
        "kbps • " +
        exportSettingsV45.channels +
        " • Normalize " +
        (exportSettingsV45.normalize ? "ON" : "OFF");
}

/* ===== MONO CONVERT ===== */

function convertStereoToMonoIfNeeded(bufferData) {
    loadExportSettingsFromUI();

    if (exportSettingsV45.channels !== "mono") {
        return bufferData;
    }

    const left = bufferData.left;
    const right = bufferData.right;

    for (let i = 0; i < left.length; i++) {
        const mono = (left[i] + right[i]) / 2;
        left[i] = mono;
        right[i] = mono;
    }

    return bufferData;
}

/* ===== PATCH WAV EXPORT NAME + MONO ===== */

const oldExportSelectedTimelineRecordWavV4 = exportSelectedTimelineRecordWavV4;

exportSelectedTimelineRecordWavV4 = async function () {
    const record = getSelectedTimelineRecord();

    if (!record) {
        alert("Pilih Timeline Record dulu.");
        return;
    }

    try {
        loadExportSettingsFromUI();

        setExportStatus("⏳ Membuat WAV dengan setting export...", "loading");

        const sampleRate = exportSettingsV45.sampleRate;

        let wavBuffer = await renderTimelineRecordToWavBuffer(record, sampleRate);

        wavBuffer = convertStereoToMonoIfNeeded(wavBuffer);

        const wavBlob = encodeWavBlob(wavBuffer, sampleRate);

        const fileName = getFinalExportFileName(record, "wav");

        downloadExportFile(wavBlob, fileName);

        addExportHistory("WAV", fileName);

        if (typeof markTimelineRecordExportedV45 === "function") {
            markTimelineRecordExportedV45(record.id, "WAV");
        }

        setExportStatus("✅ Export WAV selesai: " + fileName, "success");

    } catch (err) {
        console.error(err);
        setExportStatus("❌ Gagal Export WAV", "error");
    }
};

/* ===== EXPORT SETTING PROJECT DATA ===== */

function getExportProjectDataV45() {
    loadExportSettingsFromUI();

    return {
        settings: JSON.parse(JSON.stringify(exportSettingsV45)),
        history: JSON.parse(JSON.stringify(exportHistory || []))
    };
}

function restoreExportProjectDataV45(data) {
    if (!data) return;

    if (data.settings) {
        exportSettingsV45 = {
            ...exportSettingsV45,
            ...data.settings
        };

        setExportSampleRate(exportSettingsV45.sampleRate);
        setExportBitrate(exportSettingsV45.mp3Bitrate);
        setExportChannelMode(exportSettingsV45.channels);

        exportNormalize = !!exportSettingsV45.normalize;

        const btn = document.getElementById("exportNormalizeBtn");
        if (btn) {
            btn.innerHTML = exportNormalize
                ? "Normalize ON"
                : "Normalize OFF";
        }

        const input = document.getElementById("exportFileName");
        if (input) {
            input.value = exportSettingsV45.fileName || "";
        }
    }

    if (Array.isArray(data.history)) {
        exportHistory = data.history;
        renderExportHistory();
    }

    updateExportSettingStatus();
}

/* =========================================
   EXPORT.JS V4.5 - TAHAP 5
   Progress + Cancel + History + Error Safety
========================================= */

/* ===== EXPORT STATE ===== */

let exportIsRunningV45 = false;
let exportCancelRequestedV45 = false;
let exportProgressV45 = 0;

/* ===== PROGRESS UI ===== */

function setExportProgressV45(value, text = "") {
    exportProgressV45 = Math.max(0, Math.min(100, value));

    const status = document.getElementById("exportStatusV4");

    if (status) {
        status.innerHTML =
            (text || "Export berjalan") +
            " • " +
            Math.round(exportProgressV45) +
            "%";
    }

    const bar = document.getElementById("exportProgressBarV45");
    if (bar) {
        bar.style.width = exportProgressV45 + "%";
    }

    const label = document.getElementById("exportProgressTextV45");
    if (label) {
        label.innerHTML = Math.round(exportProgressV45) + "%";
    }
}

function resetExportProgressV45() {
    exportProgressV45 = 0;
    setExportProgressV45(0, "Menunggu export");
}

/* ===== CANCEL EXPORT ===== */

function cancelExportV45() {
    if (!exportIsRunningV45) {
        setExportStatus("Tidak ada export yang berjalan.", "info");
        return;
    }

    exportCancelRequestedV45 = true;
    setExportStatus("Membatalkan export...", "warning");
}

function checkExportCancelV45() {
    if (exportCancelRequestedV45) {
        throw new Error("EXPORT_CANCELLED");
    }
}

/* ===== SAFE EXPORT WRAPPER ===== */

async function runExportSafeV45(exportType, exportFunction) {
    if (exportIsRunningV45) {
        alert("Export masih berjalan.");
        return;
    }

    exportIsRunningV45 = true;
    exportCancelRequestedV45 = false;

    try {
        setExportProgressV45(5, "Mulai export " + exportType);

        await exportFunction();

        setExportProgressV45(100, "Export " + exportType + " selesai");

    } catch (err) {
        if (err && err.message === "EXPORT_CANCELLED") {
            setExportStatus("Export dibatalkan.", "warning");
            resetExportProgressV45();
        } else {
            console.error(err);
            setExportStatus("Gagal export " + exportType + ".", "error");
        }
    } finally {
        exportIsRunningV45 = false;
        exportCancelRequestedV45 = false;
    }
}

/* ===== PATCH WAV EXPORT DENGAN SAFE WRAPPER ===== */

const exportWavOriginalV45 = exportSelectedTimelineRecordWavV4;

exportSelectedTimelineRecordWavV4 = function () {
    runExportSafeV45("WAV", async function () {
        checkExportCancelV45();
        setExportProgressV45(15, "Membaca Timeline Record");

        const record = getSelectedTimelineRecord();
        if (!record) {
            alert("Pilih Timeline Record dulu.");
            throw new Error("NO_RECORD");
        }

        checkExportCancelV45();
        setExportProgressV45(35, "Render audio");

        loadExportSettingsFromUI();

        const sampleRate = exportSettingsV45.sampleRate;
        let wavBuffer = await renderTimelineRecordToWavBuffer(record, sampleRate);

        checkExportCancelV45();
        setExportProgressV45(65, "Menyiapkan buffer");

        wavBuffer = convertStereoToMonoIfNeeded(wavBuffer);

        checkExportCancelV45();
        setExportProgressV45(80, "Encode WAV");

        const wavBlob = encodeWavBlob(wavBuffer, sampleRate);
        const fileName = getFinalExportFileName(record, "wav");

        checkExportCancelV45();
        setExportProgressV45(90, "Download WAV");

        downloadExportFile(wavBlob, fileName);
        addExportHistoryAdvancedV45("WAV", fileName, record, wavBlob.size);

        if (typeof markTimelineRecordExportedV45 === "function") {
            markTimelineRecordExportedV45(record.id, "WAV");
        }

        setExportStatus("✅ Export WAV selesai: " + fileName, "success");
    });
};

/* ===== PATCH MP3 EXPORT DENGAN SAFE WRAPPER ===== */

const exportMp3OriginalV45 = exportSelectedTimelineRecordMp3V4;

exportSelectedTimelineRecordMp3V4 = function () {
    runExportSafeV45("MP3", async function () {
        checkExportCancelV45();
        setExportProgressV45(15, "Membaca Timeline Record");

        const record = getSelectedTimelineRecord();
        if (!record) {
            alert("Pilih Timeline Record dulu.");
            throw new Error("NO_RECORD");
        }

        if (typeof lamejs === "undefined") {
            alert("lame.min.js belum terbaca.");
            throw new Error("LAME_NOT_FOUND");
        }

        checkExportCancelV45();
        setExportProgressV45(35, "Render audio");

        loadExportSettingsFromUI();

        const sampleRate = exportSettingsV45.sampleRate;
        const bitrate = exportSettingsV45.mp3Bitrate;

        let audioBuffer = await renderTimelineRecordToWavBuffer(record, sampleRate);
        audioBuffer = convertStereoToMonoIfNeeded(audioBuffer);

        checkExportCancelV45();
        setExportProgressV45(65, "Encode MP3");

        const mp3Blob = encodeMp3BlobV45(audioBuffer, sampleRate, bitrate);
        const fileName = getFinalExportFileName(record, "mp3");

        checkExportCancelV45();
        setExportProgressV45(90, "Download MP3");

        downloadExportFile(mp3Blob, fileName);
        addExportHistoryAdvancedV45("MP3", fileName, record, mp3Blob.size);

        if (typeof markTimelineRecordExportedV45 === "function") {
            markTimelineRecordExportedV45(record.id, "MP3");
        }

        setExportStatus("✅ Export MP3 selesai: " + fileName, "success");
    });
};

/* ===== ENCODE MP3 ===== */

function encodeMp3BlobV45(bufferData, sampleRate, bitrate) {
    const left = floatTo16BitPCMArrayV45(bufferData.left);
    const right = floatTo16BitPCMArrayV45(bufferData.right);

    const mp3Encoder = new lamejs.Mp3Encoder(2, sampleRate, bitrate);
    const mp3Data = [];

    const blockSize = 1152;

    for (let i = 0; i < left.length; i += blockSize) {
        checkExportCancelV45();

        const leftChunk = left.subarray(i, i + blockSize);
        const rightChunk = right.subarray(i, i + blockSize);

        const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);

        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const end = mp3Encoder.flush();

    if (end.length > 0) {
        mp3Data.push(end);
    }

    return new Blob(mp3Data, { type: "audio/mp3" });
}

function floatTo16BitPCMArrayV45(floatArray) {
    const output = new Int16Array(floatArray.length);

    for (let i = 0; i < floatArray.length; i++) {
        const s = Math.max(-1, Math.min(1, floatArray[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return output;
}

/* ===== HISTORY ADVANCED ===== */

function addExportHistoryAdvancedV45(type, fileName, record, size) {
    exportHistory.unshift({
        id: "export_" + Date.now(),
        type: type,
        name: fileName,
        recordName: record ? record.name : "",
        bpm: record ? record.bpm : 120,
        clipCount: record ? record.clips.length : 0,
        duration: record ? record.duration : 0,
        size: size || 0,
        time: new Date().toLocaleTimeString(),
        createdAt: new Date().toISOString()
    });

    renderExportHistory();
}

function renderExportHistory() {
    const list = document.getElementById("exportHistoryListV4");
    if (!list) return;

    if (!exportHistory.length) {
        list.innerHTML = "<span class='empty-record'>Belum ada hasil export</span>";
        return;
    }

    list.innerHTML = "";

    exportHistory.forEach(function (item) {
        const div = document.createElement("div");
        div.className = "export-history-item";

        div.innerHTML = `
            <strong>📁 ${item.name}</strong><br>
            <small>
                ${item.type} • ${formatExportFileSizeV45(item.size)} • 
                BPM ${item.bpm} • Clip ${item.clipCount} • 
                ${formatEditorTime(item.duration)}
            </small>
        `;

        list.appendChild(div);
    });
}

function clearExportHistoryV45() {
    const yakin = confirm("Hapus semua riwayat export?");
    if (!yakin) return;

    exportHistory = [];
    renderExportHistory();
    setExportStatus("Riwayat export dikosongkan.", "info");
}

/* ===== EXPORT INFO ===== */

function getExportInfoV45() {
    const record = getSelectedTimelineRecord();

    if (!record) {
        return {
            ready: false,
            message: "Belum memilih Timeline Record"
        };
    }

    return {
        ready: true,
        name: record.name,
        bpm: record.bpm,
        clipCount: record.clips.length,
        duration: record.duration,
        sampleRate: getExportSampleRate(),
        bitrate: getExportBitrate(),
        normalize: exportNormalize,
        channels: getExportChannelMode()
    };
}

function showExportInfoV45() {
    const info = getExportInfoV45();

    if (!info.ready) {
        alert(info.message);
        return;
    }

    alert(
        "Export Info\n\n" +
        "Nama: " + info.name + "\n" +
        "BPM: " + info.bpm + "\n" +
        "Clip: " + info.clipCount + "\n" +
        "Durasi: " + formatEditorTime(info.duration) + "\n" +
        "Sample Rate: " + info.sampleRate + "\n" +
        "Bitrate: " + info.bitrate + " kbps\n" +
        "Normalize: " + (info.normalize ? "ON" : "OFF") + "\n" +
        "Channel: " + info.channels
    );
}

/* ===== FORMAT SIZE ===== */

function formatExportFileSizeV45(bytes) {
    if (!bytes || bytes <= 0) return "0 B";

    if (bytes < 1024) return bytes + " B";

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/* ===== INIT TAHAP 5 ===== */

document.addEventListener("DOMContentLoaded", function () {
    resetExportProgressV45();
});
