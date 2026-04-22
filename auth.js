async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    window.currentUser = session?.user || null;
    return window.currentUser;
}

async function checkAuthAndLoad() {
    await getCurrentUser();
    
    if (window.currentUser) {
        const userAvatarEl = document.getElementById('userAvatar');
        const userNameEl = document.getElementById('userName');
        const userMenu = document.getElementById('userMenu');
        
        if (userAvatarEl) {
            userAvatarEl.src = window.currentUser.user_metadata?.avatar_url || 
                `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${window.currentUser.email}&size=32&rounded=true`;
        }
        if (userNameEl) userNameEl.textContent = window.currentUser.email?.split('@')[0];
        if (userMenu) userMenu.style.display = 'flex';
        
        await window.loadAllSongs();
        await window.loadLikedSongs();
        await window.loadUserPlaylists();
        
        const uploadNav = document.querySelector('.nav-btn[data-panel="upload"]');
        if (uploadNav) uploadNav.style.display = 'flex';
        return true;
    }
    
    const guestMode = localStorage.getItem('yamify_guest') === 'true';
    if (!guestMode && window.location.pathname.includes('dashboard.html')) {
        window.location.href = '/index.html';
        return false;
    }
    return false;
}

async function logout() {
    if (window.audioElement) {
        window.audioElement.pause();
        window.audioElement.src = '';
    }
    await supabase.auth.signOut();
    localStorage.removeItem('yamify_guest');
    window.location.href = '/index.html';
}

async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard.html' }
    });
}

window.checkAuthAndLoad = checkAuthAndLoad;
window.logout = logout;
window.handleGoogleLogin = handleGoogleLogin;
