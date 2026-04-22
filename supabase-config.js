// ============================================
// YAMIFY ULTIMATE - Supabase Configuration
// Database: vsonrlptlfuomdawpewa.supabase.co
// ============================================

const SUPABASE_URL = 'https://vsonrlptlfuomdawpewa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s6ifPt76DmLW9DJaUD_6cw_SQnbiblp';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
        params: {
            eventsPerSecond: 20,
            heartbeatIntervalMs: 15000
        }
    },
    db: {
        schema: 'public'
    },
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: localStorage
    }
});

// Global State
let currentUser = null;
let allSongs = [];
let userLikedSongs = new Set();
let userPlaylists = [];
let recentlyPlayedIds = new Set();
let audioElement = null;
let isPlaying = false;
let currentPlaylist = [];
let currentSongIndex = 0;
let currentPlayingSong = null;
let currentQueue = [];
let repeatMode = 'none'; // 'none', 'one', 'all'
let isShuffle = false;
let originalPlaylist = [];
let crossfadeDuration = 0;
let currentVolume = 70;
let currentQuality = 'medium';
let dataSaverMode = false;

// Equalizer State
let eqEnabled = false;
let eqBands = {
    31: 0, 62: 0, 125: 0, 250: 0, 500: 0,
    1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0
};
let audioContext = null;
let gainNodes = [];
let sourceNode = null;

// Radio State
let radioInterval = null;
let isRadioPlaying = false;
let currentRadioStation = null;

// Helper Functions
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    return currentUser;
}

async function logoutUser() {
    if (radioInterval) clearInterval(radioInterval);
    if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
    }
    await supabase.auth.signOut();
    localStorage.removeItem('yamify_guest');
    localStorage.removeItem('yamify_queue');
    localStorage.removeItem('yamify_settings');
    window.location.href = '/index.html';
}

function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(`yamify_${key}`, JSON.stringify(value));
    } catch(e) { console.warn('Storage save failed:', e); }
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
    
    const bgColor = type === 'error' ? '#E5484D' : (type === 'success' ? '#1DB954' : '#1DB954');
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${bgColor};
        color: ${bgColor === '#1DB954' ? '#000' : '#fff'};
        padding: 14px 28px;
        border-radius: 500px;
        font-size: 14px;
        font-weight: 600;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        font-family: 'Circular Std', sans-serif;
    `;
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', duration);
}

window.showToast = showToast;
window.formatDuration = formatDuration;
window.escapeHtml = escapeHtml;
window.debounce = debounce;
window.throttle = throttle;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;