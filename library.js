// ============================================
// YAMIFY - Library Module FINAL
// ============================================

window.loadAllSongs = async function() {
    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading songs:', error);
        showToast('Gagal memuat lagu', 2000, 'error');
        return;
    }
    
    window.allSongs = data || [];
    if (window.renderLibrary) window.renderLibrary();
    if (window.renderTopCharts) window.renderTopCharts();
    if (window.updateStatsCount) window.updateStatsCount();
};

window.renderLibrary = function() {
    const container = document.getElementById('libraryGrid');
    if (!container) return;
    
    let filteredSongs = [...window.allSongs];
    
    if (window.searchQuery) {
        const query = window.searchQuery.toLowerCase();
        filteredSongs = filteredSongs.filter(song => 
            song.title.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query)
        );
    }
    
    if (window.currentSort === 'az') {
        filteredSongs.sort((a, b) => a.title.localeCompare(b.title));
    } else if (window.currentSort === 'za') {
        filteredSongs.sort((a, b) => b.title.localeCompare(a.title));
    } else if (window.currentSort === 'plays') {
        filteredSongs.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    } else {
        filteredSongs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    if (filteredSongs.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>🎵</span><p>${window.searchQuery ? 'Lagu tidak ditemukan' : 'Belum ada lagu'}</p></div>`;
        return;
    }
    
    container.innerHTML = filteredSongs.map(song => `
        <div class="song-card">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200?random=' + song.id}" onerror="this.src='https://picsum.photos/200/200'">
                <div class="play-overlay" onclick="event.stopPropagation(); window.playSongById('${song.id}')">
                    <span>▶️</span>
                </div>
                <div class="like-btn-card ${window.userLikedSongs?.has(song.id) ? 'liked' : ''}" onclick="event.stopPropagation(); window.toggleLike('${song.id}')">
                    <span>${window.userLikedSongs?.has(song.id) ? '❤️' : '🤍'}</span>
                </div>
            </div>
            <div class="song-title" onclick="window.playSongById('${song.id}')">${escapeHtml(song.title)}</div>
            <div class="song-artist" onclick="window.playSongById('${song.id}')">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
};

window.renderTopCharts = function() {
    const container = document.getElementById('topGrid');
    if (!container) return;
    
    const topSongs = [...window.allSongs]
        .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
        .slice(0, 50);
    
    if (topSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>🏆</span><p>Belum ada data chart</p></div>';
        return;
    }
    
    container.innerHTML = topSongs.map((song, index) => `
        <div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-card);border-radius:10px;margin-bottom:8px;cursor:pointer" onclick="window.playSongById('${song.id}')">
            <div style="font-size:24px;font-weight:800;color:var(--accent);width:50px">#${index + 1}</div>
            <img src="${song.cover_url || 'https://picsum.photos/50/50'}" style="width:50px;height:50px;border-radius:6px;object-fit:cover">
            <div style="flex:1">
                <div style="font-weight:600">${escapeHtml(song.title)}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(song.artist)}</div>
            </div>
            <div style="font-size:12px;color:var(--accent)">${song.play_count || 0} plays</div>
        </div>
    `).join('');
};

window.filterSongs = function(query) {
    window.searchQuery = query;
    window.renderLibrary();
};

window.sortSongs = function(sortType) {
    window.currentSort = sortType;
    window.renderLibrary();
};

window.playSongById = function(songId) {
    const song = window.allSongs.find(s => s.id === songId);
    if (song && window.playSong) {
        window.playSong(song);
    } else {
        showToast('Lagu tidak ditemukan', 2000, 'error');
    }
};

console.log('✅ Library module ready');
