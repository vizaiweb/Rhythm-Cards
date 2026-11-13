// rhythm-main.js
var BASE_URL = 'https://vizaiweb.github.io/Rhythm-Cards/Notes/';
const IMAGE_LIBRARY = [
    { name: '1000', url: BASE_URL + '1000.png' }, { name: '1001', url: BASE_URL + '1001.png' },
    { name: '1010', url: BASE_URL + '1010.png' }, { name: '1011', url: BASE_URL + '1011.png' },
    { name: '1100', url: BASE_URL + '1100.png' }, { name: '1101', url: BASE_URL + '1101.png' },
    { name: '1110', url: BASE_URL + '1110.png' }, { name: '1111', url: BASE_URL + '1111.png' },
    { name: 'x100', url: BASE_URL + 'x100.png' }, { name: 'x101', url: BASE_URL + 'x101.png' },
    { name: 'x110', url: BASE_URL + 'x110.png' }, { name: 'x111', url: BASE_URL + 'x111.png' },
    { name: 'xx10', url: BASE_URL + 'xx10.png' }, { name: 'xx11', url: BASE_URL + 'xx11.png' },
    { name: 'xxx1', url: BASE_URL + 'xxx1.png' }, { name: 'xxxx', url: BASE_URL + 'xxxx.png' }
];
var ROWS = 4, COLS = 4, TOTAL_SLOTS = 4;
var RHYTHM_LIBRARY = [
    ['light','light','light','light'], ['accent','light','light','light'], ['light','accent','light','light'],
    ['light','light','accent','light'], ['light','light','light','accent'], ['accent','sustain','sustain','sustain'],
    ['accent','sustain','light','light'], ['light','light','accent','sustain'], ['accent','sustain','accent','sustain'],
    ['accent','accent','light','light'], ['light','light','accent','accent'], ['accent','accent','sustain','light'],
    ['accent','sustain','sustain','light'], ['light','accent','sustain','sustain'], ['accent','accent','accent','sustain'],
    ['accent','accent','accent','accent']
];
var TUPLET_TYPES = [
    { id: 'triplet', label: '3', css: 'triplet' }, { id: 'quintuplet', label: '5', css: 'quintuplet' },
    { id: 'sextuplet', label: '6', css: 'sextuplet' }, { id: 'septuplet', label: '7', css: 'septuplet' },
    { id: 'octuplet', label: '8', css: 'octuplet' }
];
var slotData = [], slotEnabled = [], frameImages = [];
for (var s = 0; s < TOTAL_SLOTS; s++) {
    var grid = [], imgRow = [];
    for (var r = 0; r < ROWS; r++) {
        var row = []; for (var c = 0; c < COLS; c++) row.push(0);
        grid.push(row); imgRow.push(null);
    }
    slotData.push(grid); slotEnabled.push(true); frameImages.push(imgRow);
}
var beatTuplets = {}, mergePairs = {};
var isPlaying = false, prepTimerId = null, metroTimeoutId = null;
var bpm = 120, volume = 0.8, metronomeOn = false, metroVolume = 0.5, loopCount = 16;
var totalPositions = 0, metroBeatCounter = 0, currentTargetSlot = null, currentTargetRow = null;
var playState = { isActive: false, events: [], eventIndex: 0, startTime: 0, rafId: null, scheduledNodes: [] };
var rhythmDrag = { isDragging: false, active: false }, tupletDrag = { isDragging: false, active: false };
var tupletTargetSlot = null, tupletTargetRow = null, tupletTargetCol = null;
var audioCtx = null, masterGain = null, metroGain = null;
var slotRowContainer = document.getElementById('slotRowContainer');
var slotTogglesBar = document.getElementById('slotTogglesBar');
var playBtn = document.getElementById('playBtn');
var metroToggleBtn = document.getElementById('metroToggleBtn');
var bpmSlider = document.getElementById('bpmSlider');
var bpmDisplay = document.getElementById('bpmDisplay');
var volumeSlider = document.getElementById('volumeSlider');
var volumeDisplay = document.getElementById('volumeDisplay');
var metroVolumeSlider = document.getElementById('metroVolumeSlider');
var metroVolDisplay = document.getElementById('metroVolDisplay');
var randomBtn = document.getElementById('randomBtn');
var clearBtn = document.getElementById('clearBtn');
var selectAllBtn = document.getElementById('selectAllBtn');
var statusText = document.getElementById('statusText');
var rhythmToolBtn = document.getElementById('rhythmToolBtn');
var tupletToolBtn = document.getElementById('tupletToolBtn');
var dragGhost = document.getElementById('dragGhost');
var rhythmPicker = document.getElementById('rhythmPicker');
var rhythmPickerGrid = document.getElementById('rhythmPickerGrid');
var rhythmPickerCancel = document.getElementById('rhythmPickerCancel');
var tupletPicker = document.getElementById('tupletPicker');
var tupletPickerTitle = document.getElementById('tupletPickerTitle');
var tupletPickerSubtitle = document.getElementById('tupletPickerSubtitle');
var tupletPickerGrid = document.getElementById('tupletPickerGrid');
var mergeUpPickerGrid = document.getElementById('mergeUpPickerGrid');
var mergeDownPickerGrid = document.getElementById('mergeDownPickerGrid');
var tupletPickerCancel = document.getElementById('tupletPickerCancel');
var imagePicker = document.getElementById('imagePicker');
var imagePickerGrid = document.getElementById('imagePickerGrid');
var imagePickerCancel = document.getElementById('imagePickerCancel');
var loopCountSelect = document.getElementById('loopCountSelect');

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain(); masterGain.gain.value = volume; masterGain.connect(audioCtx.destination);
        metroGain = audioCtx.createGain(); metroGain.gain.value = metroVolume * 0.4; metroGain.connect(masterGain);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}
function playKickAtTime(time) {
    try {
        var ctx = initAudio(); var t = Math.max(ctx.currentTime + 0.001, time);
        var osc = ctx.createOscillator(); var gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(120, t); osc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
        gain.gain.setValueAtTime(1.0, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain); gain.connect(masterGain); osc.start(t); osc.stop(t + 0.1);
        var bufSize = ctx.sampleRate * 0.04; var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
        var noise = ctx.createBufferSource(); noise.buffer = buf; var ng = ctx.createGain();
        ng.gain.setValueAtTime(0.3, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        noise.connect(ng); ng.connect(masterGain); noise.start(t); noise.stop(t + 0.04);
        if (playState.isActive) playState.scheduledNodes.push({ osc: osc, gain: gain, noise: noise, ng: ng });
    } catch (e) {}
}
function playTickAtTime(time) {
    try {
        var ctx = initAudio(); var t = Math.max(ctx.currentTime + 0.001, time);
        var osc = ctx.createOscillator(); var gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1500, t);
        gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain); gain.connect(masterGain); osc.start(t); osc.stop(t + 0.04);
        setTimeout(function() { try { osc.disconnect(); gain.disconnect(); } catch(e){} }, 50);
    } catch (e) {}
}
function playMetroAtTime(time) {
    try {
        var ctx = initAudio(); var t = Math.max(ctx.currentTime + 0.005, time);
        var osc = ctx.createOscillator(); var gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1500, t);
        gain.gain.setValueAtTime(1.0, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.connect(gain); gain.connect(metroGain); osc.start(t); osc.stop(t + 0.03);
        setTimeout(function() { try { osc.disconnect(); gain.disconnect(); } catch(e){} }, 50);
    } catch (e) {}
}
function getCellTuplet(slot, row, col) {
    if (beatTuplets[slot] && beatTuplets[slot][row] && beatTuplets[slot][row][col] !== undefined) return beatTuplets[slot][row][col];
    return null;
}
function getMergePair(slot, row, col) {
    if (!mergePairs[slot]) return null;
    for (var i = 0; i < mergePairs[slot].length; i++) {
        var p = mergePairs[slot][i];
        if ((p.row1 === row && p.col1 === col) || (p.row2 === row && p.col2 === col)) return p;
    }
    return null;
}
function addMergePair(slot, row1, col1, row2, col2, type) {
    if (!mergePairs[slot]) mergePairs[slot] = [];
    for (var i = 0; i < mergePairs[slot].length; i++) {
        var p = mergePairs[slot][i];
        if ((p.row1 === row1 && p.col1 === col1 && p.row2 === row2 && p.col2 === col2) || (p.row1 === row2 && p.col1 === col2 && p.row2 === row1 && p.col2 === col1)) return;
    }
    mergePairs[slot].push({ row1: row1, col1: col1, row2: row2, col2: col2, type: type });
}
function removeMergePairWithCells(slot, row1, col1, row2, col2) {
    if (!mergePairs[slot]) return false;
    for (var i = 0; i < mergePairs[slot].length; i++) {
        var p = mergePairs[slot][i];
        if ((p.row1 === row1 && p.col1 === col1) || (p.row2 === row1 && p.col2 === col1) || (p.row1 === row2 && p.col1 === col2) || (p.row2 === row2 && p.col2 === col2)) {
            mergePairs[slot].splice(i, 1); if (mergePairs[slot].length === 0) delete mergePairs[slot]; return true;
        }
    }
    return false;
}
function removeMergePair(slot, row, col) {
    if (!mergePairs[slot]) return false;
    for (var i = 0; i < mergePairs[slot].length; i++) {
        var p = mergePairs[slot][i];
        if ((p.row1 === row && p.col1 === col) || (p.row2 === row && p.col2 === col)) {
            mergePairs[slot].splice(i, 1); if (mergePairs[slot].length === 0) delete mergePairs[slot]; return true;
        }
    }
    return false;
}
function showImagePicker(slotIdx, rowIdx) {
    currentTargetSlot = slotIdx; currentTargetRow = rowIdx; imagePickerGrid.innerHTML = '';
    IMAGE_LIBRARY.forEach(function(item) {
        var el = document.createElement('div'); el.className = 'img-item';
        el.innerHTML = '<img src="' + item.url + '" alt="' + item.name + '"><span>' + item.name + '</span>';
        el.onclick = function() { applyImagePattern(slotIdx, rowIdx, item.name, item.url); imagePicker.style.display = 'none'; };
        imagePickerGrid.appendChild(el);
    });
    imagePicker.style.display = 'block';
    statusText.textContent = '🖼️ Pick image (Slot ' + (slotIdx + 1) + ' Beat ' + (rowIdx + 1) + ')';
}
function applyImagePattern(slotIdx, rowIdx, name, url) {
    var newPattern = [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
        var char = name[i] || 'x';
        if (char === '1') newPattern[i] = 1; else if (char === '0') newPattern[i] = 2; else newPattern[i] = 0;
    }
    slotData[slotIdx][rowIdx] = newPattern; frameImages[slotIdx][rowIdx] = url;
    if (beatTuplets[slotIdx] && beatTuplets[slotIdx][rowIdx]) delete beatTuplets[slotIdx][rowIdx];
    if (mergePairs[slotIdx]) {
        mergePairs[slotIdx] = mergePairs[slotIdx].filter(function(p) { return p.row1 !== rowIdx && p.row2 !== rowIdx; });
        if (mergePairs[slotIdx].length === 0) delete mergePairs[slotIdx];
    }
    renderSlots(); statusText.textContent = '✅ Applied image & rhythm: ' + name;
}
imagePickerCancel.onclick = function() { imagePicker.style.display = 'none'; };

function renderTopToggles() {
    slotTogglesBar.innerHTML = '';
    for (var s = 0; s < TOTAL_SLOTS; s++) {
        var btn = document.createElement('div');
        btn.className = 'top-toggle-btn ' + (slotEnabled[s] ? 'active' : 'inactive');
        btn.innerHTML = '<span class="card-num">' + ['①','②','③','④'][s] + '</span><span class="card-status">' + (slotEnabled[s] ? 'On' : 'Off') + '</span>';
        btn.onclick = (function(idx) { return function() { toggleSlot(idx); }; })(s);
        slotTogglesBar.appendChild(btn);
    }
}
function renderSlots() {
    slotRowContainer.innerHTML = '';
    for (var s = 0; s < TOTAL_SLOTS; s++) {
        var enabled = slotEnabled[s];
        var rowEl = document.createElement('div');
        rowEl.className = 'slot-row' + (enabled ? '' : ' disabled');
        rowEl.setAttribute('data-slot', s);
        var framesWrapper = document.createElement('div'); framesWrapper.className = 'frames-wrapper';
        for (var r = 0; r < ROWS; r++) {
            var frameEl = document.createElement('div'); frameEl.className = 'frame';
            frameEl.setAttribute('data-slot', s); frameEl.setAttribute('data-row', r);
            var imgArea = document.createElement('div'); imgArea.className = 'image-area';
            imgArea.onclick = (function(sIdx, rIdx) {
                return function(e) {
                    e.stopPropagation();
                    if (e.target.classList.contains('drop-dot')) return;
                    if (isPlaying) return;
                    showImagePicker(sIdx, rIdx);
                };
            })(s, r);
            var dot = document.createElement('div'); dot.className = 'drop-dot';
            dot.setAttribute('data-slot', s); dot.setAttribute('data-row', r);
            dot.addEventListener('mouseenter', function() { if (rhythmDrag.active) this.classList.add('drag-over'); });
            dot.addEventListener('mouseleave', function() { this.classList.remove('drag-over'); });
            imgArea.appendChild(dot);
            var imgData = frameImages[s][r];
            if (imgData) {
                var img = document.createElement('img'); img.src = imgData;
                img.onerror = function() { this.style.display = 'none'; this.parentElement.innerHTML += '<div class="placeholder" style="color:#d46a6a;">Load failed<br>Check URL</div>'; };
                imgArea.appendChild(img);
            } else {
                var placeholder = document.createElement('div'); placeholder.className = 'placeholder';
                placeholder.innerHTML = 'Click to pick<br>note image';
                imgArea.appendChild(placeholder);
            }
            var controlsEl = document.createElement('div'); controlsEl.className = 'frame-controls';
            var gridEl = document.createElement('div'); gridEl.className = 'grid';
            for (var c = 0; c < COLS; c++) {
                var cell = document.createElement('div');
                var cellState = slotData[s][r][c]; var tuplet = getCellTuplet(s, r, c); var merge = getMergePair(s, r, c);
                var cellClass = 'cell ';
                if (merge) {
                    var info = TUPLET_TYPES.find(function(t) { return t.id === merge.type; });
                    if (info) cellClass += info.css + ' ';
                    if (r === merge.row1 && c === merge.col1) cellClass += 'merge-start ';
                    else if (r === merge.row2 && c === merge.col2) cellClass += 'merge-end ';
                } else if (tuplet) {
                    var info2 = TUPLET_TYPES.find(function(t) { return t.id === tuplet; });
                    if (info2) cellClass += info2.css + ' ';
                } else {
                    if (cellState === 1) cellClass += 'accent'; else if (cellState === 2) cellClass += 'sustain'; else cellClass += 'light';
                }
                cell.className = cellClass.trim();
                cell.setAttribute('data-slot', s); cell.setAttribute('data-row', r); cell.setAttribute('data-col', c);
                var label = document.createElement('span'); label.className = 'tuplet-label';
                var labelText = '';
                if (merge) { var i3 = TUPLET_TYPES.find(function(t) { return t.id === merge.type; }); labelText = i3 ? ('-' + i3.label + '-') : ''; }
                else if (tuplet) { var i4 = TUPLET_TYPES.find(function(t) { return t.id === tuplet; }); labelText = i4 ? ('-' + i4.label + '-') : ''; }
                if (labelText) { label.textContent = labelText; cell.appendChild(label); }
                cell.onclick = function(e) {
                    e.stopPropagation();
                    if (isPlaying) return;
                    var si = parseInt(this.getAttribute('data-slot'));
                    var ri = parseInt(this.getAttribute('data-row'));
                    var ci = parseInt(this.getAttribute('data-col'));
                    if (getMergePair(si, ri, ci)) { removeMergePair(si, ri, ci); renderSlots(); statusText.textContent = '↺ Merge cleared'; return; }
                    if (beatTuplets[si] && beatTuplets[si][ri] && beatTuplets[si][ri][ci] !== undefined) {
                        delete beatTuplets[si][ri][ci];
                        if (Object.keys(beatTuplets[si][ri]).length === 0) delete beatTuplets[si][ri];
                        if (Object.keys(beatTuplets[si]).length === 0) delete beatTuplets[si];
                        renderSlots(); statusText.textContent = '↺ Tuplet cleared'; return;
                    }
                    var current = slotData[si][ri][ci]; slotData[si][ri][ci] = (current + 1) % 3; renderSlots();
                };
                gridEl.appendChild(cell);
            }
            controlsEl.appendChild(gridEl);
            frameEl.appendChild(imgArea); frameEl.appendChild(controlsEl);
            framesWrapper.appendChild(frameEl);
        }
        rowEl.appendChild(framesWrapper); slotRowContainer.appendChild(rowEl);
    }
    updateSelectAllButton();
}
function toggleSlot(slotIdx) {
    if (isPlaying) return;
    slotEnabled[slotIdx] = !slotEnabled[slotIdx];
    renderTopToggles(); renderSlots();
    statusText.textContent = 'Selected ' + slotEnabled.filter(Boolean).length + ' slots';
}
function updateSelectAllButton() {
    selectAllBtn.textContent = slotEnabled.every(Boolean) ? '☑ All' : '☐ All';
}
function applyRhythmPattern(slotIdx, row, pattern) {
    for (var c = 0; c < COLS; c++) {
        var p = pattern[c]; slotData[slotIdx][row][c] = (p === 'accent') ? 1 : (p === 'sustain' ? 2 : 0);
    }
    if (beatTuplets[slotIdx]) { delete beatTuplets[slotIdx][row]; if (Object.keys(beatTuplets[slotIdx]).length === 0) delete beatTuplets[slotIdx]; }
    if (mergePairs[slotIdx]) { mergePairs[slotIdx] = mergePairs[slotIdx].filter(function(p) { return p.row1 !== row && p.row2 !== row; }); if (mergePairs[slotIdx].length === 0) delete mergePairs[slotIdx]; }
    renderSlots(); statusText.textContent = '✅ Slot ' + (slotIdx + 1) + ' Beat ' + (row + 1) + ' set';
}

function getSubInterval() { return (60000 / bpm) / 4 / 1000; }
function getBeatInterval() { return (60000 / bpm) / 1000; }
function getEnabledPositions() {
    var positions = [];
    for (var s = 0; s < TOTAL_SLOTS; s++) {
        if (!slotEnabled[s]) continue;
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) positions.push({ slot: s, row: r, col: c });
    }
    return positions;
}
function isAccent(slot, row, col) { return slotData[slot] && slotData[slot][row] && slotData[slot][row][col] === 1; }
function generateEvents(positions, startTime) {
    var events = [], interval = getSubInterval(), totalPositions = positions.length, totalEvents = totalPositions * loopCount;
    for (var i = 0; i < totalEvents; i++) {
        var pos = positions[i % totalPositions]; var time = startTime + i * interval;
        var slot = pos.slot, row = pos.row, col = pos.col; var mergePair = getMergePair(slot, row, col);
        if (mergePair) {
            var isStart = (row === mergePair.row1 && col === mergePair.col1);
            var isEnd = (row === mergePair.row2 && col === mergePair.col2);
            if (isStart) {
                var info = TUPLET_TYPES.find(function(t) { return t.id === mergePair.type; });
                var divisions = info ? parseInt(info.label) : 3;
                events.push({ time: time, slot: slot, row: row, col: col, type: 'merge', divisions: divisions, subDuration: (interval * 2) / divisions, idx1: mergePair.row1 * COLS + mergePair.col1, idx2: mergePair.row2 * COLS + mergePair.col2 });
                continue;
            }
            if (isEnd) continue;
        }
        var tuplet = getCellTuplet(slot, row, col);
        if (tuplet) {
            var info2 = TUPLET_TYPES.find(function(t) { return t.id === tuplet; });
            var divisions2 = info2 ? parseInt(info2.label) : 3;
            events.push({ time: time, slot: slot, row: row, col: col, type: 'tuplet', divisions: divisions2, subDuration: interval / divisions2, cellIdx: row * COLS + col, hasSound: true });
            continue;
        }
        events.push({ time: time, slot: slot, row: row, col: col, type: 'normal', cellIdx: row * COLS + col, hasSound: isAccent(slot, row, col) });
    }
    return events;
}
function clearAllHighlights() {
    document.querySelectorAll('.cell.playing').forEach(function(el) { el.classList.remove('playing'); });
    document.querySelectorAll('.drop-dot.active').forEach(function(el) { el.classList.remove('active'); });
    document.querySelectorAll('.frame.playing-frame').forEach(function(el) { el.classList.remove('playing-frame'); });
}
function applyHighlight(event) {
    var slot = event.slot, row = event.row;
    var rowEl = slotRowContainer.querySelector('.slot-row[data-slot="' + slot + '"]');
    if (!rowEl) return;
    clearAllHighlights();
    var frameEl = rowEl.querySelector('.frame[data-slot="' + slot + '"][data-row="' + row + '"]');
    if (frameEl) frameEl.classList.add('playing-frame');
    var cells = rowEl.querySelectorAll('.frame[data-row="' + row + '"] .cell');
    if (event.type === 'merge') {
        if (event.idx1 % COLS < cells.length) cells[event.idx1 % COLS].classList.add('playing');
        if (event.idx2 % COLS < cells.length) cells[event.idx2 % COLS].classList.add('playing');
    } else {
        if (event.cellIdx % COLS < cells.length) cells[event.cellIdx % COLS].classList.add('playing');
    }
    var dot = rowEl.querySelector('.frame[data-row="' + row + '"] .drop-dot');
    if (dot) dot.classList.add('active');
}
function renderLoop() {
    if (!playState.isActive) return;
    var now = audioCtx.currentTime, index = playState.eventIndex;
    while (index < playState.events.length && playState.events[index].time < now + 0.01) {
        applyHighlight(playState.events[index]); index++;
    }
    playState.eventIndex = index;
    if (isPlaying && totalPositions > 0) {
        var currentLoop = Math.floor(index / totalPositions) + 1;
        if (currentLoop <= loopCount) {
            statusText.textContent = '▶ Playing... ' + currentLoop + '/' + loopCount;
            statusText.className = 'status-text playing';
        }
    }
    if (index < playState.events.length) {
        playState.rafId = requestAnimationFrame(renderLoop);
    } else {
        playState.isActive = false;
        if (isPlaying) {
            isPlaying = false;
            playBtn.innerHTML = '▶ <span id="playLabel">Play</span>'; playBtn.classList.remove('playing');
            statusText.textContent = '⏹ Done (' + loopCount + ' loops)'; statusText.className = 'status-text';
            clearAllHighlights();
            if (metroTimeoutId) { clearTimeout(metroTimeoutId); metroTimeoutId = null; }
        }
    }
}
function scheduleNextMetro() {
    if (!isPlaying || !metronomeOn) { metroTimeoutId = null; return; }
    metroTimeoutId = setTimeout(function() {
        if (!isPlaying || !metronomeOn) { metroTimeoutId = null; return; }
        playMetroAtTime(audioCtx.currentTime); metroBeatCounter++; scheduleNextMetro();
    }, getBeatInterval() * 1000 - 3);
}
function startMetro() {
    if (metroTimeoutId) clearTimeout(metroTimeoutId);
    metroBeatCounter = 0;
    if (isPlaying && metronomeOn) {
        playMetroAtTime(audioCtx.currentTime); metroBeatCounter = 1; scheduleNextMetro();
    }
}
function stopMetro() {
    if (metroTimeoutId) clearTimeout(metroTimeoutId);
    metroTimeoutId = null; metroBeatCounter = 0;
}
function playFromStart() {
    if (isPlaying) stopPlayback();

    // 先確保 AudioContext 存在（initAudio 內部會嘗試 resume，但我們不等待它）
    initAudio();

    var positions = getEnabledPositions();
    if (positions.length === 0) { statusText.textContent = '⚠️ No enabled slots'; return; }
    totalPositions = positions.length;

    var hasSound = positions.some(function(p) { return isAccent(p.slot, p.row, p.col) || getCellTuplet(p.slot, p.row, p.col) || getMergePair(p.slot, p.row, p.col); });
    if (!hasSound) { statusText.textContent = '⚠️ No accents or tuplets'; return; }

    isPlaying = true;
    playBtn.innerHTML = '⏹ <span id="playLabel">Stop</span>'; playBtn.classList.add('playing');
    statusText.textContent = '▶ Preparing...'; statusText.className = 'status-text playing';

    var ctx = audioCtx, beatInterval = getBeatInterval(), prepCount = 0;
    if (prepTimerId) clearInterval(prepTimerId);

    prepTimerId = setInterval(function() {
        if (prepCount >= 4) {
            clearInterval(prepTimerId); prepTimerId = null;
            setTimeout(function() {
                if (!isPlaying) return;
                // 真正開始前，再嘗試一次 resume（不等待）
                if (audioCtx && audioCtx.state !== 'running') {
                    try { audioCtx.resume(); } catch (e) {}
                }
                var startTime = ctx.currentTime + 0.05;
                playState.events = generateEvents(positions, startTime);
                playState.eventIndex = 0; playState.startTime = startTime; playState.isActive = true; playState.scheduledNodes = [];
                playState.events.forEach(function(ev) {
                    if (ev.type === 'merge') { for (var k = 0; k < ev.divisions; k++) playKickAtTime(ev.time + k * ev.subDuration); }
                    else if (ev.type === 'tuplet' && ev.hasSound) { for (var k2 = 0; k2 < ev.divisions; k2++) playKickAtTime(ev.time + k2 * ev.subDuration); }
                    else if (ev.type === 'normal' && ev.hasSound) { playKickAtTime(ev.time); }
                });
                if (metronomeOn) startMetro();
                clearAllHighlights();
                statusText.textContent = '▶ Playing... 1/' + loopCount; statusText.className = 'status-text playing';
                playState.rafId = requestAnimationFrame(renderLoop);
            }, 80);
            return;
        }
        playTickAtTime(ctx.currentTime); prepCount++;
        statusText.textContent = '▶ Prep ' + prepCount + '/4';
    }, beatInterval * 1000);
}
function stopPlayback() {
    isPlaying = false; playState.isActive = false;
    if (playState.rafId) { cancelAnimationFrame(playState.rafId); playState.rafId = null; }
    stopMetro();
    if (playState.scheduledNodes) {
        playState.scheduledNodes.forEach(function(nodes) {
            try {
                if (nodes.osc) { nodes.osc.stop(0); nodes.osc.disconnect(); }
                if (nodes.gain) nodes.gain.disconnect();
                if (nodes.noise) { nodes.noise.stop(0); nodes.noise.disconnect(); }
                if (nodes.ng) nodes.ng.disconnect();
            } catch (e) {}
        });
        playState.scheduledNodes = [];
    }
    if (prepTimerId) { clearInterval(prepTimerId); prepTimerId = null; }
    clearAllHighlights();
    playBtn.innerHTML = '▶ <span id="playLabel">Play</span>'; playBtn.classList.remove('playing');
    statusText.textContent = '⏹ Stopped'; statusText.className = 'status-text';
    playState.events = []; playState.eventIndex = 0; totalPositions = 0;
}
function togglePlay() { if (isPlaying) stopPlayback(); else playFromStart(); }
function toggleMetro() {
    metronomeOn = !metronomeOn; metroToggleBtn.textContent = metronomeOn ? 'On' : 'Off';
    metroToggleBtn.classList.toggle('on', metronomeOn);
    if (metronomeOn && isPlaying) startMetro(); else if (!metronomeOn) stopMetro();
}
function initRhythmDrag() {
    rhythmToolBtn.addEventListener('mousedown', function(e) { e.preventDefault(); rhythmStartDrag(e.clientX, e.clientY); });
    rhythmToolBtn.addEventListener('touchstart', function(e) { e.preventDefault(); var t = e.touches[0]; rhythmStartDrag(t.clientX, t.clientY); }, { passive: false });
}
function rhythmStartDrag(x, y) {
    rhythmDrag.isDragging = true; rhythmDrag.active = true; rhythmToolBtn.classList.add('active');
    dragGhost.textContent = '🎵 Normal'; dragGhost.classList.add('visible');
    dragGhost.style.left = (x + 12) + 'px'; dragGhost.style.top = (y + 12) + 'px';
    document.addEventListener('mousemove', rhythmOnDragMove); document.addEventListener('mouseup', rhythmOnDragEnd);
    document.addEventListener('touchmove', rhythmOnDragMove, { passive: false }); document.addEventListener('touchend', rhythmOnDragEnd, { passive: false });
    statusText.textContent = '🖱️ Drag "Normal" to blue dot';
}
function rhythmOnDragMove(e) {
    e.preventDefault();
    var x = e.touches ? e.touches[0].clientX : e.clientX; var y = e.touches ? e.touches[0].clientY : e.clientY;
    dragGhost.style.left = (x + 12) + 'px'; dragGhost.style.top = (y + 12) + 'px';
    document.querySelectorAll('.drop-dot.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
    var target = document.elementFromPoint(x, y);
    if (target) { var dot = target.closest('.drop-dot'); if (dot && rhythmDrag.active) dot.classList.add('drag-over'); }
}
function rhythmOnDragEnd(e) {
    document.removeEventListener('mousemove', rhythmOnDragMove); document.removeEventListener('mouseup', rhythmOnDragEnd);
    document.removeEventListener('touchmove', rhythmOnDragMove); document.removeEventListener('touchend', rhythmOnDragEnd);
    document.querySelectorAll('.drop-dot.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
    dragGhost.classList.remove('visible'); rhythmToolBtn.classList.remove('active');
    var x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX; var y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    setTimeout(function() {
        var target = document.elementFromPoint(x, y);
        if (target) {
            var dot = target.closest('.drop-dot');
            if (dot) {
                var slotIdx = parseInt(dot.getAttribute('data-slot')); var row = parseInt(dot.getAttribute('data-row'));
                if (!isNaN(slotIdx) && !isNaN(row) && slotEnabled[slotIdx]) showRhythmPicker(slotIdx, row);
            } else {
                var cell = target.closest('.cell');
                if (cell) statusText.textContent = '⚠️ Drop on the blue dot left of the beat';
            }
        }
        rhythmDrag.active = false; rhythmDrag.isDragging = false;
    }, 10);
}
function initTupletDrag() {
    tupletToolBtn.addEventListener('mousedown', function(e) { e.preventDefault(); tupletStartDrag(e.clientX, e.clientY); });
    tupletToolBtn.addEventListener('touchstart', function(e) { e.preventDefault(); var t = e.touches[0]; tupletStartDrag(t.clientX, t.clientY); }, { passive: false });
}
function tupletStartDrag(x, y) {
    tupletDrag.isDragging = true; tupletDrag.active = true; tupletTargetSlot = null; tupletTargetRow = null; tupletTargetCol = null;
    tupletToolBtn.classList.add('active'); dragGhost.textContent = '🔀 Tuplet'; dragGhost.classList.add('visible');
    dragGhost.style.left = (x + 12) + 'px'; dragGhost.style.top = (y + 12) + 'px';
    document.addEventListener('mousemove', tupletOnDragMove); document.addEventListener('mouseup', tupletOnDragEnd);
    document.addEventListener('touchmove', tupletOnDragMove, { passive: false }); document.addEventListener('touchend', tupletOnDragEnd, { passive: false });
    statusText.textContent = '🖱️ Drag "Tuplet" to a grid cell';
}
function tupletOnDragMove(e) {
    e.preventDefault();
    var x = e.touches ? e.touches[0].clientX : e.clientX; var y = e.touches ? e.touches[0].clientY : e.clientY;
    dragGhost.style.left = (x + 12) + 'px'; dragGhost.style.top = (y + 12) + 'px';
    document.querySelectorAll('.cell.drag-highlight').forEach(function(el) { el.classList.remove('drag-highlight'); });
    var target = document.elementFromPoint(x, y);
    if (target) {
        var cell = target.closest('.cell');
        if (cell && tupletDrag.active) {
            var slotIdx = parseInt(cell.getAttribute('data-slot')); var row = parseInt(cell.getAttribute('data-row')); var col = parseInt(cell.getAttribute('data-col'));
            if (!isNaN(slotIdx) && !isNaN(row) && !isNaN(col) && slotEnabled[slotIdx]) {
                tupletTargetSlot = slotIdx; tupletTargetRow = row; tupletTargetCol = col;
                cell.classList.add('drag-highlight');
                statusText.textContent = '🔀 Target: Slot ' + (slotIdx + 1) + ' Beat ' + (row + 1) + ' Cell ' + (col + 1);
            }
        } else {
            var dot = target.closest('.drop-dot');
            if (dot) statusText.textContent = '⚠️ Drop on a single 16th-note cell';
        }
    }
}
function tupletOnDragEnd(e) {
    document.removeEventListener('mousemove', tupletOnDragMove); document.removeEventListener('mouseup', tupletOnDragEnd);
    document.removeEventListener('touchmove', tupletOnDragMove); document.removeEventListener('touchend', tupletOnDragEnd);
    document.querySelectorAll('.cell.drag-highlight').forEach(function(el) { el.classList.remove('drag-highlight'); });
    dragGhost.classList.remove('visible'); tupletToolBtn.classList.remove('active');
    var x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX; var y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    setTimeout(function() {
        if (tupletTargetSlot !== null && tupletTargetRow !== null && tupletTargetCol !== null) showTupletPicker(tupletTargetSlot, tupletTargetRow, tupletTargetCol);
        else {
            var target = document.elementFromPoint(x, y);
            if (target && target.closest('.drop-dot')) statusText.textContent = '⚠️ Drop on a single 16th-note cell';
        }
        tupletTargetSlot = null; tupletTargetRow = null; tupletTargetCol = null;
        tupletDrag.active = false; tupletDrag.isDragging = false;
    }, 10);
}
function showRhythmPicker(slotIdx, row) {
    rhythmPickerGrid.innerHTML = '';
    RHYTHM_LIBRARY.forEach(function(pattern, idx) {
        var item = document.createElement('div'); item.className = 'picker-item';
        item.textContent = pattern.map(function(p) { return p === 'accent' ? '◉' : (p === 'sustain' ? '▬' : '○'); }).join(' ');
        item.setAttribute('data-idx', idx);
        item.onclick = function() { applyRhythmPattern(slotIdx, row, RHYTHM_LIBRARY[parseInt(this.getAttribute('data-idx'))]); rhythmPicker.style.display = 'none'; };
        rhythmPickerGrid.appendChild(item);
    });
    rhythmPicker.style.display = 'block';
    statusText.textContent = '🎵 Pick rhythm (Slot ' + (slotIdx + 1) + ' Beat ' + (row + 1) + ')';
}
rhythmPickerCancel.onclick = function() { rhythmPicker.style.display = 'none'; };
function showTupletPicker(slotIdx, row, col) {
    tupletPickerGrid.innerHTML = ''; mergeUpPickerGrid.innerHTML = ''; mergeDownPickerGrid.innerHTML = '';
    tupletPickerTitle.textContent = '🔀 Tuplet (Slot ' + (slotIdx + 1) + ' · Beat ' + (row + 1) + ' Cell ' + (col + 1) + ')';
    TUPLET_TYPES.forEach(function(t) {
        var item = document.createElement('div'); item.className = 'picker-item'; item.textContent = t.label + ' tuplet';
        item.onclick = function() { applyBeatTuplet(slotIdx, row, col, t.id); };
        tupletPickerGrid.appendChild(item);
    });
    var canMergeUp = false, upRow = row, upCol = col - 1;
    if (col > 0) canMergeUp = true; else if (row > 0) { canMergeUp = true; upRow = row - 1; upCol = COLS - 1; }
    if (canMergeUp) {
        TUPLET_TYPES.forEach(function(t) {
            var item = document.createElement('div'); item.className = 'picker-item merge-up'; item.textContent = '↑ ' + t.label;
            item.onclick = function() { applyMergeUp(slotIdx, row, col, upRow, upCol, t.id); };
            mergeUpPickerGrid.appendChild(item);
        });
    } else { var d = document.createElement('div'); d.className = 'picker-item disabled'; d.textContent = '🚫 Cannot merge up'; mergeUpPickerGrid.appendChild(d); }
    var canMergeDown = false, downRow = row, downCol = col + 1;
    if (col < COLS - 1) canMergeDown = true; else if (row < ROWS - 1) { canMergeDown = true; downRow = row + 1; downCol = 0; }
    if (canMergeDown) {
        TUPLET_TYPES.forEach(function(t) {
            var item = document.createElement('div'); item.className = 'picker-item merge-down'; item.textContent = '↓ ' + t.label;
            item.onclick = function() { applyMergeDown(slotIdx, row, col, downRow, downCol, t.id); };
            mergeDownPickerGrid.appendChild(item);
        });
    } else { var d2 = document.createElement('div'); d2.className = 'picker-item disabled'; d2.textContent = '🚫 Cannot merge down'; mergeDownPickerGrid.appendChild(d2); }
    tupletPicker.style.display = 'block';
    statusText.textContent = '🔀 Pick tuplet (Slot ' + (slotIdx + 1) + ' Beat ' + (row + 1) + ' Cell ' + (col + 1) + ')';
}
tupletPickerCancel.onclick = function() { tupletPicker.style.display = 'none'; };
function applyBeatTuplet(slotIdx, row, col, tupletId) {
    removeMergePair(slotIdx, row, col);
    if (!beatTuplets[slotIdx]) beatTuplets[slotIdx] = {};
    if (!beatTuplets[slotIdx][row]) beatTuplets[slotIdx][row] = {};
    beatTuplets[slotIdx][row][col] = tupletId; slotData[slotIdx][row][col] = 1;
    renderSlots(); tupletPicker.style.display = 'none';
    var info = TUPLET_TYPES.find(function(t) { return t.id === tupletId; });
    statusText.textContent = '✅ Slot ' + (slotIdx + 1) + ' Beat ' + (row + 1) + ' Cell ' + (col + 1) + ' → ' + (info ? info.label : '') + ' tuplet';
}
function applyMergeUp(slotIdx, row, col, upRow, upCol, tupletId) {
    if (beatTuplets[slotIdx]) {
        if (beatTuplets[slotIdx][row] && beatTuplets[slotIdx][row][col] !== undefined) delete beatTuplets[slotIdx][row][col];
        if (beatTuplets[slotIdx][upRow] && beatTuplets[slotIdx][upRow][upCol] !== undefined) delete beatTuplets[slotIdx][upRow][upCol];
    }
    removeMergePairWithCells(slotIdx, row, col, upRow, upCol);
    var r1, c1, r2, c2;
    if (row < upRow || (row === upRow && col < upCol)) { r1 = row; c1 = col; r2 = upRow; c2 = upCol; } else { r1 = upRow; c1 = upCol; r2 = row; c2 = col; }
    addMergePair(slotIdx, r1, c1, r2, c2, tupletId);
    slotData[slotIdx][row][col] = 1; slotData[slotIdx][upRow][upCol] = 1;
    renderSlots(); tupletPicker.style.display = 'none';
    statusText.textContent = '✅ Merge up set';
}
function applyMergeDown(slotIdx, row, col, downRow, downCol, tupletId) {
    if (beatTuplets[slotIdx]) {
        if (beatTuplets[slotIdx][row] && beatTuplets[slotIdx][row][col] !== undefined) delete beatTuplets[slotIdx][row][col];
        if (beatTuplets[slotIdx][downRow] && beatTuplets[slotIdx][downRow][downCol] !== undefined) delete beatTuplets[slotIdx][downRow][downCol];
    }
    removeMergePairWithCells(slotIdx, row, col, downRow, downCol);
    var r1, c1, r2, c2;
    if (row < downRow || (row === downRow && col < downCol)) { r1 = row; c1 = col; r2 = downRow; c2 = downCol; } else { r1 = downRow; c1 = downCol; r2 = row; c2 = col; }
    addMergePair(slotIdx, r1, c1, r2, c2, tupletId);
    slotData[slotIdx][row][col] = 1; slotData[slotIdx][downRow][downCol] = 1;
    renderSlots(); tupletPicker.style.display = 'none';
    statusText.textContent = '✅ Merge down set';
}
document.addEventListener('click', function(e) {
    if (rhythmPicker.style.display === 'block' && !rhythmPicker.contains(e.target)) rhythmPicker.style.display = 'none';
    if (tupletPicker.style.display === 'block' && !tupletPicker.contains(e.target)) tupletPicker.style.display = 'none';
    if (imagePicker.style.display === 'block' && !imagePicker.contains(e.target)) imagePicker.style.display = 'none';
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { rhythmPicker.style.display = 'none'; tupletPicker.style.display = 'none'; imagePicker.style.display = 'none'; }
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
});

document.addEventListener('visibilitychange', function() {
    if (document.hidden) return;
    // 页面重新可见时，检查 AudioContext 状态
    if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted')) {
        audioCtx.resume().then(function() {
            console.log('AudioContext resumed after visibility change');
        }).catch(function(e) {
            console.warn('Resume failed, may need user gesture:', e);
        });
    }
});

function randomGrid() {
    if (isPlaying) stopPlayback();
    beatTuplets = {}; mergePairs = {};
    for (var s = 0; s < TOTAL_SLOTS; s++) for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) slotData[s][r][c] = Math.floor(Math.random() * 3);
    renderSlots(); statusText.textContent = '🎲 Randomized';
}
function clearGrid() {
    if (isPlaying) stopPlayback();
    beatTuplets = {}; mergePairs = {};
    for (var s = 0; s < TOTAL_SLOTS; s++) for (var r = 0; r < ROWS; r++) { for (var c = 0; c < COLS; c++) slotData[s][r][c] = 0; frameImages[s][r] = null; }
    renderSlots(); statusText.textContent = '🗑 Cleared rhythm and images';
}
function toggleAllSlots() {
    if (isPlaying) return;
    var allEnabled = slotEnabled.every(Boolean);
    for (var i = 0; i < TOTAL_SLOTS; i++) slotEnabled[i] = !allEnabled;
    renderTopToggles(); renderSlots();
    statusText.textContent = allEnabled ? 'All deselected' : 'All selected';
}
playBtn.onclick = togglePlay; metroToggleBtn.onclick = toggleMetro; randomBtn.onclick = randomGrid; clearBtn.onclick = clearGrid; selectAllBtn.onclick = toggleAllSlots;
loopCountSelect.onchange = function() { loopCount = parseInt(this.value); };
bpmSlider.oninput = function() { bpm = parseInt(this.value); bpmDisplay.textContent = bpm; if (isPlaying) { stopPlayback(); setTimeout(playFromStart, 100); } };
volumeSlider.oninput = function() { volume = parseInt(this.value) / 100; volumeDisplay.textContent = Math.round(volume * 100) + '%'; if (masterGain) masterGain.gain.value = volume; };
metroVolumeSlider.oninput = function() { metroVolume = parseInt(this.value) / 100; metroVolDisplay.textContent = Math.round(metroVolume * 100) + '%'; if (metroGain) metroGain.gain.value = metroVolume * 0.4; };
document.addEventListener('click', function() { initAudio(); }, { once: true });
initRhythmDrag(); initTupletDrag(); renderTopToggles(); renderSlots(); statusText.textContent = '⏸ Ready';
