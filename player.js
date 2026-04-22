// ============================================
// YAMIFY - Now Playing Bar Logic
// ============================================

function initPlayer() {
    audioElement = new Audio();
    
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('ended', nextSong);
    audioElement.addEventListener('loadedmetadata', () => {
        document.getElementById('totalTime')?.setAttribute('data-duration', audioElement.duration);
    });
    
    // Event listeners
    document.getElementById('playPauseBtn')?.addEventListener('click', togglePlayPause);
    document.getElementById('prevBtn')?.addEventListener('click', prevSong);
    document.getElementById('nextBtn')?.addEventListener('click', nextSong);
    document.getElementById('progressBar')?.addEventListener('input', seekSong);
    document.getElementById('volumeSlider')?.addEventListener('input', (e) => {
        if (audioElement) audioElement.volume = e.target.value / 100;
    });
}

function playSong(song, playlist = null) {
    if (!song || !song.mp3_url) {
        console.error('No MP3 URL');
        return;
    }
    
    currentPlayingSong = song;
    
    if (playlist) {
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
        document.getElementById('playPauseBtn').innerHTML = '⏸️';
        document.getElementById('nowPlayingBar').classList.remove('hidden');
        updatePlayerUI(song);
        
        // Add to recently played
        addToRecentlyPlayed(song);
        
        // Increment play count
        incrementPlayCount(song.id);
        
    }).catch(err => {
        console.error('Play error:', err);
        alert('Gagal memutar lagu. Cek koneksi atau URL MP3.');
    });
}

function updatePlayerUI(song) {
    document.getElementById('playerTitle').innerText = song.title;
    document.getElementById('playerArtist').innerText = song.artist;
    document.getElementById('playerCover').src = song.cover_url || 'https://picsum.photos/56/56';
}

function togglePlayPause() {
    if (!audioElement || !audioElement.src) return;
    
    if (isPlaying) {
        audioElement.pause();
        document.getElementById('playPauseBtn').innerHTML = '▶️';
    } else {
        audioElement.play();
        document.getElementById('playPauseBtn').innerHTML = '⏸️';
    }
    isPlaying = !isPlaying;
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
        document.getElementById('progressBar').value = percent;
        document.getElementById('currentTime').innerText = formatDuration(audioElement.currentTime);
        document.getElementById('totalTime').innerText = formatDuration(audioElement.duration);
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
        await supabase
            .from('recently_played')
            .insert([{
                user_id: currentUser.id,
                song_id: song.id,
                played_at: new Date().toISOString()
            }]);
    } catch (e) {
        console.warn('Gagal simpan recently played:', e);
    }
}

async function incrementPlayCount(songId) {
    try {
        const song = allSongs.find(s => s.id === songId);
        if (song) {
            const newCount = (song.play_count || 0) + 1;
            await supabase
                .from('songs')
                .update({ play_count: newCount })
                .eq('id', songId);
            song.play_count = newCount;
        }
    } catch (e) {
        console.warn('Gagal update play count:', e);
    }
}

function shareSong(song) {
    const modal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    const url = `${window.location.origin}/dashboard.html?song=${song.id}`;
    shareLink.value = url;
    modal.classList.add('active');
    
    document.getElementById('copyLinkBtn').onclick = () => {
        shareLink.select();
        document.execCommand('copy');
        alert('Link disalin!');
    };
    
    document.getElementById('closeModalBtn').onclick = () => {
        modal.classList.remove('active');
    };
}