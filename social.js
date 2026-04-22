// ============================================
// YAMIFY ULTIMATE - Social Module FIXED
// ============================================

async function loadLikedSongs() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('liked_songs')
        .select('song_id')
        .eq('user_id', currentUser.id);
    
    if (error) {
        console.error('Error loading liked songs:', error);
        return;
    }
    
    userLikedSongs.clear();
    data?.forEach(item => userLikedSongs.add(item.song_id));
    
    renderLikedSongs();
    if (typeof renderLibrary === 'function') renderLibrary();
}

function renderLikedSongs() {
    const container = document.getElementById('likedGrid');
    if (!container) return;
    
    const likedSongs = allSongs.filter(song => userLikedSongs.has(song.id));
    const likedCountEl = document.getElementById('likedCount');
    
    if (likedCountEl) likedCountEl.innerText = `${likedSongs.length} lagu`;
    
    if (likedSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>❤️</span><p>Belum ada lagu disukai</p><button onclick="showPanel(\'library\')">Jelajahi Musik</button></div>';
        return;
    }
    
    container.innerHTML = likedSongs.map(song => `
        <div class="song-card" onclick="window.playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" onerror="this.src='https://picsum.photos/200/200'">
                <div class="play-overlay" onclick="event.stopPropagation(); window.playSongById('${song.id}')">
                    <span>▶️</span>
                </div>
                <div class="like-btn-card liked" onclick="event.stopPropagation(); window.toggleLike('${song.id}')">
                    <span>❤️</span>
                </div>
            </div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
}

async function toggleLike(songId) {
    if (!await ensureAuth()) return;
    
    const song = allSongs.find(s => s.id === songId);
    
    if (userLikedSongs.has(songId)) {
        await supabase
            .from('liked_songs')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('song_id', songId);
        userLikedSongs.delete(songId);
        showToast(`💔 Dihapus dari favorit`, 1500);
    } else {
        await supabase
            .from('liked_songs')
            .insert([{ user_id: currentUser.id, song_id: songId }]);
        userLikedSongs.add(songId);
        showToast(`❤️ Ditambahkan ke favorit`, 1500);
    }
    
    renderLikedSongs();
    if (typeof renderLibrary === 'function') renderLibrary();
    
    if (currentPlayingSong && currentPlayingSong.id === songId) {
        const playerLikeBtn = document.getElementById('playerLikeBtn');
        if (playerLikeBtn) {
            playerLikeBtn.innerHTML = userLikedSongs.has(songId) ? '❤️' : '🤍';
            playerLikeBtn.classList.toggle('liked', userLikedSongs.has(songId));
        }
    }
}

function shareSong(song) {
    const url = `${window.location.origin}/guest.html?song=${song.id}`;
    const text = `🎵 ${song.title} - ${song.artist}\nDengarkan di Yamify!`;
    
    if (navigator.share) {
        navigator.share({
            title: song.title,
            text: text,
            url: url
        }).catch(() => copyToClipboard(url));
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Link disalin ke clipboard', 1500);
}

// ========== EXPORT GLOBAL ==========
window.loadLikedSongs = loadLikedSongs;
window.renderLikedSongs = renderLikedSongs;
window.toggleLike = toggleLike;
window.shareSong = shareSong;

console.log('✅ Social module ready');