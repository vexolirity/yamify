// ============================================
// YAMIFY - Radio Module FINAL
// ============================================

const radioStationsData = [
    { name: 'Pop Hits', icon: '🎤', genre: 'pop' },
    { name: 'Rock Classics', icon: '🎸', genre: 'rock' },
    { name: 'Hip Hop', icon: '🎧', genre: 'hiphop' },
    { name: 'Electronic', icon: '⚡', genre: 'electronic' },
    { name: 'Jazz Vibes', icon: '🎷', genre: 'jazz' },
    { name: 'Indie Folk', icon: '🪕', genre: 'indie' },
    { name: 'Dangdut', icon: '🇮🇩', genre: 'dangdut' },
    { name: 'Chill LoFi', icon: '🌙', genre: 'lofi' }
];

window.loadRadioStations = function() {
    const container = document.getElementById('radioStations');
    if (!container) return;
    
    container.innerHTML = radioStationsData.map(station => `
        <div class="radio-card" onclick="window.startRadio('${station.genre}', '${station.name}')">
            <div class="radio-icon">${station.icon}</div>
            <div class="radio-name">${station.name}</div>
        </div>
    `).join('');
};

window.startRadio = function(genre, stationName) {
    if (window.radioInterval) clearInterval(window.radioInterval);
    
    let radioSongs = [...window.allSongs];
    
    if (radioSongs.length === 0) {
        showToast('Belum ada lagu untuk radio ini', 2000, 'error');
        return;
    }
    
    // Shuffle semua lagu untuk radio
    for (let i = radioSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [radioSongs[i], radioSongs[j]] = [radioSongs[j], radioSongs[i]];
    }
    
    window.currentRadioStation = { name: stationName, songs: radioSongs, currentIndex: 0 };
    
    window.playSong(radioSongs[0]);
    
    window.radioInterval = setInterval(() => {
        if (window.audioElement && window.audioElement.ended && window.currentRadioStation) {
            window.currentRadioStation.currentIndex++;
            if (window.currentRadioStation.currentIndex >= window.currentRadioStation.songs.length) {
                window.currentRadioStation.currentIndex = 0;
            }
            const nextSong = window.currentRadioStation.songs[window.currentRadioStation.currentIndex];
            if (nextSong) window.playSong(nextSong);
        }
    }, 1000);
    
    showToast(`Memutar Radio ${stationName}`, 2000);
};

window.stopRadio = function() {
    if (window.radioInterval) {
        clearInterval(window.radioInterval);
        window.radioInterval = null;
    }
    window.currentRadioStation = null;
    showToast('Radio berhenti', 1500);
};

console.log('✅ Radio module ready');
