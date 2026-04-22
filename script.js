// ============================================
// YAMIFY ULTIMATE - FULL SCRIPT
// ============================================

const SUPABASE_URL = 'https://vsonrlptlfuomdawpewa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s6ifPt76DmLW9DJaUD_6cw_SQnbiblp';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ GLOBAL STATE ============
let currentUser = null;
let allSongs = [];
let userLikedSongs = new Set();
let userPlaylists = [];
let audioElement = null;
let isPlaying = false;
let currentPlaylist = [];
let currentSongIndex = 0;
let currentPlayingSong = null;
let currentQueue = [];
let repeatMode = 'none';
let isShuffle = false;
let originalPlaylist = [];
let crossfadeDuration = 0;
let currentVolume = 70;

// Equalizer
let eqEnabled = false;
let eqBands = { 31:0, 62:0, 125:0, 250:0, 500:0, 1000:0, 2000:0, 4000:0, 8000:0, 16000:0 };
let audioContext = null;
let sourceNode = null;

// Radio
let radioInterval = null;
let isRadioPlaying = false;
let currentRadioStation = null;

// ============ HELPER FUNCTIONS ============
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function showToast(message, duration = 2000, isError = false) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1DB954;color:#000;padding:14px 28px;border-radius:500px;font-size:14px;font-weight:600;z-index:1000;opacity:0;transition:0.2s;pointer-events:none;white-space:nowrap;box-shadow:0 4px 15px rgba(0,0,0,0.3)';
        document.body.appendChild(toast);
    }
    toast.style.background = isError ? '#E5484D' : '#1DB954';
    toast.style.color = isError ? '#fff' : '#000';
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', duration);
}

function saveToLocalStorage(key, value) {
    try { localStorage.setItem(`yamify_${key}`, JSON.stringify(value)); } catch(e) {}
}

function loadFromLocalStorage(key, defaultValue = null) {
    try { const data = localStorage.getItem(`yamify_${key}`); return data ? JSON.parse(data) : defaultValue; } catch(e) { return defaultValue; }
}

// ============ AUTH ============
async function checkAuthAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    
    if (currentUser) {
        document.getElementById('userMenu').style.display = 'flex';
        const avatarUrl = currentUser.user_metadata?.avatar_url;
        document.getElementById('userAvatar').src = avatarUrl || `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${currentUser.email}`;
        document.getElementById('userName').textContent = currentUser.email?.split('@')[0] || 'User';
        return true;
    }
    
    const guestMode = localStorage.getItem('yamify_guest') === 'true';
    if (!guestMode && window.location.pathname.includes('dashboard.html')) {
        window.location.href = '/index.html';
        return false;
    }
    return false;
}

async function logoutUser() {
    if (radioInterval) clearInterval(radioInterval);
    if (audioElement) { audioElement.pause(); audioElement.src = ''; }
    await supabase.auth.signOut();
    localStorage.removeItem('yamify_guest');
    window.location.href = '/index.html';
}

document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);

// ============ LOAD SONGS ============
async function loadAllSongs() {
    const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
    if (error) { showToast('Gagal memuat lagu', 2000, true); return; }
    allSongs = data || [];
    renderLibrary();
    renderTopCharts();
}

function renderLibrary() {
    const container = document.getElementById('libraryGrid');
    if (!container) return;
    if (allSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>🎵</span><p>Belum ada lagu</p><button onclick="showPanel(\'upload\')">+ Upload Lagu</button></div>';
        return;
    }
    container.innerHTML = allSongs.map(song => `
        <div class="song-card" data-song-id="${song.id}">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" onerror="this.src='https://picsum.photos/200/200'">
                <div class="play-overlay" onclick="event.stopPropagation(); playSongById('${song.id}')"><span>▶️</span></div>
                <div class="like-btn-card ${userLikedSongs.has(song.id) ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike('${song.id}')"><span>${userLikedSongs.has(song.id) ? '❤️' : '🤍'}</span></div>
            </div>
            <div class="song-title" onclick="playSongById('${song.id}')">${escapeHtml(song.title)}</div>
            <div class="song-artist" onclick="playSongById('${song.id}')">${escapeHtml(song.artist)}</div>
            <div class="song-stats"><span>🎧 ${song.play_count || 0}</span><span>⏱️ ${formatDuration(song.duration)}</span></div>
        </div>
    `).join('');
}

function renderTopCharts() {
    const container = document.getElementById('topGrid');
    if (!container) return;
    const topSongs = [...allSongs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 20);
    if (topSongs.length === 0) { container.innerHTML = '<div class="empty-state"><span>🏆</span><p>Belum ada data</p></div>'; return; }
    container.innerHTML = topSongs.map((song, i) => `
        <div class="top-chart-item" onclick="playSongById('${song.id}')">
            <div class="top-chart-rank">#${i+1}</div>
            <img class="top-chart-cover" src="${song.cover_url || 'https://picsum.photos/50/50'}" onerror="this.src='https://picsum.photos/50/50'">
            <div class="top-chart-info"><div class="top-chart-title">${escapeHtml(song.title)}</div><div class="top-chart-artist">${escapeHtml(song.artist)}</div></div>
            <div class="top-chart-plays">${song.play_count || 0} plays</div>
        </div>
    `).join('');
}

// ============ LIKE SYSTEM ============
async function loadLikedSongs() {
    if (!currentUser) return;
    const { data } = await supabase.from('liked_songs').select('song_id').eq('user_id', currentUser.id);
    userLikedSongs.clear();
    data?.forEach(item => userLikedSongs.add(item.song_id));
    renderLikedSongs();
    renderLibrary();
}

function renderLikedSongs() {
    const container = document.getElementById('likedGrid');
    if (!container) return;
    const likedSongs = allSongs.filter(song => userLikedSongs.has(song.id));
    document.getElementById('likedCount').innerText = `${likedSongs.length} lagu`;
    if (likedSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>❤️</span><p>Belum ada lagu disukai</p></div>';
        return;
    }
    container.innerHTML = likedSongs.map(song => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" onerror="this.src='https://picsum.photos/200/200'">
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
            <button class="like-btn" onclick="event.stopPropagation(); toggleLike('${song.id}')">❤️</button>
        </div>
    `).join('');
}

async function toggleLike(songId) {
    if (!currentUser) { showToast('Login dulu untuk like', 2000, true); return; }
    if (userLikedSongs.has(songId)) {
        await supabase.from('liked_songs').delete().eq('user_id', currentUser.id).eq('song_id', songId);
        userLikedSongs.delete(songId);
        showToast('💔 Dihapus dari favorit');
    } else {
        await supabase.from('liked_songs').insert([{ user_id: currentUser.id, song_id: songId }]);
        userLikedSongs.add(songId);
        showToast('❤️ Ditambahkan ke favorit');
    }
    renderLikedSongs();
    renderLibrary();
    if (currentPlayingSong?.id === songId) {
        document.getElementById('playerLikeBtn').innerHTML = userLikedSongs.has(songId) ? '❤️' : '🤍';
    }
}

// ============ PLAYLIST ============
async function loadUserPlaylists() {
    if (!currentUser) return;
    const { data } = await supabase.from('playlists').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    userPlaylists = data || [];
    renderPlaylists();
}

function renderPlaylists() {
    const container = document.getElementById('playlistsGrid');
    if (!container) return;
    if (userPlaylists.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📋</span><p>Belum ada playlist</p><button onclick="createNewPlaylist()">+ Buat Playlist</button></div>';
        return;
    }
    container.innerHTML = userPlaylists.map(pl => `
        <div class="playlist-card" onclick="viewPlaylist('${pl.id}')">
            <div class="playlist-icon">📋</div>
            <div class="playlist-name">${escapeHtml(pl.name)}</div>
            <div class="playlist-date">${new Date(pl.created_at).toLocaleDateString()}</div>
        </div>
    `).join('');
}

async function createNewPlaylist() {
    if (!currentUser) { showToast('Login dulu', 2000, true); return; }
    const name = prompt('Nama playlist:', `Playlist ${new Date().toLocaleDateString()}`);
    if (!name?.trim()) return;
    const { error } = await supabase.from('playlists').insert([{ name: name.trim(), user_id: currentUser.id }]);
    if (error) { showToast('Gagal buat playlist', 2000, true); return; }
    showToast(`Playlist "${name}" dibuat`);
    await loadUserPlaylists();
}

async function viewPlaylist(playlistId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    const { data } = await supabase.from('playlist_songs').select('song_id').eq('playlist_id', playlistId);
    const songIds = data?.map(item => item.song_id) || [];
    const playlistSongs = allSongs.filter(song => songIds.includes(song.id));
    document.getElementById('playlistDetailName').innerText = playlist.name;
    const container = document.getElementById('playlistDetailSongs');
    if (playlistSongs.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada lagu</div>';
    } else {
        container.innerHTML = playlistSongs.map(song => `
            <div class="playlist-song-item" onclick="playSongById('${song.id}')">
                <img class="playlist-song-cover" src="${song.cover_url || 'https://picsum.photos/40/40'}" onerror="this.src='https://picsum.photos/40/40'">
                <div class="playlist-song-info"><div class="playlist-song-title">${escapeHtml(song.title)}</div><div class="playlist-song-artist">${escapeHtml(song.artist)}</div></div>
                <button class="playlist-song-remove" onclick="event.stopPropagation(); removeSongFromPlaylist('${playlistId}', '${song.id}')">🗑️</button>
            </div>
        `).join('');
    }
    document.getElementById('playlistDetailModal').classList.remove('hidden');
    document.getElementById('renamePlaylistBtn').onclick = () => renamePlaylist(playlistId, playlist.name);
    document.getElementById('deletePlaylistBtn').onclick = () => deletePlaylist(playlistId, playlist.name);
}

async function renamePlaylist(playlistId, currentName) {
    const newName = prompt('Nama baru:', currentName);
    if (!newName || newName === currentName) return;
    await supabase.from('playlists').update({ name: newName }).eq('id', playlistId);
    showToast('Playlist diubah');
    await loadUserPlaylists();
    document.getElementById('playlistDetailName').innerText = newName;
}

async function deletePlaylist(playlistId, playlistName) {
    if (!confirm(`Hapus playlist "${playlistName}"?`)) return;
    await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId);
    await supabase.from('playlists').delete().eq('id', playlistId);
    showToast('Playlist dihapus');
    await loadUserPlaylists();
    closePlaylistDetail();
}

async function removeSongFromPlaylist(playlistId, songId) {
    await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId).eq('song_id', songId);
    showToast('Lagu dihapus dari playlist');
    viewPlaylist(playlistId);
}

async function showAddToPlaylist(songId) {
    if (!currentUser) { showToast('Login dulu', 2000, true); return; }
    await loadUserPlaylists();
    if (userPlaylists.length === 0) {
        if (confirm('Belum ada playlist. Buat sekarang?')) await createNewPlaylist();
        await loadUserPlaylists();
        if (userPlaylists.length === 0) return;
    }
    const container = document.getElementById('playlistList');
    container.innerHTML = userPlaylists.map(pl => `
        <div class="playlist-list-item" onclick="addToExistingPlaylist('${songId}', '${pl.id}')">
            <span class="playlist-list-icon">📋</span>
            <span class="playlist-list-name">${escapeHtml(pl.name)}</span>
        </div>
    `).join('');
    document.getElementById('addToPlaylistModal').classList.remove('hidden');
    document.getElementById('createNewFromModal').onclick = async () => { await createNewPlaylist(); showAddToPlaylist(songId); };
}

async function addToExistingPlaylist(songId, playlistId) {
    const { error } = await supabase.from('playlist_songs').insert([{ playlist_id: playlistId, song_id: songId }]);
    if (error && error.code !== '23505') { showToast('Gagal menambah', 2000, true); return; }
    showToast('Ditambahkan ke playlist');
    closeAddToPlaylist();
}

// ============ RECENTLY PLAYED ============
async function addToRecentlyPlayed(song) {
    if (!currentUser) return;
    await supabase.from('recently_played').delete().eq('user_id', currentUser.id).eq('song_id', song.id);
    await supabase.from('recently_played').insert([{ user_id: currentUser.id, song_id: song.id, played_at: new Date().toISOString() }]);
    await loadRecentlyPlayed();
}

async function loadRecentlyPlayed() {
    if (!currentUser) return;
    const { data } = await supabase.from('recently_played').select('song_id, played_at').eq('user_id', currentUser.id).order('played_at', { ascending: false }).limit(20);
    const recentIds = data?.map(item => item.song_id) || [];
    const recentSongs = allSongs.filter(song => recentIds.includes(song.id));
    recentSongs.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
    const container = document.getElementById('recentlyPlayedGrid');
    if (!container) return;
    if (recentSongs.length === 0) { container.innerHTML = '<div class="empty-state"><span>🕐</span><p>Belum ada riwayat</p></div>'; return; }
    container.innerHTML = recentSongs.map(song => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" onerror="this.src='https://picsum.photos/200/200'">
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
}

async function clearRecentlyPlayed() {
    if (!currentUser || !confirm('Hapus semua riwayat?')) return;
    await supabase.from('recently_played').delete().eq('user_id', currentUser.id);
    await loadRecentlyPlayed();
    showToast('Riwayat dibersihkan');
}

document.getElementById('clearRecentBtn')?.addEventListener('click', clearRecentlyPlayed);

// ============ PLAYER ============
function initPlayer() {
    if (audioElement) return;
    audioElement = new Audio();
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('ended', handleSongEnd);
    audioElement.addEventListener('play', () => { isPlaying = true; document.getElementById('playPauseBtn').innerHTML = '⏸'; });
    audioElement.addEventListener('pause', () => { isPlaying = false; document.getElementById('playPauseBtn').innerHTML = '▶'; });
    document.getElementById('volumeSlider').addEventListener('input', (e) => { currentVolume = e.target.value; if(audioElement) audioElement.volume = currentVolume / 100; });
    audioElement.volume = currentVolume / 100;
}

function updateProgress() {
    if (audioElement?.duration) {
        const percent = (audioElement.currentTime / audioElement.duration) * 100;
        document.getElementById('progressBar').value = percent;
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('currentTime').innerText = formatDuration(audioElement.currentTime);
        document.getElementById('totalTime').innerText = formatDuration(audioElement.duration);
    }
}

function handleSongEnd() {
    if (repeatMode === 'one') { audioElement.currentTime = 0; audioElement.play(); }
    else if (repeatMode === 'all' || currentPlaylist.length > 1) nextSong();
    else if (currentQueue.length > 0) playFromQueue();
    else isPlaying = false;
}

function playSongById(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (!song) return;
    playSong(song);
}

function playSong(song, playlist = null) {
    initPlayer();
    if (playlist) { currentPlaylist = [...playlist]; originalPlaylist = [...playlist]; currentSongIndex = currentPlaylist.findIndex(s => s.id === song.id); }
    else { currentPlaylist = [...allSongs]; originalPlaylist = [...allSongs]; currentSongIndex = currentPlaylist.findIndex(s => s.id === song.id); }
    if (isShuffle) shufflePlaylist();
    currentPlayingSong = song;
    audioElement.src = song.mp3_url;
    audioElement.play();
    isPlaying = true;
    document.getElementById('nowPlayingBar').classList.remove('hidden');
    document.getElementById('playerCover').src = song.cover_url || 'https://picsum.photos/50/50';
    document.getElementById('playerTitle').innerText = song.title;
    document.getElementById('playerArtist').innerText = song.artist;
    document.getElementById('playerLikeBtn').innerHTML = userLikedSongs.has(song.id) ? '❤️' : '🤍';
    addToRecentlyPlayed(song);
    supabase.from('songs').update({ play_count: (song.play_count || 0) + 1 }).eq('id', song.id);
}

function togglePlayPause() {
    if (!audioElement?.src) return;
    isPlaying ? audioElement.pause() : audioElement.play();
}

function nextSong() {
    if (!currentPlaylist.length) return;
    let nextIndex = currentSongIndex + 1;
    if (nextIndex >= currentPlaylist.length) {
        if (repeatMode === 'all') nextIndex = 0;
        else { if (currentQueue.length) playFromQueue(); return; }
    }
    currentSongIndex = nextIndex;
    playSong(currentPlaylist[currentSongIndex], currentPlaylist);
}

function prevSong() {
    if (!currentPlaylist.length) return;
    if (audioElement?.currentTime > 3) { audioElement.currentTime = 0; return; }
    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) prevIndex = currentPlaylist.length - 1;
    currentSongIndex = prevIndex;
    playSong(currentPlaylist[currentSongIndex], currentPlaylist);
}

function shufflePlaylist() {
    if (!isShuffle) { currentPlaylist = [...originalPlaylist]; return; }
    const current = currentPlaylist[currentSongIndex];
    let shuffled = currentPlaylist.filter(s => s.id !== current.id);
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    currentPlaylist = [current, ...shuffled];
    currentSongIndex = 0;
}

function toggleRepeat() {
    if (repeatMode === 'none') { repeatMode = 'all'; document.getElementById('repeatBtn').style.color = '#1DB954'; showToast('Repeat all'); }
    else if (repeatMode === 'all') { repeatMode = 'one'; document.getElementById('repeatBtn').innerHTML = '🔂'; showToast('Repeat one'); }
    else { repeatMode = 'none'; document.getElementById('repeatBtn').innerHTML = '🔁'; document.getElementById('repeatBtn').style.color = ''; showToast('Repeat off'); }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    document.getElementById('shuffleBtn').style.color = isShuffle ? '#1DB954' : '';
    showToast(isShuffle ? 'Shuffle on' : 'Shuffle off');
    if (isShuffle && currentPlaylist.length) shufflePlaylist();
    else if (!isShuffle && originalPlaylist.length) { currentPlaylist = [...originalPlaylist]; currentSongIndex = currentPlaylist.findIndex(s => s.id === currentPlayingSong?.id); }
}

function seekSong(e) { if (audioElement?.duration) audioElement.currentTime = (e.target.value / 100) * audioElement.duration; }

document.getElementById('progressBar')?.addEventListener('input', seekSong);
document.getElementById('playPauseBtn')?.addEventListener('click', togglePlayPause);
document.getElementById('prevBtn')?.addEventListener('click', prevSong);
document.getElementById('nextBtn')?.addEventListener('click', nextSong);
document.getElementById('shuffleBtn')?.addEventListener('click', toggleShuffle);
document.getElementById('repeatBtn')?.addEventListener('click', toggleRepeat);
document.getElementById('playerLikeBtn')?.addEventListener('click', () => { if(currentPlayingSong) toggleLike(currentPlayingSong.id); });

// ============ QUEUE ============
function addToQueue(song) { if (!currentQueue.find(s => s.id === song.id)) { currentQueue.push(song); renderQueue(); saveQueueToStorage(); } }
function removeFromQueue(index) { currentQueue.splice(index, 1); renderQueue(); saveQueueToStorage(); }
function clearQueue() { currentQueue = []; renderQueue(); saveQueueToStorage(); showToast('Antrian dibersihkan'); }
function playFromQueue() { if (currentQueue.length) playSong(currentQueue.shift()); renderQueue(); saveQueueToStorage(); }
function saveQueueToStorage() { saveToLocalStorage('queue', currentQueue.map(s => s.id)); }
function loadSavedQueue() { const saved = loadFromLocalStorage('queue', []); if (saved.length && allSongs.length) { currentQueue = saved.map(id => allSongs.find(s => s.id === id)).filter(Boolean); renderQueue(); } }
function renderQueue() {
    const container = document.getElementById('queueList');
    if (!container) return;
    if (!currentQueue.length) { container.innerHTML = '<div class="queue-empty" style="text-align:center;padding:40px;">Belum ada antrian</div>'; return; }
    container.innerHTML = currentQueue.map((song, idx) => `
        <div class="queue-item" onclick="playSongById('${song.id}')">
            <img class="queue-cover" src="${song.cover_url || 'https://picsum.photos/44/44'}" onerror="this.src='https://picsum.photos/44/44'">
            <div class="queue-info"><div class="queue-title">${escapeHtml(song.title)}</div><div class="queue-artist">${escapeHtml(song.artist)}</div></div>
            <button class="queue-remove" onclick="event.stopPropagation(); removeFromQueue(${idx})">✕</button>
        </div>
    `).join('');
}

document.getElementById('queueBtn')?.addEventListener('click', () => { renderQueue(); document.getElementById('queueModal').classList.remove('hidden'); });
document.getElementById('clearQueueBtn')?.addEventListener('click', clearQueue);

// ============ LYRICS ============
async function fetchLyrics(title, artist) {
    const modal = document.getElementById('lyricsModal');
    const lyricsTitle = document.getElementById('lyricsTitle');
    const lyricsText = document.getElementById('lyricsText');
    if (lyricsTitle) lyricsTitle.innerText = `${title} - ${artist}`;
    lyricsText.innerHTML = '<div class="loading-spinner"></div><p>Mencari lirik...</p>';
    modal.classList.remove('hidden');
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        const data = await response.json();
        if (data.lyrics) lyricsText.innerHTML = `<div style="white-space:pre-wrap;line-height:1.8;">${escapeHtml(data.lyrics)}</div>`;
        else lyricsText.innerHTML = '<p style="text-align:center;color:#6A6A6A;">Lirik tidak ditemukan</p>';
    } catch(e) { lyricsText.innerHTML = '<p style="text-align:center;color:#E5484D;">Gagal memuat lirik</p>'; }
}

document.getElementById('lyricsBtn')?.addEventListener('click', () => { if(currentPlayingSong) fetchLyrics(currentPlayingSong.title, currentPlayingSong.artist); });

// ============ RADIO ============
const radioStations = [
    { name: 'Pop Hits', icon: '🎤', genre: 'pop' }, { name: 'Rock Classics', icon: '🎸', genre: 'rock' },
    { name: 'Hip Hop', icon: '🎧', genre: 'hiphop' }, { name: 'Electronic', icon: '⚡', genre: 'electronic' },
    { name: 'Jazz Vibes', icon: '🎷', genre: 'jazz' }, { name: 'Dangdut', icon: '🇮🇩', genre: 'dangdut' }
];

function loadRadioStations() {
    const container = document.getElementById('radioStations');
    if (!container) return;
    container.innerHTML = radioStations.map(station => `
        <div class="radio-card" onclick="startRadio('${station.genre}', '${station.name}')">
            <div class="radio-icon">${station.icon}</div>
            <div class="radio-name">${station.name}</div>
        </div>
    `).join('');
}

function startRadio(genre, stationName) {
    if (radioInterval) clearInterval(radioInterval);
    let radioSongs = allSongs.filter(s => s.genre?.toLowerCase() === genre);
    if (!radioSongs.length) radioSongs = [...allSongs].sort((a,b) => (b.play_count||0)-(a.play_count||0)).slice(0, 30);
    if (!radioSongs.length) { showToast('Belum ada lagu untuk radio ini', 2000, true); return; }
    isRadioPlaying = true;
    currentRadioStation = { name: stationName, songs: radioSongs, currentIndex: 0 };
    playSong(radioSongs[0]);
    document.getElementById('radioNowPlaying').style.display = 'block';
    document.getElementById('radioTitle').innerText = stationName;
    document.getElementById('radioArtist').innerText = 'Radio Station';
    radioInterval = setInterval(() => { if (isRadioPlaying && audioElement?.ended) playNextRadioSong(); }, 1000);
}

function playNextRadioSong() {
    if (!currentRadioStation) return;
    currentRadioStation.currentIndex++;
    if (currentRadioStation.currentIndex >= currentRadioStation.songs.length) {
        currentRadioStation.songs = [...currentRadioStation.songs].sort(() => Math.random() - 0.5);
        currentRadioStation.currentIndex = 0;
    }
    playSong(currentRadioStation.songs[currentRadioStation.currentIndex]);
}

function stopRadio() {
    if (radioInterval) { clearInterval(radioInterval); radioInterval = null; }
    isRadioPlaying = false;
    currentRadioStation = null;
    document.getElementById('radioNowPlaying').style.display = 'none';
    showToast('Radio berhenti');
}

document.getElementById('stopRadioBtn')?.addEventListener('click', stopRadio);

// ============ EQUALIZER ============
function initEqualizer() {
    const container = document.getElementById('equalizerContainer');
    if (!container) return;
    const bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    container.innerHTML = `<div class="eq-bands">${bands.map(freq => `<div class="eq-band"><label>${freq} Hz</label><input type="range" id="eq_${freq}" min="-12" max="12" value="${eqBands[freq]}" step="0.5"><span id="eq_val_${freq}">${eqBands[freq]} dB</span></div>`).join('')}</div><div class="eq-controls"><button id="enableEqBtn" style="background:${eqEnabled ? '#1DB954' : '#282828'};color:${eqEnabled ? '#000' : '#fff'}">${eqEnabled ? '🔊 EQ ON' : '🔇 EQ OFF'}</button></div>`;
    bands.forEach(freq => {
        document.getElementById(`eq_${freq}`)?.addEventListener('input', (e) => { eqBands[freq] = parseFloat(e.target.value); document.getElementById(`eq_val_${freq}`).innerText = eqBands[freq] + ' dB'; if(eqEnabled && audioElement) applyEqualizer(); saveEqSettings(); });
    });
    document.getElementById('enableEqBtn')?.addEventListener('click', () => { eqEnabled = !eqEnabled; document.getElementById('enableEqBtn').style.background = eqEnabled ? '#1DB954' : '#282828'; document.getElementById('enableEqBtn').style.color = eqEnabled ? '#000' : '#fff'; document.getElementById('enableEqBtn').innerHTML = eqEnabled ? '🔊 EQ ON' : '🔇 EQ OFF'; if(eqEnabled && audioElement) applyEqualizer(); else if(!eqEnabled && audioElement) removeEqualizer(); saveEqSettings(); });
    document.getElementById('eqPresetBtn')?.addEventListener('click', () => { document.getElementById('eqPresets').style.display = document.getElementById('eqPresets').style.display === 'none' ? 'flex' : 'none'; });
    document.querySelectorAll('[data-preset]').forEach(btn => { btn.addEventListener('click', () => applyPreset(btn.dataset.preset)); });
    loadEqSettings();
}

function applyPreset(preset) {
    const presets = { normal: {31:0,62:0,125:0,250:0,500:0,1000:0,2000:0,4000:0,8000:0,16000:0}, bass: {31:6,62:5,125:4,250:2,500:0,1000:0,2000:0,4000:0,8000:0,16000:0}, treble: {31:0,62:0,125:0,250:0,500:0,1000:2,2000:4,4000:5,8000:6,16000:6}, vocal: {31:-2,62:-1,125:0,250:1,500:2,1000:3,2000:4,4000:3,8000:1,16000:0}, electronic: {31:4,62:5,125:3,250:1,500:0,1000:1,2000:3,4000:4,8000:5,16000:5}, rock: {31:4,62:3,125:2,250:1,500:0,1000:1,2000:3,4000:4,8000:3,16000:2} };
    const selected = presets[preset];
    if (!selected) return;
    for (const [freq, value] of Object.entries(selected)) { eqBands[freq] = value; document.getElementById(`eq_${freq}`).value = value; document.getElementById(`eq_val_${freq}`).innerText = value + ' dB'; }
    if (eqEnabled && audioElement) applyEqualizer();
    saveEqSettings();
    showToast(`Preset ${preset} diterapkan`);
}

function createAudioContext() { if (!audioContext && window.AudioContext) audioContext = new AudioContext(); return audioContext; }
function applyEqualizer() {
    if (!eqEnabled) return;
    const context = createAudioContext();
    if (!context || !audioElement) return;
    try {
        if (sourceNode) { try { sourceNode.disconnect(); } catch(e) {} }
        const source = context.createMediaElementSource(audioElement);
        const bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        let prevNode = source;
        bands.forEach(freq => { const filter = context.createBiquadFilter(); filter.type = 'peaking'; filter.frequency.value = freq; filter.Q.value = 1; filter.gain.value = eqBands[freq]; prevNode.connect(filter); prevNode = filter; });
        prevNode.connect(context.destination);
        sourceNode = source;
        if (context.state === 'suspended') context.resume();
    } catch(e) { console.warn('EQ error:', e); }
}
function removeEqualizer() { if (sourceNode) { try { sourceNode.disconnect(); } catch(e) {} sourceNode = null; } }
function saveEqSettings() { saveToLocalStorage('eq_enabled', eqEnabled); saveToLocalStorage('eq_bands', eqBands); }
function loadEqSettings() { eqEnabled = loadFromLocalStorage('eq_enabled', false); const saved = loadFromLocalStorage('eq_bands', null); if (saved) eqBands = { ...eqBands, ...saved }; }

// ============ SEARCH ============
function initSearch() { document.getElementById('globalSearchInput')?.addEventListener('input', debounce(performGlobalSearch, 300)); }
function debounce(func, wait) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; }
async function performGlobalSearch() {
    const query = document.getElementById('globalSearchInput')?.value.trim();
    const container = document.getElementById('searchResults');
    if (!query || query.length < 2) { container.innerHTML = '<div class="empty-state"><span>🔍</span><p>Ketik minimal 2 karakter</p></div>'; return; }
    const results = allSongs.filter(s => s.title.toLowerCase().includes(query.toLowerCase()) || s.artist.toLowerCase().includes(query.toLowerCase()));
    if (!results.length) { container.innerHTML = '<div class="empty-state"><span>😔</span><p>Tidak ditemukan</p></div>'; return; }
    container.innerHTML = `<h3>🎵 Lagu (${results.length})</h3><div class="songs-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">${results.slice(0, 12).map(song => `<div class="song-card" onclick="playSongById('${song.id}'); closeSearch();"><img class="song-cover" src="${song.cover_url || 'https://picsum.photos/140/140'}" onerror="this.src='https://picsum.photos/140/140'"><div class="song-title">${escapeHtml(song.title)}</div><div class="song-artist">${escapeHtml(song.artist)}</div></div>`).join('')}</div>`;
}

// ============ SETTINGS ============
function initSettings() {
    document.querySelectorAll('.theme-btn').forEach(btn => btn.addEventListener('click', () => applyTheme(btn.dataset.theme)));
    document.getElementById('qualitySelect')?.addEventListener('change', (e) => { currentQuality = e.target.value; saveToLocalStorage('quality', currentQuality); showToast(`Kualitas: ${currentQuality}`); });
    document.getElementById('crossfadeSlider')?.addEventListener('input', (e) => { crossfadeDuration = parseInt(e.target.value); document.getElementById('crossfadeValue').innerText = crossfadeDuration; saveToLocalStorage('crossfade', crossfadeDuration); });
    document.getElementById('clearCacheBtn')?.addEventListener('click', () => { if(confirm('Hapus semua cache?')) { localStorage.clear(); currentQueue = []; renderQueue(); showToast('Cache dibersihkan'); setTimeout(() => location.reload(), 1000); } });
    const savedQuality = loadFromLocalStorage('quality', 'medium');
    const savedCrossfade = loadFromLocalStorage('crossfade', 0);
    currentQuality = savedQuality; crossfadeDuration = savedCrossfade;
    if(document.getElementById('qualitySelect')) document.getElementById('qualitySelect').value = savedQuality;
    if(document.getElementById('crossfadeSlider')) { document.getElementById('crossfadeSlider').value = savedCrossfade; document.getElementById('crossfadeValue').innerText = savedCrossfade; }
    const savedTheme = loadFromLocalStorage('theme', 'dark');
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveToLocalStorage('theme', theme);
    document.querySelectorAll('.theme-btn').forEach(btn => { btn.classList.remove('active'); if (btn.dataset.theme === theme) btn.classList.add('active'); });
}

// ============ UPLOAD ============
let selectedFile = null, selectedCover = null;
function setupDragAndDrop() {
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;
    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = '#1DB954'; };
    dropzone.ondragleave = () => { dropzone.style.borderColor = ''; };
    dropzone.ondrop = (e) => { e.preventDefault(); dropzone.style.borderColor = ''; const file = e.dataTransfer.files[0]; if (file && file.type === 'audio/mpeg') { selectedFile = file; document.getElementById('uploadDetails').style.display = 'block'; dropzone.style.display = 'none'; showToast(`File: ${file.name}`); } else showToast('Harus file MP3', 2000, true); };
    document.getElementById('selectFileBtn')?.addEventListener('click', () => document.getElementById('mp3File').click());
    document.getElementById('mp3File')?.addEventListener('change', (e) => { if(e.target.files[0]) { selectedFile = e.target.files[0]; document.getElementById('uploadDetails').style.display = 'block'; dropzone.style.display = 'none'; } });
    document.getElementById('coverFile')?.addEventListener('change', (e) => { if(e.target.files[0]) { selectedCover = e.target.files[0]; const reader = new FileReader(); reader.onload = (ev) => document.getElementById('coverPreview').innerHTML = `<img src="${ev.target.result}" style="width:80px;height:80px;border-radius:8px;">`; reader.readAsDataURL(selectedCover); } });
}

async function uploadSong() {
    if (!currentUser) { showToast('Login dulu untuk upload', 2000, true); return; }
    const title = document.getElementById('songTitle').value.trim();
    const artist = document.getElementById('songArtist').value.trim();
    const genre = document.getElementById('songGenre').value;
    const mp3File = selectedFile || document.getElementById('mp3File').files[0];
    const coverFile = selectedCover || document.getElementById('coverFile').files[0];
    if (!title || !artist) { showToast('Isi judul dan artis', 2000, true); return; }
    if (!mp3File) { showToast('Pilih file MP3', 2000, true); return; }
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = '⏳ Uploading...';
    statusDiv.className = 'upload-status info';
    try {
        const mp3FileName = `${Date.now()}_${mp3File.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: mp3Err } = await supabase.storage.from('songs').upload(mp3FileName, mp3File);
        if (mp3Err) throw mp3Err;
        const mp3Url = supabase.storage.from('songs').getPublicUrl(mp3FileName).data.publicUrl;
        let coverUrl = null;
        if (coverFile) {
            const coverFileName = `cover_${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            await supabase.storage.from('covers').upload(coverFileName, coverFile);
            coverUrl = supabase.storage.from('covers').getPublicUrl(coverFileName).data.publicUrl;
        }
        let duration = 180;
        const tempAudio = new Audio();
        tempAudio.src = mp3Url;
        await new Promise((resolve) => { tempAudio.addEventListener('loadedmetadata', () => { duration = Math.floor(tempAudio.duration); resolve(); }); tempAudio.addEventListener('error', () => resolve()); setTimeout(resolve, 2000); });
        const { error: insertErr } = await supabase.from('songs').insert([{ title, artist, genre: genre || null, duration, cover_url: coverUrl, mp3_url: mp3Url, user_id: currentUser.id, play_count: 0, created_at: new Date().toISOString() }]);
        if (insertErr) throw insertErr;
        statusDiv.innerHTML = '✅ Upload berhasil!';
        statusDiv.className = 'upload-status success';
        document.getElementById('songTitle').value = '';
        document.getElementById('songArtist').value = '';
        document.getElementById('mp3File').value = '';
        document.getElementById('coverFile').value = '';
        document.getElementById('coverPreview').innerHTML = '';
        selectedFile = null; selectedCover = null;
        document.getElementById('uploadDetails').style.display = 'none';
        document.getElementById('dropzone').style.display = 'block';
        showToast(`🎵 "${title}" berhasil diupload!`);
        await loadAllSongs();
        await loadLikedSongs();
        showPanel('library');
        setTimeout(() => statusDiv.innerHTML = '', 3000);
    } catch(err) { statusDiv.innerHTML = '❌ Gagal: ' + err.message; statusDiv.className = 'upload-status error'; showToast(err.message, 2000, true); }
}

document.getElementById('uploadSubmitBtn')?.addEventListener('click', uploadSong);
setupDragAndDrop();

// ============ INIT ============
window.playSongById = playSongById;
window.toggleLike = toggleLike;
window.createNewPlaylist = createNewPlaylist;
window.viewPlaylist = viewPlaylist;
window.removeSongFromPlaylist = removeSongFromPlaylist;
window.showAddToPlaylist = showAddToPlaylist;
window.addToExistingPlaylist = addToExistingPlaylist;
window.startRadio = startRadio;
window.stopRadio = stopRadio;
window.applyPreset = applyPreset;
window.performGlobalSearch = performGlobalSearch;
window.initSearch = initSearch;

console.log('✅ Yamify Ultimate siap!');
