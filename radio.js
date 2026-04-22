// ============================================
// YAMIFY ULTIMATE - Radio Module
// Genre-based Radio Stations
// ============================================

const radioStationsData = [
    { name: 'Pop Hits', icon: '🎤', genre: 'pop', color: '#1DB954' },
    { name: 'Rock Classics', icon: '🎸', genre: 'rock', color: '#E5484D' },
    { name: 'Hip Hop', icon: '🎧', genre: 'hiphop', color: '#F59E0B' },
    { name: 'Electronic', icon: '⚡', genre: 'electronic', color: '#10B981' },
    { name: 'Jazz Vibes', icon: '🎷', genre: 'jazz', color: '#8B5CF6' },
    { name: 'Indie Folk', icon: '🪕', genre: 'indie', color: '#EC4899' },
    { name: 'RnB Soul', icon: '💜', genre: 'rnb', color: '#F43F5E' },
    { name: 'Dangdut', icon: '🇮🇩', genre: 'dangdut', color: '#EAB308' },
    { name: 'Chill LoFi', icon: '🌙', genre: 'lofi', color: '#6366F1' },
    { name: 'Workout', icon: '💪', genre: 'workout', color: '#EF4444' }
];

function loadRadioStations() {
    const container = document.getElementById('radioStations');
    if (!container) return;
    
    container.innerHTML = radioStationsData.map(station => `
        <div class="radio-card" onclick="startRadio('${station.genre}', '${station.name}')">
            <div class="radio-icon">${station.icon}</div>
            <div class="radio-name">${station.name}</div>
            <div class="radio-desc">Radio ${station.name}</div>
        </div>
    `).join('');
}

function startRadio(genre, stationName) {
    if (radioInterval) clearInterval(radioInterval);
    
    // Filter songs by genre (if genre field exists)
    let radioSongs = [...allSongs];
    
    // If genre field exists in songs, filter by it
    if (allSongs.some(s => s.genre)) {
        radioSongs = allSongs.filter(s => s.genre?.toLowerCase() === genre);
    }
    
    // If no songs with genre, get random popular songs
    if (radioSongs.length === 0) {
        radioSongs = [...allSongs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 50);
    }
    
    if (radioSongs.length === 0) {
        showToast('Belum ada lagu untuk radio ini', 2000, 'error');
        return;
    }
    
    isRadioPlaying = true;
    currentRadioStation = { name: stationName, genre, songs: radioSongs, currentIndex: 0 };
    
    // Play first song
    playSong(radioSongs[0]);
    
    // Show radio now playing
    const radioNowPlaying = document.getElementById('radioNowPlaying');
    if (radioNowPlaying) {
        radioNowPlaying.style.display = 'block';
        document.getElementById('radioTitle').innerText = stationName;
        document.getElementById('radioArtist').innerText = 'Radio Station';
        document.getElementById('radioCover').src = 'https://picsum.photos/60/60';
    }
    
    // Set interval to play next song when current ends
    const checkEnded = setInterval(() => {
        if (isRadioPlaying && audioElement && audioElement.ended) {
            playNextRadioSong();
        }
    }, 1000);
    
    radioInterval = checkEnded;
    
    showToast(`Memutar Radio ${stationName}`, 2000, 'success');
}

function playNextRadioSong() {
    if (!currentRadioStation) return;
    
    currentRadioStation.currentIndex++;
    if (currentRadioStation.currentIndex >= currentRadioStation.songs.length) {
        // Shuffle when reaching end
        currentRadioStation.songs = shuffleArray(currentRadioStation.songs);
        currentRadioStation.currentIndex = 0;
    }
    
    const nextSong = currentRadioStation.songs[currentRadioStation.currentIndex];
    if (nextSong) {
        playSong(nextSong, null, true);
    }
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function stopRadio() {
    if (radioInterval) {
        clearInterval(radioInterval);
        radioInterval = null;
    }
    isRadioPlaying = false;
    currentRadioStation = null;
    
    const radioNowPlaying = document.getElementById('radioNowPlaying');
    if (radioNowPlaying) radioNowPlaying.style.display = 'none';
    
    showToast('Radio berhenti', 1500);
}

document.addEventListener('DOMContentLoaded', () => {
    const stopRadioBtn = document.getElementById('stopRadioBtn');
    if (stopRadioBtn) stopRadioBtn.addEventListener('click', stopRadio);
});

window.loadRadioStations = loadRadioStations;
window.startRadio = startRadio;
window.stopRadio = stopRadio;