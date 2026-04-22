// ============================================
// YAMIFY - Audio Effects Module FINAL
// ============================================

window.initEqualizer = function() {
    const container = document.getElementById('equalizerContainer');
    if (!container) return;
    
    const bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    container.innerHTML = `
        <div class="eq-bands">
            ${bands.map(freq => `
                <div class="eq-band">
                    <label>${freq} Hz</label>
                    <input type="range" id="eq_${freq}" min="-12" max="12" value="${window.eqBands[freq] || 0}" step="0.5">
                    <span id="eq_val_${freq}">${window.eqBands[freq] || 0} dB</span>
                </div>
            `).join('')}
        </div>
        <div style="margin-top:20px">
            <button id="enableEqBtn" style="background:${window.eqEnabled ? '#1DB954' : '#282828'};border:none;padding:10px;border-radius:500px;color:${window.eqEnabled ? '#000' : '#fff'};cursor:pointer;width:100%">
                ${window.eqEnabled ? '🔊 EQ ON' : '🔇 EQ OFF'}
            </button>
        </div>
    `;
    
    bands.forEach(freq => {
        const slider = document.getElementById(`eq_${freq}`);
        const valueSpan = document.getElementById(`eq_val_${freq}`);
        if (slider) {
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                window.eqBands[freq] = value;
                if (valueSpan) valueSpan.innerText = value + ' dB';
                showToast(`${freq} Hz: ${value} dB`, 1000);
            });
        }
    });
    
    const enableBtn = document.getElementById('enableEqBtn');
    if (enableBtn) {
        enableBtn.addEventListener('click', () => {
            window.eqEnabled = !window.eqEnabled;
            enableBtn.innerHTML = window.eqEnabled ? '🔊 EQ ON' : '🔇 EQ OFF';
            enableBtn.style.background = window.eqEnabled ? '#1DB954' : '#282828';
            enableBtn.style.color = window.eqEnabled ? '#000' : '#fff';
            showToast(window.eqEnabled ? 'Equalizer ON' : 'Equalizer OFF', 1500);
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
                const presets = {
                    normal: { 31:0,62:0,125:0,250:0,500:0,1000:0,2000:0,4000:0,8000:0,16000:0 },
                    bass: { 31:6,62:5,125:4,250:2,500:0,1000:0,2000:0,4000:0,8000:0,16000:0 },
                    treble: { 31:0,62:0,125:0,250:0,500:0,1000:2,2000:4,4000:5,8000:6,16000:6 },
                    vocal: { 31:-2,62:-1,125:0,250:1,500:2,1000:3,2000:4,4000:3,8000:1,16000:0 }
                };
                const selected = presets[btn.dataset.preset];
                if (selected) {
                    for (const [freq, value] of Object.entries(selected)) {
                        window.eqBands[freq] = value;
                        const slider = document.getElementById(`eq_${freq}`);
                        const valueSpan = document.getElementById(`eq_val_${freq}`);
                        if (slider) slider.value = value;
                        if (valueSpan) valueSpan.innerText = value + ' dB';
                    }
                    showToast(`Preset ${btn.dataset.preset} diterapkan`, 1500);
                }
            });
        });
    }
};

console.log('✅ Effects module ready');
