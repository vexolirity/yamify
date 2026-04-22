// ============================================
// YAMIFY ULTIMATE - Playlist Module FIXED
// ============================================

let currentPlaylistId = null;

async function loadUserPlaylists() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading playlists:', error);
        return;
    }
    
    userPlaylists = data || [];
    renderPlaylists();
}

function renderPlaylists() {
    const container = document.getElementById('playlistsGrid');
    if (!container) return;
    
    if (userPlaylists.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📋</span><p>Belum ada playlist</p><button onclick="window.createNewPlaylist()">+ Buat Playlist</button></div>';
        return;
    }
    
    container.innerHTML = userPlaylists.map(pl => `
        <div class="playlist-card" onclick="window.viewPlaylist('${pl.id}')">
            <div class="playlist-icon">📋</div>
            <div class="playlist-name">${escapeHtml(pl.name)}</div>
            <div class="playlist-date">${new Date(pl.created_at).toLocaleDateString('id-ID')}</div>
        </div>
    `).join('');
}

async function createNewPlaylist() {
    if (!await ensureAuth()) return;
    
    const name = prompt('Nama playlist:', `Playlist ${new Date().toLocaleDateString('id-ID')}`);
    if (!name || !name.trim()) return;
    
    const { error } = await supabase
        .from('playlists')
        .insert([{ name: name.trim(), user_id: currentUser.id }]);
    
    if (error) {
        showToast('Gagal buat playlist: ' + error.message, 3000, 'error');
    } else {
        showToast(`Playlist "${name}" dibuat`, 2000, 'success');
        await loadUserPlaylists();
    }
}

async function deletePlaylist(playlistId, playlistName) {
    if (!confirm(`Hapus playlist "${playlistName}"?`)) return;
    
    await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId);
    const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
    
    if (error) {
        showToast('Gagal hapus: ' + error.message, 3000, 'error');
    } else {
        showToast('Playlist dihapus', 2000);
        await loadUserPlaylists();
        closePlaylistDetail();
    }
}

async function renamePlaylist(playlistId, currentName) {
    const newName = prompt('Nama baru:', currentName);
    if (!newName || newName === currentName) return;
    
    const { error } = await supabase
        .from('playlists')
        .update({ name: newName })
        .eq('id', playlistId);
    
    if (error) {
        showToast('Gagal rename: ' + error.message, 3000, 'error');
    } else {
        showToast('Playlist diubah', 2000);
        await loadUserPlaylists();
        if (currentPlaylistId === playlistId) {
            document.getElementById('playlistDetailName').innerText = newName;
        }
    }
}

async function viewPlaylist(playlistId) {
    currentPlaylistId = playlistId;
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const { data, error } = await supabase
        .from('playlist_songs')
        .select('song_id')
        .eq('playlist_id', playlistId);
    
    if (error) {
        showToast('Gagal load playlist', 2000, 'error');
        return;
    }
    
    const songIds = data?.map(item => item.song_id) || [];
    const playlistSongs = allSongs.filter(song => songIds.includes(song.id));
    
    const modal = document.getElementById('playlistDetailModal');
    const nameEl = document.getElementById('playlistDetailName');
    const songsContainer = document.getElementById('playlistDetailSongs');
    
    if (nameEl) nameEl.innerText = playlist.name;
    
    if (songsContainer) {
        if (playlistSongs.length === 0) {
            songsContainer.innerHTML = '<div class="empty-state" style="padding:40px;">Belum ada lagu</div>';
        } else {
            songsContainer.innerHTML = playlistSongs.map(song => `
                <div class="playlist-song-item" onclick="window.playSongById('${song.id}')">
                    <img class="playlist-song-cover" src="${song.cover_url || 'https://picsum.photos/40/40'}" onerror="this.src='https://picsum.photos/40/40'">
                    <div class="playlist-song-info">
                        <div class="playlist-song-title">${escapeHtml(song.title)}</div>
                        <div class="playlist-song-artist">${escapeHtml(song.artist)}</div>
                    </div>
                    <button class="playlist-song-remove" onclick="event.stopPropagation(); window.removeSongFromPlaylist('${playlistId}', '${song.id}')">🗑️</button>
                </div>
            `).join('');
        }
    }
    
    modal.classList.remove('hidden');
    
    const renameBtn = document.getElementById('renamePlaylistBtn');
    const deleteBtn = document.getElementById('deletePlaylistBtn');
    
    if (renameBtn) renameBtn.onclick = () => renamePlaylist(playlistId, playlist.name);
    if (deleteBtn) deleteBtn.onclick = () => deletePlaylist(playlistId, playlist.name);
}

async function addSongToPlaylist(songId, playlistId) {
    const { error } = await supabase
        .from('playlist_songs')
        .insert([{ playlist_id: playlistId, song_id: songId }]);
    
    if (error && error.code !== '23505') {
        showToast('Gagal menambah: ' + error.message, 2000, 'error');
        return false;
    }
    return true;
}

async function removeSongFromPlaylist(playlistId, songId) {
    const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('song_id', songId);
    
    if (error) {
        showToast('Gagal hapus: ' + error.message, 2000, 'error');
    } else {
        showToast('Lagu dihapus dari playlist', 1500);
        viewPlaylist(playlistId);
    }
}

async function showAddToPlaylist(songId, songTitle) {
    if (!await ensureAuth()) return;
    
    await loadUserPlaylists();
    
    if (userPlaylists.length === 0) {
        const create = confirm('Belum ada playlist. Buat playlist baru?');
        if (create) await createNewPlaylist();
        await loadUserPlaylists();
        if (userPlaylists.length === 0) return;
    }
    
    const modal = document.getElementById('addToPlaylistModal');
    const listContainer = document.getElementById('playlistList');
    
    listContainer.innerHTML = userPlaylists.map(pl => `
        <div class="playlist-list-item" onclick="window.addToExistingPlaylist('${songId}', '${pl.id}', '${escapeHtml(pl.name)}')">
            <span class="playlist-list-icon">📋</span>
            <span class="playlist-list-name">${escapeHtml(pl.name)}</span>
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
    
    const createBtn = document.getElementById('createNewFromModal');
    if (createBtn) {
        createBtn.onclick = async () => {
            await createNewPlaylist();
            await loadUserPlaylists();
            showAddToPlaylist(songId, songTitle);
        };
    }
}

async function addToExistingPlaylist(songId, playlistId, playlistName) {
    const success = await addSongToPlaylist(songId, playlistId);
    if (success) {
        showToast(`Ditambahkan ke ${playlistName}`, 1500);
        closeAddToPlaylist();
    }
}

// ========== EXPORT GLOBAL ==========
window.loadUserPlaylists = loadUserPlaylists;
window.renderPlaylists = renderPlaylists;
window.createNewPlaylist = createNewPlaylist;
window.viewPlaylist = viewPlaylist;
window.addSongToPlaylist = addSongToPlaylist;
window.removeSongFromPlaylist = removeSongFromPlaylist;
window.showAddToPlaylist = showAddToPlaylist;
window.addToExistingPlaylist = addToExistingPlaylist;

document.addEventListener('DOMContentLoaded', () => {
    const createBtn = document.getElementById('createPlaylistBtn');
    if (createBtn) createBtn.addEventListener('click', createNewPlaylist);
});

console.log('✅ Playlist module ready');