// ============================================
// YAMIFY - Player Core Module FINAL
// ============================================

function initPlayer() {
    if (window.audioElement) return;
    
    window.audioElement = new Audio();
    
    window.audioElement.addEventListener('timeupdate', () => updateProgress());
    window.audioElement.addEventListener('ended', () => handleSongEnd());
    window.audioElement.addEventListener('loadedmetadata', () => {
        const totalTimeEl = document.getElementById('totalTime');
        if (totalTimeEl) totalTimeEl.innerText = formatDuration(window.audioElement.duration);
    });
    window.audioElement.addEventListener('play', () => {
        window.isPlaying = true;
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '⏸';
    });
    window.audioElement.addEventListener('pause', () => {
        window.isPlaying = false;
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '▶';
    });
    
    console.log('🎵 Player initialized');
}

function handleSongEnd() {
    if (window.repeatMode === 'one') {
        window.audioElement.currentTime = 0;
        window.audioElement.play();
    } else if (window.currentQueue.length > 0) {
        playFromQueue();
    } else if (window.currentPlaylist.length > 0) {
        nextSong();
    } else {
        window.isPlaying = false;
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '▶';
    }
}

function playSong(song, playlist = null) {
    if (!song || !song.mp3_url) {
        showToast('Gagal memutar lagu', 2000, 'error');
        return;
    }
    
    initPlayer();
    
    if (playlist && playlist.length > 0) {
        window.currentPlaylist = [...playlist];
        window.currentSongIndex = window.currentPlaylist.findIndex(s => s.id === song.id);
    } else {
        window.currentPlaylist = [...window.allSongs];
        window.currentSongIndex = window.currentPlaylist.findIndex(s => s.id === song.id);
    }
    
    window.currentPlayingSong = song;
    window.audioElement.src = song.mp3_url;
    window.audioElement.load();
    window.audioElement.play().then(() => {
        window.isPlaying = true;
        const nowPlayingBar = document.getElementById('nowPlayingBar');
        if (nowPlayingBar) nowPlayingBar.classList.remove('hidden');
        
        updatePlayerUI(song);
        
        if (window.addToRecentlyPlayed) window.addToRecentlyPlayed(song);
        if (window.incrementPlayCount) window.incrementPlayCount(song.id);
        
    }).catch(err => {
        console.error('Play error:', err);
        showToast('Gagal memutar: ' + err.message, 3000, 'error');
    });
}

function updatePlayerUI(song) {
    const titleEl = document.getElementById('playerTitle');
    const artistEl = document.getElementById('playerArtist');
    const coverEl = document.getElementById('playerCover');
    const likeBtn = document.getElementById('playerLikeBtn');
    
    if (titleEl) titleEl.innerText = song.title;
    if (artistEl) artistEl.innerText = song.artist;
    if (coverEl) coverEl.src = song.cover_url || 'https://picsum.photos/50/50';
    
    if (likeBtn) {
        const isLiked = window.userLikedSongs?.has(song.id);
        likeBtn.innerHTML = isLiked ? '❤️' : '🤍';
    }
}

function togglePlayPause() {
    if (!window.audioElement || !window.audioElement.src) return;
    
    if (window.isPlaying) {
        window.audioElement.pause();
    } else {
        window.audioElement.play();
    }
}

function nextSong() {
    if (!window.currentPlaylist.length) return;
    
    let nextIndex = window.currentSongIndex + 1;
    if (nextIndex >= window.currentPlaylist.length) {
        if (window.repeatMode === 'all') {
            nextIndex = 0;
        } else {
            if (window.currentQueue.length > 0) {
                playFromQueue();
            }
            return;
        }
    }
    
    window.currentSongIndex = nextIndex;
    playSong(window.currentPlaylist[window.currentSongIndex], window.currentPlaylist);
}

function prevSong() {
    if (!window.currentPlaylist.length) return;
    
    if (window.audioElement && window.audioElement.currentTime > 3) {
        window.audioElement.currentTime = 0;
        return;
    }
    
    let prevIndex = window.currentSongIndex - 1;
    if (prevIndex < 0) {
        if (window.repeatMode === 'all') {
            prevIndex = window.currentPlaylist.length - 1;
        } else {
            window.audioElement.currentTime = 0;
            return;
        }
    }
    
    window.currentSongIndex = prevIndex;
    playSong(window.currentPlaylist[window.currentSongIndex], window.currentPlaylist);
}

function toggleRepeat() {
    if (window.repeatMode === 'none') {
        window.repeatMode = 'all';
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) repeatBtn.style.color = '#1DB954';
        showToast('Repeat all', 1500);
    } else if (window.repeatMode === 'all') {
        window.repeatMode = 'one';
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) repeatBtn.innerHTML = '🔂';
        showToast('Repeat one', 1500);
    } else {
        window.repeatMode = 'none';
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) {
            repeatBtn.innerHTML = '🔁';
            repeatBtn.style.color = '';
        }
        showToast('Repeat off', 1500);
    }
}

function toggleShuffle() {
    window.isShuffle = !window.isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.style.color = window.isShuffle ? '#1DB954' : '';
    }
    showToast(window.isShuffle ? 'Shuffle on' : 'Shuffle off', 1500);
}

function updateProgress() {
    if (window.audioElement && window.audioElement.duration) {
        const percent = (window.audioElement.currentTime / window.audioElement.duration) * 100;
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const currentTimeEl = document.getElementById('currentTime');
        
        if (progressBar) progressBar.value = percent;
        if (progressFill) progressFill.style.width = percent + '%';
        if (currentTimeEl) currentTimeEl.innerText = formatDuration(window.audioElement.currentTime);
    }
}

function seekSong(e) {
    if (window.audioElement && window.audioElement.duration) {
        const time = (e.target.value / 100) * window.audioElement.duration;
        window.audioElement.currentTime = time;
    }
}

function setVolume(value) {
    if (window.audioElement) {
        window.currentVolume = value;
        window.audioElement.volume = value / 100;
    }
}

function addToQueue(song) {
    if (!window.currentQueue.find(s => s.id === song.id)) {
        window.currentQueue.push(song);
        showToast(`Ditambahkan ke antrian: ${song.title}`, 1500);
    }
}

function playFromQueue() {
    if (window.currentQueue.length > 0) {
        const nextSong = window.currentQueue.shift();
        playSong(nextSong);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPlayer();
    
    document.getElementById('playPauseBtn')?.addEventListener('click', togglePlayPause);
    document.getElementById('prevBtn')?.addEventListener('click', prevSong);
    document.getElementById('nextBtn')?.addEventListener('click', nextSong);
    document.getElementById('shuffleBtn')?.addEventListener('click', toggleShuffle);
    document.getElementById('repeatBtn')?.addEventListener('click', toggleRepeat);
    document.getElementById('progressBar')?.addEventListener('input', seekSong);
    document.getElementById('volumeSlider')?.addEventListener('input', (e) => setVolume(e.target.value));
    document.getElementById('playerLikeBtn')?.addEventListener('click', () => {
        if (window.currentPlayingSong) window.toggleLike(window.currentPlayingSong.id);
    });
    
    setVolume(70);
});

window.playSong = playSong;
window.togglePlayPause = togglePlayPause;
window.nextSong = nextSong;
window.prevSong = prevSong;
window.toggleRepeat = toggleRepeat;
window.toggleShuffle = toggleShuffle;
window.addToQueue = addToQueue;
