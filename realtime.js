// ============================================
// YAMIFY ULTIMATE - Realtime Module
// Live Activity, Presence, Broadcast
// ============================================

let realtimeChannel = null;
let presenceChannel = null;
let onlineUsers = new Set();

function setupRealtime() {
    // Subscribe to songs table changes
    const songsChannel = supabase
        .channel('songs-realtime')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'songs' }, 
            (payload) => {
                console.log('Songs updated:', payload);
                loadAllSongs();
                if (payload.eventType === 'UPDATE') {
                    highlightPlayCount(payload.new.id);
                    showLiveActivity(`${getUserDisplayName()} mendengarkan ${payload.new.title}`);
                }
            }
        )
        .subscribe();
    
    // Subscribe to likes changes
    const likesChannel = supabase
        .channel('likes-realtime')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'liked_songs' },
            (payload) => {
                if (currentUser && payload.new.user_id !== currentUser.id) {
                    showLiveActivity(`Seseorang menyukai lagu`, 3000);
                }
                if (currentUser) loadLikedSongs();
            }
        )
        .subscribe();
    
    // Setup presence for online users
    setupPresence();
    
    console.log('✅ Realtime active');
}

function setupPresence() {
    if (!currentUser) return;
    
    presenceChannel = supabase.channel('online-users', {
        config: { presence: { key: currentUser.id } }
    });
    
    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const newCount = Object.keys(state).length;
            onlineUsers.clear();
            Object.values(state).forEach(users => {
                users.forEach(user => onlineUsers.add(user.user_id));
            });
            updateOnlineCount(newCount);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            showLiveActivity(`${newPresences[0]?.user_name || 'Someone'} bergabung`, 2000);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    user_id: currentUser.id,
                    user_name: currentUser.email?.split('@')[0],
                    online_at: new Date().toISOString()
                });
            }
        });
}

function setupBroadcast() {
    const broadcastChannel = supabase.channel('activity-broadcast');
    
    broadcastChannel
        .on('broadcast', { event: 'activity' }, ({ payload }) => {
            if (payload.user_id !== currentUser?.id) {
                showLiveActivity(payload.message, 3000);
            }
        })
        .subscribe();
    
    return broadcastChannel;
}

let broadcastChannel = null;

function broadcastActivity(type, targetId) {
    if (!broadcastChannel && currentUser) {
        broadcastChannel = setupBroadcast();
    }
    
    if (broadcastChannel && currentUser) {
        let message = '';
        if (type === 'like') message = `${currentUser.email?.split('@')[0]} menyukai lagu`;
        if (type === 'playing' && currentPlayingSong) message = `${currentUser.email?.split('@')[0]} sedang mendengarkan ${currentPlayingSong.title}`;
        
        broadcastChannel.send({
            type: 'broadcast',
            event: 'activity',
            payload: {
                user_id: currentUser.id,
                message: message,
                type: type,
                timestamp: new Date().toISOString()
            }
        });
    }
}

function broadcastNowPlaying(song) {
    broadcastActivity('playing', song.id);
}

function updateOnlineCount(count) {
    let badge = document.getElementById('onlineBadge');
    if (!badge && count > 0) {
        badge = document.createElement('div');
        badge.id = 'onlineBadge';
        badge.className = 'live-badge';
        badge.style.cssText = 'position:fixed;top:70px;right:16px;z-index:35;background:#E5484D;color:white;padding:4px 12px;border-radius:500px;font-size:11px;font-weight:600;';
        document.body.appendChild(badge);
    }
    if (badge) {
        if (count > 0) {
            badge.innerHTML = `👥 ${count} online`;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showLiveActivity(message, duration = 3000) {
    let container = document.getElementById('liveActivity');
    if (!container) {
        container = document.createElement('div');
        container.id = 'liveActivity';
        container.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);border-left:3px solid #1DB954;padding:10px 20px;border-radius:12px;font-size:12px;z-index:100;animation:slideDown 0.3s ease;white-space:nowrap;';
        document.body.appendChild(container);
        
        const style = document.createElement('style');
        style.textContent = `@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-20px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}`;
        document.head.appendChild(style);
    }
    
    container.innerHTML = `🔴 ${message}`;
    container.style.opacity = '1';
    
    setTimeout(() => {
        container.style.opacity = '0';
        setTimeout(() => {
            if (container.parentNode) container.remove();
        }, 300);
    }, duration);
}

function highlightPlayCount(songId) {
    const cards = document.querySelectorAll(`.song-card[data-song-id="${songId}"] .song-stats`);
    cards.forEach(card => {
        card.style.animation = 'pulse 0.3s ease';
        setTimeout(() => card.style.animation = '', 300);
    });
}

function getUserDisplayName() {
    if (currentUser) {
        return currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0];
    }
    return 'Seseorang';
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        setupRealtime();
    }
});

window.setupRealtime = setupRealtime;
window.broadcastActivity = broadcastActivity;
window.broadcastNowPlaying = broadcastNowPlaying;
window.showLiveActivity = showLiveActivity;