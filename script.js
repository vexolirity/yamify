// ============================================
// YAMIFY - Main Logic
// ============================================

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthAndLoad();
    setupEventListeners();
    initPlayer();
    await loadAllSongs();
    await setupRealtimeSubscription();
});

async function checkAuthAndLoad() {
    await getCurrentUser();
    
    if (currentUser) {
        document.getElementById('userEmail').innerText = currentUser.email;
        const avatarUrl = currentUser.user_metadata?.avatar_url;
        document.getElementById('userAvatar').src = avatarUrl || `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${currentUser.email}`;
        document.getElementById('authSection').style.display = 'flex';
        document.getElementById('guestSection').style.display = 'none';
        await loadLikedSongs();
        await loadRecentlyPlayed();
    } else {
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
    document.getElementById('uploadBtn')?.addEventListener('click', () => {
        showPanel('upload');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    });
    
    // Upload submit
    document.getElementById('submitUploadBtn')?.addEventListener('click', uploadSong);
    
    // Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        filterSongs(e.target.value);
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);
    
    // Create playlist
    document.getElementById('createPlaylistBtn')?.addEventListener('click', createNewPlaylist);
}

function showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${panelId}Panel`)?.classList.add('active');
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
}

function renderLibrary(songs) {
    const container = document.getElementById('libraryGrid');
    if (!container) return;
    
    if (!songs || songs.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">🎵 Belum ada lagu. Upload dulu yuk!</div>';
        return;
    }
    
    container.innerHTML = songs.map(song => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200?random=' + song.id}" alt="${escapeHtml(song.title)}">
                <div class="play-btn-overlay">
                    <span>▶️</span>
                </div>
                <div class="like-btn ${userLikedSongs.has(song.id) ? 'liked' : ''}" onclick="toggleLike(event, '${song.id}')">
                    <span>${userLikedSongs.has(song.id) ? '❤️' : '🤍'}</span>
                </div>
            </div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
            <div class="song-duration">${formatDuration(song.duration)}</div>
        </div>
    `).join('');
}

function renderTopCharts(songs) {
    const container = document.getElementById('topChartsGrid');
    if (!container) return;
    
    const topSongs = [...songs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 10);
    
    if (topSongs.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">📊 Belum ada data chart</div>';
        return;
    }
    
    container.innerHTML = topSongs.map((song, index) => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" alt="${escapeHtml(song.title)}">
                <div class="play-btn-overlay">
                    <span>▶️</span>
                </div>
            </div>
            <div class="song-title">${index + 1}. ${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
            <div class="song-duration">🎧 ${song.play_count || 0} x</div>
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
    
    renderLikedSongs();
}

async function renderLikedSongs() {
    const container = document.getElementById('likedGrid');
    if (!container) return;
    
    const likedSongsData = allSongs.filter(song => userLikedSongs.has(song.id));
    
    if (likedSongsData.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">❤️ Belum ada lagu yang disukai</div>';
        return;
    }
    
    container.innerHTML = likedSongsData.map(song => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" alt="${escapeHtml(song.title)}">
                <div class="play-btn-overlay">
                    <span>▶️</span>
                </div>
            </div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
}

async function toggleLike(event, songId) {
    event.stopPropagation();
    
    if (!currentUser) {
        alert('Login dulu buat like lagu ya!');
        return;
    }
    
    if (userLikedSongs.has(songId)) {
        // Unlike
        await supabase
            .from('liked_songs')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('song_id', songId);
        userLikedSongs.delete(songId);
    } else {
        // Like
        await supabase
            .from('liked_songs')
            .insert([{ user_id: currentUser.id, song_id: songId }]);
        userLikedSongs.add(songId);
    }
    
    await renderLikedSongs();
    await loadAllSongs(); // Refresh library buat update icon like
}

async function loadRecentlyPlayed() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('recently_played')
        .select('song_id')
        .eq('user_id', currentUser.id)
        .order('played_at', { ascending: false })
        .limit(10);
    
    if (error) {
        console.error('Error loading recently played:', error);
        return;
    }
    
    const recentSongIds = data?.map(item => item.song_id) || [];
    const recentSongs = allSongs.filter(song => recentSongIds.includes(song.id));
    
    const container = document.getElementById('recentlyPlayedGrid');
    if (!container) return;
    
    if (recentSongs.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">🕐 Belum ada riwayat putar</div>';
        return;
    }
    
    container.innerHTML = recentSongs.map(song => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" alt="${escapeHtml(song.title)}">
                <div class="play-btn-overlay">
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
        container.innerHTML = '<div style="text-align:center; padding:40px;">📋 Belum ada playlist. Buat playlist baru!</div>';
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
        alert('Login dulu buat bikin playlist!');
        return;
    }
    
    const name = prompt('Nama playlist baru:');
    if (!name) return;
    
    const { error } = await supabase
        .from('playlists')
        .insert([{
            name: name,
            user_id: currentUser.id
        }]);
    
    if (error) {
        alert('Gagal buat playlist: ' + error.message);
    } else {
        await loadUserPlaylists();
        alert('✅ Playlist berhasil dibuat!');
    }
}

async function viewPlaylist(playlistId) {
    // Get playlist songs
    const { data, error } = await supabase
        .from('playlist_songs')
        .select('song_id')
        .eq('playlist_id', playlistId);
    
    if (error) {
        alert('Gagal load playlist');
        return;
    }
    
    const songIds = data?.map(item => item.song_id) || [];
    const playlistSongs = allSongs.filter(song => songIds.includes(song.id));
    
    // Tampilkan modal atau pindah ke panel dengan lagu-lagu playlist
    alert(`Playlist memiliki ${playlistSongs.length} lagu. Klik OK untuk memutar pertama.`);
    if (playlistSongs.length > 0) {
        playSong(playlistSongs[0], playlistSongs);
    }
}

async function setupRealtimeSubscription() {
    supabase
        .channel('songs_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
            loadAllSongs();
            loadLikedSongs();
        })
        .subscribe();
    
    supabase
        .channel('liked_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'liked_songs' }, () => {
            loadLikedSongs();
        })
        .subscribe();
}

// Make functions global for HTML onclick
window.playSongById = playSongById;
window.toggleLike = toggleLike;
window.viewPlaylist = viewPlaylist;
window.shareSong = shareSong;