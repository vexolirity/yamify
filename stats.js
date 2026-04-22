// ============================================
// YAMIFY - Stats Module FINAL
// ============================================

window.addToRecentlyPlayed = async function(song) {
    if (!window.currentUser) return;
    
    try {
        await supabase
            .from('recently_played')
            .delete()
            .eq('user_id', window.currentUser.id)
            .eq('song_id', song.id);
        
        await supabase
            .from('recently_played')
            .insert([{
                user_id: window.currentUser.id,
                song_id: song.id,
                played_at: new Date().toISOString()
            }]);
        
        await loadRecentlyPlayed();
    } catch(e) {
        console.warn('Gagal simpan recently played:', e);
    }
};

async function loadRecentlyPlayed() {
    if (!window.currentUser) return;
    
    const { data, error } = await supabase
        .from('recently_played')
        .select('song_id, played_at')
        .eq('user_id', window.currentUser.id)
        .order('played_at', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('Error loading recently played:', error);
        return;
    }
    
    const recentIds = data?.map(item => item.song_id) || [];
    const recentSongs = window.allSongs.filter(song => recentIds.includes(song.id));
    recentSongs.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
    
    const container = document.getElementById('recentlyPlayedGrid');
    if (!container) return;
    
    if (recentSongs.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>🕐</span><p>Belum ada riwayat putar</p></div>';
        return;
    }
    
    container.innerHTML = recentSongs.map(song => `
        <div class="song-card" onclick="window.playSongById('${song.id}')">
            <div class="song-cover-wrapper">
                <img class="song-cover" src="${song.cover_url || 'https://picsum.photos/200/200'}" onerror="this.src='https://picsum.photos/200/200'">
                <div class="play-overlay" onclick="event.stopPropagation(); window.playSongById('${song.id}')">
                    <span>▶️</span>
                </div>
            </div>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
        </div>
    `).join('');
}

window.incrementPlayCount = async function(songId) {
    try {
        const song = window.allSongs.find(s => s.id === songId);
        if (song) {
            const newCount = (song.play_count || 0) + 1;
            await supabase
                .from('songs')
                .update({ play_count: newCount })
                .eq('id', songId);
            song.play_count = newCount;
            if (window.renderTopCharts) window.renderTopCharts();
        }
    } catch(e) {
        console.warn('Gagal update play count:', e);
    }
};

window.loadRecentlyPlayed = loadRecentlyPlayed;

console.log('✅ Stats module ready');
