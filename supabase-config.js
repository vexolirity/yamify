// ============================================
// YAMIFY - CONFIGURATION
// ============================================

const SUPABASE_URL = 'https://vsonrlptlfuomdawpewa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s6ifPt76DmLW9DJaUD_6cw_SQnbiblp';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabase = supabase;
window.currentUser = null;
window.allSongs = [];
window.userLikedSongs = new Set();
window.userPlaylists = [];
window.currentPlayingSong = null;
window.audioElement = null;
window.isPlaying = false;

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

function showToast(msg, duration = 2000) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1DB954;color:#000;padding:12px 24px;border-radius:500px;font-size:14px;font-weight:600;z-index:9999;opacity:0;transition:0.2s;white-space:nowrap`;
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', duration);
}

window.formatDuration = formatDuration;
window.escapeHtml = escapeHtml;
window.showToast = showToast;

console.log('✅ Config loaded');
