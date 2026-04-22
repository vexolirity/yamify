// ============================================
// YAMIFY - Playlist Module FINAL
// ============================================

let currentPlaylistId = null;

window.loadUserPlaylists = async function() {
    if (!window.currentUser) return;
    
    const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading playlists:', error);
        return;
    }
    
    window.userPlaylists = data || [];
    renderPlaylists();
};

function renderPlaylists() {
    const container = document.getElementById('playlistsGrid');
    if (!container) return;
    
    if (window.userPlaylists.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>📋</span><p>Belum ada playlist</p><button onclick="window.createNewPlaylist()">+ Buat Playlist</button></div>';
        return;
    }
    
    container.innerHTML = window.userPlaylists.map(pl => `
        <div class="playlist-card" onclick="window.viewPlaylist('${pl.id}')">
            <div class="playlist-icon">📋</div>
            <div class="playlist-name">${escapeHtml(pl.name)}</div>
            <div class="playlist-date">${new Date(pl.created_at).toLocaleDateString('id-ID')}</div>
        </div>
    `).join('');
}

window.createNewPlaylist = async function() {
    if (!window.currentUser) {
        showToast('Login dulu', 1500);
        return;
    }
    
    const name = prompt('Nama playlist:', `Playlist ${new Date().toLocaleDateString('id-ID')}`);
    if (!name || !name.trim()) return;
    
    const { error } = await supabase
        .from('playlists')
        .insert([{ name: name.trim(), user_id: window.currentUser.id }]);
    
    if (error) {
        showToast('Gagal buat playlist: ' + error.message, 3000, 'error');
    } else {
        showToast(`Playlist "${name}" dibuat`, 2000);
        await window.loadUserPlaylists();
    }
};

window.viewPlaylist = async function(playlistId) {
    currentPlaylistId = playlistId;
    const playlist = window.userPlaylists.find(p => p.id === playlistId);
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
    const playlistSongs = window.allSongs.filter(song => songIds.includes(song.id));
    
    const songsHtml = playlistSongs.length === 0 
        ? '<div class="empty-state">Belum ada lagu</div>'
        : playlistSongs.map(song => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid var(--border);cursor:pointer" onclick="window.playSongById('${song.id}')">
                <img src="${song.cover_url || 'https://picsum.photos/40/40'}" style="width:40px;height:40px;border-radius:6px">
                <div style="flex:1"><div style="font-weight:600">${escapeHtml(song.title)}</div><div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(song.artist)}</div></div>
                <button onclick="event.stopPropagation(); window.removeSongFromPlaylist('${playlistId}', '${song.id}')" style="background:none;border:none;font-size:18px;cursor:pointer">🗑️</button>
            </div>
        `).join('');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'tempPlaylistModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px">
            <div class="modal-header"><h3>${escapeHtml(playlist.name)}</h3><button onclick="this.closest('.modal').remove()">✕</button></div>
            <div style="padding:16px;max-height:400px;overflow-y:auto">${songsHtml}</div>
            <div style="padding:16px;display:flex;gap:12px;border-top:1px solid var(--border)">
                <button onclick="window.renamePlaylist('${playlistId}', '${escapeHtml(playlist.name)}')" style="flex:1;background:var(--bg-highlight);border:none;padding:10px;border-radius:500px;cursor:pointer">✏️ Rename</button>
                <button onclick="window.deletePlaylist('${playlistId}', '${escapeHtml(playlist.name)}')" style="flex:1;background:rgba(229,72,77,0.15);border:1px solid #E5484D;padding:10px;border-radius:500px;color:#E5484D;cursor:pointer">🗑️ Hapus</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.renamePlaylist = async function(playlistId, currentName) {
    const newName = prompt('Nama baru:', currentName);
    if (!newName || newName === currentName) return;
    
    const { error } = await supabase
        .from('playlists')
        .update({ name: newName })
        .eq('id', playlistId);
    
    if (!error) {
        showToast('Playlist diubah', 2000);
        await window.loadUserPlaylists();
        document.getElementById('tempPlaylistModal')?.remove();
    }
};

window.deletePlaylist = async function(playlistId, playlistName) {
    if (!confirm(`Hapus playlist "${playlistName}"?`)) return;
    
    await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId);
    const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
    
    if (!error) {
        showToast('Playlist dihapus', 2000);
        await window.loadUserPlaylists();
        document.getElementById('tempPlaylistModal')?.remove();
    }
};

window.removeSongFromPlaylist = async function(playlistId, songId) {
    await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('song_id', songId);
    showToast('Lagu dihapus dari playlist', 1500);
    window.viewPlaylist(playlistId);
};

console.log('✅ Playlist module ready');
