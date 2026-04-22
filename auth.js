// ============================================
// YAMIFY - Authentication Module FINAL
// ============================================

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
            const avatarUrl = window.currentUser.user_metadata?.avatar_url;
            userAvatarEl.src = avatarUrl || `https://ui-avatars.com/api/?background=1DB954&color=fff&name=${window.currentUser.email}&size=32&rounded=true`;
        }
        
        if (userNameEl) {
            const name = window.currentUser.user_metadata?.full_name || window.currentUser.email?.split('@')[0];
            userNameEl.textContent = name;
        }
        
        if (userMenu) userMenu.style.display = 'flex';
        
        await window.loadAllSongs();
        await window.loadLikedSongs();
        await window.loadUserPlaylists();
        
        // Tampilkan upload button
        const uploadNav = document.querySelector('.nav-btn[data-panel="upload"]');
        if (uploadNav) uploadNav.style.display = 'flex';
        
        return true;
    }
    
    const guestMode = localStorage.getItem('yamify_guest') === 'true';
    if (!guestMode && window.location.pathname.includes('dashboard.html')) {
        window.location.href = '/index.html';
        return false;
    }
    
    if (guestMode) {
        showToast('Mode Tamu - Login untuk upload & playlist', 3000);
        const uploadNav = document.querySelector('.nav-btn[data-panel="upload"]');
        if (uploadNav) uploadNav.style.display = 'none';
    }
    
    return false;
}

async function ensureAuth() {
    if (!window.currentUser) {
        showToast('Login dulu untuk fitur ini', 2000, 'error');
        setTimeout(() => window.location.href = '/index.html', 1500);
        return false;
    }
    return true;
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveToLocalStorage('theme', theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) btn.classList.add('active');
    });
}

async function logout() {
    if (window.radioInterval) clearInterval(window.radioInterval);
    if (window.audioElement) {
        window.audioElement.pause();
        window.audioElement.src = '';
    }
    await supabase.auth.signOut();
    localStorage.removeItem('yamify_guest');
    window.location.href = '/index.html';
}

async function handleGoogleLogin() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/dashboard.html' }
        });
        if (error) throw error;
    } catch (error) {
        showToast('Gagal login: ' + error.message, 3000, 'error');
    }
}

window.ensureAuth = ensureAuth;
window.applyTheme = applyTheme;
window.handleGoogleLogin = handleGoogleLogin;
window.getCurrentUser = getCurrentUser;
window.logout = logout;

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});

console.log('✅ Auth module ready');
