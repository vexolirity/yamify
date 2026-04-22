// ============================================
// YAMIFY ULTIMATE - Settings Module
// Theme, Quality, Cache Management
// ============================================

function initSettings() {
    // Theme switcher
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
        });
    });
    
    // Quality selector
    const qualitySelect = document.getElementById('qualitySelect');
    if (qualitySelect) {
        qualitySelect.value = loadFromLocalStorage('quality', 'medium');
        qualitySelect.addEventListener('change', (e) => {
            currentQuality = e.target.value;
            saveToLocalStorage('quality', currentQuality);
            showToast(`Kualitas audio: ${currentQuality === 'high' ? 'Tinggi' : currentQuality === 'medium' ? 'Sedang' : 'Rendah'}`, 1500);
        });
    }
    
    // Data saver
    const dataSaverCheck = document.getElementById('dataSaver');
    if (dataSaverCheck) {
        dataSaverCheck.checked = loadFromLocalStorage('dataSaver', false);
        dataSaverCheck.addEventListener('change', (e) => {
            dataSaverMode = e.target.checked;
            saveToLocalStorage('dataSaver', dataSaverMode);
            showToast(dataSaverMode ? 'Mode hemat data aktif' : 'Mode hemat data nonaktif', 1500);
        });
    }
    
    // Crossfade
    const crossfadeSlider = document.getElementById('crossfadeSlider');
    const crossfadeValue = document.getElementById('crossfadeValue');
    if (crossfadeSlider && crossfadeValue) {
        crossfadeSlider.value = loadFromLocalStorage('crossfade', 0);
        crossfadeValue.innerText = crossfadeSlider.value;
        crossfadeSlider.addEventListener('input', (e) => {
            crossfadeDuration = parseInt(e.target.value);
            crossfadeValue.innerText = crossfadeDuration;
            saveToLocalStorage('crossfade', crossfadeDuration);
        });
    }
    
    // Clear cache
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearAllCache);
    }
}

function clearAllCache() {
    if (confirm('Hapus semua cache termasuk antrian dan riwayat?')) {
        // Clear localStorage
        localStorage.removeItem('yamify_queue');
        localStorage.removeItem('yamify_eq_enabled');
        localStorage.removeItem('yamify_eq_bands');
        
        // Clear IndexedDB if exists
        if (window.indexedDB) {
            indexedDB.databases().then(dbs => {
                dbs.forEach(db => {
                    if (db.name && db.name.includes('yamify')) {
                        indexedDB.deleteDatabase(db.name);
                    }
                });
            });
        }
        
        // Reset queue
        currentQueue = [];
        renderQueue();
        
        showToast('Cache berhasil dibersihkan', 2000, 'success');
        
        // Reload page after 1 second
        setTimeout(() => window.location.reload(), 1000);
    }
}

window.initSettings = initSettings;
window.clearAllCache = clearAllCache;