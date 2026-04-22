// ============================================
// YAMIFY - Social Module FINAL
// ============================================

window.loadLikedSongs = async function() {
    if (!window.currentUser) return;
    
    const { data, error } = await supabase
        .from('liked_songs')
        .select('song_id')
        .eq('user_id', window.currentUser.id);
    
    if (error) {
        console.error('Error loading liked songs:', error);
        return;
    }
    
    window.userLikedSongs.clear();
    data?.forEach(item => window.userLikedSongs.add(item.song_id));
    
    renderLikedSongs();
    if (window.renderLibrary) window.renderLibrary();
};

window.renderLikedSongs = function() {
    const container = document.getElementById('likedGrid');
    if (!container) return;
    
    const likedSongs = window.allSongs.filter(song => window.userLikedSongs.has(song.id));
    const likedCountEl = document.getElementById('likedCount');
    
    if (likedCountEl) likedCountEl.innerText = `${likedSongs.length} lagu`;
    
    if (likedSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>❤️</span><p>Belum ada lagu disukai</p></div>';
        return;
    }
    
    container.innerHTML = likedSongs.map(song => `
        <div class="song-card">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" onerror="this.src='https://picsum.photos/200/200'">
                <div class="play-overlay" onclick="event.stopPropagation(); window.playSongById('${song.id}')">
                    <span>▶️</span>
                </div>
                <div class="like-btn-card liked" onclick="event.stopPropagation(); window.toggleLike('${song.id}')">
                    <span>❤️</span>
                </div>
            </div>
            <div class="song-title" onclick="window.playSongById('${song.id}')">${escapeHtml(song.title)}</div>
            <div class="song-artist" onclick="window.playSongById('${song.id}')">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
};

window.toggleLike = async function(songId) {
    if (!window.currentUser) {
        showToast('Login dulu untuk menyukai lagu', 1500);
        return;
    }
    
    if (window.userLikedSongs.has(songId)) {
        await supabase
            .from('liked_songs')
            .delete()
            .eq('user_id', window.currentUser.id)
            .eq('song_id', songId);
        window.userLikedSongs.delete(songId);
        showToast('💔 Dihapus dari favorit', 1500);
    } else {
        await supabase
            .from('liked_songs')
            .insert([{ user_id: window.currentUser.id, song_id: songId }]);
        window.userLikedSongs.add(songId);
        showToast('❤️ Ditambahkan ke favorit', 1500);
    }
    
    window.renderLikedSongs();
    if (window.renderLibrary) window.renderLibrary();
    
    if (window.currentPlayingSong && window.currentPlayingSong.id === songId) {
        const playerLikeBtn = document.getElementById('playerLikeBtn');
        if (playerLikeBtn) {
            playerLikeBtn.innerHTML = window.userLikedSongs.has(songId) ? '❤️' : '🤍';
        }
    }
};

console.log('✅ Social module ready');
