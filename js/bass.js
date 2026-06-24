/* ===== V4.5 Tahap 8F-2: Bass JS ===== */
let bass={C2:65.41,D2:73.42,E2:82.41,F2:87.31,G2:98,A2:110,B2:123.47,C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,B3:246.94,C4:261.63,D4:293.66};

function playBass(note,rec=true){tone(note,bass,'square','Bass',rec,.55)}
