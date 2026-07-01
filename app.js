// Audio Context for Sounds
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

// Generate simple sounds using Oscillator to avoid external assets
function playSound(type) {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'success') {
        // Happy chime
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
        oscillator.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    } else if (type === 'error') {
        // Buzz
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.setValueAtTime(100, now + 0.2);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        
        // Vibration
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }
}

// Speak Word
function speakWord(word) {
    if ('speechSynthesis' in window) {
        // Remove accents if needed, but TTS usually handles it.
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'es-ES';
        utterance.rate = 0.8; // Slower for kids
        window.speechSynthesis.speak(utterance);
    }
}

// State
const state = {
    currentGroup: null,
    currentMode: null,
    words: [],
    currentIndex: 0,
    theme: 'uppercase', // uppercase or lowercase
    
    // Mode specific state
    droppedTiles: [],
    availableTiles: [],
    userInputLetters: []
};

// DOM Elements
const views = {
    menu: document.getElementById('view-menu'),
    modes: document.getElementById('view-modes'),
    game: document.getElementById('view-game'),
    end: document.getElementById('view-end')
};

const elements = {
    btnHome: document.getElementById('btn-home'),
    btnBack: document.getElementById('btn-back'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    btnCase: document.getElementById('btn-case'),
    menuGrid: document.getElementById('menu-grid'),
    modeGroupTitle: document.getElementById('mode-group-title'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    
    // Game elements
    gameTitle: document.getElementById('game-title'),
    progressFill: document.getElementById('progress-fill'),
    wordImage: document.getElementById('word-image'),
    btnTts: document.getElementById('btn-tts'),
    gameArea: document.getElementById('game-area'),
    gameControls: document.getElementById('game-controls'),
    btnCheck: document.getElementById('btn-check'),
    btnNext: document.getElementById('btn-next'),
    btnRestart: document.getElementById('btn-restart')
};

// Initialize Menu
function initMenu() {
    elements.menuGrid.innerHTML = '';
    for (const group in vocabularyData) {
        const btn = document.createElement('button');
        btn.className = 'group-btn';
        btn.textContent = group;
        btn.onclick = () => selectGroup(group);
        elements.menuGrid.appendChild(btn);
    }
}

function showView(viewName) {
    for (const key in views) {
        views[key].classList.remove('active');
        views[key].classList.add('hidden');
    }
    views[viewName].classList.remove('hidden');
    views[viewName].classList.add('active');
    
    if (viewName === 'menu') {
        elements.btnHome.classList.add('hidden');
        elements.btnBack.classList.add('hidden');
    } else if (viewName === 'modes') {
        elements.btnHome.classList.remove('hidden');
        elements.btnBack.classList.remove('hidden');
    } else {
        elements.btnHome.classList.remove('hidden');
        elements.btnBack.classList.remove('hidden');
    }
}

// Navigation
function selectGroup(group) {
    state.currentGroup = group;
    elements.modeGroupTitle.textContent = `Grupo: ${group}`;
    showView('modes');
}

elements.modeBtns.forEach(btn => {
    btn.onclick = () => {
        state.currentMode = parseInt(btn.dataset.mode);
        startGame();
    };
});

elements.btnHome.onclick = () => showView('menu');
elements.btnBack.onclick = () => {
    if (views.game.classList.contains('active')) {
        showView('modes');
    } else if (views.modes.classList.contains('active')) {
        showView('menu');
    } else if (views.end.classList.contains('active')) {
        showView('modes');
    }
};
elements.btnRestart.onclick = () => showView('menu');

// Controls
elements.btnFullscreen.onclick = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
};

elements.btnCase.onclick = () => {
    if (state.theme === 'uppercase') {
        state.theme = 'lowercase';
        document.body.classList.remove('theme-uppercase');
        document.body.classList.add('theme-lowercase');
    } else {
        state.theme = 'uppercase';
        document.body.classList.remove('theme-lowercase');
        document.body.classList.add('theme-uppercase');
    }
};

elements.btnTts.onclick = () => {
    const word = state.words[state.currentIndex].word;
    speakWord(word);
};

// Game Logic
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startGame() {
    // Clone and shuffle words
    state.words = shuffleArray(vocabularyData[state.currentGroup]);
    state.currentIndex = 0;
    
    const modeTitles = {
        1: 'Modo Lectura',
        2: 'Ordenar Sílabas',
        3: 'Ordenar Letras',
        4: 'Escribir Palabra'
    };
    elements.gameTitle.textContent = modeTitles[state.currentMode];
    
    showView('game');
    loadCurrentWord();
}

function updateProgress() {
    const percentage = (state.currentIndex / state.words.length) * 100;
    elements.progressFill.style.width = `${percentage}%`;
}

// Map specific words to local images
function getImageUrl(word) {
    // Normalizamos: minúsculas y sin tildes para facilitar nombrar los archivos
    const cleanWord = word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('u\u0308', 'ü');
    return `images/${cleanWord}.jpg`;
}

function loadCurrentWord() {
    updateProgress();
    elements.gameArea.innerHTML = '';
    elements.btnCheck.classList.add('hidden');
    elements.btnNext.classList.add('hidden');
    elements.gameControls.classList.add('hidden');
    
    const wordObj = state.words[state.currentIndex];
    
    // Set Image
    elements.wordImage.src = getImageUrl(wordObj.word);
    elements.wordImage.onerror = function() {
        this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23f1f2f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="%2357606f" font-family="sans-serif">Falta Imagen</text></svg>';
    };
    
    // Speak on load
    setTimeout(() => speakWord(wordObj.word), 500);

    // Setup Mode
    switch(state.currentMode) {
        case 1: setupMode1(wordObj); break;
        case 2: setupMode2(wordObj); break;
        case 3: setupMode3(wordObj); break;
        case 4: setupMode4(wordObj); break;
    }
}

// Mode 1: Read
function setupMode1(wordObj) {
    const display = document.createElement('div');
    display.className = 'word-display';
    display.textContent = wordObj.word;
    elements.gameArea.appendChild(display);
    
    elements.gameControls.classList.remove('hidden');
    elements.btnNext.classList.remove('hidden');
}

// Mode 2: Syllables
function setupMode2(wordObj) {
    elements.gameControls.classList.remove('hidden');
    elements.btnCheck.classList.remove('hidden');
    
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.id = 'drop-zone';
    
    const tilesContainer = document.createElement('div');
    tilesContainer.className = 'tiles-container';
    tilesContainer.id = 'tiles-container';
    
    elements.gameArea.appendChild(dropZone);
    elements.gameArea.appendChild(tilesContainer);
    
    state.availableTiles = shuffleArray(wordObj.syllables.map((s, i) => ({ id: i, text: normalizeWord(s) })));
    state.droppedTiles = [];
    
    renderTilesMode23();
}

// Mode 3: Letters
function setupMode3(wordObj) {
    elements.gameControls.classList.remove('hidden');
    elements.btnCheck.classList.remove('hidden');
    
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.id = 'drop-zone';
    
    const tilesContainer = document.createElement('div');
    tilesContainer.className = 'tiles-container';
    tilesContainer.id = 'tiles-container';
    
    elements.gameArea.appendChild(dropZone);
    elements.gameArea.appendChild(tilesContainer);
    
    // Quitamos las tildes a las letras tal como solicitó el usuario para no confundir a los niños
    const letters = normalizeWord(wordObj.word).split('');
    state.availableTiles = shuffleArray(letters.map((l, i) => ({ id: i, text: l })));
    state.droppedTiles = [];
    
    renderTilesMode23();
}

function renderTilesMode23() {
    const dropZone = document.getElementById('drop-zone');
    const tilesContainer = document.getElementById('tiles-container');
    
    dropZone.innerHTML = '';
    tilesContainer.innerHTML = '';
    
    state.droppedTiles.forEach((tileObj, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile in-dropzone';
        tile.textContent = tileObj.text;
        tile.onclick = () => {
            // Move back to available
            state.droppedTiles.splice(index, 1);
            state.availableTiles.push(tileObj);
            playSound('error'); // small tap sound
            renderTilesMode23();
        };
        dropZone.appendChild(tile);
    });
    
    state.availableTiles.forEach((tileObj, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.textContent = tileObj.text;
        tile.onclick = () => {
            // Move to dropped
            state.availableTiles.splice(index, 1);
            state.droppedTiles.push(tileObj);
            playSound('success'); // small tap sound (could use different sound)
            renderTilesMode23();
        };
        tilesContainer.appendChild(tile);
    });
}

function checkMode23() {
    const wordObj = state.words[state.currentIndex];
    let correctStr = '';
    if (state.currentMode === 2) {
        correctStr = wordObj.syllables.join('');
    } else {
        correctStr = wordObj.word;
    }
    
    const currentStr = state.droppedTiles.map(t => t.text).join('');
    
    // Normalize to compare (ignore case and accents)
    if (normalizeWord(currentStr) === normalizeWord(correctStr) && state.availableTiles.length === 0) {
        handleCorrect();
    } else {
        handleIncorrect();
    }
}

// Mode 4: Write
const QWERTY = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ü']
];

function normalizeWord(word) {
    // Reemplaza tildes pero conserva la diéresis
    const accents = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'Á': 'a', 'É': 'e', 'Í': 'i', 'Ó': 'o', 'Ú': 'u' };
    return word.split('').map(char => accents[char] || char.toLowerCase()).join('');
}

function setupMode4(wordObj) {
    elements.gameControls.classList.remove('hidden');
    elements.btnCheck.classList.remove('hidden');
    
    const cleanWord = normalizeWord(wordObj.word);
    state.userInputLetters = Array(cleanWord.length).fill('');
    state.currentInputIndex = 0;
    
    // Create Input Boxes
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    inputContainer.id = 'input-container';
    
    for (let i = 0; i < cleanWord.length; i++) {
        const box = document.createElement('div');
        box.className = 'letter-input';
        if (i === 0) box.classList.add('active');
        inputContainer.appendChild(box);
    }
    
    elements.gameArea.appendChild(inputContainer);
    
    // Create Keyboard
    const kb = document.createElement('div');
    kb.className = 'keyboard';
    
    QWERTY.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'key';
            btn.textContent = key;
            btn.onclick = () => handleKeyPress(key);
            rowDiv.appendChild(btn);
        });
        // Add delete to last row
        if (row.includes('Ü')) {
            const delBtn = document.createElement('button');
            delBtn.className = 'key key-delete';
            delBtn.innerHTML = '<i class="fas fa-backspace"></i>';
            delBtn.onclick = () => handleDelete();
            rowDiv.appendChild(delBtn);
        }
        kb.appendChild(rowDiv);
    });
    
    elements.gameArea.appendChild(kb);
    updateInputDisplay();
}

function handleKeyPress(char) {
    const wordObj = state.words[state.currentIndex];
    if (state.currentInputIndex < wordObj.word.length) {
        state.userInputLetters[state.currentInputIndex] = char.toLowerCase();
        state.currentInputIndex++;
        updateInputDisplay();
    }
}

function handleDelete() {
    if (state.currentInputIndex > 0) {
        state.currentInputIndex--;
        state.userInputLetters[state.currentInputIndex] = '';
        updateInputDisplay();
    }
}

function updateInputDisplay() {
    const boxes = document.getElementById('input-container').children;
    for (let i = 0; i < boxes.length; i++) {
        boxes[i].textContent = state.userInputLetters[i];
        boxes[i].className = 'letter-input';
        if (i === state.currentInputIndex) {
            boxes[i].classList.add('active');
        }
    }
}

function checkMode4() {
    const wordObj = state.words[state.currentIndex];
    const cleanWord = normalizeWord(wordObj.word);
    const inputWord = state.userInputLetters.join('');
    
    if (inputWord === cleanWord) {
        handleCorrect();
    } else {
        handleIncorrect();
    }
}

// General Check
elements.btnCheck.onclick = () => {
    if (state.currentMode === 2 || state.currentMode === 3) {
        checkMode23();
    } else if (state.currentMode === 4) {
        checkMode4();
    }
};

function handleCorrect() {
    playSound('success');
    elements.wordImage.classList.add('anim-success');
    setTimeout(() => elements.wordImage.classList.remove('anim-success'), 1000);
    
    elements.btnCheck.classList.add('hidden');
    elements.btnNext.classList.remove('hidden');
    
    if (state.currentMode === 4) {
        const boxes = document.getElementById('input-container').children;
        for (let i = 0; i < boxes.length; i++) {
            boxes[i].classList.add('correct');
        }
    }
}

function handleIncorrect() {
    playSound('error');
    elements.wordImage.classList.add('anim-error');
    setTimeout(() => elements.wordImage.classList.remove('anim-error'), 500);
    
    if (state.currentMode === 4) {
        const boxes = document.getElementById('input-container').children;
        for (let i = 0; i < boxes.length; i++) {
            boxes[i].classList.add('error');
            setTimeout(() => boxes[i].classList.remove('error'), 500);
        }
    }
}

elements.btnNext.onclick = () => {
    state.currentIndex++;
    if (state.currentIndex < state.words.length) {
        loadCurrentWord();
    } else {
        showEndScreen();
    }
};

function showEndScreen() {
    playSound('success'); // Play success again
    elements.progressFill.style.width = `100%`;
    showView('end');
}

// Init
initMenu();
showView('menu');
