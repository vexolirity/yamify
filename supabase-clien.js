// ============================================
// YAMIFY - Supabase Client
// ============================================

const SUPABASE_URL = 'https://vsonrlptlfuomdawpewa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s6ifPt76DmLW9DJaUD_6cw_SQnbiblp';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentUser = null;
let currentPlayingSong = null;
let audioElement = null;
let isPlaying = false;
let currentPlaylist = [];
let currentSongIndex = 0;
let allSongs = [];
let userLikedSongs = new Set();
let recentlyPlayed = [];

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