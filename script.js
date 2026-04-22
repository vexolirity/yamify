// ============================================
// YAMIFY - Main Logic (LENGKAP)
// ============================================

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthAndLoad();
    setupEventListeners();
    initPlayer();
    await loadAllSongs();
    await setupRealtimeSubscription();
    console.log('✅ Yamify siap digunakan!');
});

async function checkAuthAndLoad() {
    await getCurrentUser();
    
    if (currentUser) {
        // User logged in
        const userEmailEl = document.getElementById('userEmail');
        const userAvatarEl = document.getElementById('userAvatar');
        const authSection = document.getElementById('authSection');
        
        if (userEmailEl) userEmailEl.innerText = currentUser.email;
        if (userAvatarEl) {
            const avatarUrl = currentUser.user_metadata?.avatar_url;
            userAvatarEl.src = avatarUrl || `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${currentUser.email}`;
        }
        if (authSection) authSection.style.display = 'flex';
        
        await loadLikedSongs();
        await loadRecentlyPlayed();
        await loadUserPlaylists();
    } else {
        // Guest mode check
        const guestMode = localStorage.getItem('yamify_guest') === 'true';
        if (!guestMode && window.location.pathname.includes('dashboard.html')) {
            window.location.href = '/index.html';
        }
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const panelId = item.dataset.panel;
            if (panelId) {
                showPanel(panelId);
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
    
    // Upload button
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            showPanel('upload');
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        });
    }
    
    // Upload submit
    const submitBtn = document.getElementById('submitUploadBtn');
    if (submitBtn) submitBtn.addEventListener('click', uploadSong);
    
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSongs(e.target.value));
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
    
    // Create playlist
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    if (createPlaylistBtn) createPlaylistBtn.addEventListener('click', createNewPlaylist);
}

function showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const targetPanel = document.getElementById(`${panelId}Panel`);
    if (targetPanel) {
        targetPanel.classList.add('active');
        // Trigger animation refresh
        targetPanel.style.animation = 'none';
        setTimeout(() => {
            targetPanel.style.animation = 'fadeIn 0.3s ease';
        }, 10);
    }
}

async function loadAllSongs() {
    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading songs:', error);
        return;
    }
    
    allSongs = data || [];
    renderLibrary(allSongs);
    renderTopCharts(allSongs);
    
    // Update global songs di player
    if (typeof updateGlobalSongs === 'function') updateGlobalSongs(allSongs);
}

function renderLibrary(songs) {
    const container = document.getElementById('libraryGrid');
    if (!container) return;
    
    if (!songs || songs.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>🎵</span><br>Belum ada lagu. <button onclick="showPanel('upload')" style="margin-top:12px;">+ Upload Lagu</button></div>`;
        return;
    }
    
    container.innerHTML = songs.map(song => `
        <div class="song-card" data-song-id="${song.id}">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200?random=' + song.id}" alt="${escapeHtml(song.title)}" loading="lazy">
                <div class="play-overlay" onclick="event.stopPropagation(); playSongById('${song.id}')">
                    <span>▶️</span>
                </div>
                <div class="like-btn ${userLikedSongs.has(song.id) ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike('${song.id}')">
                    <span>${userLikedSongs.has(song.id) ? '❤️' : '🤍'}</span>
                </div>
            </div>
            <div class="song-title" onclick="playSongById('${song.id}')">${escapeHtml(song.title)}</div>
            <div class="song-artist" onclick="playSongById('${song.id}')">${escapeHtml(song.artist)}</div>
            <div class="song-duration">${formatDuration(song.duration)} • 🎧 ${song.play_count || 0}</div>
        </div>
    `).join('');
}

function renderTopCharts(songs) {
    const container = document.getElementById('topChartsGrid');
    if (!container) return;
    
    const topSongs = [...songs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 12);
    
    if (topSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>🏆</span><br>Belum ada data chart</div>';
        return;
    }
    
    container.innerHTML = topSongs.map((song, index) => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" alt="${escapeHtml(song.title)}" loading="lazy">
                <div class="play-overlay">
                    <span>▶️</span>
                </div>
            </div>
            <div class="song-title">${index + 1}. ${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
            <div class="song-duration">🏆 ${song.play_count || 0} plays</div>
        </div>
    `).join('');
}

function filterSongs(query) {
    if (!query.trim()) {
        renderLibrary(allSongs);
        return;
    }
    
    const filtered = allSongs.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase()) ||
        song.artist.toLowerCase().includes(query.toLowerCase())
    );
    renderLibrary(filtered);
}

function playSongById(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (song) {
        playSong(song);
    } else {
        showToast('❌ Lagu tidak ditemukan');
    }
}

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
    
    renderLibrary(allSongs);
    renderLikedSongs();
}

async function renderLikedSongs() {
    const container = document.getElementById('likedGrid');
    if (!container) return;
    
    const likedSongsData = allSongs.filter(song => userLikedSongs.has(song.id));
    
    if (likedSongsData.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>❤️</span><br>Belum ada lagu yang disukai</div>';
        return;
    }
    
    container.innerHTML = likedSongsData.map(song => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" alt="${escapeHtml(song.title)}" loading="lazy">
                <div class="play-overlay">
                    <span>▶️</span>
                </div>
            </div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
}

async function toggleLike(songId) {
    if (!currentUser) {
        showToast('✨ Login dulu buat like lagu ya!');
        return;
    }
    
    if (userLikedSongs.has(songId)) {
        await supabase
            .from('liked_songs')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('song_id', songId);
        userLikedSongs.delete(songId);
        showToast('💔 Dihapus dari favorit');
    } else {
        await supabase
            .from('liked_songs')
            .insert([{ user_id: currentUser.id, song_id: songId }]);
        userLikedSongs.add(songId);
        showToast('❤️ Ditambahkan ke favorit');
    }
    
    renderLibrary(allSongs);
    renderLikedSongs();
}

async function loadRecentlyPlayed() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('recently_played')
        .select('song_id')
        .eq('user_id', currentUser.id)
        .order('played_at', { ascending: false })
        .limit(12);
    
    if (error) {
        console.error('Error loading recently played:', error);
        return;
    }
    
    const recentSongIds = data?.map(item => item.song_id) || [];
    const recentSongs = allSongs.filter(song => recentSongIds.includes(song.id));
    
    const container = document.getElementById('recentlyPlayedGrid');
    if (!container) return;
    
    if (recentSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>🕐</span><br>Belum ada riwayat putar</div>';
        return;
    }
    
    container.innerHTML = recentSongs.map(song => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" alt="${escapeHtml(song.title)}" loading="lazy">
                <div class="play-overlay">
                    <span>▶️</span>
                </div>
            </div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
}

async function loadUserPlaylists() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', currentUser.id);
    
    if (error) {
        console.error('Error loading playlists:', error);
        return;
    }
    
    const container = document.getElementById('playlistsGrid');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📋</span><br>Belum ada playlist. Buat playlist baru!</div>';
        return;
    }
    
    container.innerHTML = data.map(pl => `
        <div class="playlist-card" onclick="viewPlaylist('${pl.id}')">
            <div class="playlist-icon">📋</div>
            <div class="playlist-name">${escapeHtml(pl.name)}</div>
            <div class="playlist-date">${new Date(pl.created_at).toLocaleDateString()}</div>
        </div>
    `).join('');
}

async function createNewPlaylist() {
    if (!currentUser) {
        showToast('✨ Login dulu buat bikin playlist!');
        return;
    }
    
    const name = prompt('Nama playlist baru:', 'Playlist ' + new Date().toLocaleDateString());
    if (!name) return;
    
    const { error } = await supabase
        .from('playlists')
        .insert([{
            name: name,
            user_id: currentUser.id
        }]);
    
    if (error) {
        showToast('❌ Gagal buat playlist: ' + error.message);
    } else {
        await loadUserPlaylists();
        showToast('✅ Playlist "' + name + '" berhasil dibuat!');
    }
}

async function viewPlaylist(playlistId) {
    const { data, error } = await supabase
        .from('playlist_songs')
        .select('song_id')
        .eq('playlist_id', playlistId);
    
    if (error) {
        showToast('Gagal load playlist');
        return;
    }
    
    const songIds = data?.map(item => item.song_id) || [];
    const playlistSongs = allSongs.filter(song => songIds.includes(song.id));
    
    if (playlistSongs.length === 0) {
        showToast('📋 Playlist kosong. Tambah lagu dulu ya!');
        return;
    }
    
    showToast(`🎵 Memutar playlist (${playlistSongs.length} lagu)`);
    playSong(playlistSongs[0], playlistSongs);
}

async function setupRealtimeSubscription() {
    // Subscribe ke perubahan tabel songs
    supabase
        .channel('songs_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
            loadAllSongs();
            loadLikedSongs();
        })
        .subscribe();
    
    // Subscribe ke perubahan tabel liked_songs
    supabase
        .channel('liked_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'liked_songs' }, () => {
            loadLikedSongs();
        })
        .subscribe();
    
    console.log('✅ Realtime subscription aktif');
}

// Global functions untuk HTML onclick
window.playSongById = playSongById;
window.toggleLike = toggleLike;
window.viewPlaylist = viewPlaylist;
window.showPanel = showPanel;
window.playSong = playSong;