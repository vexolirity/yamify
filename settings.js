// ============================================
// YAMIFY - Settings Module FINAL
// ============================================

window.initSettings = function() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.documentElement.setAttribute('data-theme', theme);
            saveToLocalStorage('theme', theme);
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showToast(`Tema: ${theme}`, 1000);
        });
    });
    
    const qualitySelect = document.getElementById('qualitySelect');
    if (qualitySelect) {
        qualitySelect.value = loadFromLocalStorage('quality', 'medium');
        qualitySelect.addEventListener('change', (e) => {
            window.currentQuality = e.target.value;
            saveToLocalStorage('quality', window.currentQuality);
            showToast(`Kualitas: ${window.currentQuality === 'high' ? 'Tinggi' : window.currentQuality === 'medium' ? 'Sedang' : 'Rendah'}`, 1000);
        });
    }
    
    const dataSaverCheck = document.getElementById('dataSaver');
    if (dataSaverCheck) {
        dataSaverCheck.checked = loadFromLocalStorage('dataSaver', false);
        dataSaverCheck.addEventListener('change', (e) => {
            window.dataSaverMode = e.target.checked;
            saveToLocalStorage('dataSaver', window.dataSaverMode);
        });
    }
    
    const crossfadeSlider = document.getElementById('crossfadeSlider');
    const crossfadeValue = document.getElementById('crossfadeValue');
    if (crossfadeSlider && crossfadeValue) {
        crossfadeSlider.value = loadFromLocalStorage('crossfade', 0);
        crossfadeValue.innerText = crossfadeSlider.value;
        crossfadeSlider.addEventListener('input', (e) => {
            window.crossfadeDuration = parseInt(e.target.value);
            crossfadeValue.innerText = window.crossfadeDuration;
            saveToLocalStorage('crossfade', window.crossfadeDuration);
        });
    }
    
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            if (confirm('Hapus semua cache?')) {
                localStorage.clear();
                window.currentQueue = [];
                showToast('Cache dibersihkan, reload dalam 2 detik', 2000);
                setTimeout(() => window.location.reload(), 2000);
            }
        });
    }
    
    const savedTheme = loadFromLocalStorage('theme', 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === savedTheme) btn.classList.add('active');
    });
};

console.log('✅ Settings module ready');
