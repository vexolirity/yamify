function initPlayer() {
    if (window.audioElement) return;
    window.audioElement = new Audio();
    window.audioElement.addEventListener('timeupdate', () => {
        if (window.audioElement.duration) {
            const percent = (window.audioElement.currentTime / window.audioElement.duration) * 100;
            const fill = document.getElementById('progressFill');
            if (fill) fill.style.width = percent + '%';
        }
    });
    window.audioElement.addEventListener('ended', () => {
        if (window.currentQueue.length) {
            const next = window.currentQueue.shift();
            playSong(next);
        }
    });
}

function playSong(song) {
    if (!song || !song.mp3_url) { showToast('Gagal memutar', 1500); return; }
    initPlayer();
    window.currentPlayingSong = song;
    window.audioElement.src = song.mp3_url;
    window.audioElement.play();
    window.isPlaying = true;
    
    document.getElementById('nowPlayingBar').classList.remove('hidden');
    document.getElementById('playerTitle').innerText = song.title;
    document.getElementById('playerArtist').innerText = song.artist;
    document.getElementById('playerCover').src = song.cover_url || 'https://picsum.photos/50/50';
    document.getElementById('playPauseBtn').innerHTML = '⏸';
    
    if (window.currentUser && song.id) {
        supabase.from('songs').update({ play_count: (song.play_count||0)+1 }).eq('id', song.id);
        supabase.from('recently_played').delete().eq('user_id', window.currentUser.id).eq('song_id', song.id);
        supabase.from('recently_played').insert([{ user_id: window.currentUser.id, song_id: song.id, played_at: new Date() }]);
    }
}

function togglePlayPause() {
    if (!window.audioElement) return;
    if (window.isPlaying) {
        window.audioElement.pause();
        document.getElementById('playPauseBtn').innerHTML = '▶';
        window.isPlaying = false;
    } else {
        window.audioElement.play();
        document.getElementById('playPauseBtn').innerHTML = '⏸';
        window.isPlaying = true;
    }
}

function nextSong() {
    if (window.currentQueue.length) {
        const next = window.currentQueue.shift();
        playSong(next);
    } else if (window.allSongs.length) {
        const currentIndex = window.allSongs.findIndex(s => s.id === window.currentPlayingSong?.id);
        const next = window.allSongs[currentIndex + 1] || window.allSongs[0];
        if (next) playSong(next);
    }
}

function prevSong() {
    if (window.audioElement && window.audioElement.currentTime > 3) {
        window.audioElement.currentTime = 0;
    } else {
        const currentIndex = window.allSongs.findIndex(s => s.id === window.currentPlayingSong?.id);
        const prev = window.allSongs[currentIndex - 1] || window.allSongs[window.allSongs.length - 1];
        if (prev) playSong(prev);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('playPauseBtn')?.addEventListener('click', togglePlayPause);
    document.getElementById('nextBtn')?.addEventListener('click', nextSong);
    document.getElementById('prevBtn')?.addEventListener('click', prevSong);
});

window.playSong = playSong;
window.togglePlayPause = togglePlayPause;
window.nextSong = nextSong;
window.prevSong = prevSong;
