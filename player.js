// ============================================
// YAMIFY ULTIMATE - Player Core Module
// Play, Pause, Queue, Shuffle, Repeat, Crossfade
// ============================================

function initPlayer() {
    if (audioElement) return;
    
    audioElement = new Audio();
    
    audioElement.addEventListener('timeupdate', throttle(updateProgress, 100));
    audioElement.addEventListener('ended', handleSongEnd);
    audioElement.addEventListener('loadedmetadata', onSongLoaded);
    audioElement.addEventListener('play', onPlay);
    audioElement.addEventListener('pause', onPause);
    audioElement.addEventListener('error', onPlayerError);
    audioElement.addEventListener('waiting', onBuffering);
    audioElement.addEventListener('canplay', onCanPlay);
    
    // Load saved queue
    loadSavedQueue();
    
    console.log('🎵 Player initialized');
}

function onSongLoaded() {
    const totalTimeEl = document.getElementById('totalTime');
    if (totalTimeEl) totalTimeEl.innerText = formatDuration(audioElement.duration);
    
    // Apply equalizer if enabled
    if (eqEnabled && audioContext) {
        applyEqualizerToCurrentSource();
    }
}

function onPlay() {
    isPlaying = true;
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) playBtn.innerHTML = '⏸';
    updateMediaSession();
}

function onPause() {
    isPlaying = false;
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) playBtn.innerHTML = '▶';
}

function onPlayerError(e) {
    console.error('Player error:', e);
    showToast('Gagal memutar lagu', 3000, 'error');
}

function onBuffering() {
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn && isPlaying) playBtn.innerHTML = '⏳';
}

function onCanPlay() {
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn && isPlaying) playBtn.innerHTML = '⏸';
}

function handleSongEnd() {
    if (crossfadeDuration > 0 && nextSongCrossfade) {
        applyCrossfade();
    } else {
        if (repeatMode === 'one') {
            audioElement.currentTime = 0;
            audioElement.play();
        } else if (repeatMode === 'all' || currentPlaylist.length > 1) {
            nextSong();
        } else if (currentQueue.length > 0) {
            playFromQueue();
        } else {
            isPlaying = false;
            const playBtn = document.getElementById('playPauseBtn');
            if (playBtn) playBtn.innerHTML = '▶';
        }
    }
}

let nextSongCrossfade = null;

function applyCrossfade() {
    if (!nextSongCrossfade) return;
    
    const fadeOut = audioElement;
    const fadeIn = new Audio(nextSongCrossfade.mp3_url);
    const duration = crossfadeDuration;
    const steps = 20;
    const stepTime = (duration * 1000) / steps;
    let step = 0;
    
    fadeIn.volume = 0;
    fadeIn.play();
    
    const interval = setInterval(() => {
        step++;
        const volumeOut = 1 - (step / steps);
        const volumeIn = step / steps;
        
        fadeOut.volume = Math.max(0, volumeOut);
        fadeIn.volume = Math.min(1, volumeIn);
        
        if (step >= steps) {
            clearInterval(interval);
            fadeOut.pause();
            fadeOut.src = '';
            audioElement = fadeIn;
            currentPlayingSong = nextSongCrossfade;
            updatePlayerUI(currentPlayingSong);
            nextSongCrossfade = null;
            audioElement.volume = currentVolume / 100;
        }
    }, stepTime);
}

function playSong(song, playlist = null, addToHistory = true) {
    if (!song || !song.mp3_url) {
        showToast('Gagal memutar lagu', 2000, 'error');
        return;
    }
    
    initPlayer();
    
    if (playlist && playlist.length > 0) {
        currentPlaylist = [...playlist];
        originalPlaylist = [...playlist];
        currentSongIndex = currentPlaylist.findIndex(s => s.id === song.id);
    } else {
        currentPlaylist = [...allSongs];
        originalPlaylist = [...allSongs];
        currentSongIndex = currentPlaylist.findIndex(s => s.id === song.id);
    }
    
    if (isShuffle) shufflePlaylist();
    
    currentPlayingSong = song;
    audioElement.src = song.mp3_url;
    audioElement.load();
    audioElement.play().then(() => {
        isPlaying = true;
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.innerHTML = '⏸';
        
        const nowPlayingBar = document.getElementById('nowPlayingBar');
        if (nowPlayingBar) nowPlayingBar.classList.remove('hidden');
        
        updatePlayerUI(song);
        
        if (addToHistory) {
            addToRecentlyPlayed(song);
            incrementPlayCount(song.id);
            addToQueue(song, false);
        }
        
        broadcastNowPlaying(song);
        updateMediaSession();
        
    }).catch(err => {
        console.error('Play error:', err);
        showToast('Gagal memutar: ' + err.message, 3000, 'error');
    });
}

function updateMediaSession() {
    if (!currentPlayingSong) return;
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentPlayingSong.title,
            artist: currentPlayingSong.artist,
            artwork: [
                { src: currentPlayingSong.cover_url || 'https://picsum.photos/96/96', sizes: '96x96', type: 'image/jpeg' },
                { src: currentPlayingSong.cover_url || 'https://picsum.photos/128/128', sizes: '128x128', type: 'image/jpeg' },
                { src: currentPlayingSong.cover_url || 'https://picsum.photos/256/256', sizes: '256x256', type: 'image/jpeg' },
                { src: currentPlayingSong.cover_url || 'https://picsum.photos/512/512', sizes: '512x512', type: 'image/jpeg' }
            ]
        });
        
        navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
        navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
        navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    }
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
        const isLiked = userLikedSongs.has(song.id);
        likeBtn.innerHTML = isLiked ? '❤️' : '🤍';
        likeBtn.classList.toggle('liked', isLiked);
    }
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
    
    let nextIndex = currentSongIndex + 1;
    if (nextIndex >= currentPlaylist.length) {
        if (repeatMode === 'all') {
            nextIndex = 0;
        } else {
            if (currentQueue.length > 0) {
                playFromQueue();
            }
            return;
        }
    }
    
    currentSongIndex = nextIndex;
    const nextSongData = currentPlaylist[currentSongIndex];
    
    if (crossfadeDuration > 0 && audioElement && isPlaying) {
        nextSongCrossfade = nextSongData;
        handleSongEnd();
    } else {
        playSong(nextSongData, currentPlaylist);
    }
}

function prevSong() {
    if (!currentPlaylist.length) return;
    
    if (audioElement && audioElement.currentTime > 3) {
        audioElement.currentTime = 0;
        return;
    }
    
    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) {
        if (repeatMode === 'all') {
            prevIndex = currentPlaylist.length - 1;
        } else {
            audioElement.currentTime = 0;
            return;
        }
    }
    
    currentSongIndex = prevIndex;
    playSong(currentPlaylist[currentSongIndex], currentPlaylist);
}

function shufflePlaylist() {
    if (!isShuffle) {
        currentPlaylist = [...originalPlaylist];
        return;
    }
    
    const currentSong = currentPlaylist[currentSongIndex];
    let shuffled = currentPlaylist.filter(s => s.id !== currentSong.id);
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    currentPlaylist = [currentSong, ...shuffled];
    currentSongIndex = 0;
}

function toggleRepeat() {
    if (repeatMode === 'none') {
        repeatMode = 'all';
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) repeatBtn.style.color = '#1DB954';
        showToast('Repeat all', 1500);
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) repeatBtn.innerHTML = '🔂';
        showToast('Repeat one', 1500);
    } else {
        repeatMode = 'none';
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) {
            repeatBtn.innerHTML = '🔁';
            repeatBtn.style.color = '';
        }
        showToast('Repeat off', 1500);
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.style.color = isShuffle ? '#1DB954' : '';
    }
    showToast(isShuffle ? 'Shuffle on' : 'Shuffle off', 1500);
    
    if (isShuffle && currentPlaylist.length) {
        shufflePlaylist();
    } else if (!isShuffle && originalPlaylist.length) {
        currentPlaylist = [...originalPlaylist];
        currentSongIndex = currentPlaylist.findIndex(s => s.id === currentPlayingSong?.id);
    }
}

// Queue System
function addToQueue(song, saveToStorage = true) {
    if (!currentQueue.find(s => s.id === song.id)) {
        currentQueue.push(song);
        if (saveToStorage) saveQueueToStorage();
        renderQueue();
    }
}

function removeFromQueue(index) {
    currentQueue.splice(index, 1);
    saveQueueToStorage();
    renderQueue();
}

function clearQueue() {
    currentQueue = [];
    saveQueueToStorage();
    renderQueue();
    showToast('Antrian dibersihkan', 1500);
}

function playFromQueue() {
    if (currentQueue.length > 0) {
        const nextSong = currentQueue.shift();
        saveQueueToStorage();
        renderQueue();
        playSong(nextSong, null, true);
    }
}

function saveQueueToStorage() {
    saveToLocalStorage('queue', currentQueue.map(s => s.id));
}

function loadSavedQueue() {
    const savedQueueIds = loadFromLocalStorage('queue', []);
    if (savedQueueIds.length && allSongs.length) {
        currentQueue = savedQueueIds.map(id => allSongs.find(s => s.id === id)).filter(Boolean);
        renderQueue();
    }
}

function renderQueue() {
    const queueContainer = document.getElementById('queueList');
    if (!queueContainer) return;
    
    if (currentQueue.length === 0) {
        queueContainer.innerHTML = '<div class="queue-empty" style="text-align:center;padding:40px;color:#6A6A6A;">Belum ada antrian</div>';
        return;
    }
    
    queueContainer.innerHTML = currentQueue.map((song, idx) => `
        <div class="queue-item" onclick="playSongById('${song.id}')">
            <img class="queue-cover" src="${song.cover_url || 'https://picsum.photos/44/44'}" onerror="this.src='https://picsum.photos/44/44'">
            <div class="queue-info">
                <div class="queue-title">${escapeHtml(song.title)}</div>
                <div class="queue-artist">${escapeHtml(song.artist)}</div>
            </div>
            <button class="queue-remove" onclick="event.stopPropagation(); removeFromQueue(${idx})" style="background:none;border:none;font-size:18px;cursor:pointer;">✕</button>
        </div>
    `).join('');
}

function updateProgress() {
    if (audioElement && audioElement.duration) {
        const percent = (audioElement.currentTime / audioElement.duration) * 100;
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const currentTimeEl = document.getElementById('currentTime');
        
        if (progressBar) progressBar.value = percent;
        if (progressFill) progressFill.style.width = percent + '%';
        if (currentTimeEl) currentTimeEl.innerText = formatDuration(audioElement.currentTime);
    }
}

function seekSong(e) {
    if (audioElement && audioElement.duration) {
        const time = (e.target.value / 100) * audioElement.duration;
        audioElement.currentTime = time;
    }
}

function setVolume(value) {
    if (audioElement) {
        currentVolume = value;
        audioElement.volume = value / 100;
    }
}

function showQueue() {
    renderQueue();
    document.getElementById('queueModal').classList.remove('hidden');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initPlayer();
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const progressBar = document.getElementById('progressBar');
    const volumeSlider = document.getElementById('volumeSlider');
    const queueBtn = document.getElementById('queueBtn');
    const clearQueueBtn = document.getElementById('clearQueueBtn');
    const playerLikeBtn = document.getElementById('playerLikeBtn');
    
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (prevBtn) prevBtn.addEventListener('click', prevSong);
    if (nextBtn) nextBtn.addEventListener('click', nextSong);
    if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
    if (repeatBtn) repeatBtn.addEventListener('click', toggleRepeat);
    if (progressBar) progressBar.addEventListener('input', seekSong);
    if (volumeSlider) volumeSlider.addEventListener('input', (e) => setVolume(e.target.value));
    if (queueBtn) queueBtn.addEventListener('click', showQueue);
    if (clearQueueBtn) clearQueueBtn.addEventListener('click', clearQueue);
    if (playerLikeBtn) playerLikeBtn.addEventListener('click', () => {
        if (currentPlayingSong) toggleLike(currentPlayingSong.id);
    });
    
    setVolume(70);
});

window.playSong = playSong;
window.togglePlayPause = togglePlayPause;
window.nextSong = nextSong;
window.prevSong = prevSong;
window.toggleRepeat = toggleRepeat;
window.toggleShuffle = toggleShuffle;
window.seekSong = seekSong;
window.setVolume = setVolume;
window.addToQueue = addToQueue;
window.removeFromQueue = removeFromQueue;
window.clearQueue = clearQueue;
window.showQueue = showQueue;
window.renderQueue = renderQueue;