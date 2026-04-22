// ============================================
// YAMIFY - Player Logic (LENGKAP)
// ============================================

function initPlayer() {
    if (audioElement) return;
    
    audioElement = new Audio();
    
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('ended', () => nextSong());
    audioElement.addEventListener('loadedmetadata', () => {
        const totalTimeEl = document.getElementById('totalTime');
        if (totalTimeEl) totalTimeEl.innerText = formatDuration(audioElement.duration);
    });
    audioElement.addEventListener('play', () => {
        isPlaying = true;
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '⏸️';
    });
    audioElement.addEventListener('pause', () => {
        isPlaying = false;
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '▶️';
    });
    
    // Event listeners untuk tombol
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const volumeSlider = document.getElementById('volumeSlider');
    
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (prevBtn) prevBtn.addEventListener('click', prevSong);
    if (nextBtn) nextBtn.addEventListener('click', nextSong);
    if (progressBar) progressBar.addEventListener('input', seekSong);
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            if (audioElement) audioElement.volume = e.target.value / 100;
        });
        audioElement.volume = 0.7;
    }
    
    console.log('✅ Player initialized');
}

function playSong(song, playlist = null) {
    if (!song || !song.mp3_url) {
        console.error('No MP3 URL');
        showToast('❌ Gagal memutar lagu');
        return;
    }
    
    if (!audioElement) initPlayer();
    
    currentPlayingSong = song;
    
    if (playlist && playlist.length > 0) {
        currentPlaylist = playlist;
        currentSongIndex = currentPlaylist.findIndex(s => s.id === song.id);
    } else {
        currentPlaylist = allSongs;
        currentSongIndex = currentPlaylist.findIndex(s => s.id === song.id);
    }
    
    audioElement.src = song.mp3_url;
    audioElement.load();
    audioElement.play().then(() => {
        isPlaying = true;
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '⏸️';
        
        const nowPlayingBar = document.getElementById('nowPlayingBar');
        if (nowPlayingBar) nowPlayingBar.classList.remove('hidden');
        
        updatePlayerUI(song);
        addToRecentlyPlayed(song);
        incrementPlayCount(song.id);
        
    }).catch(err => {
        console.error('Play error:', err);
        showToast('❌ Gagal memutar: ' + err.message);
    });
}

function updatePlayerUI(song) {
    const titleEl = document.getElementById('playerTitle');
    const artistEl = document.getElementById('playerArtist');
    const coverEl = document.getElementById('playerCover');
    
    if (titleEl) titleEl.innerText = song.title;
    if (artistEl) artistEl.innerText = song.artist;
    if (coverEl) coverEl.src = song.cover_url || 'https://picsum.photos/50/50';
}

function togglePlayPause() {
    if (!audioElement || !audioElement.src) return;
    
    if (isPlaying) {
        audioElement.pause();
    } else {
        audioElement.play();
    }
}

function nextSong() {
    if (!currentPlaylist.length) return;
    currentSongIndex = (currentSongIndex + 1) % currentPlaylist.length;
    playSong(currentPlaylist[currentSongIndex], currentPlaylist);
}

function prevSong() {
    if (!currentPlaylist.length) return;
    currentSongIndex = (currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playSong(currentPlaylist[currentSongIndex], currentPlaylist);
}

function updateProgress() {
    if (audioElement && audioElement.duration) {
        const percent = (audioElement.currentTime / audioElement.duration) * 100;
        const progressBar = document.getElementById('progressBar');
        const currentTimeEl = document.getElementById('currentTime');
        const totalTimeEl = document.getElementById('totalTime');
        
        if (progressBar) progressBar.value = percent;
        if (currentTimeEl) currentTimeEl.innerText = formatDuration(audioElement.currentTime);
        if (totalTimeEl && !isNaN(audioElement.duration)) {
            totalTimeEl.innerText = formatDuration(audioElement.duration);
        }
    }
}

function seekSong(e) {
    if (audioElement && audioElement.duration) {
        const time = (e.target.value / 100) * audioElement.duration;
        audioElement.currentTime = time;
    }
}

async function addToRecentlyPlayed(song) {
    if (!currentUser) return;
    try {
        await supabase.from('recently_played').insert([{
            user_id: currentUser.id,
            song_id: song.id,
            played_at: new Date().toISOString()
        }]);
        if (typeof loadRecentlyPlayed === 'function') loadRecentlyPlayed();
    } catch (e) {
        console.warn('Gagal simpan recently played:', e);
    }
}

async function incrementPlayCount(songId) {
    try {
        const song = allSongs.find(s => s.id === songId);
        if (song) {
            const newCount = (song.play_count || 0) + 1;
            await supabase.from('songs').update({ play_count: newCount }).eq('id', songId);
            song.play_count = newCount;
            if (typeof renderTopCharts === 'function') renderTopCharts(allSongs);
        }
    } catch (e) {
        console.warn('Gagal update play count:', e);
    }
}

function shareSong(song) {
    const modal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    const url = `${window.location.origin}/dashboard.html?song=${song.id}`;
    if (shareLink) shareLink.value = url;
    if (modal) modal.classList.add('active');
    
    const copyBtn = document.getElementById('copyLinkBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    
    if (copyBtn) {
        copyBtn.onclick = () => {
            if (shareLink) {
                shareLink.select();
                document.execCommand('copy');
                showToast('📋 Link disalin!');
            }
        };
    }
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.remove('active');
        };
    }
}

// Fungsi untuk update global songs
function updateGlobalSongs(songs) {
    // This will be called from script.js
    window.allSongsGlobal = songs;
}

// Export ke global
window.playSong = playSong;
window.shareSong = shareSong;
window.updateGlobalSongs = updateGlobalSongs;
window.togglePlayPause = togglePlayPause;
window.nextSong = nextSong;
window.prevSong = prevSong;

// Init saat halaman load
document.addEventListener('DOMContentLoaded', () => {
    initPlayer();
});