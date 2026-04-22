// ============================================
// YAMIFY - Supabase Client & Global State
// ============================================

const SUPABASE_URL = 'https://vsonrlptlfuomdawpewa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s6ifPt76DmLW9DJaUD_6cw_SQnbiblp';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
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

// Helper functions
async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    return currentUser;
}

async function logoutUser() {
    await supabase.auth.signOut();
    localStorage.removeItem('yamify_guest');
    window.location.href = '/index.html';
}

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

function showToast(message, duration = 2000) {
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #1DB954;
            color: black;
            padding: 12px 24px;
            border-radius: 40px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            white-space: nowrap;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, duration);
}

// Fix untuk localhost: ambil base URL yang benar
function getBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5500';
    }
    return window.location.origin;
}