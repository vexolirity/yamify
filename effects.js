// ============================================
// YAMIFY ULTIMATE - Audio Effects Module
// Equalizer 10-Band, Bass Boost, Presets
// ============================================

function initEqualizer() {
    const container = document.getElementById('equalizerContainer');
    if (!container) return;
    
    const bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    container.innerHTML = `
        <div class="eq-bands">
            ${bands.map(freq => `
                <div class="eq-band">
                    <label>${freq} Hz</label>
                    <input type="range" id="eq_${freq}" min="-12" max="12" value="${eqBands[freq]}" step="0.5">
                    <span id="eq_val_${freq}">${eqBands[freq]} dB</span>
                </div>
            `).join('')}
        </div>
        <div class="eq-controls" style="display:flex;gap:12px;margin-top:20px;">
            <button id="enableEqBtn" style="flex:1;background:${eqEnabled ? '#1DB954' : '#282828'};border:none;padding:10px;border-radius:500px;color:${eqEnabled ? '#000' : '#fff'};font-weight:600;cursor:pointer;">
                ${eqEnabled ? '🔊 EQ ON' : '🔇 EQ OFF'}
            </button>
        </div>
    `;
    
    // Add event listeners
    bands.forEach(freq => {
        const slider = document.getElementById(`eq_${freq}`);
        const valueSpan = document.getElementById(`eq_val_${freq}`);
        
        if (slider) {
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                eqBands[freq] = value;
                if (valueSpan) valueSpan.innerText = value + ' dB';
                if (eqEnabled && audioElement && audioElement.src) {
                    applyEqualizer();
                }
                saveEqSettings();
            });
        }
    });
    
    const enableBtn = document.getElementById('enableEqBtn');
    if (enableBtn) {
        enableBtn.addEventListener('click', () => {
            eqEnabled = !eqEnabled;
            enableBtn.innerHTML = eqEnabled ? '🔊 EQ ON' : '🔇 EQ OFF';
            enableBtn.style.background = eqEnabled ? '#1DB954' : '#282828';
            enableBtn.style.color = eqEnabled ? '#000' : '#fff';
            
            if (eqEnabled && audioElement && audioElement.src) {
                applyEqualizer();
            } else if (!eqEnabled && audioElement) {
                removeEqualizer();
            }
            
            saveEqSettings();
        });
    }
    
    const presetContainer = document.getElementById('eqPresets');
    const presetBtn = document.getElementById('eqPresetBtn');
    
    if (presetBtn && presetContainer) {
        presetBtn.addEventListener('click', () => {
            presetContainer.style.display = presetContainer.style.display === 'none' ? 'flex' : 'none';
        });
        
        document.querySelectorAll('[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                applyPreset(btn.dataset.preset);
            });
        });
    }
    
    loadEqSettings();
}

function applyPreset(preset) {
    const presets = {
        normal: { 31:0,62:0,125:0,250:0,500:0,1000:0,2000:0,4000:0,8000:0,16000:0 },
        bass: { 31:6,62:5,125:4,250:2,500:0,1000:0,2000:0,4000:0,8000:0,16000:0 },
        treble: { 31:0,62:0,125:0,250:0,500:0,1000:2,2000:4,4000:5,8000:6,16000:6 },
        vocal: { 31:-2,62:-1,125:0,250:1,500:2,1000:3,2000:4,4000:3,8000:1,16000:0 },
        electronic: { 31:4,62:5,125:3,250:1,500:0,1000:1,2000:3,4000:4,8000:5,16000:5 },
        rock: { 31:4,62:3,125:2,250:1,500:0,1000:1,2000:3,4000:4,8000:3,16000:2 },
        classical: { 31:-2,62:-1,125:0,250:1,500:2,1000:2,2000:1,4000:0,8000:-1,16000:-2 }
    };
    
    const selected = presets[preset];
    if (!selected) return;
    
    for (const [freq, value] of Object.entries(selected)) {
        eqBands[freq] = value;
        const slider = document.getElementById(`eq_${freq}`);
        const valueSpan = document.getElementById(`eq_val_${freq}`);
        if (slider) {
            slider.value = value;
            if (valueSpan) valueSpan.innerText = value + ' dB';
        }
    }
    
    if (eqEnabled && audioElement && audioElement.src) {
        applyEqualizer();
    }
    
    saveEqSettings();
    showToast(`Preset ${preset} diterapkan`, 1500);
}

function createAudioContext() {
    if (!audioContext && window.AudioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function applyEqualizer() {
    if (!eqEnabled) return;
    
    const context = createAudioContext();
    if (!context || !audioElement || !audioElement.src) return;
    
    try {
        if (sourceNode) {
            try { sourceNode.disconnect(); } catch(e) {}
        }
        
        const source = context.createMediaElementSource(audioElement);
        const bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        
        gainNodes = [];
        let previousNode = source;
        
        bands.forEach((freq, idx) => {
            const filter = context.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = eqBands[freq];
            
            previousNode.connect(filter);
            gainNodes.push(filter);
            previousNode = filter;
        });
        
        previousNode.connect(context.destination);
        sourceNode = source;
        
        if (context.state === 'suspended') {
            context.resume();
        }
    } catch(e) {
        console.warn('Equalizer error:', e);
    }
}

function applyEqualizerToCurrentSource() {
    if (eqEnabled) {
        applyEqualizer();
    }
}

function removeEqualizer() {
    if (sourceNode) {
        try {
            sourceNode.disconnect();
            sourceNode = null;
        } catch(e) {}
    }
    
    if (audioElement && audioElement.src) {
        // Reconnect directly
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
            audioContext = null;
        }
    }
}

function saveEqSettings() {
    saveToLocalStorage('eq_enabled', eqEnabled);
    saveToLocalStorage('eq_bands', eqBands);
}

function loadEqSettings() {
    const savedEnabled = loadFromLocalStorage('eq_enabled', false);
    const savedBands = loadFromLocalStorage('eq_bands', null);
    
    eqEnabled = savedEnabled;
    if (savedBands) {
        eqBands = { ...eqBands, ...savedBands };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initEqualizer();
});

window.initEqualizer = initEqualizer;
window.applyEqualizer = applyEqualizer;
window.applyPreset = applyPreset;