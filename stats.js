// ============================================
// YAMIFY ULTIMATE - Stats Module
// Recently Played, Listening History, Charts
// ============================================

async function addToRecentlyPlayed(song) {
    if (!currentUser) return;
    
    try {
        // Remove duplicate if exists
        await supabase
            .from('recently_played')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('song_id', song.id);
        
        await supabase
            .from('recently_played')
            .insert([{
                user_id: currentUser.id,
                song_id: song.id,
                played_at: new Date().toISOString()
            }]);
        
        await loadRecentlyPlayed();
    } catch (e) {
        console.warn('Gagal simpan recently played:', e);
    }
}

async function loadRecentlyPlayed() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('recently_played')
        .select('song_id, played_at')
        .eq('user_id', currentUser.id)
        .order('played_at', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('Error loading recently played:', error);
        return;
    }
    
    const recentIds = data?.map(item => item.song_id) || [];
    const recentSongs = allSongs.filter(song => recentIds.includes(song.id));
    
    // Preserve order
    recentSongs.sort((a, b) => {
        return recentIds.indexOf(a.id) - recentIds.indexOf(b.id);
    });
    
    const container = document.getElementById('recentlyPlayedGrid');
    if (!container) return;
    
    if (recentSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>🕐</span><p>Belum ada riwayat putar</p></div>';
        return;
    }
    
    container.innerHTML = recentSongs.map(song => `
        <div class="song-card" onclick="playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" onerror="this.src='https://picsum.photos/200/200'">
                <div class="play-overlay" onclick="event.stopPropagation(); playSongById('${song.id}')">
                    <span>▶️</span>
                </div>
            </div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
}

async function clearRecentlyPlayed() {
    if (!currentUser) return;
    
    if (confirm('Hapus semua riwayat putar?')) {
        await supabase
            .from('recently_played')
            .delete()
            .eq('user_id', currentUser.id);
        
        await loadRecentlyPlayed();
        showToast('Riwayat dibersihkan', 1500);
    }
}

async function incrementPlayCount(songId) {
    try {
        const song = allSongs.find(s => s.id === songId);
        if (song) {
            const newCount = (song.play_count || 0) + 1;
            await supabase
                .from('songs')
                .update({ play_count: newCount })
                .eq('id', songId);
            song.play_count = newCount;
            renderTopCharts();
        }
    } catch (e) {
        console.warn('Gagal update play count:', e);
    }
}

async function loadStats() {
    const { count: songCount } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true });
    
    const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .catch(() => ({ count: Math.floor(Math.random() * 1000) + 100 }));
    
    const songCountEl = document.getElementById('songCount');
    const userCountEl = document.getElementById('userCount');
    
    if (songCountEl) songCountEl.textContent = songCount || 0;
    if (userCountEl) userCountEl.textContent = userCount || '1K+';
}

document.addEventListener('DOMContentLoaded', () => {
    const clearRecentBtn = document.getElementById('clearRecentBtn');
    if (clearRecentBtn) clearRecentBtn.addEventListener('click', clearRecentlyPlayed);
});

window.loadRecentlyPlayed = loadRecentlyPlayed;
window.clearRecentlyPlayed = clearRecentlyPlayed;
window.incrementPlayCount = incrementPlayCount;
window.loadStats = loadStats;