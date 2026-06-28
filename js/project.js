/* =========================================
   PROJECT.JS V4.5
   TAHAP 1
   Project Manager
========================================= */

/* ===== DATA ===== */

let projectListV45 = [];
let activeProjectId = null;

/* ===== CREATE ===== */

function createProjectV4() {

    const name = prompt(
        "Nama Project Baru",
        "Project " + (projectListV45.length + 1)
    );

    if (!name) return;

    const project = {
        id: "project_" + Date.now(),
        name: name.trim(),
        created: new Date().toLocaleString(),
        modified: new Date().toLocaleString()
    };

    projectListV45.push(project);

    activeProjectId = project.id;

    renderProjectListV45();

}

/* ===== RENDER ===== */

function renderProjectListV45() {

    const list =
        document.getElementById("projectListV4");

    if (!list) return;

    if (projectListV45.length === 0) {

        list.innerHTML =
            "<span class='empty-record'>Belum ada project</span>";

        return;

    }

    list.innerHTML = "";

    projectListV45.forEach(function(project){

        const item =
            document.createElement("div");

        item.className =
            "project-item";

        if(project.id===activeProjectId){

            item.classList.add("active");

        }

        item.innerHTML=`

            <strong>${project.name}</strong><br>

            <small>${project.modified}</small>

            <div class="project-buttons">

                <button onclick="selectProjectV45('${project.id}')">
                Buka
                </button>

                <button onclick="renameProjectV45('${project.id}')">
                Rename
                </button>

                <button onclick="deleteProjectV45('${project.id}')">
                Hapus
                </button>

            </div>

        `;

        list.appendChild(item);

    });

}

/* ===== SELECT ===== */

function selectProjectV45(id){

    activeProjectId=id;

    renderProjectListV45();

}

/* ===== RENAME ===== */

function renameProjectV45(id){

    const project=
        projectListV45.find(
            p=>p.id===id
        );

    if(!project) return;

    const newName=
        prompt(
            "Rename Project",
            project.name
        );

    if(!newName) return;

    project.name=newName.trim();

    project.modified=
        new Date().toLocaleString();

    renderProjectListV45();

}

/* ===== DELETE ===== */

function deleteProjectV45(id){

    const yes=
        confirm(
            "Hapus project ini?"
        );

    if(!yes) return;

    projectListV45=
        projectListV45.filter(
            p=>p.id!==id
        );

    if(activeProjectId===id){

        activeProjectId=null;

    }

    renderProjectListV45();

}

/* ===== GET ===== */

function getActiveProjectV45(){

    return projectListV45.find(
        p=>p.id===activeProjectId
    );

}

/* ===== INFO ===== */

function getProjectStatusV45(){

    return{

        total:
            projectListV45.length,

        active:
            activeProjectId

    };

}

/* ===== INIT ===== */

document.addEventListener(

    "DOMContentLoaded",

    function(){

        renderProjectListV45();

    }

);

console.log(
"PROJECT.JS Tahap 1 Loaded"
);
/* =========================================
   PROJECT.JS V4.5
   TAHAP 2
   Save & Load
========================================= */

/* ===== SAVE PROJECT ===== */

function saveProject() {

    const project = getActiveProjectV45();

    if (!project) {
        alert("Buat atau pilih project terlebih dahulu.");
        return;
    }

    const data = {

        app: "Musik Studio Lite",
        version: "4.5",

        project: project,

        bpm: typeof getTimelineBpm === "function"
            ? getTimelineBpm()
            : 120,

        timeline:
            typeof timelineRecordListV4 !== "undefined"
                ? timelineRecordListV4
                : [],

        marker:
            typeof markerListV4 !== "undefined"
                ? markerListV4
                : [],

        exportRecord:
            typeof exportTimelineRecordsV4 !== "undefined"
                ? exportTimelineRecordsV4
                : [],

        saveTime:
            new Date().toLocaleString()

    };

    const blob = new Blob(

        [JSON.stringify(data, null, 2)],

        { type: "application/json" }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = project.name + ".json";

    a.click();

    URL.revokeObjectURL(url);

    project.modified = new Date().toLocaleString();

    renderProjectListV45();

}

/* ===== LOAD ===== */

function loadProjectClick() {

    const input =
        document.getElementById("loadProjectInput");

    if (!input) return;

    input.click();

}

/* ===== IMPORT JSON ===== */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        const input =
            document.getElementById("loadProjectInput");

        if (!input) return;

        input.addEventListener(

            "change",

            loadProjectFile

        );

    }

);

function loadProjectFile(event) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        try {

            const data =
                JSON.parse(e.target.result);

            if (!validateProjectData(data)) {

                alert("Project tidak valid.");

                return;

            }

            restoreProjectData(data);

            alert("Project berhasil dimuat.");

        }

        catch (err) {

            console.error(err);

            alert("File project rusak.");

        }

    };

    reader.readAsText(file);

}

/* ===== RESTORE ===== */

function restoreProjectData(data) {

    if (data.project) {

        activeProjectId = data.project.id;

    }

    if (data.timeline &&
        typeof timelineRecordListV4 !== "undefined") {

        timelineRecordListV4 = data.timeline;

    }

    if (data.marker &&
        typeof markerListV4 !== "undefined") {

        markerListV4 = data.marker;

    }

    if (typeof renderProjectListV45 === "function") {

        renderProjectListV45();

    }

    if (typeof updateTimelineRecordListV4 === "function") {

        updateTimelineRecordListV4();

    }

}

/* ===== VALIDASI ===== */

function validateProjectData(data) {

    if (!data) return false;

    if (!data.project) return false;

    if (!data.version) return false;

    return true;

}

console.log(
"PROJECT.JS Tahap 2 Loaded"
);
/* =========================================
   PROJECT.JS V4.5
   TAHAP 3
   Auto Save + Backup
========================================= */

/* ===== AUTO SAVE DATA ===== */

let projectAutoSaveEnabledV45 = true;
let projectAutoSaveIntervalV45 = 60000;
let projectBackupDataV45 = null;
let projectSaveHistoryV45 = [];
let projectLastSaveTimeV45 = null;

/* ===== AUTO SAVE START ===== */

function startProjectAutoSaveV45() {
    if (!projectAutoSaveEnabledV45) return;

    setInterval(function () {
        const project = getActiveProjectV45();

        if (!project) return;

        autoSaveProjectV45();

    }, projectAutoSaveIntervalV45);
}

/* ===== AUTO SAVE ===== */

function autoSaveProjectV45() {
    const project = getActiveProjectV45();

    if (!project) return;

    const data = buildProjectDataV45();

    projectBackupDataV45 = data;

    project.modified = new Date().toLocaleString();
    projectLastSaveTimeV45 = project.modified;

    addProjectSaveHistoryV45("Auto Save", project.name);

    saveProjectBackupToLocalV45(data);

    renderProjectListV45();
    updateProjectStatusTextV45();
}

/* ===== BUILD PROJECT DATA ===== */

function buildProjectDataV45() {
    return {
        app: "Musik Studio Lite",
        version: "4.5",
        savedAt: new Date().toISOString(),

        project: getActiveProjectV45(),

        editor:
            typeof getEditorProjectDataV45 === "function"
                ? getEditorProjectDataV45()
                : null,

        export:
            typeof getExportProjectDataV45 === "function"
                ? getExportProjectDataV45()
                : null,

        import:
            typeof getImportProjectData === "function"
                ? getImportProjectData()
                : null
    };
}

/* ===== BACKUP LOCAL STORAGE ===== */

function saveProjectBackupToLocalV45(data) {
    try {
        localStorage.setItem(
            "musikStudioLiteV45Backup",
            JSON.stringify(data)
        );
    } catch (e) {
        console.warn("Backup localStorage gagal:", e);
    }
}

function restoreProjectBackupV45() {
    try {
        const raw = localStorage.getItem("musikStudioLiteV45Backup");

        if (!raw) {
            alert("Belum ada backup project.");
            return;
        }

        const data = JSON.parse(raw);

        restoreFullProjectDataV45(data);

        alert("Backup berhasil dipulihkan.");

    } catch (e) {
        console.error(e);
        alert("Backup rusak atau tidak bisa dibaca.");
    }
}

/* ===== SAVE HISTORY ===== */

function addProjectSaveHistoryV45(type, name) {
    projectSaveHistoryV45.unshift({
        id: "save_" + Date.now(),
        type: type,
        name: name || "Project",
        time: new Date().toLocaleString()
    });

    if (projectSaveHistoryV45.length > 20) {
        projectSaveHistoryV45.pop();
    }
}

function getProjectSaveHistoryV45() {
    return projectSaveHistoryV45;
}

/* ===== RESTORE FULL DATA ===== */

function restoreFullProjectDataV45(data) {
    if (!data) return;

    if (data.project) {
        let existing = projectListV45.find(p => p.id === data.project.id);

        if (!existing) {
            projectListV45.push(data.project);
        }

        activeProjectId = data.project.id;
    }

    if (data.editor && typeof restoreEditorProjectDataV45 === "function") {
        restoreEditorProjectDataV45(data.editor);
    }

    if (data.export && typeof restoreExportProjectDataV45 === "function") {
        restoreExportProjectDataV45(data.export);
    }

    if (data.import && typeof restoreImportProjectData === "function") {
        restoreImportProjectData(data.import);
    }

    renderProjectListV45();
    updateProjectStatusTextV45();
}

/* ===== STATUS TEXT ===== */

function updateProjectStatusTextV45() {
    const box = document.getElementById("projectStatusV45");
    if (!box) return;

    const project = getActiveProjectV45();

    if (!project) {
        box.innerHTML = "Belum ada project aktif.";
        return;
    }

    box.innerHTML =
        "Project aktif: " + project.name +
        " • Last save: " +
        (projectLastSaveTimeV45 || "Belum pernah save");
}

/* ===== TOGGLE AUTO SAVE ===== */

function toggleProjectAutoSaveV45() {
    projectAutoSaveEnabledV45 = !projectAutoSaveEnabledV45;

    alert(
        projectAutoSaveEnabledV45
            ? "Auto Save ON"
            : "Auto Save OFF"
    );
}

/* ===== PATCH SAVE PROJECT ===== */

const oldSaveProjectV45 = saveProject;

saveProject = function () {
    const project = getActiveProjectV45();

    if (!project) {
        alert("Buat atau pilih project terlebih dahulu.");
        return;
    }

    const data = buildProjectDataV45();

    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = sanitizeProjectFileNameV45(project.name) + ".json";
    a.click();

    URL.revokeObjectURL(url);

    project.modified = new Date().toLocaleString();
    projectLastSaveTimeV45 = project.modified;

    addProjectSaveHistoryV45("Manual Save", project.name);
    saveProjectBackupToLocalV45(data);

    renderProjectListV45();
    updateProjectStatusTextV45();
};

/* ===== FILE NAME ===== */

function sanitizeProjectFileNameV45(name) {
    return String(name || "project")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, "_")
        .toLowerCase();
}

/* ===== INIT ===== */

document.addEventListener("DOMContentLoaded", function () {
    startProjectAutoSaveV45();
    updateProjectStatusTextV45();
});

console.log("PROJECT.JS Tahap 3 Loaded");
/* =========================================
   PROJECT.JS V4.5
   TAHAP 4
   PROJECT BROWSER
========================================= */

/* ===== SEARCH ===== */

let projectSearchKeyword = "";

function searchProjectV45(keyword){

    projectSearchKeyword =
        keyword.toLowerCase();

    renderProjectListV45();

}

/* ===== SORT ===== */

function sortProjectByNameV45(){

    projectListV45.sort(function(a,b){

        return a.name.localeCompare(b.name);

    });

    renderProjectListV45();

}

function sortProjectByDateV45(){

    projectListV45.sort(function(a,b){

        return new Date(b.modified)-
               new Date(a.modified);

    });

    renderProjectListV45();

}

/* ===== RENDER ===== */

const oldRenderProjectListV45 =
renderProjectListV45;

renderProjectListV45=function(){

    const list=
        document.getElementById(
            "projectListV4"
        );

    if(!list) return;

    list.innerHTML="";

    let data=
        [...projectListV45];

    if(projectSearchKeyword){

        data=data.filter(function(p){

            return p.name
                .toLowerCase()
                .includes(projectSearchKeyword);

        });

    }

    if(data.length===0){

        list.innerHTML=
        "<span class='empty-record'>Project tidak ditemukan.</span>";

        return;

    }

    data.forEach(function(project){

        const item=
            document.createElement("div");

        item.className="project-item";

        if(project.id===activeProjectId){

            item.classList.add("active");

        }

        item.innerHTML=`

        <strong>${project.name}</strong><br>

        <small>${project.modified}</small>

        <div class="project-buttons">

        <button onclick="selectProjectV45('${project.id}')">
        Buka
        </button>

        <button onclick="renameProjectV45('${project.id}')">
        Rename
        </button>

        <button onclick="deleteProjectV45('${project.id}')">
        Hapus
        </button>

        <button onclick="showProjectInfoV45('${project.id}')">
        Info
        </button>

        </div>

        `;

        list.appendChild(item);

    });

}

/* ===== INFO ===== */

function showProjectInfoV45(id){

    const project=
        projectListV45.find(
            p=>p.id===id
        );

    if(!project) return;

    alert(

        "Nama : "+project.name+

        "\n\nDibuat : "+project.created+

        "\n\nDiubah : "+project.modified+

        "\n\nID : "+project.id

    );

}

/* ===== QUICK RENAME ===== */

function quickRenameProjectV45(){

    const project=
        getActiveProjectV45();

    if(!project){

        alert("Belum ada project aktif.");

        return;

    }

    renameProjectV45(project.id);

}

/* ===== QUICK DELETE ===== */

function quickDeleteProjectV45(){

    const project=
        getActiveProjectV45();

    if(!project){

        alert("Belum ada project aktif.");

        return;

    }

    deleteProjectV45(project.id);

}

/* ===== DEBUG ===== */

console.log(
"PROJECT.JS Tahap 4 Loaded"
);
/* =========================================
   PROJECT.JS V4.5
   TAHAP 5
   FINAL SYSTEM
========================================= */

/* ===== IMPORT PROJECT ===== */

function importProjectV45(){

    loadProjectClick();

}

/* ===== EXPORT PROJECT ===== */

function exportProjectV45(){

    saveProject();

}

/* ===== RECOVERY ===== */

function recoverProjectV45(){

    try{

        restoreProjectBackupV45();

        console.log(
            "Recovery berhasil."
        );

    }

    catch(e){

        console.error(e);

        alert(
            "Recovery gagal."
        );

    }

}

/* ===== CLEANUP ===== */

function cleanupProjectV45(){

    if(!confirm(
        "Hapus seluruh cache project?"
    )) return;

    try{

        localStorage.removeItem(
            "musikStudioLiteV45Backup"
        );

    }catch(e){}

    projectSaveHistoryV45=[];

    console.log(
        "Cache project dibersihkan."
    );

}

/* ===== STORAGE INFO ===== */

function getProjectStorageInfoV45(){

    let size=0;

    try{

        const data=
        localStorage.getItem(
        "musikStudioLiteV45Backup"
        );

        if(data){

            size=data.length;

        }

    }catch(e){}

    return{

        project:
        projectListV45.length,

        history:
        projectSaveHistoryV45.length,

        storage:
        size

    };

}

/* ===== STORAGE OPTIMIZE ===== */

function optimizeProjectStorageV45(){

    if(projectSaveHistoryV45.length>10){

        projectSaveHistoryV45=
        projectSaveHistoryV45.slice(0,10);

    }

    console.log(
        "Storage dioptimalkan."
    );

}

/* ===== EXPORT ALL ===== */

function exportAllProjectsV45(){

    const blob=new Blob(

        [

        JSON.stringify(

        projectListV45,

        null,

        2

        )

        ],

        {

        type:"application/json"

        }

    );

    const url=
    URL.createObjectURL(blob);

    const a=
    document.createElement("a");

    a.href=url;

    a.download=
    "Semua_Project_V45.json";

    a.click();

    URL.revokeObjectURL(url);

}

/* ===== IMPORT ALL ===== */

function importAllProjectsV45(file){

    if(!file) return;

    const reader=
    new FileReader();

    reader.onload=function(e){

        try{

            const data=
            JSON.parse(e.target.result);

            if(Array.isArray(data)){

                projectListV45=data;

                renderProjectListV45();

            }

        }

        catch(err){

            alert(
            "File project tidak valid."
            );

        }

    };

    reader.readAsText(file);

}

/* ===== FINAL CHECK ===== */

function checkProjectSystemV45(){

    console.table({

        totalProject:
        projectListV45.length,

        activeProject:
        activeProjectId,

        autoSave:
        projectAutoSaveEnabledV45,

        backup:
        projectBackupDataV45!=null

    });

}

/* ===== INIT ===== */

document.addEventListener(

"DOMContentLoaded",

function(){

    optimizeProjectStorageV45();

    checkProjectSystemV45();

}

);

/* ===== DEBUG ===== */

console.log(
"PROJECT.JS Tahap 5 Loaded"
);

