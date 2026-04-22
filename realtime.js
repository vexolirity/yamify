// ============================================
// YAMIFY - Realtime Module FINAL
// ============================================

window.setupRealtime = function() {
    const songsChannel = supabase
        .channel('songs-realtime')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'songs' }, 
            () => {
                if (window.loadAllSongs) window.loadAllSongs();
            }
        )
        .subscribe();
    
    console.log('✅ Realtime active');
};

console.log('✅ Realtime module ready');
