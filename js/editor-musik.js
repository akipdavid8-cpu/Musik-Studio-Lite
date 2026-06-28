/* =========================================
   EDITOR MUSIK V4.5 - TAHAP 1
   Fondasi Track + Clip + Timeline
========================================= */

/* ===== DATA UTAMA EDITOR ===== */

let editorTracks = [
    { id: "vocal", name: "🎤 Vocal", type: "vocal", muted: false, solo: false, locked: false },
    { id: "piano", name: "🎹 Piano", type: "piano", muted: false, solo: false, locked: false },
    { id: "guitar", name: "🎸 Guitar", type: "guitar", muted: false, solo: false, locked: false },
    { id: "bass", name: "🎸 Bass", type: "bass", muted: false, solo: false, locked: false },
    { id: "drum", name: "🥁 Drum", type: "drum", muted: false, solo: false, locked: false },
    { id: "fx", name: "✨ FX", type: "fx", muted: false, solo: false, locked: false },
    { id: "midi", name: "🎼 MIDI", type: "midi", muted: false, solo: false, locked: false },
    { id: "import", name: "📥 Import", type: "import", muted: false, solo: false, locked: false }
];

let editorClips = [];
let selectedEditorClipId = null;

let editorBpm = 120;
let editorPage = 1;
let editorTotalPage = 8;
let editorZoom = 1;

let editorIsPlaying = false;
let editorPlayheadTime = 0;
let editorPlayTimer = null;

let editorPixelsPerSecond = 24;

/* ===== INIT ===== */

document.addEventListener("DOMContentLoaded", function () {
    initEditorMusik();
});

function initEditorMusik() {
    renderEditorTimeline();
    updateEditorInfo();
    updateEditorPageText();
    updateEditorBpmText();
}

/* ===== TAMBAH CLIP DARI PANEL LAIN ===== */
/*
  Fungsi ini dipakai oleh:
  - import.js
  - drum.js
  - piano.js
  - guitar.js
  - bass.js
  - vokal.js
  - midi.js
  - fx.js
*/

function addClipToTimeline(clipData) {
    if (!clipData) return;

    const trackId = normalizeTrackId(clipData.track || clipData.type || clipData.source || "import");

    const newClip = {
        id: clipData.id || generateEditorId("clip"),
        trackId: trackId,

        type: clipData.type || trackId,
        source: clipData.source || trackId,

        name: clipData.name || "Clip Baru",
        fileName: clipData.fileName || "",

        url: clipData.url || null,
        notes: clipData.notes || [],
        events: clipData.events || [],

        start: Number(clipData.start || 0),
        duration: Number(clipData.duration || 4),

        volume: clipData.volume ?? 1,
        pan: clipData.pan ?? 0,

        color: clipData.color || getEditorClipColor(trackId),

        selected: false,
        muted: false,
        locked: false,

        createdAt: new Date().toISOString()
    };

    editorClips.push(newClip);
    selectedEditorClipId = newClip.id;

    renderEditorTimeline();
    updateEditorInfo();

    return newClip;
}

/* ===== NORMALISASI TRACK ===== */

function normalizeTrackId(type) {
    if (!type) return "import";

    const t = String(type).toLowerCase();

    if (t.includes("vocal") || t.includes("vokal")) return "vocal";
    if (t.includes("piano")) return "piano";
    if (t.includes("guitar") || t.includes("gitar")) return "guitar";
    if (t.includes("bass")) return "bass";
    if (t.includes("drum")) return "drum";
    if (t.includes("fx")) return "fx";
    if (t.includes("midi")) return "midi";
    if (t.includes("import") || t.includes("audio")) return "import";

    return "import";
}

/* ===== RENDER TIMELINE ===== */

function renderEditorTimeline() {
    renderEditorTracks();
    renderEditorClips();
}

function renderEditorTracks() {
    const lanes = document.querySelectorAll(".track-lane");

    lanes.forEach(function (lane) {
        lane.innerHTML = "";
    });
}

function renderEditorClips() {
    editorClips.forEach(function (clip) {
        const lane = document.querySelector(`.track-lane[data-track="${clip.trackId}"]`);
        if (!lane) return;

        const clipEl = document.createElement("div");
        clipEl.className = "editor-clip";

        if (clip.id === selectedEditorClipId) {
            clipEl.classList.add("selected");
        }

        clipEl.dataset.clipId = clip.id;
        clipEl.dataset.trackId = clip.trackId;

        clipEl.style.left = timeToPixel(clip.start) + "px";
        clipEl.style.width = Math.max(40, timeToPixel(clip.duration)) + "px";

        clipEl.innerHTML = `
            <div class="editor-clip-name">${clip.name}</div>
            <div class="editor-clip-wave">${getClipVisual(clip)}</div>
        `;

        clipEl.onclick = function (e) {
            e.stopPropagation();
            selectEditorClip(clip.id);
        };

        lane.appendChild(clipEl);
    });
}

/* ===== PILIH CLIP ===== */

function selectEditorClip(clipId) {
    selectedEditorClipId = clipId;
    renderEditorTimeline();
    updateEditorInfo();
}

function getSelectedEditorClip() {
    return editorClips.find(function (clip) {
        return clip.id === selectedEditorClipId;
    }) || null;
}

function clearSelectedEditorClip() {
    selectedEditorClipId = null;
    renderEditorTimeline();
    updateEditorInfo();
}

/* ===== VISUAL CLIP ===== */

function getClipVisual(clip) {
    if (clip.type === "audio" || clip.source === "import" || clip.url) {
        return "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁";
    }

    if (clip.type === "midi") {
        return "▰ ▰ ▰ ▰ ▰";
    }

    if (clip.type === "drum") {
        return "● ● ● ●";
    }

    return "██████";
}

function getEditorClipColor(trackId) {
    const colors = {
        vocal: "#ec4899",
        piano: "#8b5cf6",
        guitar: "#f97316",
        bass: "#22c55e",
        drum: "#ef4444",
        fx: "#06b6d4",
        midi: "#eab308",
        import: "#3b82f6"
    };

    return colors[trackId] || "#7c3aed";
}

/* ===== TIME / PIXEL ===== */

function timeToPixel(seconds) {
    return seconds * editorPixelsPerSecond * editorZoom;
}

function pixelToTime(pixel) {
    return pixel / (editorPixelsPerSecond * editorZoom);
}

/* ===== PLAY / STOP / PAUSE ===== */

function playTimeline() {
    if (editorIsPlaying) return;

    editorIsPlaying = true;

    const startRealTime = Date.now();
    const startPlayhead = editorPlayheadTime;

    editorPlayTimer = setInterval(function () {
        const elapsed = (Date.now() - startRealTime) / 1000;
        editorPlayheadTime = startPlayhead + elapsed;

        updatePlayheadLine();
        updateTimeDisplay();

        const maxTime = getEditorSongDuration();

        if (editorPlayheadTime >= maxTime) {
            stopTimeline();
        }
    }, 30);
}

function pauseTimeline() {
    editorIsPlaying = false;

    if (editorPlayTimer) {
        clearInterval(editorPlayTimer);
        editorPlayTimer = null;
    }
}

function stopTimeline() {
    editorIsPlaying = false;
    editorPlayheadTime = 0;

    if (editorPlayTimer) {
        clearInterval(editorPlayTimer);
        editorPlayTimer = null;
    }

    updatePlayheadLine();
    updateTimeDisplay();
}

function updatePlayheadLine() {
    const playhead = document.getElementById("playheadLine");
    if (!playhead) return;

    playhead.style.left = timeToPixel(editorPlayheadTime) + "px";
}

function updateTimeDisplay() {
    const time = document.getElementById("timeDisplay");
    if (!time) return;

    time.innerHTML = "Waktu: " + formatEditorTime(editorPlayheadTime);
}

/* ===== BPM ===== */

function changeBpm(amount) {
    editorBpm += amount;

    if (editorBpm < 40) editorBpm = 40;
    if (editorBpm > 240) editorBpm = 240;

    updateEditorBpmText();
    updateEditorInfo();
}

function updateEditorBpmText() {
    const bpmText = document.getElementById("bpmText");
    if (bpmText) {
        bpmText.innerHTML = editorBpm + " BPM";
    }
}

/* ===== PAGE TIMELINE ===== */

function prevStepPage() {
    editorPage--;

    if (editorPage < 1) {
        editorPage = 1;
    }

    updateEditorPageText();
}

function nextStepPage() {
    editorPage++;

    if (editorPage > editorTotalPage) {
        editorPage = editorTotalPage;
    }

    updateEditorPageText();
}

function updateEditorPageText() {
    const pageText = document.getElementById("pageText");

    if (pageText) {
        pageText.innerHTML = editorPage + "/" + editorTotalPage;
    }
}

/* ===== DURASI LAGU ===== */

function getEditorSongDuration() {
    if (editorClips.length === 0) return 60;

    let max = 0;

    editorClips.forEach(function (clip) {
        const end = clip.start + clip.duration;
        if (end > max) max = end;
    });

    return Math.max(max, 10);
}

/* ===== INFO / STATUS ===== */

function updateEditorInfo() {
    const selected = getSelectedEditorClip();

    console.log("Editor Musik:", {
        track: editorTracks.length,
        clip: editorClips.length,
        selected: selected ? selected.name : null,
        bpm: editorBpm
    });
}

/* ===== HELPER ===== */

function generateEditorId(prefix = "id") {
    return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 99999);
}

function formatEditorTime(seconds) {
    if (!seconds || !isFinite(seconds)) return "00:00.00";

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    return (
        String(m).padStart(2, "0") +
        ":" +
        String(s).padStart(2, "0") +
        "." +
        String(ms).padStart(2, "0")
    );
}

/* ===== FUNGSI CADANGAN AGAR TOMBOL HTML TIDAK ERROR ===== */

function toggleMasterRecorder() {
    const btn = document.getElementById("recBtn");
    if (!btn) return;

    const active = btn.dataset.active === "true";
    btn.dataset.active = active ? "false" : "true";
    btn.innerHTML = active ? "🔴 Rec" : "⏹ Rec ON";
}

function undoEditor() {
    alert("Undo akan dibuat di Tahap 3.");
}

function redoEditor() {
    alert("Redo akan dibuat di Tahap 3.");
}

function addSongSection() {
    alert("Song Section akan dibuat di Tahap 4.");
}

function setSongSection(name) {
    alert("Pindah ke section: " + name);
}

function scrollTimelineTop() {
    const panel = document.getElementById("timelinePanel");
    if (panel) panel.scrollTop = 0;
}

function scrollTimelineBottom() {
    const panel = document.getElementById("timelinePanel");
    if (panel) panel.scrollTop = panel.scrollHeight;
}

/* ===== TEST MANUAL ===== */
/*
addClipToTimeline({
    type: "drum",
    name: "Drum Record 01",
    start: 0,
    duration: 8
});

addClipToTimeline({
    type: "vocal",
    name: "Vocal Take 01",
    start: 12,
    duration: 10
});
*/
/* =========================================
   EDITOR MUSIK V4.5 - TAHAP 2
   Drag Clip + Copy Paste + Delete
========================================= */

let editorClipboardClip = null;
let isDraggingClip = false;
let dragClipId = null;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginalStart = 0;
let dragOriginalTrack = null;

/* ===== OVERRIDE RENDER CLIP UNTUK DRAG ===== */

function renderEditorClips() {
    editorClips.forEach(function (clip) {
        const lane = document.querySelector(`.track-lane[data-track="${clip.trackId}"]`);
        if (!lane) return;

        const clipEl = document.createElement("div");
        clipEl.className = "editor-clip";

        if (clip.id === selectedEditorClipId) {
            clipEl.classList.add("selected");
        }

        clipEl.dataset.clipId = clip.id;
        clipEl.dataset.trackId = clip.trackId;

        clipEl.style.left = timeToPixel(clip.start) + "px";
        clipEl.style.width = Math.max(40, timeToPixel(clip.duration)) + "px";
        clipEl.style.background = clip.color;

        clipEl.innerHTML = `
            <div class="editor-clip-name">${clip.name}</div>
            <div class="editor-clip-wave">${getClipVisual(clip)}</div>
        `;

        clipEl.onclick = function (e) {
            e.stopPropagation();
            selectEditorClip(clip.id);
        };

        clipEl.onpointerdown = function (e) {
            startDragEditorClip(e, clip.id);
        };

        lane.appendChild(clipEl);
    });
}

/* ===== START DRAG ===== */

function startDragEditorClip(e, clipId) {
    const clip = editorClips.find(c => c.id === clipId);
    if (!clip || clip.locked) return;

    isDraggingClip = true;
    dragClipId = clipId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOriginalStart = clip.start;
    dragOriginalTrack = clip.trackId;

    selectedEditorClipId = clipId;

    document.onpointermove = dragEditorClipMove;
    document.onpointerup = stopDragEditorClip;

    e.preventDefault();
}

/* ===== DRAG MOVE ===== */

function dragEditorClipMove(e) {
    if (!isDraggingClip || !dragClipId) return;

    const clip = editorClips.find(c => c.id === dragClipId);
    if (!clip) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    const timeMove = pixelToTime(deltaX);
    clip.start = Math.max(0, dragOriginalStart + timeMove);

    const newTrack = detectTrackByY(e.clientY);
    if (newTrack) {
        clip.trackId = newTrack;
    }

    renderEditorTimeline();
    updateEditorInfo();
}

/* ===== STOP DRAG ===== */

function stopDragEditorClip() {
    isDraggingClip = false;
    dragClipId = null;

    document.onpointermove = null;
    document.onpointerup = null;

    renderEditorTimeline();
}

/* ===== DETEKSI TRACK SAAT DIGESER ATAS/BAWAH ===== */

function detectTrackByY(clientY) {
    const lanes = document.querySelectorAll(".track-lane");

    for (let lane of lanes) {
        const rect = lane.getBoundingClientRect();

        if (clientY >= rect.top && clientY <= rect.bottom) {
            return lane.dataset.track;
        }
    }

    return null;
}

/* ===== DELETE CLIP ===== */

function deleteSelectedClip() {
    if (!selectedEditorClipId) {
        alert("Pilih clip dulu.");
        return;
    }

    editorClips = editorClips.filter(function (clip) {
        return clip.id !== selectedEditorClipId;
    });

    selectedEditorClipId = null;

    renderEditorTimeline();
    updateEditorInfo();
}

function deleteSelectedAudio() {
    deleteSelectedClip();
}

/* ===== COPY CLIP ===== */

function copySelectedClip() {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    editorClipboardClip = JSON.parse(JSON.stringify(clip));
    alert("Clip disalin.");
}

function copySelectedAudio() {
    copySelectedClip();
}

/* ===== PASTE CLIP ===== */

function pasteClip() {
    if (!editorClipboardClip) {
        alert("Belum ada clip yang disalin.");
        return;
    }

    const newClip = JSON.parse(JSON.stringify(editorClipboardClip));

    newClip.id = generateEditorId("clip");
    newClip.start = newClip.start + 1;
    newClip.name = newClip.name + " Copy";
    newClip.createdAt = new Date().toISOString();

    editorClips.push(newClip);
    selectedEditorClipId = newClip.id;

    renderEditorTimeline();
    updateEditorInfo();
}

function pasteAudio() {
    pasteClip();
}

/* ===== CUT CLIP ===== */

function cutSelectedClip() {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    editorClipboardClip = JSON.parse(JSON.stringify(clip));

    editorClips = editorClips.filter(function (c) {
        return c.id !== clip.id;
    });

    selectedEditorClipId = null;

    renderEditorTimeline();
    updateEditorInfo();
}

function cutSelectedAudio() {
    cutSelectedClip();
}

/* ===== SPLIT CLIP ===== */

function splitSelectedClip() {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    if (clip.duration <= 1) {
        alert("Clip terlalu pendek untuk dipotong.");
        return;
    }

    const half = clip.duration / 2;

    const secondClip = JSON.parse(JSON.stringify(clip));
    secondClip.id = generateEditorId("clip");
    secondClip.name = clip.name + " Part 2";
    secondClip.start = clip.start + half;
    secondClip.duration = half;

    clip.name = clip.name + " Part 1";
    clip.duration = half;

    editorClips.push(secondClip);

    selectedEditorClipId = secondClip.id;

    renderEditorTimeline();
    updateEditorInfo();
}

/* ===== DUPLICATE CLIP ===== */

function duplicateSelectedClip() {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    const newClip = JSON.parse(JSON.stringify(clip));

    newClip.id = generateEditorId("clip");
    newClip.name = clip.name + " Duplikat";
    newClip.start = clip.start + clip.duration + 0.5;

    editorClips.push(newClip);
    selectedEditorClipId = newClip.id;

    renderEditorTimeline();
    updateEditorInfo();
}

/* ===== RESIZE SEDERHANA ===== */

function resizeSelectedClip(amount) {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    clip.duration += amount;

    if (clip.duration < 0.5) {
        clip.duration = 0.5;
    }

    renderEditorTimeline();
    updateEditorInfo();
}

/* ===== MOVE MANUAL ===== */

function moveSelectedClip(seconds) {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    clip.start += seconds;

    if (clip.start < 0) {
        clip.start = 0;
    }

    renderEditorTimeline();
    updateEditorInfo();
}

/* ===== PINDAH TRACK MANUAL ===== */

function moveSelectedClipTrack(direction) {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    const index = editorTracks.findIndex(t => t.id === clip.trackId);
    if (index < 0) return;

    let newIndex = index + direction;

    if (newIndex < 0) newIndex = 0;
    if (newIndex >= editorTracks.length) newIndex = editorTracks.length - 1;

    clip.trackId = editorTracks[newIndex].id;

    renderEditorTimeline();
    updateEditorInfo();
}

/* ===== NOTE COMPAT ===== */

function deleteSelectedNote() {
    deleteSelectedClip();
}

function copySelectedNote() {
    copySelectedClip();
}

function pasteSelectedNote() {
    pasteClip();
}

function clearSelectedNote() {
    clearSelectedEditorClip();
}
/* =========================================
   EDITOR MUSIK V4.5 - TAHAP 3
   Tool Editor Musik
========================================= */

let activeEditorTool = null;

/* ===== BUKA TOOL ===== */

function openEditorTool(type) {
    activeEditorTool = type;

    const panel = document.getElementById("editorToolPanel");
    const title = document.getElementById("editorToolTitle");
    const content = document.getElementById("editorToolContent");

    if (!panel || !title || !content) return;

    panel.style.display = "block";

    if (type === "clip") {
        title.innerHTML = "🎵 Tool Clip";
        content.innerHTML = renderClipToolHTML();
    } else if (type === "track") {
        title.innerHTML = "🎼 Tool Track";
        content.innerHTML = renderTrackToolHTML();
    } else if (type === "pattern") {
        title.innerHTML = "📋 Tool Pattern";
        content.innerHTML = renderPatternToolHTML();
    } else if (type === "timeline") {
        title.innerHTML = "📄 Tool Timeline";
        content.innerHTML = renderTimelineToolHTML();
    } else if (type === "status") {
        title.innerHTML = "📊 Status Editor";
        content.innerHTML = renderStatusToolHTML();
    } else {
        title.innerHTML = "Tool";
        content.innerHTML = "Tool tidak dikenal.";
    }
}

/* ===== TUTUP TOOL ===== */

function closeEditorTool() {
    activeEditorTool = null;

    const panel = document.getElementById("editorToolPanel");
    if (panel) {
        panel.style.display = "none";
    }
}

/* ===== TOOL CLIP ===== */

function renderClipToolHTML() {
    return `
        <div class="tool-button-grid">
            <button onclick="cutSelectedClip()">✂ Cut</button>
            <button onclick="copySelectedClip()">📋 Copy</button>
            <button onclick="pasteClip()">📌 Paste</button>
            <button onclick="deleteSelectedClip()">🗑 Delete</button>

            <button onclick="moveSelectedClip(-1)">⬅ Move</button>
            <button onclick="moveSelectedClip(1)">➡ Move</button>
            <button onclick="moveSelectedClipTrack(-1)">⬆ Track</button>
            <button onclick="moveSelectedClipTrack(1)">⬇ Track</button>

            <button onclick="resizeSelectedClip(-1)">📏 Short</button>
            <button onclick="resizeSelectedClip(1)">📏 Long</button>
            <button onclick="splitSelectedClip()">✂ Split</button>
            <button onclick="duplicateSelectedClip()">📑 Duplicate</button>

            <button onclick="changeSelectedClipVolume(-0.1)">🔉 Vol -</button>
            <button onclick="changeSelectedClipVolume(0.1)">🔊 Vol +</button>
            <button onclick="changeSelectedClipPan(-0.1)">⬅ Pan</button>
            <button onclick="changeSelectedClipPan(0.1)">➡ Pan</button>

            <button onclick="reverseSelectedClip()">🔁 Reverse</button>
            <button onclick="renameSelectedClip()">✏ Rename</button>
        </div>
    `;
}

/* ===== TOOL TRACK ===== */

function renderTrackToolHTML() {
    return `
        <div class="tool-button-grid">
            <button onclick="addCustomTrack()">➕ Add Track</button>
            <button onclick="renameSelectedTrack()">✏ Rename</button>
            <button onclick="deleteSelectedTrack()">🗑 Delete</button>
            <button onclick="muteSelectedTrack()">🔇 Mute</button>
            <button onclick="soloSelectedTrack()">🎧 Solo</button>
            <button onclick="lockSelectedTrack()">🔒 Lock</button>
        </div>
    `;
}

/* ===== TOOL PATTERN ===== */

function renderPatternToolHTML() {
    return `
        <div class="tool-button-grid">
            <button onclick="savePatternFromTimeline()">💾 Save Pattern</button>
            <button onclick="loadPatternToTimeline()">📂 Load Pattern</button>
            <button onclick="copyPattern()">📋 Copy Pattern</button>
            <button onclick="pastePattern()">📌 Paste Pattern</button>
            <button onclick="deletePattern()">🗑 Delete Pattern</button>
        </div>
        <div id="editorPatternList" class="editor-pattern-list">
            Belum ada pattern tersimpan.
        </div>
    `;
}

/* ===== TOOL TIMELINE ===== */

function renderTimelineToolHTML() {
    return `
        <div class="tool-button-grid">
            <button onclick="saveTimelineRecordV4()">💾 Save Timeline</button>
            <button onclick="loadProjectClick()">📂 Load Project</button>
            <button onclick="clearTimeline()">🗑 Clear Timeline</button>
        </div>
    `;
}

/* ===== TOOL STATUS ===== */

function renderStatusToolHTML() {
    const duration = getEditorSongDuration();
    const selected = getSelectedEditorClip();

    return `
        <div class="editor-status-box">
            <p>✔ Status: Siap dipindahkan ke Export</p>
            <p>Track: ${editorTracks.length}</p>
            <p>Clip: ${editorClips.length}</p>
            <p>Durasi: ${formatEditorTime(duration)}</p>
            <p>BPM: ${editorBpm}</p>
            <p>Clip Terpilih: ${selected ? selected.name : "Belum ada"}</p>
        </div>
    `;
}

/* =========================================
   CLIP TOOL FUNCTION
========================================= */

function changeSelectedClipVolume(amount) {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    clip.volume += amount;

    if (clip.volume < 0) clip.volume = 0;
    if (clip.volume > 1) clip.volume = 1;

    updateEditorInfo();
    refreshActiveTool();
}

function changeSelectedClipPan(amount) {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    clip.pan += amount;

    if (clip.pan < -1) clip.pan = -1;
    if (clip.pan > 1) clip.pan = 1;

    updateEditorInfo();
    refreshActiveTool();
}

function reverseSelectedClip() {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    clip.reversed = !clip.reversed;
    alert(clip.reversed ? "Clip Reverse ON" : "Clip Reverse OFF");

    renderEditorTimeline();
    refreshActiveTool();
}

function renameSelectedClip() {
    const clip = getSelectedEditorClip();

    if (!clip) {
        alert("Pilih clip dulu.");
        return;
    }

    const name = prompt("Nama clip baru:", clip.name);

    if (!name || !name.trim()) return;

    clip.name = name.trim();

    renderEditorTimeline();
    refreshActiveTool();
}

/* =========================================
   TRACK TOOL FUNCTION
========================================= */

let selectedEditorTrackId = "vocal";

function selectEditorTrack(trackId) {
    selectedEditorTrackId = trackId;
    refreshActiveTool();
}

function getSelectedEditorTrack() {
    return editorTracks.find(t => t.id === selectedEditorTrackId) || null;
}

function addCustomTrack() {
    const input = document.getElementById("newTrackTitle");
    let name = input ? input.value.trim() : "";

    if (!name) {
        name = prompt("Nama track baru:");
    }

    if (!name || !name.trim()) return;

    const id = "track_" + Date.now();

    editorTracks.push({
        id: id,
        name: "🎵 " + name.trim(),
        type: id,
        muted: false,
        solo: false,
        locked: false
    });

    createTrackLaneHTML(id, "🎵 " + name.trim());

    if (input) input.value = "";

    selectedEditorTrackId = id;

    renderEditorTimeline();
    refreshActiveTool();
}

function createTrackLaneHTML(trackId, trackName) {
    const scroll = document.getElementById("timelineScroll");
    if (!scroll) return;

    const row = document.createElement("div");
    row.className = "timeline-track-row";

    row.innerHTML = `
        <div class="track-name" onclick="selectEditorTrack('${trackId}')">${trackName}</div>
        <div class="track-lane" data-track="${trackId}"></div>
    `;

    scroll.appendChild(row);
}

function renameSelectedTrack() {
    const track = getSelectedEditorTrack();

    if (!track) {
        alert("Pilih track dulu.");
        return;
    }

    const name = prompt("Nama track baru:", track.name);

    if (!name || !name.trim()) return;

    track.name = name.trim();

    const rowName = document.querySelector(`.track-lane[data-track="${track.id}"]`)?.previousElementSibling;
    if (rowName) rowName.innerHTML = track.name;

    refreshActiveTool();
}

function deleteSelectedTrack() {
    const track = getSelectedEditorTrack();

    if (!track) {
        alert("Pilih track dulu.");
        return;
    }

    if (["vocal", "piano", "guitar", "bass", "drum", "fx", "midi", "import"].includes(track.id)) {
        alert("Track utama tidak boleh dihapus.");
        return;
    }

    const yakin = confirm("Hapus track ini dan semua clip di dalamnya?");
    if (!yakin) return;

    editorTracks = editorTracks.filter(t => t.id !== track.id);
    editorClips = editorClips.filter(c => c.trackId !== track.id);

    const lane = document.querySelector(`.track-lane[data-track="${track.id}"]`);
    if (lane && lane.parentElement) {
        lane.parentElement.remove();
    }

    selectedEditorTrackId = "vocal";

    renderEditorTimeline();
    refreshActiveTool();
}

function muteSelectedTrack() {
    const track = getSelectedEditorTrack();

    if (!track) {
        alert("Pilih track dulu.");
        return;
    }

    track.muted = !track.muted;
    alert(track.muted ? "Track Mute ON" : "Track Mute OFF");

    refreshActiveTool();
}

function soloSelectedTrack() {
    const track = getSelectedEditorTrack();

    if (!track) {
        alert("Pilih track dulu.");
        return;
    }

    track.solo = !track.solo;
    alert(track.solo ? "Track Solo ON" : "Track Solo OFF");

    refreshActiveTool();
}

function lockSelectedTrack() {
    const track = getSelectedEditorTrack();

    if (!track) {
        alert("Pilih track dulu.");
        return;
    }

    track.locked = !track.locked;

    editorClips.forEach(function (clip) {
        if (clip.trackId === track.id) {
            clip.locked = track.locked;
        }
    });

    alert(track.locked ? "Track Lock ON" : "Track Lock OFF");

    refreshActiveTool();
}

/* =========================================
   PATTERN TOOL FUNCTION
========================================= */

let editorPatterns = [];
let copiedPattern = null;

function savePatternFromTimeline() {
    const name = prompt("Nama pattern:", "Pattern " + (editorPatterns.length + 1));

    if (!name || !name.trim()) return;

    const pattern = {
        id: generateEditorId("pattern"),
        name: name.trim(),
        clips: JSON.parse(JSON.stringify(editorClips)),
        createdAt: new Date().toISOString()
    };

    editorPatterns.push(pattern);

    alert("Pattern disimpan.");
    refreshActiveTool();
}

function loadPatternToTimeline() {
    if (!editorPatterns.length) {
        alert("Belum ada pattern.");
        return;
    }

    const pattern = editorPatterns[editorPatterns.length - 1];

    editorClips = JSON.parse(JSON.stringify(pattern.clips));
    selectedEditorClipId = null;

    renderEditorTimeline();
    alert("Pattern dimuat: " + pattern.name);
    refreshActiveTool();
}

function copyPattern() {
    if (!editorPatterns.length) {
        alert("Belum ada pattern.");
        return;
    }

    copiedPattern = JSON.parse(JSON.stringify(editorPatterns[editorPatterns.length - 1]));
    alert("Pattern disalin.");
}

function pastePattern() {
    if (!copiedPattern) {
        alert("Belum ada pattern yang disalin.");
        return;
    }

    const pattern = JSON.parse(JSON.stringify(copiedPattern));
    pattern.id = generateEditorId("pattern");
    pattern.name = pattern.name + " Copy";

    editorPatterns.push(pattern);

    alert("Pattern ditempel.");
    refreshActiveTool();
}

function deletePattern() {
    if (!editorPatterns.length) {
        alert("Belum ada pattern.");
        return;
    }

    editorPatterns.pop();

    alert("Pattern terakhir dihapus.");
    refreshActiveTool();
}

/* =========================================
   TIMELINE TOOL FUNCTION
========================================= */

function clearTimeline() {
    const yakin = confirm("Hapus semua clip di timeline?");
    if (!yakin) return;

    editorClips = [];
    selectedEditorClipId = null;
    editorPlayheadTime = 0;

    renderEditorTimeline();
    updatePlayheadLine();
    updateTimeDisplay();
    refreshActiveTool();
}

/* =========================================
   REFRESH TOOL AKTIF
========================================= */

function refreshActiveTool() {
    if (activeEditorTool) {
        openEditorTool(activeEditorTool);
    }
}
/* =========================================
   EDITOR MUSIK V4.5 - TAHAP 4
   Loop Area + Song Section + Timeline Record
========================================= */

/* ===== LOOP AREA ===== */

let loopAreaEnabledV4 = false;
let loopStartTimeV4 = 0;
let loopEndTimeV4 = 20;

function toggleLoopAreaV4() {
    loopAreaEnabledV4 = !loopAreaEnabledV4;

    const btn = document.getElementById("loopToggleBtnV4");
    if (btn) {
        btn.innerHTML = loopAreaEnabledV4 ? "Loop ON" : "Loop OFF";
    }

    updateLoopAreaStatusV4();
}

function setLoopStartV4() {
    loopStartTimeV4 = editorPlayheadTime;

    if (loopStartTimeV4 >= loopEndTimeV4) {
        loopEndTimeV4 = loopStartTimeV4 + 5;
    }

    updateLoopAreaStatusV4();
}

function setLoopEndV4() {
    loopEndTimeV4 = editorPlayheadTime;

    if (loopEndTimeV4 <= loopStartTimeV4) {
        loopEndTimeV4 = loopStartTimeV4 + 5;
    }

    updateLoopAreaStatusV4();
}

function playLoopAreaV4() {
    if (loopEndTimeV4 <= loopStartTimeV4) {
        alert("Loop B harus lebih besar dari Loop A.");
        return;
    }

    loopAreaEnabledV4 = true;
    editorPlayheadTime = loopStartTimeV4;

    updateLoopAreaStatusV4();
    updatePlayheadLine();
    updateTimeDisplay();

    playTimeline();
}

function clearLoopAreaV4() {
    loopAreaEnabledV4 = false;
    loopStartTimeV4 = 0;
    loopEndTimeV4 = 20;

    const btn = document.getElementById("loopToggleBtnV4");
    if (btn) {
        btn.innerHTML = "Loop OFF";
    }

    updateLoopAreaStatusV4();
}

function updateLoopAreaStatusV4() {
    const status = document.getElementById("loopAreaStatusV4");
    if (!status) return;

    status.innerHTML =
        "Loop: " + (loopAreaEnabledV4 ? "ON" : "OFF") +
        " • A: " + formatEditorTime(loopStartTimeV4) +
        " • B: " + formatEditorTime(loopEndTimeV4);
}

/* Override playTimeline agar mendukung loop */
function playTimeline() {
    if (editorIsPlaying) return;

    editorIsPlaying = true;

    const startRealTime = Date.now();
    const startPlayhead = editorPlayheadTime;

    editorPlayTimer = setInterval(function () {
        const elapsed = (Date.now() - startRealTime) / 1000;
        editorPlayheadTime = startPlayhead + elapsed;

        if (loopAreaEnabledV4 && editorPlayheadTime >= loopEndTimeV4) {
            editorPlayheadTime = loopStartTimeV4;
        }

        updatePlayheadLine();
        updateTimeDisplay();

        const maxTime = getEditorSongDuration();

        if (!loopAreaEnabledV4 && editorPlayheadTime >= maxTime) {
            stopTimeline();
        }
    }, 30);
}

/* ===== SONG SECTION ===== */

let songSectionsV45 = [
    { id: "intro", name: "Intro", start: 0 },
    { id: "verse", name: "Verse", start: 20 },
    { id: "chorus", name: "Chorus", start: 50 },
    { id: "bridge", name: "Bridge", start: 80 },
    { id: "solo", name: "Solo", start: 100 },
    { id: "outro", name: "Outro", start: 130 }
];

function setSongSection(name) {
    const section = songSectionsV45.find(function (s) {
        return s.name.toLowerCase() === String(name).toLowerCase();
    });

    if (!section) {
        alert("Section tidak ditemukan: " + name);
        return;
    }

    editorPlayheadTime = section.start;

    updatePlayheadLine();
    updateTimeDisplay();
}

function addSongSection() {
    const name = prompt("Nama section baru:", "Break");

    if (!name || !name.trim()) return;

    const startInput = prompt("Mulai di detik ke berapa?", Math.floor(editorPlayheadTime));

    const start = Number(startInput);

    if (isNaN(start) || start < 0) {
        alert("Waktu tidak valid.");
        return;
    }

    songSectionsV45.push({
        id: "section_" + Date.now(),
        name: name.trim(),
        start: start
    });

    songSectionsV45.sort(function (a, b) {
        return a.start - b.start;
    });

    renderSongSectionsV45();
}

function renderSongSectionsV45() {
    const bar = document.querySelector(".song-section-bar");
    if (!bar) return;

    bar.innerHTML = "";

    songSectionsV45.forEach(function (section) {
        const btn = document.createElement("button");

        btn.innerHTML =
            section.name +
            "<br><small>" +
            formatEditorTimeShort(section.start) +
            "</small>";

        btn.onclick = function () {
            setSongSection(section.name);
        };

        btn.oncontextmenu = function (e) {
            e.preventDefault();
            editSongSectionV45(section.id);
        };

        bar.appendChild(btn);
    });

    const addBtn = document.createElement("button");
    addBtn.innerHTML = "＋";
    addBtn.onclick = addSongSection;

    bar.appendChild(addBtn);
}

function editSongSectionV45(sectionId) {
    const section = songSectionsV45.find(s => s.id === sectionId);
    if (!section) return;

    const newName = prompt("Nama section:", section.name);
    if (!newName || !newName.trim()) return;

    const newStartInput = prompt("Mulai detik:", section.start);
    const newStart = Number(newStartInput);

    if (isNaN(newStart) || newStart < 0) {
        alert("Waktu tidak valid.");
        return;
    }

    section.name = newName.trim();
    section.start = newStart;

    songSectionsV45.sort((a, b) => a.start - b.start);
    renderSongSectionsV45();
}

function formatEditorTimeShort(seconds) {
    if (!seconds || !isFinite(seconds)) return "0:00";

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    return m + ":" + String(s).padStart(2, "0");
}

/* ===== TIMELINE RECORD ===== */

let timelineRecordsV4 = [];
let selectedTimelineRecordV4 = null;

function saveTimelineRecordV4() {
    const name = prompt(
        "Nama Timeline Record:",
        "Timeline Record " + (timelineRecordsV4.length + 1)
    );

    if (!name || !name.trim()) return;

    const record = {
        id: generateEditorId("timeline_record"),
        name: name.trim(),
        bpm: editorBpm,
        duration: getEditorSongDuration(),
        clips: JSON.parse(JSON.stringify(editorClips)),
        tracks: JSON.parse(JSON.stringify(editorTracks)),
        sections: JSON.parse(JSON.stringify(songSectionsV45)),
        loop: {
            enabled: loopAreaEnabledV4,
            start: loopStartTimeV4,
            end: loopEndTimeV4
        },
        createdAt: new Date().toISOString()
    };

    timelineRecordsV4.push(record);
    selectedTimelineRecordV4 = record.id;

    renderTimelineRecordListV4();
    refreshActiveTool();

    alert("Timeline berhasil disimpan dan siap dipindahkan ke Export.");
}

function renderTimelineRecordListV4() {
    const list = document.getElementById("timelineRecordListV4");
    if (!list) return;

    if (timelineRecordsV4.length === 0) {
        list.innerHTML = '<span class="empty-record">Belum ada rekam timeline</span>';
        return;
    }

    list.innerHTML = "";

    timelineRecordsV4.forEach(function (record, index) {
        const div = document.createElement("div");
        div.className = "timeline-record-item";

        if (record.id === selectedTimelineRecordV4) {
            div.classList.add("active");
        }

        div.innerHTML = `
            <strong>${index + 1}. ${record.name}</strong><br>
            <small>BPM: ${record.bpm} • Clip: ${record.clips.length} • Durasi: ${formatEditorTime(record.duration)}</small>
        `;

        div.onclick = function () {
            selectedTimelineRecordV4 = record.id;
            renderTimelineRecordListV4();
        };

        div.ondblclick = function () {
            loadTimelineRecordV4(record.id);
        };

        list.appendChild(div);
    });
}

function loadTimelineRecordV4(recordId) {
    const record = timelineRecordsV4.find(r => r.id === recordId);

    if (!record) {
        alert("Timeline Record tidak ditemukan.");
        return;
    }

    editorBpm = record.bpm;
    editorClips = JSON.parse(JSON.stringify(record.clips));
    editorTracks = JSON.parse(JSON.stringify(record.tracks));
    songSectionsV45 = JSON.parse(JSON.stringify(record.sections));

    if (record.loop) {
        loopAreaEnabledV4 = record.loop.enabled;
        loopStartTimeV4 = record.loop.start;
        loopEndTimeV4 = record.loop.end;
    }

    selectedTimelineRecordV4 = record.id;
    selectedEditorClipId = null;
    editorPlayheadTime = 0;

    rebuildTimelineTrackRowsV45();
    renderSongSectionsV45();
    renderEditorTimeline();
    updateEditorBpmText();
    updateLoopAreaStatusV4();
    updatePlayheadLine();
    updateTimeDisplay();
    renderTimelineRecordListV4();

    alert("Timeline dimuat: " + record.name);
}

function deleteSelectedTimelineRecordV4() {
    if (!selectedTimelineRecordV4) {
        alert("Pilih Timeline Record dulu.");
        return;
    }

    const yakin = confirm("Hapus Timeline Record ini?");
    if (!yakin) return;

    timelineRecordsV4 = timelineRecordsV4.filter(function (record) {
        return record.id !== selectedTimelineRecordV4;
    });

    selectedTimelineRecordV4 = timelineRecordsV4.length
        ? timelineRecordsV4[0].id
        : null;

    renderTimelineRecordListV4();
    refreshActiveTool();
}

function getSelectedTimelineRecordV4() {
    return timelineRecordsV4.find(function (record) {
        return record.id === selectedTimelineRecordV4;
    }) || null;
}

function getAllTimelineRecordsV4() {
    return timelineRecordsV4;
}

/* ===== REBUILD TRACK ROW ===== */

function rebuildTimelineTrackRowsV45() {
    const scroll = document.getElementById("timelineScroll");
    if (!scroll) return;

    scroll.innerHTML = '<div class="playhead-line" id="playheadLine"></div>';

    editorTracks.forEach(function (track) {
        const row = document.createElement("div");
        row.className = "timeline-track-row";

        row.innerHTML = `
            <div class="track-name" onclick="selectEditorTrack('${track.id}')">${track.name}</div>
            <div class="track-lane" data-track="${track.id}"></div>
        `;

        scroll.appendChild(row);
    });
}

/* ===== STATUS EXPORT ===== */

function isEditorReadyForExportV4() {
    return timelineRecordsV4.length > 0;
}

function getEditorExportStatusV4() {
    const record = getSelectedTimelineRecordV4();

    if (!record) {
        return {
            ready: false,
            message: "Belum ada Timeline Record untuk Export."
        };
    }

    return {
        ready: true,
        message: "Siap Export: " + record.name,
        record: record
    };
}

/* Override status tool agar membaca Timeline Record */
function renderStatusToolHTML() {
    const duration = getEditorSongDuration();
    const selected = getSelectedEditorClip();
    const exportStatus = getEditorExportStatusV4();

    return `
        <div class="editor-status-box">
            <p>${exportStatus.ready ? "✔" : "⚠"} ${exportStatus.message}</p>
            <p>Track: ${editorTracks.length}</p>
            <p>Clip: ${editorClips.length}</p>
            <p>Timeline Record: ${timelineRecordsV4.length}</p>
            <p>Durasi: ${formatEditorTime(duration)}</p>
            <p>BPM: ${editorBpm}</p>
            <p>Clip Terpilih: ${selected ? selected.name : "Belum ada"}</p>
        </div>
    `;
}

/* Override Timeline Tool */
function renderTimelineToolHTML() {
    return `
        <div class="tool-button-grid">
            <button onclick="saveTimelineRecordV4()">💾 Save Timeline</button>
            <button onclick="loadSelectedTimelineRecordFromTool()">📂 Load Timeline</button>
            <button onclick="deleteSelectedTimelineRecordV4()">🗑 Delete Timeline</button>
            <button onclick="clearTimeline()">🗑 Clear Current</button>
        </div>
    `;
}

function loadSelectedTimelineRecordFromTool() {
    if (!selectedTimelineRecordV4) {
        alert("Pilih Timeline Record dari list dulu.");
        return;
    }

    loadTimelineRecordV4(selectedTimelineRecordV4);
}

/* ===== INIT TAHAP 4 ===== */

document.addEventListener("DOMContentLoaded", function () {
    renderSongSectionsV45();
    updateLoopAreaStatusV4();
    renderTimelineRecordListV4();
});
/* =========================================
   EDITOR MUSIK V4.5 - TAHAP 5
   Export Bridge + Project Bridge + Compatibility
========================================= */

/* ===== EXPORT BRIDGE ===== */

function getTimelineRecordsForExportV4() {
    return timelineRecordsV4.map(function (record) {
        return {
            id: record.id,
            name: record.name,
            bpm: record.bpm,
            duration: record.duration,
            clips: record.clips,
            tracks: record.tracks,
            sections: record.sections,
            loop: record.loop,
            createdAt: record.createdAt
        };
    });
}

function getSelectedTimelineRecordForExportV4() {
    const record = getSelectedTimelineRecordV4();

    if (!record) {
        return null;
    }

    return {
        id: record.id,
        name: record.name,
        bpm: record.bpm,
        duration: record.duration,
        clips: record.clips,
        tracks: record.tracks,
        sections: record.sections,
        loop: record.loop,
        createdAt: record.createdAt
    };
}

/* fungsi ini bisa dipanggil export.js */
function refreshExportTimelineRecordsV4() {
    const list = document.getElementById("exportTimelineListV4");
    if (!list) return;

    const records = getTimelineRecordsForExportV4();

    if (records.length === 0) {
        list.innerHTML = '<span class="empty-record">Belum ada Timeline Record</span>';
        return;
    }

    list.innerHTML = "";

    records.forEach(function (record, index) {
        const div = document.createElement("div");
        div.className = "export-timeline-item";

        if (record.id === selectedTimelineRecordV4) {
            div.classList.add("active");
        }

        div.innerHTML = `
            <strong>${index + 1}. ${record.name}</strong><br>
            <small>BPM: ${record.bpm} • Clip: ${record.clips.length} • Durasi: ${formatEditorTime(record.duration)}</small>
        `;

        div.onclick = function () {
            selectedTimelineRecordV4 = record.id;
            renderTimelineRecordListV4();
            refreshExportTimelineRecordsV4();
            updateExportSelectedInfoV4();
        };

        list.appendChild(div);
    });

    updateExportSelectedInfoV4();
}

function updateExportSelectedInfoV4() {
    const info = document.getElementById("exportSelectedInfoV4");
    if (!info) return;

    const record = getSelectedTimelineRecordV4();

    if (!record) {
        info.innerHTML = "Belum memilih Timeline Record";
        return;
    }

    info.innerHTML =
        "Dipilih: " + record.name +
        " • BPM: " + record.bpm +
        " • Clip: " + record.clips.length +
        " • Durasi: " + formatEditorTime(record.duration);
}

/* ===== PROJECT BRIDGE ===== */

function getEditorProjectDataV45() {
    return {
        version: "4.5",
        bpm: editorBpm,
        page: editorPage,
        totalPage: editorTotalPage,
        zoom: editorZoom,
        playhead: editorPlayheadTime,

        tracks: JSON.parse(JSON.stringify(editorTracks)),
        clips: JSON.parse(JSON.stringify(editorClips)),
        sections: JSON.parse(JSON.stringify(songSectionsV45)),

        loop: {
            enabled: loopAreaEnabledV4,
            start: loopStartTimeV4,
            end: loopEndTimeV4
        },

        timelineRecords: JSON.parse(JSON.stringify(timelineRecordsV4)),
        selectedTimelineRecord: selectedTimelineRecordV4,

        patterns: JSON.parse(JSON.stringify(editorPatterns || []))
    };
}

function restoreEditorProjectDataV45(data) {
    if (!data) return;

    editorBpm = data.bpm || 120;
    editorPage = data.page || 1;
    editorTotalPage = data.totalPage || 8;
    editorZoom = data.zoom || 1;
    editorPlayheadTime = data.playhead || 0;

    editorTracks = Array.isArray(data.tracks)
        ? data.tracks
        : editorTracks;

    editorClips = Array.isArray(data.clips)
        ? data.clips
        : [];

    songSectionsV45 = Array.isArray(data.sections)
        ? data.sections
        : songSectionsV45;

    if (data.loop) {
        loopAreaEnabledV4 = !!data.loop.enabled;
        loopStartTimeV4 = data.loop.start || 0;
        loopEndTimeV4 = data.loop.end || 20;
    }

    timelineRecordsV4 = Array.isArray(data.timelineRecords)
        ? data.timelineRecords
        : [];

    selectedTimelineRecordV4 = data.selectedTimelineRecord || null;

    editorPatterns = Array.isArray(data.patterns)
        ? data.patterns
        : [];

    selectedEditorClipId = null;

    rebuildTimelineTrackRowsV45();
    renderSongSectionsV45();
    renderEditorTimeline();
    renderTimelineRecordListV4();

    updateEditorBpmText();
    updateEditorPageText();
    updateLoopAreaStatusV4();
    updatePlayheadLine();
    updateTimeDisplay();
    refreshActiveTool();

    if (typeof refreshExportTimelineRecordsV4 === "function") {
        refreshExportTimelineRecordsV4();
    }
}

/* ===== SAVE / LOAD PROJECT JSON FALLBACK ===== */

function saveProject() {
    const project = {
        app: "Musik Studio Lite",
        version: "4.5",
        savedAt: new Date().toISOString(),
        editor: getEditorProjectDataV45()
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "musik-studio-lite-v45-project.json";
    a.click();

    URL.revokeObjectURL(url);
}

function loadProjectClick() {
    const input = document.getElementById("loadProjectInput");
    if (!input) {
        alert("Input loadProjectInput tidak ditemukan.");
        return;
    }

    input.click();
}

document.addEventListener("DOMContentLoaded", function () {
    const input = document.getElementById("loadProjectInput");

    if (input) {
        input.addEventListener("change", function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = function () {
                try {
                    const data = JSON.parse(reader.result);

                    if (data.editor) {
                        restoreEditorProjectDataV45(data.editor);
                    } else {
                        restoreEditorProjectDataV45(data);
                    }

                    alert("Project berhasil dimuat.");
                } catch (err) {
                    alert("Gagal membaca project JSON.");
                    console.error(err);
                }
            };

            reader.readAsText(file);
            e.target.value = "";
        });
    }
});

/* ===== PANEL COMPATIBILITY ===== */
/*
   Fungsi-fungsi ini dipakai panel lain agar aman mengirim data ke Editor Musik.
*/

function addDrumRecordToEditor(record) {
    return addClipToTimeline({
        type: "drum",
        source: "drum",
        name: record?.name || "Drum Record",
        events: record?.events || [],
        notes: record?.notes || [],
        start: record?.start || editorPlayheadTime || 0,
        duration: record?.duration || 8
    });
}

function addPianoRecordToEditor(record) {
    return addClipToTimeline({
        type: "piano",
        source: "piano",
        name: record?.name || "Piano Record",
        events: record?.events || [],
        notes: record?.notes || [],
        start: record?.start || editorPlayheadTime || 0,
        duration: record?.duration || 8
    });
}

function addGuitarRecordToEditor(record) {
    return addClipToTimeline({
        type: "guitar",
        source: "guitar",
        name: record?.name || "Guitar Record",
        events: record?.events || [],
        notes: record?.notes || [],
        start: record?.start || editorPlayheadTime || 0,
        duration: record?.duration || 8
    });
}

function addBassRecordToEditor(record) {
    return addClipToTimeline({
        type: "bass",
        source: "bass",
        name: record?.name || "Bass Record",
        events: record?.events || [],
        notes: record?.notes || [],
        start: record?.start || editorPlayheadTime || 0,
        duration: record?.duration || 8
    });
}

function addVocalRecordToEditor(record) {
    return addClipToTimeline({
        type: "vocal",
        source: "vocal",
        name: record?.name || "Vocal Record",
        url: record?.url || null,
        start: record?.start || editorPlayheadTime || 0,
        duration: record?.duration || 8
    });
}

function addFxRecordToEditor(record) {
    return addClipToTimeline({
        type: "fx",
        source: "fx",
        name: record?.name || "FX Record",
        url: record?.url || null,
        start: record?.start || editorPlayheadTime || 0,
        duration: record?.duration || 4
    });
}

function addMidiRecordToEditor(record) {
    return addClipToTimeline({
        type: "midi",
        source: "midi",
        name: record?.name || "MIDI Record",
        notes: record?.notes || [],
        events: record?.events || [],
        start: record?.start || editorPlayheadTime || 0,
        duration: record?.duration || 8
    });
}

function addImportAudioToEditor(item) {
    return addClipToTimeline({
        type: "import",
        source: "import",
        name: item?.trackName || item?.name || "Import Audio",
        fileName: item?.name || "",
        url: item?.url || null,
        start: item?.start || editorPlayheadTime || 0,
        duration: item?.duration || 8,
        volume: item?.volume ?? 1,
        pan: item?.pan ?? 0
    });
}

/* ===== EXPORT HISTORY BRIDGE OPTIONAL ===== */

function markTimelineRecordExportedV45(recordId, format) {
    const record = timelineRecordsV4.find(r => r.id === recordId);
    if (!record) return;

    record.exported = true;
    record.exportFormat = format || "audio";
    record.exportedAt = new Date().toISOString();

    renderTimelineRecordListV4();
    refreshExportTimelineRecordsV4();
}

/* ===== SAFETY INIT ===== */

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        renderEditorTimeline();
        renderTimelineRecordListV4();

        if (typeof refreshExportTimelineRecordsV4 === "function") {
            refreshExportTimelineRecordsV4();
        }
    }, 100);
});
/* =========================================
   EDITOR MUSIK V4.5 - TAHAP 6
   Timeline Page System 8 Menit
========================================= */

/* ===== PAGE CONFIG ===== */

editorPage = editorPage || 1;
editorTotalPage = editorTotalPage || 8;

let editorPageDurationV45 = 60; // 1 halaman = 60 detik
let editorMaxDurationV45 = editorTotalPage * editorPageDurationV45;

/* ===== GET PAGE TIME ===== */

function getEditorPageStartTimeV45() {
    return (editorPage - 1) * editorPageDurationV45;
}

function getEditorPageEndTimeV45() {
    return editorPage * editorPageDurationV45;
}

/* ===== UPDATE PAGE TEXT ===== */

function updateEditorPageText() {
    const pageText = document.getElementById("pageText");

    if (pageText) {
        pageText.innerHTML = editorPage + "/" + editorTotalPage;
    }
}

/* ===== PAGE BUTTON ===== */

function prevStepPage() {
    if (editorPage > 1) {
        editorPage--;
    }

    renderEditorTimeline();
    updateEditorPageText();
    updatePlayheadLine();
}

function nextStepPage() {
    if (editorPage < editorTotalPage) {
        editorPage++;
    }

    renderEditorTimeline();
    updateEditorPageText();
    updatePlayheadLine();
}

/* ===== GO TO PAGE BY TIME ===== */

function setEditorPageByTimeV45(time) {
    let page = Math.floor(time / editorPageDurationV45) + 1;

    if (page < 1) page = 1;
    if (page > editorTotalPage) page = editorTotalPage;

    if (page !== editorPage) {
        editorPage = page;
        updateEditorPageText();
        renderEditorTimeline();
    }
}

/* ===== RENDER TIMELINE PER PAGE ===== */

function renderEditorTimeline() {
    renderEditorTracks();
    renderEditorClipsByPageV45();
    updatePlayheadLine();
}

function renderEditorClipsByPageV45() {
    const pageStart = getEditorPageStartTimeV45();
    const pageEnd = getEditorPageEndTimeV45();

    editorClips.forEach(function (clip) {
        const clipStart = Number(clip.start || 0);
        const clipDuration = Number(clip.duration || 1);
        const clipEnd = clipStart + clipDuration;

        if (clipEnd <= pageStart || clipStart >= pageEnd) {
            return;
        }

        const lane = document.querySelector(
            `.track-lane[data-track="${clip.trackId}"]`
        );

        if (!lane) return;

        const visibleStart = Math.max(clipStart, pageStart);
        const visibleEnd = Math.min(clipEnd, pageEnd);

        const localStart = visibleStart - pageStart;
        const visibleDuration = visibleEnd - visibleStart;

        const clipEl = document.createElement("div");
        clipEl.className = "editor-clip";

        if (clip.id === selectedEditorClipId) {
            clipEl.classList.add("selected");
        }

        clipEl.dataset.clipId = clip.id;
        clipEl.dataset.trackId = clip.trackId;

        clipEl.style.left = timeToPixel(localStart) + "px";
        clipEl.style.width = Math.max(40, timeToPixel(visibleDuration)) + "px";

        if (clip.color) {
            clipEl.style.background = clip.color;
        }

        clipEl.innerHTML = `
            <div class="editor-clip-name">${clip.name}</div>
            <div class="editor-clip-wave">${getClipVisual(clip)}</div>
        `;

        clipEl.onclick = function (e) {
            e.stopPropagation();
            selectEditorClip(clip.id);
        };

        clipEl.onpointerdown = function (e) {
            if (typeof startDragEditorClip === "function") {
                startDragEditorClip(e, clip.id);
            }
        };

        lane.appendChild(clipEl);
    });
}

/* ===== UPDATE PLAYHEAD PER PAGE ===== */

function updatePlayheadLine() {
    const playhead = document.getElementById("playheadLine");
    if (!playhead) return;

    const pageStart = getEditorPageStartTimeV45();
    const pageEnd = getEditorPageEndTimeV45();

    if (editorPlayheadTime < pageStart || editorPlayheadTime >= pageEnd) {
        playhead.style.display = "none";
        return;
    }

    playhead.style.display = "block";

    const localTime = editorPlayheadTime - pageStart;
    playhead.style.left = timeToPixel(localTime) + "px";
}

/* ===== PLAY TIMELINE FINAL ===== */

function playTimeline() {
    if (editorIsPlaying) return;

    editorIsPlaying = true;

    const startRealTime = Date.now();
    const startPlayhead = editorPlayheadTime;

    if (editorPlayTimer) {
        clearInterval(editorPlayTimer);
    }

    editorPlayTimer = setInterval(function () {
        const elapsed = (Date.now() - startRealTime) / 1000;
        editorPlayheadTime = startPlayhead + elapsed;

        if (loopAreaEnabledV4 && editorPlayheadTime >= loopEndTimeV4) {
            editorPlayheadTime = loopStartTimeV4;
        }

        if (editorPlayheadTime >= editorMaxDurationV45) {
            stopTimeline();
            return;
        }

        setEditorPageByTimeV45(editorPlayheadTime);
        updatePlayheadLine();
        updateTimeDisplay();

        if (!loopAreaEnabledV4) {
            const maxTime = getEditorSongDuration();

            if (editorPlayheadTime >= maxTime && maxTime > 0) {
                stopTimeline();
            }
        }

    }, 30);
}

/* ===== PAUSE FINAL ===== */

function pauseTimeline() {
    editorIsPlaying = false;

    if (editorPlayTimer) {
        clearInterval(editorPlayTimer);
        editorPlayTimer = null;
    }
}

/* ===== STOP FINAL ===== */

function stopTimeline() {
    editorIsPlaying = false;
    editorPlayheadTime = 0;
    editorPage = 1;

    if (editorPlayTimer) {
        clearInterval(editorPlayTimer);
        editorPlayTimer = null;
    }

    renderEditorTimeline();
    updateEditorPageText();
    updatePlayheadLine();
    updateTimeDisplay();
}

/* ===== MOVE CLIP FIX PAGE-AWARE ===== */

function startDragEditorClip(e, clipId) {
    const clip = editorClips.find(c => c.id === clipId);
    if (!clip || clip.locked) return;

    isDraggingClip = true;
    dragClipId = clipId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOriginalStart = clip.start;
    dragOriginalTrack = clip.trackId;

    selectedEditorClipId = clipId;

    document.onpointermove = dragEditorClipMove;
    document.onpointerup = stopDragEditorClip;

    e.preventDefault();
}

function dragEditorClipMove(e) {
    if (!isDraggingClip || !dragClipId) return;

    const clip = editorClips.find(c => c.id === dragClipId);
    if (!clip) return;

    const deltaX = e.clientX - dragStartX;
    const pageStart = getEditorPageStartTimeV45();
    const timeMove = pixelToTime(deltaX);

    clip.start = Math.max(0, dragOriginalStart + timeMove);

    if (clip.start > editorMaxDurationV45 - 1) {
        clip.start = editorMaxDurationV45 - 1;
    }

    const newTrack = detectTrackByY(e.clientY);
    if (newTrack) {
        clip.trackId = newTrack;
    }

    renderEditorTimeline();
    updateEditorInfo();
}

/* ===== ADD CLIP PAGE-AWARE ===== */

const oldAddClipToTimelineV45 = addClipToTimeline;

addClipToTimeline = function (clipData) {
    if (!clipData) return;

    if (typeof clipData.start === "undefined") {
        clipData.start = editorPlayheadTime || getEditorPageStartTimeV45();
    }

    const clip = oldAddClipToTimelineV45(clipData);

    if (clip && typeof clip.start === "number") {
        setEditorPageByTimeV45(clip.start);
    }

    renderEditorTimeline();
    updateEditorPageText();

    return clip;
};

/* ===== SONG SECTION PAGE-AWARE ===== */

const oldSetSongSectionV45 = setSongSection;

setSongSection = function (name) {
    oldSetSongSectionV45(name);
    setEditorPageByTimeV45(editorPlayheadTime);
    updatePlayheadLine();
};

/* ===== INIT TAHAP 6 ===== */

document.addEventListener("DOMContentLoaded", function () {
    updateEditorPageText();
    renderEditorTimeline();
    updatePlayheadLine();
});
/* =========================================
   EDITOR MUSIK V4.5 - BPM FIX FINAL
========================================= */

/* ===== BPM FINAL ===== */

function changeBpm(amount) {
    amount = Number(amount) || 0;

    editorBpm += amount;

    if (editorBpm < 40) editorBpm = 40;
    if (editorBpm > 240) editorBpm = 240;

    updateEditorBpmText();

    if (typeof setTimelineBpm === "function") {
        setTimelineBpm(editorBpm);
    }

    if (typeof changeMidiBpm === "function") {
        /* MIDI tidak diubah otomatis agar tidak dobel +5 */
    }

    updateEditorInfo();
}

/* ===== SET BPM MANUAL ===== */

function setEditorBpm(value) {
    editorBpm = Number(value) || 120;

    if (editorBpm < 40) editorBpm = 40;
    if (editorBpm > 240) editorBpm = 240;

    updateEditorBpmText();

    if (typeof setTimelineBpm === "function") {
        setTimelineBpm(editorBpm);
    }
}

/* ===== UPDATE BPM TEXT FINAL ===== */

function updateEditorBpmText() {
    const bpmText = document.getElementById("bpmText");

    if (bpmText) {
        bpmText.innerHTML = editorBpm + " BPM";
    }
}

/* ===== INIT BPM FINAL ===== */

document.addEventListener("DOMContentLoaded", function () {
    updateEditorBpmText();
});
