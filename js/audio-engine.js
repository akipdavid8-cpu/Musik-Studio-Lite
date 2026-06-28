/* =========================================
   AUDIO-ENGINE.JS V4.5
   TAHAP 1
   Audio Engine Core
========================================= */

/* ===== ENGINE ===== */

let audioContext = null;
let masterGain = null;
let masterVolume = 0.95;

/* ===== AUDIO BUFFER ===== */

let audioBufferCache = {};

/* ===== INIT ===== */

async function initAudioEngine() {

    if (audioContext) return audioContext;

    const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;

    audioContext = new AudioCtx();

    masterGain = audioContext.createGain();
    masterGain.gain.value = masterVolume;

    masterGain.connect(audioContext.destination);

    console.log("Audio Engine Ready");

    updateMasterVolumeText();

    return audioContext;

}

/* ===== RESUME ===== */

async function resumeAudioEngine() {

    if (!audioContext) {
        await initAudioEngine();
    }

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

}

/* ===== MASTER VOLUME ===== */

function setMasterVolume(value) {

    masterVolume = Math.max(
        0,
        Math.min(1, value)
    );

    if (masterGain) {
        masterGain.gain.value = masterVolume;
    }

    updateMasterVolumeText();

}

function getMasterVolume() {
    return masterVolume;
}

function updateMasterVolumeText() {

    const text =
        document.getElementById("masterVolumeText");

    if (!text) return;

    text.innerHTML =
        Math.round(masterVolume * 100) + "%";

}

/* ===== LOAD AUDIO ===== */

async function loadAudioFile(file) {

    await resumeAudioEngine();

    const arrayBuffer =
        await file.arrayBuffer();

    const audioBuffer =
        await audioContext.decodeAudioData(arrayBuffer);

    audioBufferCache[file.name] = audioBuffer;

    return audioBuffer;

}

/* ===== LOAD URL ===== */

async function loadAudioUrl(url) {

    await resumeAudioEngine();

    if (audioBufferCache[url]) {
        return audioBufferCache[url];
    }

    const response =
        await fetch(url);

    const arrayBuffer =
        await response.arrayBuffer();

    const audioBuffer =
        await audioContext.decodeAudioData(arrayBuffer);

    audioBufferCache[url] = audioBuffer;

    return audioBuffer;

}

/* ===== CACHE ===== */

function getAudioBuffer(key) {

    return audioBufferCache[key] || null;

}

function clearAudioBuffer(key) {

    delete audioBufferCache[key];

}

function clearAllAudioBuffer() {

    audioBufferCache = {};

}

/* ===== CREATE SOURCE ===== */

function createAudioSource(buffer) {

    if (!audioContext) return null;

    const source =
        audioContext.createBufferSource();

    source.buffer = buffer;

    source.connect(masterGain);

    return source;

}

/* ===== ENGINE STATUS ===== */

function isAudioEngineReady() {

    return audioContext !== null;

}

function getAudioContext() {

    return audioContext;

}

/* ===== AUTO INIT ===== */

document.addEventListener(

    "click",

    function () {

        resumeAudioEngine();

    },

    { once: true }

);

console.log(
    "Audio Engine Tahap 1 Loaded"
);

/* =========================================
   AUDIO-ENGINE.JS V4.5
   TAHAP 2
   Audio Player
========================================= */

/* ===== PLAYER ===== */

let currentSource = null;
let currentBuffer = null;

let playStartTime = 0;
let pauseOffset = 0;

let isPlaying = false;
let isPaused = false;
let loopEnabled = false;

/* ===== PLAY ===== */

async function playAudioBuffer(buffer, offset = 0) {

    await resumeAudioEngine();

    stopAudioPlayback();

    currentBuffer = buffer;

    currentSource = createAudioSource(buffer);

    if (!currentSource) return;

    currentSource.loop = loopEnabled;

    playStartTime = audioContext.currentTime - offset;

    pauseOffset = offset;

    currentSource.start(0, offset);

    currentSource.onended = function () {

        if (!loopEnabled) {

            isPlaying = false;
            isPaused = false;
            pauseOffset = 0;

        }

    };

    isPlaying = true;
    isPaused = false;

}

/* ===== PLAY DARI CACHE ===== */

async function playAudioByName(name) {

    const buffer = getAudioBuffer(name);

    if (!buffer) {

        console.warn("Audio tidak ditemukan :", name);

        return;

    }

    await playAudioBuffer(buffer);

}

/* ===== PAUSE ===== */

function pauseAudioPlayback() {

    if (!isPlaying || !currentSource) return;

    pauseOffset = audioContext.currentTime - playStartTime;

    currentSource.stop();

    currentSource.disconnect();

    currentSource = null;

    isPlaying = false;
    isPaused = true;

}

/* ===== RESUME ===== */

async function resumeAudioPlayback() {

    if (!currentBuffer) return;

    if (!isPaused) return;

    await playAudioBuffer(

        currentBuffer,

        pauseOffset

    );

}

/* ===== STOP ===== */

function stopAudioPlayback() {

    if (currentSource) {

        try {

            currentSource.stop();

        } catch (e) {}

        currentSource.disconnect();

    }

    currentSource = null;

    pauseOffset = 0;

    isPlaying = false;
    isPaused = false;

}

/* ===== SEEK ===== */

async function seekAudio(seconds) {

    if (!currentBuffer) return;

    seconds = Math.max(

        0,

        Math.min(

            seconds,

            currentBuffer.duration

        )

    );

    await playAudioBuffer(

        currentBuffer,

        seconds

    );

}

/* ===== LOOP ===== */

function setAudioLoop(enabled) {

    loopEnabled = enabled;

    if (currentSource) {

        currentSource.loop = enabled;

    }

}

function toggleAudioLoop() {

    setAudioLoop(

        !loopEnabled

    );

}

function isAudioLoopEnabled() {

    return loopEnabled;

}

/* ===== CURRENT TIME ===== */

function getCurrentPlaybackTime() {

    if (!isPlaying) {

        return pauseOffset;

    }

    return audioContext.currentTime - playStartTime;

}

/* ===== DURATION ===== */

function getCurrentAudioDuration() {

    if (!currentBuffer) return 0;

    return currentBuffer.duration;

}

/* ===== STATUS ===== */

function isAudioPlaying() {

    return isPlaying;

}

function isAudioPaused() {

    return isPaused;

}

/* ===== RESET ===== */

function resetAudioPlayer() {

    stopAudioPlayback();

    currentBuffer = null;

}

/* ===== DEBUG ===== */

console.log(

    "Audio Engine Tahap 2 Loaded"

);
/* =========================================
   AUDIO-ENGINE.JS V4.5
   TAHAP 3
   Mixer Engine
========================================= */

/* ===== MIXER ===== */

const mixerTracks = {};

/* ===== CREATE TRACK ===== */

function createMixerTrack(trackName){

    if(!audioContext){
        initAudioEngine();
    }

    if(mixerTracks[trackName]){
        return mixerTracks[trackName];
    }

    const gainNode = audioContext.createGain();
    const panNode = audioContext.createStereoPanner();

    gainNode.gain.value = 1;
    panNode.pan.value = 0;

    gainNode.connect(panNode);
    panNode.connect(masterGain);

    mixerTracks[trackName] = {

        gain:gainNode,
        pan:panNode,

        volume:1,
        panValue:0,

        mute:false,
        solo:false

    };

    return mixerTracks[trackName];

}

/* ===== GET TRACK ===== */

function getMixerTrack(trackName){

    return mixerTracks[trackName] ||
           createMixerTrack(trackName);

}

/* ===== VOLUME ===== */

function setTrackVolume(trackName,value){

    const track=getMixerTrack(trackName);

    value=Math.max(0,Math.min(1,value));

    track.volume=value;

    if(!track.mute){

        track.gain.gain.value=value;

    }

}

/* ===== PAN ===== */

function setTrackPan(trackName,value){

    const track=getMixerTrack(trackName);

    value=Math.max(-1,Math.min(1,value));

    track.panValue=value;

    track.pan.pan.value=value;

}

/* ===== MUTE ===== */

function toggleTrackMute(trackName){

    const track=getMixerTrack(trackName);

    track.mute=!track.mute;

    track.gain.gain.value=

        track.mute ? 0 :

        track.volume;

}

/* ===== SOLO ===== */

function toggleTrackSolo(trackName){

    const track=getMixerTrack(trackName);

    track.solo=!track.solo;

    updateSoloMixer();

}

function updateSoloMixer(){

    let soloFound=false;

    Object.values(mixerTracks).forEach(function(track){

        if(track.solo){

            soloFound=true;

        }

    });

    Object.values(mixerTracks).forEach(function(track){

        if(!soloFound){

            track.gain.gain.value=

                track.mute ? 0 :

                track.volume;

            return;

        }

        if(track.solo){

            track.gain.gain.value=

                track.volume;

        }else{

            track.gain.gain.value=0;

        }

    });

}

/* ===== RESET MIXER ===== */

function resetMixer(){

    Object.keys(mixerTracks).forEach(function(name){

        const track=mixerTracks[name];

        track.volume=1;
        track.panValue=0;

        track.mute=false;
        track.solo=false;

        track.gain.gain.value=1;
        track.pan.pan.value=0;

    });

}

/* ===== MASTER METER ===== */

function updateMasterMeter(){

    const meter=document.getElementById("masterMeterText");
    const fill=document.getElementById("masterMeterFill");

    if(!meter || !fill) return;

    const percent=Math.round(masterVolume*100);

    meter.innerHTML=percent+"%";

    fill.style.width=percent+"%";

}

/* ===== TIMELINE METER ===== */

function updateTimelineMasterMeter(){

    const fill=document.getElementById("timelineMasterMeterFill");

    if(!fill) return;

    fill.style.width=

        Math.round(masterVolume*100)+"%";

}

/* ===== AUTO UPDATE ===== */

setInterval(function(){

    updateMasterMeter();

    updateTimelineMasterMeter();

},100);

/* ===== STATUS ===== */

function getMixerStatus(){

    return{

        master:masterVolume,

        tracks:Object.keys(mixerTracks).length

    };

}

/* ===== DEBUG ===== */

console.log(

"Audio Engine Tahap 3 Loaded"

);
/* =========================================
   AUDIO-ENGINE.JS V4.5
   TAHAP 4
   Timeline Scheduler
========================================= */

/* ===== TIMELINE PLAYER ===== */

let timelinePlaying = false;
let timelinePosition = 0;
let timelineStartTime = 0;
let timelineAnimation = null;

let editorBpm = 120;

/* ===== PLAY ===== */

function playTimelineEngine() {

    if (timelinePlaying) return;

    resumeAudioEngine();

    timelinePlaying = true;

    timelineStartTime =
        audioContext.currentTime - timelinePosition;

    updateTimelineScheduler();

}

/* ===== PAUSE ===== */

function pauseTimelineEngine() {

    timelinePlaying = false;

    cancelAnimationFrame(timelineAnimation);

}

/* ===== STOP ===== */

function stopTimelineEngine() {

    timelinePlaying = false;

    timelinePosition = 0;

    cancelAnimationFrame(timelineAnimation);

    updatePlayhead();

}

/* ===== LOOP ===== */

function updateTimelineScheduler() {

    if (!timelinePlaying) return;

    timelinePosition =
        audioContext.currentTime -
        timelineStartTime;

    playTimelineClips();

    updatePlayhead();

    timelineAnimation =
        requestAnimationFrame(
            updateTimelineScheduler
        );

}

/* ===== PLAYHEAD ===== */

function updatePlayhead() {

    const playhead =
        document.getElementById(
            "playheadLine"
        );

    if (!playhead) return;

    const pixel =
        timelinePosition * 100;

    playhead.style.left =
        pixel + "px";

    updateTimelineTime();

}

/* ===== TIME ===== */

function updateTimelineTime() {

    const text =
        document.getElementById(
            "timeDisplay"
        );

    if (!text) return;

    text.innerHTML =
        "Waktu : " +
        formatEditorTime(
            timelinePosition
        );

}

/* ===== BPM ===== */

function setTimelineBpm(value){

    editorBpm=value;

    const text=
        document.getElementById(
            "bpmText"
        );

    if(text){

        text.innerHTML=
            editorBpm+" BPM";

    }

}

function getTimelineBpm(){

    return editorBpm;

}

/* ===== CLIP SCHEDULER ===== */

function playTimelineClips(){

    if(
        typeof editorClips==="undefined"
    ) return;

    editorClips.forEach(function(clip){

        if(
            clip.played
        ) return;

        if(
            timelinePosition>=clip.start
        ){

            clip.played=true;

            playEditorClip(
                clip
            );

        }

    });

}

/* ===== PLAY CLIP ===== */

function playEditorClip(clip){

    if(
        clip.audioBuffer
    ){

        playAudioBuffer(
            clip.audioBuffer
        );

        return;

    }

    if(
        typeof clip.play==="function"
    ){

        clip.play();

    }

}

/* ===== RESET ===== */

function resetTimelineClipState(){

    if(
        typeof editorClips==="undefined"
    ) return;

    editorClips.forEach(function(clip){

        clip.played=false;

    });

}

/* ===== SEEK ===== */

function seekTimeline(seconds){

    timelinePosition=
        Math.max(
            0,
            seconds
        );

    resetTimelineClipState();

    updatePlayhead();

}

/* ===== CHANGE BPM ===== */

function changeTimelineBpm(step){

    editorBpm+=step;

    if(editorBpm<40)
        editorBpm=40;

    if(editorBpm>250)
        editorBpm=250;

    setTimelineBpm(
        editorBpm
    );

}

/* ===== STATUS ===== */

function getTimelineEngineStatus(){

    return{

        playing:
            timelinePlaying,

        position:
            timelinePosition,

        bpm:
            editorBpm

    };

}

/* ===== DEBUG ===== */

console.log(
"Audio Engine Tahap 4 Loaded"
);
/* =========================================
   AUDIO-ENGINE.JS V4.5
   TAHAP 5
   FX ENGINE
========================================= */

/* ===== FX NODE ===== */

let fxInputNode = null;
let fxOutputNode = null;

let reverbNode = null;
let delayNode = null;
let feedbackNode = null;
let compressorNode = null;

let fxEnabled = {
    reverb:false,
    delay:false,
    pitch:false,
    reverse:false
};

/* ===== INIT FX ===== */

function initFxEngine(){

    if(!audioContext) return;

    fxInputNode = audioContext.createGain();
    fxOutputNode = audioContext.createGain();

    reverbNode = audioContext.createConvolver();

    delayNode = audioContext.createDelay(5.0);
    delayNode.delayTime.value = 0.25;

    feedbackNode = audioContext.createGain();
    feedbackNode.gain.value = 0.35;

    compressorNode =
        audioContext.createDynamicsCompressor();

    compressorNode.threshold.value = -24;
    compressorNode.ratio.value = 4;

    fxInputNode.connect(compressorNode);
    compressorNode.connect(fxOutputNode);
    fxOutputNode.connect(masterGain);

}

/* ===== REVERB ===== */

function toggleFxReverb(){

    fxEnabled.reverb = !fxEnabled.reverb;

    const btn =
        document.getElementById("fxReverbBtn");

    if(btn){

        btn.innerHTML =
            fxEnabled.reverb ?
            "🌀 Reverb ON" :
            "🌀 Reverb OFF";

    }

}

/* ===== DELAY ===== */

function toggleFxDelay(){

    fxEnabled.delay = !fxEnabled.delay;

    const btn =
        document.getElementById("fxDelayBtn");

    if(btn){

        btn.innerHTML =
            fxEnabled.delay ?
            "⏱ Delay ON" :
            "⏱ Delay OFF";

    }

}

/* ===== PITCH ===== */

function toggleFxPitch(){

    fxEnabled.pitch = !fxEnabled.pitch;

    const btn =
        document.getElementById("fxPitchBtn");

    if(btn){

        btn.innerHTML =
            fxEnabled.pitch ?
            "🎵 Pitch ON" :
            "🎵 Pitch OFF";

    }

}

/* ===== REVERSE ===== */

function toggleFxReverse(){

    fxEnabled.reverse = !fxEnabled.reverse;

    const btn =
        document.getElementById("fxReverseBtn");

    if(btn){

        btn.innerHTML =
            fxEnabled.reverse ?
            "🔄 Reverse ON" :
            "🔄 Reverse OFF";

    }

}

/* ===== APPLY FX ===== */

function applyFxToSource(source){

    if(!source) return;

    let node = source;

    if(fxEnabled.delay){

        node.connect(delayNode);
        delayNode.connect(feedbackNode);
        feedbackNode.connect(delayNode);
        delayNode.connect(masterGain);

    }

    if(fxEnabled.reverb){

        node.connect(reverbNode);
        reverbNode.connect(masterGain);

    }

    node.connect(compressorNode);

}

/* ===== PITCH ===== */

function setPlaybackPitch(source,value){

    if(!source) return;

    source.playbackRate.value = value;

}

/* ===== REVERSE ===== */

function reverseAudioBuffer(buffer){

    if(!buffer) return;

    for(let c=0;c<buffer.numberOfChannels;c++){

        const data =
            buffer.getChannelData(c);

        data.reverse();

    }

}

/* ===== FX STATUS ===== */

function getFxStatus(){

    return{

        reverb:fxEnabled.reverb,

        delay:fxEnabled.delay,

        pitch:fxEnabled.pitch,

        reverse:fxEnabled.reverse

    };

}

/* ===== RESET ===== */

function resetFxEngine(){

    fxEnabled.reverb=false;
    fxEnabled.delay=false;
    fxEnabled.pitch=false;
    fxEnabled.reverse=false;

}

/* ===== INIT ===== */

document.addEventListener(

    "click",

    function(){

        if(!fxInputNode){

            initFxEngine();

        }

    },

    {once:true}

);

console.log(
"Audio Engine Tahap 5 Loaded"
);
/* =========================================
   AUDIO-ENGINE.JS V4.5
   TAHAP 6
   Final Engine
========================================= */

/* ===== RECORDER ===== */

let engineRecorder = null;
let engineRecordedChunks = [];
let engineRecordingStream = null;
let engineIsRecording = false;

async function startEngineRecorder() {
    try {
        engineRecordingStream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        engineRecordedChunks = [];

        engineRecorder = new MediaRecorder(engineRecordingStream);

        engineRecorder.ondataavailable = function (event) {
            if (event.data.size > 0) {
                engineRecordedChunks.push(event.data);
            }
        };

        engineRecorder.start();
        engineIsRecording = true;

        updateEngineRecordStatus("Recording...");

    } catch (err) {
        console.error(err);
        updateEngineRecordStatus("Mic tidak bisa digunakan.");
    }
}

function stopEngineRecorder() {
    return new Promise(function (resolve) {
        if (!engineRecorder || !engineIsRecording) {
            resolve(null);
            return;
        }

        engineRecorder.onstop = function () {
            const blob = new Blob(engineRecordedChunks, {
                type: "audio/webm"
            });

            if (engineRecordingStream) {
                engineRecordingStream.getTracks().forEach(function (track) {
                    track.stop();
                });
            }

            engineIsRecording = false;
            updateEngineRecordStatus("Recording selesai.");

            resolve(blob);
        };

        engineRecorder.stop();
    });
}

function updateEngineRecordStatus(text) {
    const status = document.getElementById("recordStatus");
    if (status) {
        status.innerHTML = "Status: " + text;
    }
}

/* ===== ANALYSER / SPECTRUM ===== */

let analyserNode = null;
let analyserData = null;

function initAnalyserEngine() {
    if (!audioContext || !masterGain) return;

    if (analyserNode) return;

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;

    analyserData = new Uint8Array(analyserNode.frequencyBinCount);

    masterGain.connect(analyserNode);
}

function getSpectrumData() {
    if (!analyserNode) {
        initAnalyserEngine();
    }

    if (!analyserNode || !analyserData) return [];

    analyserNode.getByteFrequencyData(analyserData);

    return Array.from(analyserData);
}

function getWaveformData() {
    if (!analyserNode) {
        initAnalyserEngine();
    }

    if (!analyserNode || !analyserData) return [];

    analyserNode.getByteTimeDomainData(analyserData);

    return Array.from(analyserData);
}

/* ===== DRAW SIMPLE WAVEFORM ===== */

function drawWaveformToElement(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const data = getWaveformData();

    if (!data.length) {
        el.innerHTML = "<span class='empty-record'>Belum ada waveform</span>";
        return;
    }

    let bars = "";

    for (let i = 0; i < data.length; i += 64) {
        const v = data[i];
        const level = Math.floor((v / 255) * 8);

        bars += "▁▂▃▄▅▆▇█"[level] || "▁";
    }

    el.innerHTML = bars;
}

/* ===== OFFLINE RENDER ===== */

async function renderBufferOfflineV45(buffer, options = {}) {
    if (!buffer) return null;

    const sampleRate = options.sampleRate || 44100;
    const channels = options.channels || 2;

    const length = Math.ceil(buffer.duration * sampleRate);

    const offlineCtx = new OfflineAudioContext(
        channels,
        length,
        sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const gain = offlineCtx.createGain();
    gain.gain.value = options.volume ?? 1;

    source.playbackRate.value = options.pitch || 1;

    source.connect(gain);
    gain.connect(offlineCtx.destination);

    source.start(0);

    return await offlineCtx.startRendering();
}

/* ===== EXPORT RENDER HELPERS ===== */

function audioBufferToStereoFloat(audioBuffer) {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1
        ? audioBuffer.getChannelData(1)
        : left;

    return {
        left: new Float32Array(left),
        right: new Float32Array(right),
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration
    };
}

function createSilentStereoBuffer(duration, sampleRate = 44100) {
    const samples = Math.ceil(duration * sampleRate);

    return {
        left: new Float32Array(samples),
        right: new Float32Array(samples),
        sampleRate: sampleRate,
        duration: duration
    };
}

function mixStereoBuffer(target, source, startSeconds = 0, volume = 1, pan = 0) {
    const startSample = Math.floor(startSeconds * target.sampleRate);

    const lGain = pan <= 0 ? 1 : 1 - pan;
    const rGain = pan >= 0 ? 1 : 1 + pan;

    for (let i = 0; i < source.left.length; i++) {
        const index = startSample + i;
        if (index >= target.left.length) break;

        target.left[index] += source.left[i] * volume * lGain;
        target.right[index] += source.right[i] * volume * rGain;
    }
}

/* ===== MEMORY CLEANUP ===== */

function disposeAudioEngineCache() {
    clearAllAudioBuffer();
    console.log("Audio buffer cache dibersihkan.");
}

function stopAllAudioEngine() {
    stopAudioPlayback();
    pauseTimelineEngine();

    Object.keys(mixerTracks).forEach(function (name) {
        const track = mixerTracks[name];
        try {
            track.gain.disconnect();
            track.pan.disconnect();
        } catch (e) {}
    });
}

async function closeAudioEngine() {
    stopAllAudioEngine();
    disposeAudioEngineCache();

    if (audioContext) {
        try {
            await audioContext.close();
        } catch (e) {}
    }

    audioContext = null;
    masterGain = null;
}

/* ===== FINAL STATUS ===== */

function getAudioEngineFullStatus() {
    return {
        ready: !!audioContext,
        state: audioContext ? audioContext.state : "none",
        masterVolume: masterVolume,
        bufferCount: Object.keys(audioBufferCache).length,
        mixerTracks: Object.keys(mixerTracks).length,
        recording: engineIsRecording,
        fx: typeof getFxStatus === "function" ? getFxStatus() : {},
        timeline: typeof getTimelineEngineStatus === "function"
            ? getTimelineEngineStatus()
            : {}
    };
}

console.log("Audio Engine Tahap 6 Loaded");
