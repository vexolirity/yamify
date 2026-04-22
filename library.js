// ============================================
// YAMIFY ULTIMATE - Library Module
// Load, Render, Search, Sort, Filter
// ============================================

let currentSort = 'recent'; // recent, az, za, plays
let currentFilter = 'all';
let searchQuery = '';

async function loadAllSongs() {
    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading songs:', error);
        showToast('Gagal memuat lagu', 2000, 'error');
        return;
    }
    
    allSongs = data || [];
    renderLibrary();
    renderTopCharts();
    updateStatsCount();
}

function renderLibrary() {
    const container = document.getElementById('libraryGrid');
    if (!container) return;
    
    let filteredSongs = [...allSongs];
    
    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredSongs = filteredSongs.filter(song => 
            song.title.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query)
        );
    }
    
    // Apply sort
    switch(currentSort) {
        case 'az':
            filteredSongs.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'za':
            filteredSongs.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'plays':
            filteredSongs.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
            break;
        case 'recent':
        default:
            filteredSongs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
    }
    
    if (filteredSongs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>🎵</span>
                <p>${searchQuery ? 'Lagu tidak ditemukan' : 'Belum ada lagu'}</p>
                ${!searchQuery ? '<button onclick="showPanel(\'upload\')">+ Upload Lagu</button>' : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredSongs.map(song => `
        <div class="song-card" data-song-id="${song.id}">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200?random=' + song.id}" alt="${escapeHtml(song.title)}" loading="lazy" onerror="this.src='https://picsum.photos/200/200'">
                <div class="play-overlay" onclick="event.stopPropagation(); playSongById('${song.id}')">
                    <span>▶️</span>
                </div>
                <div class="like-btn-card ${userLikedSongs.has(song.id) ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike('${song.id}')">
                    <span>${userLikedSongs.has(song.id) ? '❤️' : '🤍'}</span>
                </div>
            </div>
            <div class="song-title" onclick="playSongById('${song.id}')">${escapeHtml(song.title)}</div>
            <div class="song-artist" onclick="playSongById('${song.id}')">${escapeHtml(song.artist)}</div>
            <div class="song-stats">
                <span>🎧 ${song.play_count || 0}</span>
                <span>⏱️ ${formatDuration(song.duration)}</span>
            </div>
        </div>
    `).join('');
}

function renderTopCharts() {
    const container = document.getElementById('topGrid');
    if (!container) return;
    
    const topSongs = [...allSongs]
        .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
        .slice(0, 50);
    
    if (topSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>🏆</span><p>Belum ada data chart</p></div>';
        return;
    }
    
    container.innerHTML = topSongs.map((song, index) => `
        <div class="top-chart-item" onclick="playSongById('${song.id}')">
            <div class="top-chart-rank">#${index + 1}</div>
            <img class="top-chart-cover" src="${song.cover_url || 'https://picsum.photos/50/50'}" onerror="this.src='https://picsum.photos/50/50'">
            <div class="top-chart-info">
                <div class="top-chart-title">${escapeHtml(song.title)}</div>
                <div class="top-chart-artist">${escapeHtml(song.artist)}</div>
            </div>
            <div class="top-chart-plays">${song.play_count || 0} plays</div>
        </div>
    `).join('');
}

function filterSongs(query) {
    searchQuery = query;
    renderLibrary();
}

function sortSongs(sortType) {
    currentSort = sortType;
    renderLibrary();
    
    // Update button text
    const sortBtn = document.getElementById('sortBtn');
    const sortText = {
        recent: 'Sort by 📅 Recent',
        az: 'Sort by A → Z',
        za: 'Sort by Z → A',
        plays: 'Sort by 🔥 Most Played'
    };
    if (sortBtn) sortBtn.innerHTML = sortText[sortType] || sortText.recent;
}

function playSongById(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (song) {
        playSong(song);
    } else {
        showToast('Lagu tidak ditemukan', 2000, 'error');
    }
}

function updateStatsCount() {
    const songCountEl = document.getElementById('songCount');
    if (songCountEl && !currentUser) {
        songCountEl.textContent = allSongs.length;
    }
}

// Search input listener
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => filterSongs(e.target.value), 300));
    }
    
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) {
        let sortIndex = 0;
        const sorts = ['recent', 'az', 'za', 'plays'];
        sortBtn.addEventListener('click', () => {
            sortIndex = (sortIndex + 1) % sorts.length;
            sortSongs(sorts[sortIndex]);
        });
    }
});

window.playSongById = playSongById;
window.filterSongs = filterSongs;
window.sortSongs = sortSongs;
window.renderLibrary = renderLibrary;
window.renderTopCharts = renderTopCharts;