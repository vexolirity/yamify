// ============================================
// YAMIFY - AUTHENTICATION
// ============================================

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    window.currentUser = session?.user || null;
    
    if (window.currentUser) {
        const avatar = document.getElementById('userAvatar');
        const name = document.getElementById('userName');
        const menu = document.getElementById('userMenu');
        
        if (avatar) avatar.src = window.currentUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${window.currentUser.email}`;
        if (name) name.textContent = window.currentUser.email?.split('@')[0];
        if (menu) menu.style.display = 'flex';
        
        document.querySelector('.nav-btn[data-panel="upload"]')?.style.setProperty('display', 'flex');
        
        await loadAllSongs();
        await loadLikedSongs();
        await loadPlaylists();
        return true;
    }
    
    if (!localStorage.getItem('yamify_guest') && window.location.pathname.includes('dashboard.html')) {
        window.location.href = '/index.html';
    }
    return false;
}

async function logout() {
    if (window.audioElement) window.audioElement.pause();
    await supabase.auth.signOut();
    localStorage.removeItem('yamify_guest');
    window.location.href = '/index.html';
}

window.checkAuth = checkAuth;
window.logout = logout;
