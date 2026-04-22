// ============================================
// YAMIFY ULTIMATE - Global Search Module
// ============================================

function initSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(performGlobalSearch, 300));
}

async function performGlobalSearch() {
    const query = document.getElementById('globalSearchInput')?.value.trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query || query.length < 2) {
        resultsContainer.innerHTML = '<div class="empty-state"><span>🔍</span><p>Ketik minimal 2 karakter</p></div>';
        return;
    }
    
    resultsContainer.innerHTML = '<div class="loading-spinner" style="margin:40px auto;"></div>';
    
    // Search in songs
    const songsResults = allSongs.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase()) ||
        song.artist.toLowerCase().includes(query.toLowerCase())
    );
    
    // Search in playlists (if user logged in)
    let playlistResults = [];
    if (currentUser) {
        playlistResults = userPlaylists.filter(pl => 
            pl.name.toLowerCase().includes(query.toLowerCase())
        );
    }
    
    if (songsResults.length === 0 && playlistResults.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state"><span>😔</span><p>Tidak ditemukan</p></div>';
        return;
    }
    
    let html = '';
    
    if (songsResults.length > 0) {
        html += `<h3 style="margin:20px 0 12px;">🎵 Lagu (${songsResults.length})</h3>`;
        html += `<div class="songs-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">`;
        html += songsResults.slice(0, 12).map(song => `
            <div class="song-card" onclick="playSongById('${song.id}'); closeSearch();">
                <div class="song-cover-wrapper">
                    <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/140/140'}" onerror="this.src='https://picsum.photos/140/140'">
                    <div class="play-overlay" onclick="event.stopPropagation(); playSongById('${song.id}'); closeSearch();">
                        <span>▶️</span>
                    </div>
                </div>
                <div class="song-title">${escapeHtml(song.title)}</div>
                <div class="song-artist">${escapeHtml(song.artist)}</div>
            </div>
        `).join('');
        html += `</div>`;
    }
    
    if (playlistResults.length > 0) {
        html += `<h3 style="margin:20px 0 12px;">📋 Playlist (${playlistResults.length})</h3>`;
        html += `<div class="playlists-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">`;
        html += playlistResults.slice(0, 6).map(pl => `
            <div class="playlist-card" onclick="viewPlaylist('${pl.id}'); closeSearch();">
                <div class="playlist-icon">📋</div>
                <div class="playlist-name">${escapeHtml(pl.name)}</div>
            </div>
        `).join('');
        html += `</div>`;
    }
    
    resultsContainer.innerHTML = html;
}

window.initSearch = initSearch;
window.performGlobalSearch = performGlobalSearch;