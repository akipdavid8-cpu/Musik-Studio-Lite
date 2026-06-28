/* =========================================
   MAIN.JS V4.5
   TAHAP 1
   App Initialization
========================================= */

/* ===== APP INFO ===== */

const APP_NAME = "Musik Studio Lite";
const APP_VERSION = "V4.5";

let appReady = false;

/* ===== MODULE STATUS ===== */

const moduleStatus = {

    audio:false,
    import:false,
    drum:false,
    piano:false,
    guitar:false,
    bass:false,
    vocal:false,
    fx:false,
    midi:false,
    editor:false,
    export:false,
    project:false

};

/* ===== INIT ===== */

document.addEventListener(

    "DOMContentLoaded",

    async function(){

        console.log(APP_NAME,APP_VERSION);

        checkBrowserSupport();

        await initApplication();

    }

);

/* ===== INIT APPLICATION ===== */

async function initApplication(){

    try{

        await initAudioEngine();

        moduleStatus.audio=true;

        initModules();

        appReady=true;

        console.log("Application Ready");

    }catch(err){

        console.error(err);

        alert("Gagal memulai aplikasi.");

    }

}

/* ===== INIT MODULE ===== */

function initModules(){

    moduleStatus.import=true;
    moduleStatus.drum=true;
    moduleStatus.piano=true;
    moduleStatus.guitar=true;
    moduleStatus.bass=true;
    moduleStatus.vocal=true;
    moduleStatus.fx=true;
    moduleStatus.midi=true;
    moduleStatus.editor=true;
    moduleStatus.export=true;
    moduleStatus.project=true;

}

/* ===== CHECK BROWSER ===== */

function checkBrowserSupport(){

    if(!window.AudioContext &&
       !window.webkitAudioContext){

        alert("Browser tidak mendukung Web Audio API.");

    }

    if(!window.MediaRecorder){

        console.warn("MediaRecorder tidak tersedia.");

    }

    if(!window.FileReader){

        console.warn("FileReader tidak tersedia.");

    }

}

/* ===== STATUS ===== */

function isApplicationReady(){

    return appReady;

}

function getApplicationStatus(){

    return{

        ready:appReady,

        version:APP_VERSION,

        modules:moduleStatus

    };

}

/* ===== DEBUG ===== */

console.log("MAIN.JS Tahap 1 Loaded");
/* =========================================
   MAIN.JS V4.5
   TAHAP 2
   Panel Manager
========================================= */

/* ===== PANEL ===== */

const panelList = [

    "importPanel",
    "drumPanel",
    "pianoPanel",
    "electric_guitarPanel",
    "bassPanel",
    "vocalPanel",
    "fxPanel",
    "midiPanel",
    "timelinePanel",
    "exportPanel",
    "projectPanel"

];

let currentPanel = null;

/* ===== OPEN PANEL ===== */

function openPanel(panelId){

    closeAllPanels();

    const panel =
        document.getElementById(panelId);

    if(!panel){

        console.warn(
            "Panel tidak ditemukan:",
            panelId
        );

        return;

    }

    panel.classList.add("show");

    currentPanel = panelId;

    const backdrop =
        document.getElementById("panelBackdrop");

    if(backdrop){

        backdrop.classList.add("show");

    }

    document.body.classList.add("panel-open");

}

/* ===== CLOSE PANEL ===== */

function closePanel(panelId){

    const panel =
        document.getElementById(panelId);

    if(panel){

        panel.classList.remove("show");

    }

    if(currentPanel===panelId){

        currentPanel=null;

    }

    updateBackdrop();

}

/* ===== CLOSE ALL ===== */

function closeAllPanels(){

    panelList.forEach(function(id){

        const panel=document.getElementById(id);

        if(panel){

            panel.classList.remove("show");

        }

    });

    currentPanel=null;

    updateBackdrop();

}

/* ===== BACKDROP ===== */

function updateBackdrop(){

    const backdrop =
        document.getElementById("panelBackdrop");

    if(!backdrop) return;

    if(currentPanel){

        backdrop.classList.add("show");

        document.body.classList.add("panel-open");

    }else{

        backdrop.classList.remove("show");

        document.body.classList.remove("panel-open");

    }

}

/* ===== TOGGLE ===== */

function togglePanel(panelId){

    if(currentPanel===panelId){

        closePanel(panelId);

        return;

    }

    openPanel(panelId);

}

/* ===== STATUS ===== */

function getCurrentPanel(){

    return currentPanel;

}

function isPanelOpen(panelId){

    return currentPanel===panelId;

}

/* ===== REFRESH ===== */

function refreshCurrentPanel(){

    if(!currentPanel) return;

    const panel =
        document.getElementById(currentPanel);

    if(panel){

        panel.scrollTop=0;

    }

}

/* ===== ESC CLOSE ===== */

document.addEventListener(

    "keydown",

    function(event){

        if(event.key==="Escape"){

            closeAllPanels();

        }

    }

);

/* ===== DEBUG ===== */

console.log(
    "MAIN.JS Tahap 2 Loaded"
);
/* =========================================
   MAIN.JS V4.5
   TAHAP 3
   Module Synchronization
========================================= */

/* ===== MODULE SYNC ===== */

function syncAllModules(){

    syncImportModule();
    syncDrumModule();
    syncPianoModule();
    syncGuitarModule();
    syncBassModule();
    syncVocalModule();
    syncFxModule();
    syncMidiModule();
    syncEditorModule();
    syncExportModule();

}

/* ===== IMPORT ===== */

function syncImportModule(){

    if(typeof updateImportInfo==="function"){
        updateImportInfo();
    }

}

/* ===== DRUM ===== */

function syncDrumModule(){

    if(typeof updateDrumRecordList==="function"){
        updateDrumRecordList();
    }

}

/* ===== PIANO ===== */

function syncPianoModule(){

    if(typeof updatePianoRecordListV45==="function"){
        updatePianoRecordListV45();
    }

}

/* ===== GUITAR ===== */

function syncGuitarModule(){

    if(typeof updateGuitarRecordList==="function"){
        updateGuitarRecordList();
    }

}

/* ===== BASS ===== */

function syncBassModule(){

    if(typeof updateBassRecordList==="function"){
        updateBassRecordList();
    }

}

/* ===== VOCAL ===== */

function syncVocalModule(){

    if(typeof updateVocalList==="function"){
        updateVocalList();
    }

}

/* ===== FX ===== */

function syncFxModule(){

    if(typeof updateFxRecordList==="function"){
        updateFxRecordList();
    }

}

/* ===== MIDI ===== */

function syncMidiModule(){

    if(typeof updateMidiList==="function"){
        updateMidiList();
    }

}

/* ===== EDITOR ===== */

function syncEditorModule(){

    if(typeof refreshTimelineView==="function"){
        refreshTimelineView();
    }

    if(typeof updateTimelineRecordListV4==="function"){
        updateTimelineRecordListV4();
    }

}

/* ===== EXPORT ===== */

function syncExportModule(){

    if(typeof refreshExportTimelineRecordsV4==="function"){
        refreshExportTimelineRecordsV4();
    }

    if(typeof renderExportHistory==="function"){
        renderExportHistory();
    }

}

/* ===== GLOBAL REFRESH ===== */

function refreshApplication(){

    syncAllModules();

}

/* ===== AUTO REFRESH ===== */

setInterval(function(){

    if(!appReady) return;

    syncEditorModule();

},500);

/* ===== WHEN PANEL OPEN ===== */

function onPanelOpened(panelId){

    switch(panelId){

        case "timelinePanel":
            syncEditorModule();
            break;

        case "exportPanel":
            syncExportModule();
            break;

        case "importPanel":
            syncImportModule();
            break;

    }

}

/* ===== PATCH OPEN PANEL ===== */

const oldOpenPanel = openPanel;

openPanel = function(panelId){

    oldOpenPanel(panelId);

    onPanelOpened(panelId);

};

/* ===== DEBUG ===== */

console.log("MAIN.JS Tahap 3 Loaded");
/* =========================================
   MAIN.JS V4.5
   TAHAP 4
   Shortcut + Auto Save
========================================= */

/* ===== APP STATE ===== */

let autoSaveEnabled = true;
let autoSaveInterval = 60000; // 60 detik
let projectModified = false;

/* ===== SHORTCUT ===== */

document.addEventListener("keydown", function (e) {

    /* CTRL + S */
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();

        if (typeof saveProject === "function") {
            saveProject();
        }

        projectModified = false;
    }

    /* SPACE = PLAY / PAUSE */

    if (e.code === "Space") {

        e.preventDefault();

        if (typeof playTimeline === "function" &&
            typeof pauseTimeline === "function") {

            if (typeof isTimelinePlaying === "function" &&
                isTimelinePlaying()) {

                pauseTimeline();

            } else {

                playTimeline();

            }
        }
    }

    /* DELETE */

    if (e.key === "Delete") {

        if (typeof deleteSelectedClip === "function") {

            deleteSelectedClip();

        }

    }

});

/* ===== AUTO SAVE ===== */

function startAutoSave() {

    if (!autoSaveEnabled) return;

    setInterval(function () {

        if (!projectModified) return;

        if (typeof saveProject === "function") {

            console.log("Auto Save...");

            saveProject();

            projectModified = false;

        }

    }, autoSaveInterval);

}

/* ===== MODIFIED ===== */

function markProjectModified() {

    projectModified = true;

}

/* ===== AUTO RESUME ===== */

window.addEventListener("focus", function () {

    if (typeof resumeAudioEngine === "function") {

        resumeAudioEngine();

    }

});

/* ===== BEFORE CLOSE ===== */

window.addEventListener("beforeunload", function (e) {

    if (!projectModified) return;

    e.preventDefault();

    e.returnValue =
        "Project belum disimpan.";

});

/* ===== START ===== */

document.addEventListener("DOMContentLoaded", function () {

    startAutoSave();

});

/* ===== STATUS ===== */

function getMainStatus() {

    return {

        ready: appReady,

        modified: projectModified,

        autoSave: autoSaveEnabled,

        interval: autoSaveInterval

    };

}

/* ===== DEBUG ===== */

console.log("MAIN.JS Tahap 4 Loaded");
/* =========================================
   MAIN.JS V4.5
   TAHAP 5
   Final System
========================================= */

/* ===== DEBUG ===== */

const DEBUG_MODE = true;

/* ===== LOG ===== */

function appLog(...msg){

    if(!DEBUG_MODE) return;

    console.log("[MSL]",...msg);

}

/* ===== ERROR HANDLER ===== */

window.onerror = function(
    message,
    source,
    line,
    column,
    error
){

    console.error(
        "APP ERROR",
        message,
        source,
        line
    );

    return false;

};

window.addEventListener(

    "unhandledrejection",

    function(event){

        console.error(
            "Promise Error",
            event.reason
        );

    }

);

/* ===== PERFORMANCE ===== */

let appStartTime =
    performance.now();

function getRunningTime(){

    return Math.floor(

        (performance.now()-appStartTime)/1000

    );

}

/* ===== MEMORY ===== */

function getMemoryStatus(){

    if(!performance.memory){

        return null;

    }

    return{

        used:
        performance.memory.usedJSHeapSize,

        total:
        performance.memory.totalJSHeapSize,

        limit:
        performance.memory.jsHeapSizeLimit

    };

}

/* ===== HEALTH CHECK ===== */

function checkApplicationHealth(){

    const report={

        appReady,

        audio:
        typeof audioContext!=="undefined",

        editor:
        typeof openEditorTool==="function",

        project:
        typeof saveProject==="function",

        export:
        typeof exportSelectedTimelineRecordMp3V4==="function",

        runtime:
        getRunningTime()

    };

    appLog("Health",report);

    return report;

}

/* ===== AUTO HEALTH ===== */

setInterval(function(){

    if(!appReady) return;

    checkApplicationHealth();

},30000);

/* ===== FINAL INIT ===== */

function startApplication(){

    if(!isApplicationReady()){

        appLog("Waiting...");

        return;

    }

    appLog("Application Started");

    refreshApplication();

}

/* ===== READY ===== */

window.addEventListener(

    "load",

    function(){

        startApplication();

    }

);

/* ===== VERSION ===== */

function getAppVersion(){

    return{

        app:APP_NAME,

        version:APP_VERSION,

        engine:"V4.5"

    };

}

/* ===== ABOUT ===== */

function showApplicationInfo(){

    alert(

        APP_NAME+

        "\nVersi : "+APP_VERSION+

        "\nEngine : V4.5"

    );

}

/* ===== RESTART ===== */

function restartApplication(){

    location.reload();

}

/* ===== DEBUG ===== */

appLog("MAIN.JS Tahap 5 Loaded");
