// ============================================
// YAMIFY - Search Module FINAL
// ============================================

window.initSearch = function() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(performGlobalSearch, 300));
};

async function performGlobalSearch() {
    const query = document.getElementById('globalSearchInput')?.value.trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query || query.length < 2) {
        resultsContainer.innerHTML = '<div class="empty-state"><span>🔍</span><p>Ketik minimal 2 karakter</p></div>';
        return;
    }
    
    const songsResults = window.allSongs.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase()) ||
        song.artist.toLowerCase().includes(query.toLowerCase())
    );
    
    if (songsResults.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state"><span>😔</span><p>Tidak ditemukan</p></div>';
        return;
    }
    
    resultsContainer.innerHTML = `
        <h3 style="margin:16px 0 12px">🎵 Lagu (${songsResults.length})</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px">
            ${songsResults.slice(0, 12).map(song => `
                <div class="song-card" onclick="window.playSongById('${song.id}'); closeSearch();">
                    <div class="song-cover-wrapper">
                        <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/140/140'}" onerror="this.src='https://picsum.photos/140/140'">
                        <div class="play-overlay" onclick="event.stopPropagation(); window.playSongById('${song.id}'); closeSearch();">
                            <span>▶️</span>
                        </div>
                    </div>
                    <div class="song-title">${escapeHtml(song.title)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
            `).join('')}
        </div>
    `;
}

window.performGlobalSearch = performGlobalSearch;

console.log('✅ Search module ready');
