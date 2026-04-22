// ============================================
// YAMIFY - Supabase Configuration FINAL
// ============================================

const SUPABASE_URL = 'https://vsonrlptlfuomdawpewa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s6ifPt76DmLW9DJaUD_6cw_SQnbiblp';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// GLOBAL STATE
window.currentUser = null;
window.allSongs = [];
window.userLikedSongs = new Set();
window.userPlaylists = [];
window.currentPlaylist = [];
window.originalPlaylist = [];
window.currentSongIndex = 0;
window.currentPlayingSong = null;
window.currentQueue = [];
window.repeatMode = 'none';
window.isShuffle = false;
window.crossfadeDuration = 0;
window.currentVolume = 70;
window.currentQuality = 'medium';
window.dataSaverMode = false;
window.audioElement = null;
window.isPlaying = false;
window.radioInterval = null;
window.eqEnabled = false;
window.eqBands = { 31:0,62:0,125:0,250:0,500:0,1000:0,2000:0,4000:0,8000:0,16000:0 };
window.audioContext = null;

// HELPER FUNCTIONS
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function saveToLocalStorage(key, value) {
    try { localStorage.setItem(`yamify_${key}`, JSON.stringify(value)); } catch(e) {}
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(`yamify_${key}`);
        return data ? JSON.parse(data) : defaultValue;
    } catch(e) { return defaultValue; }
}

function showToast(message, duration = 2000, type = 'default') {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        document.body.appendChild(toast);
    }
    const bgColor = type === 'error' ? '#E5484D' : '#1DB954';
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: ${bgColor}; color: ${bgColor === '#1DB954' ? '#000' : '#fff'};
        padding: 14px 28px; border-radius: 500px; font-size: 14px; font-weight: 600;
        z-index: 1000; opacity: 0; transition: opacity 0.2s; pointer-events: none;
        white-space: nowrap; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', duration);
}

window.formatDuration = formatDuration;
window.escapeHtml = escapeHtml;
window.debounce = debounce;
window.throttle = throttle;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.showToast = showToast;
window.supabase = supabase;

console.log('✅ Supabase config loaded');
