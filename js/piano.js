/* ===== V4.5 Tahap 8F-2: Piano JS ===== */
let piano={C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,B5:987.77,C6:1046.5,D6:1174.66};

function playPiano(note,rec=true){tone(note,piano,'triangle','Piano',rec,.75)}
