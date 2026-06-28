/* =========================================
   TOOL.JS V4.5 - TAHAP 1
   Tool Manager Editor Musik
========================================= */

/* ===== STATUS TOOL ===== */

let activeTool = null;
let toolOpened = false;

/* ===== BUKA TOOL ===== */

function openEditorTool(toolName) {

    const panel = document.getElementById("editorToolPanel");
    const title = document.getElementById("editorToolTitle");
    const content = document.getElementById("editorToolContent");

    if (!panel || !title || !content) return;

    toolOpened = true;
    activeTool = toolName;

    panel.style.display = "block";

    switch (toolName) {

        case "clip":
            title.innerHTML = "🎵 Tool Clip";
            content.innerHTML = "Memuat Tool Clip...";
            break;

        case "track":
            title.innerHTML = "🎼 Tool Track";
            content.innerHTML = "Memuat Tool Track...";
            break;

        case "pattern":
            title.innerHTML = "📋 Tool Pattern";
            content.innerHTML = "Memuat Tool Pattern...";
            break;

        case "timeline":
            title.innerHTML = "📄 Tool Timeline";
            content.innerHTML = "Memuat Tool Timeline...";
            break;

        case "status":
            title.innerHTML = "📊 Status";
            content.innerHTML = "Memuat Status...";
            break;

        default:
            title.innerHTML = "Tool";
            content.innerHTML = "Tool tidak ditemukan.";
            break;
    }

    updateToolStatus();

}

/* ===== TUTUP TOOL ===== */

function closeEditorTool() {

    const panel = document.getElementById("editorToolPanel");

    if (!panel) return;

    panel.style.display = "none";

    activeTool = null;
    toolOpened = false;

    updateToolStatus();

}

/* ===== GANTI JUDUL TOOL ===== */

function setToolTitle(text) {

    const title = document.getElementById("editorToolTitle");

    if (!title) return;

    title.innerHTML = text;

}

/* ===== GANTI ISI TOOL ===== */

function setToolContent(html) {

    const content = document.getElementById("editorToolContent");

    if (!content) return;

    content.innerHTML = html;

}

/* ===== REFRESH TOOL ===== */

function refreshCurrentTool() {

    if (!toolOpened) return;

    openEditorTool(activeTool);

}

/* ===== STATUS TOOL ===== */

function updateToolStatus() {

    console.log("========== TOOL ==========");
    console.log("Aktif :", activeTool);
    console.log("Terbuka :", toolOpened);

}

/* ===== GET TOOL ===== */

function getCurrentTool() {
    return activeTool;
}

function isToolOpened() {
    return toolOpened;
}

/* ===== TOGGLE TOOL ===== */

function toggleEditorTool(toolName) {

    if (toolOpened && activeTool === toolName) {

        closeEditorTool();

    } else {

        openEditorTool(toolName);

    }

}

/* ===== INIT ===== */

document.addEventListener("DOMContentLoaded", function () {

    closeEditorTool();

});
/* =========================================
   TOOL.JS V4.5 - TAHAP 2
   Tool Clip
========================================= */

/* ===== OVERRIDE OPEN TOOL UNTUK CLIP ===== */

function openEditorTool(toolName) {

    const panel = document.getElementById("editorToolPanel");
    const title = document.getElementById("editorToolTitle");
    const content = document.getElementById("editorToolContent");

    if (!panel || !title || !content) return;

    toolOpened = true;
    activeTool = toolName;

    panel.style.display = "block";

    if (toolName === "clip") {
        title.innerHTML = "🎵 Tool Clip";
        content.innerHTML = getClipToolHTML();
    } else if (toolName === "track") {
        title.innerHTML = "🎼 Tool Track";
        content.innerHTML = "Memuat Tool Track...";
    } else if (toolName === "pattern") {
        title.innerHTML = "📋 Tool Pattern";
        content.innerHTML = "Memuat Tool Pattern...";
    } else if (toolName === "timeline") {
        title.innerHTML = "📄 Tool Timeline";
        content.innerHTML = "Memuat Tool Timeline...";
    } else if (toolName === "status") {
        title.innerHTML = "📊 Status";
        content.innerHTML = "Memuat Status...";
    } else {
        title.innerHTML = "Tool";
        content.innerHTML = "Tool tidak ditemukan.";
    }

    updateToolStatus();
}

/* ===== HTML TOOL CLIP ===== */

function getClipToolHTML() {
    return `
        <div class="tool-button-grid">

            <button onclick="toolCutClip()">✂ Cut</button>
            <button onclick="toolCopyClip()">📋 Copy</button>
            <button onclick="toolPasteClip()">📌 Paste</button>
            <button onclick="toolDeleteClip()">🗑 Delete</button>

            <button onclick="toolMoveClipLeft()">⬅ Move</button>
            <button onclick="toolMoveClipRight()">➡ Move</button>
            <button onclick="toolMoveClipUp()">⬆ Track</button>
            <button onclick="toolMoveClipDown()">⬇ Track</button>

            <button onclick="toolResizeClipShort()">📏 Short</button>
            <button onclick="toolResizeClipLong()">📏 Long</button>
            <button onclick="toolSplitClip()">✂ Split</button>
            <button onclick="toolDuplicateClip()">📑 Duplicate</button>

            <button onclick="toolVolumeDown()">🔉 Vol -</button>
            <button onclick="toolVolumeUp()">🔊 Vol +</button>
            <button onclick="toolPanLeft()">⬅ Pan</button>
            <button onclick="toolPanRight()">➡ Pan</button>

            <button onclick="toolReverseClip()">🔁 Reverse</button>
            <button onclick="toolRenameClip()">✏ Rename</button>

        </div>
    `;
}

/* ===== CUT / COPY / PASTE / DELETE ===== */

function toolCutClip() {
    if (typeof cutSelectedClip === "function") {
        cutSelectedClip();
    } else {
        alert("Fungsi cutSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

function toolCopyClip() {
    if (typeof copySelectedClip === "function") {
        copySelectedClip();
    } else {
        alert("Fungsi copySelectedClip belum ada.");
    }
    refreshCurrentTool();
}

function toolPasteClip() {
    if (typeof pasteClip === "function") {
        pasteClip();
    } else {
        alert("Fungsi pasteClip belum ada.");
    }
    refreshCurrentTool();
}

function toolDeleteClip() {
    if (typeof deleteSelectedClip === "function") {
        deleteSelectedClip();
    } else {
        alert("Fungsi deleteSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

/* ===== MOVE CLIP ===== */

function toolMoveClipLeft() {
    if (typeof moveSelectedClip === "function") {
        moveSelectedClip(-1);
    } else {
        alert("Fungsi moveSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

function toolMoveClipRight() {
    if (typeof moveSelectedClip === "function") {
        moveSelectedClip(1);
    } else {
        alert("Fungsi moveSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

function toolMoveClipUp() {
    if (typeof moveSelectedClipTrack === "function") {
        moveSelectedClipTrack(-1);
    } else {
        alert("Fungsi moveSelectedClipTrack belum ada.");
    }
    refreshCurrentTool();
}

function toolMoveClipDown() {
    if (typeof moveSelectedClipTrack === "function") {
        moveSelectedClipTrack(1);
    } else {
        alert("Fungsi moveSelectedClipTrack belum ada.");
    }
    refreshCurrentTool();
}

/* ===== RESIZE / SPLIT / DUPLICATE ===== */

function toolResizeClipShort() {
    if (typeof resizeSelectedClip === "function") {
        resizeSelectedClip(-1);
    } else {
        alert("Fungsi resizeSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

function toolResizeClipLong() {
    if (typeof resizeSelectedClip === "function") {
        resizeSelectedClip(1);
    } else {
        alert("Fungsi resizeSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

function toolSplitClip() {
    if (typeof splitSelectedClip === "function") {
        splitSelectedClip();
    } else {
        alert("Fungsi splitSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

function toolDuplicateClip() {
    if (typeof duplicateSelectedClip === "function") {
        duplicateSelectedClip();
    } else {
        alert("Fungsi duplicateSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

/* ===== VOLUME / PAN ===== */

function toolVolumeDown() {
    if (typeof changeSelectedClipVolume === "function") {
        changeSelectedClipVolume(-0.1);
    } else {
        alert("Fungsi changeSelectedClipVolume belum ada.");
    }
    refreshCurrentTool();
}

function toolVolumeUp() {
    if (typeof changeSelectedClipVolume === "function") {
        changeSelectedClipVolume(0.1);
    } else {
        alert("Fungsi changeSelectedClipVolume belum ada.");
    }
    refreshCurrentTool();
}

function toolPanLeft() {
    if (typeof changeSelectedClipPan === "function") {
        changeSelectedClipPan(-0.1);
    } else {
        alert("Fungsi changeSelectedClipPan belum ada.");
    }
    refreshCurrentTool();
}

function toolPanRight() {
    if (typeof changeSelectedClipPan === "function") {
        changeSelectedClipPan(0.1);
    } else {
        alert("Fungsi changeSelectedClipPan belum ada.");
    }
    refreshCurrentTool();
}

/* ===== REVERSE / RENAME ===== */

function toolReverseClip() {
    if (typeof reverseSelectedClip === "function") {
        reverseSelectedClip();
    } else {
        alert("Fungsi reverseSelectedClip belum ada.");
    }
    refreshCurrentTool();
}

function toolRenameClip() {
    if (typeof renameSelectedClip === "function") {
        renameSelectedClip();
    } else {
        alert("Fungsi renameSelectedClip belum ada.");
    }
    refreshCurrentTool();
}
/* =========================================
   TOOL.JS V4.5 - TAHAP 3
   Tool Track + Tool Pattern
========================================= */

/* ===== OVERRIDE OPEN TOOL TAHAP 3 ===== */

function openEditorTool(toolName) {

    const panel = document.getElementById("editorToolPanel");
    const title = document.getElementById("editorToolTitle");
    const content = document.getElementById("editorToolContent");

    if (!panel || !title || !content) return;

    toolOpened = true;
    activeTool = toolName;

    panel.style.display = "block";

    if (toolName === "clip") {

        title.innerHTML = "🎵 Tool Clip";
        content.innerHTML = getClipToolHTML();

    } else if (toolName === "track") {

        title.innerHTML = "🎼 Tool Track";
        content.innerHTML = getTrackToolHTML();

    } else if (toolName === "pattern") {

        title.innerHTML = "📋 Tool Pattern";
        content.innerHTML = getPatternToolHTML();

    } else if (toolName === "timeline") {

        title.innerHTML = "📄 Tool Timeline";
        content.innerHTML = "Memuat Tool Timeline...";

    } else if (toolName === "status") {

        title.innerHTML = "📊 Status";
        content.innerHTML = "Memuat Status...";

    } else {

        title.innerHTML = "Tool";
        content.innerHTML = "Tool tidak ditemukan.";

    }

    updateToolStatus();
}

/* =========================================
   TOOL TRACK HTML
========================================= */

function getTrackToolHTML() {
    return `
        <div class="tool-button-grid">

            <button onclick="toolAddTrack()">➕ Add Track</button>
            <button onclick="toolRenameTrack()">✏ Rename</button>
            <button onclick="toolDeleteTrack()">🗑 Delete</button>

            <button onclick="toolMuteTrack()">🔇 Mute</button>
            <button onclick="toolSoloTrack()">🎧 Solo</button>
            <button onclick="toolLockTrack()">🔒 Lock</button>

        </div>
    `;
}

/* ===== TRACK ACTION ===== */

function toolAddTrack() {
    if (typeof addCustomTrack === "function") {
        addCustomTrack();
    } else {
        alert("Fungsi addCustomTrack belum ada.");
    }

    refreshCurrentTool();
}

function toolRenameTrack() {
    if (typeof renameSelectedTrack === "function") {
        renameSelectedTrack();
    } else {
        alert("Fungsi renameSelectedTrack belum ada.");
    }

    refreshCurrentTool();
}

function toolDeleteTrack() {
    if (typeof deleteSelectedTrack === "function") {
        deleteSelectedTrack();
    } else {
        alert("Fungsi deleteSelectedTrack belum ada.");
    }

    refreshCurrentTool();
}

function toolMuteTrack() {
    if (typeof muteSelectedTrack === "function") {
        muteSelectedTrack();
    } else {
        alert("Fungsi muteSelectedTrack belum ada.");
    }

    refreshCurrentTool();
}

function toolSoloTrack() {
    if (typeof soloSelectedTrack === "function") {
        soloSelectedTrack();
    } else {
        alert("Fungsi soloSelectedTrack belum ada.");
    }

    refreshCurrentTool();
}

function toolLockTrack() {
    if (typeof lockSelectedTrack === "function") {
        lockSelectedTrack();
    } else {
        alert("Fungsi lockSelectedTrack belum ada.");
    }

    refreshCurrentTool();
}

/* =========================================
   TOOL PATTERN HTML
========================================= */

function getPatternToolHTML() {
    return `
        <div class="tool-button-grid">

            <button onclick="toolSavePattern()">💾 Save Pattern</button>
            <button onclick="toolLoadPattern()">📂 Load Pattern</button>
            <button onclick="toolCopyPattern()">📋 Copy Pattern</button>
            <button onclick="toolPastePattern()">📌 Paste Pattern</button>
            <button onclick="toolDeletePattern()">🗑 Delete Pattern</button>

        </div>

        <div class="tool-info-box">
            Pattern dipakai untuk menyimpan susunan clip sementara.
        </div>
    `;
}

/* ===== PATTERN ACTION ===== */

function toolSavePattern() {
    if (typeof savePatternFromTimeline === "function") {
        savePatternFromTimeline();
    } else {
        alert("Fungsi savePatternFromTimeline belum ada.");
    }

    refreshCurrentTool();
}

function toolLoadPattern() {
    if (typeof loadPatternToTimeline === "function") {
        loadPatternToTimeline();
    } else {
        alert("Fungsi loadPatternToTimeline belum ada.");
    }

    refreshCurrentTool();
}

function toolCopyPattern() {
    if (typeof copyPattern === "function") {
        copyPattern();
    } else {
        alert("Fungsi copyPattern belum ada.");
    }

    refreshCurrentTool();
}

function toolPastePattern() {
    if (typeof pastePattern === "function") {
        pastePattern();
    } else {
        alert("Fungsi pastePattern belum ada.");
    }

    refreshCurrentTool();
}

function toolDeletePattern() {
    if (typeof deletePattern === "function") {
        deletePattern();
    } else {
        alert("Fungsi deletePattern belum ada.");
    }

    refreshCurrentTool();
}
/* =========================================
   TOOL.JS V4.5 - TAHAP 4
   Tool Timeline + Tool Status
========================================= */

/* ===== OVERRIDE OPEN TOOL TAHAP 4 ===== */

function openEditorTool(toolName) {

    const panel = document.getElementById("editorToolPanel");
    const title = document.getElementById("editorToolTitle");
    const content = document.getElementById("editorToolContent");

    if (!panel || !title || !content) return;

    toolOpened = true;
    activeTool = toolName;

    panel.style.display = "block";

    if (toolName === "clip") {

        title.innerHTML = "🎵 Tool Clip";
        content.innerHTML = getClipToolHTML();

    } else if (toolName === "track") {

        title.innerHTML = "🎼 Tool Track";
        content.innerHTML = getTrackToolHTML();

    } else if (toolName === "pattern") {

        title.innerHTML = "📋 Tool Pattern";
        content.innerHTML = getPatternToolHTML();

    } else if (toolName === "timeline") {

        title.innerHTML = "📄 Tool Timeline";
        content.innerHTML = getTimelineToolHTML();

    } else if (toolName === "status") {

        title.innerHTML = "📊 Status";
        content.innerHTML = getStatusToolHTML();

    } else {

        title.innerHTML = "Tool";
        content.innerHTML = "Tool tidak ditemukan.";

    }

    updateToolStatus();
}

/* =========================================
   TOOL TIMELINE HTML
========================================= */

function getTimelineToolHTML() {
    return `
        <div class="tool-button-grid">

            <button onclick="toolSaveTimeline()">💾 Save Timeline</button>
            <button onclick="toolLoadTimeline()">📂 Load Timeline</button>
            <button onclick="toolDeleteTimeline()">🗑 Delete Timeline</button>
            <button onclick="toolClearTimeline()">🧹 Clear Current</button>

        </div>

        <div class="tool-info-box">
            Timeline digunakan untuk menyimpan susunan lagu sebelum masuk ke Export.
        </div>
    `;
}

/* ===== TIMELINE ACTION ===== */

function toolSaveTimeline() {
    if (typeof saveTimelineRecordV4 === "function") {
        saveTimelineRecordV4();
    } else {
        alert("Fungsi saveTimelineRecordV4 belum ada.");
    }

    refreshCurrentTool();
}

function toolLoadTimeline() {
    if (typeof loadSelectedTimelineRecordFromTool === "function") {
        loadSelectedTimelineRecordFromTool();
    } else {
        alert("Fungsi loadSelectedTimelineRecordFromTool belum ada.");
    }

    refreshCurrentTool();
}

function toolDeleteTimeline() {
    if (typeof deleteSelectedTimelineRecordV4 === "function") {
        deleteSelectedTimelineRecordV4();
    } else {
        alert("Fungsi deleteSelectedTimelineRecordV4 belum ada.");
    }

    refreshCurrentTool();
}

function toolClearTimeline() {
    if (typeof clearTimeline === "function") {
        clearTimeline();
    } else {
        alert("Fungsi clearTimeline belum ada.");
    }

    refreshCurrentTool();
}

/* =========================================
   TOOL STATUS HTML
========================================= */

function getStatusToolHTML() {

    let trackCount = 0;
    let clipCount = 0;
    let duration = "00:00.00";
    let bpm = 120;
    let timelineRecordCount = 0;
    let exportMessage = "Belum siap Export";

    if (typeof editorTracks !== "undefined") {
        trackCount = editorTracks.length;
    }

    if (typeof editorClips !== "undefined") {
        clipCount = editorClips.length;
    }

    if (typeof getEditorSongDuration === "function" &&
        typeof formatEditorTime === "function") {
        duration = formatEditorTime(getEditorSongDuration());
    }

    if (typeof editorBpm !== "undefined") {
        bpm = editorBpm;
    }

    if (typeof timelineRecordsV4 !== "undefined") {
        timelineRecordCount = timelineRecordsV4.length;
    }

    if (typeof getEditorExportStatusV4 === "function") {
        const status = getEditorExportStatusV4();
        exportMessage = status.message;
    }

    return `
        <div class="editor-status-box">

            <p><strong>📊 Status Editor Musik</strong></p>

            <p>${timelineRecordCount > 0 ? "✔" : "⚠"} ${exportMessage}</p>

            <p>Track: ${trackCount}</p>
            <p>Clip: ${clipCount}</p>
            <p>Timeline Record: ${timelineRecordCount}</p>
            <p>Durasi: ${duration}</p>
            <p>BPM: ${bpm}</p>

        </div>
    `;
}

/* ===== STATUS ACTION ===== */

function refreshStatusTool() {
    if (activeTool === "status") {
        openEditorTool("status");
    }
}

/* ===== AUTO REFRESH STATUS ===== */

function updateToolAfterEditorChange() {
    if (!toolOpened) return;

    if (activeTool === "status") {
        refreshStatusTool();
    }
}
